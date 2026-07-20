// HERO COMBO A — "MERIDIAN LOOP" (Stage 8C-0, concept — nothing wired into src/).
//
// A SECOND, visually distinct 5-step Hero combo, built entirely from the approved
// Stage 8B-0 HERO LIGHT ECLIPSE language and the approved 30x24 Dawnguard Knight.
// Strict pixel art: hard cells, no blur, no gradients — and ZERO BLUE in the
// effects (the blade keeps its own cold-blue glow: that is the character).
//
// WHY IT DOES NOT COLLIDE WITH "DAYBREAK CHAIN" (8B-1):
//   DAYBREAK CHAIN is a combo of ARCS — four radial crescents pivoting tight at
//   the shoulder (r~15), all of it happening ON the hero's body.
//   MERIDIAN LOOP is a combo of LINES — a shallow bow (distant pivot r=40), a
//   vertical dive line, a thrown glaive line, a chase line, and a world-scale
//   vertical pillar. It happens ACROSS THE ARENA and comes back to where it
//   started. Same family, same ramp, opposite geometry of motion.
//
// THE FIVE STEPS:
//   S1 SUNSTEP      grounded opener. One-hand LEVEL cut; the blade barely rotates
//                   (a wrist cut, ~26deg) and leaves a long shallow BOW smear from
//                   a distant pivot — the "line" signature, not a shoulder arc.
//   S2 ZENITH DIVE  coil -> LAUNCH (airborne) -> ECLIPSE STATE at the apex (halo
//                   snap + radiant re-skin + north ray = ascension) -> DIVE with
//                   the light trailing UP off the falling body -> SLAM -> rise.
//   S3 SUNGLAIVE    the light LEAVES the sword: a magical slash projectile is cast
//                   forward (its own grids; MICRO GLYPH core per the 8B-0 reuse map).
//   S4 CHASECUT     the hero sets THE MARK (ground halo = the return anchor), then
//                   cuts forward along the glaive's path, carving the CORRIDOR.
//   S5 NOON PILLAR  at the far end the corridor stands up into a PILLAR (the
//      + ECHO       emblem's NORTH ray at world scale, crowned by a true-circle
//        RETURN     corona) — then the hero UNMAKES and REFORMS back at the mark,
//                   inside the still-fading corridor residue, WHILE the pillar is
//                   still burning. That overlap is what makes it read as one loop.
//
// THE GRAMMAR ARGUMENT (why the teleport is not an invention):
//   The 8B-0 family grammar is GATHER -> IGNITE -> RELEASE -> DISSOLVE.
//   The teleport return is that grammar RUN BACKWARDS: DISSOLVE at the endpoint
//   (motes rise off the body) and GATHER at the mark (motes converge in, the body
//   knits from the feet UP). No new ramp, no new shapes — the family reversed.
//
// Emits: hero_combo_a_v1.png (production sheet) + hero_combo_a_literal.txt.
const fs = require('fs');
const zlib = require('zlib');

// ---------- palettes ----------
// LIGHT ECLIPSE ramp (locked in 8B-0; warm law R >= G >= B — blue cannot exist).
const LIGHT = {
  'W': '#fffdf4',   // white core / glints
  'I': '#f2e6bf',   // ivory transition / motes
  'y': '#f2c94e',   // radiant gold / corona / ray body
  'o': '#e0a93c',   // warm gold / trailing rim / teeth
  'G': '#c9962e',   // deep gold / tips (== hero key g)
  'u': '#8a6420',   // bronze / fade motes (== throne gold dark)
};
const HERO_PAL = {
  '0': '#10141e', '1': '#2e3444', '2': '#4a5468', '3': '#7c88a0', '4': '#aeb9cc', '5': '#e2e8f2',
  'n': '#141c30', 'm': '#1c2438', 'l': '#7fd4ff', 'L': '#b8ecff', 'g': '#c9962e',
};
const COMBO_PAL = { ...HERO_PAL, ...LIGHT };
const BOSS_PAL = {
  '0': '#08080c', '1': '#12121a', '2': '#1c1d28', '3': '#2a2c3a', '4': '#3d4052', '5': '#565c74',
  'a': '#6e0f1c', 'b': '#a8182a', 'c': '#e0263a', 'd': '#ff5a4a', 'g': '#3a1014', 'h': '#571820',
};
const NW0 = '#191622', NW1 = '#1d1a28', NF0 = '#221c2b', NF1 = '#3a3346';
const WINL = '#6c82a8';

// ---------- load approved art ----------
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
const BOSS_IDLE = loadClips('walk2_literal.txt', ['idle']).idle;
const toGrid = f => f.map(r => r.split(''));
const stringify = g => g.map(r => r.join(''));

// ---------- authoring canvas (IDENTICAL to the approved 8B-1 combo) ----------
// 44x34, hero base at (7,10), feet/shadow rows 32/33. Keeping the approved combo
// canvas means the runtime path this would land on is already proven (row-count
// detection, the aimDir mirror, the HERO_BODY_ROWS/COLS body-box clamps).
const GW = 44, GH = 34, OX = 7, OY = 10;
const FLOOR = 33;
const SHO = [21, 22];
const HIP = 24;

const mkGrid = (w = GW, h = GH) => Array.from({ length: h }, () => Array(w).fill('.'));
const put = (g, x, y, k) => { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = k; };
const putB = (g, x, y, k) => { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length && g[y][x] === '.') g[y][x] = k; };
const rnd = (i, s) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const R = Math.round, RAD = d => d * Math.PI / 180;

function lineC(g, x0, y0, x1, y1, k, thick) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    put(g, x, y, k); if (thick) put(g, x, y + 1, k);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; }
  }
}
function disc(g, cx, cy, r, k) {
  for (let y = Math.ceil(cy - r); y <= cy + r; y++)
    for (let x = Math.ceil(cx - r); x <= cx + r; x++)
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r + 0.01) put(g, x, y, k);
}
function ringC(g, cx, cy, r, k, opts = {}) {
  const { dash = 0, phase = 0, arcFrom = -Math.PI - 0.01, arcTo = Math.PI + 0.01, behind = true } = opts;
  const steps = Math.max(16, Math.ceil(Math.PI * 2 * r * 1.5));
  const setter = behind ? putB : put;
  for (let i = 0; i < steps; i++) {
    const a = -Math.PI + i / steps * 2 * Math.PI;
    if (a < arcFrom || a > arcTo) continue;
    if (dash) { const seg = Math.floor(((a + Math.PI) / (2 * Math.PI)) * dash + phase); if (((seg % 2) + 2) % 2) continue; }
    setter(g, R(cx + Math.cos(a) * r), R(cy + Math.sin(a) * r), k);
  }
}
function ellipseRing(g, cx, cy, rx, ry, k, opts = {}) {
  const { dash = 0, phase = 0 } = opts;
  const steps = Math.ceil(Math.PI * 2 * rx);
  for (let i = 0; i < steps; i++) {
    const a = i / steps * 2 * Math.PI;
    if (dash) { const seg = Math.floor(a / (2 * Math.PI) * dash + phase); if (((seg % 2) + 2) % 2) continue; }
    putB(g, R(cx + rx * Math.cos(a)), R(cy + ry * Math.sin(a)), k);
  }
}
// straight tapered ray on a clean axis — the 8B-0 EMBLEM ray law.
function axisRay(g, cx, cy, dir, r0, r1, ramp, opts = {}) {
  const { tip = false, wide = true } = opts;
  for (let r = r0; r <= r1; r++) {
    const t = (r - r0) / Math.max(1, r1 - r0);
    const ki = Math.min(ramp.length - 1, Math.floor(t * ramp.length));
    const x = cx + dir[0] * r, y = cy + dir[1] * r;
    putB(g, x, y, ramp[ki]);
    if (wide && t < 0.32) {
      const k2 = ramp[Math.min(ramp.length - 1, ki + 1)];
      putB(g, x + Math.abs(dir[1]), y + Math.abs(dir[0]), k2);
      putB(g, x - Math.abs(dir[1]), y - Math.abs(dir[0]), k2);
    }
  }
  if (tip) putB(g, cx + dir[0] * (r1 + 2), cy + dir[1] * (r1 + 2), 'W');
}
function spark(g, x, y, s = 1, core = 'W', arm = 'y') {
  put(g, x, y, core);
  for (let i = 1; i <= s; i++) { put(g, x + i, y, arm); put(g, x - i, y, arm); put(g, x, y + i, arm); put(g, x, y - i, arm); }
}
function mirrorH(g) {
  const w = g[0].length;
  for (let y = 0; y < g.length; y++)
    for (let x = 0; x < Math.floor(w / 2); x++) g[y][x] = g[y][w - 1 - x];
  return g;
}

// ---------- body toolkit (re-poses of the approved base — 8B-1 house idioms) ----------
function baseBody() {
  const g = mkGrid();
  heroBase.forEach((row, y) => row.forEach((k, x) => { if (k !== '.') g[y + OY][x + OX] = k; }));
  return g;
}
function cut(g, x0, y0, x1, y1) {
  const c = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (y < 0 || y >= GH || x < 0 || x >= GW) continue;
    if (g[y][x] !== '.') { c.push([x, y, g[y][x]]); g[y][x] = '.'; }
  }
  return c;
}
function paste(g, cells, dx, dy) {
  for (const [x, y, k] of cells) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < GW && ny >= 0 && ny < GH) g[ny][nx] = k; }
}
function moveUpper(g, dx, dy) {
  if (!dx && !dy) return g;
  const out = mkGrid();
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (g[y][x] === '.') continue;
    if (y <= HIP) { const ny = y + dy, nx = x + dx; if (ny >= 0 && ny < GH && nx >= 0 && nx < GW) out[ny][nx] = g[y][x]; }
    else out[y][x] = g[y][x];
  }
  return out;
}
function capeFlow(g, dx, dy) { paste(g, cut(g, 10, 20, 16, 29), dx, dy); return g; }
function lunge(g, fwd, back) {
  paste(g, cut(g, 21, 27, 23, FLOOR), fwd, 0);
  if (back) paste(g, cut(g, 17, 27, 19, FLOOR), -back, 0);
}
function eraseBlade(g) { for (let y = 22; y <= 28; y++) for (let x = 24; x <= 36; x++) g[y][x] = '.'; }
// NEW (8C-0 R2): the plunge body. A real dive is a TURN, not an upright fall —
// and a turn needs a rotated silhouette. 90 degrees is the one rotation pixel
// art survives losslessly (pure transpose + flip, no resampling, no mush): the
// approved base turns head-forward, face-down, the cape trailing up the back.
// The base blade is erased in BASE coords first (rows 12-18, cols 17-29), then
// the sword is re-drawn along the dive line so it leads the strike.
function rotateCW(src) {
  const h = src.length, w = src[0].length;
  const out = Array.from({ length: w }, () => Array(h).fill('.'));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[x][h - 1 - y] = src[y][x];
  return out;
}
const DIVE_OX = 12, DIVE_OY = 3;
function diveBody() {
  const bb = heroBase.map(r => r.slice());
  for (let y = 12; y <= 18; y++) for (let x = 17; x <= 29; x++) bb[y][x] = '.';
  const rot = rotateCW(bb);                      // 24 wide x 30 tall band, head at the right
  const g = mkGrid();
  rot.forEach((row, y) => row.forEach((k, x) => { if (k !== '.') g[y + DIVE_OY][x + DIVE_OX] = k; }));
  return g;
}
// NEW (8C-0): airborne lift. The whole body leaves the floor rows and the legs
// fold up toward the hips. drawSprite's feet-bottom anchor still holds: the grid
// bottom stays the entity's collision base, so a tucked pose simply reads as the
// legs pulled up above it — exactly what a jump should look like.
function airborne(g, lift, tuck) {
  const out = mkGrid();
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (g[y][x] === '.') continue;
    let ny = y - lift;
    if (tuck && y > HIP) ny -= R((y - HIP) * tuck);
    if (ny >= 0 && ny < GH) out[ny][x] = g[y][x];
  }
  return out;
}
// radiantSkin (8B-0 BODYFLARE law): one ramp step BRIGHTER, the hero's own cold
// accents pulse, a broken gold rim on the contour via the hero's OWN gold key.
// Palette-only — the silhouette can never desync.
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
// NEW (8C-0 R2): sparse contour aura — the "holy power living inside the body"
// read for the key combo moments. A handful of LIGHT cells hugging the OUTSIDE
// of the silhouette (never covering it): gold/ivory winks at the row edges,
// white/ivory crown ticks on top, biased upward because light rises. It pairs
// with radiantSkin: the skin brightens the inside, the aura leaks at the seams.
// Deterministic and BOUNDED — asserted 5..34 cells per frame, so "tasteful, not
// a glowing blob" is a law, not a hope.
function contourAura(fx, body, seed, density) {
  let n = 0;
  for (let y = 0; y < GH; y++) {
    let lo = -1, hi = -1;
    for (let x = 0; x < GW; x++) if (body[y][x] !== '.') { if (lo < 0) lo = x; hi = x; }
    if (lo < 0) continue;
    const bias = y < GH * 0.55 ? 1.15 : 0.7;               // light favors the upper body
    if (rnd(y, seed) < density * bias && lo > 0 && body[y][lo - 1] === '.' && fx[y][lo - 1] === '.') {
      fx[y][lo - 1] = rnd(y, seed + 9) < 0.3 ? 'I' : 'y'; n++;
    }
    if (rnd(y, seed + 4) < density * bias && hi < GW - 1 && body[y][hi + 1] === '.' && fx[y][hi + 1] === '.') {
      fx[y][hi + 1] = rnd(y, seed + 13) < 0.3 ? 'I' : 'y'; n++;
    }
  }
  for (let x = 0; x < GW; x += 3) {                        // crown ticks
    let top = -1;
    for (let y = 0; y < GH; y++) if (body[y][x] !== '.') { top = y; break; }
    if (top > 0 && rnd(x, seed + 21) < density * 0.9 && fx[top - 1][x] === '.') {
      fx[top - 1][x] = rnd(x, seed + 27) < 0.35 ? 'W' : 'I'; n++;
    }
  }
  return n;
}
// the body goes to / comes back from light. Both directions are BOTTOM-UP so the
// law holds in each: departure lifts off the feet first, arrival knits from the
// feet up. Light rises in both halves of the teleport.
function goToLight(g, amt, mode) {
  const out = g.map(r => r.slice());
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (out[y][x] === '.') continue;
    const d = Math.min(1, Math.max(0, (y - 8) / (FLOOR - 8)));       // 0 crown, 1 feet
    const w = mode === 'unmake' ? (0.25 + 1.15 * d) : (1.30 - 1.15 * d);
    if (rnd(x * 3.1 + y * 1.7, 9) < amt * w) out[y][x] = '.';
  }
  return out;
}
function drawSword(g, sho, hx, hy, angleDeg, reach, opts = {}) {
  const { twoHand = false } = opts;
  if (twoHand) lineC(g, sho[0] - 2, sho[1] + 1, hx - 1, hy + 1, '1', false);
  lineC(g, sho[0], sho[1], hx, hy, '2', true);
  put(g, hx, hy, '3'); put(g, hx - 1, hy, '3'); put(g, hx, hy + 1, '1');
  const a = RAD(angleDeg), dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
  const gx = hx + dx, gy = hy + dy;
  for (let s = -1; s <= 1; s++) put(g, R(gx + px * s), R(gy + py * s), s === 0 ? 'l' : '1');
  for (let i = 2; i <= reach; i++) {
    const bx = R(hx + dx * i), by = R(hy + dy * i);
    put(g, bx, by, '4');
    put(g, R(bx + px), R(by + py), 'l');
    put(g, R(bx - px), R(by - py), '3');
  }
  put(g, R(hx + dx * (reach + 1)), R(hy + dy * (reach + 1)), 'L');
  return [R(hx + dx * reach), R(hy + dy * reach)];
}

