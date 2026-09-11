/**
 * Boot síncrono do véu de DevTools — carregar no <head> SEM type="module".
 * Atalhos + botão direito. Se DevTools já estiver aberto, redireciona ao início.
 *
 * Detecção: tamanho (quando funciona) + Worker com debugger (página NÃO trava;
 * se o worker não responder a tempo, assume DevTools aberto).
 */
(function () {
  'use strict';

  var ARG_PATH = /(?:^|\/)(?:pages\/)?submundo(?:\/|$)/i;
  var SIZE_THRESHOLD_PX = 160;
  var WORKER_TIMEOUT_MS = 320;
  var path = (typeof location !== 'undefined' && location.pathname) || '';
  if (ARG_PATH.test(path)) return;

  function isArg() {
    var current = (typeof location !== 'undefined' && location.pathname) || '';
    return ARG_PATH.test(current);
  }

  function isHome() {
    var current = (typeof location !== 'undefined' && location.pathname) || '';
    if (!current || current === '/') return true;
    if (current.indexOf('/pages/') !== -1) return false;
    return /(?:^|\/)index\.html$/i.test(current);
  }

  function homeHref() {
    var current = (typeof location !== 'undefined' && location.pathname) || '';
    if (current.indexOf('/pages/') !== -1) return '../index.html';
    return './index.html';
  }

  function isShortcut(event) {
    if (!event) return false;
    var key = String(event.key || '');
    var code = String(event.code || '');
    if (key === 'F12' || code === 'F12') return true;

    var ctrlOrMeta = Boolean(event.ctrlKey || event.metaKey);
    if (!ctrlOrMeta) return false;

    var letter = key.length === 1 ? key.toLowerCase() : '';
    var codeLetter = code.indexOf('Key') === 0 ? code.slice(3).toLowerCase() : '';

    if (!event.shiftKey && !event.altKey && (letter === 'u' || codeLetter === 'u')) {
      return true;
    }

    var inspect = letter === 'i' || letter === 'j' || letter === 'c' || letter === 'k'
      || codeLetter === 'i' || codeLetter === 'j' || codeLetter === 'c' || codeLetter === 'k';
    if (!inspect) return false;
    if (event.shiftKey || event.altKey) return true;
    return false;
  }

  function isDockedOpen() {
    var ww = window.innerWidth || 0;
    var wh = window.innerHeight || 0;
    var ow = window.outerWidth || 0;
    var oh = window.outerHeight || 0;
    if (Math.abs(ow - ww) > SIZE_THRESHOLD_PX || Math.abs(oh - wh) > SIZE_THRESHOLD_PX) {
      return true;
    }
    // Chrome às vezes reporta outer≈inner; se a janela está maximizada e o
    // viewport encolheu muito vs a tela, DevTools dockado é o motivo usual.
    var sw = (window.screen && (window.screen.availWidth || window.screen.width)) || 0;
    var sh = (window.screen && (window.screen.availHeight || window.screen.height)) || 0;
    var nearMaxW = sw > 0 && ow >= sw - 48;
    var nearMaxH = sh > 0 && oh >= sh - 48;
    if (nearMaxW && sw - ww > SIZE_THRESHOLD_PX) return true;
    if (nearMaxH && sh - wh > SIZE_THRESHOLD_PX + 40) return true;
    return false;
  }

  function goHome() {
    if (isArg() || isHome()) return;
    if (window.__fjdDevtoolsRedirecting) return;
    window.__fjdDevtoolsRedirecting = true;
    window.location.replace(homeHref());
  }

  function probeWorker(done) {
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined') {
      done(isDockedOpen());
      return;
    }
    var settled = false;
    var finish = function (open) {
      if (settled) return;
      settled = true;
      try { worker.terminate(); } catch (e) { /* ignore */ }
      try { URL.revokeObjectURL(url); } catch (e2) { /* ignore */ }
      done(Boolean(open));
    };

    var source = 'onmessage=function(){var t=Date.now();debugger;postMessage(Date.now()-t);};';
    var url;
    var worker;
    try {
      url = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
      worker = new Worker(url);
      worker.onmessage = function (event) {
        finish((event.data || 0) > 100);
      };
      worker.onerror = function () {
        finish(isDockedOpen());
      };
      worker.postMessage(0);
      setTimeout(function () {
        // Sem resposta = worker pausado no debugger ⇒ DevTools aberto.
        finish(true);
      }, WORKER_TIMEOUT_MS);
    } catch (err) {
      finish(isDockedOpen());
    }
  }

  function redirectHomeIfOpen() {
    if (isArg() || isHome()) return;
    if (window.__fjdDevtoolsRedirecting) return;
    if (isDockedOpen()) {
      goHome();
      return;
    }
    if (window.__fjdDevtoolsProbing) return;
    window.__fjdDevtoolsProbing = true;
    probeWorker(function (open) {
      window.__fjdDevtoolsProbing = false;
      if (open) goHome();
    });
  }

  function onKeydown(event) {
    if (isArg()) return;
    if (!isShortcut(event)) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onContextMenu(event) {
    if (isArg()) return;
    event.preventDefault();
    event.stopPropagation();
  }

  if (!window.__fjdDevtoolsGuardBound) {
    window.addEventListener('keydown', onKeydown, true);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    window.__fjdDevtoolsGuardBound = true;
  }

  if (!window.__fjdDevtoolsOpenWatch) {
    window.__fjdDevtoolsOpenWatch = true;
    window.addEventListener('resize', redirectHomeIfOpen);
    window.addEventListener('focus', redirectHomeIfOpen);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') redirectHomeIfOpen();
    });
    window.addEventListener('pageshow', function () {
      window.__fjdDevtoolsGuardInstalled = true;
      redirectHomeIfOpen();
    });
    // Worker probe é mais caro — intervalo maior; resize/focus cobrem o resto.
    window.setInterval(redirectHomeIfOpen, 1600);
    redirectHomeIfOpen();
  }

  window.__fjdDevtoolsGuardInstalled = true;
})();
