/**
 * ============================================================
 * STORE — Camada de dados do "Domínio" (Vercel Serverless)
 * ============================================================
 * O Vercel possui sistema de arquivos EFÊMERO: nada gravado em
 * disco sobrevive entre invocações. Portanto esta camada é um
 * ADAPTADOR com duas implementações:
 *
 *   1. KV (produção)  → Vercel KV / Upstash Redis, ativado
 *                        automaticamente quando as variáveis de
 *                        ambiente KV_REST_API_URL e
 *                        KV_REST_API_TOKEN existirem.
 *   2. MEMÓRIA (dev)  → Map em escopo de módulo. Sobrevive apenas
 *                        enquanto a instância serverless estiver
 *                        "quente". É o modo de SIMULAÇÃO pedido.
 *
 * ATENÇÃO (limitação real, não um bug): no modo MEMÓRIA, cadastros
 * feitos em produção podem desaparecer quando a Vercel recicla ou
 * escala a instância. O ADMIN é sempre re-semeado, então o login
 * do mestre nunca se perde. Para persistência real, provisione o
 * Vercel KV — nenhuma outra linha de código precisa mudar.
 * ============================================================
 */

import crypto from 'node:crypto';

/* ============================================================
   1. CONFIGURAÇÃO DO ADMINISTRADOR (hardcoded / semeado sempre)
   ============================================================ */
const ADMIN_SEED = {
  name: 'VonLuqi',
  password: 'TaciLucas2002@',
  role: 'admin',
};

/* ============================================================
   2. CÓDIGOS DE RESGATE ("Oferenda ao Estige")
   ============================================================
   Cada código concede XP e uma conquista específica. Futuramente
   isto virá de uma tabela `redeem_codes` no SQL/KV.
   ============================================================ */
export const REDEEM_CODES = {
  MDA2026: {
    lessonId: 'aula1',
    lessonTitle: 'Aula 1 — A Regra do Jogo',
    xp: 20,
    achievement: 'primeiro_sangue',
  },
};

/* ============================================================
   3. CATÁLOGO DE CONQUISTAS (avaliadas no servidor)
   ============================================================
   Manter a REGRA no backend impede que o aluno destrave conquistas
   editando o localStorage — e corrige o bug de conquistas
   concedidas indevidamente no cadastro.
   ============================================================ */
export const ACHIEVEMENT_RULES = [
  { id: 'primeiro_sangue', test: (u) => u.completedLessons.includes('aula1') },
  { id: 'cacador_echos', test: (u) => u.xp >= 20 },
  { id: 'escudeiro', test: (u) => u.completedLessons.length >= 2 },
  { id: 'arquiteto', test: (u) => u.completedLessons.includes('aula1') && u.xp >= 20 },
  { id: 'desvendador', test: (u) => u.achievements.length >= 3 },
  { id: 'campeao', test: (u) => u.xp >= 120 },
];

/* ============================================================
   4. ADAPTADOR DE PERSISTÊNCIA
   ============================================================ */
const KV_ENABLED = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

/** Estado em memória — usado quando o KV não está provisionado. */
const memory = {
  users: new Map(),    // nameLower → UserRecord
  sessions: new Map(), // token → { name, createdAt }
  seeded: false,
};

/** Carrega o client do Vercel KV apenas se disponível (dep opcional). */
async function getKv() {
  if (!KV_ENABLED) return null;
  try {
    const mod = await import('@vercel/kv');
    return mod.kv;
  } catch {
    // Dependência não instalada: cai para memória silenciosamente.
    return null;
  }
}

const USERS_KEY = 'fjg:users';
const SESSION_PREFIX = 'fjg:session:';

/* ============================================================
   5. HASH DE SENHA (scrypt + salt) — nunca guardamos texto plano
   ============================================================ */
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt] = stored.split(':');
  const candidate = hashPassword(password, salt);
  // Comparação de tempo constante evita ataques de temporização.
  const a = Buffer.from(candidate);
  const b = Buffer.from(stored);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ============================================================
   6. FÁBRICA DE USUÁRIO
   ============================================================
   CORREÇÃO DE BUG: todo novo usuário nasce com xp = 0 e
   achievements = [] — nenhuma conquista é concedida no cadastro.
   ============================================================ */
export function createUserRecord({ name, password, role = 'student' }) {
  return {
    name: name.trim(),
    passwordHash: hashPassword(password),
    role,
    avatarIndex: 0,
    xp: 0,
    achievements: [],
    completedLessons: [],
    redeemedCodes: [],
    createdAt: new Date().toISOString(),
  };
}