// ---------- effect toolkit (fx layers: LIGHT + neutral steel only) ----------
const DIMK = { W: 'I', I: 'y', y: 'o', o: 'G', G: 'u', '5': '3', '4': '2', '3': '2', '2': '1' };
// arc / BOW smear. Combo A's signature is a DISTANT pivot + large radius, which
// turns the 8B-1 crescent into a long shallow bow — an arc geometrically, a LINE
// to the eye. Same anatomy per cross-section (outer edge W -> body I -> inner y
// -> belly rim o -> sparse G), so it is the same approved SLASH band.
function arcSmear(fx, px0, py0, r, a0deg, a1deg, ramp, opts = {}) {
  const { maxW = 3, broken = false, dim = false, belly = null, skim = false } = opts;
  const K = k => (dim ? (DIMK[k] || k) : k);
  const a0 = RAD(a0deg), a1 = RAD(a1deg);
  const steps = Math.ceil(Math.abs(a1 - a0) * r * 1.7);
  const skimmed = new Set();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = a0 + (a1 - a0) * t;
    if (broken && (i % 9 < 4)) continue;
    const w = Math.max(1, R(maxW * (0.30 + 0.70 * Math.sin(Math.min(1, t * 1.12) * Math.PI * 0.58))));
    for (let j = 0; j < w; j++) {
      const rr = r - j;
      const x = R(px0 + Math.cos(a) * rr), y = R(py0 + Math.sin(a) * rr);
      if (y >= FLOOR - 1) { if (skim) skimmed.add(x); continue; }
      let k = ramp[Math.min(ramp.length - 1, j)];
      if (t < 0.22) k = DIMK[k] || k;
      putB(fx, x, y, K(k));
    }
    if (belly && t > 0.35 && t < 0.72 && rnd(i, 7) < 0.4) {
      const rr = r - w;
      const x = R(px0 + Math.cos(a) * rr), y = R(py0 + Math.sin(a) * rr);
      if (y < FLOOR - 1) putB(fx, x, y, K(belly));
    }
  }
  let n = 0;
  for (const x of [...skimmed].sort((p, q) => p - q)) {
    if (n++ % 2) continue;
    putB(fx, x, FLOOR - 1, K('o')); if (rnd(x, 13) < 0.5) putB(fx, x + 1, FLOOR, K('u'));
  }
}
// straight speed LINES — the combo A motion signature (dive line, chase lines).
// A tapered ray laid along a free axis: hot core, gold rims, 1px air gap off the
// blade band so it reads as motion rather than a thicker sword.
function speedLine(fx, x0, y0, x1, y1, opts = {}) {
  const { core = 'W', rim = 'y', dim = false, gap = 2, broken = 0 } = opts;
  const K = k => (dim ? (DIMK[k] || k) : k);
  const dx = x1 - x0, dy = y1 - y0, len = Math.max(Math.abs(dx), Math.abs(dy));
  const nx = -dy / (Math.hypot(dx, dy) || 1), ny = dx / (Math.hypot(dx, dy) || 1);
  for (let i = 0; i <= len; i++) {
    const t = i / Math.max(1, len);
    if (broken && (i % broken) < Math.max(1, broken - 2)) continue;
    const x = R(x0 + dx * t), y = R(y0 + dy * t);
    putB(fx, x, y, K(t > 0.72 ? core : (t > 0.4 ? 'I' : rim)));
    if (t > 0.5) { putB(fx, R(x + nx * gap), R(y + ny * gap), K(rim)); putB(fx, R(x - nx * gap), R(y - ny * gap), K(rim)); }
    else if (t > 0.2 && i % 2 === 0) putB(fx, R(x + nx * gap), R(y + ny * gap), K('o'));
  }
}
function impactStar(fx, cx, cy, big = false) {
  const len = big ? 4 : 3;
  put(fx, cx, cy, 'W');
  if (big) { put(fx, cx + 1, cy, 'W'); put(fx, cx, cy + 1, 'W'); put(fx, cx + 1, cy + 1, 'W'); }
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
    for (let i = 1; i <= len; i++) put(fx, cx + d[0] * i, cy + d[1] * i, i === 1 ? 'W' : (i === len ? 'o' : 'y'));
    if (big) put(fx, cx + d[0] * (len + 2), cy + d[1] * (len + 2), 'G');
  });
  const dd = big ? 3 : 2;
  [[dd, dd], [-dd, dd], [dd, -dd], [-dd, -dd]].forEach(([dx, dy]) => put(fx, cx + dx, cy + dy, 'o'));
}
function haloSnap(fx, cx, cy, r) {
  ringC(fx, cx, cy, r, 'y');
  ringC(fx, cx, cy, r - 2.5, 'I', { dash: 12, phase: 0.5 });
  [[0, -r], [0, r], [-r, 0], [r, 0]].forEach(([dx, dy]) => putB(fx, cx + dx, cy + dy, 'W'));
  putB(fx, cx, cy - r - 2, 'W'); putB(fx, cx, cy + r + 2, 'W');
}
function groundGlint(fx, cx, hot) {
  [[-6, 0], [-3, -1], [0, -1], [3, -1], [6, 0]].forEach(([dx, dy], i) =>
    putB(fx, cx + dx, FLOOR + dy, i % 2 ? 'o' : 'y'));
  if (hot) { putB(fx, cx, FLOOR, 'W'); putB(fx, cx - 8, FLOOR, 'u'); putB(fx, cx + 8, FLOOR, 'u'); }
}
// THE MARK — the ground halo pressed into the floor at the S4 origin. This is the
// anchor the ECHO RETURN teleports back to, so it must be a distinct, readable
// shape the eye can remember for a full second.
function theMark(fx, cx, level) {
  const ry = 3, rx = level > 0 ? 11 : 9;
  ellipseRing(fx, cx, FLOOR - 1, rx, ry, level > 1 ? 'y' : 'o', { dash: level > 1 ? 0 : 12, phase: 0.5 });
  ellipseRing(fx, cx, FLOOR - 1, rx - 4, ry - 1.4, level > 1 ? 'I' : 'G', { dash: 10, phase: 0.5 });
  if (level > 0) { putB(fx, cx - rx, FLOOR - 1, 'W'); putB(fx, cx + rx, FLOOR - 1, 'W'); }
  if (level > 1) { putB(fx, cx, FLOOR - 1 - ry, 'W'); putB(fx, cx, FLOOR - 1 + ry, 'W'); }
}
function gatherMotes(fx, tx, ty, pts) {
  pts.forEach(([dx, dy], i) => put(fx, tx + dx, ty + dy, i === 0 ? 'y' : (i === 1 ? 'G' : 'u')));
}

// ---------- frame factory ----------
function makeFrame(o) {
  let body;
  if (o.dive) {
    body = diveBody();                                   // R2: the rotated plunge body
  } else {
    body = baseBody();
    eraseBlade(body);
    if (o.lunge) lunge(body, o.lunge[0], o.lunge[1]);
    if (o.lean) body = moveUpper(body, o.lean[0], o.lean[1]);
    if (o.cape) capeFlow(body, o.cape[0], o.cape[1]);
    if (o.air) body = airborne(body, o.air[0], o.air[1]);
  }
  const lift = o.air ? o.air[0] : 0;
  const sho = o.sho || [SHO[0] + (o.lean ? o.lean[0] : 0), SHO[1] + (o.lean ? o.lean[1] : 0) - lift];
  const tip = drawSword(body, sho, o.hand[0], o.hand[1], o.angle, o.reach, { twoHand: !!o.twoHand });
  const bodyPre = body.map(r => r.slice());
  if (o.radiant) body = radiantSkin(body, o.seed || 11, o.rim === undefined ? 0.6 : o.rim);
  if (o.ghost) body = goToLight(body, o.ghostAmt, o.ghost);
  const fxB = mkGrid(), fxF = mkGrid(), meta = { motes: [], tip };
  if (o.fx) o.fx(fxB, fxF, meta);
  if (o.aura) meta.aura = contourAura(fxB, body, (o.seed || 11) + 2, o.aura);   // R2: bounded body radiance
  return { body, bodyPre, fxB, fxF, meta, tag: o.tag, phase: o.phase, hold: o.hold,
           where: o.where, air: !!o.air || !!o.dive, radiant: !!o.radiant, ghost: o.ghost || null,
           flare: !!o.flare };
}
const mote = (fx, meta, x, y, k) => { put(fx, x, y, k); meta.motes.push([x, y]); };

// =====================================================================
// NEW REUSABLE LIGHT ECLIPSE SUB-EFFECTS (8C-0 additions to the family)
// Every one is composed from 8B-0 parts — no new ramp, no new shape language.
// =====================================================================

// --- SUNGLAIVE (25x25) — the thrown slash projectile. -----------------
// Straight off the 8B-0 reuse map: "Ranged / thrown light — the MICRO glyph as
// the projectile core, ray tips as its trail." A SLASH crescent wrapped around a
// MICRO GLYPH core. Authored traveling RIGHT like every hero clip.
const GL = { W: 25, H: 25, CX: 11, CY: 12 };
function glaiveCrescent(g, cx, cy, opts = {}) {
  const { span = 9, bulge = 6, dim = 0, broken = false } = opts;
  const K = k => (dim ? (DIMK[k] || k) : k);
  for (let dy = -span; dy <= span; dy++) {
    if (broken && (Math.abs(dy) % 5 < 2)) continue;
    const t = dy / span, s = Math.cos(t * Math.PI / 2);
    const xo = cx + R(bulge * s);
    const w = Math.max(1, R(1 + 2.6 * s));
    put(g, xo, cy + dy, K(w > 1 ? 'W' : 'I'));                    // leading (travel) edge
    for (let i = 1; i < w - 1; i++) put(g, xo - i, cy + dy, K('I'));
    if (w > 1) put(g, xo - w + 1, cy + dy, K('y'));               // inner edge
    if (Math.abs(dy) <= 4) {
      put(g, xo - w, cy + dy, K('o'));                            // belly trailing rim
      if (rnd(dy, 3) < 0.5) put(g, xo - w - 1, cy + dy, K('G'));
    }
  }
}
function microGlyph(g, cx, cy, level) {
  disc(g, cx, cy, 1.1, 'W');
  ringC(g, cx, cy, 3, 'y', { dash: 8, phase: level ? 1.5 : 0.5, behind: false });
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => put(g, cx + d[0] * 5, cy + d[1] * 5, 'W'));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(d => put(g, cx + d[0] * 4, cy + d[1] * 4, 'o'));
}
function glaiveFrames() {
  const out = [];
  // GL0 BIRTH — the crescent peels off the blade; the core kernel ignites.
  let g = mkGrid(GL.W, GL.H);
  glaiveCrescent(g, GL.CX, GL.CY, { span: 6, bulge: 4 });
  disc(g, GL.CX - 1, GL.CY, 1.1, 'W');
  put(g, GL.CX - 4, GL.CY - 3, 'y'); put(g, GL.CX - 4, GL.CY + 3, 'y');
  out.push(g);
  // GL1 TRAVEL — full crescent + MICRO GLYPH core + comb trail behind.
  g = mkGrid(GL.W, GL.H);
  glaiveCrescent(g, GL.CX, GL.CY, { span: 9, bulge: 6 });
  microGlyph(g, GL.CX - 3, GL.CY, 0);
  for (let i = 0; i < 4; i++) {                                    // trail comb (ray tips)
    const x = GL.CX - 8 - i * 2;
    put(g, x, GL.CY - 5 + i, i % 2 ? 'o' : 'y'); put(g, x, GL.CY + 5 - i, i % 2 ? 'o' : 'G');
  }
  put(g, GL.CX + 8, GL.CY, 'W');                                   // detached leading glint
  out.push(g);
  // GL2 TRAVEL — the held-shimmer beat (loops GL1<->GL2, the R0<->R1 law).
  g = mkGrid(GL.W, GL.H);
  glaiveCrescent(g, GL.CX, GL.CY, { span: 9, bulge: 6 });
  microGlyph(g, GL.CX - 3, GL.CY, 1);
  for (let i = 0; i < 4; i++) {
    const x = GL.CX - 9 - i * 2;
    put(g, x, GL.CY - 4 + i, i % 2 ? 'G' : 'o'); put(g, x, GL.CY + 4 - i, i % 2 ? 'u' : 'o');
  }
  put(g, GL.CX + 9, GL.CY - 1, 'W'); put(g, GL.CX + 8, GL.CY + 2, 'I');
  put(g, GL.CX - 2, GL.CY - 9, 'I'); put(g, GL.CX - 1, GL.CY + 9, 'I');
  out.push(g);
  return out;
}

