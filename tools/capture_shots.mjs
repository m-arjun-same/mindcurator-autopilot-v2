// Fallback capture: screenshot sequence (CDP captureScreenshot in a loop while
// the page auto-scrolls) -> ffmpeg WebM. Real rendered frames of the live sites.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = '/home/hatch/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome';
const PORT = 9573;
const SITES = [
  ['alessandro', 'https://m-arjun-same.github.io/alessandro-pet-spa/'],
  ['paradise', 'https://m-arjun-same.github.io/paradise-restaurant/'],
  ['mayuri', 'https://m-arjun-same.github.io/mayuri-footwears/'],
  ['videotheque', 'https://m-arjun-same.github.io/videotheque/'],
  ['malgudi', 'https://m-arjun-same.github.io/malgudi-coffee-house/'],
  ['shashiclicks', 'https://m-arjun-same.github.io/shashiclicks/'],
];
const proc = spawn(CHROME, ['--no-sandbox', '--disable-dev-shm-usage', '--headless=new',
  '--remote-debugging-port=' + PORT, '--window-size=900,600', '--mute-audio',
  '--proxy-server=http://127.0.0.1:18080', '--ignore-certificate-errors',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wsUrl() { for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }); const j = await r.json(); if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; } catch (e) {} await sleep(500); } throw new Error('no ws'); }
const url = await wsUrl();
const ws = new WebSocket(url); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
ws.onmessage = m => { const j = JSON.parse(m.data); if (j.id && pend.has(j.id)) { const p = pend.get(j.id); pend.delete(j.id); j.error ? p.rej(new Error(JSON.stringify(j.error))) : p.res(j.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
async function ev(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 200)); return r.result.value; }
await send('Page.enable'); await send('Runtime.enable');
for (const [name, site] of SITES) {
  const dir = new URL(`./frames-${name}/`, import.meta.url).pathname;
  mkdirSync(dir, { recursive: true });
  await send('Page.navigate', { url: site });
  await sleep(6000);
  // start smooth auto-scroll in page (rAF sine drift down/up)
  await ev(`window.__capStop=false; (function(){ const H=document.body.scrollHeight; const t0=performance.now(); function f(){ if(window.__capStop) return; const t=(performance.now()-t0)/8000; if(t>=1){window.__capStop=true;return;} window.scrollTo(0, Math.sin(t*Math.PI)*Math.min(1500,H-650)); requestAnimationFrame(f);} f(); })(); 1`);
  let n = 0;
  for (let i = 0; i < 22; i++) {
    const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
    writeFileSync(dir + `f${String(n).padStart(3, '0')}.jpg`, Buffer.from(s.data, 'base64')); n++;
    await sleep(300);
  }
  await ev('window.__capStop=true; window.scrollTo(0,0); 1');
  console.log(name, 'shots', n);
}
ws.close(); proc.kill(); process.exit(0);
