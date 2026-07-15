// RED ECLIPSE SYSTEM — boss-only production sheet (concept, nothing wired).
// Three animation families, all strict pixel art (hard cells, no glow, no
// gradients, boss palette keys only):
//
//   FAMILY A — STRIDE ECLIPSE  (refinement of the live surgeForward/surgeBackward
//              walk trigger; same walk poses, index-locked 6f/4f drop-ins).
//              Lifecycle: OMEN -> FLARE (one arc packet travels) -> FRACTURE ->
//              ASHFALL. Fwd rides the weapon line low; bwd rides crown/spine high.
//              One-shot: once triggered it plays through (state break = cut to ash).
//
//   FAMILY B — INHALE ECLIPSE  (NEW, ground charged attack). IMPLOSION: a broken
//              shard ring materializes far out, then everything is drawn INWARD
//              along fixed spokes (heads hot, tails trailing outward) until a
//              crushed pressure ring brims around the torso. Floor arcs skitter
//              inward to his feet. Energy converges INTO the boss.
//
//   FAMILY C — IGNITION ECLIPSE (NEW, air charged attack, reref1 translated).
//              OUTWARD starburst: umbral void-disc core with a hot corona ring
//              (a literal red eclipse), long STRAIGHT crystalline rays (the
//              south ray is the longest — it aims at the ground), broken-octagon
//              geometry (never a circle), crystal shard scatter, then the rays
//              SHATTER into black-red bolts and sink as ash.
//
// Emits: eclipse_v1.png (sheet) + eclipse_literal.txt (drop-ins + effect grids).
const fs = require('fs');
const zlib = require('zlib');

// ---------- palettes (locked palette law) ----------
const BOSS_PAL = {
  '0': '#08080c', '1': '#12121a', '2': '#1c1d28', '3': '#2a2c3a', '4': '#3d4052', '5': '#565c74',
  'a': '#6e0f1c', 'b': '#a8182a', 'c': '#e0263a', 'd': '#ff5a4a', 'g': '#3a1014', 'h': '#571820',
};
const HERO_PAL = {
  '0': '#10141e', '1': '#2e3444', '2': '#4a5468', '3': '#7c88a0', '4': '#aeb9cc', '5': '#e2e8f2',
  'n': '#141c30', 'm': '#1c2438', 'l': '#7fd4ff', 'L': '#b8ecff', 'g': '#c9962e',
};
const E0 = '#6e0f1c', E1 = '#a8182a', E2 = '#e0263a', E3 = '#ff5a4a';
const NW0 = '#191622', NW1 = '#1d1a28', NF0 = '#221c2b', NF1 = '#3a3346';
const WINL = '#6c82a8';