// --- CORRIDOR (72x17) — the cut path / beam residue. ------------------
// The lane the glaive opened and the hero cut through. It is the bed the ECHO
// RETURN lands in, so its fade is the clock the teleport is timed against.
const CO = { W: 72, H: 17, CY: 8, MARK: 5 };
function corridorFrames() {
  const out = [];
  // CR0 CUT — fresh: hot core line, ivory flanks, gold rims. The mark node at the
  // left end is the origin; the right end feeds the pillar.
  // A CUT, not a wall: a thin clean lane — hot core, one ivory flank each side,
  // sparse gold rims. Thickness would read as a beam weapon; the corridor is the
  // *seam* the glaive and the blade opened in the air.
  let g = mkGrid(CO.W, CO.H);
  for (let x = CO.MARK; x < CO.W; x++) {
    put(g, x, CO.CY, x % 7 === 3 ? 'I' : 'W');
    put(g, x, CO.CY - 1, 'I'); put(g, x, CO.CY + 1, 'I');
    if (x % 3 === 0) put(g, x, CO.CY - 2, 'y');
    if (x % 3 === 1) put(g, x, CO.CY + 2, 'y');
    if (x % 9 === 0) { put(g, x, CO.CY - 3, 'o'); put(g, x + 1, CO.CY + 3, 'o'); }
  }
  spark(g, CO.MARK, CO.CY, 2, 'W', 'y');
  out.push(g);
  // CR1 FADE — broken into marching dashes one step dimmer; motes lift off it.
  // THE RETURN LANDS HERE — the bed is still clearly lit.
  g = mkGrid(CO.W, CO.H);
  for (let x = CO.MARK; x < CO.W; x++) {
    if (x % 6 < 3) continue;
    put(g, x, CO.CY, 'I');
    put(g, x, CO.CY - 1, 'y'); put(g, x, CO.CY + 1, 'y');
    if (x % 4 === 0) put(g, x, CO.CY - 2, 'o');
  }
  for (let i = 0; i < 7; i++) put(g, CO.MARK + 4 + i * 9, CO.CY - 4 - (i % 3), i % 2 ? 'I' : 'G');
  spark(g, CO.MARK, CO.CY, 1, 'I', 'o');
  out.push(g);
  // CR2 GHOST — sparse bronze dashes, the last motes high. The mark winks out.
  g = mkGrid(CO.W, CO.H);
  for (let x = CO.MARK; x < CO.W; x++) {
    if (x % 11 < 7) continue;
    put(g, x, CO.CY, 'G'); put(g, x + 1, CO.CY, 'u');
  }
  for (let i = 0; i < 6; i++) put(g, CO.MARK + 7 + i * 11, CO.CY - 6 - (i % 3), i % 2 ? 'u' : 'G');
  put(g, CO.MARK, CO.CY, 'u');
  out.push(g);
  return out;
}

// --- NOON PILLAR (41x72) — the climax. --------------------------------
// The derivation that keeps this family-pure: the pillar IS the EMBLEM'S NORTH
// RAY at world scale. Straight, tapered base->tip (the ray law), standing on a
// GROUND HALO, crowned by a true-circle corona with cardinal rays and
// cross-sparks (the emblem head). It RISES — the exact inverse of the boss's
// Eclipse Breaker, which rams the floor and sinks ash.
const PB = { W: 41, H: 72, CX: 20, BASE: 68 };
function pillarColumn(g, topY, opts = {}) {
  const { dim = false, broken = false } = opts;
  const K = k => (dim ? (DIMK[k] || k) : k);
  for (let y = topY; y <= PB.BASE; y++) {
    if (broken && (y % 7 < 3)) continue;
    const t = (y - topY) / Math.max(1, PB.BASE - topY);            // 0 tip, 1 base
    const half = 1 + R(5.0 * (0.34 + 0.66 * t));                   // taper base -> tip
    for (let d = -half; d <= half; d++) {
      const ad = Math.abs(d);
      const k = ad <= 1 ? 'W' : (ad === 2 ? 'I' : (ad <= half - 1 ? 'y' : 'o'));
      putB(g, PB.CX + d, y, K(k));
    }
    if (rnd(y, 5) < 0.45) putB(g, PB.CX - half - 1, y, K('G'));
    if (rnd(y, 8) < 0.45) putB(g, PB.CX + half + 1, y, K('G'));
  }
}
function pillarGround(g, level) {
  ellipseRing(g, PB.CX, PB.BASE + 2, 16, 3.5, level > 1 ? 'y' : 'G', { dash: level > 1 ? 0 : 14, phase: 0.5 });
  ellipseRing(g, PB.CX, PB.BASE + 2, 11, 2.4, level > 1 ? 'I' : 'u', { dash: 10, phase: 0.5 });
  if (level > 0) { putB(g, PB.CX - 16, PB.BASE + 2, 'W'); putB(g, PB.CX + 16, PB.BASE + 2, 'W'); }
  if (level > 1) for (let i = 0; i < 5; i++) {
    const x = PB.CX - 12 + i * 6; putB(g, x, PB.BASE + 5, i % 2 ? 'o' : 'y');
  }
}
function pillarCrown(g, cy, level) {
  if (level > 1) {
    ringC(g, PB.CX, cy, 6, 'y', { behind: false });
    ringC(g, PB.CX, cy, 4.5, 'I');
    disc(g, PB.CX, cy, 3.1, 'W');
    [[1, 0], [-1, 0], [0, -1]].forEach(d => axisRay(g, PB.CX, cy, d, 8, 14, ['W', 'I', 'y', 'o', 'G'], { tip: true }));
    [[1, -1], [-1, -1]].forEach(d => axisRay(g, PB.CX, cy, d, 7, 11, ['y', 'o', 'G'], { wide: false }));
    ringC(g, PB.CX, cy, 17, 'G', { dash: 20, phase: 0.5 });
    spark(g, PB.CX - 12, cy + 5, 1); spark(g, PB.CX + 12, cy + 5, 1);
  } else if (level > 0) {
    ringC(g, PB.CX, cy, 6, 'y', { dash: 12, phase: 0.5 });
    disc(g, PB.CX, cy, 1.4, 'I');
    [[1, 0], [-1, 0], [0, -1]].forEach(d => axisRay(g, PB.CX, cy, d, 8, 11, ['o', 'G'], { wide: false }));
  }
}
function pillarFrames() {
  const out = [];
  // PL0 SEED — GATHER: the ground halo presses in, motes converge on the point.
  let g = mkGrid(PB.W, PB.H);
  pillarGround(g, 0);
  disc(g, PB.CX, PB.BASE - 1, 1.4, 'W');
  ringC(g, PB.CX, PB.BASE - 1, 4, 'I', { dash: 10, phase: 0.5 });
  [[0, -14], [-9, -10], [9, -11], [-14, -4], [14, -5]].forEach(([dx, dy], i) => {
    putB(g, PB.CX + dx, PB.BASE + dy, i % 2 ? 'y' : 'I');
    putB(g, PB.CX + R(dx * 1.25), PB.BASE + R(dy * 1.25), 'G');
    putB(g, PB.CX + R(dx * 1.5), PB.BASE + R(dy * 1.5), 'u');
  });
  out.push(mirrorH(g));
  // PL1 ERUPT — IGNITE: the shaft tears up out of the floor to ~2/3 height.
  g = mkGrid(PB.W, PB.H);
  pillarGround(g, 2);
  pillarColumn(g, 26);
  pillarCrown(g, 26, 1);
  for (let i = 0; i < 6; i++) {                                    // ground-skim ticks
    const x = PB.CX - 15 + i * 6;
    putB(g, x, PB.BASE, i % 2 ? 'o' : 'y'); putB(g, x + 2, PB.BASE + 1, 'G');
  }
  out.push(mirrorH(g));
  // PL2 NOON — RELEASE, held: full height, the emblem crown opens at the head.
  g = mkGrid(PB.W, PB.H);
  pillarGround(g, 2);
  pillarColumn(g, 22);
  pillarCrown(g, 20, 2);
  [[-13, 40], [13, 42], [-17, 52], [17, 50]].forEach(([dx, dy]) => putB(g, PB.CX + dx, dy, 'I'));
  out.push(mirrorH(g));
  // PL3 BREAK — DISSOLVE: the shaft marches into dashes, the crown fragments.
  // >>> THE HERO IS ALREADY BACK AT THE MARK ON THIS FRAME. <<<
  g = mkGrid(PB.W, PB.H);
  pillarGround(g, 1);
  pillarColumn(g, 24, { broken: true, dim: true });
  ringC(g, PB.CX, 20, 6, 'o', { dash: 10, phase: 0.5 });
  ringC(g, PB.CX, 18, 17, 'G', { dash: 16, phase: 1.5 });
  [[-10, 12], [10, 10], [-5, 6], [5, 5]].forEach(([dx, dy]) => putB(g, PB.CX + dx, dy, 'I'));
  out.push(mirrorH(g));
  // PL4 RESIDUE — the pillar burns out FROM THE BASE UP: the floor end is already
  // dark and only the risen light is left, lifting off the top. This is the
  // "motes rise, light never ashes" law at world scale — and it is the exact
  // inverse of the boss, whose detonation leaves ash settling on the ground.
  g = mkGrid(PB.W, PB.H);
  for (let y = 10; y <= 38; y += 4) { putB(g, PB.CX, y, 'G'); putB(g, PB.CX + 1, y + 2, 'u'); }
  [[-7, 20], [8, 17], [-3, 10], [4, 7], [-9, 28], [10, 25], [-2, 3], [3, 5]].forEach(([dx, dy], i) =>
    putB(g, PB.CX + dx, dy, i % 2 ? 'u' : 'G'));
  putB(g, PB.CX - 2, 1, 'I'); putB(g, PB.CX + 3, 2, 'I');
  out.push(mirrorH(g));
  return out;
}

// --- ECHO REFORM (33x33) — the arrival. -------------------------------
// The 8B-0 DISSOLVE grammar RUN BACKWARDS: motes converge on fixed spokes
// (mean radius contracts — the GATHER law), the silhouette knits from the feet
// UP, and the HALO SNAP ring punctuates the landing. Nothing new: the family
// already owns every shape here; only the direction of time is new.
const RF = { W: 33, H: 33, CX: 16, CY: 16 };
const SP8 = [0, 45, 90, 135, 180, 225, 270, 315].map(d => RAD(d));
function reformFrames() {
  const out = [];
  // RF0 CALL — far motes on the 8 spokes, tails pointing IN.
  let g = mkGrid(RF.W, RF.H);
  SP8.forEach(a => {
    const r = 13;
    putB(g, R(RF.CX + Math.cos(a) * r), R(RF.CY + Math.sin(a) * r), 'y');
    putB(g, R(RF.CX + Math.cos(a) * (r + 1.7)), R(RF.CY + Math.sin(a) * (r + 1.7)), 'G');
    putB(g, R(RF.CX + Math.cos(a) * (r + 3.2)), R(RF.CY + Math.sin(a) * (r + 3.2)), 'u');
  });
  ringC(g, RF.CX, RF.CY, 11, 'G', { dash: 26, phase: 0.5 });
  putB(g, RF.CX, RF.CY, 'u');
  out.push(g);
  // RF1 KNIT — motes close in; a mote column draws the silhouette bottom-up.
  g = mkGrid(RF.W, RF.H);
  SP8.forEach(a => {
    const r = 7;
    putB(g, R(RF.CX + Math.cos(a) * r), R(RF.CY + Math.sin(a) * r), 'I');
    putB(g, R(RF.CX + Math.cos(a) * (r + 1.7)), R(RF.CY + Math.sin(a) * (r + 1.7)), 'y');
  });
  ringC(g, RF.CX, RF.CY, 7.5, 'G', { dash: 20, phase: 0 });
  for (let y = RF.CY + 9; y >= RF.CY - 5; y -= 2) putB(g, RF.CX, y, y > RF.CY + 3 ? 'W' : (y > RF.CY - 2 ? 'I' : 'y'));
  disc(g, RF.CX, RF.CY, 1.1, 'W');
  out.push(g);
  // RF2 SNAP — HALO H0 SNAP: the arrival punctuation. The hero is there.
  g = mkGrid(RF.W, RF.H);
  ringC(g, RF.CX, RF.CY, 8, 'y');
  ringC(g, RF.CX, RF.CY, 6, 'I', { dash: 12, phase: 0.5 });
  [[0, -8], [0, 8], [-8, 0], [8, 0]].forEach(([dx, dy]) => putB(g, RF.CX + dx, RF.CY + dy, 'W'));
  putB(g, RF.CX, RF.CY - 10, 'W'); putB(g, RF.CX, RF.CY + 10, 'W');
  disc(g, RF.CX, RF.CY, 2.1, 'W');
  ringC(g, RF.CX, RF.CY, 3.4, 'I');
  out.push(mirrorH(g));
  return out;
}

const GLAIVE = glaiveFrames();
const CORRIDOR = corridorFrames();
const PILLAR = pillarFrames();
const REFORM = reformFrames();

// =====================================================================
// THE FIVE STEPS
// =====================================================================
const STEPS = [];

