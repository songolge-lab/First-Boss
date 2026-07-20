// HERO LIGHT ECLIPSE — reusable white+gold VFX family (concept, nothing wired).
// The Hero's counterpart to the boss RED ECLIPSE system: where the boss carries a
// void disc inside a hot ember corona, the Hero carries a WHITE disc inside a GOLD
// corona — a light eclipse. Strict pixel art: hard cells, no blur, no gradients,
// no glow clouds, and ZERO BLUE (the effect ramp is white -> ivory -> gold only).
//
//   EMBLEM    — the core Light Eclipse motif: white core disc, ivory separation
//               ring, gold corona, straight tapered rays (cardinal long, diagonal
//               short), broken outer dash halo, cross-sparks. Sacred geometry:
//               true circles and clean radial symmetry (the boss NEVER gets a
//               circle; the Hero owns them).
//   HALO      — clean ring variant (snap / settle / shimmer) + a flat GROUND
//               HALO ellipse for charged / cast moments.
//   SLASH     — sword-combo accent crescent. Rhythm from the sword-attack
//               reference: edge GLINT (anticipation) -> SHEAR (partial smear) ->
//               HIT (full crescent, HOLD THIS FRAME) -> FOLLOW-THROUGH (broken
//               trail + rising motes).
//   IMPACT    — compact 4-point star flare for hit moments.
//   CYCLE     — the family grammar: GATHER (motes converge, ring contracts) ->
//               IGNITE (white kernel) -> RELEASE (full starburst, loopable) ->
//               DISSOLVE (rays peel, motes RISE and wink out; light never ashes).
//   BODYFLARE — body-centered eclipse on the real 30x24 Dawnguard Knight
//               (back/front effect grids + a radiant body re-skin; the body goes
//               BRIGHTER with a broken gold rim — the inverse of eclipseSkin).
//
// Emits: hero_eclipse_v1.png (sheet) + hero_eclipse_literal.txt (drop-in grids).
const fs = require('fs');
const zlib = require('zlib');

// ---------- palettes ----------
// LIGHT ECLIPSE ramp (locked). Warm law: every color has R >= G >= B (no blue can
// exist). 'G' deep gold === the hero sprite's own gold key (#c9962e) and 'u'
// bronze === the throne-room gold-dark (#8a6420), so the family is anchored to
// golds already living in the game.
const LIGHT = {
  'W': '#fffdf4',   // white core / glints
  'I': '#f2e6bf',   // ivory transition / motes
  'y': '#f2c94e',   // radiant gold / corona / ray body
  'o': '#e0a93c',   // warm gold / ray outer / teeth
  'G': '#c9962e',   // deep gold / tips / rim winks (== hero key g)
  'u': '#8a6420',   // bronze / dissolve motes / rare dark edge (== env gold dark)
};
const HERO_PAL = {
  '0': '#10141e', '1': '#2e3444', '2': '#4a5468', '3': '#7c88a0', '4': '#aeb9cc', '5': '#e2e8f2',
  'n': '#141c30', 'm': '#1c2438', 'l': '#7fd4ff', 'L': '#b8ecff', 'g': '#c9962e',
};
const BOSS_PAL = {
  '0': '#08080c', '1': '#12121a', '2': '#1c1d28', '3': '#2a2c3a', '4': '#3d4052', '5': '#565c74',
  'a': '#6e0f1c', 'b': '#a8182a', 'c': '#e0263a', 'd': '#ff5a4a', 'g': '#3a1014', 'h': '#571820',
};
const NW0 = '#191622', NW1 = '#1d1a28', NF0 = '#221c2b', NF1 = '#3a3346';
const WINL = '#6c82a8';

// ---------- load approved art from the literal artifacts ----------
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
const heroBase = fs.readFileSync(__dirname + '/hero_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
const HW = heroBase[0].length, HH = heroBase.length;          // 30 x 24
const HERO_ANIM = loadClips('hero_anim_literal.txt', ['attack', 'cast']);
const BOSS_IDLE = loadClips('walk2_literal.txt', ['idle']).idle;

const toGrid = f => f.map(r => r.split(''));
const stringify = g => g.map(r => r.join(''));

// ---------- grid helpers ----------
const mkGrid = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const put = (g, x, y, k) => {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = k;
};
const rnd = (i, s) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
function disc(g, cx, cy, r, k) {
  for (let y = Math.ceil(cy - r); y <= cy + r; y++)
    for (let x = Math.ceil(cx - r); x <= cx + r; x++)
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r + 0.01) put(g, x, y, k);
}
// 1px circle ring. dash = total on/off segments around the circle (even count);
// arcFrom/arcTo limit by atan2 angle (canvas coords: -PI..PI, negative = above).
function ringC(g, cx, cy, r, k, opts = {}) {
  const { dash = 0, phase = 0, arcFrom = -Math.PI - 0.01, arcTo = Math.PI + 0.01 } = opts;
  const steps = Math.max(16, Math.ceil(Math.PI * 2 * r * 1.5));   // angle-stepped: no gaps
  for (let i = 0; i < steps; i++) {
    const a = -Math.PI + i / steps * 2 * Math.PI;
    if (a < arcFrom || a > arcTo) continue;
    if (dash) { const seg = Math.floor(((a + Math.PI) / (2 * Math.PI)) * dash + phase); if (((seg % 2) + 2) % 2) continue; }
    put(g, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), k);
  }
}
function ellipseRing(g, cx, cy, rx, ry, k, opts = {}) {
  const { dash = 0, phase = 0 } = opts;
  const steps = Math.ceil(Math.PI * 2 * rx);
  for (let i = 0; i < steps; i++) {
    const a = i / steps * 2 * Math.PI;
    if (dash) { const seg = Math.floor(a / (2 * Math.PI) * dash + phase); if (((seg % 2) + 2) % 2) continue; }
    put(g, Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a)), k);
  }
}
// straight rays on the 8 clean axes only — perfect symmetry by construction.
// dir = [sx, sy] with sx/sy in {-1,0,1}. 3px base tapering to 1px, colors walk
// the ramp core -> tip. tip = detached white glint 2 cells past the end.
function axisRay(g, cx, cy, dir, r0, r1, ramp, opts = {}) {
  const { tip = false, wide = true } = opts;
  for (let r = r0; r <= r1; r++) {
    const t = (r - r0) / Math.max(1, r1 - r0);
    const ki = Math.min(ramp.length - 1, Math.floor(t * ramp.length));
    const x = cx + dir[0] * r, y = cy + dir[1] * r;
    put(g, x, y, ramp[ki]);
    if (wide && t < 0.32) {
      const k2 = ramp[Math.min(ramp.length - 1, ki + 1)];
      put(g, x + Math.abs(dir[1]), y + Math.abs(dir[0]), k2);
      put(g, x - Math.abs(dir[1]), y - Math.abs(dir[0]), k2);
    }
  }
  if (tip) put(g, cx + dir[0] * (r1 + 2), cy + dir[1] * (r1 + 2), 'W');
}
// classic sacred cross-spark: white heart + gold arms.
function spark(g, x, y, s = 1, core = 'W', arm = 'y') {
  put(g, x, y, core);
  for (let i = 1; i <= s; i++) { put(g, x + i, y, arm); put(g, x - i, y, arm); put(g, x, y + i, arm); put(g, x, y - i, arm); }
}
// enforce perfect horizontal symmetry (right half wins) — sacred geometry law.
function mirrorH(g) {
  const w = g[0].length;
  for (let y = 0; y < g.length; y++)
    for (let x = 0; x < Math.floor(w / 2); x++) g[y][x] = g[y][w - 1 - x];
  return g;
}

