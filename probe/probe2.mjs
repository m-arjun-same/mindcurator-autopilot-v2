// V2 probe: geometry dump vs ref, screenshots at identical stops, GL state, errors, failed requests.
// Usage: node probe2.mjs <baseUrl> <prefix>
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = '/home/hatch/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome';
const base = process.argv[2], prefix = process.argv[3] || 'v2';
const PORT = 9581;
const proc = spawn(CHROME, ['--no-sandbox', '--disable-dev-shm-usage', '--headless=new', '--remote-debugging-port=' + PORT,
  '--window-size=1440,900', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wsUrl() { for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }); const j = await r.json(); if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; } catch (e) {} await sleep(500); } throw new Error('no ws'); }
const ws = new WebSocket(await wsUrl()); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); const errors = [], failed = [], badStatus = [];
ws.onmessage = m => { const j = JSON.parse(m.data);
  if (j.id && pend.has(j.id)) { const p = pend.get(j.id); pend.delete(j.id); j.error ? p.rej(new Error(JSON.stringify(j.error))) : p.res(j.result); }
  if (j.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (j.params.exceptionDetails.exception?.description || j.params.exceptionDetails.text || '').slice(0, 200));
  if (j.method === 'Runtime.consoleAPICalled' && j.params.type === 'error') errors.push('CONSOLE ' + j.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 200));
  if (j.method === 'Network.loadingFailed') failed.push(j.params.errorText + ' ' + (j.params.type || ''));
  if (j.method === 'Network.responseReceived' && j.params.response.status >= 400) badStatus.push(j.params.response.status + ' ' + j.params.response.url);
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
async function ev(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; }
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Log.enable').catch(() => {});
await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__errs=[];window.addEventListener("error",e=>window.__errs.push(e.message));' });

async function geometry() {
  return await ev(`JSON.stringify({docH: document.documentElement.scrollHeight,
    sections: [...document.querySelectorAll('main > section, main > footer')].map(s => ({cls: s.className.split(' ')[0] + (s.id ? '#'+s.id : ''), top: Math.round(s.getBoundingClientRect().top + window.scrollY), h: Math.round(s.getBoundingClientRect().height)})),
    splitChars: document.querySelectorAll('.st_char').length,
    gl: window.__glState ? {ok: window.__glState.ok, frame: +window.__glState.frame.toFixed(2), p: +window.__glState.p.toFixed(3)} : null,
    pre: (document.querySelector('.preloader')||{}).style ? getComputedStyle(document.querySelector('.preloader')).display : '?',
    errs: window.__errs || [] })`);
}
async function shotAt(name, w, h, stops, geoFirst) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
  await send('Page.navigate', { url: base });
  await sleep(7000);
  let geo = null;
  if (geoFirst) geo = await geometry();
  const widths = await ev('JSON.stringify({doc:document.documentElement.scrollWidth,win:window.innerWidth})');
  for (const y of stops) {
    await ev(`window.scrollTo(0,${y}); new Promise(r=>setTimeout(r,1000))`);
    if (y === 1200) { const g2 = await ev('window.__glState?JSON.stringify({frame:+window.__glState.frame.toFixed(2),p:+window.__glState.p.toFixed(3)}):"nogl"'); console.log(' GL@1200', g2); }
    const s = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(new URL(`./${prefix}-${name}-${y}.png`, import.meta.url).pathname, Buffer.from(s.data, 'base64'));
    console.log(' shot', name, y);
  }
  return { geo, widths };
}
const d = await shotAt('desk', 1440, 900, [0, 900, 1800, 2700, 3600, 4500, 5400, 6300, 7200, 8100, 9000], true);
console.log('DESK-GEO', d.geo); console.log('DESK-W', d.widths);
const m = await shotAt('mob', 390, 844, [0, 844, 1688, 2532], true);
console.log('MOB-GEO', m.geo); console.log('MOB-W', m.widths);
for (const w of [360, 412, 480]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: base }); await sleep(2500);
  console.log('WIDTH', w, await ev('JSON.stringify({doc:document.documentElement.scrollWidth,win:window.innerWidth,docH:document.documentElement.scrollHeight})'));
}
console.log('ERRORS', JSON.stringify(errors.slice(0, 10)));
console.log('FAILED', JSON.stringify(failed.slice(0, 10)));
console.log('BADSTATUS', JSON.stringify(badStatus.slice(0, 10)));
ws.close(); proc.kill(); process.exit(0);