// ---- S1 SUNSTEP — grounded LEVEL cut opener (the bow, not an arc) ----
// Pivot (22,62) r40: a 46deg sweep at a distant pivot = a long shallow bow that
// bulges UP through the middle. The blade rotates only 26deg across the whole
// step — a wrist cut. Nothing in DAYBREAK moves like this.
const BOW = [22, 62, 40];
STEPS.push({
  name: 'S1 SUNSTEP', hands: 1, frames: [
    makeFrame({ tag: 'W1 SET', phase: 'WINDUP 4', hold: 4, where: 'OPENING GROUND',
      lean: [-2, 0], cape: [1, 0], hand: [19, 22], angle: -14, reach: 11,
      fx: (b, f, m) => { put(f, m.tip[0] + 1, m.tip[1] - 1, 'W'); put(f, m.tip[0] - 3, m.tip[1] + 1, 'W'); put(f, m.tip[0] + 3, m.tip[1] - 3, 'y'); } }),
    makeFrame({ tag: 'A1A SHEAR', phase: 'ACTIVE EARLY 2', hold: 2, where: 'OPENING GROUND',
      lean: [1, 0], lunge: [2, 0], hand: [23, 22], angle: -6, reach: 12,
      fx: (b) => arcSmear(b, BOW[0], BOW[1], BOW[2], -112, -84, ['W', 'I'], { maxW: 2 }) }),
    makeFrame({ tag: 'A1B HIT', phase: 'ACTIVE LATE 4 - HOLD', hold: 4, where: 'OPENING GROUND',
      lean: [2, 0], cape: [-1, -1], lunge: [3, 1], hand: [26, 22], angle: 6, reach: 12,
      fx: (b, f) => {
        arcSmear(b, BOW[0], BOW[1], BOW[2], -112, -64, ['W', 'I', 'y'], { maxW: 3, belly: 'o' });
        spark(f, 39, 23, 1); put(f, 34, 18, 'W');
      } }),
    makeFrame({ tag: 'L1 FOLLOW', phase: 'LINK 4', hold: 4, where: 'OPENING GROUND',
      lean: [1, 0], hand: [26, 22], angle: 10, reach: 11,
      fx: (b, f, m) => {
        arcSmear(b, BOW[0], BOW[1], BOW[2], -108, -66, ['W', 'I'], { maxW: 2, broken: true, dim: true });
        mote(f, m, 30, 17, 'I'); mote(f, m, 24, 15, 'u');
      } }),
  ],
});

// ---- S2 ZENITH DIVE — leap, transform, plunge ----
STEPS.push({
  name: 'S2 ZENITH DIVE', hands: 1, frames: [
    makeFrame({ tag: 'W2 COIL', phase: 'WINDUP 4', hold: 4, where: 'OPENING GROUND',
      lean: [0, 2], cape: [0, 1], hand: [21, 25], angle: 155, reach: 10,
      fx: (b, f, m) => { groundGlint(b, 21, false); gatherMotes(f, 22, 20, [[-4, -3], [5, -2], [-6, 2]]); } }),
    makeFrame({ tag: 'J2 LAUNCH', phase: 'RISE 2', hold: 2, where: 'LEAVING THE FLOOR',
      air: [3, 0.25], lean: [0, -1], cape: [0, 2], hand: [23, 16], angle: -80, reach: 11,
      fx: (b, f, m) => {
        groundGlint(b, 21, true);
        speedLine(b, 20, 30, 21, 20, { core: 'W', rim: 'y', gap: 2 });
        mote(f, m, 15, 24, 'I'); mote(f, m, 27, 23, 'y');
      } }),
    makeFrame({ tag: 'T2 ECLIPSE', phase: 'APEX 5 - HOLD', hold: 5, where: 'AIRBORNE APEX',
      air: [7, 0.22], radiant: true, seed: 23, rim: 1, flare: true, aura: 0.4,
      hand: [22, 13], angle: -90, reach: 12,
      fx: (b, f, m) => {
        haloSnap(b, 20, 14, 11);
        axisRay(b, 20, 14, [0, -1], 12, 13, ['W', 'I', 'y'], { tip: true, wide: false });
        axisRay(b, 20, 14, [1, 0], 12, 13, ['I', 'y', 'o'], { wide: false });
        axisRay(b, 20, 14, [-1, 0], 12, 13, ['I', 'y', 'o'], { wide: false });
        ringC(b, 20, 12, 15, 'G', { dash: 24, phase: 0.5 });
        spark(b, 9, 6, 1); spark(b, 31, 6, 1);
        disc(f, 20, 14, 1.4, 'W'); put(f, 20, 12, 'I'); put(f, 20, 16, 'I');
        mote(f, m, 14, 2, 'I'); mote(f, m, 26, 1, 'I');
      } }),
    // R2 — the dive is a TURN. The body has rolled over the apex and rides
    // horizontal: head leading, face down, cape trailing up the back, both hands
    // driving the sword down-forward so the blade LEADS the line to the impact
    // point. The broken dim arc over the back is the path the blade traced
    // through the turn; the apex light is LEFT BEHIND and rises (the exact
    // inverse of the boss air eclipse, whose SOUTH ray aims at the ground).
    makeFrame({ tag: 'D2A PLUNGE', phase: 'FALL 2 - THE TURN', hold: 2, where: 'AIRBORNE - MID TURN',
      dive: true, radiant: true, seed: 31, rim: 0.7, aura: 0.3,
      sho: [29, 15], hand: [31, 20], angle: 74, reach: 10, twoHand: true,
      fx: (b, f, m) => {
        arcSmear(b, 22, 14, 13, -170, -20, ['y', 'o', 'G'], { maxW: 2, broken: true, dim: true });
        speedLine(b, 10, 2, 17, 13, { core: 'I', rim: 'o', gap: 1, dim: true });
        speedLine(b, 16, 0, 22, 9, { core: 'I', rim: 'o', gap: 1, dim: true });
        ringC(b, 20, 3, 7, 'G', { dash: 12, phase: 0.5, arcFrom: -Math.PI, arcTo: 0 });  // apex light left behind
        put(f, m.tip[0] + 1, m.tip[1] + 2, 'W'); put(f, m.tip[0] + 2, m.tip[1] + 4, 'I'); // the blade LEADS - point glints ahead of the strike
        mote(f, m, 14, 1, 'I'); mote(f, m, 27, 2, 'y');
      } }),
    // R2 — the slam completes the rotation: upright again but WEIGHT SUNK — deep
    // crouch, wide stance, cape thrown forward by the stop, both hands driving
    // the blade vertically into the floor. The impact star sits at the plant.
    makeFrame({ tag: 'D2B SLAM', phase: 'CONTACT 5 - HOLD', hold: 5, where: 'GROUND CONTACT',
      lean: [1, 2], cape: [1, 1], lunge: [2, 2], radiant: true, seed: 37, rim: 0.6, aura: 0.45, flare: true,
      hand: [26, 20], angle: 88, reach: 11, twoHand: true,
      fx: (b, f, m) => {
        speedLine(b, 24, 3, 26, 14, { core: 'W', rim: 'y', gap: 2 });
        groundGlint(b, 26, true);
        for (let i = 0; i < 9; i++) { const x = 13 + i * 3; putB(b, x, FLOOR - 1, i % 2 ? 'o' : 'y'); if (i % 2) putB(b, x + 1, FLOOR, 'u'); }
        impactStar(f, 27, 30, true);
        mote(f, m, 18, 23, 'I'); mote(f, m, 35, 24, 'y');
      } }),
    makeFrame({ tag: 'R2 RISE', phase: 'RECOVER 4', hold: 4, where: 'GROUND',
      lean: [0, 0], hand: [25, 23], angle: 45, reach: 11,
      fx: (b, f, m) => {
        ellipseRing(b, 27, FLOOR - 1, 12, 3, 'G', { dash: 14, phase: 0.5 });
        mote(f, m, 21, 18, 'I'); mote(f, m, 33, 16, 'u'); mote(f, m, 27, 13, 'G');
      } }),
  ],
});

// ---- S3 SUNGLAIVE — the light leaves the sword ----
STEPS.push({
  name: 'S3 SUNGLAIVE', hands: 1, frames: [
    makeFrame({ tag: 'W3 DRAW', phase: 'WINDUP 3', hold: 3, where: 'OPENING GROUND',
      lean: [-2, 0], cape: [1, 0], hand: [20, 21], angle: -20, reach: 11,
      fx: (b, f, m) => {
        gatherMotes(f, m.tip[0], m.tip[1], [[2, -2], [4, 1], [-2, -4]]);
        put(f, m.tip[0], m.tip[1], 'W'); put(f, m.tip[0] - 3, m.tip[1] + 1, 'I');
      } }),
    makeFrame({ tag: 'A3A CAST', phase: 'ACTIVE EARLY 2', hold: 2, where: 'OPENING GROUND',
      lean: [1, 0], hand: [24, 21], angle: -8, reach: 12,
      fx: (b, f, m) => {
        glaiveCrescent(b, 38, 19, { span: 5, bulge: 3 });
        disc(f, 36, 19, 1.1, 'W');
        speedLine(b, 26, 25, 34, 21, { core: 'I', rim: 'o', gap: 1, dim: true });
      } }),
    makeFrame({ tag: 'A3B RELEASE', phase: 'ACTIVE LATE 4 - HOLD', hold: 4, where: 'OPENING GROUND',
      lean: [2, 0], cape: [-1, 0], lunge: [2, 0], hand: [26, 21], angle: 0, reach: 12,
      fx: (b, f, m) => {
        // the glaive is BORN and already leaving frame; the blade is left BARE.
        glaiveCrescent(b, 41, 20, { span: 8, bulge: 5 });
        microGlyph(b, 38, 20, 0);
        for (let i = 0; i < 3; i++) speedLine(b, 27 + i, 14 + i * 6, 35 + i, 16 + i * 5, { core: 'I', rim: 'o', gap: 1, dim: true });
        put(f, 33, 15, 'W'); mote(f, m, 30, 12, 'I'); mote(f, m, 36, 10, 'y');
      } }),
    makeFrame({ tag: 'L3 FOLLOW', phase: 'LINK 3', hold: 3, where: 'OPENING GROUND',
      lean: [1, 0], hand: [26, 22], angle: 8, reach: 11,
      fx: (b, f, m) => {
        for (let i = 0; i < 4; i++) putB(b, 34 + i * 2, 18 + (i % 2) * 3, i % 2 ? 'G' : 'o');
        mote(f, m, 31, 9, 'I'); mote(f, m, 37, 7, 'u');
      } }),
  ],
});

// ---- S4 CHASECUT — set the mark, then cut forward along the path ----
STEPS.push({
  name: 'S4 CHASECUT', hands: 1, frames: [
    makeFrame({ tag: 'W4 MARK', phase: 'WINDUP 3 - SET THE MARK', hold: 3, where: 'THE MARK - RETURN ANCHOR',
      lean: [0, 1], hand: [23, 23], angle: 30, reach: 11,
      fx: (b, f, m) => {
        theMark(b, 21, 2);
        gatherMotes(f, 21, 26, [[-5, -2], [6, -1], [0, -5]]);
        put(f, 21, FLOOR - 1, 'W');
      } }),
    makeFrame({ tag: 'A4A DASH', phase: 'ACTIVE EARLY 2', hold: 2, where: 'IN THE CORRIDOR',
      lean: [3, 0], cape: [-3, 0], lunge: [4, 1], hand: [27, 21], angle: -4, reach: 12,
      fx: (b, f, m) => {
        // R2 — streaks tightened: a controlled advance, not a screen-crossing dash
        for (let i = 0; i < 4; i++) speedLine(b, 9 + i * 2, 16 + i * 4, 22 + i * 2, 16 + i * 4, { core: 'I', rim: 'y', gap: 1, dim: i > 1 });
        theMark(b, 8, 0);
        mote(f, m, 14, 12, 'I');
      } }),
    makeFrame({ tag: 'A4B CUT', phase: 'ACTIVE LATE 3 - HOLD', hold: 3, where: 'CATCHING THE GLAIVE',
      lean: [3, 1], cape: [-3, 0], lunge: [5, 2], hand: [28, 22], angle: -2, reach: 13, aura: 0.3,
      fx: (b, f, m) => {
        // the blade CROSSES the travelling glaive — the two lines become one move
        glaiveCrescent(b, 41, 21, { span: 7, bulge: 4 });
        for (let i = 0; i < 4; i++) speedLine(b, 8 + i * 2, 15 + i * 4, 24 + i * 2, 15 + i * 4, { core: 'W', rim: 'y', gap: 1, dim: i > 1 });
        impactStar(f, 40, 17, false);
        mote(f, m, 14, 10, 'I');
      } }),
    makeFrame({ tag: 'L4 DRIVE', phase: 'LINK 2', hold: 2, where: 'IN THE CORRIDOR',
      lean: [2, 0], lunge: [4, 2], hand: [27, 22], angle: 0, reach: 12,
      fx: (b, f, m) => {
        for (let i = 0; i < 4; i++) speedLine(b, 9 + i * 2, 16 + i * 4, 20 + i * 2, 16 + i * 4, { core: 'I', rim: 'o', gap: 1, dim: true, broken: 4 });
        glaiveCrescent(b, 42, 20, { span: 6, bulge: 4, dim: 1 });
        mote(f, m, 16, 9, 'u');
      } }),
  ],
});