// =====================================================================
// EMBLEM — the core Light Eclipse motif (41x41, center 20,20)
// =====================================================================
const EC = 20;
function emblemFrame() {
  const g = mkGrid(41, 41);
  ringC(g, EC, EC, 19, 'G', { dash: 20, phase: 0.5 });               // broken outer dash halo
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d =>                    // long cardinal rays
    axisRay(g, EC, EC, d, 8, 16, ['W', 'I', 'y', 'o', 'G'], { tip: true }));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(d => {                // short diagonal rays
    axisRay(g, EC, EC, d, 6, 10, ['y', 'o', 'G'], { wide: false });
    put(g, EC + d[0] * 12, EC + d[1] * 12, 'G');                     // detached diagonal tip
  });
  ringC(g, EC, EC, 6, 'y');                                          // gold corona ring
  ringC(g, EC, EC, 4.5, 'I');                                        // ivory separation
  disc(g, EC, EC, 3.1, 'W');                                         // WHITE core disc
  [[14, 6], [-14, 6], [14, -6], [-14, -6]].forEach(([dx, dy]) =>     // cross-sparks between rays
    spark(g, EC + dx, EC + dy, 1));
  [[6, 14], [-6, 14], [6, -14], [-6, -14]].forEach(([dx, dy]) =>     // ivory sparkle breakup
    put(g, EC + dx, EC + dy, 'I'));
  return mirrorH(g);
}
// micro glyph — the emblem compressed to 13x13 for tiny accents (projectiles,
// HUD ticks, charge pips).
function emblemMicro() {
  const g = mkGrid(13, 13), c = 6;
  disc(g, c, c, 1.1, 'W');
  ringC(g, c, c, 3, 'y', { dash: 8, phase: 0.5 });
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => put(g, c + d[0] * 5, c + d[1] * 5, 'W'));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(d => put(g, c + d[0] * 4, c + d[1] * 4, 'o'));
  return mirrorH(g);
}

// =====================================================================
// HALO — ring variant (33x33, center 16,16) + GROUND HALO (41x13)
// =====================================================================
const HC = 16;
function haloFrames() {
  const out = [];
  // H0 SNAP — tight bright ring, white cardinal nodes, inner ivory hint
  let g = mkGrid(33, 33);
  ringC(g, HC, HC, 8, 'y');
  ringC(g, HC, HC, 6, 'I', { dash: 12, phase: 0.5 });
  [[0, -8], [0, 8], [-8, 0], [8, 0]].forEach(([dx, dy]) => put(g, HC + dx, HC + dy, 'W'));
  put(g, HC, HC - 10, 'W'); put(g, HC, HC + 10, 'W');                // snap ticks N + S
  out.push(mirrorH(g));
  // H1 SETTLE — ring expands to rest radius, underside darkens, diagonal drips
  g = mkGrid(33, 33);
  ringC(g, HC, HC, 10, 'y');
  ringC(g, HC, HC, 10, 'o', { arcFrom: Math.PI * 0.3, arcTo: Math.PI * 0.7 }); // bottom arc heavier
  [[0, -10], [0, 10], [-10, 0], [10, 0]].forEach(([dx, dy]) => put(g, HC + dx, HC + dy, 'W'));
  [[8, 8], [-8, 8], [8, -8], [-8, -8]].forEach(([dx, dy]) => put(g, HC + dx, HC + dy, 'G'));
  out.push(mirrorH(g));
  // H2 SHIMMER — ring breaks into marching gold/warm dashes, nodes wink, motes rise
  g = mkGrid(33, 33);
  ringC(g, HC, HC, 10, 'y', { dash: 18, phase: 0 });
  ringC(g, HC, HC, 10, 'o', { dash: 18, phase: 1 });
  put(g, HC, HC - 10, 'W'); put(g, HC, HC + 10, 'W');
  put(g, HC - 10, HC, 'I'); put(g, HC + 10, HC, 'I');
  put(g, HC - 4, HC - 13, 'I'); put(g, HC + 4, HC - 14, 'I');        // rising motes
  out.push(mirrorH(g));
  return out;
}
const GH = { W: 41, H: 13, CX: 20, CY: 6, RX: 18, RY: 4 };
function groundHaloFrames() {
  const out = [];
  let g = mkGrid(GH.W, GH.H);
  ellipseRing(g, GH.CX, GH.CY, GH.RX, GH.RY, 'y');
  ellipseRing(g, GH.CX, GH.CY, 13, 2.5, 'I', { dash: 10, phase: 0.5 });
  put(g, GH.CX - GH.RX, GH.CY, 'W'); put(g, GH.CX + GH.RX, GH.CY, 'W');
  [[-6, -3], [6, -3], [0, -4]].forEach(([dx, dy]) => put(g, GH.CX + dx, GH.CY + dy, 'o'));
  out.push(g);
  g = mkGrid(GH.W, GH.H);
  ellipseRing(g, GH.CX, GH.CY, GH.RX, GH.RY, 'y', { dash: 14, phase: 0 });
  ellipseRing(g, GH.CX, GH.CY, GH.RX, GH.RY, 'o', { dash: 14, phase: 1 });
  ellipseRing(g, GH.CX, GH.CY, 13, 2.5, 'I', { dash: 10, phase: 1.5 });
  put(g, GH.CX, GH.CY - GH.RY, 'W'); put(g, GH.CX, GH.CY + GH.RY, 'W');
  [[-7, -4], [7, -4], [0, -5]].forEach(([dx, dy]) => put(g, GH.CX + dx, GH.CY + dy, 'I'));
  out.push(g);
  return out;
}