// ---------- load approved clips from the literal artifacts ----------
function loadClips(file, names) {
  const src = fs.readFileSync(__dirname + '/' + file, 'utf8').replace(/\r/g, '');
  const out = {};
  for (const n of names) {
    const m = src.match(new RegExp('  ' + n + ': \\[([\\s\\S]*?)\\n  \\],'));
    if (!m) throw new Error('clip not found: ' + n + ' in ' + file);
    out[n] = [...m[1].matchAll(/\[((?:"[^"]*"(?:, )?)+)\]/g)]
      .map(fm => fm[1].split(', ').map(s => JSON.parse(s)));
  }
  return out;
}
const WALK = loadClips('walk2_literal.txt', ['walkForward', 'walkBackward']);
const ANIM = loadClips('boss_anim_literal.txt', ['groundCharge', 'airCharge']);
const heroBase = fs.readFileSync(__dirname + '/hero_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));

const toGrid = f => f.map(r => r.split(''));
const stringify = g => g.map(r => r.join(''));

// ---------- generic grid helpers (grid-size aware) ----------
const mkGrid = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const put = (g, x, y, k) => {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = k;
};
const rnd = (i, s) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
function bres(x0, y0, x1, y1) {
  const out = []; let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0),
    sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, x = x0, y = y0;
  for (;;) { out.push([x, y]); if (x === x1 && y === y1) break;
    const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
  return out;
}
// void-fracture bolt path + bake (afk2/walk2 approved anatomy, grid-size aware)
function boltPath(x0, y0, x1, y1, seed, jx = 2, jy = 2) {
  const pts = [[x0, y0]];
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 4));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pts.push([Math.round(x0 + (x1 - x0) * t + (rnd(i, seed) - 0.5) * 2 * jx),
              Math.round(y0 + (y1 - y0) * t + (rnd(i, seed + 3) - 0.5) * 2 * jy)]);
  }
  pts.push([x1, y1]);
  const cells = [], kinks = [];
  for (let s = 0; s < pts.length - 1; s++) {
    const seg = bres(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]);
    if (s > 0) seg.shift();
    cells.push(...seg);
    if (s < pts.length - 2) kinks.push(cells.length - 1);
  }
  return { cells, kinks };
}
function bakeBolt(g, bolt, mode, opts = {}) {
  const { cells, kinks } = bolt, kset = new Set(kinks);
  const { branches = [], seed = 7 } = opts;
  if (mode === 'ignite') {
    const [sx, sy] = cells[0];
    put(g, sx, sy, 'd'); put(g, sx + 1, sy, 'd'); put(g, sx, sy + 1, 'd'); put(g, sx + 1, sy + 1, 'd');
    [[-2, -2], [3, -2], [-2, 3], [3, 3]].forEach(([dx, dy]) => put(g, sx + dx, sy + dy, 'c'));
    for (let i = 2; i < Math.min(8, cells.length); i++) put(g, cells[i][0], cells[i][1], '0');
    return;
  }
  if (mode === 'flash') {
    for (let i = 0; i < cells.length; i++) {                 // black crack sheath first
      const [x, y] = cells[i];
      const p = cells[Math.max(0, i - 1)], nn = cells[Math.min(cells.length - 1, i + 1)];
      if (Math.abs(nn[1] - p[1]) >= Math.abs(nn[0] - p[0])) { put(g, x - 1, y, '0'); put(g, x + 1, y, '0'); }
      else { put(g, x, y - 1, '0'); put(g, x, y + 1, '0'); }
    }
    for (const [x, y] of cells) put(g, x, y, 'c');           // red filament
    for (const i of kinks) { const [x, y] = cells[i]; put(g, x, y, 'd'); put(g, x, y - 1, 'd'); }
    for (const b of branches) {
      const from = cells[Math.min(cells.length - 1, Math.floor(b.frac * cells.length))];
      const sub = boltPath(from[0], from[1], from[0] + b.dx, from[1] + b.dy, seed + 11, 1, 1);
      sub.cells.forEach(([x, y], i2) => { put(g, x, y - 1, '0'); put(g, x, y, i2 === sub.cells.length - 1 ? 'a' : 'b'); });
    }
    return;
  }
  if (mode === 'fracture') {
    for (let i = 0; i < cells.length; i++) {
      if (i % 5 >= 3) continue;
      const [x, y] = cells[i];
      put(g, x, y, kset.has(i) ? 'c' : 'b');
      if (i % 5 === 0) put(g, x, y - 1, '0');
    }
    const m = cells[Math.floor(cells.length / 2)];
    put(g, m[0] + 2, m[1] - 2, 'a'); put(g, m[0] - 2, m[1] + 3, 'a');
    return;
  }
  for (let i = 0; i < cells.length; i += 4) {                // ash: sinking slivers
    const [x, y] = cells[i];
    const len = 2 + ((i >> 2) % 2);
    for (let j = 0; j < len; j++) put(g, x, y + 1 + j, (i >> 2) % 2 ? '1' : 'g');
  }
  const m = cells[Math.floor(cells.length / 2)];
  put(g, m[0] + 2, m[1] + 2, 'a');
}

// ---------- body treatments (family-shared eclipse language) ----------
const DARK1 = { '5': '4', '4': '3', '3': '2', '2': '1', '1': '0', '0': '0',
                'd': 'c', 'c': 'b', 'b': 'a', 'a': 'g', 'h': 'g', 'g': 'g' };
const darkenStep = g => g.map(r => r.map(k => DARK1[k] || k));
// Near-void eclipse skin with a BROKEN ember rim. rim 0..1 = rim density
// envelope (entry/exit sparse, peak dense). hot = blade/ember cells keep a
// graded molten memory instead of flattening to 'a'.
function eclipseSkin(gIn, seed, opts = {}) {
  const { rim = 1, hot = false } = opts;
  const HH2 = gIn.length, WW2 = gIn[0].length;
  const out = gIn.map((row, y) => row.map((k, x) => {
    if (k === '.') return '.';
    if (k === 'd') return hot ? ((x + y + seed) % 3 === 0 ? 'c' : 'b') : 'a';
    if (k === 'c') return hot ? 'b' : 'a';
    if (k === 'b') return 'a';
    if (k === 'a' || k === 'g' || k === 'h') return 'g';
    return (x * 3 + y * 7 + seed) % 13 === 0 ? '1' : '0';
  }));
  for (let y = 0; y < HH2; y++) {
    let lo = -1, hi = -1;
    for (let x = 0; x < WW2; x++) if (out[y][x] !== '.') { if (lo < 0) lo = x; hi = x; }
    if (lo < 0) continue;
    const base = rim < 0.5 ? 'g' : 'h';
    if (rnd(y, seed) < rim * 0.95)      out[y][lo] = rnd(y, seed + 9)  < rim * 0.42 ? 'c' : base;
    if (rnd(y, seed + 4) < rim * 0.95)  out[y][hi] = rnd(y, seed + 13) < rim * 0.42 ? 'c' : base;
  }
  return out;
}
const contourHi = (g, y) => { for (let x = g[0].length - 1; x >= 0; x--) if (g[y][x] !== '.') return x; return -1; };

// =====================================================================
// FAMILY A — STRIDE ECLIPSE (refined surge drop-ins, 46x48, index-locked)
// =====================================================================
// Refinements vs the live surge:
//  1. rim ENVELOPE — broken ember rim density ramps 0 -> peak -> 0 across the clip.
//  2. ONE ARC PACKET — the lightning reads as a single energy packet traveling
//     (fwd: chest -> rear arm -> trailing blade -> ground; bwd: crown ->
//     shoulders -> spine -> tear-off). The abandoned segment dies to ash EARLY,
//     one station behind the live arc, instead of re-jittering forever.
//  3. OMEN GLINTS — entry frame gets 1px pre-glints on the facing contour (fwd)
//     or faint halo ticks over the crown (bwd) so the event announces itself.
//  4. EMBER MEMORY — at peak the molten blade keeps a graded b/c memory (hot),
//     and the exit frame leaves 3 dim ember cells cooling on the blade line.
const CORE = [20, 15], FIST = [12, 24], BLA = [12, 29], BLB = [6, 43];
function strideFwdFrames() {
  const wf = WALK.walkForward.map(toGrid);
  const s = [];
  // F0 OMEN — one dark step, chest core ignites, facing contour pre-glints
  let g = darkenStep(wf[0]);
  bakeBolt(g, boltPath(CORE[0], CORE[1], CORE[0] + 5, CORE[1] + 3, 41, 1, 1), 'ignite');
  put(g, contourHi(g, 13) + 1, 13, 'c'); put(g, contourHi(g, 18) + 1, 18, 'a');
  s.push(g);
  // F1 FLARE — full eclipse, packet flashes chest -> rear fist
  g = eclipseSkin(wf[1], 1, { rim: 0.8 });
  bakeBolt(g, boltPath(CORE[0], CORE[1], FIST[0], FIST[1] + 1, 43, 1, 2), 'flash',
    { branches: [{ frac: 0.45, dx: -4, dy: -4 }], seed: 43 });
  put(g, CORE[0], CORE[1], 'd'); put(g, CORE[0] + 1, CORE[1], 'd');   // hot source
  s.push(g);
  // F2 FLARE-PK — packet hands off fist -> trailing blade; chest dies to ash
  g = eclipseSkin(wf[2], 2, { rim: 1, hot: true });
  bakeBolt(g, boltPath(FIST[0], FIST[1], BLA[0], BLA[1], 47, 1, 1), 'flash', { seed: 47 });
  bakeBolt(g, boltPath(BLA[0], BLA[1], BLB[0], BLB[1], 53, 2, 1), 'flash',
    { branches: [{ frac: 0.55, dx: -4, dy: -2 }], seed: 53 });
  bakeBolt(g, boltPath(CORE[0], CORE[1], FIST[0], FIST[1] + 1, 43, 1, 2), 'ash');
  s.push(g);
  // F3 FLARE — packet reaches the ground: blade re-strike + skitter behind him
  g = eclipseSkin(wf[3], 3, { rim: 0.85, hot: true });
  bakeBolt(g, boltPath(BLA[0], BLA[1] + 1, BLB[0] + 1, BLB[1], 59, 2, 1), 'flash', { seed: 59 });
  bakeBolt(g, boltPath(2, 46, 10, 46, 61, 0, 1), 'flash', { seed: 61 });
  bakeBolt(g, boltPath(FIST[0], FIST[1], BLA[0], BLA[1], 47, 1, 1), 'ash');
  s.push(g);
  // F4 FRACTURE — blade + ground arcs break into runs
  g = eclipseSkin(wf[4], 4, { rim: 0.55 });
  bakeBolt(g, boltPath(BLA[0], BLA[1], BLB[0], BLB[1], 53, 2, 1), 'fracture');
  bakeBolt(g, boltPath(2, 46, 10, 46, 61, 0, 1), 'fracture');
  s.push(g);
  // F5 ASHFALL — dark step back out; ash sinks; ember memory cools on the blade
  g = darkenStep(wf[5]);
  bakeBolt(g, boltPath(BLA[0], BLA[1], BLB[0], BLB[1], 53, 2, 1), 'ash');
  bakeBolt(g, boltPath(2, 46, 10, 46, 61, 0, 1), 'ash');
  [[10, 33], [8, 38], [7, 41]].forEach(([x, y]) => put(g, x, y, 'b'));
  s.push(g);
  return s;
}
function strideBwdFrames() {
  const wb = WALK.walkBackward.map(toGrid);
  const s = [];
  // B0 OMEN — dark step, crown ignite, faint halo hints
  let g = darkenStep(wb[0]);
  bakeBolt(g, boltPath(14, 1, 18, 3, 71, 1, 1), 'ignite');
  put(g, 9, 0, 'g'); put(g, 19, 0, 'g');
  s.push(g);
  // B1 FLARE-PK — crown arc + one arc per shoulder + regal halo ticks
  g = eclipseSkin(wb[1], 5, { rim: 1, hot: true });
  bakeBolt(g, boltPath(10, 3, 20, 1, 73, 1, 2), 'flash', { seed: 73 });
  bakeBolt(g, boltPath(5, 13, 13, 9, 79, 1, 2), 'flash',
    { branches: [{ frac: 0.5, dx: -3, dy: 4 }], seed: 79 });
  bakeBolt(g, boltPath(19, 9, 28, 12, 81, 1, 2), 'flash', { seed: 81 });
  put(g, 8, 0, 'a'); put(g, 13, 0, 'c'); put(g, 18, 0, 'a');
  s.push(g);
  // B2 FRACTURE — spine crawl + trailing tear-off; crown + shoulders break
  g = eclipseSkin(wb[2], 6, { rim: 0.7 });
  bakeBolt(g, boltPath(8, 9, 6, 26, 83, 2, 1), 'flash', { seed: 83 });
  bakeBolt(g, boltPath(6, 15, 1, 20, 89, 1, 1), 'fracture');
  bakeBolt(g, boltPath(10, 3, 20, 1, 73, 1, 2), 'fracture');
  bakeBolt(g, boltPath(5, 13, 13, 9, 79, 1, 2), 'fracture');
  s.push(g);
  // B3 ASHFALL — ash sinks off spine + shoulders, halo fades
  g = darkenStep(wb[3]);
  bakeBolt(g, boltPath(8, 9, 6, 26, 83, 2, 1), 'ash');
  bakeBolt(g, boltPath(19, 9, 28, 12, 81, 1, 2), 'ash');
  put(g, 9, 1, 'g'); put(g, 17, 1, 'g');
  s.push(g);
  return s;
}

// =====================================================================
// FAMILY B — INHALE ECLIPSE (ground charged attack, 84x62 effect grids)
// =====================================================================
// Anchors: boss groundCharge pose (46x48) at grid (19,14); feet rows 60-61;
// chest core at grid (39,29). Spoke angles are FIXED across the whole clip so
// the shrinking radius + outward-trailing tails read as pure inward motion.
const GB = { W: 84, H: 62, BX: 19, BY: 14, CX: 39, CY: 29, FLOOR: 60 };
const SPOKES = [-90, -122, -152, 180, -58, -28, 0, 24, 156].map(d => d * Math.PI / 180);
const spokeR = (i, r) => r + (rnd(i, 5) - 0.5) * 5;          // per-spoke radius jitter
function shardAt(g, ang, r, hotKey) {
  const x = Math.round(GB.CX + Math.cos(ang) * r), y = Math.round(GB.CY + Math.sin(ang) * r);
  const px = Math.round(-Math.sin(ang)), py = Math.round(Math.cos(ang));
  put(g, x, y, hotKey); put(g, x + px, y + py, 'a'); put(g, x - px, y - py, '0');
  return [x, y];
}
function inTail(g, ang, r, len) {                            // tail trails OUTWARD
  for (let i = 1; i <= len; i++) {
    const rr = r + 1 + i * 2;
    put(g, Math.round(GB.CX + Math.cos(ang) * rr), Math.round(GB.CY + Math.sin(ang) * rr),
      i === 1 ? 'a' : i === 2 ? 'g' : '0');
  }
}
function filament(g, ang, rIn, rOut, noVoid = false) {       // radial feed line, hot head inside
  // noVoid: on the FRONT grid the '0' crack-sheath cells read as holes bitten
  // out of the black silhouette — ember cells only there.
  const cells = bres(Math.round(GB.CX + Math.cos(ang) * rOut), Math.round(GB.CY + Math.sin(ang) * rOut),
                     Math.round(GB.CX + Math.cos(ang) * rIn),  Math.round(GB.CY + Math.sin(ang) * rIn));
  cells.forEach(([x, y], i) => {
    const t = i / Math.max(1, cells.length - 1);
    if (noVoid) { if (t > 0.7) put(g, x, y, 'c'); else if (t > 0.35) put(g, x, y, 'b'); else if (i % 2 === 0) put(g, x, y, 'a'); return; }
    put(g, x, y, t > 0.75 ? 'c' : t > 0.4 ? 'b' : '0');
    if (i % 3 === 0) put(g, x, y - 1, '0');
  });
  const l = cells[cells.length - 1];
  put(g, l[0], l[1], 'd');
}
function ringOct(g, r, offDeg, keys = ['a', 'b']) {          // broken octagon wrap
  for (let k = 0; k < 8; k++) {
    const a0 = (offDeg + k * 45) * Math.PI / 180, a1 = (offDeg + (k + 1) * 45) * Math.PI / 180;
    const v0 = [Math.round(GB.CX + Math.cos(a0) * r), Math.round(GB.CY + Math.sin(a0) * r)];
    const v1 = [Math.round(GB.CX + Math.cos(a1) * r), Math.round(GB.CY + Math.sin(a1) * r)];
    const seg = bres(v0[0], v0[1], v1[0], v1[1]);
    for (let i = Math.floor(seg.length * 0.22); i < Math.ceil(seg.length * 0.78); i++)
      put(g, seg[i][0], seg[i][1], i % 4 === 0 ? 'g' : keys[0]);
    if (k % 2 === 0) put(g, v0[0], v0[1], keys[1]);
    if (k === 1 || k === 5) put(g, v0[0], v0[1], 'd');       // 2 vertex glints
  }
}
// chest core pulse baked onto the treated BODY pose (pose coords, chest 20,15)
function chestCore(body, level) {
  const [px, py] = [20, 15];
  if (level >= 1) { put(body, px, py, 'd'); put(body, px + 1, py, 'd'); put(body, px, py + 1, 'd'); put(body, px + 1, py + 1, 'd'); }
  if (level >= 2) [[-1, 0], [2, 0], [0, -1], [1, -1], [0, 2], [1, 2]].forEach(([dx, dy]) => put(body, px + dx, py + dy, 'c'));
  if (level === 0) { put(body, px, py, 'c'); put(body, px + 1, py, 'b'); }
  return body;
}
function familyB() {
  const gp = ANIM.groundCharge.map(toGrid);
  const out = [];
  const mk = () => mkGrid(GB.W, GB.H);
  const F = GB.FLOOR, cx = GB.CX;
  // B0 VEIL-A — half the shard ring materializes far out; far floor embers wake
  let back = mk(), front = mk();
  SPOKES.forEach((a, i) => { if (i % 2 === 0) shardAt(back, a, spokeR(i, 28), 'b'); });
  put(back, cx - 29, F, 'a'); put(back, cx + 29, F, 'a');
  out.push({ back, front, body: gp[0].map(r => r.slice()), tag: 'B0 VEIL-A' });
  // B1 VEIL-B — the broken ring completes + first inward pressure ticks; skitters ignite
  back = mk(); front = mk();
  SPOKES.forEach((a, i) => {
    shardAt(back, a, spokeR(i, 27), 'b');
    if (i % 2 === 0) put(back, Math.round(cx + Math.cos(a) * (spokeR(i, 27) - 4)),
                          Math.round(GB.CY + Math.sin(a) * (spokeR(i, 27) - 4)), 'a');
  });
  bakeBolt(back, boltPath(cx - 29, F, cx - 24, F, 101, 0, 1), 'ignite');
  bakeBolt(back, boltPath(cx + 29, F, cx + 24, F, 103, 0, 1), 'ignite');
  out.push({ back, front, body: darkenStep(gp[1]), tag: 'B1 VEIL-B' });
  // B2 INHALE-A — ring collapses to r19, tails trail outward; skitters crawl in
  back = mk(); front = mk();
  SPOKES.forEach((a, i) => { const r = spokeR(i, 19); shardAt(back, a, r, 'c'); inTail(back, a, r, 3); });
  bakeBolt(back, boltPath(cx - 27, F, cx - 13, F - 1, 107, 0, 1), 'flash', { seed: 107 });
  bakeBolt(back, boltPath(cx + 27, F, cx + 13, F - 1, 109, 0, 1), 'flash', { seed: 109 });
  out.push({ back, front, body: darkenStep(gp[0]), tag: 'B2 INHALE-A' });
  // B3 INHALE-B — r12 heads + long tails + 4 feed filaments; kernel lights on the
  // chest. From here in the convergence rides the FRONT grid: the pull visibly
  // crosses the silhouette instead of hiding behind it (the down-spokes were
  // fully occluded on the back grid and the read went top-heavy).
  back = mk(); front = mk();
  SPOKES.forEach((a, i) => { const r = spokeR(i, 12); shardAt(front, a, r, 'c'); inTail(front, a, r, 3); });
  [0, 2, 4, 6].forEach(i => filament(front, SPOKES[i], spokeR(i, 12) + 2, spokeR(i, 12) + 9, true));
  bakeBolt(back, boltPath(cx - 16, F, cx - 6, F, 113, 0, 1), 'flash', { seed: 113 });
  bakeBolt(back, boltPath(cx + 16, F, cx + 6, F, 115, 0, 1), 'flash', { seed: 115 });
  out.push({ back, front, body: chestCore(eclipseSkin(gp[1], 11, { rim: 0.7 }), 1), tag: 'B3 INHALE-B' });
  // B4 CRUSH — the pull lands: 6 hot feed filaments + the pressure ring snap on;
  // shard heads + tails are DROPPED here (they have landed — keeping them read
  // as clutter over the ring), feet arcs fracture at his feet
  back = mk(); front = mk();
  [0, 1, 3, 4, 5, 7].forEach(i => filament(front, SPOKES[i], spokeR(i, 8) + 2, spokeR(i, 8) + 7, true));
  bakeBolt(back, boltPath(cx - 9, F, cx - 3, F, 117, 0, 1), 'fracture');
  bakeBolt(back, boltPath(cx + 9, F, cx + 3, F, 119, 0, 1), 'fracture');
  ringOct(front, 9, 0);
  out.push({ back, front, body: chestCore(eclipseSkin(gp[0], 12, { rim: 1, hot: true }), 2), tag: 'B4 CRUSH' });
  // B5 BRIM-A — crushed ring holds; bright heartbeat; late stragglers still falling in
  back = mk(); front = mk();
  [1, 4, 7].forEach(i => { const r = 16 + 2 * (i % 3); shardAt(back, SPOKES[i], r, 'b'); inTail(back, SPOKES[i], r, 2); });
  put(back, cx - 5, F, 'c'); put(back, cx + 6, F, 'a');
  ringOct(front, 8, 0);
  out.push({ back, front, body: chestCore(eclipseSkin(gp[1], 13, { rim: 0.9, hot: true }), 2), tag: 'B5 BRIM-A' });
  // B6 BRIM-B — ring rotates a half-slot; heartbeat dims; other stragglers
  back = mk(); front = mk();
  [0, 3, 6].forEach(i => { const r = 17 + (i % 2) * 3; shardAt(back, SPOKES[i], r, 'b'); inTail(back, SPOKES[i], r, 2); });
  put(back, cx + 4, F, 'c'); put(back, cx - 7, F, 'a');
  ringOct(front, 8, 22);
  out.push({ back, front, body: chestCore(eclipseSkin(gp[0], 14, { rim: 0.75, hot: true }), 0), tag: 'B6 BRIM-B' });
  return out;
}

// =====================================================================
// FAMILY C — IGNITION ECLIPSE (air charged attack, 100x88 effect grids)
// =====================================================================
// Anchors: boss airCharge pose (46x48) at grid (27,14); chest core at (47,29).
// The starburst is drawn BEHIND the sprite; the corona core + late discharge
// ride in FRONT so the boss hangs inside the ignition. Rays are STRAIGHT and
// crystalline (that is family C's signature — the bolts only appear at decay).
const GC = { W: 100, H: 88, BX: 27, BY: 14, CX: 47, CY: 29 };
const RAYS = [ // [angleDeg, fullLen] — S is the longest: it aims at the ground
  [-90, 25], [90, 56], [0, 34], [180, 34],
  [-45, 17], [-135, 17], [45, 19], [135, 19],
];
function ray(g, angDeg, r0, r1, minor = false) {
  const a = angDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const px = -dy, py = dx;
  for (let r = r0; r <= r1; r++) {
    const t = (r - r0) / Math.max(1, r1 - r0);
    const x = Math.round(GC.CX + dx * r), y = Math.round(GC.CY + dy * r);
    if (minor) { put(g, x, y, t < 0.5 ? 'b' : 'a'); continue; }
    put(g, x, y, t < 0.3 ? 'd' : t < 0.62 ? 'c' : t < 0.86 ? 'b' : 'a');
    if (t < 0.55 && r1 - r0 > 12) {
      put(g, Math.round(x + px), Math.round(y + py), '0');
      put(g, Math.round(x - px), Math.round(y - py), '0');
    } else if (t < 0.8 && r1 - r0 > 18) put(g, Math.round(x + px), Math.round(y + py), 'g');
  }
}
// the ECLIPSE core: umbral void disc + hot corona ring + halo (front overlay)
function coronaCore(g, stage) {
  const [cx, cy] = [GC.CX, GC.CY];
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
    const m = Math.abs(dx) + Math.abs(dy);
    if (stage === 'kernel') {
      if (m <= 1) put(g, cx + dx, cy + dy, 'a');
      else if (m === 2) put(g, cx + dx, cy + dy, '0');
    } else if (stage === 'condense') {
      if (m === 0) put(g, cx + dx, cy + dy, 'd');
      else if (m <= 2) put(g, cx + dx, cy + dy, 'c');
      else if (m === 3) put(g, cx + dx, cy + dy, '0');
    } else if (stage === 'ignite') {
      if (m <= 1) put(g, cx + dx, cy + dy, '0');
      else if (m <= 3) put(g, cx + dx, cy + dy, 'd');
      else if (m === 4) put(g, cx + dx, cy + dy, 'c');
    } else if (stage === 'corona') {
      if (m <= 2) put(g, cx + dx, cy + dy, '0');
      else if (m <= 4) put(g, cx + dx, cy + dy, 'd');
      else if (m === 5) put(g, cx + dx, cy + dy, 'c');
      else if (m === 6 && (dx === 0 || dy === 0)) put(g, cx + dx, cy + dy, 'c');
    } else if (stage === 'shimmer') {
      if (m <= 2) put(g, cx + dx, cy + dy, '0');
      else if (m <= 4) put(g, cx + dx, cy + dy, (dx + dy) % 2 ? 'd' : 'c');
      else if (m === 5) put(g, cx + dx, cy + dy, 'b');
    } else if (stage === 'break') {
      if (m <= 2) put(g, cx + dx, cy + dy, '0');
      else if (m === 3 && (dx + dy) % 2 === 0) put(g, cx + dx, cy + dy, 'c');
      else if (m === 4 && (dx + dy) % 2) put(g, cx + dx, cy + dy, 'a');
    } else if (stage === 'ember') {
      if (m <= 1) put(g, cx + dx, cy + dy, 'a');
      else if (m === 2 && dx === 0) put(g, cx + dx, cy + dy, 'g');
    }
  }
}
function octRing(g, r, offDeg, style) {                      // broken octagon geometry
  for (let k = 0; k < 8; k++) {
    if (style === 'faint' && k % 2) continue;
    const a0 = (offDeg + k * 45) * Math.PI / 180, a1 = (offDeg + (k + 1) * 45) * Math.PI / 180;
    const v0 = [Math.round(GC.CX + Math.cos(a0) * r), Math.round(GC.CY + Math.sin(a0) * r)];
    const v1 = [Math.round(GC.CX + Math.cos(a1) * r), Math.round(GC.CY + Math.sin(a1) * r)];
    const seg = bres(v0[0], v0[1], v1[0], v1[1]);
    for (let i = Math.floor(seg.length * 0.2); i < Math.ceil(seg.length * 0.8); i++) {
      if (style === 'crack' && i % 5 >= 3) continue;
      put(g, seg[i][0], seg[i][1], style === 'faint' ? 'g' : i % 4 === 0 ? 'g' : 'a');
    }
  }
}
function outerDashes(g, r, n, seed) {                        // detached outer ring dashes
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(k, seed) * 0.2;
    put(g, Math.round(GC.CX + Math.cos(a) * r), Math.round(GC.CY + Math.sin(a) * r), '0');
    if (k % 3 === 0) put(g, Math.round(GC.CX + Math.cos(a) * (r + 1)), Math.round(GC.CY + Math.sin(a) * (r + 1)), 'g');
  }
}
function shards(g, n, rBase, rSpread, seed, opts = {}) {     // crystal scatter
  const { outward = true, fall = 0 } = opts;
  for (let i = 0; i < n; i++) {
    const a = rnd(i, seed) * Math.PI * 2;
    const r = rBase + rnd(i, seed + 2) * rSpread;
    const x = Math.round(GC.CX + Math.cos(a) * r), y = Math.round(GC.CY + Math.sin(a) * r) + fall;
    put(g, x, y, i % 3 === 0 ? 'b' : 'a');
    const tr = outward ? r - 3 : r + 3;                      // tail: outward flight or inward pull
    if (i % 2 === 0) put(g, Math.round(GC.CX + Math.cos(a) * tr), Math.round(GC.CY + Math.sin(a) * tr) + fall, 'g');
  }
}
function familyC() {
  const ap = ANIM.airCharge.map(toGrid);
  const out = [];
  const mk = () => mkGrid(GC.W, GC.H);
  const [cx, cy] = [GC.CX, GC.CY];
  // C0 KERNEL — a void kernel condenses at the chest; tiny in-ticks; close shards drift IN
  let back = mk(), front = mk();
  [[-45, 9, 7], [-135, 9, 7], [45, 10, 8], [135, 10, 8]].forEach(([a, r1, r0]) => {
    const ar = a * Math.PI / 180;
    put(back, Math.round(cx + Math.cos(ar) * r1), Math.round(cy + Math.sin(ar) * r1), 'g');
    put(back, Math.round(cx + Math.cos(ar) * r0), Math.round(cy + Math.sin(ar) * r0), 'a');
  });
  shards(back, 5, 13, 4, 21, { outward: false });
  coronaCore(front, 'kernel');
  out.push({ back, front, body: darkenStep(ap[0]), tag: 'C0 KERNEL' });
  // C1 CONDENSE — the kernel goes hot; N-S pre-stubs; the star is about to be born
  back = mk(); front = mk();
  ray(back, -90, 7, 10, true); ray(back, 90, 7, 10, true);
  shards(back, 4, 11, 3, 23, { outward: false });
  coronaCore(front, 'condense');
  out.push({ back, front, body: eclipseSkin(ap[1], 21, { rim: 0.6 }), tag: 'C1 CONDENSE' });
  // C2 IGNITE — rays burst to 55 pct; faint octagon; shards begin flying OUT
  back = mk(); front = mk();
  RAYS.slice(0, 4).forEach(([a, L]) => ray(back, a, 7, Math.round(L * 0.55)));
  RAYS.slice(4).forEach(([a, L]) => ray(back, a, 6, Math.round(L * 0.55), true));
  octRing(back, 20, 22, 'faint');
  shards(back, 8, 10, 4, 25);
  coronaCore(front, 'ignite');
  out.push({ back, front, body: eclipseSkin(ap[0], 22, { rim: 0.8, hot: true }), tag: 'C2 IGNITE' });
  // C3 CORONA — the reref1 frame: full rays, octagon + outer dashes, corona core,
  //             detached tip glints, crystal scatter — the boss hangs inside it
  back = mk(); front = mk();
  RAYS.slice(0, 4).forEach(([a, L]) => ray(back, a, 7, L));
  RAYS.slice(4).forEach(([a, L]) => ray(back, a, 6, L, true));
  for (let k = 0; k < 8; k++) ray(back, k * 45 + 22.5, 6, 10, true);   // minor inter-rays
  octRing(back, 20, 22, 'full'); outerDashes(back, 28, 22, 31);
  [[-90, 27], [90, 58], [0, 36], [180, 36]].forEach(([a, r]) => {      // detached tip glints
    const ar = a * Math.PI / 180;
    put(back, Math.round(cx + Math.cos(ar) * r), Math.round(cy + Math.sin(ar) * r), 'd');
  });
  shards(back, 12, 14, 6, 27);
  coronaCore(front, 'corona');
  out.push({ back, front, body: eclipseSkin(ap[1], 23, { rim: 1, hot: true }), tag: 'C3 CORONA' });
  // C4 SHIMMER — held peak: minor rays rotate a slot, shards push out, corona pulses
  back = mk(); front = mk();
  RAYS.slice(0, 4).forEach(([a, L]) => ray(back, a, 7, L));
  RAYS.slice(4).forEach(([a, L]) => ray(back, a, 6, Math.round(L * 0.9), true));
  for (let k = 0; k < 8; k++) ray(back, k * 45 + 11, 6, 9, true);
  octRing(back, 21, 45, 'full'); outerDashes(back, 29, 18, 33);
  shards(back, 12, 19, 6, 29);
  coronaCore(front, 'shimmer');
  out.push({ back, front, body: eclipseSkin(ap[0], 24, { rim: 1, hot: true }), tag: 'C4 SHIMMER' });
  // C5 SHATTER — the rays BREAK into black-red bolts (N+S still flash hot, E+W
  // already fractured); octagon cracks + drifts out
  back = mk(); front = mk();
  RAYS.slice(0, 4).forEach(([a, L], ri) => {                 // inner stumps stay crystalline
    ray(back, a, 7, Math.round(L * 0.35));
    const ar = a * Math.PI / 180;
    bakeBolt(back, boltPath(Math.round(cx + Math.cos(ar) * L * 0.4), Math.round(cy + Math.sin(ar) * L * 0.4),
                            Math.round(cx + Math.cos(ar) * L * 0.95), Math.round(cy + Math.sin(ar) * L * 0.95),
                            41 + a, 2, 2), ri < 2 ? 'flash' : 'fracture', { seed: 41 + a });
  });
  [[-45, 17], [135, 19]].forEach(([a, L]) => {               // two diagonals tear off whole
    const ar = a * Math.PI / 180;
    bakeBolt(back, boltPath(Math.round(cx + Math.cos(ar) * 8), Math.round(cy + Math.sin(ar) * 8),
                            Math.round(cx + Math.cos(ar) * (L + 4)), Math.round(cy + Math.sin(ar) * (L + 4)),
                            61 + a, 2, 2), 'fracture');
  });
  octRing(back, 23, 22, 'crack');
  shards(back, 14, 24, 7, 35, { fall: 1 });
  coronaCore(front, 'break');
  bakeBolt(front, boltPath(cx - 5, cy + 9, cx + 5, cy + 17, 141, 1, 1), 'flash', { seed: 141 }); // one bolt crawls OFF him
  out.push({ back, front, body: eclipseSkin(ap[1], 25, { rim: 0.7 }), tag: 'C5 SHATTER' });
  // C6 BOLTFALL — only stray bolts remain; ash sinks under the boss
  back = mk(); front = mk();
  bakeBolt(back, boltPath(cx, cy + 33, cx - 2, cy + 50, 143, 2, 1), 'fracture');
  bakeBolt(back, boltPath(cx + 12, cy - 12, cx + 20, cy - 20, 145, 1, 1), 'ash');
  bakeBolt(back, boltPath(cx - 12, cy + 8, cx - 22, cy + 16, 147, 1, 1), 'ash');
  [[-9, 36], [0, 40], [11, 37]].forEach(([dx, dy]) => {
    put(back, cx + dx, cy + dy, 'g'); put(back, cx + dx, cy + dy + 1, '1'); put(back, cx + dx, cy + dy + 2, '0');
  });
  coronaCore(front, 'ember');
  out.push({ back, front, body: darkenStep(ap[0]), tag: 'C6 BOLTFALL' });
  // C7 FADE — last ash slivers sink away; the boss resolves back to normal
  back = mk(); front = mk();
  [[-6, 42], [4, 46], [13, 30]].forEach(([dx, dy]) => {
    put(back, cx + dx, cy + dy, 'g'); put(back, cx + dx, cy + dy + 1, '1');
  });
  put(front, cx, cy, 'a');
  out.push({ back, front, body: ap[1].map(r => r.slice()), tag: 'C7 FADE' });
  return out;
}

