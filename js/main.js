import * as THREE from 'three';
import { animate, onScroll, stagger, splitText } from 'animejs';
import { buildWorld, ORDER, NAMES, W, TOP, R, CAM } from './world.js';

const ACC = '#ff5fc0'; // Thompson magenta; cyan #5be3ff and violet #b489ff are the supporting accents
const N = ORDER.length;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// touch screens have no hover: say "tap" instead
const touch = matchMedia('(hover: none)').matches, verb = touch ? 'Tap' : 'Hover';
if (touch) document.querySelectorAll('[data-verb]').forEach(el => { el.textContent = el.textContent[0] === 'H' ? 'Tap' : 'tap'; });

// ---- renderer, scene, lights
const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.5 : 2)); // phones: fewer pixels, smoother frame rate
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#ECE9F6', 90, 200);
const camera = new THREE.PerspectiveCamera(35, 1, .1, 300);
scene.add(new THREE.HemisphereLight('#D9F0FA', '#EAD9EE', 1.6));
const sun = new THREE.DirectionalLight('#FFF1DC', 2.4);
sun.position.set(-8, 18, 18);
sun.target.position.set(13, 0, 20);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(touch ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 80 });
sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);

const world = buildWorld(scene, ACC);

// ---- camera poses: hero = map overview, then one pose per island from its own side
const YAW = CAM;
const ZOOM = { dj: .62 }, LIFT = { dj: 2.6 }; // the party gets a closer look, from above the crowd
const V = (...a) => new THREE.Vector3(...a);
// on a phone held upright the text sits at the bottom, so islands are centred and framed in the top half
let portrait = innerWidth < innerHeight;
function pose(i) {
  if (i === 0) {
    if (portrait) { const T = V(14, -27, 20); return { T, C: T.clone().add(V(0, 68, 96)) }; }
    const T = V(1, -1, 21); return { T, C: T.clone().add(V(0, 38, 70)) };
  }
  const id = ORDER[i], yaw = YAW[id];
  const dir = V(Math.sin(yaw), 0, Math.cos(yaw)), right = V(Math.cos(yaw), 0, -Math.sin(yaw));
  const z = (ZOOM[id] || 1) * (portrait ? 1.15 : 1);
  const T = portrait ? V(...W[id]).add(V(0, -3.4, 0)) : V(...W[id]).add(V(0, 1, 0)).addScaledVector(right, (i % 2 ? 3.3 : -3.3) * (ZOOM[id] || 1));
  return { T, C: T.clone().addScaledVector(dir, (9.5 + R[id] * 2.1) * z).add(V(0, (3.2 + R[id] * .75) * z + (LIFT[id] || 0), 0)) };
}
let poses = ORDER.map((_, i) => pose(i));
const easeSeg = s => { s = Math.min(1, Math.max(0, (s - .12) / .76)); return s < .5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2; };

// rig.p: 0..N-1 scroll position in "islands"; smoothed in the loop so fast travel can set it directly on landing
const rig = { p: 0 };

const T = V(), C = V(), planePos = V(), prevPlane = V();
const smooth = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

// point the plane along its motion and bank into turns
function steerPlane(follow) {
  const pl = world.plane;
  if (follow) pl.position.lerp(planePos, .12); else pl.position.copy(planePos);
  const vel = pl.position.clone().sub(prevPlane);
  if (vel.lengthSq() > 1e-6) {
    let d = Math.atan2(-vel.z, vel.x) - pl.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    pl.rotation.y += d * .15;
    pl.rotation.z = THREE.MathUtils.lerp(pl.rotation.z, Math.max(-.6, Math.min(.6, d * 4)) + vel.y * 2, .1);
  }
  prevPlane.copy(pl.position);
}

// scroll mode: camera hops island to island; the plane circles the island you're on
function placeCamera(t) {
  const i = Math.min(Math.floor(rig.p), N - 2), e = easeSeg(rig.p - i), a = poses[i], b = poses[i + 1];
  const arc = Math.sin(Math.PI * e), hop = a.T.distanceTo(b.T);
  T.lerpVectors(a.T, b.T, e); T.y += arc * .8;
  C.lerpVectors(a.C, b.C, e); C.y += arc * (2 + hop * .18);
  camera.position.copy(C);
  camera.lookAt(T);
  const wa = V(...W[ORDER[i]]), wb = V(...W[ORDER[i + 1]]), rest = 1 - arc, ca = t * .55;
  planePos.lerpVectors(wa, wb, e).add(V(Math.cos(ca) * 4.2 * rest, 3.8 + arc * 2.5 + Math.sin(t * 1.1) * .2, Math.sin(ca) * 4.2 * rest));
  steerPlane(true);
  return Math.round(rig.p);
}