// =====================================================================
// SLASH — sword-combo accent crescent (37x37), travel = RIGHT (author space)
// =====================================================================
// Anatomy per row (right = leading/convex side): W leading edge / I body /
// y inner edge / o trailing rim (belly rows) / sparse G outer trail.
function slashCrescent(g, opts = {}) {
  const { rows = [4, 32], dim = 0, broken = false, ox = 0, oy = 0 } = opts;
  const RAMP = dim ? { W: 'I', I: 'y', y: 'o', o: 'G', G: 'u' } : {};
  const K = k => RAMP[k] || k;
  for (let y = 4; y <= 32; y++) {
    if (y < rows[0] || y > rows[1]) continue;
    if (broken && (y % 5 < 2)) continue;                             // follow-through gaps
    const t = (y - 4) / 28 * Math.PI, s = Math.sin(t);
    const xo = 18 + Math.round(12 * s);                              // bulge right
    const wdt = Math.max(1, Math.round(1 + 3.5 * s));
    put(g, ox + xo, oy + y, K(wdt > 1 ? 'W' : 'I'));                 // leading edge
    for (let i = 1; i < wdt - 1; i++) put(g, ox + xo - i, oy + y, K('I'));
    if (wdt > 1) put(g, ox + xo - wdt + 1, oy + y, K('y'));          // inner edge
    if (y >= 14 && y <= 22) {
      put(g, ox + xo - wdt, oy + y, K('o'));                         // belly trailing rim
      if (rnd(y, 3) < 0.5) put(g, ox + xo - wdt - 1, oy + y, K('G'));
    }
  }
}
function slashFrames() {
  const out = [];
  // S0 GLINT — anticipation: the raised edge catches the light. No smear yet.
  let g = mkGrid(37, 37);
  [[24, 9], [25, 8], [26, 7], [27, 6]].forEach(([x, y]) => put(g, x, y, 'W'));
  put(g, 23, 10, 'y'); put(g, 28, 5, 'y');
  spark(g, 30, 9, 1);
  put(g, 21, 13, 'I');
  out.push(g);
  // S1 SHEAR — top 55% of the smear revealed, edge hot
  g = mkGrid(37, 37);
  slashCrescent(g, { rows: [4, 19] });
  put(g, 32, 19, 'W'); put(g, 33, 20, 'I');                          // live smear head
  put(g, 24, 3, 'y');                                                // spray off the tip
  out.push(g);
  // S2 HIT — full crescent. HOLD THIS FRAME (impact weight).
  g = mkGrid(37, 37);
  slashCrescent(g);
  put(g, 19, 2, 'W'); put(g, 19, 34, 'W');                           // detached tip glints
  spark(g, 33, 18, 1);                                               // contact spark on the belly
  put(g, 12, 10, 'y'); put(g, 11, 26, 'y');                          // trailing speed ticks
  out.push(g);
  // S3 FOLLOW — smear breaks into trail bands one step dimmer; motes RISE
  g = mkGrid(37, 37);
  slashCrescent(g, { dim: 1, broken: true });
  [[30, 6], [26, 3]].forEach(([x, y]) => put(g, x, y, 'I'));
  [[22, 5], [31, 12]].forEach(([x, y]) => put(g, x, y, 'G'));
  [[27, 1], [18, 8]].forEach(([x, y]) => put(g, x, y, 'u'));
  out.push(g);
  return out;
}

// =====================================================================
// IMPACT — compact 4-point star flare (21x21, center 10,10)
// =====================================================================
const PC = 10;
function impactFrames() {
  const out = [];
  // P0 FLASH — white pop
  let g = mkGrid(21, 21);
  disc(g, PC, PC, 2.1, 'W');
  ringC(g, PC, PC, 3.4, 'I');
  [[0, -5], [0, 5], [-5, 0], [5, 0]].forEach(([dx, dy]) => put(g, PC + dx, PC + dy, 'W'));
  out.push(mirrorH(g));
  // P1 STAR — the 4-point star (the hit-effect starbursts from the reference)
  g = mkGrid(21, 21);
  disc(g, PC, PC, 1.4, 'W');
  ringC(g, PC, PC, 4.5, 'y', { dash: 10, phase: 0.5 });
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
    axisRay(g, PC, PC, d, 2, 7, ['W', 'y', 'o']);
    put(g, PC + d[0] * 9, PC + d[1] * 9, 'G');
  });
  [[3, 3], [-3, 3], [3, -3], [-3, -3]].forEach(([dx, dy]) => put(g, PC + dx, PC + dy, 'o'));
  out.push(mirrorH(g));
  // P2 SPARK-OUT — star gone; detached tips drift out, sparks rise
  g = mkGrid(21, 21);
  put(g, PC, PC, 'W');
  [[0, -7], [0, 7], [-7, 0], [7, 0]].forEach(([dx, dy]) => put(g, PC + dx, PC + dy, 'o'));
  [[0, -9], [0, 9], [-9, 0], [9, 0]].forEach(([dx, dy]) => put(g, PC + dx, PC + dy, 'G'));
  spark(g, PC - 5, PC - 4, 1, 'I', 'o'); spark(g, PC + 5, PC - 4, 1, 'I', 'o');
  put(g, PC - 3, PC - 7, 'u'); put(g, PC + 3, PC - 7, 'u');
  out.push(mirrorH(g));
  return out;
}

// =====================================================================
// CYCLE — gather / ignite / release / dissolve (45x45, center 22,22)
// =====================================================================
const CC = 22;
const SP8 = [0, 45, 90, 135, 180, 225, 270, 315].map(d => d * Math.PI / 180);
function cycleMote(g, a, r, head, tail1, tail2) {
  const R = Math.round;
  put(g, R(CC + Math.cos(a) * r), R(CC + Math.sin(a) * r), head);
  if (tail1) put(g, R(CC + Math.cos(a) * (r + 1.7)), R(CC + Math.sin(a) * (r + 1.7)), tail1);
  if (tail2) put(g, R(CC + Math.cos(a) * (r + 3.2)), R(CC + Math.sin(a) * (r + 3.2)), tail2);
}
function cycleFrames() {
  const out = [], tag = [];
  // G0 GATHER-A — motes appear far out on fixed spokes, heads pointing in
  let g = mkGrid(45, 45);
  put(g, CC, CC, 'o');
  SP8.forEach(a => cycleMote(g, a, 16, 'y', 'G', 'u'));
  ringC(g, CC, CC, 14, 'G', { dash: 28, phase: 0.5 });
  out.push(g); tag.push('G0 GATHER');
  // G1 GATHER-B — everything closer, tails longer (speed), kernel forming
  g = mkGrid(45, 45);
  disc(g, CC, CC, 1.1, 'I');
  SP8.forEach(a => cycleMote(g, a, 9, 'I', 'y', 'G'));
  ringC(g, CC, CC, 9.5, 'G', { dash: 24, phase: 0 });
  out.push(g); tag.push('G1 GATHER');
  // I0 IGNITE — white kernel flash, ray stubs, last motes about to merge
  g = mkGrid(45, 45);
  disc(g, CC, CC, 2.1, 'W');
  ringC(g, CC, CC, 3.2, 'I');
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => axisRay(g, CC, CC, d, 4, 7, ['W', 'I', 'y'], { wide: false }));
  [SP8[1], SP8[3], SP8[5], SP8[7]].forEach(a => cycleMote(g, a, 5, 'W'));
  out.push(g); tag.push('I0 IGNITE');
  // R0 RELEASE — the full light eclipse bursts open
  g = mkGrid(45, 45);
  disc(g, CC, CC, 3.1, 'W');
  ringC(g, CC, CC, 4.5, 'I');
  ringC(g, CC, CC, 6, 'y');
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => axisRay(g, CC, CC, d, 8, 15, ['W', 'I', 'y', 'o', 'G'], { tip: true }));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(d => axisRay(g, CC, CC, d, 6, 9, ['y', 'o', 'G'], { wide: false }));
  ringC(g, CC, CC, 18, 'G', { dash: 22, phase: 0.5 });
  spark(g, CC - 13, CC - 6, 1); spark(g, CC + 13, CC - 6, 1);
  out.push(mirrorH(g)); tag.push('R0 RELEASE');
  // R1 SHIMMER — held peak: tips extend, dash halo marches, sparks move (loop R0-R1)
  g = mkGrid(45, 45);
  disc(g, CC, CC, 3.1, 'W');
  ringC(g, CC, CC, 4.5, 'I');
  ringC(g, CC, CC, 6, 'y');
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => axisRay(g, CC, CC, d, 8, 16, ['W', 'I', 'y', 'o', 'G'], { tip: true }));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(d => axisRay(g, CC, CC, d, 6, 10, ['y', 'o', 'G'], { wide: false }));
  ringC(g, CC, CC, 18, 'G', { dash: 22, phase: 1.5 });
  spark(g, CC - 6, CC - 14, 1); spark(g, CC + 6, CC - 14, 1);
  put(g, CC - 15, CC + 9, 'I'); put(g, CC + 15, CC + 9, 'I');
  out.push(mirrorH(g)); tag.push('R1 SHIMMER');
  // D0 DISSOLVE-A — rays peel off the core and detach; corona breaks
  g = mkGrid(45, 45);
  disc(g, CC, CC, 2.1, 'I');
  ringC(g, CC, CC, 6, 'y', { dash: 14, phase: 0.5 });
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => axisRay(g, CC, CC, d, 11, 14, ['o', 'G'], { wide: false }));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(d => put(g, CC + d[0] * 8, CC + d[1] * 8, 'G'));
  spark(g, CC - 10, CC - 10, 1, 'I', 'o');
  out.push(g); tag.push('D0 DISSOLVE');
  // D1 DISSOLVE-B — fragments become motes and RISE (light lifts, never sinks)
  g = mkGrid(45, 45);
  put(g, CC, CC, 'W');
  ringC(g, CC, CC, 6, 'G', { dash: 8, phase: 0.5, arcFrom: -Math.PI, arcTo: 0 });
  SP8.forEach((a, i) => {
    const r = 12 + (i % 3);
    put(g, Math.round(CC + Math.cos(a) * r), Math.round(CC + Math.sin(a) * r) - 2, i % 2 ? 'G' : 'u');
  });
  spark(g, CC, CC - 15, 1, 'I', 'G');
  out.push(g); tag.push('D1 RISE');
  // D2 DISSOLVE-C — last few motes high above, single ivory wink
  g = mkGrid(45, 45);
  [[-8, -12], [7, -14], [-3, -17], [12, -9], [-13, -7]].forEach(([dx, dy]) =>
    put(g, CC + dx, CC + dy, 'u'));
  put(g, CC + 2, CC - 19, 'G');
  put(g, CC - 5, CC - 15, 'I');
  out.push(g); tag.push('D2 FADE');
  return { frames: out, tags: tag };
}

