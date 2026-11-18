import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME='/home/hatch/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome';
const PORT=9583, base='http://127.0.0.1:9580/';
const proc=spawn(CHROME,['--no-sandbox','--disable-dev-shm-usage','--headless=new','--remote-debugging-port='+PORT,'--window-size=1440,900','--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wsUrl(){for(let i=0;i<40;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'});const j=await r.json();if(j.webSocketDebuggerUrl)return j.webSocketDebuggerUrl;}catch(e){}await sleep(500);}throw new Error('no ws');}
const ws=new WebSocket(await wsUrl()); await new Promise(r=>ws.onopen=r);
let id=0; const pend=new Map();
ws.onmessage=m=>{const j=JSON.parse(m.data); if(j.id&&pend.has(j.id)){const p=pend.get(j.id);pend.delete(j.id); j.error?p.rej(new Error(JSON.stringify(j.error))):p.res(j.result);}};
const send=(mm,p={})=>new Promise((res,rej)=>{const i=++id;pend.set(i,{res,rej});ws.send(JSON.stringify({id:i,method:mm,params:p}));});
async function ev(x){const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails)throw new Error('exc'); return r.result.value;}
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:base}); await sleep(7000);
for(const y of [0, 6900, 18600]){
  await ev(`window.scrollTo(0,${y}); new Promise(r=>setTimeout(r,1100))`);
  console.log('at',y,'gl', await ev('window.__glState?JSON.stringify({f:+__glState.frame.toFixed(1),p:+__glState.p.toFixed(2),hv:+__glState.heroVis.toFixed(2),fv:+__glState.footerVis.toFixed(2)}):"nogl"'),
    'videos', await ev('JSON.stringify([...document.querySelectorAll("video")].map(v=>({paused:v.paused,t:+v.currentTime.toFixed(1)})))'));
  const s=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync(new URL(`./v2c-desk-${y}.png`,import.meta.url).pathname, Buffer.from(s.data,'base64'));
}
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await send('Page.navigate',{url:base}); await sleep(6000);
for(const y of [0, 4200]){
  await ev(`window.scrollTo(0,${y}); new Promise(r=>setTimeout(r,1100))`);
  const s=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync(new URL(`./v2c-mob-${y}.png`,import.meta.url).pathname, Buffer.from(s.data,'base64'));
  console.log('mob shot',y);
}
ws.close(); proc.kill(); process.exit(0);