// ---------- build everything ----------
const A_FWD = strideFwdFrames().map(stringify);
const A_BWD = strideBwdFrames().map(stringify);
const FAM_B = familyB();
const FAM_C = familyC();

// ---------- validation ----------
const LEGAL = new Set([...'012345abcdgh.']);
let vErr = 0;
function checkGrid(name, f, w, h) {
  if (f.length !== h || f.some(r => r.length !== w)) { console.error('SIZE FAIL', name); vErr++; }
  for (const r of f) for (const k of r) if (!LEGAL.has(k)) { console.error('KEY FAIL', name, k); vErr++; }
}
[['surgeForward', A_FWD], ['surgeBackward', A_BWD]].forEach(([n, frames]) => frames.forEach((f, i) => {
  checkGrid(n + i, f, 46, 48);
  let low = -1; f.forEach((r, y) => { if ([...r].some(k => k !== '.')) low = y; });
  if (low < 46) { console.error('FLOOR FAIL', n, i, low); vErr++; }
}));
FAM_B.forEach((fr, i) => { checkGrid('B' + i + 'back', stringify(fr.back), GB.W, GB.H);
  checkGrid('B' + i + 'front', stringify(fr.front), GB.W, GB.H); checkGrid('B' + i + 'body', stringify(fr.body), 46, 48); });