// =====================================================================
// BODYFLARE — body-centered light eclipse on the real Dawnguard Knight
// =====================================================================
// Effect grids 48x36 (back BEHIND the sprite, front OVER it). Hero origin at
// grid (9,8) so the grid center col (23.5) == hero center col — the existing
// aimDir mirror self-anchors the whole effect (same scheme as the boss RE
// families). Chest core at grid (22,18) == hero chest (13,10). Feet row 31.
const BF = { W: 48, H: 36, HX: 9, HY: 8, CX: 22, CY: 18, FEET: 31 };
// radiant body re-skin — the INVERSE of the boss eclipseSkin: the body steps
// one ramp BRIGHTER (palette-only, geometry can never desync), the hero's own
// cold accents pulse ('l'->'L', the approved breath idiom), and the silhouette
// contour winks a BROKEN GOLD rim using the hero's own gold key 'g'.
const BRIGHT1 = { '0': '1', '1': '2', '2': '3', '3': '4', '4': '5', '5': '5',
                  'n': 'm', 'm': 'm', 'l': 'L', 'L': 'L', 'g': 'g' };
function radiantSkin(gIn, seed, rim) {
  const out = gIn.map(r => r.map(k => (k === '.' ? '.' : (BRIGHT1[k] || k))));
  for (let y = 0; y < out.length; y++) {
    let lo = -1, hi = -1;
    for (let x = 0; x < out[0].length; x++) if (out[y][x] !== '.') { if (lo < 0) lo = x; hi = x; }
    if (lo < 0) continue;
    if (rnd(y, seed) < rim * 0.85) out[y][lo] = 'g';
    if (rnd(y, seed + 4) < rim * 0.85) out[y][hi] = 'g';
  }
  return out;
}
function bodyFlareFrames() {
  const frames = [];
  const gatherSpokes = [0, 180, 225, 270, 315].map(d => d * Math.PI / 180); // sides + above
  const moteAt = (g, a, r, head, tail1, tail2) => {
    const R = Math.round;
    put(g, R(BF.CX + Math.cos(a) * r), R(BF.CY + Math.sin(a) * r), head);
    if (tail1) put(g, R(BF.CX + Math.cos(a) * (r + 1.7)), R(BF.CY + Math.sin(a) * (r + 1.7)), tail1);
    if (tail2) put(g, R(BF.CX + Math.cos(a) * (r + 3.2)), R(BF.CY + Math.sin(a) * (r + 3.2)), tail2);
  };
  // BF0 GATHER — light drawn to the chest sigil from the sides and above
  let back = mkGrid(BF.W, BF.H), front = mkGrid(BF.W, BF.H);
  gatherSpokes.forEach(a => moteAt(back, a, 12, 'y', 'G', 'u'));
  ringC(back, BF.CX, BF.CY, 10, 'G', { dash: 26, phase: 0.5 });
  put(front, BF.CX, BF.CY, 'W');
  put(front, BF.CX + 1, BF.CY - 1, 'I'); put(front, BF.CX - 1, BF.CY + 1, 'I');
  frames.push({ back, front, body: radiantSkin(heroBase, 11, 0.35), tag: 'BF0 GATHER' });
  // BF1 PEAK — halo ring + ASCENSION rays (north longest: light rises; the exact
  // inverse of the boss air eclipse where the SOUTH ray aims at the ground)
  back = mkGrid(BF.W, BF.H); front = mkGrid(BF.W, BF.H);
  ringC(back, BF.CX, BF.CY, 13, 'y');
  [[0, -13], [0, 13], [-13, 0], [13, 0]].forEach(([dx, dy]) => put(back, BF.CX + dx, BF.CY + dy, 'W'));
  axisRay(back, BF.CX, BF.CY, [0, -1], 6, 15, ['W', 'I', 'y', 'o'], { tip: true });   // N — longest
  axisRay(back, BF.CX, BF.CY, [1, 0], 6, 11, ['I', 'y', 'o'], { wide: false });
  axisRay(back, BF.CX, BF.CY, [-1, 0], 6, 11, ['I', 'y', 'o'], { wide: false });
  axisRay(back, BF.CX, BF.CY, [0, 1], 6, 8, ['y', 'o'], { wide: false });             // S stub only
  [[1, -1], [-1, -1]].forEach(d => axisRay(back, BF.CX, BF.CY, d, 5, 8, ['y', 'o', 'G'], { wide: false }));
  ringC(back, BF.CX, BF.CY - 2, 16, 'G', { dash: 24, phase: 0.5 }); // outer dash halo, lifted (ascension)
  spark(back, BF.CX - 10, BF.CY - 8, 1); spark(back, BF.CX + 10, BF.CY - 8, 1);
  disc(front, BF.CX, BF.CY, 2.1, 'W');                               // white chest core OVER the body
  ringC(front, BF.CX, BF.CY, 3.4, 'I');
  [[4, 4], [-4, 4], [4, -4], [-4, -4]].forEach(([dx, dy]) => put(front, BF.CX + dx, BF.CY + dy, 'o'));
  [[-9, 0], [-5, 0], [-2, 0], [2, 0], [5, 0], [9, 0]].forEach(([dx], i) =>            // ground sparkle
    put(front, BF.CX + dx, BF.FEET + 1 + (i % 2), i % 2 ? 'o' : 'y'));
  frames.push({ back, front, body: radiantSkin(heroBase, 23, 1), tag: 'BF1 PEAK' });
  // BF2 DISSOLVE — ring fragments and motes RISE off the crown
  back = mkGrid(BF.W, BF.H); front = mkGrid(BF.W, BF.H);
  ringC(back, BF.CX, BF.CY - 2, 13, 'G', { dash: 10, phase: 0.5, arcFrom: -Math.PI, arcTo: 0 });
  axisRay(back, BF.CX, BF.CY, [0, -1], 10, 13, ['o', 'G'], { wide: false });          // peeled N remnant
  [[-4, -12], [5, -14], [-8, -9], [8, -10]].forEach(([dx, dy]) => put(back, BF.CX + dx, BF.CY + dy, 'I'));
  [[-2, -16], [3, -17], [-6, -6], [7, -7]].forEach(([dx, dy]) => put(back, BF.CX + dx, BF.CY + dy, 'G'));
  [[0, -19], [-9, -14], [9, -15]].forEach(([dx, dy]) => put(back, BF.CX + dx, BF.CY + dy, 'u'));
  put(front, BF.CX, BF.CY, 'I'); put(front, BF.CX + 1, BF.CY - 1, 'u');
  frames.push({ back, front, body: radiantSkin(heroBase, 37, 0.45), tag: 'BF2 RISE' });
  return frames;
}

