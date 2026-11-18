// Quick hero-only shots: node quickshot.mjs <url> <prefix> [proxy]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = '/home/hatch/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome';
const url = process.argv[2], prefix = process.argv[3], useProxy = process.argv[4] === 'proxy';
const PORT = parseInt(process.env.CPORT || '9593', 10);
mkdirSync(new URL('./visual/', import.meta.url).pathname, { recursive: true });
const args = ['--no-sandbox', '--disable-dev-shm-usage', '--headless=new', '--remote-debugging-port=' + PORT,
  '--window-size=1440,900', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'];
if (useProxy) args.push('--proxy-server=http://127.0.0.1:18080', '--ignore-certificate-errors');
args.push('about:blank');
const proc = spawn(CHROME, args, { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wsUrl() { for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }); const j = await r.json(); if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; } catch (e) {} await sleep(500); } throw new Error('no ws'); }
const ws = new WebSocket(await wsUrl()); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
ws.onmessage = m => { const j = JSON.parse(m.data); if (j.id && pend.has(j.id)) { const p = pend.get(j.id); pend.delete(j.id); j.error ? p.rej(new Error(JSON.stringify(j.error))) : p.res(j.result); } };
const send = (mm, p = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: mm, params: p })); });
async function ev(x) { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('exc'); return r.result.value; }
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
for (const [name, w, h, stops] of [['desk', 1440, 900, [0, 450]], ['mob', 412, 915, [0, 450]]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
  await send('Page.navigate', { url });
  await sleep(8000);
  for (const y of stops) {
    await ev(`window.scrollTo(0,${y}); new Promise(r=>setTimeout(r,1100))`);
    const s = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(new URL(`./visual/${prefix}-${name}-${y}.png`, import.meta.url).pathname, Buffer.from(s.data, 'base64'));
    console.log('shot', name, y, await ev('window.__glState?JSON.stringify({f:+__glState.frame.toFixed(1),p:+__glState.p.toFixed(2)}):"nogl"'));
  }
}
ws.close(); proc.kill(); process.exit(0);
