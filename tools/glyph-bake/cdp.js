// cdp.js — zero-dependency Chrome DevTools Protocol client (Node >= 22, global WebSocket).
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CHROME = process.env.BS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function launch({ port = 9333, width = 1728, height = 1117 } = {}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bs-witness-'));
  const proc = spawn(CHROME, [
    ...(process.env.BS_HEADED ? [] : ['--headless=new']), `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', ...(process.env.BS_SCROLLBARS ? [] : ['--hide-scrollbars']),
    `--window-size=${width},${height}`, `--force-device-scale-factor=${process.env.BS_DPR || 1}`,
    '--disable-features=TranslateUI', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; proc.stderr.on('data', d => { err += d; });
  for (let i = 0; i < 150; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return { proc, profile, version: await r.json() }; } catch (_) {}
    await sleep(100);
  }
  throw new Error('chrome did not open the debugging port\n' + err);
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = new Set(); }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const c = new CDP(ws);
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && c.pending.has(m.id)) { const p = c.pending.get(m.id); c.pending.delete(m.id); m.error ? p.rej(new Error(m.method + ': ' + m.error.message)) : p.res(m.result); }
      else if (m.method) for (const l of c.listeners) l(m);
    };
    return c;
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params, sessionId })); });
  }
  waitFor(method, pred = () => true, timeout = 20000) {
    return new Promise((res, rej) => {
      const t = setTimeout(() => { this.listeners.delete(l); rej(new Error('timeout waiting ' + method)); }, timeout);
      const l = m => { if (m.method === method && pred(m)) { clearTimeout(t); this.listeners.delete(l); res(m); } };
      this.listeners.add(l);
    });
  }
}

class Page {
  constructor(cdp, sessionId) { this.cdp = cdp; this.sid = sessionId; }
  send(m, p) { return this.cdp.send(m, p, this.sid); }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || JSON.stringify(r.exceptionDetails)));
    return r.result.value;
  }
  async viewport(width, height, dpr = 1) { await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false }); }
  async goto(url) {
    const loaded = this.cdp.waitFor('Page.loadEventFired');
    await this.send('Page.navigate', { url });
    await loaded;
    await this.eval('document.fonts.ready.then(()=>true)');
  }
  async screenshot(clip, scale = 1) {
    const r = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, clip: clip ? Object.assign({ scale }, clip) : undefined });
    return Buffer.from(r.data, 'base64');
  }
}

async function withBrowser(fn, opts = {}) {
  const { proc, profile, version } = await launch(opts);
  const cdp = await CDP.connect(version.webSocketDebuggerUrl);
  try {
    const newPage = async () => {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      const p = new Page(cdp, sessionId);
      await p.send('Page.enable'); await p.send('Runtime.enable');
      await p.viewport(opts.width || 1728, opts.height || 1117, 1);
      return p;
    };
    return await fn({ cdp, newPage, version });
  } finally {
    try { cdp.ws.close(); } catch (_) {}
    proc.kill('SIGTERM'); await sleep(150);
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

module.exports = { launch, CDP, Page, withBrowser, sleep };