// ---------- build everything ----------
const EMBLEM = emblemFrame();
const MICRO = emblemMicro();
const HALO = haloFrames();
const GHALO = groundHaloFrames();
const SLASH = slashFrames();
const IMPACT = impactFrames();
const CYCLE = cycleFrames();
const BFLARE = bodyFlareFrames();

// ---------- validation (throws on any violation) ----------
let vErr = 0;
const fail = (...m) => { console.error('FAIL', ...m); vErr++; };
// warm law — every LIGHT color must satisfy R >= G >= B: blue cannot exist
for (const [k, hex] of Object.entries(LIGHT)) {
  const [r, g2, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  if (!(r >= g2 && g2 >= b)) fail('warm law', k, hex);
}
const LKEYS = new Set([...Object.keys(LIGHT), '.']);
const HKEYS = new Set([...Object.keys(HERO_PAL), '.']);
function checkGrid(name, g, w, h, keys = LKEYS) {
  if (g.length !== h || g.some(r => r.length !== w)) fail('size', name);
  for (const r of g) for (const k of r) if (!keys.has(k)) fail('key', name, k);
}
checkGrid('emblem', EMBLEM, 41, 41);
checkGrid('micro', MICRO, 13, 13);
HALO.forEach((g, i) => checkGrid('halo' + i, g, 33, 33));
GHALO.forEach((g, i) => checkGrid('ghalo' + i, g, GH.W, GH.H));
SLASH.forEach((g, i) => checkGrid('slash' + i, g, 37, 37));
IMPACT.forEach((g, i) => checkGrid('impact' + i, g, 21, 21));
CYCLE.frames.forEach((g, i) => checkGrid('cycle' + i, g, 45, 45));
BFLARE.forEach((fr, i) => { checkGrid('bf' + i + 'back', fr.back, BF.W, BF.H);
  checkGrid('bf' + i + 'front', fr.front, BF.W, BF.H); checkGrid('bf' + i + 'body', fr.body, HW, HH, HKEYS); });
// emblem: perfect horizontal symmetry + white core + gold majority balance
for (let y = 0; y < 41; y++) for (let x = 0; x < 41; x++)
  if (EMBLEM[y][x] !== EMBLEM[y][40 - x]) { fail('emblem symmetry', x, y); y = 41; break; }
if (EMBLEM[EC][EC] !== 'W') fail('emblem core not white');
{
  let w = 0, gold = 0, lit = 0;
  EMBLEM.forEach(r => r.forEach(k => { if (k === '.') return; lit++;
    if (k === 'W' || k === 'I') w++; else gold++; }));
  if (w / lit < 0.2) fail('emblem white share', (w / lit).toFixed(2));
  if (gold / lit < 0.4) fail('emblem gold share', (gold / lit).toFixed(2));
}
// halo: every lit ring cell must sit on a true circle (sacred geometry proof)
const HALO_RADII = [[8, 6, 10], [10, 11.31], [10]];   // per-frame legal radii
HALO.forEach((g, i) => {
  let off = 0;
  g.forEach((row, y) => row.forEach((k, x) => {
    if (k === '.') return;
    const d = Math.hypot(x - HC, y - HC);
    if (HALO_RADII[i].some(R => Math.abs(d - R) < 1.1)) return;
    if (y <= 3) return;                                // rising motes above the ring
    off++;
  }));
  if (off > 0) fail('halo circle purity', i, off);
});
// impact: compact + P1 cardinal reach
{
  let reach = 0;
  IMPACT[1].forEach((row, y) => row.forEach((k, x) => {
    if (k !== '.' && (x === PC || y === PC)) reach = Math.max(reach, Math.abs(x - PC), Math.abs(y - PC));
  }));
  if (reach < 7) fail('impact star reach', reach);
}
// cycle: gather contracts, release expands, dissolve thins + RISES
const meanR45 = g => { let s = 0, n = 0;
  g.forEach((row, y) => row.forEach((k, x) => { if (k !== '.') { s += Math.hypot(x - CC, y - CC); n++; } }));
  return n ? s / n : 0; };
const litCount = g => g.flat().filter(k => k !== '.').length;
const meanY = g => { let s = 0, n = 0;
  g.forEach((row, y) => row.forEach(k => { if (k !== '.') { s += y; n++; } })); return n ? s / n : 0; };
const [cG0, cG1, cI0, cR0, , cD0, cD1, cD2] = CYCLE.frames;
if (!(meanR45(cG0) > meanR45(cG1) && meanR45(cG1) > meanR45(cI0))) fail('gather not contracting', meanR45(cG0).toFixed(1), meanR45(cG1).toFixed(1), meanR45(cI0).toFixed(1));
if (!(meanR45(cR0) > meanR45(cI0) * 1.6)) fail('release not expanding');
if (!(litCount(cD0) > litCount(cD1) && litCount(cD1) > litCount(cD2))) fail('dissolve not thinning', litCount(cD0), litCount(cD1), litCount(cD2));
if (!(meanY(cD2) < meanY(cD1) && meanY(cD1) < meanY(cD0))) fail('dissolve not rising', meanY(cD0).toFixed(1), meanY(cD1).toFixed(1), meanY(cD2).toFixed(1));
// body flare: re-skin mask identical to the base hero (geometry never desyncs);
// peak is NORTH-dominant (ascension — inverse of the boss dive axis); nothing
// paints below the ground sparkle row
BFLARE.forEach((fr, i) => {
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++)
    if ((fr.body[y][x] === '.') !== (heroBase[y][x] === '.')) fail('bf body mask', i, x, y);
  fr.front.forEach((row, y) => row.forEach(k => { if (k !== '.' && y > BF.FEET + 2) fail('bf front below floor', i, y); }));
  fr.back.forEach((row, y) => row.forEach(k => { if (k !== '.' && y > BF.FEET + 1) fail('bf back below floor', i, y); }));
});
{
  let top = BF.CY, bot = BF.CY;
  BFLARE[1].back.forEach((row, y) => row.forEach(k => { if (k !== '.') { top = Math.min(top, y); bot = Math.max(bot, y); } }));
  if (!((BF.CY - top) > (bot - BF.CY))) fail('bf1 not north-dominant', BF.CY - top, bot - BF.CY);
}
if (vErr) throw new Error('validation failed: ' + vErr);

