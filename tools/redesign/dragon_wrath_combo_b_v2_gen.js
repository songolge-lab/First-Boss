// HERO DRAGON WRATH + COMBO B — Stage 8C-1 REDO (v2, reference-faithful pass).
// Full redo from scratch. The v1 output (dragon_wrath_combo_b_v1.png) is
// SUPERSEDED — it was designed before the reference images arrived. Nothing
// here continues from it; every pose, effect and clock below is re-derived
// from the four provided references, decoded frame by frame:
//
//   hero power up  (19f GIF)  -> DRAGON WRATH RISE: present the blade level ->
//        raise it VERTICAL before the body + ground ring -> the blade ignites
//        GOLD hilt-to-tip -> held blazing build with rising radiance -> a
//        radial STARBURST snap -> rising streak wisps -> a small FLOURISH
//        downswing presenting the transformed blade -> powered idle.
//   bswordcombo    (31f GIF, Insignia @adamcyounis) -> the TWO swings:
//        S1 = high back-carry -> forward pitch, back leg kicked up -> one huge
//        overhead-to-low-front crescent CRASH -> deep, long crouch recovery.
//        S2 = from the crouch the blade DRAGS back low -> a sweeping forward
//        cleave into a LONG stretched lunge (blade skimming the floor) ->
//        follow-through carries the blade to FULL VERTICAL overhead with a
//        rising fan -> it settles onto the shoulder. The smears appear in one
//        frame and the body HOLDS - the reference's smear-frame idiom.
//   bswordcombo2   (static)   -> the charge: greatsword SHOULDERED up-back,
//        wide low stance, ragged energy flaring around the body — adapted to
//        gold Light-Eclipse radiance tatters (upward dashes, never fire).
//   bigsword       (cinema frame + briefed structure) -> the finisher:
//        LETTERBOX bars (the reference frame carries real ones) -> the arena
//        darkens -> a STRONG WHITE FLASH -> a giant golden eclipse greatsword
//        appears high above -> descends -> huge impact -> gold dissolve.
//
// THE TRANSFORMED SWORD (per the corrected direction): a bright yellow-gold
// GLOWING energy blade with a lightsaber-like feeling — W core, solid gold
// body, warm fringe — clearly larger than the steel sword (reach 16 vs 11),
// swung with TWO HANDS. This deliberately supersedes the v1 "air-gap sheath"
// blade law; the Light Eclipse ramp is unchanged, so the family holds.
//
// Strict pixel art: hard cells, no blur, no gradients, ZERO BLUE in effects
// (visor + chest sigil keep their cold blue — the character, not the effect).
// No Red Eclipse language anywhere.
//
// Emits: dragon_wrath_combo_b_v2.png + dragon_wrath_combo_b_v2_literal.txt.
const fs = require('fs');
const zlib = require('zlib');

// ---------- palettes ----------
const LIGHT = {
  'W': '#fffdf4', 'I': '#f2e6bf', 'y': '#f2c94e', 'o': '#e0a93c', 'G': '#c9962e', 'u': '#8a6420',
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
const NW0 = '#191622', NW1 = '#1d1a28', NF0 = '#221c2b', NF1 = '#3a3346', WINL = '#6c82a8';
const DIMENV = { [NW0]: '#100d17', [NW1]: '#120f19', [NF0]: '#15111b', [NF1]: '#241f2e', [WINL]: '#3d4a63' };
const VIG1 = '#0d0b14', VIG2 = '#080710', LBAR = '#060509';   // LBAR = cinematic letterbox (from the reference frame)

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

// ---------- authoring canvas (NEW for v2 — 60x40) ----------
// The empowered blade (reach 16) and the Insignia-scale motion (the deep
// crouch, the stretched lunge, the full-vertical follow-through) do not fit
// the 44x34 combo canvas. 60x40 gives them room. drawSprite's centerX /
// feet-bottom anchor self-solves any canvas size; row-count detection >= 20
// still routes these to the hero 2px grid; the HERO_BODY_ROWS/COLS clamps
// from 8B-3 already make HP-bar/shadow framing canvas-independent.
const GW = 60, GH = 40, OX = 15, OY = 16;
const FLOOR = 39;
const SHO = [29, 28];
const HIP = 30;

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

// ---------- body toolkit ----------
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
function capeFlow(g, dx, dy) { paste(g, cut(g, 18, 26, 24, 35), dx, dy); return g; }
function lunge(g, fwd, back) {
  paste(g, cut(g, 29, 33, 31, FLOOR), fwd, 0);
  if (back) paste(g, cut(g, 25, 33, 27, FLOOR), -back, 0);
}
// the Insignia pitch: the back leg leaves the floor and trails up-back while
// the front foot stays planted (bswordcombo f2 — the hop into the crash).
function legLift(g, dx, dy) { paste(g, cut(g, 23, 33, 28, FLOOR), dx, dy); }
function eraseBlade(g) { for (let y = 28; y <= 34; y++) for (let x = 32; x <= 44; x++) g[y][x] = '.'; }
const BRIGHT1 = { '0': '1', '1': '2', '2': '3', '3': '4', '4': '5', '5': '5',
                  'n': 'm', 'm': 'm', 'l': 'L', 'L': 'L', 'g': 'g' };
function radiantSkin(gIn, seed, rim, skip) {
  const out = gIn.map(r => r.map(k => (k === '.' ? '.' : (BRIGHT1[k] || k))));
  for (let y = 0; y < out.length; y++) {
    let lo = -1, hi = -1;
    for (let x = 0; x < out[0].length; x++) if (out[y][x] !== '.') { if (lo < 0) lo = x; hi = x; }
    if (lo < 0) continue;
    if (rnd(y, seed) < rim * 0.85 && !(skip && skip.has(lo + ',' + y))) out[y][lo] = 'g';
    if (rnd(y, seed + 4) < rim * 0.85 && !(skip && skip.has(hi + ',' + y))) out[y][hi] = 'g';
  }
  return out;
}
function contourAura(fx, body, seed, density) {
  let n = 0;
  for (let y = 0; y < GH; y++) {
    let lo = -1, hi = -1;
    for (let x = 0; x < GW; x++) if (body[y][x] !== '.') { if (lo < 0) lo = x; hi = x; }
    if (lo < 0) continue;
    const bias = y < GH * 0.6 ? 1.15 : 0.7;
    if (rnd(y, seed) < density * bias && lo > 0 && body[y][lo - 1] === '.' && fx[y][lo - 1] === '.') {
      fx[y][lo - 1] = rnd(y, seed + 9) < 0.3 ? 'I' : 'y'; n++;
    }
    if (rnd(y, seed + 4) < density * bias && hi < GW - 1 && body[y][hi + 1] === '.' && fx[y][hi + 1] === '.') {
      fx[y][hi + 1] = rnd(y, seed + 13) < 0.3 ? 'I' : 'y'; n++;
    }
  }
  for (let x = 0; x < GW; x += 3) {
    let top = -1;
    for (let y = 0; y < GH; y++) if (body[y][x] !== '.') { top = y; break; }
    if (top > 0 && rnd(x, seed + 21) < density * 0.9 && fx[top - 1][x] === '.') {
      fx[top - 1][x] = rnd(x, seed + 27) < 0.35 ? 'W' : 'I'; n++;
    }
  }
  return n;
}
// the character's own steel sword (pre-wrath) — unchanged anatomy.
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
// =====================================================================
// THE WRATH BLADE v2 — the transformed sword, per the corrected direction:
// a bright yellow-gold GLOWING energy blade with a lightsaber-like feeling.
// The hilt stays the hero's (steel arm/hand/guard wings + his own gold `g`
// winks); the BLADE is pure light — W core every cell, solid gold `y` body
// both sides, warm `o` fringe pips, rounded W/I energy point. It is LARGER
// than the steel sword (reach 16 vs 11 — asserted >= 1.3x) and it is swung
// with two hands in the combo. ignite runs the gold in hilt->tip; settle
// runs it back out (blue returns, gold breaks into rising motes).
// =====================================================================
const BASE_REACH = 11, WRATH_REACH = 16;
function drawGoldBlade(g, fxF, sho, hx, hy, angleDeg, reach, opts = {}) {
  const { twoHand = false, ignite = 1, flare = false, settle = false, behind = false } = opts;
  const P = behind ? putB : put;
  if (twoHand) lineC(g, sho[0] - 2, sho[1] + 1, hx - 1, hy + 1, '1', false);
  lineC(g, sho[0], sho[1], hx, hy, '2', true);
  put(g, hx, hy, '3'); put(g, hx - 1, hy, '3'); put(g, hx, hy + 1, '1');
  const a = RAD(angleDeg), dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
  const gx = hx + dx, gy = hy + dy;
  for (let s = -1; s <= 1; s++) P(g, R(gx + px * s), R(gy + py * s), s === 0 ? (ignite > 0 ? 'W' : 'l') : '1');
  P(g, R(gx + px * 2), R(gy + py * 2), 'g'); P(g, R(gx - px * 2), R(gy - py * 2), 'g');
  const litTo = Math.max(2, R(2 + (reach - 2) * ignite));
  for (let i = 2; i <= reach; i++) {
    const bx = R(hx + dx * i), by = R(hy + dy * i);
    const lit = settle ? i <= Math.floor(reach * 0.45) : i <= litTo;
    if (lit) {
      P(g, bx, by, 'W');                                              // hot core — every cell
      P(g, R(bx + px), R(by + py), flare && i % 2 ? 'W' : 'y');       // solid gold body
      P(g, R(bx - px), R(by - py), flare && i % 2 === 0 ? 'W' : 'y');
      // clean edges — a lightsaber blade, not a saw: a few detached energy
      // winks instead of a regular fringe.
      if (i === R(reach * 0.35) || i === R(reach * 0.75)) putB(g, R(bx + px * 2), R(by + py * 2), 'o');
      if (i === R(reach * 0.55) || i === reach - 1) putB(g, R(bx - px * 2), R(by - py * 2), 'o');
    } else if (i <= BASE_REACH) {
      P(g, bx, by, '4'); P(g, R(bx + px), R(by + py), 'l'); P(g, R(bx - px), R(by - py), '3');
    }
    if (settle && !lit && i <= BASE_REACH && i % 2 === 1)
      putB(fxF, R(bx + px * 2), R(by + py * 2) - 1, i % 4 === 1 ? 'G' : 'u');
  }
  const tipR = (settle || ignite < 1) ? Math.min(litTo, reach) : reach;
  const tx = R(hx + dx * (tipR + 1)), ty = R(hy + dy * (tipR + 1));
  if (!settle && ignite >= 1) {
    P(g, tx, ty, 'W'); P(g, R(tx + px), R(ty + py), 'y'); P(g, R(tx - px), R(ty - py), 'y');
    putB(g, R(hx + dx * (tipR + 2.4)), R(hy + dy * (tipR + 2.4)), 'I');
  } else if (ignite <= 0) {
    put(g, R(hx + dx * (BASE_REACH + 1)), R(hy + dy * (BASE_REACH + 1)), 'L');
  } else {
    P(g, tx, ty, 'I');
    put(g, R(hx + dx * (BASE_REACH + 1)), R(hy + dy * (BASE_REACH + 1)), settle ? 'L' : 'I');
  }
  if (flare) { putB(fxF, tx + 1, ty - 1, 'W'); putB(fxF, tx - 1, ty + 1, 'I'); }
  return [R(hx + dx * Math.min(tipR, reach)), R(hy + dy * Math.min(tipR, reach))];
}
function crownHalo(fx, cx, topY, phase) {
  ringC(fx, cx, topY + 2, 5, 'y', { dash: 9, phase, arcFrom: RAD(-162), arcTo: RAD(-18) });
  putB(fx, cx, topY - 4, 'W');
  putB(fx, cx - 6, topY, 'o'); putB(fx, cx + 6, topY, 'o');
}

// ---------- effect toolkit ----------
const DIMK = { W: 'I', I: 'y', y: 'o', o: 'G', G: 'u', '5': '3', '4': '2', '3': '2', '2': '1' };
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
// the ignition STARBURST — the hero-power-up reference's radial-spike snap
// (its f11-f12): 8 straight spikes W->I->y from a hot kernel, quarter-offset
// second set, a broken ring. Same ray law as everything in the family.
function starburst(fx, cx, cy, big) {
  disc(fx, cx, cy, big ? 2.2 : 1.4, 'W');
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => axisRay(fx, cx, cy, d, 3, big ? 12 : 9, ['W', 'W', 'I', 'y'], { tip: true, wide: false }));
  [[1, -1], [-1, -1], [1, 1], [-1, 1]].forEach(d => axisRay(fx, cx, cy, d, 3, big ? 8 : 6, ['I', 'y', 'o'], { wide: false }));
  ringC(fx, cx, cy, big ? 10 : 7, 'y', { dash: 14, phase: 0.5 });
}
function haloSnap(fx, cx, cy, r) {
  ringC(fx, cx, cy, r, 'y');
  ringC(fx, cx, cy, r - 2.5, 'I', { dash: 12, phase: 0.5 });
  [[0, -r], [0, r], [-r, 0], [r, 0]].forEach(([dx, dy]) => putB(fx, cx + dx, cy + dy, 'W'));
}
function groundHalo(fx, cx, level) {
  const ry = 3, rx = level > 0 ? 12 : 9;
  ellipseRing(fx, cx, FLOOR - 1, rx, ry, level > 1 ? 'y' : 'o', { dash: level > 1 ? 0 : 12, phase: 0.5 });
  ellipseRing(fx, cx, FLOOR - 1, rx - 4, ry - 1.4, level > 1 ? 'I' : 'G', { dash: 10, phase: 0.5 });
  if (level > 0) { putB(fx, cx - rx, FLOOR - 1, 'W'); putB(fx, cx + rx, FLOOR - 1, 'W'); }
  if (level > 1) { putB(fx, cx, FLOOR - 1 - ry, 'W'); putB(fx, cx, FLOOR - 1 + ry, 'W'); }
}
function gatherMotes(fx, tx, ty, pts) {
  pts.forEach(([dx, dy], i) => put(fx, tx + dx, ty + dy, i === 0 ? 'y' : (i === 1 ? 'G' : 'u')));
}
// RADIANCE — the power-up reference's rising gold energy around the body,
// and bswordcombo2's ragged flare, translated into family language: broken
// VERTICAL dash streamers that rise (never curly fire, never a wash).
// Deterministic and bounded — asserted per frame.
function radianceStreamers(fx, cx, baseY, topY, intensity, seed) {
  let n = 0;
  const cols = [-9, -6, -3, 3, 6, 9, -12, 12].slice(0, Math.max(2, R(intensity * 8)));
  cols.forEach((dx, ci) => {
    const h = R((baseY - topY) * (0.45 + 0.5 * rnd(ci, seed)));
    const y0 = baseY - R(rnd(ci, seed + 3) * 4);
    for (let y = y0; y > y0 - h; y--) {
      const t = (y0 - y) / Math.max(1, h);
      if ((y + ci) % 3 === 0) continue;                                // broken — dashes, not bars
      const k = t > 0.75 ? (rnd(y, seed + 7) < 0.5 ? 'G' : 'u') : t > 0.4 ? 'o' : 'y';
      if (fx[y] && fx[y][cx + dx] === '.') { fx[y][cx + dx] = k; n++; }
    }
    if (rnd(ci, seed + 11) < 0.6) { putB(fx, cx + dx + (ci % 2 ? 1 : -1), y0 - h - 2, 'I'); n++; }
  });
  return n;
}
function riseStreaks(fx, cx, y0, y1, seed) {
  [[-4, 0], [0, -2], [4, -1], [-7, -3], [7, -2]].forEach(([dx, o], i) => {
    for (let y = y0 + o; y > y1 + (i % 3); y -= 3) putB(fx, cx + dx, y, i % 2 ? 'I' : 'y');
  });
}

