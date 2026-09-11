/**
 * Boot síncrono do véu de DevTools — carregar no <head> SEM type="module".
 * Fecha a janela em que F12 / Ctrl+U ainda passam antes do ES module.
 *
 * Não tenta detectar “DevTools já aberto” nem redirecionar: heurísticas de
 * tamanho/Worker geram falso positivo e expulsam alunos legítimos.
 */
(function () {
  'use strict';

  var ARG_PATH = /(?:^|\/)(?:pages\/)?submundo(?:\/|$)/i;
  var path = (typeof location !== 'undefined' && location.pathname) || '';
  if (ARG_PATH.test(path)) return;
  if (window.__fjdDevtoolsGuardBound) {
    window.__fjdDevtoolsGuardInstalled = true;
    return;
  }

  function isArg() {
    var current = (typeof location !== 'undefined' && location.pathname) || '';
    return ARG_PATH.test(current);
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

  window.addEventListener('keydown', onKeydown, true);
  document.addEventListener('keydown', onKeydown, true);
  window.addEventListener('contextmenu', onContextMenu, true);
  document.addEventListener('contextmenu', onContextMenu, true);
  window.addEventListener('pageshow', function () {
    var current = (typeof location !== 'undefined' && location.pathname) || '';
    if (ARG_PATH.test(current)) return;
    window.__fjdDevtoolsGuardInstalled = true;
  });

  window.__fjdDevtoolsGuardBound = true;
  window.__fjdDevtoolsGuardInstalled = true;
})();