// ---- S5 NOON PILLAR + ECHO RETURN — the payoff and the loop ----
STEPS.push({
  name: 'S5 NOON PILLAR + ECHO RETURN', hands: 1, frames: [
    makeFrame({ tag: 'P5A SEED', phase: 'IMPACT 3', hold: 3, where: 'THE FAR END',
      lean: [2, 1], lunge: [4, 1], hand: [27, 23], angle: 40, reach: 11,
      fx: (b, f, m) => {
        disc(b, 39, 30, 1.4, 'W');
        ringC(b, 39, 30, 4, 'I', { dash: 10, phase: 0.5 });
        gatherMotes(f, 39, 24, [[-3, -2], [3, -3], [0, -6]]);
        groundGlint(b, 38, true);
      } }),
    makeFrame({ tag: 'P5B ERUPT', phase: 'PILLAR 5 - HOLD', hold: 5, where: 'THE FAR END',
      lean: [-1, -1], cape: [2, 1], lunge: [-2, 0], radiant: true, seed: 17, rim: 0.9, aura: 0.4,
      hand: [24, 18], angle: -40, reach: 11,
      fx: (b, f, m) => {
        for (let y = 8; y <= 31; y++) {                            // the pillar's near edge
          const half = 1 + R(2.2 * ((y - 8) / 23));
          for (let d = 0; d <= half; d++) putB(b, 40 + d - half, y, d === half ? 'y' : (d === half - 1 ? 'I' : 'W'));
        }
        for (let i = 0; i < 5; i++) { const x = 30 + i * 3; putB(b, x, FLOOR - 1, i % 2 ? 'o' : 'y'); }
        mote(f, m, 34, 12, 'I'); mote(f, m, 30, 8, 'y');
      } }),
    makeFrame({ tag: 'P5C CROWN', phase: 'PILLAR 4', hold: 4, where: 'THE FAR END',
      lean: [-1, -1], cape: [1, 0], radiant: true, seed: 29, rim: 0.7, aura: 0.35,
      hand: [23, 17], angle: -70, reach: 11,
      fx: (b, f, m) => {
        for (let y = 2; y <= 31; y++) {
          const half = 1 + R(2.6 * ((y - 2) / 29));
          for (let d = 0; d <= half; d++) putB(b, 40 + d - half, y, d === half ? 'y' : (d === half - 1 ? 'I' : 'W'));
        }
        ringC(b, 40, 6, 8, 'y', { dash: 12, phase: 0.5 });
        spark(b, 33, 9, 1);
        mote(f, m, 31, 6, 'I'); mote(f, m, 27, 3, 'I');
      } }),
    makeFrame({ tag: 'E5A UNMAKE', phase: 'DEPART 3', hold: 3, where: 'THE FAR END - GOING',
      lean: [0, -1], radiant: true, seed: 41, rim: 1, ghost: 'unmake', ghostAmt: 0.62,
      hand: [24, 18], angle: -60, reach: 10,
      fx: (b, f, m) => {
        // DISSOLVE, on the body: the silhouette peels off the floor upward and
        // becomes a rising mote column. Light lifts; it never ashes.
        for (let i = 0; i < 9; i++) {
          const x = 18 + ((i * 5) % 9), y = 30 - i * 3;
          putB(b, x, y, i % 3 === 0 ? 'W' : (i % 3 === 1 ? 'I' : 'y'));
          putB(b, x + 2, y - 1, 'G');
        }
        ringC(b, 21, 20, 12, 'G', { dash: 18, phase: 0.5 });
        disc(f, 21, 20, 1.1, 'W');
        mote(f, m, 17, 6, 'I'); mote(f, m, 26, 3, 'I');
      } }),
    makeFrame({ tag: 'E5B REFORM', phase: 'ARRIVE 4', hold: 4, where: 'BACK AT THE MARK',
      radiant: true, seed: 53, rim: 1, ghost: 'reform', ghostAmt: 0.42, flare: true,
      hand: [24, 22], angle: 10, reach: 10,
      fx: (b, f, m) => {
        // the arrival lands INSIDE the still-lit corridor residue: the bed runs
        // straight through the half-knit body and is what sells the return.
        for (let x = 0; x < GW; x++) {
          if (x % 6 < 3) continue;
          putB(b, x, 21, 'I'); putB(b, x, 20, 'y'); putB(b, x, 22, 'y');
        }
        haloSnap(b, 21, 20, 10);
        [[0, -12], [-9, -8], [9, -9], [-12, 0], [12, -1], [-7, 8], [7, 7]].forEach(([dx, dy], i) => {
          putB(b, 21 + dx, 20 + dy, i % 2 ? 'I' : 'y');
          putB(b, 21 + R(dx * 1.3), 20 + R(dy * 1.3), 'G');
        });
        theMark(b, 21, 2);
        disc(f, 21, 20, 1.1, 'W'); put(f, 21, 17, 'I'); put(f, 21, 23, 'I');
        mote(f, m, 15, 9, 'I'); mote(f, m, 28, 8, 'I');
      } }),
    makeFrame({ tag: 'E5C SETTLE', phase: 'SEAM 5', hold: 5, where: 'BACK AT THE MARK',
      cape: [-1, 0], hand: [25, 23], angle: 20, reach: 11,
      fx: (b, f, m) => {
        for (let x = 0; x < GW; x += 5) putB(b, x, 21, x % 2 ? 'u' : 'G');
        theMark(b, 21, 0);
        ringC(b, 21, 20, 10, 'u', { dash: 12, phase: 0.5, arcFrom: -Math.PI, arcTo: 0 });
        mote(f, m, 19, 5, 'u'); mote(f, m, 25, 3, 'u');
      } }),
  ],
});

// per-step sheet annotations: [subtitle, eclipse line, ...full-width note lines]
const STEP_NOTE = [
  ['ONE HAND - GROUNDED LEVEL CUT - THE BOW OPENER',
   'ECLIPSE - THIN W-I BAND + ONE GLINT - THE OPENER STAYS HONEST',
   'THE BLADE ROTATES ONLY 26 DEGREES ACROSS THE WHOLE STEP - A WRIST CUT NOT A SWING. THE SMEAR PIVOTS AT 22.62 RADIUS 40 - AND THAT DISTANT PIVOT IS THE',
   '    WHOLE TRICK - IT TURNS THE APPROVED SLASH CRESCENT INTO A LONG SHALLOW BOW - AN ARC BY CONSTRUCTION - A LINE TO THE EYE. SAME BAND ANATOMY.'],
  ['TWO HANDS ON THE PLUNGE - LEAP - ECLIPSE STATE - TURN - SLAM',
   'ECLIPSE - HALO SNAP + RADIANT RE-SKIN + NORTH RAY AT THE APEX - THE STATE PERSISTS THROUGH THE DIVE AND FADES ON THE RISE',
   'R2 - THE DIVE IS A TURN NOT A FALL. T2 HOLDS THE APEX UPRIGHT - ON D2A THE BODY HAS ROLLED OVER THE APEX AND RIDES HORIZONTAL - HEAD LEADING - FACE DOWN -',
   '    CAPE TRAILING UP THE BACK - BOTH HANDS DRIVE THE SWORD DOWN-FORWARD SO THE BLADE LEADS THE LINE TO THE IMPACT. THE BROKEN ARC OVER THE BACK IS THE',
   '    PATH THE BLADE TRACED THROUGH THE TURN. D2B PLANTS IT - UPRIGHT AGAIN BUT WEIGHT SUNK - WIDE STANCE - BLADE DRIVEN INTO THE FLOOR AT THE STAR.',
   'UPRIGHT - HORIZONTAL - PLANTED - ONE ROTATION ACROSS THREE FRAMES. THE 90 DEGREE BODY TURN IS LOSSLESS - PURE TRANSPOSE - NO RESAMPLING - NO MUSH.',
   'AIRBORNE FRAMES CARRY NO BODY ON THE FLOOR ROWS - ASSERTED. MIRROR LAW - THE BOSS DIVES WITH ITS LIGHT - THE HERO FALLS OUT OF ITS OWN - THE APEX LIGHT',
   '    IS LEFT BEHIND AND RISES - NORTH STAYS THE LONGEST RAY. SAME MOTION - OPPOSITE MEANING - THE MIRROR STAYS PURE.'],
  ['ONE HAND - THE LIGHT LEAVES THE SWORD',
   'ECLIPSE - THE GLAIVE IS CAST - MICRO GLYPH CORE - THE BLADE IS LEFT BARE',
   'THE HERO FRAME IS DELIBERATELY MODEST HERE - THE LIGHT IS NOT ON THE BODY ANYMORE - IT IS IN THE PROJECTILE. THE BLADE IS LEFT BARE ON A3B RELEASE.',
   '    SO THE ESCALATION LAW IS MEASURED PER STEP AS HERO FRAME PLUS THE DETACHED GRID THAT STEP OWNS - WHICH IS WHAT THE PLAYER ACTUALLY SEES.'],
  ['ONE HAND - SET THE MARK - THEN CUT THE CORRIDOR',
   'ECLIPSE - GROUND HALO = THE MARK - CHASE LINES - THE BLADE CROSSES THE GLAIVE',
   'W4 MARK IS LOAD-BEARING - IT IS THE ONLY FRAME THAT TELLS THE PLAYER WHERE THE RETURN WILL LAND. IT MUST READ IN 3 TICKS AND BE REMEMBERED FOR A SECOND.',
   'A4B CUT IS THE MERGE BEAT - THE BLADE CROSSES THE TRAVELLING GLAIVE SO STEPS 3-4-5 READ AS ONE MOVE AND NOT AS THREE SEPARATE ONES.'],
  ['ONE HAND - THE PAYOFF AND THE LOOP CLOSURE',
   'ECLIPSE - FULL - THE PILLAR IS THE EMBLEM NORTH RAY AT WORLD SCALE - THEN THE ECHO RETURN',
   'E5A UNMAKE AND E5B REFORM ARE THE SAME BEAT SEEN AT TWO PLACES - THE HERO IS AT THE FAR END ON E5A AND BACK AT THE MARK ON E5B. THE X JUMP IS GAMEPLAY -',
   '    THE SPRITE ONLY CARRIES THE POSE - SEE THE STAGE MAP. THE RETURN LANDS ON PILLAR FRAME PL3 WHILE IT IS STILL BURNING - THAT OVERLAP IS THE MOVE.'],
];

// ---------- compose ----------
function compose(fr) {
  const g = mkGrid();
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (fr.fxB[y][x] !== '.') g[y][x] = fr.fxB[y][x];
    if (fr.body[y][x] !== '.') g[y][x] = fr.body[y][x];
    if (fr.fxF[y][x] !== '.') g[y][x] = fr.fxF[y][x];
  }
  return g;
}
STEPS.forEach(s => s.frames.forEach(fr => { fr.grid = compose(fr); }));

// =====================================================================
// THE LOOP CLOCK — the requirement, made checkable.
// "Before the pillar fully dissipates, the hero teleports back." Both the pillar
// and step 5's hero frames run on one clock; the assert below proves the return
// lands while the pillar is still burning AND while the corridor bed is still
// lit. This is the single timing fact the whole move depends on.
// =====================================================================
const HOLDS = STEPS.map(s => s.frames.reduce((a, f) => a + f.hold, 0));
const T_S = []; { let t = 0; HOLDS.forEach(h => { T_S.push(t); t += h; }); }
const TOTAL = HOLDS.reduce((a, b) => a + b, 0);
const S5_T0 = T_S[4];
const PILLAR_HOLDS = [3, 5, 4, 6, 6];                        // PL0..PL4, same clock
const PILLAR_END = S5_T0 + PILLAR_HOLDS.reduce((a, b) => a + b, 0);
// the hero's step-5 frame ticks
const S5_TICKS = []; { let t = S5_T0; STEPS[4].frames.forEach(f => { S5_TICKS.push(t); t += f.hold; }); }
const RETURN_TICK = S5_TICKS[4];                             // E5B REFORM
const CORR_HOLDS = [T_S[4] - T_S[3], 16, 12];                // CR0 cut during S4, CR1, CR2
const CORR_T = [T_S[3], T_S[4], T_S[4] + 16];
const RETURN_MARGIN = PILLAR_END - RETURN_TICK;

// THE ADVANCE (R2) — the one distance fact, asserted like the loop clock.
// Mark -> pillar is a controlled holy advance of ~5 hero lengths — clearly more
// than a jab, clearly less than a map crossing. The stage map and tableau 2
// both draw from this constant so the sheet cannot quietly re-inflate it.
const HERO_LEN = 30, ADVANCE_PX = 150;

// =====================================================================
// VALIDATION (throws on violation)
// =====================================================================
let vErr = 0;
const fail = (...m) => { console.error('FAIL', ...m); vErr++; };
for (const [k, hex] of Object.entries(LIGHT)) {
  const [r, g2, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  if (!(r >= g2 && g2 >= b)) fail('warm law', k, hex);
}
const LK = new Set(Object.keys(LIGHT));
const LKD = new Set([...LK, '.']);
const FXKEYS = new Set([...LK, '5', '4', '3', '2', '1', '.']);
const ALLKEYS = new Set([...Object.keys(COMBO_PAL), '.']);
const baseCount = heroBase.flat().filter(k => k !== '.').length;
const litCount = g => g.flat().filter(k => k !== '.').length;
const lightCount = g => g.flat().filter(k => LK.has(k)).length;
const meanY = g => { let s = 0, n = 0; g.forEach((row, y) => row.forEach(k => { if (k !== '.') { s += y; n++; } })); return n ? s / n : 0; };
const meanR = (g, cx, cy) => { let s = 0, n = 0;
  g.forEach((row, y) => row.forEach((k, x) => { if (k !== '.') { s += Math.hypot(x - cx, y - cy); n++; } })); return n ? s / n : 0; };

// ---- per-frame body/effect law ----
STEPS.forEach(step => step.frames.forEach(fr => {
  const id = `${step.name} ${fr.tag}`;
  if (fr.grid.length !== GH || fr.grid.some(r => r.length !== GW)) fail('size', id);
  fr.grid.flat().forEach(k => { if (!ALLKEYS.has(k)) fail('key', id, k); });
  // fx layers: LIGHT + neutral steel only — the hero blues can never enter the eclipse
  [fr.fxB, fr.fxF].forEach((fx, li) => fx.flat().forEach(k => {
    if (!FXKEYS.has(k)) fail('fx key', id, li ? 'front' : 'back', k);
  }));
  // grounded frames plant feet on the floor rows; AIRBORNE frames must have NO
  // body on them (the inverse law — this is what makes the jump legible)
  const bodyFeet = fr.body.slice(FLOOR - 1).flat().filter(k => k !== '.').length;
  if (fr.air) { if (bodyFeet > 0) fail('airborne body on floor rows', id, bodyFeet); }
  else if (!fr.ghost && bodyFeet < 6) fail('feet missing', id, bodyFeet);
  // body mass
  const bodyCount = litCount(fr.body), preCount = litCount(fr.bodyPre);
  if (!fr.ghost) {
    if (bodyCount < baseCount * 0.8 || bodyCount > baseCount * 1.4) fail('body mass', id, bodyCount, 'base', baseCount);
  } else {
    const ratio = bodyCount / preCount;
    if (fr.ghost === 'unmake' && (ratio < 0.20 || ratio > 0.60)) fail('unmake ratio', id, ratio.toFixed(2));
    if (fr.ghost === 'reform' && (ratio < 0.50 || ratio > 0.92)) fail('reform ratio', id, ratio.toFixed(2));
    // both halves of the teleport are BOTTOM-UP: departing survivors sit HIGH
    // (the body lifted off), arriving survivors sit LOW (knitting from the feet).
    const dy = meanY(fr.body) - meanY(fr.bodyPre);
    if (fr.ghost === 'unmake' && !(dy < -0.5)) fail('unmake not lifting', id, dy.toFixed(2));
    if (fr.ghost === 'reform' && !(dy > 0.5)) fail('reform not knitting bottom-up', id, dy.toFixed(2));
  }
  // radiant re-skin may never change the silhouette (palette-only law)
  if (fr.radiant && !fr.ghost) {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++)
      if ((fr.body[y][x] === '.') !== (fr.bodyPre[y][x] === '.')) { fail('radiant mask desync', id, x, y); y = GH; break; }
  }
  // the sword stays the star: front accents cover few body px. The eclipse-state
  // frame is allowed the BODYFLARE chest core (8B-0 BF1 paints W over the body).
  let cover = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++)
    if (fr.fxF[y][x] !== '.' && fr.body[y][x] !== '.') cover++;
  const lim = fr.flare ? 18 : 6;
  if (cover > lim) fail('body cover', id, cover, '>', lim);
  // R2 — the aura is BOUNDED: enough to read as holy power, never a blob
  if (fr.meta.aura !== undefined && (fr.meta.aura < 5 || fr.meta.aura > 34))
    fail('aura bounds', id, fr.meta.aura);
}));