// fast-travel mode: camera leaves the scroll, chases the plane on a direct arc, then lands on the target's own angle
const tv = { active: false, done: false, i: 0, k: 0, fromC: V(), fromT: V(), a: V(), m: V(), b: V() };
const bez = (out, k) => { const u = 1 - k; return out.set(0, 0, 0).addScaledVector(tv.a, u * u).addScaledVector(tv.m, 2 * u * k).addScaledVector(tv.b, k * k); };
function flyCamera() {
  const k = tv.k, w1 = smooth(0, .25, k), w2 = smooth(.55, 1, k), to = poses[tv.i];
  bez(planePos, k);
  const dir = bez(V(), Math.min(1, k + .02)).sub(planePos).setY(0);
  if (dir.lengthSq() < 1e-8) dir.set(1, 0, 0);
  dir.normalize();
  const chase = planePos.clone().addScaledVector(dir, -10).add(V(0, 5.5, 0)).addScaledVector(V(-dir.z, 0, dir.x), 3.5);
  C.lerpVectors(tv.fromC, chase, w1).lerp(to.C, w2);
  T.lerpVectors(tv.fromT, planePos, w1).lerp(to.T, w2);
  camera.position.copy(C);
  camera.lookAt(T);
  steerPlane(false);
  spawnPuff(k);
  return tv.i;
}

// little cloud puffs behind the plane while travelling
const puffs = Array.from({ length: 28 }, () => {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#FFFFFF', flatShading: true, transparent: true, opacity: 0 }));
  m.scale.setScalar(.001); scene.add(m); return m;
});
let puffIdx = 0, lastPuffK = 0;
function spawnPuff(k) {
  if (k - lastPuffK < .015) return;
  lastPuffK = k;
  const m = puffs[puffIdx++ % puffs.length];
  m.position.copy(world.plane.position).add(V((Math.random() - .5) * .3, (Math.random() - .5) * .3, (Math.random() - .5) * .3));
  m.scale.setScalar(.22 + Math.random() * .12);
  m.material.opacity = .9;
}
const fadePuffs = () => puffs.forEach(m => { m.scale.multiplyScalar(1.012); m.material.opacity *= .955; m.rotation.x += .02; });

// ---- HTML: nav, dots, labels, tooltip
const nav = document.querySelector('#nav-items'), dots = document.querySelector('#dots');
const navBtns = ORDER.map((id, i) => {
  const b = document.createElement('button');
  b.textContent = `0${i + 1} ${NAMES[id]}`;
  b.addEventListener('click', () => travel(i));
  nav.append(b);
  const d = document.createElement('span'); dots.append(d);
  return b;
});
const dotEls = [...dots.children];
const hint = document.querySelector('#hint');

const labelLayer = document.querySelector('#labels');
const mk = (cls, text) => { const el = document.createElement('span'); el.className = cls; el.textContent = text; labelLayer.append(el); return el; };
const nameTags = ORDER.map((id, i) => ({ id, el: mk('chip name', `0${i + 1} ${NAMES[id]}`) }));
world.labels.forEach(l => { l.el = mk('chip', ''); });
const birdBox = mk('detect', '');

