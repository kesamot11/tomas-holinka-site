// Low-poly archipelago: geometry helpers, island models, idle animations and hover-explodable objects.
import * as THREE from 'three';

export const ORDER = ['home', 'work', 'rally', 'ml', 'arcade', 'about', 'dj', 'contact'];
export const NAMES = { home: 'Home', work: 'Work', rally: 'Rally', ml: 'ML Lab', arcade: 'Arcade', about: 'About', dj: 'DJ', contact: 'Contact' };
// a loose archipelago: uneven gaps and heights, home closest to the hero camera
// islands sit in the sea now: same scattered layout, all at sea level (grass ~.6 above the water)
export const W = { home: [4, .5, 44], work: [15.5, .5, 43], rally: [23, .5, 31], ml: [3, .5, 24], arcade: [15, .5, 20.5], about: [26, .5, 15], dj: [7.5, .5, 10], contact: [19, .5, 3] };
export const TOP = { home: 2.2, work: 2.6, rally: 1.9, ml: 2.1, arcade: 2.6, about: 2.4, dj: 3.1, contact: 1.8 };
// camera yaw per island, filled by buildWorld once it knows where each island's pier points
export const CAM = {};
// the local angle each island's objects look best from
const NICE = { home: 0, work: .5, rally: .15, ml: -.3, arcade: .4, about: -.7, dj: .35, contact: -.4 };
// main objects per island (local x, z, radius): the pier must keep clear of these
const KEEP = {
  home: [[0, -.2, 1.3], [1.45, .55, .3], [.95, 1.0, .25], [-1.5, 1.45, .9], [-1.35, -.75, .5]],
  work: [[-.4, -.3, .6], [1.05, .55, .6], [1.1, -.9, .45], [-1.3, .95, .5]],
  rally: [[0, 0, 2.35]],
  ml: [[-.6, .3, .75], [.95, -.45, .5], [-.9, -1.1, .45]],
  arcade: [[-.4, 0, .6], [.95, .6, .55], [1.1, -.6, .3], [-1.3, -.7, .35]],
  about: [[-1.0, -.3, 1.15], [1.1, -.7, 1.0], [.35, .9, .5], [-.75, 1.2, .75]],
  dj: [[0, -.75, 1.75], [0, 1.35, 1.45], [-1.95, -.55, .55], [1.95, -.55, .55]],
  contact: [[-.2, .1, .45], [1.0, -.5, .55]]
};
export const R = { home: 3, work: 2.5, rally: 3.3, ml: 2.6, arcade: 2.6, about: 3.1, dj: 3.2, contact: 2.2 };

// ---- face-list primitives (each face: polygon verts, hex color, center, two-sided flag, brightness k)
const F = (v, c, o, two, k) => ({ v, c, o, two, k });
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const rx = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
const ry = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
const rz = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
const xf = (fs, o) => {
  const s = o.s || [1, 1, 1], t = o.t || [0, 0, 0];
  const m = p => { let q = [p[0] * s[0], p[1] * s[1], p[2] * s[2]]; q = rz(q, o.z || 0); q = rx(q, o.x || 0); q = ry(q, o.y || 0); return add(q, t); };
  return fs.map(f => ({ ...f, v: f.v.map(m), o: m(f.o) }));
};
const at = (fs, x, y, z, o = {}) => xf(fs, { ...o, t: [x, y, z] });
const box = (w, h, d, c, ct, k) => {
  const X = w / 2, Z = d / 2, o = [0, h / 2, 0], q = a => a.map(([i, j, l]) => [i ? X : -X, j ? h : 0, l ? Z : -Z]);
  return [[[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]],
    [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]]]
    .map((f, i) => F(q(f), i === 0 && ct ? ct : c, o, 0, k));
};
const cyl = (r0, r1, h, n, c, ct, k) => {
  const fs = [], P = (r, y, i) => { const a = i / n * Math.PI * 2; return [Math.cos(a) * r, y, Math.sin(a) * r]; };
  const o = r1 > 0 ? [0, h / 2, 0] : [0, h / 3, 0];
  for (let i = 0; i < n; i++) fs.push(F(r1 > 0 ? [P(r0, 0, i), P(r0, 0, i + 1), P(r1, h, i + 1), P(r1, h, i)] : [P(r0, 0, i), P(r0, 0, i + 1), [0, h, 0]], c, o, 0, k));
  if (r1 > 0) fs.push(F(Array.from({ length: n }, (_, i) => P(r1, h, i)), ct || c, o, 0, k));
  fs.push(F(Array.from({ length: n }, (_, i) => P(r0, 0, i)), c, o, 0, k));
  return fs;
};
const sph = (r, n, m, c, k) => {
  const fs = [], P = (i, j) => { const t = i / m * Math.PI, a = j / n * Math.PI * 2; return [Math.sin(t) * Math.cos(a) * r, Math.cos(t) * r, Math.sin(t) * Math.sin(a) * r]; };
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    const v = [P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j)];
    fs.push(F(i === 0 ? [v[0], v[2], v[3]] : i === m - 1 ? [v[0], v[1], v[2]] : v, c, [0, 0, 0], 0, k));
  }
  return fs;
};
const beam = (a, b, t, d, c, k) => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return xf(xf(box(L, t, d, c, 0, k), { t: [L / 2, -t / 2, 0] }), { z: Math.atan2(b[1] - a[1], b[0] - a[0]), t: [a[0], a[1], 0] });
};
const rng = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

// floating island: grass top, a lip of turf, a light dirt band, then a rocky underside down to a tip
const islandFaces = (r, seed) => {
  const rnd = rng(seed), n = 16, fs = [], o = [0, -0.35 * r, 0], J = Array.from({ length: n }, () => 0.86 + rnd() * 0.22);
  const ring = (f, y, jit) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, rr = f * r * J[i] * (1 + (jit ? (rnd() - .5) * jit : 0)); return [Math.cos(a) * rr, y + (jit ? (rnd() - .5) * jit * .4 : 0), Math.sin(a) * rr]; });
  const T = [ring(0, .12), ring(.45, .09), ring(.8, .05), ring(1, 0), ring(1.03, -.08)];
  const D = [ring(.99, -.24), ring(.93, -.42), ring(.8, -.32 * r - .2, .15), ring(.45, -.7 * r, .3)];
  const tip = [(rnd() - .5) * .3 * r, -1.1 * r, (rnd() - .5) * .3 * r];
  const band = (A, B, c, kf) => { for (let i = 0; i < n; i++) { const j = (i + 1) % n; fs.push(F([A[i], A[j], B[j], B[i]], c, o, 0, kf())); } };
  for (let i = 0; i < n; i++) fs.push(F([T[0][0], T[1][i], T[1][(i + 1) % n]], '#8CC86A', o, 0, .94 + rnd() * .12));
  for (let q = 1; q < 4; q++) band(T[q], T[q + 1], q === 3 ? '#7DBA5C' : '#8CC86A', () => .92 + rnd() * .16);
  band(T[4], D[0], '#EAD5A4', () => 1);
  band(D[0], D[1], '#E2C58E', () => 1);
  band(D[1], D[2], '#9C8676', () => .97);
  band(D[2], D[3], '#9C8676', () => .88);
  for (let i = 0; i < n; i++) fs.push(F([D[3][i], D[3][(i + 1) % n], tip], '#8B7667', o, 0, .85));
  return fs;
};

