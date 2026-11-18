/* TheMindCurator V2 — WebGL hero (own code, Three.js r184).
   Technique (dossier P-A3): one fixed canvas; hero scene = scroll-scrubbed frame
   sequence of the centre figure, blended between frames, relit by a normal map
   (normalDepth pattern); floating WebGL card planes around the figure; ellipse
   glow; footer scene = fullscreen background quad that fades in at the footer.
   Scene range = [data-gl-scene-start] hero -> [data-gl-scene-end] steps. */
import * as THREE from './three.module.js';

const canvas = document.getElementById('glCanvas');
const FRAMES = 48;
const frameUrl = i => 'assets/gl/frames/fig-' + String(i).padStart(3, '0') + '.webp';
const state = { p: 0, frame: 0, heroVis: 1, footerVis: 0, mx: 0, my: 0, ok: false, spreadX: 1, baseX: 1.15, desktop: true };
window.__glState = state;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
  state.ok = false;
  throw e;
}
state.ok = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.z = 11;

const loader = new THREE.TextureLoader();
function loadTex(url, srgb) {
  const t = loader.load(url);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* --- relight shader: frame blend + normal-map lighting (own GLSL) --- */
const relightVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const relightFrag = /* glsl */`
  uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tN;
  uniform float uMix; uniform vec2 uLight; uniform float uShade; uniform float uOpacity;
  varying vec2 vUv;
  void main(){
    vec4 base = mix(texture2D(tA, vUv), texture2D(tB, vUv), uMix);
    vec3 n = texture2D(tN, vUv).rgb * 2.0 - 1.0;
    vec3 L = normalize(vec3(uLight, 0.85));
    float dif = clamp(dot(normalize(n), L), 0.0, 1.0);
    vec3 col = base.rgb * (1.0 - uShade + uShade * (0.72 + 0.5 * dif));
    col += vec3(1.0, 0.96, 0.9) * pow(dif, 6.0) * 0.10 * base.a;
    gl_FragColor = vec4(col, base.a * uOpacity);
  }`;
function relightMat(texA, texB, normal, shade) {
  return new THREE.ShaderMaterial({
    vertexShader: relightVert, fragmentShader: relightFrag, transparent: true, depthWrite: false,
    uniforms: {
      tA: { value: texA }, tB: { value: texB || texA }, tN: { value: normal },
      uMix: { value: 0 }, uLight: { value: new THREE.Vector2(0.4, 0.6) },
      uShade: { value: shade }, uOpacity: { value: 1 }
    }
  });
}

/* flat normal for the card planes (1x1 DataTexture) */
const flatNormal = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
flatNormal.needsUpdate = true;
const figureNormal = loadTex('assets/gl/normal.webp', false);

/* figure: frame-sequence plane, 880x1100 aspect */
const frameTex = [];
for (let i = 0; i < FRAMES; i++) frameTex.push(loadTex(frameUrl(i), true));
const figureMat = relightMat(frameTex[0], frameTex[1], figureNormal, 0.42);
const figure = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 6.5), figureMat);
figure.position.set(0.55, -0.2, 0);

/* floating cards: small translucent glass chart cards at the ref positions
   (left-top, over the face, right of the head, lower-right cluster, far right) */
const cardDefs = [
  { u: 'assets/gl/cards/card-alessandro.webp', w: 1.55, h: 1.05, home: [-2.5, 1.35, -0.8], ry: 0.45, rz: -0.10 },
  { u: 'assets/gl/cards/card-paradise.webp', w: 1.9, h: 1.28, home: [-1.0, 0.05, 0.3], ry: -0.30, rz: 0.06 },
  { u: 'assets/gl/cards/card-videotheque.webp', w: 2.0, h: 1.35, home: [1.85, 1.0, -1.0], ry: -0.50, rz: 0.09 },
  { u: 'assets/gl/cards/card-shashiclicks.webp', w: 2.1, h: 1.42, home: [1.25, -0.75, -0.4], ry: -0.35, rz: -0.05 },
  { u: 'assets/gl/cards/card-mayuri.webp', w: 1.6, h: 1.08, home: [3.1, -0.35, -1.4], ry: -0.65, rz: 0.12 }
];
const cards = cardDefs.map((def, i) => {
  const m = relightMat(loadTex(def.u, true), null, flatNormal, 0.3);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(def.w, def.h), m);
  mesh.userData.home = new THREE.Vector3(...def.home);
  mesh.userData.ry = def.ry; mesh.userData.rz = def.rz;
  mesh.userData.phase = i * 1.7;
  mesh.position.copy(mesh.userData.home);
  mesh.rotation.set(0, def.ry, def.rz);
  return mesh;
});

/* soft neutral halo behind the head (the ref ellipse_wrap), NOT a colour glow */
function glowTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 64, 4, 128, 64, 126);
  grad.addColorStop(0, 'rgba(255,255,255,0.10)'); grad.addColorStop(0.55, 'rgba(255,255,255,0.03)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 128);
  const t = new THREE.CanvasTexture(c); return t;
}
const ellipse = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 4.2),
  new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false }));
ellipse.position.set(0.55, 1.2, -2);