// ---------- frame factory ----------
function makeFrame(o) {
  let body = baseBody();
  eraseBlade(body);
  if (o.lunge) lunge(body, o.lunge[0], o.lunge[1]);
  if (o.legLift) legLift(body, o.legLift[0], o.legLift[1]);
  if (o.lean) body = moveUpper(body, o.lean[0], o.lean[1]);
  if (o.cape) capeFlow(body, o.cape[0], o.cape[1]);
  const sho = o.sho || [SHO[0] + (o.lean ? o.lean[0] : 0), SHO[1] + (o.lean ? o.lean[1] : 0)];
  const bare = body.map(r => r.slice());
  const fxB = mkGrid(), fxF = mkGrid(), meta = { motes: [] };
  meta.tip = o.plainSword
    ? drawSword(body, sho, o.hand[0], o.hand[1], o.angle, o.reach, { twoHand: !!o.twoHand })
    : drawGoldBlade(body, fxF, sho, o.hand[0], o.hand[1], o.angle, o.reach,
        { twoHand: !!o.twoHand, ignite: o.ignite === undefined ? 1 : o.ignite, flare: !!o.flareBlade, settle: !!o.settle, behind: !!o.bladeBehind });
  const swordCells = new Set();
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++)
    if (body[y][x] !== bare[y][x]) swordCells.add(x + ',' + y);
  const bodyPre = body.map(r => r.slice());
  if (o.radiant) body = radiantSkin(body, o.seed || 11, o.rim === undefined ? 0.45 : o.rim, swordCells);
  if (o.crown !== undefined) crownHalo(fxB, sho[0], 16 + (o.lean ? o.lean[1] : 0), o.crown);
  if (o.fx) o.fx(fxB, fxF, meta);
  if (o.streamers) meta.streamers = radianceStreamers(fxB, o.streamers[0], FLOOR - 2, 17 - o.streamers[1], o.streamers[1] / 14, (o.seed || 11) + 5);
  if (o.aura) meta.aura = contourAura(fxB, body, (o.seed || 11) + 2, o.aura);
  return { body, bodyPre, fxB, fxF, meta, tag: o.tag, phase: o.phase, hold: o.hold, where: o.where,
           radiant: !!o.radiant, flare: !!o.flare, twoHand: !!o.twoHand,
           wrathOn: !o.plainSword && !o.settle && (o.ignite === undefined || o.ignite >= 1),
           partial: o.ignite !== undefined && o.ignite > 0 && o.ignite < 1,
           behind: !!o.bladeBehind, flareBlade: !!o.flareBlade,
           settle: !!o.settle };
}
const mote = (fx, meta, x, y, k) => { put(fx, x, y, k); meta.motes.push([x, y]); };

// =====================================================================
// REFERENCE GEOMETRY CONSTANTS — the two swings, from the decoded frames.
// =====================================================================
const CC = [29, 26];
// S1 CRASH: overhead-back -> low-front (bswordcombo f0-f3): the crescent runs
// from behind the crown, over the top, down to the front-low plant.
const S1 = { r: 20, arc: [-125, 55] };
// S2 SWEEP: low drag -> forward floor-skimming cleave (f9-f26): a LOW arc
// hanging through the bottom-front — pivot raised so the band rides just
// above the floor line — then the follow-through rises to full vertical
// (f27) and settles onto the shoulder (f29-f30).
const S2 = { c: [29, 16], r: 19, arc: [150, 28], rise: [28, -85], shoulder: -128 };

// =====================================================================
// DETACHED GRIDS
// =====================================================================

// --- WRATH BLADE STUDY v2 (25x13) — the gold energy blade, isolated. ----
const SS = { W: 25, H: 13, CY: 6 };
function bladeStudyFrames() {
  const mk = () => mkGrid(SS.W, SS.H);
  const hilt = (g, awake) => {
    put(g, 0, SS.CY, '3'); put(g, 1, SS.CY, '3');
    put(g, 2, SS.CY, '2'); put(g, 3, SS.CY, '2');
    for (let s = -2; s <= 2; s++) put(g, 5, SS.CY + s, s === 0 ? (awake ? 'W' : 'l') : (Math.abs(s) === 2 ? 'g' : '1'));
  };
  const steel = (g) => {
    for (let i = 0; i <= 10; i++) { const x = 6 + i; put(g, x, SS.CY, '4'); put(g, x, SS.CY - 1, 'l'); put(g, x, SS.CY + 1, '3'); }
    put(g, 17, SS.CY, 'L');
  };
  const gold = (g, litTo, opts = {}) => {
    const { flare = false, settle = false } = opts;
    for (let i = 0; i <= 16; i++) {
      const x = 6 + i;
      const lit = settle ? i <= 6 : i <= litTo;
      if (lit) {
        put(g, x, SS.CY, 'W');
        put(g, x, SS.CY - 1, flare && i % 2 ? 'W' : 'y'); put(g, x, SS.CY + 1, flare && i % 2 === 0 ? 'W' : 'y');
        if (i === 5 || i === 12) putB(g, x, SS.CY - 2, 'o');
        if (i === 9 || i === 15) putB(g, x, SS.CY + 2, 'o');
      } else if (i <= 10) { put(g, x, SS.CY, '4'); put(g, x, SS.CY - 1, 'l'); put(g, x, SS.CY + 1, '3'); }
      if (settle && !lit && i <= 10 && i % 2 === 1) putB(g, x, SS.CY - 3, i % 4 === 1 ? 'G' : 'u');
    }
    const tip = settle ? -1 : Math.min(16, litTo);
    if (tip >= 0) { put(g, 6 + tip + 1, SS.CY, 'W'); put(g, 6 + tip + 1, SS.CY - 1, 'y'); put(g, 6 + tip + 1, SS.CY + 1, 'y'); putB(g, 6 + tip + 3, SS.CY, 'I'); }
    else put(g, 17, SS.CY, 'L');
    if (flare) spark(g, 6 + tip + 2, SS.CY - 3, 1);
  };
  const s0 = mk(); hilt(s0, false); steel(s0);
  const s1 = mk(); hilt(s1, true); gold(s1, 7);
  const s2 = mk(); hilt(s2, true); gold(s2, 16);
  const s3 = mk(); hilt(s3, true); gold(s3, 16, { flare: true });
  const s4 = mk(); hilt(s4, true); gold(s4, 16, { settle: true });
  return [s0, s1, s2, s3, s4];
}

// --- WRATH BURST v2 (41x41) — the STRONG WHITE FLASH. -------------------
// The redo direction wants the detonation to hit hard: WB1 carries filled
// white wedges between the spokes (a near-whiteout beat, 2 ticks), and WB2
// still clears hollow so the screen is never stuck.
const WB = { W: 41, H: 41, C: 20 };
function burstFrames() {
  const out = [];
  let g = mkGrid(WB.W, WB.H);
  disc(g, WB.C, WB.C, 3.2, 'W');
  ringC(g, WB.C, WB.C, 5.4, 'I', { behind: false });
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(d => axisRay(g, WB.C, WB.C, d, 5, 9, ['W', 'I'], { wide: false }));
  out.push(mirrorH(g));
  g = mkGrid(WB.W, WB.H);
  disc(g, WB.C, WB.C, 6.5, 'W');
  for (let y = 0; y < WB.H; y++) for (let x = 0; x < WB.W; x++) {
    const ddx = x - WB.C, ddy = y - WB.C, rr = Math.hypot(ddx, ddy);
    if (rr > 6.5 && rr <= 13.5) {
      const a = Math.atan2(ddy, ddx);
      const wedge = Math.abs(Math.sin(a * 2));                          // filled white wedges on the diagonals
      if (wedge > 0.55) putB(g, x, y, rr < 10.5 ? 'W' : 'I');
    }
  }
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(d => axisRay(g, WB.C, WB.C, d, 7, 18, ['W', 'W', 'I', 'y'], { tip: true }));
  ringC(g, WB.C, WB.C, 15, 'y', { dash: 16, phase: 0.5 });
  ringC(g, WB.C, WB.C, 19, 'G', { dash: 24, phase: 1.5 });
  out.push(mirrorH(g));
  g = mkGrid(WB.W, WB.H);
  ringC(g, WB.C, WB.C, 15, 'o', { dash: 14, phase: 0.5, behind: false });
  [[0, -1], [-1, 0], [1, 0]].forEach(d => { putB(g, WB.C + d[0] * 18, WB.C + d[1] * 18, 'y'); putB(g, WB.C + d[0] * 20, WB.C + d[1] * 20, 'G'); });
  putB(g, WB.C, WB.C + 17, 'G');
  [[-5, -16], [5, -17], [-2, -19], [3, -20], [-8, -13], [8, -14]].forEach(([dx, dy], i) => putB(g, WB.C + dx, WB.C + dy, i % 2 ? 'I' : 'u'));
  out.push(mirrorH(g));
  return out;
}