FAM_C.forEach((fr, i) => { checkGrid('C' + i + 'back', stringify(fr.back), GC.W, GC.H);
  checkGrid('C' + i + 'front', stringify(fr.front), GC.W, GC.H); checkGrid('C' + i + 'body', stringify(fr.body), 46, 48); });
// family B inward-motion proof: mean hot-head radius must shrink monotonically B1 -> B4
const meanR = fr => {
  let s = 0, n = 0;
  [fr.back, fr.front].forEach(g => g.forEach((row, y) => row.forEach((k, x) => {
    if (k === 'c' || k === 'd' || k === 'b') {
      if (y >= GB.FLOOR) return;
      s += Math.hypot(x - GB.CX, y - GB.CY); n++;
    }
  })));
  return n ? s / n : 0;
};
const rs = [1, 2, 3, 4].map(i => meanR(FAM_B[i]));
for (let i = 1; i < rs.length; i++) if (rs[i] >= rs[i - 1]) { console.error('INWARD FAIL', rs); vErr++; }
if (vErr) throw new Error('validation failed: ' + vErr);

// ================= SHEET CANVAS =================
const SW = 424, SH = 1004, SCALE = 4;
const G = Array.from({ length: SH }, () => Array(SW).fill(null));
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function paint(x, y, w, h, hex, a = 1) {
  const src = hex2rgb(hex);
  for (let yy = y; yy < y + h; yy++) {
    if (yy < 0 || yy >= SH) continue;
    for (let xx = x; xx < x + w; xx++) {
      if (xx < 0 || xx >= SW) continue;
      const dst = G[yy][xx] || [0x16, 0x13, 0x22];
      G[yy][xx] = a >= 1 ? src.slice() : [
        Math.round(dst[0] * (1 - a) + src[0] * a),
        Math.round(dst[1] * (1 - a) + src[1] * a),
        Math.round(dst[2] * (1 - a) + src[2] * a)];
    }
  }
}
function stampM(m, pal, ox, oy, opts = {}) {
  const { mir = false, tintFn = null } = opts;
  const mw = m[0].length;
  m.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
    const k = row[x]; if (k === '.' || k === ' ' || !pal[k]) continue;
    const px = mir ? ox + (mw - 1 - x) : ox + x;
    const hex = tintFn ? tintFn(k, x, y) : pal[k];
    if (hex) paint(px, oy + y, 1, 1, hex, 1);
  } });
}
const cellFrame = (x, y, w, h, bg = '#131020') => {
  paint(x, y, w, h, bg, 1);
  paint(x - 1, y - 1, w + 2, 1, '#2b2740', 1); paint(x - 1, y + h, w + 2, 1, '#2b2740', 1);
  paint(x - 1, y, 1, h, '#2b2740', 1); paint(x + w, y, 1, h, '#2b2740', 1);
};
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111111101101',
  N: '110101101101101', O: '010101101101010', P: '110101110100100', R: '110101110110101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010',
  W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '111001011001111',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101010101111', '9': '111101111001111', '.': '000000000000010', '-': '000000111000000',
  '+': '000010111010000',
};
function text(str, x, y, color = '#5d5675') {
  let cx = x;
  for (const ch of String(str).toUpperCase()) {
    if (ch === ' ') { cx += 4; continue; }
    const g = FONT[ch]; if (!g) { cx += 4; continue; }
    for (let i = 0; i < 15; i++) if (g[i] === '1') paint(cx + (i % 3), y + Math.floor(i / 3), 1, 1, color, 1);
    cx += 4;
  }
  return cx;
}
const HEADC = '#8d84a8', SUBC = '#4a4560';

