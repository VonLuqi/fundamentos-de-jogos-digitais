/** CLI + mocked XHR only. Never contacts HTTP, FTP or a database. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prova-chunks-'));
const php = String.raw`<?php
declare(strict_types=1);
spl_autoload_register(static function(string $class): void {
    if (str_starts_with($class, 'App\\')) require getenv('PROVA_TEST_ROOT') . '/backend/src/' . str_replace('\\', '/', substr($class, 4)) . '.php';
});
use App\Services\Prova\ProvaProjectUploadService as U;
use App\Services\Prova\ProvaProjectService as P;
use App\Controllers\ProvaController;
function check(bool $yes, string $why): void { if (!$yes) throw new RuntimeException($why); }
function fixture(string $name, int $size, string $head = ''): string {
    $path = getenv('PROVA_TEST_TMP') . '/' . $name;
    $h = fopen($path, 'wb'); if ($head !== '') fwrite($h, $head); ftruncate($h, $size); fclose($h); return $path;
}
function put(int $uid, array $u, int $i, string $path): array { return U::chunk($uid, 'trabalho-final', $u['uploadId'], $i, ['error'=>0, 'tmp_name'=>$path], false); }
function finish(int $uid, array $u, int $max, ?callable $cb = null): array {
    return U::finish($uid, 'trabalho-final', $u['uploadId'], $max, $cb ?? static function(string $path, array $v): array {
        $stored = P::storeFile($path, false); check($stored['ok'], 'store');
        return ['ok'=>true,'size'=>$v['size'],'storedName'=>$stored['storedName'],'sha256'=>$stored['sha256']];
    });
}
function gone(array $u): bool { return (glob(U::partsDir().'/user-*/'.$u['uploadId'], GLOB_ONLYDIR) ?: []) === []; }
$max = 200*1024*1024; $chunk = U::CHUNK_SIZE;
$full = fixture('first.bin', $chunk, P::ZIP_SIGNATURE);
$zero = fixture('zeros.bin', $chunk);
$tail = fixture('tail.bin', 37);
$small = fixture('small.bin', 68, P::ZIP_SIGNATURE);
$bad = fixture('bad.bin', 68, 'MZ!!');
$u = U::init(7, 'trabalho-final', 'C:\\fakepath\\work.ZIP', 2*$chunk+37, $max);
check($u['ok'] && $u['totalChunks']===3 && $u['chunkSize']===$chunk, 'init');
check(put(7,$u,2,$tail)['ok'] && put(7,$u,0,$full)['ok'] && put(7,$u,1,$zero)['ok'], 'out of order');
check(put(7,$u,1,$zero)['ok'], 'idempotent resend');
check(!put(7,$u,1,$full)['ok'], 'conflicting resend');
check(!put(8,$u,0,$full)['ok'], 'wrong owner chunk');
check(!finish(8,$u,$max)['ok'], 'wrong owner finish');
check(!U::chunk(7,'other-exam',$u['uploadId'],0,['error'=>0,'tmp_name'=>$full],false)['ok'], 'wrong exam');
check(!put(7,$u,3,$zero)['ok'] && !put(7,$u,-1,$zero)['ok'], 'index range');
check(!U::chunk(7,'trabalho-final',$u['uploadId'],'1.0',['error'=>0,'tmp_name'=>$full],false)['ok'], 'non-integer index');
check(!put(7,$u,0,$tail)['ok'], 'wrong part size');
$r=finish(7,$u,$max); check($r['ok'] && $r['size']===2*$chunk+37 && gone($u), 'happy path');
check(filesize(P::pathForStoredName($r['storedName']))===$r['size'], 'stored size');
check(hash_file('sha256',P::pathForStoredName($r['storedName']))===$r['sha256'], 'stored hash');
check(is_file(U::partsDir().'/.htaccess'), 'deny-all staging');
$u=U::init(7,'trabalho-final','x.zip',68,$max);$new=U::init(7,'trabalho-final','x.zip',68,$max);check(gone($u),'new init discards old');
check(!put(7,$u,0,$small)['ok'],'old upload invalidated');
$missing=finish(7,$new,$max);check(!$missing['ok'] && gone($new),'missing part cleanup');
foreach ([0,-1,$max+1,'68',null] as $size) check(!U::init(7,'trabalho-final','x.zip',$size,$max)['ok'],'bad size');
check(!U::init(7,'trabalho-final','x.exe',68,$max)['ok'],'nonzip name');
check(!U::init(7,'trabalho-final',str_repeat('a',220).'.exe',68,$max)['ok'],'long nonzip name');
foreach (['../meta.json','../../escape','a/../b','',str_repeat('a',100)] as $id) {
 check(!U::chunk(7,'trabalho-final',$id,0,['error'=>0,'tmp_name'=>$small],false)['ok'],'traversal chunk');
 check(!U::finish(7,'trabalho-final',$id,$max,static fn()=>[])['ok'],'traversal finish');
}
$u=U::init(7,'trabalho-final','fake.zip',68,$max);check(put(7,$u,0,$bad)['ok'],'bad signature part accepted until final');$r=finish(7,$u,$max);check(!$r['ok']&&$r['status']===415&&gone($u),'nonzip final cleanup');
$u=U::init(7,'trabalho-final','x.zip',68,$max);check(put(7,$u,0,$small)['ok'],'valid part');
try { finish(7,$u,$max,static function():array {throw new RuntimeException('simulated failure');});check(false,'expected failure'); } catch(RuntimeException $e) {check($e->getMessage()==='simulated failure','exception');}
check(gone($u),'callback failure cleans parts');
// Exercise the real shared transaction's compensation without opening any DB.
class NoDatabase extends PDO {
 public function __construct() {}
 public function beginTransaction(): bool {throw new RuntimeException('simulated DB failure');}
 public function inTransaction(): bool {return false;}
}
$persist=new ReflectionMethod(ProvaController::class,'persistProjectSubmission');$failedStored=null;
$u=U::init(7,'trabalho-final','x.zip',68,$max);put(7,$u,0,$small);
try {
 finish(7,$u,$max,static function(string $path,array $v) use($persist,&$failedStored):array {
  $s=P::storeFile($path,false);$failedStored=P::pathForStoredName($s['storedName']);
  return $persist->invoke(null,new NoDatabase(),'trabalho-final',7,1700000000000,$v,$s);
 });check(false,'expected DB failure');
} catch(RuntimeException $e) {check($e->getMessage()==='simulated DB failure','DB failure');}
check(gone($u)&&$failedStored&&!is_file($failedStored),'transaction compensates file and parts');
class GradedStatement extends PDOStatement {
 public function __construct() {}
 public function execute(?array $params=null): bool {return true;}
 public function fetch(int $mode=PDO::FETCH_DEFAULT,int $cursorOrientation=PDO::FETCH_ORI_NEXT,int $cursorOffset=0): mixed {return ['status'=>'graded'];}
}
class GradedDatabase extends NoDatabase {
 public function beginTransaction(): bool {return true;}
 public function prepare(string $query,array $options=[]): PDOStatement|false {return new GradedStatement();}
 public function rollBack(): bool {return true;}
}
$u=U::init(7,'trabalho-final','x.zip',68,$max);put(7,$u,0,$small);$gradedStored=null;
$r=finish(7,$u,$max,static function(string $path,array $v) use($persist,&$gradedStored):array {
 $s=P::storeFile($path,false);$gradedStored=P::pathForStoredName($s['storedName']);
 return $persist->invoke(null,new GradedDatabase(),'trabalho-final',7,1700000000000,$v,$s);
});
check($r['status']===409&&gone($u)&&!is_file($gradedStored),'grade race compensates file and parts');
$rates=(new ReflectionClass(ProvaController::class))->getReflectionConstant('PROVA_RATE_BUCKETS')->getValue();
check($rates['upload']['limit']===6&&$rates['uploadChunk']['limit']>=40,'rate buckets allow ten parts and retries');
$stale=U::init(9,'trabalho-final','x.zip',68,$max);put(9,$stale,0,$small);
$fresh=U::init(10,'trabalho-final','x.zip',68,$max);put(10,$fresh,0,$small);
$dir=dirname(glob(U::partsDir().'/user-*/'.$stale['uploadId'])[0]);$meta=json_decode(file_get_contents($dir.'/meta.json'),true);$meta['updatedAt']=time()-U::TTL-1;file_put_contents($dir.'/meta.json',json_encode($meta));
check(U::purgeStale()===1&&gone($stale)&&!gone($fresh),'stale purge keeps fresh');
// Real 200 MiB stream/copy/hash path with a 32 MiB PHP memory_limit, ten parts.
$u=U::init(11,'trabalho-final','200mb.zip',$max,$max);check($u['totalChunks']===10,'200mb count');
for($i=9;$i>=0;$i--)check(put(11,$u,$i,$i===0?$full:$zero)['ok'],'200mb part');
$r=finish(11,$u,$max);check($r['ok']&&$r['size']===$max&&gone($u),'200mb finish');
$peak=memory_get_peak_usage(true);check($peak<32*1024*1024,'bounded memory');
echo json_encode(['php'=>'PASS','sizeBytes'=>$r['size'],'parts'=>10,'peakMemoryBytes'=>$peak,'memoryLimit'=>ini_get('memory_limit')]).PHP_EOL;
`;
try {
  const script = path.join(tmp, 'check.php');
  fs.writeFileSync(script, php);
  const proc = spawnSync('php', ['-d', 'memory_limit=32M', script], {
    encoding: 'utf8', timeout: 120000,
    env: { ...process.env, PROVA_TEST_ROOT: root, PROVA_TEST_TMP: tmp, PROVA_UPLOAD_DIR: path.join(tmp, 'storage') },
  });
  assert.equal(proc.status, 0, proc.stdout + proc.stderr);
  console.log(proc.stdout.trim());
} finally {
  // Only the unique test-owned system-temp tree is eligible for removal.
  assert.equal(path.dirname(path.resolve(tmp)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(tmp).startsWith('prova-chunks-'));
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Real exported browser client; XHR mocked, no requests to any host.
const { provaSubmitProject } = await import('../js/api.js');
const nativeTimer = globalThis.setTimeout;
const waits = [];
globalThis.setTimeout = (fn, ms) => { waits.push(ms); return nativeTimer(fn, 0); };
let attempts = [], failures = [], calls = [];
class XHR {
  upload = {};
  open(method, url) { this.url = url; }
  setRequestHeader() {}
  getResponseHeader() { return this.status === 429 ? '1' : null; }
  send(body) {
    const action = new URL(this.url, 'http://local.invalid').searchParams.get('action');
    calls.push(action);
    if (action === 'projectUploadInit') this.response = { ok: true, uploadId: 'test-id', chunkSize: 20 * 1024 * 1024, totalChunks: 3 };
    else if (action === 'projectUploadChunk') {
      const index = Number(body.get('index')); attempts.push(index);
      assert.equal(body.get('file').size, index === 2 ? 7 : 20 * 1024 * 1024);
      this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
      const failure = failures.shift();
      if (failure === 0) { this.onerror(); return; }
      if (failure) { this.status = failure; this.response = null; this.onload(); return; }
      this.response = { ok: true, index };
    } else this.response = { ok: true, submission: { uploadCount: 1 } };
    this.status = 200; this.onload();
  }
}
globalThis.XMLHttpRequest = XHR;
// No allocation of 40 MiB in JS: only deterministic sized Blob slices.
const file = { name: 'x.zip', size: 40 * 1024 * 1024 + 7, slice(a, b) { return new Blob([new Uint8Array(b - a)]); } };
try {
  const progress = [];
  failures = [0, 500, 429];
  await provaSubmitProject('token', file, { onProgress: p => progress.push(p) });
  assert.deepEqual(attempts, [0, 0, 0, 0, 1, 2]);
  assert.deepEqual(waits, [500, 1000, 2000]);
  assert.equal(progress.at(-1), 1);
  assert.ok(progress.every((p, i) => p >= 0 && p <= 1 && (!i || p >= progress[i - 1])));
  assert.equal(calls.filter(a => a === 'projectUploadFinish').length, 1);
  for (const status of [400, 401, 403, 409, 413, 415]) {
    attempts = []; failures = [status]; calls = [];
    await assert.rejects(provaSubmitProject('token', file), error => error.status === status
      && (status !== 413 || /hospedagem ou o proxy/.test(error.message)));
    assert.equal(attempts.length, 1); assert.ok(!calls.includes('projectUploadFinish'));
  }
  attempts = []; failures = [503, 503, 503, 503];
  await assert.rejects(provaSubmitProject('token', file), e => e.status === 503);
  assert.equal(attempts.length, 4, 'three retries maximum');
  console.log('prova-chunk-upload-smoke: OK (PHP staging + mocked client retry/progress)');
} finally { globalThis.setTimeout = nativeTimer; delete globalThis.XMLHttpRequest; }
