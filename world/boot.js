/* backspace — world runtime bootstrap (world/boot.js) — a CLASSIC script.
 *
 * Chromium refuses <script type="module"> from a file:// origin before a byte
 * of it runs, so a module cannot report its own failure to load. This file
 * is classic (no import statements; the precedent is shared/bs-stage3d.js):
 * it checks the protocol and WebGL2 first, prints the notice itself, and only
 * then does import('./world.js') — a dynamic import from a classic script
 * still resolves the bare 'three' specifier through the page's importmap.
 * Failing to a black screen is against the law (seed §4).
 */
(function () {
  'use strict';
  var noticed = false;
  function notice(e) {
    var raw = (e && e.message) ? e.message : String(e);
    try { console.warn('[world] room unavailable —', raw); } catch (err) { /* no console */ }
    if (noticed) return;
    noticed = true;
    var msg = 'the world did not load — ' + raw;
    if (location.protocol === 'file:') {
      var dir = '', name = 'home.html';
      try {
        var parts = decodeURIComponent(location.pathname).split('/');
        name = parts.pop() || name;
        dir = parts.join('/');
      } catch (err) { /* keep defaults */ }
      msg = 'the world needs a server. file:// blocks the module import and\n' +
            'the asset fetch, so the room stays on its poster.\n\n' +
            'cd "' + dir + '" && python3 tools/dev-server.py 8481\n\n' +
            'then open  http://localhost:8481/' + name;
    }
    try {
      var canvas = document.getElementById('bs-world');
      var el = document.createElement('div');
      el.setAttribute('role', 'status');
      el.id = 'bs-world-notice';
      el.style.cssText = 'position:fixed;left:50%;top:52%;transform:translate(-50%,-50%);z-index:3;' +
        'max-width:52ch;text-align:center;font:400 12px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;' +
        'letter-spacing:.06em;color:rgba(255,255,255,.42);pointer-events:none;text-wrap:balance;white-space:pre-line;';
      el.textContent = msg;
      ((canvas && canvas.parentNode) || document.body).appendChild(el);
    } catch (err) { /* nothing left to do */ }
  }
  window.__bsWorldNotice = notice;

  function webgl2() {
    try {
      if (!window.WebGL2RenderingContext) return false;
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
      if (!gl) return false;
      var lose = gl.getExtension('WEBGL_lose_context');   // release the probe context
      if (lose) lose.loseContext();
      return true;
    } catch (err) { return false; }
  }

  var self = document.currentScript && document.currentScript.src;
  var roomAttr = document.currentScript && document.currentScript.getAttribute('data-room');
  if (roomAttr) window.__bsWorldRoom = roomAttr;   // which registry room this page hosts (default 'home')
  var moduleUrl = self ? new URL('world.js', self).href : 'world/world.js';

  if (location.protocol === 'file:') { notice(new Error('file:// protocol')); return; }
  if (!webgl2()) { notice(new Error('WebGL2 is not available in this browser')); return; }
  try {
    import(moduleUrl).catch(function (e) { notice(e || new Error('module import failed')); });
  } catch (e) { notice(e); }
})();