// ================= SHEET CANVAS =================
const SW = 424, SH = 780, SCALE = 4;
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
  const { mir = false, tintFn = null, s = 1 } = opts;
  const mw = m[0].length;
  m.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
    const k = row[x]; if (k === '.' || k === ' ' || !pal[k]) continue;
    const px = mir ? ox + (mw - 1 - x) * s : ox + x * s;
    const hex = tintFn ? tintFn(k, x, y) : pal[k];
    if (hex) paint(px, oy + y * s, s, s, hex, 1);
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

// composite a body-flare frame (back + radiant body + front) at sheet pos
function stampFlare(fr, ox, oy, opts = {}) {
  stampM(fr.back, LIGHT, ox, oy, opts);
  const bx = opts.mir ? ox + BF.W - BF.HX - HW : ox + BF.HX;
  stampM(fr.body, HERO_PAL, bx, oy + BF.HY, opts);
  stampM(fr.front, LIGHT, ox, oy, opts);
}

// ---------- header + palette law ----------
text('HERO LIGHT ECLIPSE - WHITE + GOLD - REUSABLE VFX FAMILY - STRICT PIXEL ART', 3, 2, HEADC);
text('THE HERO MIRROR OF THE BOSS RED ECLIPSE - A WHITE DISC INSIDE A GOLD CORONA. HOLY - SOLAR -', 3, 9);
text('LUMINOUS - CLEAN AND DANGEROUS. FOR SWORD COMBOS - CHARGED MOMENTS - FINISHERS - FUTURE POWERS.', 3, 15);
text('PALETTE LAW - WHITE CORE + GOLD GLOW ONLY - NO BLUE EVER - NO BLUR - NO GRADIENTS - NO NEW COLORS', 3, 23, HEADC);
(() => {
  const keys = ['W', 'I', 'y', 'o', 'G', 'u'];
  const roles = ['CORE', 'IVORY', 'RADIANT', 'WARM', 'DEEP', 'BRONZE'];
  keys.forEach((k, i) => {
    const x = 3 + i * 34;
    cellFrame(x, 30, 30, 10, LIGHT[k]);
    text(k, x + 1, 43, '#6d6488'); text(roles[i], x + 6, 43, SUBC);
  });
  text('WARM LAW - R OVER G OVER B EVERY STEP - NO BLUE', 213, 32);
  text('DEEP GOLD IS THE HERO GOLD KEY - BRONZE IS THE', 213, 39);
  text('THRONE GOLD DARK - NATIVE TO THE GAME PALETTE', 213, 45);
  text('ROLES - W CORE + GLINTS - I TRANSITIONS - Y CORONA + RAY BODY - O RAY OUTER - G TIPS + RIM - U FADE MOTES', 3, 50);
})();

// ---------- EMBLEM band ----------
let Y = 60;
text('EMBLEM - THE CORE LIGHT ECLIPSE MOTIF - SACRED GEOMETRY - THE HERO OWNS TRUE CIRCLES', 3, Y, HEADC);
(() => {
  const oy = Y + 8;
  cellFrame(3, oy, 41, 41, '#100d1c'); stampM(EMBLEM, LIGHT, 3, oy);
  text('1X', 3, oy + 44, SUBC);
  cellFrame(56, oy, 82, 82, '#100d1c'); stampM(EMBLEM, LIGHT, 56, oy, { s: 2 });
  text('2X ZOOM', 56, oy + 85, SUBC);
  cellFrame(150, oy, 13, 13, '#100d1c'); stampM(MICRO, LIGHT, 150, oy);
  cellFrame(150, oy + 20, 39, 39, '#100d1c'); stampM(MICRO, LIGHT, 150, oy + 20, { s: 3 });
  text('MICRO 13X13 + 3X', 150, oy + 62, SUBC);
  const nx = 216;
  text('ANATOMY -', nx, oy, HEADC);
  text('WHITE CORE DISC R3', nx, oy + 8);
  text('IVORY SEPARATION RING', nx, oy + 14);
  text('GOLD CORONA RING R6', nx, oy + 20);
  text('4 LONG CARDINAL RAYS - 3PX BASE', nx, oy + 26);
  text('TAPER TO 1PX - DETACHED W TIPS', nx, oy + 32);
  text('4 SHORT DIAGONAL RAYS', nx, oy + 38);
  text('BROKEN OUTER DASH HALO R19', nx, oy + 44);
  text('CROSS-SPARKS BETWEEN RAYS', nx, oy + 50);
  text('CONTRAST LAW - THE BOSS ECLIPSE IS A', nx, oy + 60, HEADC);
  text('VOID DISC IN A HOT CORONA + BROKEN', nx, oy + 66);
  text('OCTAGONS - THE HERO IS A WHITE DISC', nx, oy + 72);
  text('IN A GOLD CORONA + TRUE CIRCLES -', nx, oy + 78);
  text('STRAIGHT CLEAN RAYS - NEVER BOLTS', nx, oy + 84);
})();
Y += 104;

// ---------- HALO band ----------
text('HALO - RING VARIANT - SNAP SETTLE SHIMMER - PLUS THE FLAT GROUND HALO FOR CHARGED MOMENTS', 3, Y, HEADC);
(() => {
  const oy = Y + 7;
  HALO.forEach((g, i) => {
    cellFrame(3 + i * 39, oy, 33, 33, '#100d1c');
    stampM(g, LIGHT, 3 + i * 39, oy);
    text(['H0 SNAP', 'H1 SETTLE', 'H2 SHIMMER'][i], 3 + i * 39, oy + 36, SUBC);
  });
  GHALO.forEach((g, i) => {
    cellFrame(126 + i * 47, oy + 10, GH.W, GH.H, '#100d1c');
    stampM(g, LIGHT, 126 + i * 47, oy + 10);
    text('GROUND ' + i, 126 + i * 47, oy + 26, SUBC);
  });
  const nx = 226;
  text('SNAP TIGHT - SETTLE OUT - THEN THE RING', nx, oy + 2);
  text('BREAKS INTO MARCHING DASHES - CARDINAL', nx, oy + 8);
  text('NODES WINK - MOTES RISE OFF THE TOP', nx, oy + 14);
  text('GROUND HALO SITS UNDER THE FEET ON THE', nx, oy + 22);
  text('FLOOR LINE - CAST + CHARGE + BLESSING', nx, oy + 28);
  text('HOLDS - SNAP 4 SETTLE 5 SHIMMER LOOP 6', nx, oy + 36, HEADC);
})();
Y += 54;

// ---------- SLASH band ----------
text('SLASH ACCENT - SWORD COMBO SMEAR - GLINT - SHEAR - HIT - FOLLOW - HOLD THE HIT FRAME', 3, Y, HEADC);
(() => {
  const oy = Y + 7;
  SLASH.forEach((g, i) => {
    cellFrame(3 + i * 43, oy, 37, 37, '#100d1c');
    stampM(g, LIGHT, 3 + i * 43, oy);
    text(['S0 GLINT', 'S1 SHEAR', 'S2 HIT', 'S3 FOLLOW'][i], 3 + i * 43, oy + 40, SUBC);
  });
  const nx = 180;
  text('RHYTHM FROM THE SWORD ATTACK REFERENCE -', nx, oy + 2);
  text('ANTICIPATION GLINT 3 TICKS - SHEAR 3 -', nx, oy + 8);
  text('HIT 6 AND HELD FOR IMPACT - FOLLOW 3', nx, oy + 14);
  text('ANATOMY - LEADING EDGE W - BODY IVORY -', nx, oy + 24);
  text('INNER EDGE RADIANT GOLD - TRAILING RIM', nx, oy + 30);
  text('WARM GOLD - SPARSE DEEP GOLD BREAKUP', nx, oy + 36);
  text('AUTHORED TRAVELING RIGHT - RUNTIME USES', nx, oy + 44);
  text('THE EXISTING AIMDIR MIRROR - FOLLOW', nx, oy + 50);
  text('FRAME MOTES RISE - LIGHT NEVER ASHES', nx, oy + 56);
})();
Y += 72;