// ---- faces -> three.js
const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .92, metalness: 0, side: THREE.DoubleSide });
const col = new THREE.Color();
function toMesh(faces, mat = MAT) {
  const pos = [], cols = [];
  for (const f of faces) {
    col.set(f.c); if (f.k) col.multiplyScalar(f.k);
    for (let i = 1; i < f.v.length - 1; i++) for (const p of [f.v[0], f.v[i], f.v[i + 1]]) { pos.push(p[0], p[1], p[2]); cols.push(col.r, col.g, col.b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function centered(m) {
  m.geometry.computeBoundingBox();
  const c = m.geometry.boundingBox.getCenter(new THREE.Vector3());
  m.geometry.translate(-c.x, -c.y, -c.z);
  m.position.add(c);
  return m;
}
function node(parent, { p = [0, 0, 0], r = [0, 0, 0], s = 1 } = {}, ...kids) {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  g.position.set(...p); g.rotation.set(...r); g.scale.setScalar(s);
  kids.forEach(k => g.add(k));
  if (parent) parent.add(g);
  return g;
}
const put = (parent, faces, x, z, yaw = 0, sc = 1, dy = 0) => node(parent, { p: [x, .08 + dy, z], r: [0, yaw, 0], s: sc }, toMesh(faces));

// ---- small props
const tree = v => v
  ? [...cyl(.07, .05, .3, 5, '#8A5A3B'), ...at(cyl(.34, 0, .55, 7, '#4E9A4F'), 0, .25, 0), ...at(cyl(.25, 0, .45, 7, '#5DAE58'), 0, .58, 0)]
  : [...cyl(.07, .05, .35, 5, '#8A5A3B'), ...xf(sph(.3, 7, 5, '#6DB55B'), { s: [1, .9, 1], t: [0, .62, 0] }), ...xf(sph(.2, 6, 4, '#7CC266'), { t: [.15, .82, .05] })];
const rock = (sc = 1) => xf(sph(.22, 6, 4, '#ABA49A'), { s: [sc, sc * .6, sc] });
const tuft = () => [-.05, 0, .05].flatMap((x, i) => at(cyl(.035, 0, .16 + i * .03, 3, '#6FAE4E'), x, 0, (i - 1) * .03));
const flower = c => [...cyl(.012, .012, .14, 3, '#5E9A45'), ...at(sph(.045, 5, 3, c), 0, .16, 0)];
const crate = () => [...box(.36, .36, .36, '#B98552'), ...at(box(.38, .05, .38, '#9A6B3E'), 0, .31, 0), ...at(box(.38, .05, .38, '#9A6B3E'), 0, .02, 0)];
const bench = () => [...box(.8, .05, .26, '#B98552'), ...at(box(.8, .2, .04, '#B98552'), 0, .18, -.12), ...[-.32, .32].flatMap(x => at(box(.05, .26, .22, '#5B4636'), x, -.26, 0))].map(f => ({ ...f, v: f.v.map(v => [v[0], v[1] + .26, v[2]]) }));
const lantern = () => [...cyl(.03, .03, .7, 5, '#2C3047'), ...at(box(.12, .14, .12, '#FFE08A', 0, 1.3), 0, .7, 0), ...at(cyl(.1, 0, .08, 4, '#2C3047'), 0, .84, 0)];
const fence = (len, n = 4) => {
  const fs = [];
  for (let i = 0; i <= n; i++) fs.push(...at(box(.06, .34, .06, '#F2E6CF'), -len / 2 + i * len / n, 0, 0));
  fs.push(...at(box(len, .04, .03, '#F2E6CF'), 0, .12, 0), ...at(box(len, .04, .03, '#F2E6CF'), 0, .25, 0));
  return fs;
};
const pathStones = pts => pts.flatMap(([x, z], i) => at(cyl(.13 + (i % 2) * .03, .13 + (i % 2) * .03, .03, 6, '#D8D0C2'), x, 0, z));

// scatter grass, flowers and pebbles over an island, avoiding the big objects
function decor(r, seed, avoid) {
  const rnd = rng(seed + 7), fs = [], flowers = ['#F08BB0', '#F5C431', '#FFFFFF', '#E0483B', '#9B8CFF'];
  const free = (x, z) => avoid.every(([ax, az, ar]) => Math.hypot(x - ax, z - az) > ar);
  for (let k = 0; k < 40; k++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * .8, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!free(x, z)) continue;
    const y = .1 - d / r * .08, pick = rnd();
    if (pick < .55) fs.push(...at(tuft(), x, y, z, { y: rnd() * 3 }));
    else if (pick < .9) fs.push(...at(flower(flowers[Math.floor(rnd() * flowers.length)]), x, y, z));
    else fs.push(...at(rock(.35 + rnd() * .3), x, y, z));
  }
  return fs;
}

// ---- explodable models: arrays of parts, each part becomes its own mesh so hover can pull them apart
const house = () => {
  const w = .5, d = .4, y0 = .7, h = .45, ov = .1, o = [0, y0 + .1, 0], wall = '#F6E7C8', roof = '#E0623F';
  return [
    box(1, y0, .8, wall),
    [F([[-w - ov, y0, -d - ov], [w + ov, y0, -d - ov], [w + ov, y0 + h, 0], [-w - ov, y0 + h, 0]], roof, o),
      F([[-w - ov, y0, d + ov], [w + ov, y0, d + ov], [w + ov, y0 + h, 0], [-w - ov, y0 + h, 0]], roof, o),
      F([[-w, y0, -d], [-w, y0, d], [-w, y0 + h * .8, 0]], wall, o), F([[w, y0, -d], [w, y0, d], [w, y0 + h * .8, 0]], wall, o)],
    [...at(box(.22, .4, .03, '#8A5A3B'), .2, 0, .41), ...at(box(.24, .2, .03, '#9FD6EA', 0, 1.1), -.22, .32, .41), ...at(box(.03, .2, .24, '#9FD6EA', 0, 1.1), .51, .32, 0)],
    at(box(.14, .4, .14, '#B5523A'), .25, .85, -.18),
    [...at(box(1.2, .06, .38, '#B98552'), 0, 0, .58), ...[-.52, .52].flatMap(x => at(box(.06, .58, .06, '#8A5A3B'), x, .06, .72)), ...at(box(1.24, .05, .44, '#E0623F'), 0, .62, .6)]
  ];
};
const lighthouse = () => {
  const parts = []; let y = 0;
  [[.42, .37], [.37, .32], [.32, .28], [.28, .25]].forEach(([a, b], i) => { parts.push(at(cyl(a, b, .45, 10, i % 2 ? '#E0483B' : '#F6F2EA'), 0, y, 0)); y += .45; });
  parts.push([...at(cyl(.38, .38, .06, 10, '#2C3047'), 0, y, 0), ...Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return at(box(.025, .16, .025, '#2C3047'), Math.cos(a) * .35, y + .06, Math.sin(a) * .35); }).flat()]);
  y += .06;
  parts.push(at(cyl(.19, .19, .28, 8, '#FFE08A', 0, 1.25), 0, y, 0)); y += .28;
  parts.push(at(cyl(.25, 0, .26, 8, '#E0483B'), 0, y, 0));
  parts.push(at(box(.2, .34, .04, '#8A5A3B'), 0, 0, .41));
  return parts;
};
const radarParts = () => [cyl(.05, .05, .5, 6, '#9AA0B5'), at(xf(cyl(.04, .34, .14, 10, '#E9EDF5'), { x: -.9 }), 0, .55, 0)];
const speakerParts = () => {
  const one = (s, y) => [at(box(.8 * s, .9 * s, .55 * s, '#2C3047'), 0, y, 0),
    at(xf(cyl(.27 * s, .22 * s, .05, 12, '#4A5070', '#15172A'), { x: Math.PI / 2 }), 0, y + .4 * s, .275 * s),
    at(xf(cyl(.1 * s, .08 * s, .04, 8, '#4A5070', '#15172A'), { x: Math.PI / 2 }), 0, y + .76 * s, .275 * s)];
  return [...one(1, 0), ...one(.82, .9)];
};
const court = () => {
  const red = '#D9483B', wall = '#F6F2EA', floor = [], sides = [[], []], lines = [];
  for (let s = 0; s < 6; s++) floor.push(...at(box(.4334, .06, 3.6, '#E2BE8C', 0, s % 2 ? .96 : 1.03), -1.083 + s * .4334, 0, 0));
  [-1.33, 1.33].forEach((x, si) => {
    const X = [x - .03, x + .03], q = (xx, y, z) => [xx, y, z], S = sides[si];
    for (const xx of X) S.push(F([q(xx, .06, -1.9), q(xx, .06, 1.8), q(xx, .7, 1.8), q(xx, 1.5, -1.9)], wall, [0, .7, 0]));
    S.push(F([q(X[0], 1.5, -1.9), q(X[1], 1.5, -1.9), q(X[1], .7, 1.8), q(X[0], .7, 1.8)], wall, [0, 0, 0], 0, 1.05));
    S.push(F([q(X[0], .06, 1.8), q(X[1], .06, 1.8), q(X[1], .7, 1.8), q(X[0], .7, 1.8)], wall, [0, 0, 0], 0, .95));
    const xi = x < 0 ? x + .035 : x - .035;
    S.push(F([q(xi, 1.40, -1.8), q(xi, 1.46, -1.8), q(xi, .68, 1.8), q(xi, .62, 1.8)], red, [0, 0, 0]));
  });
  const front = [...at(box(2.72, 1.5, .1, wall), 0, 0, -1.85), ...at(box(2.6, .14, .02, red), 0, .06, -1.79), ...at(box(2.6, .03, .02, red), 0, .75, -1.79), ...at(box(2.6, .04, .02, red), 0, 1.42, -1.79)];
  lines.push(...at(box(2.6, .065, .03, red), 0, 0, .22), ...at(box(.03, .065, 1.58, red), 0, 0, 1.01));
  for (const sx of [-1, 1]) lines.push(...at(box(.03, .065, .6, red), sx * .7, 0, .52), ...at(box(.6, .065, .03, red), sx * 1.0, 0, .82));
  return [floor, front, sides[0], sides[1], lines];
};
const racketParts = acc => {
  const cy = 1.95, ax = .42, ay = .58, n = 18, E = Array.from({ length: n + 1 }, (_, k) => { const a = k / n * Math.PI * 2; return [Math.cos(a) * ax, cy + Math.sin(a) * ay]; });
  const strings = [F(E.slice(0, n).map(p => [p[0], p[1], 0]), '#F4EFE2', [0, cy, 0], 1, .95)];
  for (const x of [-.28, -.14, 0, .14, .28]) { const hh = ay * Math.sqrt(1 - (x / ax) ** 2) - .03; strings.push(...beam([x, cy - hh], [x, cy + hh], .014, .03, '#C9BFA9')); }
  for (const y of [-.4, -.2, 0, .2, .4]) { const ww = ax * Math.sqrt(1 - (y / ay) ** 2) - .03; strings.push(...beam([-ww, cy + y], [ww, cy + y], .014, .03, '#C9BFA9')); }
  return [
    [...cyl(.075, .075, .75, 8, '#23263A'), ...at(cyl(.09, .09, .06, 8, acc), 0, .72, 0), ...beam([0, .78], [0, 1.2], .07, .06, '#3A3F5C')],
    [...beam([0, 1.18], [-.33, 1.5], .05, .05, acc), ...beam([0, 1.18], [.33, 1.5], .05, .05, acc), ...E.slice(0, n).flatMap((p, k) => beam(p, E[k + 1], .07, .07, acc))],
    strings
  ];
};
const ball = () => [...sph(.13, 9, 6, '#1E2033'), ...at(sph(.035, 5, 3, '#F5C431'), .05, .06, .1), ...at(sph(.035, 5, 3, '#F5C431'), .09, 0, .08)];
const catParts = () => {
  const c = '#EFA45E', d = '#1D2340';
  return [
    [...box(1, .28, .7, '#ECE5D8'), ...at(box(1.06, .05, .76, '#D8D0C2'), 0, .28, 0)],
    xf(sph(.36, 8, 6, c), { s: [1.25, .85, .9], t: [0, .62, 0] }),
    [...at(sph(.26, 8, 6, c), .42, 1.04, 0), ...at(sph(.035, 4, 3, d), .66, 1.07, -.09), ...at(sph(.035, 4, 3, d), .66, 1.07, .09), ...at(sph(.04, 4, 3, '#E0623F'), .68, .99, 0)],
    [...at(cyl(.09, 0, .18, 4, c), .38, 1.22, -.12), ...at(cyl(.09, 0, .18, 4, c), .38, 1.22, .12)],
    beam([-.38, .6], [-.72, 1.1], .08, .08, c)
  ];
};
const easelParts = () => {
  const px = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
    const x0 = -.33 + i * .11, y0 = .54 + j * .11;
    px.push(F([[x0, y0, .071], [x0 + .11, y0, .071], [x0 + .11, y0 + .11, .071], [x0, y0 + .11, .071]], '#5A6188', [0, .9, 0]));
  }
  return [beam([-.3, 0], [-.1, 1.3], .05, .05, '#8A5A3B'), beam([.3, 0], [.1, 1.3], .05, .05, '#8A5A3B'), at(box(.78, .78, .05, '#2C3047'), 0, .5, .04), px];
};
const rackParts = acc => [
  [...box(.6, 1.3, .5, '#2C3047'), ...at(box(.62, .05, .52, '#3A3F5C'), 0, 1.3, 0)],
  [0, 1, 2, 3, 4].flatMap(i => [...at(box(.5, .16, .02, '#14183A'), 0, .15 + i * .22, .25), ...at(box(.04, .04, .02, i % 2 ? acc : '#5AD17A', 0, 1.4), .18, .21 + i * .22, .27)])
];
const cabinetParts = (c, glowMat) => [
  box(.8, 1.0, .7, c),
  at(xf(box(.84, .08, .4, '#2C3047'), { x: .3 }), 0, 1.0, .22),
  at(box(.8, .95, .42, c), 0, 1.0, -.14),
  at(xf(box(.64, .52, .04, '#14183A'), { x: -.15 }), 0, 1.2, .1),
  { f: at(xf(box(.52, .4, .02, '#7CF5FF'), { x: -.15 }), 0, 1.26, .125), mat: glowMat },
  at(box(.86, .24, .5, '#FFC94A'), 0, 1.95, -.1),
  [...at(cyl(.025, .025, .16, 6, '#2C3047'), -.22, 1.04, .3), ...at(sph(.065, 6, 4, '#FF5A5A'), -.22, 1.22, .3)],
  ['#FF5A5A', '#FFD84A', '#5AD17A'].flatMap((bc, i) => at(xf(cyl(.045, .045, .04, 8, bc), { x: .3 }), .03 + i * .13, 1.07, .3))
];
const qBlock = () => [...box(.5, .5, .5, '#F5B731'), ...at(box(.12, .2, .02, '#8A5A1B'), 0, .2, .26), ...at(box(.08, .06, .02, '#8A5A1B'), 0, .07, .26)];
const windmillParts = () => [
  cyl(.42, .28, 1.3, 8, '#7A5444'), at(cyl(.5, .5, .05, 8, '#4A3328'), 0, .5, 0), at(cyl(.32, 0, .4, 8, '#4A3328'), 0, 1.3, 0),
  at(box(.18, .3, .03, '#3E2C22'), 0, 0, .4)
];
const blades = () => {
  const bl = [...sph(.07, 6, 4, '#4A3328')];
  for (let k = 0; k < 4; k++) {
    const a = .4 + k * Math.PI / 2, d = [Math.cos(a), Math.sin(a)], p = [-d[1], d[0]], Q = (s, w) => [d[0] * s + p[0] * w, d[1] * s + p[1] * w, 0];
    bl.push(...beam([0, 0], [d[0] * 1.05, d[1] * 1.05], .045, .045, '#4A3328'));
    bl.push(F([Q(.22, .02), Q(1.0, .02), Q(1.0, .2), Q(.22, .2)], '#F6F2EA', [0, 0, -1], 1));
  }
  return bl;
};
const mountainParts = () => [cyl(.95, 0, 1.6, 7, '#8E8A90'), at(cyl(.42, 0, .72, 7, '#F7F7F4'), 0, .9, 0), [...at(tree(1), -.85, 0, .45), ...xf(tree(1), { s: [.7, .7, .7], t: [.7, 0, .55] })]];
const dutchHouse = () => [
  box(.7, .8, .6, '#B5523A'),
  [...at(box(.56, .2, .62, '#B5523A'), 0, .8, 0), ...at(box(.4, .2, .62, '#B5523A'), 0, 1.0, 0), ...at(box(.22, .2, .62, '#B5523A'), 0, 1.2, 0)],
  [...at(box(.16, .3, .02, '#2C3047'), 0, 0, .31), ...at(box(.14, .14, .02, '#9FD6EA', 0, 1.1), -.2, .45, .31), ...at(box(.14, .14, .02, '#9FD6EA', 0, 1.1), .2, .45, .31), ...at(box(.12, .12, .02, '#F6F2EA'), 0, .9, .32)]
];
const tulips = () => {
  const cs = ['#E0483B', '#F5C431', '#F08BB0'], fs = [];
  for (let r = 0; r < 3; r++) {
    fs.push(...at(box(1.3, .04, .16, '#6B8F3E'), 0, 0, r * .28));
    for (let i = 0; i < 6; i++) fs.push(...at(sph(.06, 5, 3, cs[r]), -.55 + i * .22, .1, r * .28));
  }
  return fs;
};
const boothParts = () => [
  [...box(1.6, .5, .6, '#1D2033'), ...at(box(1.64, .04, .64, '#3A3F5C'), 0, .5, 0)],
  [...at(box(.42, .06, .4, '#14151F'), -.48, .54, 0), ...at(box(.42, .06, .4, '#14151F'), .48, .54, 0), ...at(box(.3, .08, .32, '#4A5070'), 0, .54, 0)],
  [...at(box(.1, .03, .1, '#C9CCD8'), -.08, .62, .05), ...at(box(.1, .03, .1, '#C9CCD8'), .08, .62, .05)]
];