// composite an effect frame (back + treated body + front) at sheet pos
function stampEffect(fr, dims, ox, oy, opts = {}) {
  stampM(fr.back, BOSS_PAL, ox, oy, opts);
  const bx = opts.mir ? ox + dims.W - dims.BX - 46 : ox + dims.BX;
  stampM(fr.body, BOSS_PAL, bx, oy + dims.BY, opts);
  stampM(fr.front, BOSS_PAL, ox, oy, opts);
}

// ---------- header + concept + palette ----------
text('RED ECLIPSE SYSTEM - BOSS ONLY - 3 FAMILIES - STRICT PIXEL ART', 3, 2, HEADC);
text('CONCEPT - BLACK-RED LIGHTNING + ECLIPSE PRESSURE. A RIDES THE WALK. B IMPLODES INTO', 3, 9);
text('THE BOSS ON GROUND CHARGE. C DETONATES OUTWARD IN THE AIR. NEVER GENERIC MAGIC.', 3, 15);
text('PALETTE LAW - BOSS KEYS ONLY - NO BLUR - NO GRADIENTS - NO GLOW CLOUDS - NO NEW COLORS', 3, 23, HEADC);
(() => {
  const keys = ['0', '1', '2', '4', 'g', 'h', 'a', 'b', 'c', 'd'];
  keys.forEach((k, i) => {
    const x = 3 + i * 22;
    cellFrame(x, 30, 18, 10, BOSS_PAL[k]);
    text(k, x + 7, 43, '#6d6488');
  });
  text('VOID', 5, 50); text('BODY GRAYS', 47, 50); text('DEEP CRIMSON', 91, 50); text('EMBER RAMP A-D', 143, 50);
  text('ARC RAMP ROLE - VOID SHEATH 0 - FILAMENT C - HOT KINKS D - BRANCH B - TIP A - ASH G+1', 3, 57);
})();