// ---------- IMPACT band ----------
text('IMPACT FLARE - COMPACT 4-POINT STAR FOR HIT MOMENTS - FLASH - STAR - SPARK-OUT', 3, Y, HEADC);
(() => {
  const oy = Y + 7;
  IMPACT.forEach((g, i) => {
    cellFrame(3 + i * 27, oy, 21, 21, '#100d1c');
    stampM(g, LIGHT, 3 + i * 27, oy);
    text(['P0', 'P1', 'P2'][i], 3 + i * 27 + 6, oy + 24, SUBC);
  });
  const nx = 96;
  text('P0 WHITE POP 2 TICKS - P1 STAR 4 - P2 SPARKS 3 - SITS AT THE', nx, oy + 2);
  text('CONTACT POINT OF ANY STRIKE - SCALES BY PIXEL SIZE NOT BY NEW ART', nx, oy + 8);
  text('ESCALATION - MICRO GLYPH - IMPACT STAR - FULL EMBLEM - SAME SHAPE', nx, oy + 16, HEADC);
  text('LANGUAGE AT THREE SIZES - PICK BY MOMENT WEIGHT', nx, oy + 22);
})();
Y += 40;

// ---------- CYCLE band ----------
text('LIFECYCLE - GATHER - IGNITE - RELEASE - DISSOLVE - THE FAMILY GRAMMAR EVERY USE FOLLOWS', 3, Y, HEADC);
(() => {
  const oy = Y + 7;
  CYCLE.frames.forEach((g, i) => {
    cellFrame(3 + i * 52, oy, 45, 45, '#100d1c');
    stampM(g, LIGHT, 3 + i * 52, oy);
    text(CYCLE.tags[i], 3 + i * 52, oy + 48, SUBC);
  });
  text('GATHER PULLS IN ON FIXED SPOKES - IGNITE IS THE WHITE KERNEL - RELEASE BURSTS THE FULL ECLIPSE OPEN -', 3, oy + 57);
  text('R0-R1 LOOP WHILE HELD - DISSOLVE PEELS THE RAYS AND THE MOTES RISE AND WINK OUT - NEVER SMOKE - NEVER ASH', 3, oy + 63);
  text('HOLDS - G0 6 G1 6 I0 4 R0 5 R1 5 D0 4 D1 5 D2 6 - BOSS ASH SINKS - HERO LIGHT RISES', 3, oy + 70, HEADC);
})();
Y += 92;

// ---------- BODY FLARE band ----------
text('BODY FLARE - CENTRAL ECLIPSE ON THE DAWNGUARD KNIGHT - 48X36 GRIDS - HERO AT 9.8 - CORE 22.18', 3, Y, HEADC);
(() => {
  const oy = Y + 7;
  BFLARE.forEach((fr, i) => {
    cellFrame(3 + i * 54, oy, BF.W, BF.H, '#100d1c');
    stampFlare(fr, 3 + i * 54, oy);
    text(fr.tag, 3 + i * 54, oy + 39, SUBC);
  });
  const nx = 170;
  text('BACK GRID BEHIND THE SPRITE - FRONT OVER IT -', nx, oy + 2);
  text('GRID CENTER COL IS THE HERO CENTER SO THE', nx, oy + 8);
  text('EXISTING AIMDIR MIRROR SELF-ANCHORS THE EFFECT', nx, oy + 14);
  text('BODY RE-SKIN IS RADIANT SKIN - ONE RAMP STEP', nx, oy + 22, HEADC);
  text('BRIGHTER + BROKEN GOLD RIM ON THE CONTOUR -', nx, oy + 28);
  text('THE EXACT INVERSE OF THE BOSS ECLIPSESKIN -', nx, oy + 34);
  text('THE BOSS GOES VOID - THE HERO GOES RADIANT', nx, oy + 40);
  text('NORTH RAY LONGEST - LIGHT RISES - INVERSE OF', nx, oy + 48);
  text('THE BOSS AIR ECLIPSE SOUTH DIVE RAY', nx, oy + 54);
})();
Y += 72;

// ---------- APPLICATION band (sword swing + cast) ----------
text('APPLICATION - ON THE REAL HERO ATTACK AND CAST CLIPS - EFFECT MEETS THE APPROVED SPRITE', 3, Y, HEADC);
(() => {
  const oy = Y + 7, CH2 = 42;
  const ATT = HERO_ANIM.attack.map(toGrid), CAST = HERO_ANIM.cast.map(toGrid);
  // A0 windup + glint (blade tip of attack f0 is near hero 27,4)
  cellFrame(3, oy, 66, CH2, '#100d1c');
  stampM(ATT[0], HERO_PAL, 3 + 2, oy + 8);
  stampM(SLASH[0], LIGHT, 3 + 6, oy + 1);
  text('A0 GLINT', 3, oy + CH2 + 3, SUBC);
  // A1 strike + full crescent ahead of the blade
  cellFrame(75, oy, 66, CH2, '#100d1c');
  stampM(ATT[1], HERO_PAL, 75 + 2, oy + 8);
  stampM(SLASH[2], LIGHT, 75 + 6, oy + 3);
  text('A1 STRIKE', 75, oy + CH2 + 3, SUBC);
  // A2 follow + impact at the low tip
  cellFrame(147, oy, 66, CH2, '#100d1c');
  stampM(ATT[2], HERO_PAL, 147 + 2, oy + 8);
  stampM(SLASH[3], LIGHT, 147 + 6, oy + 3);
  stampM(IMPACT[1], LIGHT, 147 + 21, oy + 19);
  text('A2 FOLLOW', 147, oy + CH2 + 3, SUBC);
  // CAST — halo behind the shoulders + ground halo underfoot + rising motes
  cellFrame(219, oy, 70, CH2, '#100d1c');
  stampM(HALO[1], LIGHT, 219 + 13, oy + 1);
  stampM(CAST[1], HERO_PAL, 219 + 15, oy + 7);
  stampM(GHALO[0], LIGHT, 219 + 10, oy + 26);
  [[10, 14], [52, 12], [14, 6], [48, 4]].forEach(([dx, dy], i) =>
    paint(219 + dx, oy + dy, 1, 1, LIGHT[i % 2 ? 'I' : 'o'], 1));
  text('CAST + HALO', 219, oy + CH2 + 3, SUBC);
  const nx = 298;
  text('SLASH RIDES THE SWING ARC IN', nx, oy + 2);
  text('FRONT OF THE BLADE - IMPACT', nx, oy + 8);
  text('SITS AT CONTACT - HALO FRAMES', nx, oy + 14);
  text('THE SHOULDERS ON CAST - GROUND', nx, oy + 20);
  text('HALO LOCKS TO THE FLOOR LINE', nx, oy + 26);
  text('EVERYTHING SNAPS TO THE HERO', nx, oy + 34, HEADC);
  text('2PX GRID AT RUNTIME', nx, oy + 40, HEADC);
})();
Y += 60;

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
text('TABLEAU 1 - HERO STRIKE VS THE BOSS - NIGHT HALL', 3, Y, HEADC);
text('TABLEAU 2 - BODY FLARE PEAK', 203, Y, HEADC);
(() => {
  const oy = Y + 7;
  // T1 — boss left facing right; hero right (mirrored) mid-strike w/ crescent + impact
  let floorY = nightRoom(3, oy, 194, 70, 58);
  stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, 3 + 18, floorY - 47);
  const ATT = HERO_ANIM.attack.map(toGrid);
  stampM(SLASH[2], LIGHT, 3 + 100, floorY - 40, { mir: true });
  stampM(ATT[1], HERO_PAL, 3 + 128, floorY - 23, { mir: true });
  stampM(IMPACT[1], LIGHT, 3 + 94, floorY - 32);
  // T2 — hero centered, body flare peak, boss watching from the left
  floorY = nightRoom(203, oy, 194, 70, 58);
  stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, 203 + 10, floorY - 47);
  stampFlare(BFLARE[1], 203 + 100, floorY - BF.FEET - 1, { mir: true });
})();
Y += 84;