// ---- Thompson mark (same path as thompsondj.com), drawn as the scan-line merch print
const THOMPSON = 'M182 0H818A182 182 0 0 1 1000 182V818A182 182 0 0 1 818 1000H182A182 182 0 0 1 0 818V182A182 182 0 0 1 182 0ZM219 221H781V783H219ZM273 323H392V442H273ZM608 323H727V442H608ZM288 643H374V673H624V643H710V684A78 78 0 0 1 632 762H366A78 78 0 0 1 288 684Z';
function teePrint(back) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const draw = () => {
    const g = c.getContext('2d'), S = back ? 300 : 400, x0 = (512 - S) / 2, y0 = back ? 36 : 56, path = new Path2D(THOMPSON);
    g.fillStyle = '#F7F7F4'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 15; i++) {
      g.save(); g.translate(x0 + (i === 5 ? S * .036 : 0), y0); g.scale(S / 1000, S / 1000); g.clip(path, 'evenodd');
      g.fillStyle = i < 6 ? '#5be3ff' : i < 9 ? '#b489ff' : '#ff5fc0';
      g.fillRect(-60, i * 66.67 + 12, 1120, 39);
      g.restore();
    }
    if (back) {
      g.fillStyle = '#0A0A0A'; g.textAlign = 'center';
      g.font = '700 76px Fredoka, sans-serif'; g.fillText('THOMPSON', 256, 418);
      g.fillStyle = '#1FA9C9'; g.font = '700 26px Nunito, sans-serif'; g.fillText('F I N D   Y O U R   H A V E N', 256, 462);
    }
    tex.needsUpdate = true;
  };
  draw(); document.fonts?.ready.then(draw);
  return tex;
}