// --- GIANT ECLIPSE GREATSWORD v2 (41x88) — the bigsword event. -----------
// The massive version of the transformed blade: the same gold energy body
// (W core / solid y / o fringe) on a real greatsword frame — pommel, grip,
// wide crossguard with upturned quillons, a true-circle halo crown. Point
// DOWN; the TIP row plants on the floor line. On screen: 82x176 px.
const GS = { W: 41, H: 88, C: 20, POM: 2, GUARD: 12, TIP: 80 };
function drawGreatBlade(g, opts = {}) {
  const { dim = false, contour = false, brokenFrom = -1 } = opts;
  const K = k => (dim ? (DIMK[k] || k) : k);
  const C = GS.C;
  if (!contour) {
    put(g, C, GS.POM - 1, K('W'));
    disc(g, C, GS.POM + 1, 1.8, K('o')); put(g, C, GS.POM + 1, K('G')); put(g, C, GS.POM, K('W'));
    for (let y = GS.POM + 3; y < GS.GUARD; y++) { put(g, C, y, K(y % 2 ? 'G' : 'o')); put(g, C - 1, y, K('u')); put(g, C + 1, y, K('u')); }
  } else {
    put(g, C, GS.POM + 1, K('u'));
    for (let y = GS.POM + 3; y < GS.GUARD; y += 2) put(g, C, y, K('u'));
  }
  for (let d = -8; d <= 8; d++) {
    if (contour) { if (Math.abs(d) % 2 === 0) put(g, C + d, GS.GUARD, K('G')); }
    else {
      put(g, C + d, GS.GUARD, K(Math.abs(d) === 8 ? 'G' : (d === 0 ? 'W' : 'y')));
      if (Math.abs(d) <= 6) put(g, C + d, GS.GUARD + 1, K(Math.abs(d) <= 1 ? 'y' : 'o'));
      if (Math.abs(d) === 8) put(g, C + d, GS.GUARD - 1, K('o'));
      if (Math.abs(d) === 7) put(g, C + d, GS.GUARD - 1, K('u'));
    }
  }
  ringC(g, C, GS.GUARD, 9.5, K(contour ? 'u' : 'y'), { dash: contour ? 18 : 12, phase: 0.5 });
  if (!contour) [[0, -9.5], [-9.5, 0], [9.5, 0]].forEach(([dx, dy]) => putB(g, R(C + dx), R(GS.GUARD + dy), 'W'));
  const yTop = GS.GUARD + 3;
  for (let y = yTop; y <= GS.TIP; y++) {
    const t = (y - yTop) / (GS.TIP - yTop);
    const half = t < 0.55 ? 4 : t < 0.75 ? 3 : t < 0.88 ? 2 : t < 0.97 ? 1 : 0;
    if (brokenFrom >= 0 && y >= brokenFrom && (y % 5) < Math.min(4, 2 + Math.floor((y - brokenFrom) / 14)))
      continue;
    for (let d = -half; d <= half; d++) {
      const ad = Math.abs(d);
      // the gold energy body — W core, ivory inner, solid gold, warm edge
      let k = d === 0 ? 'W' : ad === 1 && half >= 3 ? 'I' : ad < half ? 'y' : 'o';
      if (contour) { if (ad === half) put(g, C + d, y, K(y % 2 ? 'G' : 'o')); else if (d === 0 && y % 3 === 0) put(g, C + d, y, K('I')); }
      else put(g, C + d, y, K(k));
    }
    if (!contour && half >= 2 && y % 7 === 3) { putB(g, C - half - 1, y, K('o')); putB(g, C + half + 1, y, K('o')); }
  }
  if (!contour) { putB(g, C, GS.TIP + 2, K('W')); putB(g, C, GS.TIP + 4, K('I')); }
}
function greatswordFrames() {
  const out = [];
  const C = GS.C;
  // GS0 FORM — gold contour sketch high in the dark; motes converge.
  let g = mkGrid(GS.W, GS.H);
  drawGreatBlade(g, { contour: true });
  [[-13, 20], [13, 24], [-10, 46], [10, 42], [-6, 64], [6, 60]].forEach(([dx, dy], i) => putB(g, C + dx, dy, i % 2 ? 'u' : 'G'));
  out.push(mirrorH(g));
  // GS1 REVEAL — the full golden blade hangs.
  g = mkGrid(GS.W, GS.H);
  drawGreatBlade(g);
  out.push(mirrorH(g));
  // GS2 DESCENT — same sword + fall streaks beside the hilt + pressure under the point.
  g = mkGrid(GS.W, GS.H);
  drawGreatBlade(g);
  [[-4, 5], [4, 5]].forEach(([dx, len]) => { for (let i = 0; i < len; i++) putB(g, C + dx, GS.POM + 1 + i * 2, 'I'); });
  for (let i = 0; i < 3; i++) { putB(g, C - 7, 22 + i * 17, 'y'); putB(g, C + 7, 28 + i * 17, 'y'); }
  [[-3, 3], [3, 3], [-6, 5], [6, 5]].forEach(([dx, dy]) => putB(g, C + dx, GS.TIP + dy, dy > 4 ? 'G' : 'o'));
  out.push(mirrorH(g));
  // GS3 CONTACT — the point meets the floor.
  g = mkGrid(GS.W, GS.H);
  drawGreatBlade(g);
  impactStar(g, C, GS.TIP + 1, true);
  ellipseRing(g, C, GS.TIP + 3, 11, 2.2, 'y', { dash: 10, phase: 0.5 });
  for (let i = 0; i < 4; i++) { putB(g, C - 13 - i * 2, GS.TIP + 2, i % 2 ? 'G' : 'o'); putB(g, C + 13 + i * 2, GS.TIP + 2, i % 2 ? 'G' : 'o'); }
  out.push(mirrorH(g));
  // GS4 PEAK — the huge impact: base detonation, double halo, burst rays,
  // floor streaks running out, risen fragments.
  g = mkGrid(GS.W, GS.H);
  drawGreatBlade(g);
  for (let y = GS.TIP - 5; y <= GS.TIP + 4; y++) for (let x = C - 3; x <= C + 3; x++) if (Math.abs(x - C) + Math.abs(y - (GS.TIP - 1)) < 6) put(g, x, y, 'W');
  ellipseRing(g, C, GS.TIP + 2, 16, 3.2, 'y');
  ellipseRing(g, C, GS.TIP + 2, 10, 2.2, 'I', { dash: 10, phase: 0.5 });
  putB(g, C - 16, GS.TIP + 2, 'W'); putB(g, C + 16, GS.TIP + 2, 'W');
  [[0, -1]].forEach(d => axisRay(g, C, GS.TIP - 6, d, 8, 15, ['W', 'I', 'y'], { wide: false }));
  [[-1, -1], [1, -1]].forEach(d => axisRay(g, C, GS.TIP - 4, d, 5, 10, ['I', 'y', 'o'], { wide: false }));
  [[-1, 0], [1, 0]].forEach(d => axisRay(g, C, GS.TIP + 1, d, 7, 15, ['I', 'y', 'o'], { wide: false }));
  for (let i = 0; i < 5; i++) { putB(g, C - 10 - i * 2, GS.TIP + 4, i % 2 ? 'u' : 'G'); putB(g, C + 10 + i * 2, GS.TIP + 4, i % 2 ? 'u' : 'G'); }
  [[-8, 36], [8, 32], [-5, 24], [5, 20], [-11, 48], [11, 44]].forEach(([dx, dy], i) => putB(g, C + dx, dy, i % 2 ? 'I' : 'y'));
  out.push(mirrorH(g));
  // GS5 FADE — burns out from the buried end UP; the crown goes last; motes rise.
  g = mkGrid(GS.W, GS.H);
  drawGreatBlade(g, { dim: true, brokenFrom: GS.GUARD + 14 });
  for (let i = 0; i < 6; i++) { putB(g, C - 6 - (i % 3), 18 + i * 10, i % 2 ? 'u' : 'G'); putB(g, C + 6 + (i % 3), 14 + i * 10, i % 2 ? 'G' : 'I'); }
  [[-3, 6], [3, 4], [-1, 2], [2, 8]].forEach(([dx, dy], i) => putB(g, C + dx, dy, i % 2 ? 'I' : 'u'));
  ellipseRing(g, C, GS.TIP + 2, 13, 2.6, 'u', { dash: 12, phase: 0.5 });
  for (let i = 0; i < 4; i++) { putB(g, C - 8 - i * 3, GS.TIP + 3, 'u'); putB(g, C + 8 + i * 3, GS.TIP + 3, 'u'); }
  out.push(mirrorH(g));
  return out;
}

const BURST = burstFrames();
const GREATSWORD = greatswordFrames();
const BLADESTUDY = bladeStudyFrames();

// =====================================================================
// THE CLIPS
// =====================================================================
const SECTIONS = [];

// ---- A. DRAGON WRATH RISE — the power-up (hero power up, frame-mapped) ----
SECTIONS.push({
  name: 'DRAGON WRATH RISE', short: 'RISE', frames: [
    // ref f1 — the blade is PRESENTED level in front, still steel.
    makeFrame({ tag: 'P0 PRESENT', phase: 'GATHER 3', hold: 3, where: 'STANDING GROUND',
      plainSword: true, twoHand: true, hand: [35, 26], angle: 0, reach: BASE_REACH,
      fx: (b, f, m) => { gatherMotes(f, 40, 24, [[-3, -2], [4, -1], [1, 3]]); } }),
    // ref f2 — the blade swings VERTICAL before the body; the ground ring ignites.
    makeFrame({ tag: 'P1 RAISE', phase: 'GATHER 3', hold: 3, where: 'STANDING GROUND',
      plainSword: true, twoHand: true, hand: [34, 25], angle: -90, reach: BASE_REACH,
      fx: (b, f, m) => {
        groundHalo(b, 29, 0);
        gatherMotes(f, 34, 16, [[-4, 2], [5, 3], [-2, 6]]);
      } }),
    // ref f3-f4 — IGNITION: the gold runs hilt->tip up the vertical blade.
    makeFrame({ tag: 'P2 IGNITE', phase: 'IGNITE 3', hold: 3, where: 'STANDING GROUND',
      ignite: 0.55, flare: true, twoHand: true, hand: [34, 25], angle: -90, reach: WRATH_REACH,
      fx: (b, f, m) => {
        groundHalo(b, 29, 1);
        disc(f, 28, 25, 1.2, 'W');
        mote(f, m, 24, 14, 'I'); mote(f, m, 40, 13, 'y');
      } }),
    // ref f5-f8 — THE BUILD (held): full gold column, radiance streams up the body.
    makeFrame({ tag: 'P3 BUILD', phase: 'BUILD 6 - HOLD', hold: 6, where: 'STANDING GROUND',
      radiant: true, seed: 19, rim: 0.5, flare: true, streamers: [29, 10], twoHand: true,
      hand: [34, 25], angle: -90, reach: WRATH_REACH,
      fx: (b, f, m) => {
        groundHalo(b, 29, 2);
        mote(f, m, 22, 12, 'I'); mote(f, m, 37, 10, 'I');
      } }),
    // ref f11-f12 — THE SNAP: the radial starburst fires at the hilt.
    makeFrame({ tag: 'P4 SNAP', phase: 'RELEASE 5 - HOLD', hold: 5, where: 'STANDING GROUND',
      radiant: true, seed: 23, rim: 0.8, flare: true, aura: 0.3, crown: 0, twoHand: true,
      hand: [34, 25], angle: -90, reach: WRATH_REACH,
      fx: (b, f, m) => {
        groundHalo(b, 29, 2);
        starburst(b, 34, 26, true);
        spark(b, 18, 14, 1); spark(b, 46, 15, 1);
        mote(f, m, 26, 6, 'W'); mote(f, m, 40, 5, 'I');
      } }),
    // ref f13 — the burst clears into rising streaks.
    makeFrame({ tag: 'P5 STREAKS', phase: 'RELEASE 3', hold: 3, where: 'STANDING GROUND',
      radiant: true, seed: 29, rim: 0.5, crown: 1, twoHand: true,
      hand: [34, 25], angle: -90, reach: WRATH_REACH,
      fx: (b, f, m) => {
        groundHalo(b, 29, 1);
        riseStreaks(b, 34, 24, 6, 3);
        mote(f, m, 30, 4, 'I'); mote(f, m, 38, 3, 'u');
      } }),
    // ref f14 — THE FLOURISH: a small presenting downswing with a gold trail.
    makeFrame({ tag: 'P6 FLOURISH', phase: 'SETTLE 4', hold: 4, where: 'STANDING GROUND',
      radiant: true, seed: 31, rim: 0.45, crown: 0, aura: 0.24,
      lean: [1, 0], lunge: [2, 0], hand: [36, 27], angle: 38, reach: WRATH_REACH,
      fx: (b, f, m) => {
        arcSmear(b, 30, 20, 15, -60, 40, ['y', 'o'], { maxW: 2, broken: true, dim: true });
        mote(f, m, 44, 18, 'I'); mote(f, m, 39, 13, 'G');
      } }),
    // ref f18 — POWERED IDLE: the reusable state pose, gold blade at the ready.
    makeFrame({ tag: 'P7 WRATH IDLE', phase: 'STATE LOOP 4', hold: 4, where: 'STANDING GROUND',
      radiant: true, seed: 41, rim: 0.4, crown: 1, aura: 0.2,
      hand: [33, 27], angle: -14, reach: WRATH_REACH,
      fx: (b, f, m) => { mote(f, m, 23, 13, 'u'); mote(f, m, 36, 11, 'I'); } }),
  ],
});