// ---------- handoff notes ----------
text('HANDOFF NOTES', 3, Y, HEADC); Y += 8;
[
  'IDENTITY - WHITE DISC IN A GOLD CORONA - TRUE CIRCLES + STRAIGHT TAPERED RAYS + CROSS-SPARKS -',
  '    RISING DISSOLVE MOTES - THE EXACT MIRROR OF THE BOSS RED ECLIPSE - NEVER BLUE - NEVER BOLTS',
  'GRAMMAR - EVERY USE PLAYS GATHER - IGNITE - RELEASE - DISSOLVE - RELEASE LOOPS WHILE HELD',
  'REUSE MAP - SWORD COMBOS TAKE SLASH + IMPACT - CHARGED MOMENTS TAKE CYCLE + GROUND HALO +',
  '    BODY FLARE - FINISHERS TAKE EMBLEM + HALO SNAP + BIG IMPACT - PARRY CAN TAKE HALO SNAP -',
  '    RANGED SHOTS TAKE THE MICRO GLYPH CORE',
  'SCALE - ALL GRIDS RENDER AT THE HERO 2PX GRID - EMBLEM 82PX - HALO 66PX - SLASH 74PX -',
  '    IMPACT 42PX - CYCLE 90PX - BODY FLARE 96X72PX AROUND THE 60X48PX HERO',
  'ANCHORS - BODY FLARE GRID 48X36 - HERO ORIGIN 9.8 - CHEST CORE 22.18 - FEET ROW 31 - GRID',
  '    CENTER COL IS THE HERO CENTER SO THE EXISTING AIMDIR MIRROR SELF-ANCHORS EVERYTHING',
  'BODY RE-SKIN - RADIANT SKIN - ONE RAMP STEP BRIGHTER + BROKEN GOLD RIM VIA THE HERO OWN GOLD',
  '    KEY - HERO KEYS ONLY - MASK IDENTICAL TO THE BASE - GEOMETRY CAN NEVER DESYNC',
  'RENDER-ONLY LAW - NEVER HITBOXES - NO GAMEPLAY OR TIMING CHANGES - INTEGRATION COMES LATER -',
  '    AT THE ENEMY DRAW SEAMS - SLASH ON MELEE ACTIVE - CYCLE ON CAST - HALO ON PARRY',
  'CONTRAST CONTRACT - BOSS VOID DISC - HERO WHITE DISC - BOSS BROKEN OCTAGON - HERO TRUE CIRCLE -',
  '    BOSS ASH SINKS - HERO MOTES RISE - BOSS BOLTS - HERO NEVER - KEEP THE MIRROR PURE',
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
fs.writeFileSync(__dirname+'/hero_eclipse_v1.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---------- literal dump ----------
let js = '// === HERO LIGHT ECLIPSE literals (see hero_eclipse_spec.md) ===\n';
js += '// White+gold only. LIGHT keys: W #fffdf4 / I #f2e6bf / y #f2c94e / o #e0a93c /\n';
js += '// G #c9962e (== hero gold key) / u #8a6420 (== throne gold dark). Warm law R>=G>=B.\n';
js += '// All effect grids are RENDER-ONLY overlays at the hero 2px grid.\n';
js += '// lightBodyFlare: back/front 48x36 LIGHT grids around hero origin (9,8), chest core\n';
js += '// (22,18), feet row 31; body = 30x24 radiant re-skin in HERO keys (mask == base).\n';
const dumpFrames = (name, frames) => {
  js += `  ${name}: [\n`;
  for (const f of frames) js += '    [' + stringify(f).map(r => JSON.stringify(r)).join(', ') + '],\n';
  js += '  ],\n';
};
dumpFrames('lightEmblem', [EMBLEM]);
dumpFrames('lightEmblemMicro', [MICRO]);
dumpFrames('lightHalo', HALO);
dumpFrames('lightGroundHalo', GHALO);
dumpFrames('lightSlash', SLASH);
dumpFrames('lightImpact', IMPACT);
dumpFrames('lightCycle', CYCLE.frames);
js += '  lightBodyFlare: [\n';
BFLARE.forEach(fr => {
  js += `    // ${fr.tag}\n`;
  js += '    { back: [' + stringify(fr.back).map(r => JSON.stringify(r)).join(', ') + '],\n';
  js += '      front: [' + stringify(fr.front).map(r => JSON.stringify(r)).join(', ') + '],\n';
  js += '      body: [' + stringify(fr.body).map(r => JSON.stringify(r)).join(', ') + '] },\n';
});
js += '  ],\n';
fs.writeFileSync(__dirname + '/hero_eclipse_literal.txt', js);

// round-trip proof: re-parse the artifact and deep-compare two families
{
  const src = fs.readFileSync(__dirname + '/hero_eclipse_literal.txt', 'utf8').replace(/\r/g, '');
  const m = src.match(/  lightSlash: \[([\s\S]*?)\n  \],/);
  const rt = [...m[1].matchAll(/\[((?:"[^"]*"(?:, )?)+)\]/g)].map(fm => fm[1].split(', ').map(s => JSON.parse(s)));
  if (JSON.stringify(rt) !== JSON.stringify(SLASH.map(stringify))) throw new Error('round-trip fail: lightSlash');
  const m2 = src.match(/  lightCycle: \[([\s\S]*?)\n  \],/);
  const rt2 = [...m2[1].matchAll(/\[((?:"[^"]*"(?:, )?)+)\]/g)].map(fm => fm[1].split(', ').map(s => JSON.parse(s)));
  if (JSON.stringify(rt2) !== JSON.stringify(CYCLE.frames.map(stringify))) throw new Error('round-trip fail: lightCycle');
}

console.log('wrote hero_eclipse_v1.png', IW + 'x' + IH,
  '| emblem 41 + micro 13 | halo', HALO.length, '+ ground', GHALO.length,
  '| slash', SLASH.length, '| impact', IMPACT.length, '| cycle', CYCLE.frames.length,
  '| bodyFlare', BFLARE.length,
  '| gather meanR', [meanR45(cG0), meanR45(cG1), meanR45(cI0)].map(v => v.toFixed(1)).join(' '),
  '| dissolve lit', [cD0, cD1, cD2].map(litCount).join(' '),
  '| layout end Y', Y);