// ---- low-poly people: legs, torso, head and two arms on shoulder pivots so they can dance
function person({ shirt = '#F7F7F4', pants = '#2C3047', skin = '#F1C7A1', hair = '#4A3328', phones = false, print = false }) {
  const g = node(null, {});
  g.add(centered(toMesh([...at(box(.16, .6, .18, pants), -.1, 0, 0), ...at(box(.16, .6, .18, pants), .1, 0, 0), ...at(box(.18, .07, .25, '#F6F2EA'), -.1, 0, .03), ...at(box(.18, .07, .25, '#F6F2EA'), .1, 0, .03)])));
  const torso = node(g, { p: [0, .6, 0] }, toMesh([...box(.46, .58, .26, shirt), ...at(box(.2, .05, .27, skin), 0, .55, 0)]));
  if (print) for (const back of [0, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.4, .4), new THREE.MeshStandardMaterial({ map: teePrint(back), roughness: .95 }));
    m.position.set(0, .3, back ? -.132 : .132); m.rotation.y = back ? Math.PI : 0;
    torso.add(m);
  }
  const headFaces = [...box(.28, .3, .28, skin), ...at(box(.3, .1, .3, hair), 0, .27, 0), ...at(box(.3, .2, .06, hair), 0, .12, -.13),
    ...at(box(.04, .045, .01, '#1D2340'), -.065, .16, .142), ...at(box(.04, .045, .01, '#1D2340'), .065, .16, .142), ...at(box(.08, .02, .01, '#B5523A'), 0, .07, .142)];
  if (phones) headFaces.push(...at(box(.36, .04, .07, '#1D2340'), 0, .36, 0), ...[-1, 1].flatMap(sx => at(xf(cyl(.08, .08, .06, 8, '#1D2340', acc0), { z: sx * Math.PI / 2 }), sx * .14, .14, 0)));
  const head = node(g, { p: [0, 1.2, 0] }, toMesh(headFaces));
  const arm = sx => node(g, { p: [sx * .3, 1.13, 0] }, toMesh([...at(box(.14, .2, .16, shirt), 0, -.2, 0), ...at(box(.11, .34, .12, skin), 0, -.54, 0)]));
  return { g, head, torso, armL: arm(-1), armR: arm(1) };
}
let acc0 = '#FF7A3D';
const mailboxParts = () => [
  box(.1, .75, .1, '#8A5A3B'),
  [...at(box(.34, .28, .55, '#E0483B'), 0, .72, 0), ...at(xf(cyl(.17, .17, .55, 8, '#E0483B'), { x: Math.PI / 2 }), 0, 1.0, -.275), ...at(box(.26, .2, .02, '#B5303A'), 0, .78, .28)]
];
const signParts = acc => [
  cyl(.04, .04, 1.3, 6, '#8A5A3B'),
  at(xf(box(.7, .18, .05, acc), { y: .3 }), .25, 1.0, 0),
  at(xf(box(.6, .18, .05, '#2C3047'), { y: -.5 }), -.2, .72, 0),
  at(xf(box(.5, .18, .05, '#5B8CFF'), { y: 1.2 }), .15, .45, 0)
];
const paperPlane = () => [F([[0, 0, 0], [-.4, 0, -.14], [-.32, -.02, 0]], '#FFFFFF', [0, -1, 0], 1), F([[0, 0, 0], [-.4, 0, .14], [-.32, -.02, 0]], '#F2EEE6', [0, -1, 0], 1)];
const planeBody = acc => [...at(box(1.1, .24, .26, '#F6F2EA'), 0, -.12, 0),
  ...xf(cyl(.13, .05, .22, 6, acc), { z: -Math.PI / 2, t: [.55, 0, 0] }),
  ...at(box(.36, .04, 1.7, acc), .08, -.03, 0), ...at(box(.22, .32, .04, acc), -.46, .1, 0),
  ...at(box(.22, .03, .62, '#F6F2EA'), -.48, .08, 0), ...at(box(.3, .1, .28, '#9FD6EA', 0, 1.1), .15, .1, 0)];
const cloudFaces = () => [...xf(sph(.6, 7, 5, '#FFFFFF', 1.04), { s: [1, .62, 1] }), ...xf(sph(.45, 7, 5, '#FFFFFF', 1.04), { s: [1, .62, 1], t: [.62, -.06, .1] }), ...xf(sph(.42, 7, 5, '#FFFFFF', 1.04), { s: [1, .62, 1], t: [-.58, -.08, -.05] })];