// ---------- FAMILY A band ----------
let Y = 67;
text('FAMILY A - STRIDE ECLIPSE - WALK TRIGGER REFINED - REAL 46X48 DROP-INS - INDEX-LOCKED', 3, Y, HEADC);
text('A-FWD - REPLACES SURGEFORWARD - 6F - RIDES WALKFORWARD - LOW - WEAPON LINE', 3, Y + 7);
const CELL = 48;
A_FWD.forEach((f, c) => {
  stampM(toGrid(f), BOSS_PAL, 3 + c * CELL, Y + 14);
  text(['F0 OMEN', 'F1 FLARE', 'F2 PEAK', 'F3 FLARE', 'F4 FRACT', 'F5 ASH'][c], 3 + c * CELL, Y + 63, SUBC);
});
// one-shot / no-interrupt visual note
(() => {
  const x = 296, y = Y + 14;
  text('ONE-SHOT', x, y, HEADC); text('60 TICKS', x, y + 6, HEADC);
  cellFrame(x, y + 13, 96, 8, '#100d1c');
  const seg = [[10, E0], [30, E1], [10, E2], [10, E1], [20, E0], [16, '#3a3346']];
  let sx = x + 2;
  seg.forEach(([w, col]) => { paint(sx, y + 16, w, 3, col, 1); sx += w; });
  text('OMEN FLARE FRACT ASH', x, y + 24, SUBC);
  text('PLAYS THROUGH - NEVER', x, y + 32);
  text('RE-TRIGGERS MID-FLARE', x, y + 38);
  text('STATE BREAK - CUT TO', x, y + 44);
  text('ASH - NO LINGER', x, y + 50);
})();
Y += 70;
text('A-BWD - REPLACES SURGEBACKWARD - 4F - RIDES WALKBACKWARD - HIGH - CROWN + SPINE', 3, Y);
A_BWD.forEach((f, c) => {
  stampM(toGrid(f), BOSS_PAL, 3 + c * CELL, Y + 7);
  text(['B0 OMEN', 'B1 PEAK', 'B2 FRACT', 'B3 ASH'][c], 3 + c * CELL, Y + 56, SUBC);
});
(() => {
  const x = 200, y = Y + 7;
  text('REFINED VS LIVE SURGE -', x, y, HEADC);
  text('1 RIM ENVELOPE 0-PEAK-0', x, y + 7);
  text('2 ONE ARC PACKET TRAVELS -', x, y + 13);
  text('  OLD SEGMENT DIES TO ASH', x, y + 19);
  text('3 OMEN PRE-GLINTS ANNOUNCE', x, y + 25);
  text('4 BLADE KEEPS EMBER MEMORY', x, y + 31);
  text('FWD ARCS - CHEST ARM BLADE GROUND', x, y + 40);
  text('BWD ARCS - CROWN SHOULDERS SPINE', x, y + 46);
  text('PLACEMENT DIFFERS BY DIRECTION', x, y + 52);
})();
Y += 64;