// ---- sub-effect grids: pure LIGHT, correct size ----
function checkGrid(name, g, w, h, keys = LKD) {
  if (g.length !== h || g.some(r => r.length !== w)) fail('size', name, g.length, g[0].length);
  for (const r of g) for (const k of r) if (!keys.has(k)) fail('key', name, k);
}
GLAIVE.forEach((g, i) => checkGrid('glaive' + i, g, GL.W, GL.H));
CORRIDOR.forEach((g, i) => checkGrid('corridor' + i, g, CO.W, CO.H));
PILLAR.forEach((g, i) => checkGrid('pillar' + i, g, PB.W, PB.H));
REFORM.forEach((g, i) => checkGrid('reform' + i, g, RF.W, RF.H));

// ---- ESCALATION (measured at the MOVE level, not the hero frame) ----
// Combo A's light does not live on the body the way DAYBREAK's does — S3 hands it
// to the glaive and S5 hands it to the pillar, and S3's hero frame is deliberately
// modest because the light LEFT the sword. So the law is measured per STEP as
// (hero hit-frame light + the detached grid that step owns), which is what the
// player actually sees. Same invariant SHAPE the approved 8B-1 validator uses:
// opener smallest, finisher dominant, middle band all above the opener.
const stepLight = [
  lightCount(STEPS[0].frames[2].fxB) + lightCount(STEPS[0].frames[2].fxF),
  lightCount(STEPS[1].frames[4].fxB) + lightCount(STEPS[1].frames[4].fxF) +
    lightCount(STEPS[1].frames[2].fxB) + lightCount(STEPS[1].frames[2].fxF),
  lightCount(STEPS[2].frames[2].fxB) + lightCount(STEPS[2].frames[2].fxF) + lightCount(GLAIVE[1]),
  lightCount(STEPS[3].frames[2].fxB) + lightCount(STEPS[3].frames[2].fxF) + lightCount(CORRIDOR[0]),
  lightCount(STEPS[4].frames[1].fxB) + lightCount(STEPS[4].frames[1].fxF) + lightCount(PILLAR[2]),
];
if (stepLight[0] !== Math.min(...stepLight)) fail('S1 not the smallest', stepLight.join(' '));
if (stepLight[4] < Math.max(...stepLight.slice(0, 4)) * 1.5) fail('S5 not dominant', stepLight.join(' '));
[1, 2, 3].forEach(i => { if (stepLight[i] <= stepLight[0]) fail('mid band under the opener', i, stepLight.join(' ')); });

// ---- the family laws the new sub-effects must obey ----
// PILLAR: it is the emblem's NORTH ray at world scale — it must be north-dominant
// (mass above the base), h-symmetric (sacred geometry), and it must DISSOLVE.
PILLAR.forEach((g, i) => {
  for (let y = 0; y < PB.H; y++) for (let x = 0; x < PB.W; x++)
    if (g[y][x] !== g[y][PB.W - 1 - x]) { fail('pillar symmetry', i, x, y); y = PB.H; break; }
});
{
  const above = PILLAR[2].slice(0, PB.BASE).flat().filter(k => k !== '.').length;
  const below = PILLAR[2].slice(PB.BASE).flat().filter(k => k !== '.').length;
  if (!(above > below * 3)) fail('pillar not north-dominant', above, below);
  const h = PILLAR[2].findIndex(row => row.some(k => k !== '.'));
  if (h > 8) fail('pillar too short', h);
  if (!(litCount(PILLAR[2]) > litCount(PILLAR[3]) && litCount(PILLAR[3]) > litCount(PILLAR[4])))
    fail('pillar not dissolving', litCount(PILLAR[2]), litCount(PILLAR[3]), litCount(PILLAR[4]));
  if (!(meanY(PILLAR[4]) < meanY(PILLAR[3]))) fail('pillar residue not rising', meanY(PILLAR[4]).toFixed(1), meanY(PILLAR[3]).toFixed(1));
  // the crown is a TRUE CIRCLE — the hero owns circles; the boss never gets one
  let off = 0;
  for (let y = 14; y <= 26; y++) for (let x = 0; x < PB.W; x++) {
    if (PILLAR[2][y][x] === '.') continue;
    const d = Math.hypot(x - PB.CX, y - 20);
    if (d < 3.2 || Math.abs(d - 4.5) < 1.1 || Math.abs(d - 6) < 1.1 || Math.abs(d - 17) < 1.2) continue;
    if (Math.abs(x - PB.CX) <= 7) continue;                    // the shaft + rays
    if (Math.abs(y - 20) <= 1) continue;                       // the E/W rays
    off++;
  }
  if (off > 10) fail('pillar crown circle purity', off);
}
// CORRIDOR: it must reach across, fade in three steps, and lift motes.
{
  if (!(litCount(CORRIDOR[0]) > litCount(CORRIDOR[1]) && litCount(CORRIDOR[1]) > litCount(CORRIDOR[2])))
    fail('corridor not fading', CORRIDOR.map(litCount).join(' '));
  if (!(meanY(CORRIDOR[2]) < meanY(CORRIDOR[1]))) fail('corridor residue not rising');
  const span = CORRIDOR[0][CO.CY].filter(k => k !== '.').length;
  if (span < CO.W * 0.85) fail('corridor does not reach', span);
}
// GLAIVE: MICRO GLYPH core present, crescent bows toward travel (right).
{
  const g = GLAIVE[1];
  if (g[GL.CY][GL.CX - 3] !== 'W') fail('glaive core not white');
  const rowLead = y => { for (let x = GL.W - 1; x >= 0; x--) if (g[y][x] !== '.') return x; return -1; };
  if (!(rowLead(GL.CY) > rowLead(GL.CY - 8) && rowLead(GL.CY) > rowLead(GL.CY + 8)))
    fail('glaive not bowed toward travel');
}
// REFORM: the GATHER law — mean radius contracts. Arrival is dissolve reversed.
{
  const r = REFORM.map(g => meanR(g, RF.CX, RF.CY));
  if (!(r[0] > r[1] && r[1] > r[2])) fail('reform not converging', r.map(v => v.toFixed(1)).join(' '));
  // circle purity, stated the way 8B-0 states it: every lit cell must sit on a
  // DECLARED true radius (core disc, then the 3.4 / 6 / 8 / 10 rings).
  let off = 0;
  const RF2_RADII = [3.4, 6, 8, 10];
  REFORM[2].forEach((row, y) => row.forEach((k, x) => {
    if (k === '.') return;
    const d = Math.hypot(x - RF.CX, y - RF.CY);
    if (d <= 2.2) return;                                        // the white core disc
    if (RF2_RADII.some(r => Math.abs(d - r) < 1.1)) return;
    off++;
  }));
  if (off > 0) fail('reform snap circle purity', off);
}
// ---- THE LOOP: the return must land before the pillar dies, in a lit bed ----
if (!(RETURN_TICK < PILLAR_END)) fail('return after the pillar died', RETURN_TICK, PILLAR_END);
if (RETURN_MARGIN < 6) fail('return margin too tight', RETURN_MARGIN);
if (!(RETURN_TICK >= CORR_T[1] && RETURN_TICK < CORR_T[2])) fail('return not inside the lit corridor bed', RETURN_TICK, CORR_T);
// ---- THE ADVANCE (R2): a controlled holy advance, not a map crossing ----
{
  const lens = ADVANCE_PX / HERO_LEN;
  if (lens < 3.5 || lens > 6.5) fail('advance distance', lens);
}
// ---- SEAM: settle returns the blade to the idle carry (the 8B-1 law) ----
{
  const tip = STEPS[4].frames[5].meta.tip;
  if (Math.abs(tip[0] - 36) > 3 || Math.abs(tip[1] - 27) > 3) fail('E5C seam tip', tip);
}
if (vErr) throw new Error('validation failed: ' + vErr);

