// Capture real motion from each live project site via CDP screencast while
// auto-scrolling, save frames for ffmpeg WebM assembly.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = '/home/hatch/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome';
const PORT = 9571;
const SITES = [
  ['alessandro', 'https://m-arjun-same.github.io/alessandro-pet-spa/'],
  ['paradise', 'https://m-arjun-same.github.io/paradise-restaurant/'],
  ['mayuri', 'https://m-arjun-same.github.io/mayuri-footwears/'],
  ['videotheque', 'https://m-arjun-same.github.io/videotheque/'],
  ['malgudi', 'https://m-arjun-same.github.io/malgudi-coffee-house/'],
  ['shashiclicks', 'https://m-arjun-same.github.io/shashiclicks/'],
];
const proc = spawn(CHROME, ['--no-sandbox', '--disable-dev-shm-usage', '--headless=new',
  '--remote-debugging-port=' + PORT, '--window-size=900,600', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wsUrl() { for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }); const j = await r.json(); if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; } catch (e) {} await sleep(500); } throw new Error('no ws'); }
const url = await wsUrl();
const ws = new WebSocket(url); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); const frameCbs = [];
ws.onmessage = m => { const j = JSON.parse(m.data); if (j.id && pend.has(j.id)) { const p = pend.get(j.id); pend.delete(j.id); j.error ? p.rej(new Error(JSON.stringify(j.error))) : p.res(j.result); } if (j.method === 'Page.screencastFrame') frameCbs.forEach(f => f(j.params)); };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
async function ev(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 200)); return r.result.value; }
await send('Page.enable'); await send('Runtime.enable');
for (const [name, site] of SITES) {
  const dir = new URL(`./frames-${name}/`, import.meta.url).pathname;
  mkdirSync(dir, { recursive: true });
  const frames = [];
  const cb = p => { frames.push(p.data); send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => {}); };
  frameCbs.length = 0; frameCbs.push(cb);
  await send('Page.navigate', { url: site });
  await sleep(5000);
  await send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 880, maxHeight: 560, everyNthFrame: 3 });
  // slow scroll down then back up over ~7s for a loopable drift
  await ev(`(async()=>{ const H=document.body.scrollHeight; const t0=performance.now(); return new Promise(res=>{ function f(){ const t=(performance.now()-t0)/7000; if(t>=1){res(1);return;} const y=Math.sin(t*Math.PI)*Math.min(1600,H-700); window.scrollTo(0,y); requestAnimationFrame(f);} f(); }); })()`);
  await sleep(400);
  await send('Page.stopScreencast');
  // keep ~28 evenly spaced frames
  const keep = 28, step = Math.max(1, Math.floor(frames.length / keep));
  let n = 0;
  for (let i = 0; i < frames.length && n < keep; i += step) { writeFileSync(dir + `f${String(n).padStart(3, '0')}.jpg`, Buffer.from(frames[i], 'base64')); n++; }
  console.log(name, 'raw', frames.length, 'kept', n);
}
ws.close(); proc.kill(); process.exit(0);