// ---- B. SWING 1 — the overhead CRASH (bswordcombo f0-f8) ----
SECTIONS.push({
  name: 'SWING 1 - THE CRASH', short: 'SW1', frames: [
    // f0-f1 — the HIGH BACK CARRY: arm raised, the huge blade hangs down-back
    // over the shoulder. Front foot already stepping.
    makeFrame({ tag: 'S1A CARRY', phase: 'WINDUP 3', hold: 3, where: 'COMBO GROUND',
      radiant: true, seed: 47, rim: 0.4, crown: 0, bladeBehind: true,
      lunge: [2, 0], hand: [31, 18], angle: -152, reach: WRATH_REACH,
      fx: (b, f, m) => { gatherMotes(f, 18, 12, [[-2, -2], [3, -1]]); } }),
    // f2 — the PITCH: torso pitches hard forward, back leg kicks up, the blade
    // sweeps over the top of the arc.
    makeFrame({ tag: 'S1B PITCH', phase: 'WINDUP 2 - LEG KICKS UP', hold: 2, where: 'COMBO GROUND',
      radiant: true, seed: 53, rim: 0.45, crown: 1, twoHand: true,
      lean: [3, 1], legLift: [-2, -4], cape: [-1, -2], hand: [33, 15], angle: -95, reach: WRATH_REACH,
      fx: (b, f, m) => {
        arcSmear(b, CC[0], CC[1], S1.r, S1.arc[0], -78, ['I', 'y'], { maxW: 2, broken: true, dim: true });
        mote(f, m, 20, 4, 'I');
      } }),
    // f3 — THE CRASH (held): the giant crescent from overhead-back to the
    // low-front plant; deep forward crouch; floor skim sparks ahead.
    makeFrame({ tag: 'S1C CRASH', phase: 'ACTIVE 6 - HOLD', hold: 6, where: 'COMBO GROUND - THE CRASH',
      radiant: true, seed: 59, rim: 0.6, crown: 0, flare: true, flareBlade: true, twoHand: true,
      lean: [4, 3], lunge: [4, 1], cape: [2, -1], hand: [38, 27], angle: 52, reach: WRATH_REACH,
      fx: (b, f, m) => {
        arcSmear(b, CC[0], CC[1], S1.r, S1.arc[0], S1.arc[1], ['W', 'I', 'y'], { maxW: 4, belly: 'o', skim: true });
        impactStar(f, 50, 36, true);
        for (let i = 0; i < 5; i++) { putB(b, 40 + i * 3, FLOOR - 1, i % 2 ? 'o' : 'y'); if (i % 2) putB(b, 41 + i * 3, FLOOR, 'u'); }
        mote(f, m, 18, 6, 'I');
      } }),
    // f4-f6 — the DEEP CROUCH: the body stays down, blade resting low-front.
    // The reference spends five frames here — the weight of the swing.
    makeFrame({ tag: 'S1D CROUCH', phase: 'RECOVER 4 - WEIGHT DOWN', hold: 4, where: 'COMBO GROUND',
      radiant: true, seed: 61, rim: 0.4, crown: 0, twoHand: true,
      lean: [3, 4], lunge: [3, 1], cape: [1, 0], hand: [37, 30], angle: 30, reach: WRATH_REACH,
      fx: (b, f, m) => {
        arcSmear(b, CC[0], CC[1], S1.r, 8, S1.arc[1], ['W', 'I'], { maxW: 2, broken: true, dim: true, skim: true });
        mote(f, m, 46, 22, 'I'); mote(f, m, 51, 26, 'u');
      } }),
    makeFrame({ tag: 'S1E SETTLE', phase: 'RECOVER 3', hold: 3, where: 'COMBO GROUND',
      radiant: true, seed: 67, rim: 0.38, crown: 1, twoHand: true,
      lean: [2, 4], lunge: [3, 1], hand: [36, 30], angle: 24, reach: WRATH_REACH,
      fx: (b, f, m) => { mote(f, m, 48, 24, 'G'); } }),
  ],
});

// ---- C. SWING 2 — the LOW SWEEP into the LUNGE (bswordcombo f9-f30) ----
SECTIONS.push({
  name: 'SWING 2 - THE SWEEP', short: 'SW2', frames: [
    // f9-f12 — the DRAG: still low, the blade drags back past the hip, the
    // body coils onto the back leg. The entry of the low arc shows behind.
    makeFrame({ tag: 'S2A DRAG', phase: 'WINDUP 3', hold: 3, where: 'COMBO GROUND',
      radiant: true, seed: 71, rim: 0.4, crown: 0, twoHand: true,
      lean: [-1, 2], cape: [1, 0], hand: [26, 30], angle: 155, reach: WRATH_REACH,
      fx: (b, f, m) => {
        arcSmear(b, S2.c[0], S2.c[1], S2.r, S2.arc[0] + 14, S2.arc[0], ['o', 'G'], { maxW: 1, broken: true, dim: true });
        gatherMotes(f, 13, 33, [[-2, -1], [3, -2]]);
      } }),
    // f13-f20 — THE SWEEP (held): the blade whips through the bottom-front
    // into a LONG stretched lunge — torso pitched, blade skimming the floor,
    // the horizontal smear filling the low lane.
    makeFrame({ tag: 'S2B SWEEP', phase: 'ACTIVE 6 - HOLD', hold: 6, where: 'COMBO GROUND - THE LUNGE',
      radiant: true, seed: 73, rim: 0.6, crown: 1, flare: true, flareBlade: true, twoHand: true,
      lean: [5, 2], lunge: [6, 2], cape: [3, -1], hand: [40, 30], angle: 8, reach: WRATH_REACH,
      fx: (b, f, m) => {
        arcSmear(b, S2.c[0], S2.c[1], S2.r, S2.arc[0], S2.arc[1], ['W', 'I', 'y'], { maxW: 3, belly: 'o' });
        for (let i = 0; i < 7; i++) { putB(b, 30 + i * 4, FLOOR - 1, i % 2 ? 'o' : 'y'); if (i % 2) putB(b, 31 + i * 4, FLOOR, 'u'); }
        speedLine(b, 14, 33, 24, 33, { core: 'I', rim: 'o', gap: 1, dim: true, broken: 4 });
        impactStar(f, 57, 33, false);
        mote(f, m, 30, 18, 'I');
      } }),
    // f21-f26 — the LUNGE HOLD: fully extended, the trail fading — the
    // reference's longest still. The blade hovers just off the floor.
    makeFrame({ tag: 'S2C LUNGE', phase: 'FOLLOW 4 - FULL STRETCH', hold: 4, where: 'COMBO GROUND',
      radiant: true, seed: 79, rim: 0.45, crown: 0, twoHand: true,
      lean: [5, 3], lunge: [6, 2], hand: [41, 31], angle: 4, reach: WRATH_REACH,
      fx: (b, f, m) => {
        arcSmear(b, S2.c[0], S2.c[1], S2.r, -25, S2.arc[1], ['W', 'I'], { maxW: 2, broken: true, dim: true });
        for (let i = 0; i < 4; i++) putB(b, 38 + i * 5, FLOOR - 1, i % 2 ? 'G' : 'o');
        mote(f, m, 50, 24, 'I'); mote(f, m, 44, 20, 'u');
      } }),
    // f27-f28 — the RISE: momentum carries the blade to FULL VERTICAL
    // overhead; the rising fan smear behind it. Body straightens tall.
    makeFrame({ tag: 'S2D RISE', phase: 'FOLLOW 3 - TO VERTICAL', hold: 3, where: 'COMBO GROUND',
      radiant: true, seed: 83, rim: 0.5, crown: 0, twoHand: true,
      lean: [0, -1], lunge: [2, 0], cape: [0, 1], hand: [33, 22], angle: S2.rise[1], reach: WRATH_REACH,
      fx: (b, f, m) => {
        arcSmear(b, CC[0], CC[1], S2.r, S2.rise[0], S2.rise[1], ['I', 'y'], { maxW: 2, broken: true, dim: true });
        mote(f, m, 44, 6, 'I'); mote(f, m, 39, 3, 'y');
      } }),
    // f29-f30 — the SHOULDER: the blade settles onto the shoulder — this IS
    // the bswordcombo2 carry; the charge begins from exactly here.
    makeFrame({ tag: 'S2E SHOULDER', phase: 'LINK 2 - ONTO THE SHOULDER', hold: 2, where: 'COMBO GROUND - CHARGE ENTRY',
      radiant: true, seed: 89, rim: 0.42, crown: 1, twoHand: true, bladeBehind: true,
      lean: [-1, 0], hand: [31, 24], angle: S2.shoulder, reach: WRATH_REACH,
      fx: (b, f, m) => { mote(f, m, 17, 8, 'I'); mote(f, m, 24, 5, 'u'); } }),
  ],
});

// ---- D. THE CHARGE — shouldered greatsword (bswordcombo2) ----
// Wide low stance, the huge blade shouldered up-back, ragged gold radiance
// flaring around the body and BUILDING across the hold. 90 ticks = 1.5 s.
SECTIONS.push({
  name: 'CROWN CHARGE', short: 'CHARGE', frames: [
    makeFrame({ tag: 'C0 PLANT', phase: 'ENTRY 10', hold: 10, where: 'CHARGE GROUND',
      radiant: true, seed: 97, rim: 0.4, crown: 0, twoHand: true, bladeBehind: true,
      lunge: [3, 2], lean: [0, 1], hand: [31, 24], angle: S2.shoulder, reach: WRATH_REACH,
      fx: (b, f, m) => {
        groundHalo(b, 29, 0);
        gatherMotes(f, 20, 14, [[-3, -2], [4, -1], [1, 4]]);
      } }),
    makeFrame({ tag: 'C1 EARLY', phase: 'GATHER 18', hold: 18, where: 'CHARGE GROUND',
      radiant: true, seed: 101, rim: 0.45, crown: 1, twoHand: true, bladeBehind: true, streamers: [29, 6],
      lunge: [3, 2], lean: [0, 1], hand: [31, 24], angle: S2.shoulder, reach: WRATH_REACH,
      fx: (b, f, m) => {
        groundHalo(b, 29, 1);
        mote(f, m, 40, 16, 'G'); mote(f, m, 19, 18, 'u');
      } }),
    makeFrame({ tag: 'C2 STRONG', phase: 'BUILD 22', hold: 22, where: 'CHARGE GROUND',
      radiant: true, seed: 103, rim: 0.5, crown: 0, twoHand: true, bladeBehind: true, streamers: [29, 9],
      lunge: [3, 2], lean: [0, 1], cape: [1, 0], hand: [31, 24], angle: S2.shoulder, reach: WRATH_REACH,
      fx: (b, f, m) => {
        groundHalo(b, 29, 2);
        ringC(b, 29, 24, 13, 'G', { dash: 20, phase: 0.5 });
        mote(f, m, 42, 12, 'I'); mote(f, m, 16, 14, 'y');
      } }),
    makeFrame({ tag: 'C3 PEAK', phase: 'PEAK 28 - ARENA DARKENS', hold: 28, where: 'CHARGE GROUND',
      radiant: true, seed: 107, rim: 0.7, crown: 1, flare: true, flareBlade: true, twoHand: true, bladeBehind: true, streamers: [29, 12],
      lunge: [3, 2], lean: [0, 1], cape: [1, -1], hand: [31, 24], angle: S2.shoulder, reach: WRATH_REACH,
      fx: (b, f, m) => {
        groundHalo(b, 29, 2);
        haloSnap(b, 29, 22, 15);
        for (let i = 0; i < 6; i++) putB(b, 17 + i * 4, FLOOR - 1, i % 2 ? 'o' : 'y');
        mote(f, m, 22, 4, 'W'); mote(f, m, 37, 3, 'I');
      } }),
    makeFrame({ tag: 'C4 LOOSE', phase: 'RELEASE 12 - THE FLASH FIRES', hold: 12, where: 'CHARGE GROUND',
      radiant: true, seed: 109, rim: 0.55, crown: 0, twoHand: true, streamers: [29, 8],
      lunge: [3, 1], lean: [0, -1], hand: [33, 20], angle: -100, reach: WRATH_REACH,
      fx: (b, f, m) => {
        groundHalo(b, 29, 1);
        put(f, 30, 3, 'W'); put(f, 31, 1, 'I');
        mote(f, m, 26, 5, 'I'); mote(f, m, 36, 4, 'I');
      } }),
  ],
});