// ---------- FAMILY B band ----------
text('FAMILY B - INHALE ECLIPSE - GROUND CHARGED ATTACK - IMPLOSION - 84X62 EFFECT GRIDS', 3, Y, HEADC);
text('ENERGY CONVERGES INTO THE BOSS - FIXED SPOKES - SHRINKING RADIUS - TAILS TRAIL OUTWARD', 3, Y + 6);
Y += 13;
const BCW = 88;
function bCell(fr, ox, oy, label) {
  cellFrame(ox, oy, GB.W, GB.H, '#100d1c');
  paint(ox, oy + GB.FLOOR + 1, GB.W, 1, NF1, 1);
  stampEffect(fr, GB, ox, oy);
  text(label, ox, oy + GB.H + 3, SUBC);
}
FAM_B.slice(0, 4).forEach((fr, i) => bCell(fr, 3 + i * BCW, Y, fr.tag));
Y += GB.H + 10;
FAM_B.slice(4).forEach((fr, i) => bCell(fr, 3 + i * BCW, Y, fr.tag));
// motion map — INWARD
(() => {
  const ox = 3 + 3 * BCW, oy = Y;
  cellFrame(ox, oy, GB.W, GB.H, '#100d1c');
  stampM(FAM_B[4].body, BOSS_PAL, ox + GB.BX, oy + GB.BY, { tintFn: () => '#262a38' });
  const arrowIn = (a) => {
    const cx = ox + GB.CX, cy = oy + GB.CY;
    bres(Math.round(cx + Math.cos(a) * 27), Math.round(cy + Math.sin(a) * 27),
         Math.round(cx + Math.cos(a) * 12), Math.round(cy + Math.sin(a) * 12))
      .forEach(([x, y], i) => { if (i % 3 !== 2) paint(x, y, 1, 1, E1, 1); });
    paint(Math.round(cx + Math.cos(a) * 11), Math.round(cy + Math.sin(a) * 11), 2, 2, E3, 1);
  };
  [0, 1, 3, 4, 5, 7].forEach(i => arrowIn(SPOKES[i]));
  bres(ox + 10, oy + GB.FLOOR, ox + 26, oy + GB.FLOOR).forEach(([x, y], i) => { if (i % 3 !== 2) paint(x, y, 1, 1, E1, 1); });
  paint(ox + 27, oy + GB.FLOOR - 1, 2, 2, E3, 1);
  bres(ox + GB.W - 10, oy + GB.FLOOR, ox + GB.W - 26, oy + GB.FLOOR).forEach(([x, y], i) => { if (i % 3 !== 2) paint(x, y, 1, 1, E1, 1); });
  paint(ox + GB.W - 29, oy + GB.FLOOR - 1, 2, 2, E3, 1);
  text('MOTION MAP - ALL IN', ox, oy + GB.H + 3, HEADC);
})();
Y += GB.H + 10;
text('PHASES - VEIL 2F GATHER - INHALE 2F PULL - CRUSH 1F - BRIM 2F READY LOOP UNTIL RELEASE', 3, Y);
Y += 9;

// ---------- FAMILY C band ----------
text('FAMILY C - IGNITION ECLIPSE - AIR CHARGED ATTACK - OUTWARD STARBURST - 100X88 EFFECT GRIDS', 3, Y, HEADC);
text('REREF1 TRANSLATED - UMBRAL DISC CORE + HOT CORONA - STRAIGHT CRYSTAL RAYS - S RAY AIMS AT THE GROUND', 3, Y + 6);
Y += 13;
const CCW = 104;
function cCell(fr, ox, oy, label) {
  cellFrame(ox, oy, GC.W, GC.H, '#0d0a18');
  stampEffect(fr, GC, ox, oy);
  text(label, ox, oy + GC.H + 3, SUBC);
}
const cNotes = [
  ['GATHER - SHORT + TIGHT -', 'KERNEL AT THE CHEST -', 'NOT FAMILY B-S BIG RING -', 'CLOSE SHARDS DRIFT IN'],
  ['PEAK - RAYS ARE STRAIGHT', 'AND POINTED - BROKEN', 'OCTAGON NEVER A CIRCLE -', 'CORE IS A VOID DISC IN A', 'HOT CORONA - AN ECLIPSE'],
  ['DECAY - RAYS SHATTER INTO', 'BLACK-RED BOLTS - ASH', 'SINKS - ONE BOLT CRAWLS', 'OFF THE BODY - RESOLVES', 'CLEAN'],
];
for (let row = 0; row < 3; row++) {
  const frames = FAM_C.slice(row * 3, row * 3 + 3);
  frames.forEach((fr, i) => cCell(fr, 3 + i * CCW, Y, fr.tag));
  if (row === 2) {
    // motion map — OUTWARD (fills the empty 3rd slot)
    const ox = 3 + 2 * CCW, oy = Y;
    cellFrame(ox, oy, GC.W, GC.H, '#0d0a18');
    stampM(FAM_C[3].body, BOSS_PAL, ox + GC.BX, oy + GC.BY, { tintFn: () => '#262a38' });
    const arrowOut = (deg, r1) => {
      const a = deg * Math.PI / 180, cx = ox + GC.CX, cy = oy + GC.CY;
      bres(Math.round(cx + Math.cos(a) * 10), Math.round(cy + Math.sin(a) * 10),
           Math.round(cx + Math.cos(a) * r1), Math.round(cy + Math.sin(a) * r1))
        .forEach(([x, y], i) => { if (i % 3 !== 2) paint(x, y, 1, 1, E1, 1); });
      paint(Math.round(cx + Math.cos(a) * (r1 + 1)) - 1, Math.round(cy + Math.sin(a) * (r1 + 1)) - 1, 2, 2, E3, 1);
    };
    [[-90, 24], [0, 33], [180, 33], [-45, 17], [-135, 17], [45, 19], [135, 19]].forEach(([d, r]) => arrowOut(d, r));
    arrowOut(90, 52);
    text('MOTION MAP - ALL OUT', ox, oy + GC.H + 3, HEADC);
  }
  const nx = 3 + 3 * CCW + 4;
  text(['ROW 1 - GATHER', 'ROW 2 - PEAK', 'ROW 3 - DECAY'][row], nx, Y, HEADC);
  cNotes[row].forEach((ln, i) => text(ln, nx, Y + 8 + i * 6));
  Y += GC.H + 10;
}
text('PHASES - KERNEL CONDENSE GATHER - IGNITE CORONA SHIMMER PEAK - SHATTER BOLTFALL FADE DECAY', 3, Y);
text('CONTRACT - GROUND PULLS IN - AIR BURSTS OUT - WALK RIDES THE STRIDE - NEVER MIX THE THREE', 3, Y + 6, HEADC);
Y += 15;