/** Remove campos sensíveis antes de enviar ao cliente. */
export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

/* ============================================================
   7. LEITURA / ESCRITA DE USUÁRIOS
   ============================================================ */
async function readAllUsers() {
  const kv = await getKv();
  if (kv) {
    const stored = await kv.get(USERS_KEY);
    const list = Array.isArray(stored) ? stored : [];
    return new Map(list.map((u) => [u.name.trim().toLowerCase(), u]));
  }
  return memory.users;
}

async function writeAllUsers(usersMap) {
  const kv = await getKv();
  if (kv) {
    await kv.set(USERS_KEY, Array.from(usersMap.values()));
    return;
  }
  memory.users = usersMap;
}

/**
 * Garante que o ADMIN exista. É chamado no início de toda rota,
 * por isso o mestre "VonLuqi" nunca se perde, mesmo que a
 * instância serverless seja reciclada.
 */
export async function ensureSeed() {
  const users = await readAllUsers();
  const key = ADMIN_SEED.name.trim().toLowerCase();

  if (!users.has(key)) {
    const adminUser = createUserRecord(ADMIN_SEED);
    // Avalia conquistas iniciais (ex.: se o seed deve ganhar alguma conquista)
    evaluateAchievements(adminUser);
    users.set(key, adminUser);
    await writeAllUsers(users);
  } else {
    // Assegura que o papel continue sendo admin, mesmo após edições.
    const admin = users.get(key);
    if (admin.role !== 'admin') {
      admin.role = 'admin';
      await writeAllUsers(users);
    }
  }

  memory.seeded = true;
  return users;
}

export async function findUserByName(name) {
  if (!name) return null;
  const users = await ensureSeed();
  return users.get(name.trim().toLowerCase()) ?? null;
}

export async function saveUser(user) {
  const users = await ensureSeed();
  users.set(user.name.trim().toLowerCase(), user);
  await writeAllUsers(users);
  return user;
}

export async function listUsers() {
  const users = await ensureSeed();
  return Array.from(users.values());
}

/* ============================================================
   8. SESSÕES (token opaco)
   ============================================================ */
export async function createSession(userName) {
  const token = crypto.randomBytes(24).toString('hex');
  const payload = { name: userName, createdAt: new Date().toISOString() };

  const kv = await getKv();
  if (kv) {
    // TTL de 7 dias
    await kv.set(SESSION_PREFIX + token, payload, { ex: 60 * 60 * 24 * 7 });
  } else {
    memory.sessions.set(token, payload);
  }
  return token;
}

export async function readSession(token) {
  if (!token) return null;
  const kv = await getKv();
  if (kv) {
    return (await kv.get(SESSION_PREFIX + token)) ?? null;
  }
  return memory.sessions.get(token) ?? null;
}

export async function destroySession(token) {
  if (!token) return;
  const kv = await getKv();
  if (kv) {
    await kv.del(SESSION_PREFIX + token);
    return;
  }
  memory.sessions.delete(token);
}

/** Resolve o usuário autenticado a partir de um token. */
export async function getUserFromToken(token) {
  const session = await readSession(token);
  if (!session) return null;
  return findUserByName(session.name);
}

/* ============================================================
   9. AVALIAÇÃO DE CONQUISTAS (server-authoritative)
   ============================================================ */
export function evaluateAchievements(user) {
  const unlocked = new Set(user.achievements);
  const newlyUnlocked = [];

  // Duas passagens: a regra "desvendador" depende da contagem final.
  for (let pass = 0; pass < 2; pass += 1) {
    for (const rule of ACHIEVEMENT_RULES) {
      if (unlocked.has(rule.id)) continue;
      const snapshot = { ...user, achievements: Array.from(unlocked) };
      if (rule.test(snapshot)) {
        unlocked.add(rule.id);
        newlyUnlocked.push(rule.id);
      }
    }
  }

  user.achievements = Array.from(unlocked);
  return newlyUnlocked;
}

/* ============================================================
   10. UTILITÁRIOS DE RESPOSTA HTTP
   ============================================================ */
export function sendJson(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

/** Lê e valida o corpo JSON da requisição (Vercel já faz o parse na maioria dos casos). */
export function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export function getStorageMode() {
  return KV_ENABLED ? 'kv' : 'memory';
}