// ---- E. UNDER THE FALL + SETTLE ----
SECTIONS.push({
  name: 'DRAGONFALL WATCH', short: 'SETL', frames: [
    makeFrame({ tag: 'F1 GUARD', phase: 'WATCH 22', hold: 22, where: 'UNDER THE FALL',
      radiant: true, seed: 113, rim: 0.42, crown: 1, twoHand: true,
      lean: [1, 0], hand: [34, 26], angle: -10, reach: WRATH_REACH,
      fx: (b, f, m) => {
        for (let i = 0; i < 5; i++) putB(b, 34 + i * 3, FLOOR - 1, i % 2 ? 'G' : 'o');
        mote(f, m, 24, 12, 'I');
      } }),
    makeFrame({ tag: 'F2 SETTLE', phase: 'STATE ENDS 22', hold: 22, where: 'AFTER THE STRIKE',
      settle: true, lean: [0, 1], hand: [33, 28], angle: 14, reach: WRATH_REACH,
      fx: (b, f, m) => {
        ringC(b, 29, 14, 5, 'G', { dash: 11, phase: 1.5, arcFrom: RAD(-150), arcTo: RAD(-30) });
        mote(f, m, 29, 8, 'u'); mote(f, m, 25, 10, 'G'); mote(f, m, 35, 9, 'u');
        for (let i = 0; i < 4; i++) putB(b, 22 + i * 5, FLOOR - 1, 'u');
      } }),
  ],
});

