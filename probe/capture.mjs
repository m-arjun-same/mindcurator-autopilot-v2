// Generic visual capture: node capture.mjs <url> <prefix> [proxy]
// Captures desk 1440x900 + mob 412x915 at identical stops into probe/visual/
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = '/home/hatch/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome';
const url = process.argv[2], prefix = process.argv[3], useProxy = process.argv[4] === 'proxy';
const PORT = parseInt(process.env.CPORT || '9591', 10);
mkdirSync(new URL('./visual/', import.meta.url).pathname, { recursive: true });
const args = ['--no-sandbox', '--disable-dev-shm-usage', '--headless=new', '--remote-debugging-port=' + PORT,
  '--window-size=1440,900', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'];
if (useProxy) args.push('--proxy-server=http://127.0.0.1:18080', '--ignore-certificate-errors');
args.push('about:blank');
const proc = spawn(CHROME, args, { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wsUrl() { for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }); const j = await r.json(); if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; } catch (e) {} await sleep(500); } throw new Error('no ws'); }
const ws = new WebSocket(await wsUrl()); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); const errors = [], failed = [];
ws.onmessage = m => { const j = JSON.parse(m.data);
  if (j.id && pend.has(j.id)) { const p = pend.get(j.id); pend.delete(j.id); j.error ? p.rej(new Error(JSON.stringify(j.error))) : p.res(j.result); }
  if (j.method === 'Runtime.exceptionThrown') errors.push((j.params.exceptionDetails.exception?.description || '').slice(0, 160));
  if (j.method === 'Network.loadingFailed') failed.push(j.params.errorText);
  if (j.method === 'Network.responseReceived' && j.params.response.status >= 400) failed.push(j.params.response.status + ' ' + j.params.response.url.slice(-80));
};
const send = (mm, p = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: mm, params: p })); });
async function ev(x) { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('exc ' + JSON.stringify(r.exceptionDetails).slice(0, 200)); return r.result.value; }
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
const DESK = [0, 900, 2700, 4500, 6300, 8100, 9900, 11700, 13900, 15000, 16200, 17100, 18000, 18600];
const MOB = [0, 844, 2532, 4200, 5908, 7596, 10900, 13500, 15200, 16800, 17600];
async function run(name, w, h, stops, wait) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
  await send('Page.navigate', { url });
  await sleep(wait);
  console.log(name, 'docH', await ev('document.documentElement.scrollHeight'), 'w', await ev('JSON.stringify([document.documentElement.scrollWidth, innerWidth])'));
  for (const y of stops) {
    await ev(`window.scrollTo(0,${y}); new Promise(r=>setTimeout(r,1050))`);
    const s = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(new URL(`./visual/${prefix}-${name}-${y}.png`, import.meta.url).pathname, Buffer.from(s.data, 'base64'));
    console.log(' shot', name, y);
  }
}
await run('desk', 1440, 900, DESK, 9000);
await run('mob', 412, 915, MOB, 8000);
console.log('ERRORS', JSON.stringify(errors.slice(0, 6)));
console.log('FAILED', JSON.stringify(failed.slice(0, 8)));
ws.close(); proc.kill(); process.exit(0);