// ---- the world
export function buildWorld(scene, acc) {
  const roots = {}, labels = [], explodables = [], tickers = [], bobbers = [];
  const island = (id, seed, avoid = []) => {
    const root = node(scene, { p: W[id] });
    root.userData.id = id;
    root.add(toMesh([...islandFaces(R[id], seed), ...decor(R[id], seed, avoid)]));
    roots[id] = root;
    return root;
  };
  // an explodable model: one mesh per part; parts may also be ready-made Object3Ds (animated pivots)
  const model = (id, parent, parts, o = {}) => {
    const g = node(parent, o);
    for (const p of parts) g.add(p.isObject3D ? p : centered(Array.isArray(p) ? toMesh(p) : toMesh(p.f, p.mat)));
    g.userData.explode = id;
    explodables.push(g);
    return g;
  };
  const label = (id, obj, offset, text, hot) => labels.push({ id, obj, offset: new THREE.Vector3(...offset), text, hot });
  const spinner = (faces, o) => { const g = node(null, o, toMesh(faces)); g.userData.noRot = true; return g; };

  // 01 home: cabin with porch, fence, flag, lantern, path
  let I = island('home', 3, [[0, -.2, 1.3], [-1.5, 1.4, .8], [1.45, .55, .4], [-1.35, -.75, .6]]);
  model('home', I, house(), { p: [0, .08, -.2], r: [0, .5, 0], s: 1.15 });
  put(I, fence(1.6), -1.5, 1.45, .7); put(I, bench(), -1.35, -.75, 1.3); put(I, lantern(), .95, 1.0);
  put(I, pathStones([[.45, .85], [.62, 1.35], [.72, 1.85]]), 0, 0);
  const flag = node(I, { p: [1.45, .08, .55] }, toMesh([...cyl(.03, .03, 1.6, 5, '#C9CCD8'), ...at(sph(.05, 5, 3, '#F5C431'), 0, 1.62, 0)]));
  const cloth = node(flag, { p: [0, 1.5, 0] }, toMesh([F([[0, 0, 0], [.5, -.06, 0], [.5, -.3, 0], [0, -.32, 0]], acc, [0, 0, -1], 1)]));
  put(I, tree(0), -1.9, .1); put(I, tree(1), 1.6, -1.3, 0, 1.1); put(I, tree(1), -1.1, -1.85, 0, .85);
  tickers.push(t => { cloth.rotation.y = Math.sin(t * 3) * .25; cloth.scale.x = 1 + Math.sin(t * 5) * .05; });

  // 02 work: lighthouse with a sweeping beam that "detects" a bird, keeper's hut, spinning radar
  I = island('work', 5, [[-.4, -.3, .8], [1.05, .55, .7], [1.1, -.9, .5], [-1.4, .8, .5]]);
  const lh = model('work', I, lighthouse(), { p: [-.4, .08, -.3] });
  model('work', I, house(), { p: [1.05, .08, .55], r: [0, .9, 0], s: .55 });
  const radar = model('work', I, radarParts(), { p: [1.1, .08, -.9] });
  put(I, crate(), -1.4, .8, .4); put(I, crate(), -1.15, 1.1, -.2, .8); put(I, rock(), 1.5, .1); put(I, tree(1), -1.3, -1.2, 0, .8);
  const beamPivot = node(lh, { p: [0, 2.0, 0] });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.6, 24, 1, true).translate(0, -2.3, 0), new THREE.MeshBasicMaterial({ color: '#FFE9A8', transparent: true, opacity: .3, depthWrite: false, side: THREE.DoubleSide }));
  cone.rotation.z = Math.PI / 2;
  beamPivot.add(cone);
  const bird = node(I, {}, toMesh([...xf(box(.36, .03, .1, '#1D2340'), { z: .35, t: [-.16, 0, 0] }), ...xf(box(.36, .03, .1, '#1D2340'), { z: -.35, t: [.16, 0, 0] })]));
  label('work', bird, [0, .55, 0], () => 'bird 0.91', true);
  tickers.push(t => {
    beamPivot.rotation.y = t * .9;
    radar.children[1].rotation.y = t * 1.6;
    const a = t * .45;
    bird.position.set(Math.cos(a) * 3.6, 2.7 + Math.sin(t * 1.3) * .2, Math.sin(a) * 3.6);
    bird.rotation.y = -a;
    bird.scale.y = 1 + Math.sin(t * 9) * .6;
  });

  // 04 rally: a real squash rally. Racket swings, ball hits the front wall, bounces, comes back.
  I = island('rally', 13, [[0, 0, 2.5]]);
  const courtG = model('rally', I, court(), { p: [0, .08, 0], r: [0, .25, 0] });
  put(I, bench(), -2.35, .55, 1.82); put(I, tree(1), -1.6, -2.1, 0, .8); put(I, tree(0), 2.3, -1.2, 0, .8); put(I, rock(.8), 2.1, 1.6);
  const swing = node(node(courtG, { p: [.75, .5, 1.15] }), {});
  swing.userData.noRot = true;
  const tilt = node(swing, { r: [0, 0, .55], s: .52 });
  model('rally', tilt, racketParts(acc));
  const head = node(tilt, { p: [0, 1.95, 0] });
  I.updateMatrixWorld(true);
  const H = courtG.worldToLocal(head.getWorldPosition(new THREE.Vector3()));
  const Fw = new THREE.Vector3(-.15, .95, -1.72), B1 = new THREE.Vector3(-.35, .14, .62);
  const ballM = node(courtG, { s: .8 }, toMesh(ball()));
  ballM.userData.noRot = true;
  const sm = x => x * x * (3 - 2 * x);
  let phase = 0, lastT = 0, speed = 1, boostUntil = -1, rallies = 0;
  courtG.userData.onExplode = () => { boostUntil = lastT + 2.5; };
  label('rally', courtG, [0, 1.9, -1.8], () => `ELO ${1742 + rallies} ▲`, () => speed > 1.3);
  tickers.push(t => {
    const dt = Math.min(.05, Math.max(0, t - lastT)); lastT = t;
    speed += ((t < boostUntil ? 2.2 : 1) - speed) * Math.min(1, dt * 3);
    const before = phase;
    phase += dt * speed / 1.7;
    if (Math.floor(phase) > Math.floor(before)) rallies++;
    const u = phase % 1;
    const [a, b, s, lift] = u < .28 ? [H, Fw, u / .28, .25] : u < .55 ? [Fw, B1, (u - .28) / .27, .15] : [B1, H, (u - .55) / .45, .9];
    ballM.position.lerpVectors(a, b, s);
    ballM.position.y += Math.sin(Math.PI * s) * lift;
    ballM.rotation.x += dt * 14;
    swing.rotation.y = u >= .9 ? 1.3 - 13 * (u - .9) : u < .08 ? -13 * u : u < .55 ? -1.04 * (1 - sm((u - .08) / .47)) : 1.3 * sm((u - .55) / .35);
  });

  // 05 ml lab: cat statue whose label glitches to "dog", easel of flickering adversarial noise, GPU rack
  I = island('ml', 21, [[-.6, .3, .8], [.95, -.45, .6], [-.9, -1.1, .55]]);
  const catG = model('ml', I, catParts(), { p: [-.6, .08, .3], r: [0, .5, 0] });
  const easel = model('ml', I, easelParts(), { p: [.95, .08, -.45], r: [0, -.4, 0] });
  model('ml', I, rackParts(acc), { p: [-.9, .08, -1.1], r: [0, .3, 0] });
  put(I, tree(0), 1.4, .9, 0, .9); put(I, tree(1), -1.8, .2, 0, .75);
  const pc = easel.children[3].geometry.attributes.color, pal = ['#5A6188', '#8F96B8', acc].map(c => new THREE.Color(c));
  let lastFlick = 0;
  label('ml', catG, [.2, 1.7, 0], t => (t % 2.4 < 1.6 ? 'cat 0.97' : 'dog 0.81 ?!'), t => t % 2.4 >= 1.6);
  tickers.push(t => {
    if (t - lastFlick < .14) return;
    lastFlick = t;
    for (let q = 0; q < pc.count / 6; q++) {
      const v = Math.random(), c = pal[v > .82 ? 2 : v > .45 ? 1 : 0];
      for (let k = 0; k < 6; k++) pc.setXYZ(q * 6 + k, c.r, c.g, c.b);
    }
    pc.needsUpdate = true;
  });

  // 06 arcade: two cabinets, a spinning coin and a floating "?" block
  I = island('arcade', 34, [[-.4, 0, .75], [.95, .6, .6]]);
  const glowMat = new THREE.MeshStandardMaterial({ color: '#7CF5FF', emissive: '#7CF5FF', emissiveIntensity: .7, flatShading: true });
  const cab = model('arcade', I, cabinetParts('#6C4BD8', glowMat), { p: [-.4, .08, 0], r: [0, .35, 0] });
  model('arcade', I, cabinetParts('#E85D9A', glowMat), { p: [.95, .08, .6], r: [0, -.5, 0], s: .8 });
  const coin = node(I, { p: [1.1, 2.0, -.6] }, toMesh(xf(cyl(.26, .26, .06, 14, '#F5C431', '#FFD85A'), { x: Math.PI / 2, t: [0, 0, -.03] })));
  const block = node(I, { p: [-1.3, 2.2, -.7] }, toMesh(qBlock()));
  put(I, tree(1), 1.5, -1.2, 0, .85); put(I, tree(0), -1.7, .9, 0, .8);
  label('arcade', cab, [0, 2.45, 0], () => 'PRESS START', t => t % 1 < .6);
  tickers.push(t => {
    coin.rotation.y = t * 2.2; coin.position.y = 2.0 + Math.sin(t * 2) * .12;
    block.position.y = 2.2 + Math.sin(t * 1.5 + 1) * .1; block.rotation.y = Math.sin(t * .7) * .3;
    glowMat.emissiveIntensity = .55 + Math.sin(t * 7) * .15;
  });

  // 07 about: Delft (windmill, Dutch house, tulips) and Lausanne (snowy peak with pines)
  I = island('about', 55, [[-1.0, -.3, .8], [1.1, -.7, 1.2], [.35, .9, .55], [-.6, 1.15, .8]]);
  const bladeG = spinner(blades(), { p: [0, 1.42, .36] });
  const wm = model('about', I, [...windmillParts(), bladeG], { p: [-1.0, .08, -.3], r: [0, .4, 0] });
  const mt = model('about', I, mountainParts(), { p: [1.1, .08, -.7] });
  model('about', I, dutchHouse(), { p: [.35, .08, .9], r: [0, -.3, 0], s: .7 });
  put(I, tulips(), -.75, .95, .4);
  label('about', wm, [0, 2.3, 0], () => 'TU DELFT', false);
  label('about', mt, [0, 1.95, 0], () => 'EPFL', true);
  tickers.push(t => { bladeG.rotation.z = -t * .8; });

  // 08 dj: a full party. Me behind the decks in the Thompson tee, a dancing crowd, lights, lasers, confetti, all at 128 BPM.
  I = island('dj', 89, [[0, -.75, 1.9], [0, 1.35, 1.7], [-1.9, -.55, .6], [1.9, -.55, .6]]);
  const NEON = ['#5be3ff', '#b489ff', '#ff5fc0'];
  // stage with a glowing front edge, truss, dance floor
  put(I, [...box(3.0, .45, 1.5, '#2C3047'), ...at(box(3.02, .07, .02, '#ff5fc0', 0, 1.35), 0, .25, .76), ...[-.9, 0, .9].flatMap(x => at(box(.5, .06, .3, '#3A3F5C'), x, -.06, .9))], 0, -.75);
  put(I, [...[-1.45, 1.45].flatMap(x => at(box(.1, 2.4, .1, '#9AA0B5'), x, 0, 0)), ...at(box(3.0, .1, .1, '#9AA0B5'), 0, 2.4, 0)], 0, -1.4, 0, 1, .45);
  const tileFaces = [], tiles = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) tileFaces.push(...at(box(.6, .04, .6, '#2C3047'), -.93 + c * .62, 0, .75 + r * .62));
  const floorM = toMesh(tileFaces); node(I, { p: [0, .09, 0] }, floorM);
  const tc = floorM.geometry.attributes.color, tilePal = [...NEON, '#FFC94A', '#2C3047'].map(c => new THREE.Color(c)), per = tc.count / 12;
  // booth with spinning platters
  const booth = model('dj', I, boothParts(), { p: [0, .53, -.35] });
  const platters = [-.48, .48].map(x => { const g = spinner([...cyl(.16, .16, .03, 14, '#14151F'), ...cyl(.05, .05, .035, 8, acc)], { p: [x, .57, 0] }); booth.add(g); return g; });
  // me, in a white Thompson tee with headphones
  acc0 = acc;
  const dj = person({ shirt: '#F7F7F4', pants: '#23263A', hair: '#3B2A20', phones: true, print: true });
  [dj.head, dj.armL, dj.armR].forEach(o => { o.userData.noRot = true; });
  I.add(dj.g); dj.g.position.set(0, .53, -.88); dj.g.scale.setScalar(1.1);
  dj.g.userData.explode = 'dj'; explodables.push(dj.g);
  // speaker stacks pumping on the kick
  const stacks = [-1.95, 1.95].map(x => model('dj', I, speakerParts(), { p: [x, .08, -.55], r: [0, -Math.sign(x) * .3, 0], s: .9 }));
  // moving-head lights on the truss and a disco ball
  const beamMats = [];
  const heads = [-.9, 0, .9].map(x => {
    const piv = node(I, { p: [x, 2.8, -1.4] }, toMesh(at(box(.2, .2, .2, '#1D2033'), 0, -.2, 0)));
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    piv.add(new THREE.Mesh(new THREE.ConeGeometry(.75, 3.2, 20, 1, true).translate(0, -1.6, 0), mat));
    beamMats.push(mat); return piv;
  });
  const disco = node(I, { p: [0, 2.42, -1.0] }, toMesh([...sph(.2, 10, 7, '#DDE3EE', 1.15), ...at(box(.01, .3, .01, '#9AA0B5'), 0, .18, 0)]));
  // lasers fanning out from the back of the stage
  const laserG = node(I, { p: [0, 1.5, -1.45] });
  const lasers = Array.from({ length: 6 }, (_, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: NEON[i % 3], transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending });
    const piv = node(laserG, { r: [0, (i - 2.5) * .28, 0] });
    piv.add(new THREE.Mesh(new THREE.BoxGeometry(.025, .025, 7).translate(0, 0, 3.5), mat));
    return { piv, mat };
  });
  // the crowd
  const looks = [['#E85D9A', '#3B2A20', '#F1C7A1'], ['#5B8CFF', '#D9A35E', '#E8B48A'], ['#FFC94A', '#1D2340', '#C68B5E'], ['#4FC3A1', '#8A5A3B', '#F1C7A1'], ['#FF7A3D', '#2C2C2C', '#8D5A3B'], ['#9B8CFF', '#E8D48A', '#F6D2B4'], ['#2C3047', '#B5523A', '#E8B48A']];
  const crowd = [[-1.0, .8], [.15, .7], [1.05, .9], [-.55, 1.45], [.6, 1.5], [-1.15, 2.05], [.2, 2.15]].map(([x, z], i) => {
    const [shirt, hair, skin] = looks[i], p = person({ shirt, hair, skin, pants: i % 2 ? '#3A4A6B' : '#2C3047' });
    I.add(p.g); p.g.position.set(x, .13, z); p.g.rotation.y = Math.PI + (i % 3 - 1) * .25; p.g.scale.setScalar(.82);
    return { ...p, y0: .13, style: i % 3, off: i * .37 };
  });
  // confetti
  const CONF = 70, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(.07, .11), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONF);
  const cseed = Array.from({ length: CONF }, (_, i) => { conf.setColorAt(i, new THREE.Color([...NEON, '#FFC94A', '#FFFFFF'][i % 5])); return [Math.random() * 3.6 - 1.8, Math.random() * 2.8 - .4, Math.random(), .15 + Math.random() * .2]; });
  I.add(conf);
  const dummy = new THREE.Object3D();
  put(I, tree(1), -2.3, 1.2, 0, .8); put(I, tree(0), 2.4, 1.0, 0, .75);
  label('dj', disco, [0, 1.1, 0], () => 'thompsondj.com', true);
  let lastBeat = -1;
  tickers.push(t => {
    const beat = t * 128 / 60, ph = beat % 1, kick = Math.pow(1 - ph, 6), bar = beat % 8;
    platters.forEach((p, i) => { p.rotation.y = -t * (3.5 + i * .4); });
    stacks.forEach(s => s.scale.setScalar(.9 * (1 + kick * .05)));
    // DJ: nods on the kick, left hand on the mixer, right hand goes up at the end of every 8 beats
    const up = bar > 6 ? Math.min(1, (bar - 6) * 3) * Math.min(1, (8 - bar) * 3) : 0;
    dj.head.rotation.x = kick * .28 - .05;
    dj.armL.rotation.x = -1.05 + Math.sin(t * 5) * .06;
    dj.armR.rotation.x = -1.05 * (1 - up) + Math.sin(t * 7) * .05 * (1 - up);
    dj.armR.rotation.z = 2.7 * up;
    dj.g.position.y = .53 + kick * .02;
    crowd.forEach(p => {
      const bounce = Math.abs(Math.sin((beat + p.off) * Math.PI));
      p.g.position.y = p.y0 + bounce * (p.style === 0 ? .14 : .07);
      p.head.rotation.x = bounce * .2 - .05;
      if (p.style === 0) { p.armL.rotation.z = -2.6 + bounce * .3; p.armR.rotation.z = 2.6 - bounce * .3; }
      else if (p.style === 1) { p.armR.rotation.x = -2.5 + bounce * .5; p.armL.rotation.x = -.3; }
      else { p.armL.rotation.z = -.3 - bounce * .4; p.armR.rotation.z = .3 + bounce * .4; }
    });
    heads.forEach((h, i) => {
      h.rotation.x = -.55 + Math.sin(t * 1.3 + i) * .25;
      h.rotation.z = Math.sin(t * .9 + i * 2) * .6;
      beamMats[i].color.setHSL((t * .08 + i * .33) % 1, .9, .6);
      beamMats[i].opacity = .14 + kick * .14;
    });
    laserG.rotation.y = Math.sin(t * .7) * .4;
    lasers.forEach((l, i) => { l.piv.rotation.x = -.5 + Math.sin(t * 2 + i) * .2; l.mat.opacity = .35 + kick * .6; });
    disco.rotation.y = t * 1.2;
    if (Math.floor(beat) !== lastBeat) {
      lastBeat = Math.floor(beat);
      for (let q = 0; q < 12; q++) { const c = tilePal[Math.floor(Math.random() * tilePal.length)]; for (let k = 0; k < per; k++) tc.setXYZ(q * per + k, c.r, c.g, c.b); }
      tc.needsUpdate = true;
    }
    cseed.forEach(([x, z, o, sp], i) => {
      const u = (t * sp + o) % 1;
      dummy.position.set(x + Math.sin(t * 1.5 + i) * .15, 3.4 - u * 3.2, z);
      dummy.rotation.set(t * 3 + i, t * 2 + i * .5, 0);
      dummy.updateMatrix(); conf.setMatrixAt(i, dummy.matrix);
    });
    conf.instanceMatrix.needsUpdate = true;
  });

  // 09 contact: mailbox with a flag that pops up, a signpost, paper planes drifting off
  I = island('contact', 144, [[-.2, .1, .5], [1.0, -.5, .5]]);
  const flagG = node(null, { p: [.2, .78, .1] }, toMesh([...box(.03, .4, .03, '#2C3047'), ...at(box(.03, .12, .18, '#F5C431'), 0, .3, .09)]));
  flagG.userData.noRot = true;
  const mb = model('contact', I, [...mailboxParts(), flagG], { p: [-.2, .08, .1], r: [0, .5, 0] });
  model('contact', I, signParts(acc), { p: [1.0, .08, -.5] });
  const planes = [0, 1, 2].map(i => node(I, {}, toMesh(paperPlane())));
  put(I, tree(0), -1.2, -.6, 0, .8);
  label('contact', mb, [0, 1.6, 0], () => 'SAY HI', true);
  tickers.push(t => {
    const s = (t % 3) / 3; flagG.rotation.x = s < .5 ? 0 : -Math.PI / 2 * Math.min(1, (s - .5) * 6);
    planes.forEach((p, i) => {
      const u = (t * .18 + i / 3) % 1;
      p.position.set(-.2 + u * 3.2, 1.3 + u * 2.4 + Math.sin(t * 2 + i) * .15, .1 - u * 1.2);
      p.rotation.set(Math.sin(t * 2 + i) * .3, -.35, u * .4);
      p.scale.setScalar(Math.min(1, u * 6, (1 - u) * 6));
    });
  });

  // ---- the sea. Each island gets a pier pointing toward its neighbours (so the sailing route stays short and
  // clear); the island is turned so the pier misses its main objects, and the camera looks in from beside the pier.
  const V3 = THREE.Vector3, n = ORDER.length, flat = id => new V3(W[id][0], 0, W[id][2]);
  const omega = ORDER.map((id, i) => {
    const nb = [ORDER[i - 1], ORDER[i + 1]].filter(Boolean).map(flat);
    return nb.reduce((a, q) => a.add(q), new V3()).divideScalar(nb.length).sub(flat(id)).normalize();
  });
  ORDER.forEach((id, i) => {
    const w = Math.atan2(omega[i].x, omega[i].z);
    let best = null;
    for (let k = 0; k < 72; k++) {
      const phi = k / 72 * Math.PI * 2, ux = Math.sin(phi), uz = Math.cos(phi);
      const clear = Math.min(...KEEP[id].map(([x, z, r]) => Math.max(R[id] - .4 - (x * ux + z * uz + r), Math.abs(x * uz - z * ux) - (r + .6))));
      for (const side of [-1, 1]) for (const d of [.7, 1.0, 1.3]) {
        const cy = w + side * d, dist = 9.5 + R[id] * 2.1, cam = flat(id).add(new V3(Math.sin(cy) * dist, 0, Math.cos(cy) * dist));
        let sight = 0;
        for (const o of ORDER) if (o !== id) {
          const c = flat(o), seg = flat(id).sub(cam), t = Math.max(0, Math.min(1, c.clone().sub(cam).dot(seg) / seg.lengthSq()));
          if (cam.clone().addScaledVector(seg, t).distanceTo(c) < R[o] + 1) sight += 5;
        }
        let a = phi + side * d - NICE[id]; a = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
        const score = (clear >= 0 ? 0 : 10 - clear * 5) + sight + a;
        if (!best || score < best.score) best = { score, phi, cy };
      }
    }
    roots[id].rotation.y = w - best.phi;
    if (i) CAM[id] = best.cy;
  });
  const docks = ORDER.map((id, i) => flat(id).addScaledVector(omega[i], R[id] + 2.3));

  // a box oriented along direction T (sideways S)
  const obox = (c, T, S, lt, ls, h, color, k) => {
    const q = (a, b, y) => [c.x + T.x * a + S.x * b, c.y + y, c.z + T.z * a + S.z * b], A = lt / 2, B = ls / 2;
    const v = [q(-A, -B, 0), q(A, -B, 0), q(A, B, 0), q(-A, B, 0), q(-A, -B, h), q(A, -B, h), q(A, B, h), q(-A, B, h)];
    return [[4, 5, 6, 7], [0, 1, 2, 3], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].map(f => F(f.map(i => v[i]), color, [c.x, c.y + h / 2, c.z], 0, k));
  };
  // wooden piers with posts down into the water and a lantern at the end
  const pierFaces = [];
  ORDER.forEach((id, i) => {
    const T = omega[i], S = new V3(T.z, 0, -T.x), from = R[id] - .5, to = R[id] + 1.9;
    for (let d = from, k = 0; d < to; d += .32, k++) pierFaces.push(...obox(flat(id).addScaledVector(T, d + .16).setY(.42), T, S, .3, 1.0, .07, '#B98552', k % 2 ? .93 : 1.05));
    for (let d = from + .6; d < to; d += .8) for (const e of [-.45, .45]) pierFaces.push(...obox(flat(id).addScaledVector(T, d).addScaledVector(S, e).setY(-.8), T, S, .09, .09, 1.35, '#7A5444'));
    const end = flat(id).addScaledVector(T, to - .15);
    pierFaces.push(...obox(end.clone().addScaledVector(S, .42).setY(.49), T, S, .05, .05, .7, '#2C3047'), ...obox(end.clone().addScaledVector(S, .42).setY(1.19), T, S, .14, .14, .16, '#FFE08A', 1.3));
    for (const e of [-.42, .42]) pierFaces.push(...obox(end.clone().addScaledVector(T, -.5).addScaledVector(S, e).setY(.49), T, S, .1, .1, .12, '#2C3047'));
  });
  scene.add(toMesh(pierFaces));
  // props standing where a pier now runs are removed (main objects were kept clear when turning the island)
  scene.updateMatrixWorld(true);
  ORDER.forEach((id, i) => [...roots[id].children].slice(1).forEach(ch => {
    if (ch.userData.explode !== undefined) return;
    const w = ch.getWorldPosition(new V3()), rel = new V3(w.x, 0, w.z).sub(flat(id)), along = rel.dot(omega[i]), across = Math.abs(rel.dot(new V3(omega[i].z, 0, -omega[i].x)));
    if (w.y - W[id][1] < 1.5 && along > R[id] - 1.2 && across < .9) ch.removeFromParent();
  }));

  // animated low-poly water
  const wave = (x, z, t) => .14 * Math.sin(x * .32 + t * 1.1) + .1 * Math.cos(z * .27 - t * .9) + .05 * Math.sin((x + z) * .6 + t * 1.7);
  const seaGeo = new THREE.PlaneGeometry(320, 320, 110, 110).rotateX(-Math.PI / 2).toNonIndexed();
  const sp = seaGeo.attributes.position, base = Float32Array.from(sp.array);
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: '#8FD3EA', flatShading: true, roughness: .3, metalness: .05, transparent: true, opacity: .92 }));
  sea.position.set(15, 0, 24); sea.receiveShadow = true; scene.add(sea);
  // surf around every island
  const surf = ORDER.map((id, i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(R[id] * .97, R[id] * 1.16, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .55, depthWrite: false }));
    m.position.set(W[id][0], .09, W[id][2]); scene.add(m); return m;
  });
  tickers.push(t => {
    for (let k = 0; k < sp.count; k++) sp.array[k * 3 + 1] = wave(base[k * 3] + 15, base[k * 3 + 2] + 24, t);
    sp.needsUpdate = true;
    surf.forEach((m, i) => { const p = (t * .35 + i * .3) % 1; m.scale.setScalar(1 + p * .12); m.material.opacity = .55 * (1 - p); });
  });

  // ---- boats: a little sailboat for you, a fishing boat cruising round the archipelago
  const hull = [[0, 1.25], [.42, .6], [.5, -.3], [.42, -.95], [-.42, -.95], [-.5, -.3], [-.42, .6]];
  const boatFaces = (stripe, sail) => {
    const ring = (y, sx, sz) => hull.map(([x, z]) => [x * sx, y, z * sz]), top = ring(.45, 1, 1), mid = ring(.3, .93, .97), bot = ring(-.05, .55, .85), fs = [];
    for (let k = 0; k < hull.length; k++) {
      const j = (k + 1) % hull.length;
      fs.push(F([top[k], top[j], mid[j], mid[k]], stripe, [0, .2, 0]), F([mid[k], mid[j], bot[j], bot[k]], '#F6F2EA', [0, .2, 0]));
    }
    fs.push(F(top, '#C99764', [0, 0, 0], 0, 1.05), F(bot, '#2C3047', [0, 1, 0]));
    fs.push(...at(box(.55, .35, .5, '#F6F2EA'), 0, .45, -.4), ...at(box(.62, .06, .58, stripe), 0, .8, -.4), ...at(box(.56, .12, .02, '#9FD6EA', 0, 1.1), 0, .58, -.14));
    if (sail) fs.push(...at(cyl(.03, .03, 2.0, 6, '#8A5A3B'), 0, .45, .3), F([[0, .75, .33], [0, 2.35, .33], [0, .75, 1.2]], '#FFFFFF', [1, 0, 0], 1, 1.05),
      F([[0, 2.45, .3], [0, 2.3, .3], [0, 2.38, -.1]], stripe, [1, 0, 0], 1));
    else fs.push(...at(cyl(.07, .09, .4, 8, '#2C3047'), 0, .86, -.4), ...at(box(.04, .9, .04, '#8A5A3B'), 0, .45, .5), ...at(box(.7, .03, .03, '#8A5A3B'), 0, 1.25, .5));
    return fs;
  };
  const mine = node(scene, {}, toMesh(boatFaces(acc, true))), fisher = node(scene, { s: .8 }, toMesh(boatFaces('#5B8CFF', false)));
  const legs = ORDER.slice(0, -1).map((_, i) => new THREE.CubicBezierCurve3(docks[i], docks[i].clone().addScaledVector(omega[i], 3.5), docks[i + 1].clone().addScaledVector(omega[i + 1], 3.5), docks[i + 1]));
  const loop = new THREE.CatmullRomCurve3(Array.from({ length: 16 }, (_, k) => { const a = k / 16 * Math.PI * 2; return new V3(15 + Math.cos(a) * 20, 0, 24 + Math.sin(a) * 28); }), true);
  const boat = { pos: new V3(), dir: new V3(0, 0, 1), leg: 0, e: 0, setLeg: (i, e) => { boat.leg = i; boat.e = e; } };
  // foam wake
  const foamGeo = new THREE.CircleGeometry(.3, 8).rotateX(-Math.PI / 2);
  const foam = Array.from({ length: 40 }, () => { const m = new THREE.Mesh(foamGeo, new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0, depthWrite: false })); scene.add(m); return m; });
  let foamIdx = 0, lastFoam = 0, lastBT = 0, fisherU = 0; const lastMine = new V3();
  const float = (g, P, D, t, roll) => {
    g.position.set(P.x, wave(P.x, P.z, t) - .02, P.z);
    g.rotation.order = 'YXZ';
    g.rotation.set((wave(P.x + D.x, P.z + D.z, t) - wave(P.x - D.x, P.z - D.z, t)) * -.6, Math.atan2(D.x, D.z), Math.sin(t * 1.3 + roll) * .06);
  };
  const wake = (g, D) => {
    const m = foam[foamIdx++ % foam.length];
    m.position.copy(g.position).addScaledVector(D, -.9).setY(g.position.y + .08); m.scale.setScalar(.5); m.material.opacity = .55;
  };
  tickers.push(t => {
    const dt = Math.min(.05, Math.max(0, t - lastBT)); lastBT = t;
    const leg = legs[boat.leg], u = Math.min(1, Math.max(0, boat.e));
    boat.pos.copy(leg.getPointAt(u)); boat.dir.copy(leg.getTangentAt(u)).setY(0).normalize();
    float(mine, boat.pos, boat.dir, t, 0);
    fisherU = (fisherU + dt * 2 / loop.getLength()) % 1;
    const fp = loop.getPointAt(fisherU), fd = loop.getTangentAt(fisherU).setY(0).normalize();
    float(fisher, fp, fd, t, 2);
    if (t - lastFoam > .1) {
      lastFoam = t;
      wake(fisher, fd);
      if (mine.position.distanceTo(lastMine) > .05) wake(mine, boat.dir); // only while actually sailing
      lastMine.copy(mine.position);
    }
    foam.forEach(m => { m.scale.multiplyScalar(1 + dt * 1.4); m.material.opacity *= 1 - dt * 1.2; });
  });

  // rocky islets with a palm or a rock, kept off the sailing routes
  const routeAt = legs.flatMap(l => l.getSpacedPoints(30));
  [[10, 33.5, 1.3, 1], [10, 40, .9, 1], [27, 25, 1.1, 0], [-1, 33, .8, 1], [12, 26, .7, 1], [28, 6, .9, 1], [1, 13, 1.1, 0], [14, 36, .6, 0], [31, 36, 1.2, 1], [-4, 8, 1.0, 1]]
    .filter(([x, z, r]) => routeAt.every(q => Math.hypot(q.x - x, q.z - z) > r + 1.8))
    .forEach(([x, z, r, kind], i) => node(scene, { p: [x, .35, z] }, toMesh([...islandFaces(r, 300 + i), ...decor(r, 300 + i, [[0, 0, .4]]), ...(kind ? at(tree(1), 0, .08, 0) : at(rock(1.2), 0, .08, 0))])));

  // clouds drifting high above the sea
  const clouds = [[-1, 7, 40, 1.4], [28, 8, 37, 1.1], [11, 9, 28, 1], [30, 7, 9, 1.2], [-4, 8.5, 18, .9], [12, 9.5, 2, .8], [22, 7.5, 47, 1.3], [0, 8, 6, 1.2], [17, 8.5, 15, 1.5], [7, 7, 50, 1.1], [32, 9, 22, .9], [-3, 7.5, 28, 1.2]]
    .map(([x, y, z, s]) => { const c = node(scene, { p: [x, y, z], s }, toMesh(cloudFaces())); c.userData.x0 = x; return c; });
  tickers.push(t => clouds.forEach((c, i) => { c.position.x = c.userData.x0 + Math.sin(t * .05 + i) * 1.5; }));

  // the player's plane
  const plane = node(scene, {}, toMesh(planeBody(acc)));
  const prop = node(plane, { p: [.77, 0, 0] }, toMesh(at(box(.02, .55, .06, '#2C3047'), 0, -.275, 0)));
  plane.scale.setScalar(.6);
  tickers.push(t => { prop.rotation.x = t * 40; });

  // every island bobs gently
  tickers.push(t => bobbers.forEach(([g, y], i) => { g.position.y = y + Math.sin(t * .8 + i * 1.3) * .12; }));

  return { roots, labels, explodables, plane, boat, update: t => tickers.forEach(f => f(t)) };
}
