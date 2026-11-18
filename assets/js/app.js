/* TheMindCurator V2 — own-code app.
   Modules: asset-loader preloader (real bytes), lenis, SplitText (GSAP 3.15, real plugin),
   header-theme, marquee, steps (ref sub-timeline segments + snap), counters,
   work rail (video cards, virtualised buffer), services rail, faq, footer sequence. */
(function(){
"use strict";
var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var hasGsap = typeof gsap !== 'undefined';
if (hasGsap && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
if (hasGsap && typeof SplitText !== 'undefined') gsap.registerPlugin(SplitText);

/* ---------- data: work + services ---------- */
var WORK = [
 {name:'Alessandro Pet Spa', img:'assets/img/work-alessandro.webp', vid:'assets/video/work-alessandro.webm', url:'https://m-arjun-same.github.io/alessandro-pet-spa/', bio:'Pet grooming salon in Los Angeles, in business since 2005 — a booking site with a before/after reveal.', type:'Business Site', place:'Los Angeles', status:'Live'},
 {name:'Paradise Restaurant', img:'assets/img/work-paradise.webp', vid:'assets/video/work-paradise.webm', url:'https://m-arjun-same.github.io/paradise-restaurant/', bio:'Hyderabad&rsquo;s biryani institution since 1953 — a full ordering site with a shared cart.', type:'Ordering Site', place:'Hyderabad', status:'Live'},
 {name:'Mayuri Footwears', img:'assets/img/work-mayuri.webp', vid:'assets/video/work-mayuri.webm', url:'https://m-arjun-same.github.io/mayuri-footwears/', bio:'Footwear store in Kukatpally — a showcase site built around the shop&rsquo;s real range.', type:'Business Site', place:'Hyderabad', status:'Live'},
 {name:'Videotheque', img:'assets/img/work-videotheque.webp', vid:'assets/video/work-videotheque.webm', url:'https://m-arjun-same.github.io/videotheque/', bio:'Indie video &amp; vinyl shop in Highland Park, since 2003 — 40,000+ titles on one shelf.', type:'Business Site', place:'Los Angeles', status:'Live'},
 {name:'Malgudi Coffee House', img:'assets/img/work-malgudi.webp', vid:'assets/video/work-malgudi.webm', url:'https://m-arjun-same.github.io/malgudi-coffee-house/', bio:'Filter coffee house at KPHB Metro — a site with a 360° brass tumbler you can spin.', type:'Business Site', place:'Hyderabad', status:'Live'},
 {name:'ShashiClicks', img:'assets/img/work-shashiclicks.webp', vid:'assets/video/work-shashiclicks.webm', url:'https://m-arjun-same.github.io/shashiclicks/', bio:'Hyderabad photo studio — a cinematic portfolio with a camera journey at its centre.', type:'Portfolio Site', place:'Hyderabad', status:'Live'}
];
var SERVICES = [
 {name:'Landing Page', price:'4,999', desc:'One page that says it all — offer, proof and a button that gets tapped.'},
 {name:'Portfolio Site', price:'6,999', desc:'Your work, curated — for photographers, artists and creators.'},
 {name:'Website Design', price:'9,999', desc:'A full design for your business website, ready to build from.'},
 {name:'Full Business Website', price:'19,999', desc:'The complete site — pages, motion and your whole story, live.'},
 {name:'Ordering / E-commerce', price:'29,999', desc:'Sell from your own site — products, cart and orders.'},
 {name:'Consulting', price:'999', desc:'One call. Honest answers on your website, design and next move.'}
];
var track = document.getElementById('workTrack');
WORK.forEach(function(w){
  var a = document.createElement('article'); a.className='work_card';
  a.innerHTML = '<a href="'+w.url+'" target="_blank" rel="noopener" draggable="false"><div class="work_poster"><video muted loop playsinline preload="metadata" poster="'+w.img+'" src="'+w.vid+'" aria-label="'+w.name+' — live site in motion"></video><span class="work_open">Visit live site</span></div></a>'+
  '<div class="work_body"><h4>'+w.name+'</h4><p class="body muted">'+w.bio+'</p>'+
  '<dl class="work_stats"><div><dt>Type</dt><dd>'+w.type+'</dd></div><div><dt>Place</dt><dd>'+w.place+'</dd></div><div><dt>Status</dt><dd><span class="live">●</span> '+w.status+'</dd></div></dl></div>';
  track.appendChild(a);
});
var svcRail = document.getElementById('svcRail');
SERVICES.forEach(function(s){
  var d=document.createElement('div'); d.className='svc_card';
  d.innerHTML='<div><p class="eyebrow">'+s.name+'</p><p class="body muted" style="margin-top:.75rem">'+s.desc+'</p></div><p class="svc_price"><span class="cur">₹</span>'+s.price+'</p>';
  svcRail.appendChild(d);
});
/* marquee: services tickers, duplicated group (reference pattern) */
var pills = SERVICES.map(function(s){return '<span class="marquee_pill">'+s.name+' <b>₹'+s.price+'</b></span>'}).join('');
var group = '<div class="marquee_group">'+pills+pills+'</div>';
document.getElementById('marqueeTrack').innerHTML = group + group;

/* ---------- preloader: percent = REAL asset bytes (AssetLoader pattern, dossier P-A4) ----------
   Tracks the full hero-critical set: 48 figure frames, normal map, figure poster,
   FKGrotesk font, 6 work posters. Bytes counted from response streams. Session-once. */
var ASSETS = (function(){
  var list = ['assets/gl/normal.webp','assets/gl/poster.webp','assets/fonts/FKGrotesk-Regular.woff2'];
  for (var i=0;i<48;i++) list.push('assets/gl/frames/fig-'+('00'+i).slice(-3)+'.webp');
  WORK.forEach(function(w){ list.push(w.img); });
  return list;
})();
window.__mcAssets = ASSETS;
var played=false; try{ played = !!sessionStorage.getItem('mindcurator:preloader-played'); }catch(e){}
var pre=document.querySelector('.preloader');
function ready(){ document.documentElement.classList.add('is-ready'); }
if (played || reduced){ ready(); if(pre) pre.style.display='none'; }
else {
  var pctEl=document.getElementById('prePct'), finished=false;
  var finish=function(){ if(finished) return; finished=true; if(pctEl) pctEl.textContent='100';
    try{ sessionStorage.setItem('mindcurator:preloader-played','1'); }catch(e){}
    setTimeout(function(){ if(pre){ pre.classList.add('is-done'); } ready(); setTimeout(function(){ if(pre) pre.style.display='none'; },700); },250); };
  var totalBytes=0, loadedBytes=0, sizes={};
  var draw=function(){ if(pctEl && totalBytes>0) pctEl.textContent=String(Math.min(99, Math.floor(loadedBytes/totalBytes*100))); };
  var loadOne=function(url){
    return fetch(url).then(function(r){
      var len = parseInt(r.headers.get('content-length')||'0',10);
      if(!r.body || !r.body.getReader){ return r.blob().then(function(b){ sizes[url]=b.size; totalBytes+=b.size; loadedBytes+=b.size; draw(); }); }
      sizes[url]=len; totalBytes+=len;
      var reader=r.body.getReader(), got=0;
      var pump=function(){ return reader.read().then(function(res){ if(res.done){ if(len===0){ sizes[url]=got; totalBytes+=got; } draw(); return; } got+=res.value.byteLength; loadedBytes+=res.value.byteLength; draw(); return pump(); }); };
      return pump();
    }).catch(function(){ /* failed asset counts as settled; GL loader reports real errors separately */ });
  };
  Promise.all(ASSETS.map(loadOne)).then(finish);
  setTimeout(finish, 6000); /* loader failsafe */
  /* eager font load race like the reference bootstrap (5s timeout, warn-only) */
  if (document.fonts && document.fonts.load){ Promise.race([document.fonts.load('400 100px Fkgrotesk'), new Promise(function(r){ setTimeout(r,5000); })]).catch(function(){}); }
}

/* ---------- Lenis smooth scroll + ScrollTrigger sync ---------- */
var lenis=null;
if (typeof Lenis!=='undefined' && !reduced){
  lenis = new Lenis({ smoothWheel:true, syncTouch:false, syncTouchLerp:0.075, wheelMultiplier:1, touchMultiplier:1 });
  if (hasGsap && typeof ScrollTrigger !== 'undefined'){
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function(t){ lenis.raf(t*1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    var raf=function(t){ lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
  }
}
document.querySelectorAll('a[href^="#"]').forEach(function(a){
  a.addEventListener('click',function(e){ var id=a.getAttribute('href'); if(id.length<2)return; var t=document.querySelector(id); if(!t)return; e.preventDefault(); closeMenu(); if(lenis) lenis.scrollTo(t); else t.scrollIntoView({behavior:'smooth'}); });
});

/* ---------- menu ---------- */
var menuBtn=document.getElementById('menuBtn'), navMenu=document.getElementById('navMenu'), menuOpen=false;
function closeMenu(){ menuOpen=false; navMenu.classList.remove('is-open'); menuBtn.querySelector('.roll_inner').style.transform=''; document.documentElement.style.overflow=''; if(lenis)lenis.start(); }
menuBtn.addEventListener('click',function(){
  menuOpen=!menuOpen; navMenu.classList.toggle('is-open',menuOpen);
  menuBtn.querySelector('.roll_inner').style.transform = menuOpen?'translateY(-1.3em)':'';
  if(menuOpen){ if(lenis)lenis.stop(); } else if(lenis) lenis.start();
});

/* ---------- header theme flipping ---------- */
var header=document.getElementById('siteHeader');
var themed=Array.prototype.slice.call(document.querySelectorAll('[data-header-theme]'));
function headerTheme(){ var cur=null;
  themed.forEach(function(s){ var r=s.getBoundingClientRect(); if(r.top<=60 && r.bottom>60) cur=s; });
  if(cur) header.classList.toggle('on-light', cur.getAttribute('data-header-theme')==='light');
  if(navMenu.classList.contains('is-open')) header.classList.remove('on-light');
}
window.addEventListener('scroll',headerTheme,{passive:true}); headerTheme();

/* ---------- split text: REAL GSAP SplitText 3.15 (dossier §7.4 values) ----------
   clip: chars masked, yPercent 110 -> 0, .6s, --ease-custom, stagger via char index
   blur: 1.2s opacity + blur(.5rem); fade: 1.2s opacity; random: .6s random-order chars */
if (hasGsap && typeof SplitText !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !reduced){
  document.querySelectorAll('[data-split]').forEach(function(el){
    var mode = el.getAttribute('data-split-mode') || 'clip';
    try {
      var cfg = { type:'chars,words', charsClass:'st_char', wordsClass:'st_word' };
      if (mode==='clip') cfg.mask = 'chars'; /* mask only for the clip reveal; blur/fade stay unmasked like the ref CSS modes */
      var split = SplitText.create(el, cfg);
      var vars = { ease:'expo.out', scrollTrigger:{ trigger:el, start:'top 88%', once:true } };
      if (mode==='clip'){ vars.yPercent = 115; vars.duration = 0.6; vars.stagger = 0.022; }
      else if (mode==='blur'){ vars.opacity = 0; vars.filter = 'blur(8px)'; vars.duration = 1.2; vars.stagger = 0.018; }
      else if (mode==='fade'){ vars.opacity = 0; vars.duration = 1.2; vars.stagger = 0.015; }
      else if (mode==='random'){ vars.opacity = 0; vars.y = 24; vars.duration = 0.6; vars.stagger = { each:0.012, from:'random' }; }
      gsap.from(split.chars, vars);
    } catch(e){ /* SplitText failure degrades to plain reveal, like the reference */ }
  });
}
/* fade-in body copy */
if ('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('is-inview'); io.unobserve(en.target); } }); },{threshold:0.25});
  document.querySelectorAll('[data-fadein]').forEach(function(el){ io.observe(el); });
} else { document.querySelectorAll('[data-fadein]').forEach(function(el){ el.classList.add('is-inview'); }); }

/* ---------- steps: pinned progression at ref geometry + sub-timeline segments ----------
   Desktop: 900 stage + 10530 pin spacer = 11430 (ref). Mobile: 844 + 9405 = 10249
   (chosen so the mobile page total matches the ref mobile total 18401).
   Segments (ref offsets): question 0.5-20 · step1 20.5-45 · step2 45.5-72.5 · step3 72.5-90.5 · outro 90.5-100.
   Snap centres with ref snap durations 1.5 / 2.25 / 2.5 / 1.2 (min/max window). */
var stepItems=document.querySelectorAll('.step_item');
var pills=[0,1,2].map(function(k){ return document.getElementById('pill'+k); });
var question=document.querySelector('.steps_question'), stepsUi=document.getElementById('stepsUi');
var outro=document.querySelector('.steps_outro');
function segFrac(p, a, b){ return Math.min(1, Math.max(0, (p-a)/(b-a))); }
function setSteps(p){
  var idx = p<0.205 ? -1 : p<0.455 ? 0 : p<0.725 ? 1 : p<0.905 ? 2 : 3;
  stepItems.forEach(function(it,i){ it.classList.toggle('is-active', i===idx); });
  pills.forEach(function(pl,k){ if(pl) pl.classList.toggle('is-on', k===Math.max(0,Math.min(2,idx))); });
  var segs=[[0.205,0.45],[0.455,0.725],[0.725,0.905]];
  for(var k=0;k<3;k++){ var bar=document.getElementById('sp'+k); var f=segFrac(p,segs[k][0],segs[k][1]); bar.className = f>=1?'done':(f>0?'act':''); if(f>0&&f<1) bar.style.setProperty('--p',f); }
  if(question) question.style.opacity = String(1-segFrac(p,0.155,0.205));
  var of = segFrac(p,0.905,0.96);
  if(stepsUi) stepsUi.style.opacity = String(1-of);
  if(outro){ outro.style.opacity = String(of); outro.style.pointerEvents = of>0.5 ? 'auto' : 'none'; }
}
if (hasGsap && typeof ScrollTrigger !== 'undefined' && !reduced){
  var stState={p:0};
  gsap.to(stState,{p:1,ease:'none',scrollTrigger:{trigger:'#stepsPin',start:'top top',end:function(){ return '+=' + (window.innerWidth>991 ? 10530 : 9405); },scrub:true,pin:true,anticipatePin:1,
    snap:{ snapTo:[0.1025,0.3275,0.59,0.815,0.9525], duration:{min:1.2,max:2.5}, delay:0.08, ease:'power2.inOut' }},
    onUpdate:function(){ setSteps(stState.p); }});
  setSteps(0);
} else { stepItems.forEach(function(it){ it.style.position='static'; it.style.opacity=1; it.style.visibility='visible'; }); if(question) question.style.display='none'; if(outro) outro.style.opacity='1'; }

/* ---------- counters ---------- */
document.querySelectorAll('[data-stat]').forEach(function(el){
  var target=parseFloat(el.getAttribute('data-stat')), suf=el.getAttribute('data-suffix')||'';
  var run=function(){ if(!hasGsap||reduced){ el.textContent=target+suf; return; }
    var o={v:0}; gsap.to(o,{v:target,duration:1.4,ease:'expo.out',onUpdate:function(){ el.textContent=Math.round(o.v)+suf; }}); };
  if('IntersectionObserver' in window){ var co=new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ run(); co.disconnect(); } }); },{threshold:0.4}); co.observe(el); } else run();
});

/* ---------- work rail: drag + momentum + virtualised video buffer (dossier P-A8) ----------
   Rail pattern values: bufferAhead/buffer window — only cards within ±2 of the active
   card keep a playing stream; the rest pause on their poster. */
(function(){
  var view=document.getElementById('workRail'), x=0, vel=0, dragging=false, startX=0, startTx=0, moved=0, raf=null, activeIdx=-1;
  var dotsBox=document.getElementById('workDots');
  var videos=Array.prototype.slice.call(track.querySelectorAll('video'));
  WORK.forEach(function(_,i){ var d=document.createElement('i'); if(i===0)d.className='on'; dotsBox.appendChild(d); });
  function cardW(){ return Math.min(416, window.innerWidth*0.82)+28; }
  function maxX(){ return Math.max(0, track.scrollWidth - view.clientWidth + 32); }
  function clampX(v){ return Math.min(0, Math.max(-maxX(), v)); }
  function buffer(idx){
    if(idx===activeIdx) return; activeIdx=idx;
    videos.forEach(function(v,i){
      if (Math.abs(i-idx)<=2){ v.preload='auto'; var pr=v.play(); if(pr&&pr.catch) pr.catch(function(){}); }
      else { v.pause(); }
    });
    Array.prototype.forEach.call(dotsBox.children,function(d,i){ d.classList.toggle('on', i===idx); });
  }
  function apply(){ track.style.transform='translateX('+x+'px)'; buffer(Math.min(WORK.length-1,Math.max(0,Math.round(Math.abs(x)/cardW())))); }
  function step(dir){ x=clampX(x - dir*cardW()); apply(); }
  document.getElementById('workNext').addEventListener('click',function(){ step(1); });
  document.getElementById('workPrev').addEventListener('click',function(){ step(-1); });
  view.addEventListener('pointerdown',function(e){ dragging=true; moved=0; startX=e.clientX; startTx=x; vel=0; view.classList.add('is-drag'); view.setPointerCapture(e.pointerId); if(raf)cancelAnimationFrame(raf); });
  view.addEventListener('pointermove',function(e){ if(!dragging)return; var dx=e.clientX-startX; moved=Math.max(moved,Math.abs(dx)); vel=dx*0.12; x=clampX(startTx+dx); apply(); });
  var end=function(){ if(!dragging)return; dragging=false; view.classList.remove('is-drag');
    var glide=function(){ vel*=0.94; if(Math.abs(vel)<0.2)return; x=clampX(x+vel); apply(); raf=requestAnimationFrame(glide); }; glide(); };
  view.addEventListener('pointerup',end); view.addEventListener('pointercancel',end);
  view.addEventListener('click',function(e){ if(moved>8){ e.preventDefault(); e.stopPropagation(); } },true);
  window.addEventListener('resize',function(){ x=clampX(x); apply(); });
  if('IntersectionObserver' in window){ new IntersectionObserver(function(es){ es.forEach(function(en){ if(!en.isIntersecting){ videos.forEach(function(v){ v.pause(); }); } else { activeIdx=-1; apply(); } }); },{threshold:0.05}).observe(view); }
  apply();
})();

/* ---------- services rail: scroll-scrubbed translate (ref rail pattern: top 60% -> bottom 25%) ---------- */
(function(){
  var view=document.getElementById('svcView');
  if (hasGsap && typeof ScrollTrigger!=='undefined' && !reduced && window.innerWidth>991){
    var dist=function(){ return Math.max(0, svcRail.scrollWidth - view.clientWidth + 64); };
    gsap.to(svcRail,{x:function(){ return -dist(); },ease:'none',scrollTrigger:{trigger:'#services',start:'top 60%',end:'bottom 25%',scrub:true}});
  } else { view.style.overflowX='auto'; }
})();

/* ---------- FAQ accordion ---------- */
document.querySelectorAll('.faq_item').forEach(function(item){
  var q=item.querySelector('.faq_q'), a=item.querySelector('.faq_a');
  q.addEventListener('click',function(){
    var open=item.classList.contains('is-open');
    document.querySelectorAll('.faq_item.is-open').forEach(function(o){ o.classList.remove('is-open'); o.querySelector('.faq_a').style.maxHeight='0px'; o.querySelector('.faq_q').setAttribute('aria-expanded','false'); });
    if(!open){ item.classList.add('is-open'); a.style.maxHeight=a.scrollHeight+'px'; q.setAttribute('aria-expanded','true'); }
  });
});

/* ---------- footer phones: sequence-progress scrub ---------- */
(function(){
  var t=document.getElementById('phonesTrack'); if(!t)return;
  if (hasGsap && typeof ScrollTrigger!=='undefined' && !reduced){
    gsap.fromTo(t,{x:60},{x:function(){ return -Math.max(0, t.scrollWidth - window.innerWidth + 80); },ease:'none',scrollTrigger:{trigger:'.footer',start:'top bottom',end:'bottom bottom',scrub:true}});
  }
})();

/* ---------- breakpoint reload (reference P-A11: device asset sets differ) ---------- */
var wasDesktop = window.innerWidth>991;
window.addEventListener('resize',function(){ var d=window.innerWidth>991; if(d!==wasDesktop){ wasDesktop=d; window.location.reload(); } });

if (hasGsap && typeof ScrollTrigger!=='undefined') window.addEventListener('load',function(){ ScrollTrigger.refresh(); });
})();