// =====================================================================
// SHEET
// =====================================================================
const SW = 690, SH = 1700, SCALE = 3;
const G = Array.from({ length: SH }, () => Array(SW).fill(null));
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function paint(x, y, w, h, hexc, a = 1) {
  const src = hex2rgb(hexc);
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
  const { mir = false, s = 1 } = opts;
  const mw = m[0].length;
  m.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
    const k = row[x]; if (k === '.' || k === ' ' || !pal[k]) continue;
    const px = mir ? ox + (mw - 1 - x) * s : ox + x * s;
    paint(px, oy + y * s, s, s, pal[k], 1);
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
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101111011', R: '110101110110101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
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
const HEADC = '#8d84a8', SUBC = '#4a4560', GOLDC = '#c9962e', DIMC = '#3a3550', WHITEC = '#b9b2cc';

// ---------- header ----------
text('HERO COMBO A - MERIDIAN LOOP - 5-STEP CHAIN - STRICT PIXEL ART - STAGE 8C-0 CONCEPT - REV 2', 3, 2, HEADC);
text('BUILT ENTIRELY FROM THE APPROVED HERO LIGHT ECLIPSE FAMILY 8B-0 AND THE APPROVED 30X24 DAWNGUARD KNIGHT. NOTHING WIRED INTO SRC.', 3, 9);
text('DAYBREAK CHAIN IS A COMBO OF ARCS - FOUR RADIAL CRESCENTS PIVOTING TIGHT AT THE SHOULDER - ALL OF IT ON THE BODY.', 3, 15);
text('MERIDIAN LOOP IS A COMBO OF LINES - BOW - DIVE - GLAIVE - CHASE - PILLAR - IT ADVANCES FIVE HERO LENGTHS AND RETURNS TO WHERE IT STARTED.', 3, 21);
text('PALETTE LAW - WHITE CORE + GOLD GLOW ONLY - NO BLUE EVER - NO BLUR - NO GRADIENTS - NO NEW COLORS - NO NEW RAMP', 3, 29, HEADC);
(() => {
  const keys = ['W', 'I', 'y', 'o', 'G', 'u'];
  const roles = ['CORE', 'IVORY', 'RADIANT', 'WARM', 'DEEP', 'BRONZE'];
  keys.forEach((k, i) => {
    const x = 3 + i * 34;
    cellFrame(x, 36, 30, 10, LIGHT[k]);
    text(k, x + 1, 49, '#6d6488'); text(roles[i], x + 6, 49, SUBC);
  });
  text('WARM LAW R OVER G OVER B EVERY STEP - BLUE CANNOT EXIST IN THE RAMP', 213, 37);
  text('THE BLADE KEEPS ITS OWN COLD-BLUE GLOW - THAT IS THE CHARACTER NOT THE EFFECT', 213, 43);
  text('CANVAS 44X34 - HERO BASE AT 7.10 - FEET ROW 33 - IDENTICAL TO THE APPROVED 8B-1 COMBO CANVAS', 213, 49);
  text('GRAMMAR - EVERY USE PLAYS GATHER - IGNITE - RELEASE - DISSOLVE. THE TELEPORT RETURN IS THAT GRAMMAR RUN BACKWARDS -', 3, 56, GOLDC);
  text('DISSOLVE AT THE FAR END - GATHER AT THE MARK - THE BODY KNITS FROM THE FEET UP - LIGHT RISES IN BOTH HALVES', 3, 62, GOLDC);
  text('RADIANCE LAW - R2 - KEY MOMENTS WEAR RADIANT SKIN + A SPARSE CONTOUR AURA - BOUNDED 5 TO 34 CELLS - ASSERTED - THE SILHOUETTE ALWAYS READS', 3, 68, GOLDC);
})();

// ---------- full sequence ----------
let Y = 78;
text('FULL SEQUENCE - 24 FRAMES - 5 STEPS - HOLDS AT 60FPS - TOTAL ' + TOTAL + ' TICKS', 3, Y, HEADC);
(() => {
  const all = [];
  STEPS.forEach((s, si) => s.frames.forEach(fr => all.push({ fr, si })));
  const oy0 = Y + 8;
  all.forEach(({ fr, si }, i) => {
    const row = Math.floor(i / 12), col = i % 12;
    const x = 3 + col * 57, y = oy0 + row * 52;
    cellFrame(x, y, GW, GH, '#100d1c');
    stampM(fr.grid, COMBO_PAL, x, y);
    text('S' + (si + 1), x, y + GH + 3, GOLDC);
    text(fr.tag.split(' ')[0], x + 11, y + GH + 3, SUBC);
    text(fr.hold + 'T', x + 36, y + GH + 3, DIMC);
  });
})();
Y += 8 + 2 * 52 + 6;

// ---------- per-step bands ----------
STEPS.forEach((step, si) => {
  text(step.name + ' - ' + STEP_NOTE[si][0], 3, Y, HEADC);
  text(STEP_NOTE[si][1], 3, Y + 7, GOLDC);
  const oy = Y + 15;
  step.frames.forEach((fr, fi) => {
    const x = 3 + fi * 96;
    cellFrame(x, oy, GW * 2, GH * 2, '#100d1c');
    stampM(fr.grid, COMBO_PAL, x, oy, { s: 2 });
    text(fr.tag, x, oy + GH * 2 + 3, SUBC);
    text(fr.phase, x, oy + GH * 2 + 9, DIMC);
    text(fr.where, x, oy + GH * 2 + 15, fr.where.indexOf('MARK') >= 0 ? GOLDC : DIMC);
  });
  // notes run FULL WIDTH under the band — a side column silently vanishes on the
  // 6-frame steps, which are exactly the two that need their argument on the page.
  const notes = STEP_NOTE[si].slice(2);
  notes.forEach((ln, i) => text(ln, 3, oy + GH * 2 + 24 + i * 6, i === 0 ? SUBC : DIMC));
  Y = oy + GH * 2 + 26 + notes.length * 6 + 4;
});

// ---------- NEW REUSABLE SUB-EFFECTS ----------
text('NEW REUSABLE LIGHT ECLIPSE SUB-EFFECTS - 8C-0 ADDITIONS - COMPOSED FROM 8B-0 PARTS - NO NEW RAMP - NO NEW SHAPE LANGUAGE', 3, Y, HEADC);
Y += 8;
(() => {
  // SUNGLAIVE
  text('SUNGLAIVE 25X25 - THE THROWN SLASH - 3 FRAMES - LOOP GL1-GL2 WHILE IT TRAVELS', 3, Y, GOLDC);
  GLAIVE.forEach((g, i) => {
    const x = 3 + i * 56;
    cellFrame(x, Y + 7, GL.W * 2, GL.H * 2, '#100d1c');
    stampM(g, LIGHT, x, Y + 7, { s: 2 });
    text(['GL0 BIRTH', 'GL1 TRAVEL', 'GL2 SHIMMER'][i], x, Y + 9 + GL.H * 2, SUBC);
  });
  const nx = 176;
  text('STRAIGHT OFF THE 8B-0 REUSE MAP -', nx, Y + 8);
  text('RANGED - THROWN LIGHT TAKES THE', nx, Y + 14);
  text('MICRO GLYPH AS THE PROJECTILE CORE', nx, Y + 20);
  text('AND RAY TIPS AS ITS TRAIL. NOTHING', nx, Y + 26);
  text('WAS INVENTED HERE - THE FAMILY', nx, Y + 32);
  text('ALREADY SPECIFIED THIS EXACT USE.', nx, Y + 38);
  text('A SLASH CRESCENT WRAPPED AROUND', nx, Y + 46, GOLDC);
  text('A MICRO GLYPH - SAME BAND ANATOMY', nx, Y + 52, GOLDC);
  text('W EDGE - I BODY - Y INNER - O BELLY', nx, Y + 58, GOLDC);
  text('AUTHORED TRAVELING RIGHT LIKE', nx, Y + 66);
  text('EVERY HERO CLIP - THE AIMDIR', nx, Y + 72);
  text('MIRROR SERVES THE LEFT CAST', nx, Y + 78);

  // REFORM
  const rx = 400;
  text('ECHO REFORM 33X33 - THE ARRIVAL - DISSOLVE RUN BACKWARDS', rx, Y, GOLDC);
  REFORM.forEach((g, i) => {
    const x = rx + i * 72;
    cellFrame(x, Y + 7, RF.W * 2, RF.H * 2, '#100d1c');
    stampM(g, LIGHT, x, Y + 7, { s: 2 });
    text(['RF0 CALL', 'RF1 KNIT', 'RF2 SNAP'][i], x, Y + 9 + RF.H * 2, SUBC);
  });
  text('MOTES CONVERGE ON THE 8 FIXED SPOKES - MEAN', rx, Y + 86);
  text('RADIUS CONTRACTS - ASSERTED. IT IS THE GATHER', rx, Y + 92);
  text('LAW PLAYED AT AN ARRIVAL. RF2 IS THE HALO H0', rx, Y + 98);
  text('SNAP THE FAMILY ALREADY USES FOR PARRY -', rx, Y + 104);
  text('REUSED HERE AS THE LANDING PUNCTUATION.', rx, Y + 110);
})();
Y += 122;

(() => {
  // CORRIDOR
  text('CORRIDOR 72X17 - THE CUT PATH AND ITS RESIDUE - THE BED THE RETURN LANDS IN', 3, Y, GOLDC);
  CORRIDOR.forEach((g, i) => {
    const x = 3 + i * 150;
    cellFrame(x, Y + 7, CO.W * 2, CO.H * 2, '#100d1c');
    stampM(g, LIGHT, x, Y + 7, { s: 2 });
    text(['CR0 CUT', 'CR1 FADE - RETURN LANDS HERE', 'CR2 GHOST'][i], x, Y + 9 + CO.H * 2, i === 1 ? GOLDC : SUBC);
  });
  const nx = 460;
  text('THE LANE THE GLAIVE OPENED AND THE', nx, Y + 8);
  text('HERO CUT THROUGH. ITS FADE IS THE', nx, Y + 14);
  text('CLOCK THE TELEPORT IS TIMED AGAINST -', nx, Y + 20);
  text('THE HERO MUST REAPPEAR WHILE THE BED', nx, Y + 26);
  text('IS STILL CLEARLY LIT - CR1 - OR THE', nx, Y + 32);
  text('RETURN READS AS A POP NOT A LOOP.', nx, Y + 40, GOLDC);
  text('A CUT NOT A WALL - THIN CLEAN LANE -', nx, Y + 48);
  text('LEFT END NODE IS THE MARK - RIGHT END', nx, Y + 54);
  text('FEEDS THE PILLAR - ONE CONTINUOUS', nx, Y + 60);
  text('LINE FROM STEP 3 TO STEP 5', nx, Y + 66);
})();
Y += 78;

(() => {
  // PILLAR
  text('NOON PILLAR 41X72 - THE CLIMAX - THE EMBLEM NORTH RAY AT WORLD SCALE - 5 FRAMES ON THE FAMILY GRAMMAR', 3, Y, GOLDC);
  PILLAR.forEach((g, i) => {
    const x = 3 + i * 48;
    cellFrame(x, Y + 7, PB.W, PB.H, '#100d1c');
    stampM(g, LIGHT, x, Y + 7);
    text(['PL0 SEED', 'PL1 ERUPT', 'PL2 NOON', 'PL3 BREAK', 'PL4 RESIDUE'][i], x, Y + 10 + PB.H, i === 3 ? GOLDC : SUBC);
    text(['GATHER', 'IGNITE', 'RELEASE', 'DISSOLVE', 'RISE'][i], x, Y + 16 + PB.H, DIMC);
  });
  // 2x CROWN CROP — the emblem head is the family-purity argument; it needs to be
  // legible at cell level, so crop the top 36 rows rather than scale the whole shaft.
  const crown = PILLAR[2].slice(0, 36);
  cellFrame(248, Y + 7, PB.W * 2, 72, '#100d1c');
  stampM(crown, LIGHT, 248, Y + 7, { s: 2 });
  text('PL2 CROWN 2X', 248, Y + 82, SUBC);
  const nx = 340;
  text('THE DERIVATION THAT KEEPS THIS FAMILY-PURE -', nx, Y + 8, HEADC);
  text('THE PILLAR IS NOT A NEW SHAPE. IT IS THE EMBLEM S', nx, Y + 16);
  text('NORTH RAY - THE LONGEST ONE - DRAWN AT WORLD SCALE.', nx, Y + 22);
  text('STRAIGHT AND TAPERED BASE TO TIP - THE RAY LAW.', nx, Y + 28);
  text('STANDING ON A GROUND HALO - THE CAST LANGUAGE.', nx, Y + 34);
  text('CROWNED BY A TRUE-CIRCLE CORONA WITH CARDINAL RAYS', nx, Y + 40);
  text('AND CROSS-SPARKS - THE EMBLEM HEAD OPENING.', nx, Y + 46);
  text('IT RISES. THE BOSS ECLIPSE BREAKER RAMS THE FLOOR', nx, Y + 56, GOLDC);
  text('AND SINKS ASH - THE NOON PILLAR TEARS OUT OF THE', nx, Y + 62, GOLDC);
  text('FLOOR AND ITS MOTES LIFT. THE MIRROR STAYS PURE.', nx, Y + 68, GOLDC);
  text('ASSERTED - PERFECT H-SYMMETRY - NORTH-DOMINANT', nx, Y + 78, HEADC);
  text('MASS ABOVE THE BASE - CROWN IS A TRUE CIRCLE -', nx, Y + 84);
  text('DISSOLVE THINS PL2 - PL3 - PL4 - RESIDUE RISES', nx, Y + 90);
  text('ON SCREEN AT THE HERO 2PX GRID THE PILLAR IS 82X144 PX -', nx, Y + 100, HEADC);
  text('ROUGHLY 3X THE 48PX HERO BODY. IT IS MEANT TO DWARF BOTH FIGHTERS.', nx, Y + 106);
})();
Y += PB.H + 46;

// ---------- STAGE MAP ----------
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
text('STAGE MAP - WHERE STEPS 3 TO 5 HAPPEN - THE ADVANCE IS ' + (ADVANCE_PX / HERO_LEN) + ' HERO LENGTHS - A CONTROLLED HOLY ADVANCE - NOT A MAP CROSSING - ASSERTED', 3, Y, HEADC);
text('THE LOOP - THE MARK IS SET AT S4 - THE GLAIVE AND THE HERO CUT THE CORRIDOR - THE PILLAR STANDS AT ITS END - THE HERO RETURNS THROUGH THE RESIDUE', 3, Y + 6, GOLDC);
(() => {
  const oy = Y + 13, w = 340, h = 104, floorRel = 88;
  const floorY = nightRoom(3, oy, w, h, floorRel);
  const MARKX = 62, ENDX = MARKX + ADVANCE_PX;
  // the corridor bed — TWO tiles cover the whole advance (R2)
  stampM(CORRIDOR[1], LIGHT, MARKX - CO.MARK, floorY - 12 - CO.CY);
  stampM(CORRIDOR[0], LIGHT, MARKX - CO.MARK + 67, floorY - 12 - CO.CY);
  // one glaive ghost mid-lane
  stampM(GLAIVE[2], LIGHT, MARKX + 84, floorY - 12 - GL.CY);
  // the pillar at the end of the advance
  stampM(PILLAR[3], LIGHT, ENDX - PB.CX + 4, floorY - PB.BASE - 2);
  // the hero back at the mark, reformed, inside the residue
  stampM(STEPS[4].frames[4].grid, COMBO_PAL, MARKX - 21, floorY - FLOOR);
  // return ticks along the bed, pointing back LEFT
  for (let i = 0; i < 9; i++) {
    const x = MARKX + 34 + i * 12;
    if (x > ENDX - 26) break;
    paint(x, floorY - 12, 3, 1, '#8a6420', 1);
    paint(x, floorY - 13, 1, 1, '#c9962e', 1); paint(x, floorY - 11, 1, 1, '#c9962e', 1);
  }
  // the measure — mark to pillar in hero lengths
  paint(MARKX, floorY + 3, ENDX - MARKX, 1, '#5d5675', 1);
  for (let i = 0; i <= ADVANCE_PX / HERO_LEN; i++) paint(MARKX + i * HERO_LEN, floorY + 2, 1, 3, '#8d84a8', 1);
  text('THE MARK', MARKX - 16, floorY + 7, GOLDC);
  text('5 HERO LENGTHS', MARKX + 46, floorY + 7, '#8d84a8');
  text('NOON PILLAR', ENDX - 16, floorY + 7, GOLDC);
  text('RETURN THROUGH THE RESIDUE', MARKX + 26, floorY - 22, SUBC);
  text('STILL BURNING - HERO ALREADY HOME', ENDX - 118, oy + 4, GOLDC);
  const nx = 352;
  text('DISTANCE LAW - R2 CORRECTION -', nx, oy + 4, HEADC);
  text('THE FIRST DRAFT RAN THE CORRIDOR NEARLY', nx, oy + 12);
  text('WALL TO WALL - A MAP CROSSING. CORRECTED -', nx, oy + 18);
  text('MARK TO PILLAR IS NOW ' + ADVANCE_PX + ' CELLS = 5 HERO', nx, oy + 24);
  text('LENGTHS - ASSERTED TO STAY IN 3.5 TO 6.5.', nx, oy + 30);
  text('CLEARLY MORE THAN A JAB - CLEARLY LESS', nx, oy + 36);
  text('THAN A MAP CROSSING.', nx, oy + 42);
  text('TWO CORRIDOR TILES COVER THE WHOLE LANE -', nx, oy + 52, GOLDC);
  text('ONE CONTINUOUS READ FROM THE MARK TO THE', nx, oy + 58, GOLDC);
  text('PILLAR BASE - AND THE S4 CHASE STREAKS', nx, oy + 64, GOLDC);
  text('WERE TIGHTENED TO MATCH.', nx, oy + 70, GOLDC);
  text('ON SCREEN AT THE 2PX GRID THE ADVANCE IS', nx, oy + 80);
  text('300 PX - THE WHOLE MOVE STAYS ON CAMERA.', nx, oy + 86);
})();
Y += 13 + 104 + 16;

// ---------- THE LOOP CLOCK ----------
text('THE LOOP CLOCK - THE ONE TIMING FACT THE MOVE DEPENDS ON - ASSERTED IN-GENERATOR', 3, Y, HEADC);
(() => {
  const oy = Y + 16, x0 = 96, px = 6.4;
  const TX = t => x0 + Math.round(t * px);
  // tick ruler
  for (let t = 0; t <= TOTAL + 8; t += 10) {
    paint(TX(t), oy - 5, 1, 3, '#3a3550', 1);
    text(t, TX(t) - 2, oy - 12, DIMC);
  }
  // track 0 — the hero's five steps
  const cols = ['#8a6420', '#c9962e', '#e0a93c', '#f2c94e', '#fffdf4'];
  text('HERO STEPS', 3, oy, SUBC);
  STEPS.forEach((s, i) => {
    paint(TX(T_S[i]), oy, Math.round(HOLDS[i] * px), 7, cols[i], 1);
    text('S' + (i + 1), TX(T_S[i]) + 2, oy + 10, DIMC);
  });
  // track 1 — the corridor bed
  text('CORRIDOR', 3, oy + 22, SUBC);
  paint(TX(CORR_T[0]), oy + 22, Math.round((CORR_T[1] - CORR_T[0]) * px), 7, '#f2e6bf', 1);
  paint(TX(CORR_T[1]), oy + 22, Math.round(16 * px), 7, '#e0a93c', 1);
  paint(TX(CORR_T[2]), oy + 22, Math.round(12 * px), 7, '#8a6420', 1);
  text('CR0', TX(CORR_T[0]) + 2, oy + 32, DIMC);
  text('CR1 - THE LIT BED', TX(CORR_T[1]) + 2, oy + 32, GOLDC);
  text('CR2', TX(CORR_T[2]) + 2, oy + 32, DIMC);
  // track 2 — the pillar
  text('NOON PILLAR', 3, oy + 44, SUBC);
  let pt = S5_T0;
  PILLAR_HOLDS.forEach((h, i) => {
    paint(TX(pt), oy + 44, Math.round(h * px), 7, ['#8a6420', '#f2c94e', '#fffdf4', '#e0a93c', '#8a6420'][i], 1);
    text(['PL0', 'PL1', 'PL2', 'PL3', 'PL4'][i], TX(pt) + 1, oy + 54, i === 3 ? GOLDC : DIMC);
    pt += h;
  });
  // the two markers the whole move hangs on
  const rx = TX(RETURN_TICK), ex = TX(PILLAR_END);
  paint(rx, oy - 3, 1, 68, '#fffdf4', 1);
  paint(ex, oy + 40, 1, 25, '#e0263a', 1);
  paint(rx, oy + 66, ex - rx, 2, '#c9962e', 1);
  text('ECHO RETURN LANDS - TICK ' + RETURN_TICK, rx - 96, oy + 72, WHITEC);
  text('PILLAR GONE - TICK ' + PILLAR_END, ex - 82, oy + 80, '#a8182a');
  text('MARGIN ' + RETURN_MARGIN + ' TICKS - THE PILLAR IS STILL BURNING WHEN THE HERO IS ALREADY BACK - THIS OVERLAP IS THE WHOLE MOVE', 3, oy + 84, GOLDC);
  text('TIMINGS ARE PRESENTATION INTENT - NOT AN FSM CONTRACT. COMBO A CANNOT RIDE THE LIVE 4-HIT MELEE FSM - SEE THE HANDOFF NOTES.', 3, oy + 92, HEADC);
})();
Y += 16 + 104;

// ---------- TABLEAUS ----------
text('TABLEAU 1 - THE CORRECTED DIVE - APEX - TURN - SLAM VS THE BOSS', 3, Y, HEADC);
text('TABLEAU 2 - THE LOOP AT THE CORRECTED DISTANCE - THE PILLAR BURNS - THE HERO IS ALREADY BACK', 300, Y, HEADC);
(() => {
  const oy = Y + 7;
  // T1 — the rotation, staged: apex high right, the horizontal turn mid-fall,
  // the planted slam beside the boss. Three beats of one dive.
  let floorY = nightRoom(3, oy, 290, 104, 92);
  stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, 3 + 18, floorY - 47);
  stampM(STEPS[1].frames[2].grid, COMBO_PAL, 3 + 194, floorY - FLOOR - 40, { mir: true });  // apex
  stampM(STEPS[1].frames[3].grid, COMBO_PAL, 3 + 126, floorY - FLOOR - 18, { mir: true });  // the turn
  stampM(STEPS[1].frames[4].grid, COMBO_PAL, 3 + 58, floorY - FLOOR, { mir: true });        // slam
  text('APEX', 3 + 220, oy + 12, DIMC);
  text('THE TURN', 3 + 150, oy + 34, DIMC);
  text('SLAM', 3 + 82, floorY + 4, DIMC);

  // T2 — the whole loop at the asserted advance, boss just past the pillar
  floorY = nightRoom(300, oy, 387, 104, 88);
  const MX = 300 + 42, EX = MX + ADVANCE_PX;
  stampM(CORRIDOR[1], LIGHT, MX - CO.MARK, floorY - 12 - CO.CY);
  stampM(CORRIDOR[0], LIGHT, MX - CO.MARK + 67, floorY - 12 - CO.CY);
  stampM(PILLAR[3], LIGHT, EX - PB.CX + 4, floorY - PB.BASE - 2);
  stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, EX + 30, floorY - 47);
  stampM(STEPS[4].frames[4].grid, COMBO_PAL, MX - 21, floorY - FLOOR);
  paint(MX, floorY + 3, ADVANCE_PX, 1, '#5d5675', 1);
  for (let i = 0; i <= ADVANCE_PX / HERO_LEN; i++) paint(MX + i * HERO_LEN, floorY + 2, 1, 3, '#8d84a8', 1);
  text('THE HERO IS HERE', MX - 20, floorY + 7, GOLDC);
  text('THE PILLAR IS STILL HERE', EX - 44, floorY + 7, GOLDC);
})();
Y += 7 + 104 + 12;