const v3 = V();
const toScreen = (p) => { v3.copy(p).project(camera); return [(v3.x + 1) / 2 * innerWidth, (1 - v3.y) / 2 * innerHeight, v3.z < 1]; };
const place = (el, x, y, show) => { el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`; el.classList.toggle('on', show); };

function updateLabels(t, cur) {
  const heroOn = rig.p < .35 && !tv.active;
  nameTags.forEach(({ id, el }) => {
    const [x, y] = toScreen(V(...W[id]).add(V(0, TOP[id] + .7, 0)).add(V(0, world.roots[id].position.y - W[id][1], 0)));
    el.classList.toggle('hot', id === hoverId);
    place(el, x, y, heroOn);
  });
  const settled = Math.abs(rig.p - cur) < .12 && !tv.active;
  world.labels.forEach(l => {
    const p = l.obj.getWorldPosition(V()).add(l.offset), [x, y] = toScreen(p);
    l.el.textContent = l.text(t);
    l.el.classList.toggle('hot', typeof l.hot === 'function' ? l.hot(t) : l.hot);
    place(l.el, x, y, settled && ORDER[cur] === l.id);
    if (l.id === 'work') { const [bx, by] = toScreen(l.obj.getWorldPosition(V())); birdBox.style.transform = `translate(${bx}px, ${by}px) translate(-50%, -50%)`; birdBox.classList.toggle('on', settled && cur === 1); }
  });
}

// ---- fast travel: direct flight. The page scroll jumps to the target while the old panel is hidden,
// the camera ignores scroll until landing, and the new panel fades in as the camera settles.
const banner = document.querySelector('#banner'), bannerName = banner.querySelector('b');
const panels = [...document.querySelectorAll('.panel')];
const reveal = panel => animate(panel.querySelectorAll('.rv'), { opacity: [0, 1], y: [28, 0], duration: 800, delay: stagger(70), ease: 'outExpo' });
function travel(i) {
  if (tv.active || Math.abs(i - rig.p) < .05) return;
  setHover(null);
  Object.assign(tv, { active: true, i, k: 0 });
  lastPuffK = 0;
  tv.fromC.copy(camera.position); tv.fromT.copy(T);
  tv.a.copy(world.plane.position);
  const d = tv.a.distanceTo(V(...W[ORDER[i]])), dur = reduced ? 1 : 1500 + d * 32;
  // land exactly where the idle orbit will be at arrival, so the plane flies straight into its circle
  const tEnd = clock.getElapsedTime() + dur / 1000, ca = tEnd * .55;
  tv.b.set(...W[ORDER[i]]).add(V(Math.cos(ca) * 4.2, 3.8 + Math.sin(tEnd * 1.1) * .2, Math.sin(ca) * 4.2));
  tv.m.lerpVectors(tv.a, tv.b, .5).add(V(0, 3 + d * .3, 0));
  bannerName.textContent = `0${i + 1} ${NAMES[ORDER[i]]}`;
  document.body.classList.add('travelling');
  setTimeout(() => scrollTo({ top: i * secH(), behavior: 'instant' }), 300);
  let shown = false;
  animate(tv, {
    k: 1, duration: dur, ease: 'inOutSine',
    onUpdate: () => { if (!shown && tv.k > .85) { shown = true; document.body.classList.remove('travelling'); reveal(panels[i]); } },
    onComplete: () => { rig.p = i; tv.active = false; }
  });
}

// ---- hover: hero islands grow and offer fast travel; on an island, its object reacts
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(-9, -9);
const tip = document.querySelector('#tip'), tipName = tip.querySelector('b');
let hoverId = null, pointer = [0, 0];
addEventListener('pointermove', e => { mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); pointer = [e.clientX, e.clientY]; });
function setHover(id) {
  if (id === hoverId) return;
  if (hoverId) animate(world.roots[hoverId].scale, { x: 1, y: 1, z: 1, duration: 450, ease: 'outQuad' });
  hoverId = id;
  if (id) {
    animate(world.roots[id].scale, { x: 1.18, y: 1.18, z: 1.18, duration: 550, ease: 'outBack' });
    tipName.textContent = `0${ORDER.indexOf(id) + 1} ${NAMES[id]}`;
  }
  tip.classList.toggle('on', !!id);
  document.body.style.cursor = id ? 'pointer' : '';
}
// hover an object on the current island: its parts fly apart and tumble while the whole thing spins, then snap back
const box3 = new THREE.Box3();
function explode(g) {
  if (g.userData.busy || reduced) return;
  g.userData.busy = true;
  g.userData.onExplode?.();
  g.updateMatrixWorld(true);
  const kids = g.children.map(c => ({ c, p: g.worldToLocal(box3.setFromObject(c).getCenter(V())) }));
  const mid = kids.reduce((a, k) => a.add(k.p), V()).divideScalar(kids.length);
  const out = 420, hold = 260, back = 950;
  const sc = g.getWorldScale(V()).x;
  kids.forEach(({ c, p }) => {
    const home = c.userData.home ??= c.position.clone(), homeR = c.userData.homeR ??= c.rotation.clone();
    // big parts tilt less and rise more, so no edge ever swings down through the island
    const r = box3.setFromObject(c).getSize(V()).length() / 2 / sc, tiltMax = Math.min(.8, .7 / (r + .15));
    const dir = p.sub(mid).setY(0);
    if (dir.lengthSq() < 1e-4) dir.set(Math.random() - .5, 0, Math.random() - .5);
    dir.normalize().multiplyScalar(.3 + Math.random() * .35);
    dir.y = .45 + r * Math.sin(tiltMax) + Math.random() * .3;
    const tilt = () => (Math.random() * 2 - 1) * tiltMax;
    const kf = (from, d, land = 'outBack') => [{ to: from + d, duration: out, ease: 'outCubic' }, { to: from, duration: back, delay: hold, ease: land }];
    // y lands with a bounce from above: no overshoot below home, so nothing sinks into the ground
    animate(c.position, { x: kf(home.x, dir.x), y: kf(home.y, dir.y, 'outBounce'), z: kf(home.z, dir.z) });
    const settle = r < .6 ? 'outBack' : 'outCubic'; // big pieces settle without overshooting their tilt
    if (!c.userData.noRot) animate(c.rotation, { x: kf(homeR.x, tilt(), settle), y: kf(homeR.y, (Math.random() - .5) * 1.8, settle), z: kf(homeR.z, tilt(), settle) });
  });
  const y0 = g.rotation.y;
  animate(g.rotation, { y: y0 + Math.PI * 2, duration: out + hold + back, ease: 'inOutQuart', onComplete: () => { g.rotation.y = y0; g.userData.busy = false; } });
}
const explodablesOf = Object.fromEntries(ORDER.map(id => [id, world.explodables.filter(g => g.userData.explode === id)]));

// scroll position is measured in section heights, not innerHeight: on phones the browser bars make the two differ
const firstSec = document.querySelector('.sec'), secH = () => firstSec.offsetHeight;
function pick(cur) {
  if (touch) return; // no hover on touch screens; taps are handled by the click listener
  ray.setFromCamera(mouse, camera);
  if (tv.active) return setHover(null);
  if (rig.p < .35) {
    const hit = ray.intersectObjects(Object.values(world.roots), true)[0];
    let o = hit && hit.object;
    while (o && !o.userData.id) o = o.parent;
    setHover(o ? o.userData.id : null);
    if (hoverId) tip.style.transform = `translate(${pointer[0] + 18}px, ${pointer[1] + 18}px)`;
    return;
  }
  setHover(null);
  if (Math.abs(rig.p - cur) > .1) return;
  const hit = ray.intersectObjects(explodablesOf[ORDER[cur]], true)[0];
  let o = hit && hit.object;
  while (o && o.userData.explode === undefined) o = o.parent;
  document.body.style.cursor = o ? 'pointer' : '';
  if (o && o !== hovObj) explode(o); // only when the pointer arrives, not every frame it stays
  hovObj = o;
}
let hovObj = null;
canvas.addEventListener('click', e => {
  if (hoverId) return travel(ORDER.indexOf(hoverId));
  if (tv.active) return;
  // a tap has no hover before it, so raycast at the tap point
  mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const cur = Math.round(rig.p);
  if (rig.p < .35) {
    let o = ray.intersectObjects(Object.values(world.roots), true)[0]?.object;
    while (o && !o.userData.id) o = o.parent;
    if (o) travel(ORDER.indexOf(o.userData.id));
  } else if (Math.abs(rig.p - cur) < .1) {
    let o = ray.intersectObjects(explodablesOf[ORDER[cur]], true)[0]?.object;
    while (o && o.userData.explode === undefined) o = o.parent;
    if (o) explode(o);
  }
});
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const i = [...document.querySelectorAll('.sec')].findIndex(s => '#' + s.id === a.getAttribute('href'));
  if (i >= 0) { e.preventDefault(); travel(i); }
}));

// ---- section text reveals + hero intro
document.querySelectorAll('.panel').forEach(panel => {
  animate(panel.querySelectorAll('.rv'), {
    opacity: [0, 1], y: [28, 0], duration: 800, delay: stagger(70), ease: 'outExpo',
    autoplay: onScroll({ target: panel, enter: 'bottom top', leave: 'top bottom', repeat: true })
  });
});
const { chars } = splitText('#hero-title', { chars: true });
animate(chars, { y: ['110%', '0%'], opacity: [0, 1], duration: 900, delay: stagger(35, { start: 300 }), ease: 'outExpo' });
if (!reduced) {
  const roots = ORDER.map(id => world.roots[id].scale);
  roots.forEach(s => s.setScalar(0));
  animate(roots, { x: 1, y: 1, z: 1, duration: 900, delay: stagger(110, { start: 200 }), ease: 'outBack' });
}

// ---- loop
function resize() {
  portrait = innerWidth < innerHeight;
  poses = ORDER.map((_, i) => pose(i));
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth / innerHeight < 1 ? 50 : 35;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

let lastCur = -1, lastT = 0;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  world.update(reduced ? 0 : t);
  const dt = Math.min(.05, t - lastT); lastT = t;
  if (!tv.active) rig.p += (Math.min(N - 1, scrollY / secH()) - rig.p) * Math.min(1, dt * 7);
  const cur = tv.active ? flyCamera() : placeCamera(t);
  fadePuffs();
  pick(cur);
  updateLabels(t, cur);
  if (cur !== lastCur) {
    lastCur = cur;
    navBtns.forEach((b, i) => b.classList.toggle('on', i === cur));
    dotEls.forEach((d, i) => d.classList.toggle('on', i <= cur));
    hint.textContent = (cur ? `${verb} the objects to take them apart. ` : '') + (cur < N - 1 ? `Scroll to fly → 0${cur + 2} ${NAMES[ORDER[cur + 1]]}` : 'End of the tour. Thanks for flying!');
  }
  renderer.render(scene, camera);
});