/* footer scene background: fullscreen quad, grid + glow shader */
const footerMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uA: { value: 0 }, uT: { value: 0 } },
  vertexShader: relightVert,
  fragmentShader: /* glsl */`
    uniform float uA; uniform float uT; varying vec2 vUv;
    void main(){
      vec2 g = abs(fract(vUv * vec2(28.0, 16.0)) - 0.5);
      float line = smoothstep(0.48, 0.5, max(g.x, g.y)) * 0.05;
      float glow = pow(1.0 - distance(vUv, vec2(0.5, 1.05)), 2.2) * 0.35;
      vec3 col = vec3(0.051) + vec3(0.85) * glow * 0.5 + vec3(line);
      gl_FragColor = vec4(col, uA);
    }`
});
const footerQuad = new THREE.Mesh(new THREE.PlaneGeometry(30, 17), footerMat);
footerQuad.position.z = -6;

const heroGroup = new THREE.Group();
heroGroup.add(ellipse, figure, ...cards);
scene.add(heroGroup, footerQuad);

function layout() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const desktop = w > 991;
  state.baseX = 0; state.desktop = desktop;
  heroGroup.position.x = state.baseX;
  heroGroup.position.y = desktop ? 0.1 : -0.3;
  state.spreadX = desktop ? 1 : 0.55;
  const s = desktop ? 1 : 0.8;
  state.baseScale = s;
  heroGroup.scale.setScalar(s);
  state.figY = desktop ? -0.02 : -0.55;
  figure.position.x = desktop ? 0.8 : 0.65;
  figure.scale.setScalar(desktop ? 1 : 1.05);
}
layout();
window.addEventListener('resize', layout);

/* scroll drivers (ScrollTrigger from the classic scripts) */
function bindScroll() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') { setTimeout(bindScroll, 120); return; }
  gsap.registerPlugin(ScrollTrigger);
  const scrub = { p: 0 };
  gsap.to(scrub, { p: 1, ease: 'none',
    scrollTrigger: { trigger: '[data-gl-scene-start]', start: 'top top', endTrigger: '[data-gl-scene-end]', end: 'bottom top', scrub: true },
    onUpdate: () => { state.p = scrub.p; } });
  gsap.to(state, { heroVis: 0, ease: 'none',
    scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'top 35%', scrub: true } });
  gsap.to(state, { footerVis: 1, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'top 30%', scrub: true } });
}
bindScroll();

window.addEventListener('pointermove', e => {
  state.mx = (e.clientX / window.innerWidth - 0.5) * 2;
  state.my = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const t = clock.getElapsedTime();
  const p = state.p;
  /* frame scrub across the hero->steps scene range, ease none (ref) */
  const f = Math.min(FRAMES - 1.001, Math.max(0, p * (FRAMES - 1)));
  const i0 = Math.floor(f), i1 = Math.min(FRAMES - 1, i0 + 1);
  figureMat.uniforms.tA.value = frameTex[i0];
  figureMat.uniforms.tB.value = frameTex[i1];
  figureMat.uniforms.uMix.value = f - i0;
  state.frame = f;
  const lx = Math.sin(p * Math.PI * 1.3 + state.mx * 0.6) * 0.85;
  const ly = Math.cos(p * Math.PI * 0.9 + state.my * 0.4) * 0.7 + 0.25;
  figureMat.uniforms.uLight.value.set(lx, ly);
  figureMat.uniforms.uOpacity.value = state.heroVis;
  figure.position.y = (state.figY || -0.2) + Math.sin(t * 0.7) * 0.05 + p * 0.7;
  figure.rotation.y = -0.06 + p * 0.12 + state.mx * 0.05;
  heroGroup.rotation.y = state.mx * 0.03;
  heroGroup.position.x = state.baseX + (state.desktop ? p * 0.3 : 0);
  heroGroup.scale.setScalar((state.baseScale || 1) * (1 + p * 0.38)); /* scene pushes in through steps, like the ref character close-up */
  cards.forEach((c, i) => {
    const h0 = c.userData.home, ph = c.userData.phase;
    c.position.x = h0.x * state.spreadX * (1 + p * 0.14) + Math.sin(t * 0.5 + ph) * 0.08;
    c.position.y = h0.y * (1 + p * 0.2) + Math.cos(t * 0.42 + ph) * 0.09 + p * (i % 2 ? 0.9 : -0.6);
    c.rotation.z = c.userData.rz + p * (i % 2 ? -0.22 : 0.22);
    c.rotation.y = c.userData.ry + p * 0.18 * (i % 2 ? 1 : -1);
    c.material.uniforms.uOpacity.value = state.heroVis * 0.88;
    c.material.uniforms.uLight.value.set(lx, ly);
  });
  ellipse.material.opacity = 0.85 * state.heroVis;
  footerMat.uniforms.uA.value = state.footerVis;
  footerMat.uniforms.uT.value = t;
  canvas.style.opacity = (state.heroVis > 0.01 || state.footerVis > 0.01) ? '1' : '0';
  canvas.style.zIndex = state.footerVis > 0.05 ? '1' : '5';
  renderer.render(scene, camera);
}
tick();