// ---------- handoff notes ----------
text('HANDOFF NOTES', 3, Y, HEADC); Y += 8;
[
  'NAME - MERIDIAN LOOP - COMBO A - THE SECOND HERO COMBO - DAYBREAK CHAIN IS DAWN AND RISES - MERIDIAN IS SOLAR NOON AND RETURNS',
  'REV 2 CORRECTIONS - THE DIVE IS A TRUE TURN - 90 DEGREE LOSSLESS BODY ROTATION - UPRIGHT APEX - HORIZONTAL PLUNGE - PLANTED SLAM.',
  '    THE ADVANCE IS NORMALIZED TO 5 HERO LENGTHS - ASSERTED 3.5 TO 6.5. KEY MOMENTS WEAR RADIANT SKIN + A BOUNDED CONTOUR AURA',
  '    5 TO 34 CELLS - ASSERTED. THE OPENER STAYS BARE - THE LIGHT IS EARNED ACROSS THE CHAIN.',
  'STEPS - S1 SUNSTEP - S2 ZENITH DIVE - S3 SUNGLAIVE - S4 CHASECUT - S5 NOON PILLAR + ECHO RETURN - 4+6+4+4+6 = 24 FRAMES - ' + TOTAL + ' TICKS',
  'DISTINCTNESS - DAYBREAK IS ARCS AT THE BODY - MERIDIAN IS LINES THROUGH SPACE - THE OPENER PIVOTS AT RADIUS 40 NOT 15 SO ITS',
  '    SMEAR IS A SHALLOW BOW NOT A CRESCENT - THE BLADE ROTATES 26 DEGREES NOT 120 - NOTHING IN DAYBREAK MOVES LIKE THIS',
  'FASTER AND MORE GRACEFUL - ' + TOTAL + ' TICKS FOR FIVE STEPS = 16.4 TICKS PER STEP VS DAYBREAK 67 FOR FOUR = 16.75 - AND ONLY THE THREE TRUE',
  '    IMPACTS ARE HELD - EVERY TRAVEL FRAME IS 2 TICKS - THE COMBO SPENDS ITS TIME MOVING NOT POSING',
  'NEW SUB-EFFECTS - SUNGLAIVE 25X25 - CORRIDOR 72X17 - NOON PILLAR 41X72 - ECHO REFORM 33X33 - ALL COMPOSED FROM 8B-0 PARTS',
  'THE TELEPORT IS NOT AN INVENTION - IT IS THE FAMILY GRAMMAR RUN BACKWARDS - DISSOLVE AT THE FAR END - GATHER AT THE MARK -',
  '    THE BODY KNITS FROM THE FEET UP - BOTH HALVES ARE BOTTOM-UP SO LIGHT RISES IN BOTH - ASSERTED ON THE BODY MEAN-Y',
  'THE LOOP - THE RETURN LANDS AT TICK ' + RETURN_TICK + ' - THE PILLAR DIES AT TICK ' + PILLAR_END + ' - MARGIN ' + RETURN_MARGIN + ' TICKS - AND THE BED IS STILL AT CR1 - ASSERTED',
  'MIRROR STAYS PURE - HERO WHITE DISC IN GOLD CORONA - TRUE CIRCLES - NORTH RAY LONGEST - MOTES RISE - NEVER BOLTS - NEVER ASH',
  '    THE DIVE IS THE RISK - THE BOSS AIR ECLIPSE OWNS THE DOWNWARD DIVE RAY - SO THE HERO BODY FALLS BUT ITS LIGHT STAYS NORTH',
  'CANVAS - 44X34 AT THE HERO 2PX GRID - IDENTICAL TO THE APPROVED 8B-1 COMBO - THE PROVEN RUNTIME PATH ALREADY SERVES IT',
  'AIRBORNE LAW - THE 3 AIR FRAMES CARRY NO BODY ON THE FLOOR ROWS - ASSERTED - LEGS TUCK ABOVE THE COLLISION BASE',
  'THIS IS NOT A RENDER-ONLY DROP-IN - AND THAT IS THE BIG DIFFERENCE FROM 8B-1. DAYBREAK RODE THE LIVE FSM 1 TO 1 WITH ZERO',
  '    GAMEPLAY CHANGE. MERIDIAN LOOP NEEDS A JUMP ARC - A PROJECTILE ENTITY - A DASH - AND A POSITION TELEPORT. THOSE ARE',
  '    GAMEPLAY. THE ART IS READY - THE SYSTEMS ARE NOT. SEE THE SPEC FOR THE SPLIT INTO SEPARATE EXTRACTION STAGES.',
  'STAGE 8C-0 IS VISUAL DESIGN ONLY - SRC IS UNTOUCHED - NO HITBOX - NO TIMING - NO AI - NO BALANCE - NOTHING WIRED',
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
fs.writeFileSync(__dirname+'/hero_combo_a_v1.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---------- literal dump ----------
let js = '// === HERO COMBO A "MERIDIAN LOOP" literals (see hero_combo_a_spec.md) ===\n';
js += '// STAGE 8C-0 CONCEPT — nothing wired into src/. 5-step combo, 24 frames.\n';
js += '// Body clips are 44x34 (hero base at 7,10; feet row 33) — the SAME canvas as\n';
js += '// the approved 8B-1 DAYBREAK CHAIN, so the proven runtime path serves them.\n';
js += '// Body effects are BAKED into the frames. Keys = HERO keys + the six LIGHT keys\n';
js += '// (W #fffdf4 / I #f2e6bf / y #f2c94e / o #e0a93c / G #c9962e / u #8a6420).\n';
js += '// The four detached grids (glaive / corridor / pillar / reform) are PURE LIGHT\n';
js += '// keys and are world-space effects, not hero clips — they do not ride the\n';
js += '// sprite anchor. See the spec for their anchors.\n';
js += '// NOTE: unlike DAYBREAK, this combo is NOT a render-only drop-in — it needs a\n';
js += '// jump arc, a projectile entity, a dash and a position teleport. Art only.\n';
STEPS.forEach((step, si) => {
  js += `  heroComboA${si + 1}: [\n`;
  step.frames.forEach(fr => {
    js += `    // ${fr.tag} — ${fr.phase} — ${fr.where}\n`;
    js += '    [' + stringify(fr.grid).map(r => JSON.stringify(r)).join(', ') + '],\n';
  });
  js += '  ],\n';
});
[['lightGlaive', GLAIVE], ['lightCorridor', CORRIDOR], ['lightPillar', PILLAR], ['lightReform', REFORM]].forEach(([n, set]) => {
  js += `  ${n}: [\n`;
  set.forEach(g => { js += '    [' + stringify(g).map(r => JSON.stringify(r)).join(', ') + '],\n'; });
  js += '  ],\n';
});
fs.writeFileSync(__dirname + '/hero_combo_a_literal.txt', js);

// round-trip proof — the literal must re-parse to exactly what was authored
{
  const src = fs.readFileSync(__dirname + '/hero_combo_a_literal.txt', 'utf8').replace(/\r/g, '');
  const reparse = n => {
    const m = src.match(new RegExp('  ' + n + ': \\[([\\s\\S]*?)\\n  \\],'));
    if (!m) throw new Error('clip not found on re-parse: ' + n);
    return [...m[1].matchAll(/\[((?:"[^"]*"(?:, )?)+)\]/g)].map(fm => fm[1].split(', ').map(s => JSON.parse(s)));
  };
  for (let si = 0; si < 5; si++) {
    if (JSON.stringify(reparse('heroComboA' + (si + 1))) !== JSON.stringify(STEPS[si].frames.map(fr => stringify(fr.grid))))
      throw new Error('round-trip fail: heroComboA' + (si + 1));
  }
  [['lightGlaive', GLAIVE], ['lightCorridor', CORRIDOR], ['lightPillar', PILLAR], ['lightReform', REFORM]].forEach(([n, set]) => {
    if (JSON.stringify(reparse(n)) !== JSON.stringify(set.map(stringify))) throw new Error('round-trip fail: ' + n);
  });
}

console.log('wrote hero_combo_a_v1.png', IW + 'x' + IH,
  '| steps', STEPS.map(s => s.frames.length).join('+'), '= 24 frames', '|', TOTAL, 'ticks',
  '\n  step light (hero+owned grid):', stepLight.join(' -> '),
  '\n  loop: return tick', RETURN_TICK, '| pillar end', PILLAR_END, '| margin', RETURN_MARGIN,
  '\n  layout end Y', Y, '/', SH);