const STEP_NOTE = [
  ['THE POWER-UP - MAPPED FRAME BY FRAME FROM THE HERO POWER UP REFERENCE',
   'PRESENT LEVEL - RAISE VERTICAL + GROUND RING - GOLD RUNS HILT TO TIP - HELD BUILD - STARBURST SNAP - RISING STREAKS - FLOURISH - POWERED IDLE',
   'THE REFERENCE RAISES THE BLADE VERTICAL BEFORE THE BODY AND IGNITES IT THERE - THE RING UNDER THE FEET - THE RADIANCE CLIMBING THE BODY - THE',
   '    RADIAL SNAP - THE LITTLE PRESENTING DOWNSWING - ALL EIGHT BEATS ARE HERE ON OUR KNIGHT. THE BLADE COMES OUT GOLD - LARGER - LIGHTSABER-BRIGHT.'],
  ['SWING 1 - THE OVERHEAD CRASH - BSWORDCOMBO F0 TO F8',
   'HIGH BACK CARRY - THE PITCH WITH THE BACK LEG KICKED UP - ONE HUGE CRESCENT TO THE LOW-FRONT PLANT - THEN THE LONG DEEP CROUCH',
   'THE REFERENCE PUTS THE WHOLE SMEAR IN ONE FRAME AND THEN HOLDS THE CROUCH FOR FIVE - THE SMEAR-FRAME IDIOM. WE KEEP IT - CRASH HELD 6 TICKS -',
   '    CROUCH 7 MORE. THE TORSO PITCHES ALMOST FLAT - THE BACK LEG TRAILS UP ON THE PITCH FRAME - THE STAR SITS WHERE THE EDGE MEETS THE FLOOR.'],
  ['SWING 2 - THE LOW SWEEP INTO THE LUNGE - BSWORDCOMBO F9 TO F30',
   'THE DRAG PAST THE HIP - THE FLOOR-SKIMMING CLEAVE INTO THE FULL STRETCH - THE RISE TO VERTICAL - THE SETTLE ONTO THE SHOULDER',
   'THE REFERENCE STRETCHES INTO THE LONGEST LUNGE IN THE CLIP AND HOLDS IT - THEN THE MOMENTUM CARRIES THE BLADE STRAIGHT UP OVERHEAD WITH A RISING',
   '    FAN AND IT COMES TO REST ON THE SHOULDER. THAT REST IS THE CHARGE ENTRY - THE CHAIN INTO BSWORDCOMBO2 IS THE REFERENCE S OWN ENDING.'],
  ['THE CHARGE - THE SHOULDERED GREATSWORD - BSWORDCOMBO2 - 90 TICKS = 1.5 S',
   'WIDE LOW STANCE - THE BLADE SHOULDERED UP-BACK - RAGGED GOLD RADIANCE FLARING AND BUILDING - GROUND HALO - PEAK - THEN THE LOOSE',
   'THE SILHOUETTE REFERENCE CARRIES THE SWORD OVER THE SHOULDER WITH ENERGY TATTERING AROUND THE BODY - OURS WEARS GOLD RADIANCE STREAMERS -',
   '    BROKEN RISING DASHES - NEVER FIRE. THE STREAMERS GROW C1 TO C3 - ASSERTED - AND C4 SWINGS THE BLADE UP AS THE FLASH FIRES.'],
  ['THE HERO UNDER THE FALL - THEN THE STATE ENDS ON THE BODY',
   'F1 GUARDS UNDER THE DESCENT. F2 IS THE DEACTIVATION - CROWN FRAGMENTS - GOLD DRAINS FROM THE TIP IN - THE BLUE EDGE RETURNS',
   'THE WRATH NEVER JUST POPS OFF - THE SETTLE PLAYS THE FAMILY DISSOLVE ON THE WEAPON AND THE CROWN - LIGHT RISES OFF BOTH - AND THE',
   '    CHARACTER WALKS OUT WITH HIS OWN COLD-BLUE SWORD BACK.'],
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
SECTIONS.forEach(s => s.frames.forEach(fr => { fr.grid = compose(fr); }));

// =====================================================================
// THE MASTER CLOCK
// =====================================================================
const SEC_HOLDS = SECTIONS.map(s => s.frames.reduce((a, f) => a + f.hold, 0));
const T_SEC = []; { let t = 0; SEC_HOLDS.forEach(h => { T_SEC.push(t); t += h; }); }
const TOTAL = SEC_HOLDS.reduce((a, b) => a + b, 0);
const CHARGE_TICKS = SEC_HOLDS[3];
const CHARGE_T0 = T_SEC[3];
const DARKEN_START = CHARGE_T0 + 10 + 18 + 22;
const FLASH_START = CHARGE_T0 + CHARGE_TICKS - 3;
const FLASH_LEN = 6, FLASH_FULL = 2;                 // 2 ticks of near-whiteout inside the 6
const GS_T0 = T_SEC[4];
const GS_HOLDS = [6, 6, 8, 4, 10, 10];
const GS_T = []; { let t = GS_T0; GS_HOLDS.forEach(h => { GS_T.push(t); t += h; }); }
const CONTACT_TICK = GS_T[3];
const PEAK_TICK = GS_T[4];
const GS_END = GS_T0 + GS_HOLDS.reduce((a, b) => a + b, 0);
const DARKEN_LIFT = GS_T[5];

// =====================================================================
// VALIDATION (throws on violation)
// =====================================================================
let vErr = 0;
const fail = (...m) => { console.error('FAIL', ...m); vErr++; };
for (const [k, hex] of Object.entries(LIGHT)) {
  const [r, g2, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  if (!(r >= g2 && g2 >= b)) fail('warm law', k, hex);
}
for (const [src, dst] of Object.entries(DIMENV)) {
  const S = [1, 3, 5].map(i => parseInt(src.slice(i, i + 2), 16));
  const D = [1, 3, 5].map(i => parseInt(dst.slice(i, i + 2), 16));
  if (!(D[0] < S[0] && D[1] < S[1] && D[2] < S[2])) fail('dim map not darker', src, dst);
}
const LK = new Set(Object.keys(LIGHT));
const LKD = new Set([...LK, '.']);
const FXKEYS = new Set([...LK, '5', '4', '3', '2', '1', '.']);
const ALLKEYS = new Set([...Object.keys(COMBO_PAL), '.']);
const baseCount = heroBase.flat().filter(k => k !== '.').length;
const litCount = g => g.flat().filter(k => k !== '.').length;
const lightCount = g => g.flat().filter(k => LK.has(k)).length;
const blueCount = g => g.flat().filter(k => k === 'l' || k === 'L').length;
const meanY = g => { let s = 0, n = 0; g.forEach((row, y) => row.forEach(k => { if (k !== '.') { s += y; n++; } })); return n ? s / n : 0; };
const bbox = g => { let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
  g.forEach((row, y) => row.forEach((k, x) => { if (k !== '.') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, x1, y0, y1 }; };

const CHAR_BLUES = 6;
SECTIONS.forEach(sec => sec.frames.forEach(fr => {
  const id = `${sec.name} ${fr.tag}`;
  if (fr.grid.length !== GH || fr.grid.some(r => r.length !== GW)) fail('size', id);
  fr.grid.flat().forEach(k => { if (!ALLKEYS.has(k)) fail('key', id, k); });
  [fr.fxB, fr.fxF].forEach((fx, li) => fx.flat().forEach(k => {
    if (!FXKEYS.has(k)) fail('fx key', id, li ? 'front' : 'back', k);
  }));
  const bodyFeet = fr.body.slice(FLOOR - 1).flat().filter(k => k !== '.').length;
  if (bodyFeet < 4) fail('feet missing', id, bodyFeet);
  const bodyCount = litCount(fr.body);
  if (bodyCount < baseCount * 0.78 || bodyCount > baseCount * 1.45) fail('body mass', id, bodyCount, 'base', baseCount);
  if (fr.radiant) {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++)
      if ((fr.body[y][x] === '.') !== (fr.bodyPre[y][x] === '.')) { fail('radiant mask desync', id, x, y); y = GH; break; }
  }
  let cover = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++)
    if (fr.fxF[y][x] !== '.' && fr.body[y][x] !== '.') cover++;
  const lim = fr.flare ? 18 : 8;
  if (cover > lim) fail('body cover', id, cover, '>', lim);
  if (fr.meta.aura !== undefined && (fr.meta.aura < 4 || fr.meta.aura > 34)) fail('aura bounds', id, fr.meta.aura);
  if (fr.meta.streamers !== undefined && (fr.meta.streamers < 8 || fr.meta.streamers > 110)) fail('streamer bounds', id, fr.meta.streamers);
  // gold blade law: wrath frames carry no blue beyond the character's own
  // visor+sigil, and the blade is a LIGHT body — W core + gold sides present.
  // Behind-carries lose covered cells to the body (that is the carry), and
  // flare frames trade y for W — thresholds account for both.
  const blues = blueCount(fr.body);
  const bodyW = fr.body.flat().filter(k => k === 'W').length;
  const bodyY = fr.body.flat().filter(k => k === 'y').length;
  if (fr.wrathOn) {
    if (blues > CHAR_BLUES) fail('wrath blade leaked blue', id, blues);
    if (blues < 2) fail('character blues erased', id, blues);
    const wMin = fr.behind ? 4 : WRATH_REACH - 4;
    const yMin = fr.behind ? 8 : (fr.flareBlade ? WRATH_REACH - 4 : WRATH_REACH - 2);
    if (bodyW < wMin) fail('gold blade core missing', id, bodyW);
    if (bodyY < yMin) fail('gold blade body missing', id, bodyY);
  } else if (fr.partial) {
    if (blues < CHAR_BLUES) fail('igniting frame lost the character blues', id, blues);
  } else if (blues < CHAR_BLUES + 3) fail('non-wrath frame lost its blue blade', id, blues);
}));

// ---- the transformed sword is LARGER — and the swings are two-handed ----
if (WRATH_REACH < BASE_REACH * 1.3) fail('blade not larger', WRATH_REACH, BASE_REACH);
[[1, 2], [2, 1]].forEach(([si, fi]) => { if (!SECTIONS[si].frames[fi].twoHand) fail('active swing not two-handed', SECTIONS[si].frames[fi].tag); });

// ---- reference-fidelity laws, made checkable ----
{
  // S1 crash crescent must span from the overhead-back quadrant to the low-front.
  const fx = SECTIONS[1].frames[2].fxB;
  let backHigh = 0, frontLow = 0;
  fx.forEach((row, y) => row.forEach((k, x) => {
    if (!LK.has(k)) return;
    if (x < CC[0] - 4 && y < CC[1] - 8) backHigh++;
    if (x > CC[0] + 8 && y > CC[1] + 4) frontLow++;
  }));
  if (backHigh < 8 || frontLow < 8) fail('S1 crescent span', backHigh, frontLow);
  // the crouch is DEEP: body height clearly below standing height.
  const standH = bbox(SECTIONS[0].frames[7].body).h;
  const crouchH = bbox(SECTIONS[1].frames[3].body).h;
  if (crouchH > standH * 0.85) fail('S1 crouch not deep', crouchH, standH);
  // the pitch frame lifts the back leg off the floor rows but keeps the front foot.
  const pitch = SECTIONS[1].frames[1].body;
  const pitchFeet = pitch.slice(FLOOR - 1).flat().filter(k => k !== '.').length;
  if (pitchFeet < 4 || pitchFeet > 14) fail('S1 pitch footing', pitchFeet);
  // S2 lunge is a FULL STRETCH: wider than the standing body by a clear margin.
  const standW = bbox(SECTIONS[0].frames[7].body).w;
  const lungeW = bbox(SECTIONS[2].frames[2].body).w;
  if (lungeW < standW * 1.18) fail('S2 lunge not stretched', lungeW, standW);
  // S2 sweep skims the floor: skim ticks present on the floor rows.
  const sweepFx = SECTIONS[2].frames[1].fxB;
  const skimN = sweepFx.slice(FLOOR - 1).flat().filter(k => LK.has(k)).length;
  if (skimN < 4) fail('S2 sweep not skimming', skimN);
  // S2 rise ends essentially vertical; the shoulder carry is up-back.
  if (Math.abs(S2.rise[1] + 90) > 8) fail('S2 rise not vertical', S2.rise[1]);
  if (!(S2.shoulder < -115 && S2.shoulder > -145)) fail('shoulder carry angle', S2.shoulder);
  // the charge radiance BUILDS: streamer counts strictly rise C1 -> C2 -> C3.
  const st = fi => SECTIONS[3].frames[fi].meta.streamers || 0;
  if (!(st(1) < st(2) && st(2) < st(3))) fail('charge radiance not building', st(1), st(2), st(3));
}

// ---- escalation across the move ----
{
  const lAct = lightCount(SECTIONS[0].frames[4].grid);
  const lS1 = lightCount(SECTIONS[1].frames[2].grid);
  const lS2 = lightCount(SECTIONS[2].frames[1].grid);
  const lCharge = lightCount(SECTIONS[3].frames[3].grid);
  const lFin = lightCount(GREATSWORD[4]) + lightCount(BURST[1]);
  if (!(lS1 > lAct * 0.8 && lS2 > lAct * 0.8)) fail('swings under-lit', lAct, lS1, lS2);
  if (!(lFin > lCharge && lFin > lS1 && lFin > lS2)) fail('finisher not dominant', lCharge, lS1, lS2, lFin);
}

// ---- sub-effect grids ----
function checkGrid(name, g, w, h, keys = LKD) {
  if (g.length !== h || g.some(r => r.length !== w)) fail('size', name, g.length, g[0].length);
  for (const r of g) for (const k of r) if (!keys.has(k)) fail('key', name, k);
}
BURST.forEach((g, i) => checkGrid('burst' + i, g, WB.W, WB.H));
GREATSWORD.forEach((g, i) => checkGrid('greatsword' + i, g, GS.W, GS.H));
BLADESTUDY.forEach((g, i) => checkGrid('bladestudy' + i, g, SS.W, SS.H, new Set([...LK, '0', '1', '2', '3', '4', '5', 'l', 'L', 'g', '.'])));
const hSym = (g, name) => {
  const w = g[0].length;
  for (let y = 0; y < g.length; y++) for (let x = 0; x < Math.floor(w / 2); x++)
    if (g[y][x] !== g[y][w - 1 - x]) { fail('h-symmetry', name, x, y); return; }
};
BURST.forEach((g, i) => hSym(g, 'burst' + i));
GREATSWORD.forEach((g, i) => hSym(g, 'greatsword' + i));
{
  // the flash is STRONG — white-heavy at the blaze — but never stuck.
  const wShare = g => g.flat().filter(k => k === 'W').length / Math.max(1, lightCount(g));
  if (wShare(BURST[1]) < 0.45) fail('flash not white enough', wShare(BURST[1]).toFixed(2));
  let hollow = 0;
  BURST[2].forEach((row, y) => row.forEach((k, x) => { if (k !== '.' && Math.hypot(x - WB.C, y - WB.C) < 4) hollow++; }));
  if (hollow > 0) fail('flash does not clear', hollow);
  if (FLASH_LEN > 10 || FLASH_FULL > 4) fail('flash lingers', FLASH_LEN, FLASH_FULL);
  if (FLASH_START - DARKEN_START < 24) fail('darken lead too short', FLASH_START - DARKEN_START);
  if (CHARGE_TICKS !== 90) fail('charge is not 1.5 s', CHARGE_TICKS);
  if (GS_END !== TOTAL) fail('clocks do not close together', GS_END, TOTAL);
}
{
  const g1 = GREATSWORD[1];
  const widthAt = y => { let lo = -1, hi = -1; for (let x = 0; x < GS.W; x++) if (g1[y][x] !== '.') { if (lo < 0) lo = x; hi = x; } return lo < 0 ? 0 : hi - lo + 1; };
  const guardW = widthAt(GS.GUARD), rootW = widthAt(GS.GUARD + 4), nearTipW = widthAt(GS.TIP - 3);
  if (guardW < rootW * 1.7) fail('guard not dominant', guardW, rootW);
  if (nearTipW > 3) fail('tip not tapered', nearTipW);
  if (rootW - nearTipW < 4) fail('blade reads as a beam', rootW, nearTipW);
  const bladeLen = GS.TIP - (GS.GUARD + 3);
  if (bladeLen < 24 * 2.5) fail('blade not at overwhelming scale', bladeLen);
  let wCore = 0, coreRows = 0, yBody = 0;
  for (let y = GS.GUARD + 3; y <= GS.TIP; y++) { coreRows++; if (g1[y][GS.C] === 'W') wCore++; }
  g1.forEach(row => row.forEach(k => { if (k === 'y') yBody++; }));
  if (wCore / coreRows < 0.9) fail('white core broken', (wCore / coreRows).toFixed(2));
  if (yBody / lightCount(g1) < 0.3) fail('greatsword not golden', (yBody / lightCount(g1)).toFixed(2));
  let missing = 0;
  for (let y = 0; y < GS.H; y++) for (let x = 0; x < GS.W; x++)
    if (g1[y][x] !== '.' && GREATSWORD[2][y][x] !== g1[y][x]) missing++;
  if (missing > 0) fail('descent changed the sword', missing);
  if (!(litCount(GREATSWORD[5]) < litCount(GREATSWORD[4]) * 0.75)) fail('fade not thinning');
  const third = (g, lo, hi) => { let n = 0; g.forEach((row, y) => { if (y >= lo && y < hi) row.forEach(k => { if (k !== '.') n++; }); }); return n; };
  const bot4 = third(GREATSWORD[4], 59, 88), bot5 = third(GREATSWORD[5], 59, 88);
  const top4 = third(GREATSWORD[4], 0, 29), top5 = third(GREATSWORD[5], 0, 29);
  if (!(bot5 < bot4 * 0.6)) fail('buried end not burning out first', bot5, bot4);
  if (!(top5 > top4 * 0.35)) fail('crown vanished too soon', top5, top4);
  if (!(meanY(GREATSWORD[5]) < meanY(GREATSWORD[4]))) fail('greatsword light does not rise');
}

// =====================================================================
// SHEET
// =====================================================================
const SW = 690, SH = 1608, SCALE = 3;
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
  '+': '000010111010000', '=': '000111000111000',
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
text('HERO DRAGON WRATH + COMBO B - STAGE 8C-1 REDO V2 - REFERENCE-FAITHFUL PASS - STRICT PIXEL ART', 3, 2, HEADC);
text('FULL REDO FROM SCRATCH. THE FOUR REFERENCES WERE DECODED FRAME BY FRAME AND ARE THE MAIN VISUAL TARGETS. NOTHING WIRED INTO SRC.', 3, 9);
text('HERO POWER UP 19F - THE ACTIVATION BEAT MAP. BSWORDCOMBO 31F - THE TWO SWINGS AND THE MOTION QUALITY. BSWORDCOMBO2 - THE', 3, 15);
text('SHOULDERED CHARGE. BIGSWORD - THE LETTERBOXED DARKEN - WHITE FLASH - DESCENDING GIANT SWORD - IMPACT.', 3, 21);
text('PALETTE LAW - WHITE CORE + GOLD ONLY - NO BLUE IN THE EFFECTS - NO BLUR - NO GRADIENTS - NO NEW COLORS - NO NEW RAMP', 3, 29, HEADC);
(() => {
  const keys = ['W', 'I', 'y', 'o', 'G', 'u'];
  const roles = ['CORE', 'IVORY', 'RADIANT', 'WARM', 'DEEP', 'BRONZE'];
  keys.forEach((k, i) => {
    const x = 3 + i * 34;
    cellFrame(x, 36, 30, 10, LIGHT[k]);
    text(k, x + 1, 49, '#6d6488'); text(roles[i], x + 6, 49, SUBC);
  });
  text('WARM LAW R OVER G OVER B EVERY STEP - BLUE CANNOT EXIST IN THE RAMP', 213, 37);
  text('THE VISOR AND CHEST SIGIL KEEP THEIR COLD BLUE - THE CHARACTER NOT THE EFFECT', 213, 43);
  text('CANVAS 60X40 - HERO BASE AT 15.16 - FEET ROW 39 - GROWN FOR THE BIG BLADE AND THE LUNGES', 213, 49);
  text('THE TRANSFORMED SWORD - PER THE CORRECTED DIRECTION - A BRIGHT YELLOW-GOLD GLOWING BLADE - LIGHTSABER FEELING - W CORE - SOLID', 3, 56, GOLDC);
  text('GOLD BODY - WARM FRINGE - REACH 16 VS 11 - ASSERTED LARGER - TWO HANDS ON EVERY ACTIVE SWING - ASSERTED. THIS SUPERSEDES THE', 3, 62, GOLDC);
  text('V1 AIR-GAP SHEATH LAW - THE RAMP IS UNCHANGED SO THE LIGHT ECLIPSE FAMILY HOLDS.', 3, 68, GOLDC);
})();

// ---------- full sequence ----------
let Y = 78;
text('FULL SEQUENCE - 25 BODY FRAMES - 5 GROUPS - HOLDS AT 60FPS - TOTAL ' + TOTAL + ' TICKS WITH THE GREATSWORD CLOCK', 3, Y, HEADC);
(() => {
  const all = [];
  SECTIONS.forEach((s, si) => s.frames.forEach(fr => all.push({ fr, si })));
  const oy0 = Y + 8;
  all.forEach(({ fr, si }, i) => {
    const row = Math.floor(i / 10), col = i % 10;
    const x = 3 + col * 69, y = oy0 + row * 58;
    cellFrame(x, y, GW, GH, '#100d1c');
    stampM(fr.grid, COMBO_PAL, x, y);
    text(['RISE', 'SW1', 'SW2', 'CHRG', 'SETL'][si], x, y + GH + 3, GOLDC);
    text(fr.tag.split(' ')[0], x + 20, y + GH + 3, SUBC);
    text(fr.hold + 'T', x + 48, y + GH + 3, DIMC);
  });
})();
Y += 8 + 3 * 58 + 4;

// ---------- per-group bands ----------
SECTIONS.forEach((sec, si) => {
  text(sec.name + ' - ' + STEP_NOTE[si][0], 3, Y, HEADC);
  text(STEP_NOTE[si][1], 3, Y + 7, GOLDC);
  const oy = Y + 15;
  const s2 = sec.frames.length <= 5;
  sec.frames.forEach((fr, fi) => {
    const pitch = s2 ? 136 : 85;
    const sc = s2 ? 2 : 1.0;
    const x = 3 + fi * pitch;
    if (s2) {
      cellFrame(x, oy, GW * 2, GH * 2, '#100d1c');
      stampM(fr.grid, COMBO_PAL, x, oy, { s: 2 });
    } else {
      cellFrame(x, oy, GW, GH, '#100d1c');
      stampM(fr.grid, COMBO_PAL, x, oy);
    }
    text(fr.tag, x, oy + (s2 ? GH * 2 : GH) + 3, SUBC);
    text(fr.phase, x, oy + (s2 ? GH * 2 : GH) + 9, DIMC);
    text(fr.where, x, oy + (s2 ? GH * 2 : GH) + 15, /CRASH|LUNGE|DARKEN|ENTRY/.test(fr.where) ? GOLDC : DIMC);
  });
  const bandH = (sec.frames.length <= 5 ? GH * 2 : GH);
  const notes = STEP_NOTE[si].slice(2);
  notes.forEach((ln, i) => text(ln, 3, oy + bandH + 24 + i * 6, i === 0 ? SUBC : DIMC));
  Y = oy + bandH + 26 + notes.length * 6 + 4;
});

// ---------- THE TRANSFORMED SWORD ----------
text('THE WRATH BLADE V2 - THE TRANSFORMED SWORD AT 3X - BRIGHT GOLD ENERGY BLADE - THE PHYSICAL HILT NEVER CHANGES', 3, Y, HEADC);
text('BASE STEEL - IGNITING - EMPOWERED - IMPACT FLARE - SETTLE. REACH 16 VS 11 - THE BUFF MUST READ AS A MAJOR UPGRADE', 3, Y + 7, GOLDC);
(() => {
  const oy = Y + 15;
  const names = ['SS0 BASE', 'SS1 IGNITING', 'SS2 EMPOWERED', 'SS3 FLARE', 'SS4 SETTLE'];
  BLADESTUDY.forEach((g, i) => {
    const x = 3 + i * 92;
    cellFrame(x, oy, SS.W * 3, SS.H * 3, '#100d1c');
    stampM(g, COMBO_PAL, x, oy, { s: 3 });
    text(names[i], x, oy + SS.H * 3 + 3, i === 2 ? GOLDC : SUBC);
  });
  const nx = 470;
  text('W CORE EVERY CELL - SOLID GOLD BODY BOTH', nx, oy + 2);
  text('SIDES - WARM O FRINGE PIPS - ROUNDED', nx, oy + 8);
  text('ENERGY POINT. THE STEEL SWORD IS INSIDE', nx, oy + 14);
  text('THE LIGHT - THE HILT AND HIS OWN GOLD', nx, oy + 20);
  text('WINKS STAY. CARRIED TWO-HANDED IN EVERY', nx, oy + 26);
  text('ACTIVE SWING - ASSERTED.', nx, oy + 32, GOLDC);
  Y = oy + SS.H * 3 + 14;
})();

// ---------- THE FLASH + THE GIANT SWORD ----------
text('WRATH BURST V2 41X41 - THE STRONG WHITE FLASH - 2T WHITEOUT INSIDE 6', 3, Y, HEADC);
(() => {
  const oy = Y + 8;
  BURST.forEach((g, i) => {
    const x = 3 + i * 48;
    cellFrame(x, oy, WB.W, WB.H, '#100d1c');
    stampM(g, LIGHT, x, oy);
    text(['WB0 POP', 'WB1 BLAZE', 'WB2 CLEAR'][i], x, oy + WB.H + 3, i === 1 ? GOLDC : SUBC);
  });
  const nx = 155;
  text('THE REDO DIRECTION WANTS THE', nx, oy + 2);
  text('DETONATION STRONG - WB1 IS WHITE-', nx, oy + 8);
  text('HEAVY - ASSERTED OVER 45 PERCENT W -', nx, oy + 14);
  text('AND THE STRIP BELOW PLAYS IT OVER A', nx, oy + 20);
  text('NEAR-BLACK ARENA. WB2 IS HOLLOW -', nx, oy + 26);
  text('ASSERTED - THE SCREEN NEVER STICKS.', nx, oy + 32);
  // greatsword
  const gx0 = 320;
  text('DRAGONFALL GREATSWORD V2 41X88 - GOLDEN - 82X176 PX ON SCREEN', gx0, Y, HEADC);
  GREATSWORD.forEach((g, i) => {
    const x = gx0 + i * 47;
    cellFrame(x, oy, GS.W, GS.H, '#100d1c');
    stampM(g, LIGHT, x, oy);
    text(['GS0 FORM', 'GS1 HANG', 'GS2 FALL', 'GS3 TOUCH', 'GS4 PEAK', 'GS5 FADE'][i], x, oy + GS.H + 3, i === 4 ? GOLDC : SUBC);
    text(GS_HOLDS[i] + 'T' + (i === 4 ? ' HOLD' : ''), x, oy + GS.H + 9, DIMC);
  });
  Y = oy + GS.H + 18;
})();
(() => {
  text('THE MASSIVE VERSION OF THE EMPOWERED SWORD - SAME GOLD ENERGY BODY - W CORE ASSERTED CONTINUOUS - GOLD SHARE ASSERTED - POMMEL -', 3, Y);
  text('WIDE GUARD WITH QUILLONS ASSERTED 1.7X THE ROOT - HALO CROWN - POINT DOWN - THE TIP ROW PLANTS ON THE FLOOR LINE - THE FALL CARRIES', 3, Y + 6);
  text('THE SAME SWORD CELL FOR CELL - ASSERTED - AND THE FADE BURNS FROM THE BURIED END UP - MOTES RISE - THE CROWN GOES LAST - ASSERTED.', 3, Y + 12);
  Y += 22;
})();

// ---------- THE SCREEN EVENT (bigsword, letterboxed) ----------
function nightRoom(ox, oy, w, h, floorRel, opts = {}) {
  const { dim = false } = opts;
  const M = c => (dim ? (DIMENV[c] || c) : c);
  cellFrame(ox, oy, w, h, M(NW0));
  for (let y = 2; y < floorRel - 2; y += 7)
    for (let x = (y % 14 === 2 ? 4 : 9); x < w - 4; x += 17) paint(ox + x, oy + y, 6, 1, M(NW1), 1);
  const slit = (sx) => {
    paint(ox + sx, oy + 6, 5, 26, dim ? '#0e1119' : '#141826', 1);
    paint(ox + sx + 1, oy + 8, 3, 22, dim ? '#131a29' : '#1b2438', 1);
    paint(ox + sx + 2, oy + 10, 1, 5, M(WINL), 0.55); paint(ox + sx + 2, oy + 18, 1, 3, M(WINL), 0.35);
  };
  slit(Math.floor(w * 0.16)); slit(Math.floor(w * 0.72));
  paint(ox, oy + floorRel, w, 1, M(NF1), 1);
  paint(ox, oy + floorRel + 1, w, h - floorRel - 1, M(NF0), 1);
  return oy + floorRel;
}
function letterbox(ox, oy, w, h, bar) {
  paint(ox, oy, w, bar, LBAR, 1);
  paint(ox, oy + h - bar, w, bar, LBAR, 1);
}
function cornerVign(ox, oy, w, h) {
  const tri = (s, col) => {
    for (let i = 0; i < s; i++) for (let j = 0; j < s - i; j++) {
      paint(ox + j, oy + i, 1, 1, col, 1);
      paint(ox + w - 1 - j, oy + i, 1, 1, col, 1);
      paint(ox + j, oy + h - 1 - i, 1, 1, col, 1);
      paint(ox + w - 1 - j, oy + h - 1 - i, 1, 1, col, 1);
    }
  };
  tri(12, VIG1); tri(7, VIG2);
}
text('THE SCREEN EVENT - THE BIGSWORD STRUCTURE - LETTERBOX - DARKEN - STRONG WHITE FLASH - APPEAR - DESCEND - IMPACT - AFTERMATH', 3, Y, HEADC);
(() => {
  const oy = Y + 8, w = 94, hh = 96, fRel = 84, bar = 7;
  const titles = ['SE0 CHARGE', 'SE1 DARKEN', 'SE2 FLASH', 'SE3 APPEAR', 'SE4 DESCEND', 'SE5 IMPACT', 'SE6 AFTER'];
  for (let i = 0; i < 7; i++) {
    const ox = 3 + i * 98;
    const dim = i >= 1;
    const floorY = nightRoom(ox, oy, w, hh, fRel, { dim });
    const skyX = ox + 62, skyY = oy + 24;
    if (dim) cornerVign(ox, oy, w, hh);
    if (i >= 1) letterbox(ox, oy, w, hh, bar);              // the reference frame's cinematic bars
    if (i === 1) { for (let k = 0; k < 8; k++) paint(ox + 10 + k * 10, skyY - 6 + (k % 3), 1, 1, '#8a6420', 1); }
    if (i === 2) {
      paint(ox + 1, oy + bar, w - 2, hh - 2 * bar, '#efe8d8', 0.82);   // the near-whiteout beat (2 ticks)
      stampM(BURST[1], LIGHT, skyX - WB.C, skyY - WB.C);
      for (let k = 0; k < 4; k++) { paint(ox + 6, skyY - 8 + k * 6, 10 - k * 2, 1, '#fffdf4', 1); paint(ox + w - 16 + k * 2, skyY - 5 + k * 5, 10 - k * 2, 1, '#fffdf4', 1); }
    }
    if (i === 3) stampM(GREATSWORD[1], LIGHT, skyX - GS.C, oy + bar + 1);
    if (i === 4) { stampM(GREATSWORD[2], LIGHT, skyX - GS.C, oy + bar + 4); for (let k = 0; k < 3; k++) paint(skyX - 14 + k * 14, oy + bar + 2, 1, 4, '#f2e6bf', 1); }
    if (i === 5) { stampM(GREATSWORD[4], LIGHT, skyX - GS.C, floorY - GS.TIP - 1); }
    if (i === 6) { stampM(GREATSWORD[5], LIGHT, skyX - GS.C, floorY - GS.TIP - 1); }
    const hero = i === 0 ? SECTIONS[3].frames[3] : (i >= 5 ? SECTIONS[4].frames[i === 6 ? 1 : 0] : SECTIONS[3].frames[4]);
    stampM(hero.grid, COMBO_PAL, ox + 2 - 10, floorY - FLOOR);
    stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, ox + w - 34, floorY - 47);
    text(titles[i], ox, oy + hh + 3, (i === 2 || i === 5) ? GOLDC : SUBC);
  }
  text('SE1 - VALUES STEP DOWN ASSERTED + CORNER STEPS + THE BARS FROM THE REFERENCE FRAME. SE2 - THE WHITEOUT BEAT - 2 TICKS AT 82 PERCENT', 3, oy + hh + 11, DIMC);
  text('PLUS THE BURST - THEN IT CLEARS. SE3-SE4 - THE GOLDEN SWORD HANGS THEN FALLS. SE5 - THE IMPACT FLOODS THE FLOOR. SE6 - GOLD AFTERMATH.', 3, oy + hh + 17, DIMC);
  Y = oy + hh + 25;
})();

// ---------- THE MASTER CLOCK ----------
text('THE MASTER CLOCK - ' + TOTAL + ' TICKS AT 60FPS - CHARGE 90 TICKS = 1.5 S - ASSERTED - FLASH ' + FLASH_START + ' - CONTACT ' + CONTACT_TICK + ' - PEAK ' + PEAK_TICK, 3, Y, HEADC);
(() => {
  const oy = Y + 16, x0 = 96, px = (SW - x0 - 10) / TOTAL;
  const TX = t => x0 + Math.round(t * px);
  for (let t = 0; t <= TOTAL; t += 10) {
    paint(TX(t), oy - 5, 1, 3, '#3a3550', 1);
    text(t, TX(t) - 2, oy - 12, DIMC);
  }
  const cols = ['#8a6420', '#c9962e', '#e0a93c', '#f2e6bf', '#c9962e'];
  text('HERO', 3, oy, SUBC);
  SECTIONS.forEach((s, i) => {
    paint(TX(T_SEC[i]), oy, Math.max(2, Math.round(SEC_HOLDS[i] * px) - 1), 7, cols[i], 1);
    text(s.short, TX(T_SEC[i]) + 1, oy + 10, DIMC);
  });
  text('SCREEN', 3, oy + 22, SUBC);
  paint(TX(DARKEN_START), oy + 22, Math.round((FLASH_START - DARKEN_START) * px), 7, '#241f2e', 1);
  paint(TX(FLASH_START), oy + 22, Math.max(2, Math.round(FLASH_LEN * px)), 7, '#fffdf4', 1);
  paint(TX(FLASH_START + FLASH_LEN), oy + 22, Math.round((DARKEN_LIFT - FLASH_START - FLASH_LEN) * px), 7, '#15111b', 1);
  paint(TX(DARKEN_LIFT), oy + 22, Math.round((TOTAL - DARKEN_LIFT) * px), 7, '#241f2e', 1);
  text('DARKEN RAMP', TX(DARKEN_START) + 2, oy + 32, DIMC);
  text('FLASH', TX(FLASH_START) - 22, oy + 32, WHITEC);
  text('DARK HOLD', TX(FLASH_START + FLASH_LEN) + 4, oy + 32, DIMC);
  text('LIFT', TX(DARKEN_LIFT) + 2, oy + 32, DIMC);
  text('GREATSWORD', 3, oy + 44, SUBC);
  GS_HOLDS.forEach((h, i) => {
    paint(TX(GS_T[i]), oy + 44, Math.max(2, Math.round(h * px) - 1), 7, ['#8a6420', '#f2c94e', '#e0a93c', '#fffdf4', '#f2c94e', '#8a6420'][i], 1);
    text(['GS0', 'GS1', 'GS2', 'GS3', 'GS4', 'GS5'][i], TX(GS_T[i]) + 1, oy + 54 + (i % 2) * 6, i === 4 ? GOLDC : DIMC);
  });
  const fx0 = TX(FLASH_START), cx0 = TX(CONTACT_TICK);
  paint(fx0, oy - 3, 1, 52, '#fffdf4', 1);
  paint(cx0, oy - 3, 1, 52, '#e0a93c', 1);
  paint(TX(CHARGE_T0), oy + 68, TX(CHARGE_T0 + 90) - TX(CHARGE_T0), 1, '#c9962e', 1);
  paint(TX(CHARGE_T0), oy + 66, 1, 5, '#c9962e', 1); paint(TX(CHARGE_T0 + 90), oy + 66, 1, 5, '#c9962e', 1);
  text('90 TICKS = 1.5 S', TX(CHARGE_T0) + 8, oy + 71, GOLDC);
  text('TIMINGS ARE PRESENTATION INTENT - NOT AN FSM CONTRACT - INTEGRATION IS A LATER GAMEPLAY STAGE', 3, oy + 80, HEADC);
})();
Y += 16 + 92;

// ---------- CONTEXT TABLEAUS ----------
text('CONTEXT - THE CRASH AGAINST THE BOSS', 3, Y, HEADC);
text('CONTEXT - DRAGONFALL IN THE THRONE ROOM - LETTERBOXED - THE DESCENT', 300, Y, HEADC);
(() => {
  const oy = Y + 7;
  let floorY = nightRoom(3, oy, 290, 112, 100);
  stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, 3 + 148, floorY - 47);
  stampM(SECTIONS[1].frames[2].grid, COMBO_PAL, 3 + 108, floorY - FLOOR);
  text('S1C CRASH - THE EDGE MEETS THE FLOOR AT THE BOSS', 3 + 60, floorY + 4, GOLDC);

  floorY = nightRoom(300, oy, 387, 112, 100, { dim: true });
  cornerVign(300, oy, 387, 112);
  letterbox(300, oy, 387, 112, 9);
  const sx = 300 + 258;
  stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, sx - 62, floorY - 47);
  stampM(GREATSWORD[2], LIGHT, sx - GS.C, floorY - GS.TIP - 22);
  stampM(SECTIONS[4].frames[0].grid, COMBO_PAL, 300 + 74, floorY - FLOOR);
  text('F1 GUARD', 300 + 84, floorY + 4, DIMC);
  text('GS2 - 22 CELLS ABOVE THE FLOOR', sx - 150, oy + 12, GOLDC);
  text('THE STRIKE LANDS AT THE BOSS', sx - 76, floorY + 4, GOLDC);
})();
Y += 7 + 112 + 12;