// ---------- tableaus ----------
function nightRoom(ox, oy, w, h, floorRel) {
  cellFrame(ox, oy, w, h, NW0);
  for (let y = 2; y < floorRel - 2; y += 7)
    for (let x = (y % 14 === 2 ? 4 : 9); x < w - 4; x += 17) paint(ox + x, oy + y, 6, 1, NW1, 1);
  const slit = (sx) => {
    paint(ox + sx, oy + 6, 5, 26, '#141826', 1);
    paint(ox + sx + 1, oy + 8, 3, 22, '#1b2438', 1);
    paint(ox + sx + 2, oy + 10, 1, 5, WINL, 0.55); paint(ox + sx + 2, oy + 18, 1, 3, WINL, 0.35);
  };
  slit(Math.floor(w * 0.16)); slit(Math.floor(w * 0.72));
  paint(ox, oy + floorRel, w, 1, NF1, 1);
  paint(ox, oy + floorRel + 1, w, h - floorRel - 1, NF0, 1);
  return oy + floorRel;
}
// T1 + T2 — the walk family in play (fwd toward hero right / bwd glide mirrored, hero left)
text('TABLEAU A1 - FWD STRIDE ECLIPSE - HERO RIGHT', 3, Y, HEADC);
text('TABLEAU A2 - BWD GLIDE ECLIPSE - HERO LEFT - MIRRORED', 203, Y, HEADC);
(() => {
  const oy = Y + 7;
  let floorY = nightRoom(3, oy, 194, 70, 58);
  const bx = 3 + 52, by = floorY - 47;
  [[-8, 1], [-20, 1]].forEach(([dx, dy]) => paint(bx + 2 + dx, floorY + dy, 3, 1, '#0c0a12', 1));
  stampM(toGrid(A_FWD[2]), BOSS_PAL, bx, by);
  paint(bx + 2, floorY - 1, 2, 1, E2, 1);
  stampM(heroBase, HERO_PAL, 3 + 152, floorY - 23, { mir: true });
  floorY = nightRoom(203, oy, 194, 70, 58);
  const gx = 203 + 118, gy = floorY - 47;
  const gf = toGrid(A_BWD[1]);
  stampM(gf, BOSS_PAL, gx - 22, gy, { mir: true, tintFn: (k, x, y) => ((x + y) % 2 ? '#0c0a14' : null) });
  stampM(gf, BOSS_PAL, gx - 11, gy, { mir: true, tintFn: (k, x, y) => ((x + y) % 3 === 0 ? null : '#12101c') });
  stampM(gf, BOSS_PAL, gx, gy, { mir: true });
  stampM(heroBase, HERO_PAL, 203 + 22, floorY - 23);
})();
Y += 84;
// T3 — ground charge inhale; T4 — air ignition
text('TABLEAU B - GROUND CRUSH - HERO AT RANGE', 3, Y, HEADC);
text('TABLEAU C - AIR CORONA - S RAY AIMS AT THE GROUND', 193, Y, HEADC);
(() => {
  const oy = Y + 7;
  let floorY = nightRoom(3, oy, 184, 104, 92);
  stampEffect(FAM_B[4], GB, 3 + 34, floorY - 61);
  stampM(heroBase, HERO_PAL, 3 + 144, floorY - 23, { mir: true });
  floorY = nightRoom(193, oy, 204, 104, 94);
  stampEffect(FAM_C[3], GC, 193 + 60, oy + 3);
  stampM(heroBase, HERO_PAL, 193 + 20, floorY - 23);
})();
Y += 120;

// ---------- handoff notes ----------
text('HANDOFF NOTES', 3, Y, HEADC); Y += 8;
[
  'A - REPLACES SURGEFORWARD 6F + SURGEBACKWARD 4F IN BOSS REDESIGN SPRITES - SAME POSES -',
  '    INDEX-LOCKED TO RUN 6 + RETREAT 4 - 2.5S SCHEDULER + INTERRUPT RESET UNCHANGED - 10 TICKS PER FWD',
  '    FRAME - 15 PER BWD FRAME - ONE-SHOT - PLAYS THROUGH - STATE BREAK CUTS TO ASH INSTANTLY',
  'B - EFFECT KEY-GRIDS 84X62 - BOSS ORIGIN 19.14 - CORE 39.29 - FLOOR ROW 60 - BACK GRID BEHIND THE',
  '    SPRITE - FRONT GRID OVER IT - BODY RE-SKIN IS FAMILY A ECLIPSESKIN - PORT AS A SPRITEMANAGER',
  '    STATIC AT THE WANDGLOW SEAM - GROUND LASER BEAM ITSELF UNTOUCHED - HOLDS - VEIL 8 INHALE 6',
  '    CRUSH 6 THEN BRIM A-B LOOP 8 EACH UNTIL RELEASE',
  'C - EFFECT KEY-GRIDS 100X88 - BOSS ORIGIN 27.14 - CORE 47.29 - BACK BEHIND - FRONT OVER - PORT AT',
  '    THE DRAWCHARGEDAIRAURA + DRAWCHARGEREADYAURA SEAMS - GATHER ON HOLD - CORONA + SHIMMER LOOP',
  '    WHILE CHARGE READY - SHATTER TO FADE ON RELEASE INTO THE DIVE - HOLDS - 6 6 4 5 5 5 6 8',
  'SIGNATURE MOTION - A - ARC PACKET TRAVELS ON THE BODY - B - FIXED SPOKES + SHRINKING RADIUS +',
  '    OUTWARD TAILS - AN INHALE - C - STRAIGHT CRYSTAL RAYS OUT + BOLT DECAY - A DETONATION',
  'AFK VOID-FRACTURE ARCS STAY AFK-ONLY - NEVER REUSE THEM FOR THESE FAMILIES - NO HITBOXES -',
  '    ALL THREE FAMILIES ARE RENDER-ONLY - NO GAMEPLAY OR TIMING CHANGES',
].forEach(ln => { text(ln, 3, Y); Y += 6; });

if (Y > SH - 4) throw new Error('layout overflow: ' + Y);

// ================= PNG writer (house idiom) =================
function crc32(buf){let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}
  let crc=0xFFFFFFFF;for(const b of buf)crc=t[(crc^b)&0xFF]^(crc>>>8);return(crc^0xFFFFFFFF)>>>0;}
function chunk(type,data){const t=Buffer.from(type,'ascii');const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
const IW=SW*SCALE, IH=SH*SCALE, raw=Buffer.alloc(IH*(1+IW*4));
for(let y=0;y<IH;y++){const row=y*(1+IW*4);raw[row]=0;
  for(let x=0;x<IW;x++){const c=G[Math.floor(y/SCALE)][Math.floor(x/SCALE)];const o=row+1+x*4;
    if(!c){const dk=((Math.floor(x/20)+Math.floor(y/20))%2)===0;raw[o]=dk?0x16:0x1a;raw[o+1]=dk?0x13:0x17;raw[o+2]=dk?0x22:0x27;raw[o+3]=255;}
    else{raw[o]=c[0];raw[o+1]=c[1];raw[o+2]=c[2];raw[o+3]=255;}}}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(IW,0);ihdr.writeUInt32BE(IH,4);ihdr[8]=8;ihdr[9]=6;
fs.writeFileSync(__dirname+'/eclipse_v1.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---------- literal dump ----------
let js = '// === RED ECLIPSE SYSTEM literals (see eclipse_spec.md) ===\n';
js += '// FAMILY A: 46x48 drop-ins replacing surgeForward/surgeBackward in BOSS_REDESIGN_SPRITES.\n';
js += '// FAMILY B: 84x62 effect grids (back/front) — boss origin (19,14), core (39,29), floor row 60.\n';
js += '// FAMILY C: 100x88 effect grids (back/front) — boss origin (27,14), core (47,29).\n';
js += '// Effect grids are RENDER-ONLY overlays: back behind the sprite, front over it.\n';
js += '// The per-frame body re-skin = eclipseSkin/darkenStep in eclipse_gen.js (family-shared).\n';
for (const [n, frames] of [['surgeForward', A_FWD], ['surgeBackward', A_BWD]]) {
  js += `  ${n}: [\n`;
  for (const f of frames) js += '    [' + f.map(r => JSON.stringify(r)).join(', ') + '],\n';
  js += '  ],\n';
}
const dumpFx = (name, fam) => {
  js += `  ${name}: [\n`;
  fam.forEach(fr => {
    js += `    // ${fr.tag}\n`;
    js += '    { back: [' + stringify(fr.back).map(r => JSON.stringify(r)).join(', ') + '],\n';
    const fEmpty = fr.front.every(r => r.every(k => k === '.'));
    js += '      front: ' + (fEmpty ? '[]' : '[' + stringify(fr.front).map(r => JSON.stringify(r)).join(', ') + ']') + ' },\n';
  });
  js += '  ],\n';
};
dumpFx('eclipseInhale', FAM_B);
dumpFx('eclipseIgnition', FAM_C);
fs.writeFileSync(__dirname + '/eclipse_literal.txt', js);

console.log('wrote eclipse_v1.png', IW + 'x' + IH,
  '| A fwd', A_FWD.length, 'bwd', A_BWD.length,
  '| B frames', FAM_B.length, 'meanR B1-B4', rs.map(r => r.toFixed(1)).join(' '),
  '| C frames', FAM_C.length, '| layout end Y', Y);