// ---------- handoff notes ----------
text('HANDOFF NOTES', 3, Y, HEADC); Y += 8;
[
  'REDO - THIS SHEET REPLACES THE V1 8C-1 OUTPUT - V1 WAS DESIGNED BEFORE THE REFERENCES ARRIVED AND IS SUPERSEDED - NOTHING WAS REUSED',
  '    WITHOUT RE-DERIVATION - THE POSES AND CLOCKS COME FROM THE DECODED REFERENCE FRAMES.',
  'REFERENCE MAP - HERO POWER UP F1-F18 TO P0-P7 - BSWORDCOMBO F0-F8 TO SWING 1 - F9-F30 TO SWING 2 AND THE SHOULDER SETTLE -',
  '    BSWORDCOMBO2 TO THE CHARGE CARRY - BIGSWORD TO THE LETTERBOXED DARKEN-FLASH-DESCENT-IMPACT STRUCTURE.',
  'DRAGON WRATH - STILL THE NAMED REUSABLE POWER STATE - RADIANT SKIN + BOUNDED RADIANCE + CROWN HALO + THE GOLD WRATH BLADE -',
  '    THE FOUR MARKS SURVIVE THE REDO - ONLY THE WEAPON LAW CHANGED - THE BLADE IS NOW A FULL GOLD ENERGY BLADE - LARGER - ASSERTED.',
  'COMBO B - TWO SWINGS - THE CRASH AND THE SWEEP - THE SMEAR-FRAME IDIOM FROM THE REFERENCE - ONE BIG CRESCENT PER SWING PLUS LONG',
  '    HELD RECOVERIES - CROUCH DEPTH AND LUNGE STRETCH ARE ASSERTED AGAINST THE STANDING BODY.',
  'THE CHARGE - SHOULDERED CARRY AT MINUS 128 DEGREES - WIDE STANCE - RADIANCE STREAMERS BUILD C1 TO C3 - ASSERTED - 90 TICKS = 1.5 S.',
  'DRAGONFALL - DARKEN FROM TICK ' + DARKEN_START + ' - FLASH AT ' + FLASH_START + ' FOR ' + FLASH_LEN + ' WITH A 2-TICK WHITEOUT BEAT - CONTACT ' + CONTACT_TICK + ' - PEAK ' + PEAK_TICK + ' - DONE ' + GS_END + '.',
  '    THE LETTERBOX BARS COME FROM THE REFERENCE FRAME - RUNTIME WOULD IMPLEMENT DARKEN + BARS AS A RENDER-ONLY OVERLAY PASS.',
  'CANVAS - 60X40 - GROWN FROM 44X34 FOR THE BIG BLADE AND THE INSIGNIA-SCALE MOTION - THE FEET-BOTTOM ANCHOR AND ROW-COUNT',
  '    DETECTION SELF-SOLVE - THE 8B-3 BODY-BOX CLAMPS ALREADY MAKE FRAMING CANVAS-INDEPENDENT.',
  'MIRROR STAYS PURE - WHITE CORE IN GOLD - TRUE CIRCLES - MOTES RISE - NEVER BOLTS - NEVER ASH - NO RED - NO VOID ANYWHERE.',
  'INTEGRATION REALITY - A 2-HIT CHAIN NEEDS ITS OWN HIT TABLE - THE CHARGE NEEDS A 90-TICK CHANNEL - THE GREATSWORD AND BURST EXTEND',
  '    THE WORLD-SPACE SEAM THE LIGHT-WAVE PROJECTILES USE - THE DARKEN AND BARS ARE A RENDER-ONLY OVERLAY - ALL A LATER GAMEPLAY STAGE.',
  'STAGE 8C-1 V2 IS VISUAL DESIGN ONLY - SRC IS UNTOUCHED - NO HITBOX - NO TIMING - NO AI - NO BALANCE - NOTHING WIRED',
].forEach(ln => { text(ln, 3, Y); Y += 6; });

if (Y > SH - 4) throw new Error('layout overflow: ' + Y);
if (vErr) { console.error(vErr + ' validation failures'); process.exit(1); }

// ================= PNG writer =================
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
fs.writeFileSync(__dirname+'/dragon_wrath_combo_b_v2.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---------- literal dump ----------
let js = '// === HERO DRAGON WRATH + COMBO B v2 literals (see dragon_wrath_combo_b_v2_spec.md) ===\n';
js += '// STAGE 8C-1 REDO (v2, reference-faithful) — supersedes the v1 literals.\n';
js += '// Nothing wired into src/.\n';
js += '// Body clips are 60x40 (hero base at 15,16; feet row 39) — grown from the\n';
js += '// 44x34 combo canvas for the enlarged gold blade and the Insignia-scale\n';
js += '// motion. Keys = HERO keys + the six LIGHT keys.\n';
js += '// wrathBurst2 / lightGreatsword2 are PURE LIGHT world-space grids (the\n';
js += '// pillar contract): the burst fires at the sky point; the greatsword TIP\n';
js += '// row (80) plants on the floor line. wrathBladeStudy2 is documentation.\n';
const CLIP_NAMES = ['dragonWrathRise2', 'heroComboB2Swing1', 'heroComboB2Swing2', 'wrathCharge2', 'wrathRelease2'];
SECTIONS.forEach((sec, si) => {
  js += `  ${CLIP_NAMES[si]}: [\n`;
  sec.frames.forEach(fr => {
    js += `    // ${fr.tag} — ${fr.phase} — ${fr.where}\n`;
    js += '    [' + stringify(fr.grid).map(r => JSON.stringify(r)).join(', ') + '],\n';
  });
  js += '  ],\n';
});
[['wrathBurst2', BURST], ['lightGreatsword2', GREATSWORD], ['wrathBladeStudy2', BLADESTUDY]].forEach(([n, set]) => {
  js += `  ${n}: [\n`;
  set.forEach(g => { js += '    [' + stringify(g).map(r => JSON.stringify(r)).join(', ') + '],\n'; });
  js += '  ],\n';
});
fs.writeFileSync(__dirname + '/dragon_wrath_combo_b_v2_literal.txt', js);

// round-trip proof
{
  const src = fs.readFileSync(__dirname + '/dragon_wrath_combo_b_v2_literal.txt', 'utf8').replace(/\r/g, '');
  const reparse = n => {
    const m = src.match(new RegExp('  ' + n + ': \\[([\\s\\S]*?)\\n  \\],'));
    if (!m) throw new Error('clip not found on re-parse: ' + n);
    return [...m[1].matchAll(/\[((?:"[^"]*"(?:, )?)+)\]/g)].map(fm => fm[1].split(', ').map(s => JSON.parse(s)));
  };
  SECTIONS.forEach((sec, si) => {
    if (JSON.stringify(reparse(CLIP_NAMES[si])) !== JSON.stringify(sec.frames.map(fr => stringify(fr.grid))))
      throw new Error('round-trip fail: ' + CLIP_NAMES[si]);
  });
  [['wrathBurst2', BURST], ['lightGreatsword2', GREATSWORD], ['wrathBladeStudy2', BLADESTUDY]].forEach(([n, set]) => {
    if (JSON.stringify(reparse(n)) !== JSON.stringify(set.map(stringify))) throw new Error('round-trip fail: ' + n);
  });
}

console.log('wrote dragon_wrath_combo_b_v2.png', IW + 'x' + IH,
  '| clips', SECTIONS.map(s => s.frames.length).join('+'), '= 25 body frames + 14 detached grids',
  '\n  clock: total', TOTAL, '| charge', CHARGE_TICKS, '| darken', DARKEN_START, '| flash', FLASH_START, '+' + FLASH_LEN,
  '| contact', CONTACT_TICK, '| peak', PEAK_TICK,
  '\n  layout end Y', Y, '/', SH);
