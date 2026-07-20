// HERO DRAGON WRATH + COMBO B — "DRAGONS REND" (Stage 8C-1, concept — nothing wired into src/).
//
// DRAGON WRATH is a NAMED, REUSABLE Hero power state inside the approved Stage
// 8B-0 HERO LIGHT ECLIPSE family. It is not a one-off effect: the state has a
// fixed body language (radiant re-skin + bounded contour aura + a CROWN HALO arc
// above the helm) and a fixed weapon language (the WRATH BLADE — the hero's own
// sword awakened: white leading edge, standing-off gold sheath, rune pips, tip
// glint). Future stages reuse the state by replaying exactly these marks.
//
// Strict pixel art: hard cells, no blur, no gradients — ZERO BLUE in the effects
// (the character keeps his own cold-blue visor/sigil: that is the character).
// White core + warm gold only. The boss Red Eclipse language never appears.
//
// WHY COMBO B DOES NOT COLLIDE WITH THE TWO APPROVED COMBOS:
//   DAYBREAK CHAIN (8B-1) is a combo of ARCS — radial crescents pivoting tight
//   at the shoulder (r~15), all of it on the body.
//   MERIDIAN LOOP (8C-0) is a combo of LINES — bow, dive, glaive, chase, pillar,
//   drawn ACROSS the arena, out and back.
//   DRAGONS REND is a combo of TURNS — three connected full-body rotations
//   around the BODY CORE (r~18): a rising gutter-to-sky cut (TALON), a level
//   spin (WING — the only mid-turn mirrored body in the hero set), and an
//   over-the-top vertical circle crash (FANG). One momentum: every strike's
//   trail ENTERS where the last one EXITED (asserted, cell-level), so the three
//   hits read as one continuous rotation — and it is the only combo performed
//   inside a POWER STATE: every frame is empowered.
//
// THE MOVE (one sequence, 190 ticks at 60fps):
//   DRAGON WRATH RISE (22t)  gather -> ignite -> BURST peak -> crown -> wrath idle
//   COMBO B DRAGONS REND(34t) TALON -> WING -> FANG (escalating, momentum-linked)
//   CROWN CHARGE (90t = 1.5s) blade raised, the WRATH SIGIL (the 8B-0 emblem)
//                             opens overhead, gather contracts to the tip
//   DRAGONFALL (44t)          the arena darkens (stepped vignette + dimmed values,
//                             never flat bars) -> WRATH BURST flash (6t, never
//                             lingers) -> the GIANT ECLIPSE GREATSWORD manifests,
//                             descends, strikes, and burns out from the buried
//                             end UP — motes rise, the crown goes last.
//
// Emits: dragon_wrath_combo_b_v1.png + dragon_wrath_combo_b_literal.txt.
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
// night-room chrome (tableaus) + the DARKEN law: the screen event dims the
// ENVIRONMENT VALUES (each dim step strictly darker per channel — asserted) and
// steps the corners in pixel diagonals. It never drops flat black bars, and the
// fighters are stamped after the darkening at full value so they always read.
const NW0 = '#191622', NW1 = '#1d1a28', NF0 = '#221c2b', NF1 = '#3a3346';
const WINL = '#6c82a8';
const DIMENV = {
  [NW0]: '#100d17', [NW1]: '#120f19', [NF0]: '#15111b', [NF1]: '#241f2e', [WINL]: '#3d4a63',
};
const VIG1 = '#0d0b14', VIG2 = '#080710';

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

// ---------- authoring canvas (IDENTICAL to the approved 8B-1 / 8C-0 combos) ----------
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
// NEW (8C-1): the mid-spin body. WING is a level spin, and its center frame shows
// the hero TURNED AWAY — the approved base mirrored (a lossless flip: every cell
// is the approved base's own cell), cape swung around to the leading side, the
// crest reversed. No other hero clip uses a mirrored body: it is the spin's tell.
function mirrorBase() {
  const g = mkGrid();
  heroBase.forEach((row, y) => row.forEach((k, x) => { if (k !== '.') g[y + OY][(29 - x) + OX] = k; }));
  for (let y = 22; y <= 28; y++) for (let x = 7; x <= 19; x++) g[y][x] = '.';   // mirrored blade erased
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
// radiantSkin (8B-0 BODYFLARE law): one ramp step BRIGHTER, the hero's own cold
// accents pulse, a broken gold rim on the contour via the hero's OWN gold key.
// Palette-only — the silhouette can never desync.
const BRIGHT1 = { '0': '1', '1': '2', '2': '3', '3': '4', '4': '5', '5': '5',
                  'n': 'm', 'm': 'm', 'l': 'L', 'L': 'L', 'g': 'g' };
function radiantSkin(gIn, seed, rim, skip) {
  // the rim gilds the BODY contour only — never the weapon (skip = sword cells),
  // so the wrath blade's white edge can never be eaten by the skin.
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
// sparse contour aura (8C-0 R2 law, reused verbatim): a handful of LIGHT cells
// hugging the OUTSIDE of the silhouette, upward-biased. BOUNDED 5..34, asserted.
function contourAura(fx, body, seed, density) {
  let n = 0;
  for (let y = 0; y < GH; y++) {
    let lo = -1, hi = -1;
    for (let x = 0; x < GW; x++) if (body[y][x] !== '.') { if (lo < 0) lo = x; hi = x; }
    if (lo < 0) continue;
    const bias = y < GH * 0.55 ? 1.15 : 0.7;
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
// the character's own sword (pre-wrath): steel core, cold-blue edge — unchanged.
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
// THE WRATH BLADE — the hero's own sword AWAKENED (the transformed weapon).
// Identity law: the PHYSICAL sword is untouched — same arm, same hand, same
// guard span, same steel core '4', same trailing steel '3', same reach family.
// What changes is only what the light does to it:
//   - the cold-blue leading edge 'l' turns WHITE 'W' (the glow awakened)
//   - the guard center becomes a white focus, gold winks one step out
//   - G rune pips surface ON the steel core every 3rd cell
//   - a BROKEN gold sheath (y/o) stands ONE CELL OFF the leading edge — energy
//     surrounding a blade, never a thick glowing stick (the gap is the law)
//   - a detached W tip glint + I mote lead the point
// States: ignite (0..1 — light runs hilt->tip), full, FLARE (sheath closes
// solid + tip star), SETTLE (outer half returns to blue, the sheath breaks
// into motes that RISE off the blade — the family exit law on the weapon).
// =====================================================================
function drawWrathSword(g, fxF, sho, hx, hy, angleDeg, reach, opts = {}) {
  // calm = the held/charging blade: white edge + runes only, no sheath winks —
  // the fringe is combat language; a raised blade must read clean as a sword.
  const { twoHand = false, ignite = 1, flare = false, settle = false, calm = false } = opts;
  if (twoHand) lineC(g, sho[0] - 2, sho[1] + 1, hx - 1, hy + 1, '1', false);
  lineC(g, sho[0], sho[1], hx, hy, '2', true);
  put(g, hx, hy, '3'); put(g, hx - 1, hy, '3'); put(g, hx, hy + 1, '1');
  const a = RAD(angleDeg), dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
  const gx = hx + dx, gy = hy + dy;
  for (let s = -1; s <= 1; s++) put(g, R(gx + px * s), R(gy + py * s), s === 0 ? (ignite > 0 ? 'W' : 'l') : '1');
  put(g, R(gx + px * 2), R(gy + py * 2), 'g'); put(g, R(gx - px * 2), R(gy - py * 2), 'g');
  const litTo = Math.max(2, R(2 + (reach - 2) * ignite));
  for (let i = 2; i <= reach; i++) {
    const bx = R(hx + dx * i), by = R(hy + dy * i);
    const lit = settle ? i <= Math.floor(reach * 0.45) : i <= litTo;
    put(g, bx, by, (lit && i % 3 === 0 && i < reach - 1) ? 'G' : '4');
    put(g, R(bx + px), R(by + py), lit ? 'W' : 'l');
    put(g, R(bx - px), R(by - py), '3');
    if (lit && i >= 3 && (flare || (i % 2 === 0 && !calm)))
      putB(g, R(bx + px * 2), R(by + py * 2), flare ? 'W' : (i % 4 === 0 ? 'o' : 'y'));
    if (settle && !lit && i % 2 === 1)
      putB(fxF, R(bx + px * 2), R(by + py * 2) - 1, i % 4 === 1 ? 'G' : 'u');   // sheath breaks, motes rise
  }
  const fullyLit = !settle && ignite >= 1;
  const tx = R(hx + dx * (reach + 1)), ty = R(hy + dy * (reach + 1));
  put(g, tx, ty, fullyLit ? 'W' : 'L');
  if (fullyLit) putB(g, R(hx + dx * (reach + 2.4)), R(hy + dy * (reach + 2.4)), 'I');
  if (flare) { putB(fxF, tx + 1, ty - 1, 'W'); putB(fxF, tx - 1, ty + 1, 'I'); }
  return [R(hx + dx * reach), R(hy + dy * reach)];
}
// the CROWN HALO — the persistent Dragon Wrath tell: a broken sacred arc above
// the helm. Small on purpose: the state must read at a glance without covering
// the character. It appears at the activation settle and stays for the state.
function crownHalo(fx, cx, topY, phase) {
  ringC(fx, cx, topY + 2, 5, 'y', { dash: 9, phase, arcFrom: RAD(-162), arcTo: RAD(-18) });
  putB(fx, cx, topY - 4, 'W');
  putB(fx, cx - 6, topY, 'o'); putB(fx, cx + 6, topY, 'o');
}

// ---------- effect toolkit (fx layers: LIGHT + neutral steel only) ----------
const DIMK = { W: 'I', I: 'y', y: 'o', o: 'G', G: 'u', '5': '3', '4': '2', '3': '2', '2': '1' };
// arc smear around a pivot — the approved SLASH band anatomy per cross-section
// (leading W -> body I -> inner y -> belly rim o -> sparse G). Combo B runs it
// at the BODY CORE with long sweeps: the trail of a full-body turn.
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
// the WING band — a level spin seen side-on IS an ellipse. Same band anatomy,
// flattened: leading W edge on the last `lead` degrees, I body, y inner,
// sparse o belly, rare G outer wink. Nothing else in the hero set is level.
function ellipseBand(fx, cx, cy, rx, ry, p0deg, p1deg, opts = {}) {
  const { dim = false, broken = false, lead = 30 } = opts;
  const K = k => (dim ? (DIMK[k] || k) : k);
  const steps = Math.ceil(Math.abs(p1deg - p0deg) / 360 * Math.PI * 2 * rx * 1.6);
  for (let i = 0; i <= steps; i++) {
    const t = i / Math.max(1, steps), aDeg = p0deg + (p1deg - p0deg) * t, a = RAD(aDeg);
    if (broken && i % 8 < 3) continue;
    const hot = (p1deg - aDeg) <= lead;
    const x = R(cx + Math.cos(a) * rx), y = R(cy + Math.sin(a) * ry);
    putB(fx, x, y, K(hot ? 'W' : 'I'));
    putB(fx, R(cx + Math.cos(a) * (rx - 2)), R(cy + Math.sin(a) * (ry - 1.2)), K(hot ? 'I' : 'y'));
    if (!hot && i % 3 === 0) putB(fx, R(cx + Math.cos(a) * (rx - 4)), R(cy + Math.sin(a) * (ry - 2.2)), K('o'));
    if (!hot && i % 7 === 0) putB(fx, R(cx + Math.cos(a) * (rx + 1)), R(cy + Math.sin(a) * (ry + 0.7)), K('G'));
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
function haloSnap(fx, cx, cy, r) {
  ringC(fx, cx, cy, r, 'y');
  ringC(fx, cx, cy, r - 2.5, 'I', { dash: 12, phase: 0.5 });
  [[0, -r], [0, r], [-r, 0], [r, 0]].forEach(([dx, dy]) => putB(fx, cx + dx, cy + dy, 'W'));
  putB(fx, cx, cy - r - 2, 'W'); putB(fx, cx, cy + r + 2, 'W');
}
// the GROUND HALO under the hero — cast / charge / blessing moments (8B-0).
function groundHalo(fx, cx, level) {
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
  let body = o.mirror ? mirrorBase() : baseBody();
  if (!o.mirror) eraseBlade(body);
  if (o.lunge) lunge(body, o.lunge[0], o.lunge[1]);
  if (o.lean) body = moveUpper(body, o.lean[0], o.lean[1]);
  if (o.cape) capeFlow(body, o.cape[0], o.cape[1]);
  const sho = o.sho || [(o.mirror ? 22 : SHO[0]) + (o.lean ? o.lean[0] : 0), SHO[1] + (o.lean ? o.lean[1] : 0)];
  const bare = body.map(r => r.slice());
  const fxB = mkGrid(), fxF = mkGrid(), meta = { motes: [] };
  meta.tip = o.plainSword
    ? drawSword(body, sho, o.hand[0], o.hand[1], o.angle, o.reach, { twoHand: !!o.twoHand })
    : drawWrathSword(body, fxF, sho, o.hand[0], o.hand[1], o.angle, o.reach,
        { twoHand: !!o.twoHand, ignite: o.ignite === undefined ? 1 : o.ignite, flare: !!o.flareBlade, settle: !!o.settle, calm: !!o.calmBlade });
  const swordCells = new Set();
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++)
    if (body[y][x] !== bare[y][x]) swordCells.add(x + ',' + y);
  const bodyPre = body.map(r => r.slice());
  if (o.radiant) body = radiantSkin(body, o.seed || 11, o.rim === undefined ? 0.5 : o.rim, swordCells);
  if (o.crown !== undefined) crownHalo(fxB, sho[0], 10 + (o.lean ? o.lean[1] : 0), o.crown);
  if (o.fx) o.fx(fxB, fxF, meta);
  if (o.aura) meta.aura = contourAura(fxB, body, (o.seed || 11) + 2, o.aura);
  return { body, bodyPre, fxB, fxF, meta, tag: o.tag, phase: o.phase, hold: o.hold, where: o.where,
           radiant: !!o.radiant, flare: !!o.flare,
           wrathOn: !o.plainSword && !o.settle && (o.ignite === undefined || o.ignite >= 1),
           settle: !!o.settle };
}
const mote = (fx, meta, x, y, k) => { put(fx, x, y, k); meta.motes.push([x, y]); };

// =====================================================================
// THE MOMENTUM CONSTANTS — Combo B's own law, encoded as data.
// Three strikes, one rotation: every trail segment starts where the last one
// ended. The junction endpoints are computed from these constants and asserted
// to sit within 6 cells of each other; the sheet's path insets draw from the
// same constants, so the page cannot drift from the law.
// =====================================================================
const CC = [21, 20];                       // the body core — every turn pivots here
const TAL = { r: 18, act: [150, -40], fol: [-40, -95], link: [-95, -160], linkR: 17 };
const WING = { c: [21, 18], rx: 18, ry: 5, pass: [180, 330], act: [200, 395], fol: [240, 395] };
const XB2 = { c: [21, 19], r: 15, a: [8, 150] };
const FANG = { r: 19, act: [155, 415] };
const ptCirc = (c, r, deg) => [c[0] + Math.cos(RAD(deg)) * r, c[1] + Math.sin(RAD(deg)) * r];
const ptEll = (e, deg) => [e.c[0] + Math.cos(RAD(deg)) * e.rx, e.c[1] + Math.sin(RAD(deg)) * e.ry];

// =====================================================================
// NEW REUSABLE LIGHT ECLIPSE SUB-EFFECTS (8C-1 additions to the family)
// Every one is composed from 8B-0 parts — no new ramp, no new shape language.
// =====================================================================

// --- WRATH SIGIL (41x41) — the charge geometry. -----------------------
// The 8B-0 EMBLEM opening overhead across the 1.5s charge: seed dashes ->
// first true circle -> second ring + cardinal stubs -> the FULL EMBLEM blazing
// (white core, ivory ring, gold corona, N ray longest — ascension). It is not a
// new shape: it IS the family emblem, played as a growth.
const SG = { W: 41, H: 41, C: 20 };
function sigilFrames() {
  const out = [];
  // SG0 SEED — GATHER: a sparse bronze dash ring + motes converging on the diagonals.
  let g = mkGrid(SG.W, SG.H);
  ringC(g, SG.C, SG.C, 14, 'G', { dash: 22, phase: 0.5, behind: false });
  [[10, 10], [-10, 10], [10, -10], [-10, -10]].forEach(([dx, dy], i) => {
    putB(g, SG.C + dx, SG.C + dy, 'u'); putB(g, SG.C + R(dx * 0.7), SG.C + R(dy * 0.7), i % 2 ? 'G' : 'o');
  });
  disc(g, SG.C, SG.C, 0.8, 'I');
  out.push(mirrorH(g));
  // SG1 RING — IGNITE: the first true circle snaps, white cardinal nodes.
  g = mkGrid(SG.W, SG.H);
  ringC(g, SG.C, SG.C, 10, 'y', { behind: false });
  ringC(g, SG.C, SG.C, 7, 'I', { dash: 12, phase: 0.5 });
  [[0, -10], [0, 10], [-10, 0], [10, 0]].forEach(([dx, dy]) => put(g, SG.C + dx, SG.C + dy, 'W'));
  disc(g, SG.C, SG.C, 1.4, 'W');
  out.push(mirrorH(g));
  // SG2 GEOMETRY — the second ring + cardinal ray stubs + diagonal pips + micro core.
  g = mkGrid(SG.W, SG.H);
  ringC(g, SG.C, SG.C, 10, 'y', { behind: false });
  ringC(g, SG.C, SG.C, 7, 'I', { dash: 12, phase: 1.5 });
  ringC(g, SG.C, SG.C, 14, 'o', { dash: 18, phase: 0.5 });
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(d => axisRay(g, SG.C, SG.C, d, 11, 15, ['I', 'y', 'o'], { wide: false }));
  [[0, -10], [0, 10], [-10, 0], [10, 0]].forEach(([dx, dy]) => put(g, SG.C + dx, SG.C + dy, 'W'));
  [[10, 10], [-10, 10], [10, -10], [-10, -10]].forEach(([dx, dy]) => putB(g, SG.C + dx, SG.C + dy, 'G'));
  disc(g, SG.C, SG.C, 1.8, 'W'); ringC(g, SG.C, SG.C, 3.4, 'I', { dash: 8, phase: 0.5 });
  out.push(mirrorH(g));
  // SG3 BLAZING — RELEASE: the full emblem. North ray longest — ascension.
  g = mkGrid(SG.W, SG.H);
  disc(g, SG.C, SG.C, 2.2, 'W');
  ringC(g, SG.C, SG.C, 4.4, 'I', { dash: 10, phase: 0.5 });
  ringC(g, SG.C, SG.C, 6, 'y', { behind: false });
  ringC(g, SG.C, SG.C, 7.5, 'o', { dash: 14, phase: 0.5 });
  axisRay(g, SG.C, SG.C, [0, -1], 8, 18, ['W', 'I', 'y', 'o', 'G'], { tip: true });
  [[1, 0], [-1, 0]].forEach(d => axisRay(g, SG.C, SG.C, d, 8, 16, ['W', 'I', 'y', 'o'], { tip: true }));
  axisRay(g, SG.C, SG.C, [0, 1], 8, 13, ['I', 'y', 'o'], { wide: false });
  [[1, -1], [-1, -1], [1, 1], [-1, 1]].forEach(d => axisRay(g, SG.C, SG.C, d, 7, 11, ['y', 'o', 'G'], { wide: false }));
  ringC(g, SG.C, SG.C, 19, 'G', { dash: 20, phase: 0.5 });
  spark(g, SG.C - 13, SG.C - 13, 1); spark(g, SG.C + 13, SG.C - 13, 1);
  spark(g, SG.C - 15, SG.C + 8, 0, 'I', 'o'); spark(g, SG.C + 15, SG.C + 8, 0, 'I', 'o');
  out.push(mirrorH(g));
  return out;
}

// --- WRATH BURST (41x41) — the holy detonation flash. ------------------
// The screen flash that reveals the greatsword: a scaled IMPACT star opening on
// the emblem's ray law. It lives 6 TICKS TOTAL (asserted) — a flash, never a
// whiteout: WB2 is already hollow and clearing.
const WB = { W: 41, H: 41, C: 20 };
function burstFrames() {
  const out = [];
  // WB0 CORE — the white kernel pops (2t).
  let g = mkGrid(WB.W, WB.H);
  disc(g, WB.C, WB.C, 2.4, 'W');
  ringC(g, WB.C, WB.C, 4.4, 'I', { behind: false });
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(d => axisRay(g, WB.C, WB.C, d, 5, 8, ['W', 'I'], { wide: false }));
  out.push(mirrorH(g));
  // WB1 BLAZE — full rays + broken rings + corner sparks (2t). The reveal beat.
  g = mkGrid(WB.W, WB.H);
  disc(g, WB.C, WB.C, 3.0, 'W');
  ringC(g, WB.C, WB.C, 5.2, 'I', { behind: false });
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(d => axisRay(g, WB.C, WB.C, d, 6, 17, ['W', 'W', 'I', 'y', 'o'], { tip: true }));
  [[1, -1], [-1, -1], [1, 1], [-1, 1]].forEach(d => axisRay(g, WB.C, WB.C, d, 5, 12, ['I', 'y', 'o'], { wide: false }));
  ringC(g, WB.C, WB.C, 13, 'y', { dash: 16, phase: 0.5 });
  ringC(g, WB.C, WB.C, 18, 'G', { dash: 24, phase: 1.5 });
  spark(g, WB.C - 9, WB.C - 14, 1); spark(g, WB.C + 9, WB.C - 14, 1);
  spark(g, WB.C - 14, WB.C + 9, 0, 'I', 'o'); spark(g, WB.C + 14, WB.C + 9, 0, 'I', 'o');
  out.push(mirrorH(g));
  // WB2 OPEN — the flash CLEARS (2t): hollow ring, detached tips, sparks RISE.
  g = mkGrid(WB.W, WB.H);
  ringC(g, WB.C, WB.C, 15, 'o', { dash: 14, phase: 0.5, behind: false });
  [[0, -1], [-1, 0], [1, 0]].forEach(d => { putB(g, WB.C + d[0] * 18, WB.C + d[1] * 18, 'y'); putB(g, WB.C + d[0] * 20, WB.C + d[1] * 20, 'G'); });
  putB(g, WB.C, WB.C + 17, 'G');
  [[-5, -16], [5, -17], [-2, -19], [3, -20], [-8, -13], [8, -14]].forEach(([dx, dy], i) => putB(g, WB.C + dx, WB.C + dy, i % 2 ? 'I' : 'u'));
  out.push(mirrorH(g));
  return out;
}

// --- GIANT ECLIPSE GREATSWORD (41x84) — DRAGONFALL. --------------------
// The finisher IS the wrath blade at world scale — a SWORD, never a beam:
// pommel, one-cell grip, a WIDE crossguard (asserted wider than 1.7x the blade
// root), a TRUE-CIRCLE halo crowning the guard (the charge sigil arrived), and
// a long tapered blade on the emblem ray law — W core, I flanks, y body, o
// edge, G rune pips down the core. Point DOWN: it descends and strikes.
// Anchor: TIP row plants on the floor line; rows below it are the ground zone.
// On screen at the hero 2px grid: 82x168 px — 3.5x the 48px hero body.
const GS = { W: 41, H: 84, C: 20, POM: 2, GUARD: 12, TIP: 76 };
function drawGreatBlade(g, opts = {}) {
  const { dim = false, contour = false, brokenFrom = -1 } = opts;
  const K = k => (dim ? (DIMK[k] || k) : k);
  const C = GS.C;
  // pommel + grip
  if (!contour) {
    put(g, C, GS.POM - 1, K('W'));
    disc(g, C, GS.POM + 1, 1.8, K('o')); put(g, C, GS.POM + 1, K('G')); put(g, C, GS.POM, K('W'));
    for (let y = GS.POM + 3; y < GS.GUARD; y++) { put(g, C, y, K(y % 2 ? 'G' : 'o')); put(g, C - 1, y, K('u')); put(g, C + 1, y, K('u')); }
  } else {
    put(g, C, GS.POM + 1, K('u'));
    for (let y = GS.POM + 3; y < GS.GUARD; y += 2) put(g, C, y, K('u'));
  }
  // crossguard — two solid rows, 17 wide vs the 9-wide blade root, upturned
  // quillon tips (the sword-not-beam law: the guard must dominate the root)
  for (let d = -8; d <= 8; d++) {
    if (contour) { if (Math.abs(d) % 2 === 0) put(g, C + d, GS.GUARD, K('G')); }
    else {
      put(g, C + d, GS.GUARD, K(Math.abs(d) === 8 ? 'G' : (d === 0 ? 'W' : 'y')));
      if (Math.abs(d) <= 6) put(g, C + d, GS.GUARD + 1, K(Math.abs(d) <= 1 ? 'y' : 'o'));
      if (Math.abs(d) === 8) put(g, C + d, GS.GUARD - 1, K('o'));
      if (Math.abs(d) === 7) put(g, C + d, GS.GUARD - 1, K('u'));
    }
  }
  // the halo crown behind the guard — the charge sigil arrived on the weapon
  ringC(g, C, GS.GUARD, 9.5, K(contour ? 'u' : 'y'), { dash: contour ? 18 : 12, phase: 0.5 });
  if (!contour) [[0, -9.5], [-9.5, 0], [9.5, 0]].forEach(([dx, dy]) => putB(g, R(C + dx), R(GS.GUARD + dy), 'W'));
  // the blade — a real longsword profile: the body runs near-parallel and only
  // the last quarter draws to the point (a fast linear taper reads as an icicle,
  // never a sword). W core with G rune pips, I flanks, y body, o edge.
  const yTop = GS.GUARD + 3;
  for (let y = yTop; y <= GS.TIP; y++) {
    const t = (y - yTop) / (GS.TIP - yTop);
    const half = t < 0.55 ? 4 : t < 0.75 ? 3 : t < 0.88 ? 2 : t < 0.97 ? 1 : 0;
    if (brokenFrom >= 0 && y >= brokenFrom && (y % 5) < Math.min(4, 2 + Math.floor((y - brokenFrom) / 14)))
      continue;                                             // burnt-out rows — densest near the buried end
    for (let d = -half; d <= half; d++) {
      const ad = Math.abs(d);
      let k = d === 0 ? ((y % 5 === 2 && y < GS.TIP - 6 && half >= 2) ? 'G' : 'W')
        : ad === 1 && half >= 3 ? 'I' : ad < half ? 'y' : 'o';
      if (contour) { if (ad === half) put(g, C + d, y, K(y % 2 ? 'G' : 'o')); else if (d === 0 && y % 3 === 0) put(g, C + d, y, K('I')); }
      else put(g, C + d, y, K(k));
    }
  }
  if (!contour) { putB(g, C, GS.TIP + 2, K('W')); putB(g, C, GS.TIP + 4, K('I')); }
}
function greatswordFrames() {
  const out = [];
  const C = GS.C;
  // GS0 MANIFEST — the blade sketched in broken gold contour; motes converge.
  let g = mkGrid(GS.W, GS.H);
  drawGreatBlade(g, { contour: true });
  [[-13, 20], [13, 24], [-10, 44], [10, 40], [-6, 62], [6, 58]].forEach(([dx, dy], i) => putB(g, C + dx, dy, i % 2 ? 'u' : 'G'));
  out.push(mirrorH(g));
  // GS1 REVEAL — the full blade lit, hanging. The sword is unmistakably a sword.
  g = mkGrid(GS.W, GS.H);
  drawGreatBlade(g);
  out.push(mirrorH(g));
  // GS2 DESCENT — same sword (identity by construction) + fall streaks above
  // the pommel + pressure ticks under the point. It is FALLING.
  g = mkGrid(GS.W, GS.H);
  drawGreatBlade(g);
  [[-4, 5], [4, 5]].forEach(([dx, len]) => { for (let i = 0; i < len; i++) putB(g, C + dx, GS.POM + 1 + i * 2, 'I'); });
  for (let i = 0; i < 3; i++) { putB(g, C - 7, 20 + i * 16, 'y'); putB(g, C + 7, 26 + i * 16, 'y'); }
  [[-3, 3], [3, 3], [-6, 5], [6, 5]].forEach(([dx, dy]) => putB(g, C + dx, GS.TIP + dy, dy > 4 ? 'G' : 'o'));
  out.push(mirrorH(g));
  // GS3 CONTACT — the point meets the floor: impact star + first ground ring.
  g = mkGrid(GS.W, GS.H);
  drawGreatBlade(g);
  impactStar(g, C, GS.TIP + 1, true);
  ellipseRing(g, C, GS.TIP + 3, 11, 2.2, 'y', { dash: 10, phase: 0.5 });
  for (let i = 0; i < 4; i++) { putB(g, C - 13 - i * 2, GS.TIP + 2, i % 2 ? 'G' : 'o'); putB(g, C + 13 + i * 2, GS.TIP + 2, i % 2 ? 'G' : 'o'); }
  out.push(mirrorH(g));
  // GS4 PEAK — the strike: the base vanishes inside the detonation, DOUBLE
  // ground halo, upward burst rays (light rises off the impact), floor streaks
  // running out both ways (the corridor language), risen fragments high.
  g = mkGrid(GS.W, GS.H);
  drawGreatBlade(g);
  for (let y = GS.TIP - 5; y <= GS.TIP + 4; y++) for (let x = C - 3; x <= C + 3; x++) if (Math.abs(x - C) + Math.abs(y - (GS.TIP - 1)) < 6) put(g, x, y, 'W');
  ellipseRing(g, C, GS.TIP + 2, 16, 3.2, 'y');
  ellipseRing(g, C, GS.TIP + 2, 10, 2.2, 'I', { dash: 10, phase: 0.5 });
  putB(g, C - 16, GS.TIP + 2, 'W'); putB(g, C + 16, GS.TIP + 2, 'W');
  [[0, -1]].forEach(d => axisRay(g, C, GS.TIP - 6, d, 8, 14, ['W', 'I', 'y'], { wide: false }));
  [[-1, -1], [1, -1]].forEach(d => axisRay(g, C, GS.TIP - 4, d, 5, 10, ['I', 'y', 'o'], { wide: false }));
  [[-1, 0], [1, 0]].forEach(d => axisRay(g, C, GS.TIP + 1, d, 7, 15, ['I', 'y', 'o'], { wide: false }));
  for (let i = 0; i < 5; i++) { putB(g, C - 10 - i * 2, GS.TIP + 4, i % 2 ? 'u' : 'G'); putB(g, C + 10 + i * 2, GS.TIP + 4, i % 2 ? 'u' : 'G'); }
  [[-8, 34], [8, 30], [-5, 22], [5, 18], [-11, 46], [11, 42]].forEach(([dx, dy], i) => putB(g, C + dx, dy, i % 2 ? 'I' : 'y'));
  out.push(mirrorH(g));
  // GS5 DISSOLVE — burns out FROM THE BURIED END UP: the low blade is already
  // dashes, motes lift along the whole length, the crown goes last. Light rises.
  g = mkGrid(GS.W, GS.H);
  drawGreatBlade(g, { dim: true, brokenFrom: GS.GUARD + 14 });
  for (let i = 0; i < 6; i++) { putB(g, C - 6 - (i % 3), 18 + i * 9, i % 2 ? 'u' : 'G'); putB(g, C + 6 + (i % 3), 14 + i * 9, i % 2 ? 'G' : 'I'); }
  [[-3, 6], [3, 4], [-1, 2], [2, 8]].forEach(([dx, dy], i) => putB(g, C + dx, dy, i % 2 ? 'I' : 'u'));
  ellipseRing(g, C, GS.TIP + 2, 13, 2.6, 'u', { dash: 12, phase: 0.5 });
  for (let i = 0; i < 4; i++) { putB(g, C - 8 - i * 3, GS.TIP + 3, 'u'); putB(g, C + 8 + i * 3, GS.TIP + 3, 'u'); }
  out.push(mirrorH(g));
  return out;
}

// --- WRATH BLADE STUDY (21x13 each) — the weapon states, isolated. ------
// The blade drawn flat (hilt left, point right) so the transformation reads at
// a glance: BASE (the character's cold-blue sword, untouched) -> AWAKEN (light
// runs hilt to tip) -> EMPOWERED -> FLARE -> SETTLE (blue returns, sheath
// breaks into rising motes). The physical sword never changes shape.
const SS = { W: 21, H: 13, CY: 6 };
function bladeStudyFrames() {
  const mk = () => mkGrid(SS.W, SS.H);
  const hilt = (g, awake) => {
    put(g, 0, SS.CY, '3'); put(g, 1, SS.CY, '3');                       // pommel+grip
    put(g, 2, SS.CY, '2'); put(g, 3, SS.CY, '2');
    for (let s = -2; s <= 2; s++) put(g, 5, SS.CY + s, s === 0 ? (awake ? 'W' : 'l') : (Math.abs(s) === 2 ? 'g' : '1'));
  };
  const blade = (g, litTo, opts = {}) => {
    const { flare = false, settle = false } = opts;
    for (let i = 0; i <= 12; i++) {
      const x = 6 + i;
      const lit = settle ? i <= 5 : i <= litTo;
      put(g, x, SS.CY, (lit && i % 3 === 1 && i < 11) ? 'G' : '4');     // core + runes
      put(g, x, SS.CY - 1, lit ? 'W' : 'l');                            // leading edge
      put(g, x, SS.CY + 1, '3');                                        // trailing steel
      if (lit && i >= 1 && (flare || i % 2 === 0)) putB(g, x, SS.CY - 3, flare ? 'W' : (i % 4 === 0 ? 'o' : 'y'));
      if (settle && !lit && i % 2 === 1) putB(g, x, SS.CY - 4, i % 4 === 1 ? 'G' : 'u');
    }
    put(g, 19, SS.CY, litTo >= 12 && !settle ? 'W' : 'L');
    if (litTo >= 12 && !settle) putB(g, 20, SS.CY, 'I');
    if (flare) { putB(g, 20, SS.CY - 2, 'W'); spark(g, 19, SS.CY - 3, 1); }
  };
  const s0 = mk(); hilt(s0, false); blade(s0, -1);
  const s1 = mk(); hilt(s1, true); blade(s1, 5);
  const s2 = mk(); hilt(s2, true); blade(s2, 12);
  const s3 = mk(); hilt(s3, true); blade(s3, 12, { flare: true });
  const s4 = mk(); hilt(s4, true); blade(s4, 12, { settle: true });
  return [s0, s1, s2, s3, s4];
}

const SIGIL = sigilFrames();
const BURST = burstFrames();
const GREATSWORD = greatswordFrames();
const BLADESTUDY = bladeStudyFrames();

// =====================================================================
// THE CLIPS
// =====================================================================
const SECTIONS = [];

// ---- A. DRAGON WRATH RISE — the activation (22 ticks) ----
// gather -> ignite -> BURST peak -> crown settle -> wrath idle (loops).
// Start, peak, settle: important, never long. The state's three marks are all
// minted here: radiant skin + crown halo + the wrath blade.
SECTIONS.push({
  name: 'DRAGON WRATH RISE', short: 'RISE', frames: [
    makeFrame({ tag: 'DW0 GATHER', phase: 'GATHER 5', hold: 5, where: 'STANDING GROUND',
      plainSword: true, lean: [0, 1], hand: [24, 23], angle: 78, reach: 9,
      fx: (b, f, m) => {
        groundHalo(b, 21, 0);
        gatherMotes(f, 20, 19, [[-5, -3], [6, -2], [-7, 3], [5, 4]]);
        mote(f, m, 14, 12, 'u'); mote(f, m, 28, 11, 'u');
      } }),
    makeFrame({ tag: 'DW1 IGNITE', phase: 'IGNITE 3', hold: 3, where: 'STANDING GROUND',
      ignite: 0.5, flare: true, lunge: [1, 0], hand: [24, 22], angle: 60, reach: 11,
      fx: (b, f, m) => {
        groundHalo(b, 21, 1);
        ringC(b, 21, 19, 6, 'I', { dash: 10, phase: 0.5 });
        disc(f, 20, 19, 1.2, 'W');
        mote(f, m, 15, 10, 'I'); mote(f, m, 27, 9, 'y');
      } }),
    makeFrame({ tag: 'DW2 BURST', phase: 'PEAK 6 - HOLD', hold: 6, where: 'STANDING GROUND',
      radiant: true, seed: 19, rim: 1, flare: true, aura: 0.42, cape: [1, -1],
      hand: [25, 15], angle: -52, reach: 12,
      fx: (b, f, m) => {
        haloSnap(b, 21, 17, 12);
        axisRay(b, 21, 17, [0, -1], 13, 16, ['W', 'I', 'y'], { tip: true, wide: false });
        axisRay(b, 21, 17, [1, 0], 13, 15, ['I', 'y', 'o'], { wide: false });
        axisRay(b, 21, 17, [-1, 0], 13, 15, ['I', 'y', 'o'], { wide: false });
        ringC(b, 21, 15, 16, 'G', { dash: 24, phase: 0.5 });
        groundHalo(b, 21, 2);
        spark(b, 9, 6, 1); spark(b, 33, 6, 1);
        disc(f, 20, 19, 1.4, 'W'); put(f, 20, 16, 'I');
        mote(f, m, 13, 2, 'I'); mote(f, m, 29, 1, 'I'); mote(f, m, 21, 0, 'W');
      } }),
    makeFrame({ tag: 'DW3 CROWN', phase: 'SETTLE 4', hold: 4, where: 'STANDING GROUND',
      radiant: true, seed: 29, rim: 0.4, aura: 0.24, crown: 0,
      hand: [25, 19], angle: -18, reach: 12,
      fx: (b, f, m) => {
        groundHalo(b, 21, 0);
        mote(f, m, 16, 6, 'I'); mote(f, m, 27, 5, 'G');
      } }),
    makeFrame({ tag: 'DW4 WRATH IDLE', phase: 'STATE LOOP 4', hold: 4, where: 'STANDING GROUND',
      radiant: true, seed: 41, rim: 0.3, aura: 0.2, crown: 1,
      hand: [25, 20], angle: -12, reach: 12,
      fx: (b, f, m) => {
        mote(f, m, 15, 9, 'u'); mote(f, m, 28, 7, 'I');
      } }),
  ],
});

// ---- B1. TALON — the rising gutter-to-sky cut ----
SECTIONS.push({
  name: 'COMBO B1 TALON', short: 'TALON', frames: [
    makeFrame({ tag: 'WB1 COIL', phase: 'WINDUP 3', hold: 3, where: 'COMBO GROUND',
      radiant: true, seed: 47, rim: 0.34, aura: 0.22, crown: 0,
      lean: [-2, 1], cape: [1, 0], hand: [17, 25], angle: 152, reach: 11,
      fx: (b, f, m) => {
        arcSmear(b, CC[0], CC[1], TAL.r, TAL.act[0] + 14, TAL.act[0], ['o', 'G'], { maxW: 1, dim: true, broken: true });
        gatherMotes(f, 8, 30, [[-2, -2], [3, -1]]);
      } }),
    makeFrame({ tag: 'AB1 TALON', phase: 'ACTIVE 3 - HOLD', hold: 3, where: 'COMBO GROUND',
      radiant: true, seed: 53, rim: 0.5, aura: 0.3, crown: 1, flare: true, flareBlade: true,
      lean: [2, 0], lunge: [3, 1], cape: [-1, 0], hand: [27, 16], angle: -44, reach: 12,
      fx: (b, f, m) => {
        arcSmear(b, CC[0], CC[1], TAL.r, TAL.act[0], TAL.act[1], ['W', 'I', 'y'], { maxW: 3, belly: 'o', skim: true });
        spark(f, 37, 9, 1); put(f, 33, 5, 'W');
        mote(f, m, 39, 14, 'I');
      } }),
    makeFrame({ tag: 'FB1 LIFT', phase: 'FOLLOW 2', hold: 2, where: 'COMBO GROUND',
      radiant: true, seed: 59, rim: 0.36, aura: 0.22, crown: 0,
      lean: [1, 0], hand: [23, 13], angle: -95, reach: 11,
      fx: (b, f, m) => {
        arcSmear(b, CC[0], CC[1], TAL.r, TAL.fol[0], TAL.fol[1], ['W', 'I'], { maxW: 2, broken: true, dim: true });
        mote(f, m, 33, 6, 'I'); mote(f, m, 28, 3, 'u');
      } }),
    makeFrame({ tag: 'XB1 CROSS', phase: 'LINK 2 - INTO THE TURN', hold: 2, where: 'COMBO GROUND',
      radiant: true, seed: 61, rim: 0.34, aura: 0.2, crown: 1,
      lean: [-1, 0], cape: [2, -1], hand: [20, 12], angle: -150, reach: 11,
      fx: (b, f, m) => {
        arcSmear(b, CC[0], CC[1], TAL.linkR, TAL.link[0], TAL.link[1], ['I', 'y'], { maxW: 2, broken: true, dim: true });
        mote(f, m, 12, 4, 'I');
      } }),
  ],
});

// ---- B2. WING — the level spin (the mirrored mid-turn body) ----
SECTIONS.push({
  name: 'COMBO B2 WING', short: 'WING', frames: [
    makeFrame({ tag: 'WB2 TURN', phase: 'WINDUP 2 - TURNED AWAY', hold: 2, where: 'COMBO GROUND - MID SPIN',
      mirror: true, radiant: true, seed: 67, rim: 0.34, aura: 0.2, crown: 0,
      hand: [15, 16], angle: -160, reach: 11,
      fx: (b, f, m) => {
        ellipseBand(b, WING.c[0], WING.c[1], WING.rx, WING.ry, WING.pass[0], WING.pass[1], { dim: true, broken: true, lead: 0 });
        mote(f, m, 6, 9, 'I');
      } }),
    makeFrame({ tag: 'AB2 WING', phase: 'ACTIVE 4 - HOLD', hold: 4, where: 'COMBO GROUND',
      radiant: true, seed: 71, rim: 0.55, aura: 0.34, crown: 1, flare: true, flareBlade: true,
      lean: [2, 0], lunge: [4, 1], hand: [28, 19], angle: 2, reach: 13,
      fx: (b, f, m) => {
        ellipseBand(b, WING.c[0], WING.c[1], WING.rx, WING.ry, WING.act[0], WING.act[1], { lead: 34 });
        speedLine(b, 8, 15, 16, 15, { core: 'I', rim: 'o', gap: 1, dim: true, broken: 4 });
        spark(f, 42, 18, 1); put(f, 40, 15, 'W');
        mote(f, m, 30, 10, 'I'); mote(f, m, 24, 12, 'y');
      } }),
    makeFrame({ tag: 'FB2 CARRY', phase: 'FOLLOW 2', hold: 2, where: 'COMBO GROUND',
      radiant: true, seed: 73, rim: 0.36, aura: 0.22, crown: 0,
      lean: [1, 1], hand: [26, 23], angle: 38, reach: 12,
      fx: (b, f, m) => {
        ellipseBand(b, WING.c[0], WING.c[1], WING.rx, WING.ry, WING.fol[0], WING.fol[1], { dim: true, broken: true, lead: 0 });
        mote(f, m, 34, 12, 'I'); mote(f, m, 12, 11, 'u');
      } }),
    makeFrame({ tag: 'XB2 UNDER', phase: 'LINK 2 - GRIP CHANGE', hold: 2, where: 'COMBO GROUND',
      radiant: true, seed: 79, rim: 0.34, aura: 0.2, crown: 1, twoHand: true,
      lean: [0, 2], cape: [1, 1], hand: [17, 24], angle: 158, reach: 11,
      fx: (b, f, m) => {
        arcSmear(b, XB2.c[0], XB2.c[1], XB2.r, XB2.a[0], XB2.a[1], ['I', 'y'], { maxW: 2, broken: true, dim: true, skim: true });
        gatherMotes(f, 7, 28, [[-1, -2], [3, -1]]);
      } }),
  ],
});

// ---- B3. FANG — the over-the-top crash ----
SECTIONS.push({
  name: 'COMBO B3 FANG', short: 'FANG', frames: [
    makeFrame({ tag: 'WB3 HOIST', phase: 'WINDUP 3', hold: 3, where: 'COMBO GROUND',
      radiant: true, seed: 83, rim: 0.36, aura: 0.22, crown: 0, twoHand: true,
      lean: [-1, 0], cape: [1, 1], hand: [18, 13], angle: -128, reach: 12,
      fx: (b, f, m) => {
        arcSmear(b, CC[0], CC[1], FANG.r, FANG.act[0], FANG.act[0] + 55, ['I', 'y'], { maxW: 2, broken: true, dim: true });
        gatherMotes(f, 10, 4, [[-2, -1], [3, -2], [1, 3]]);
      } }),
    makeFrame({ tag: 'AB3 FANG', phase: 'ACTIVE 6 - HOLD', hold: 6, where: 'COMBO GROUND - THE CRASH',
      radiant: true, seed: 89, rim: 0.7, aura: 0.45, crown: 1, flare: true, flareBlade: true,
      lean: [3, 1], lunge: [4, 2], cape: [2, 0], twoHand: true, hand: [28, 17], angle: 58, reach: 15,
      fx: (b, f, m) => {
        arcSmear(b, CC[0], CC[1], FANG.r, FANG.act[0], FANG.act[1], ['W', 'I', 'y'], { maxW: 4, belly: 'o', skim: true });
        impactStar(f, 36, 30, true);
        for (let i = 0; i < 6; i++) { putB(b, 24 + i * 3, FLOOR - 1, i % 2 ? 'o' : 'y'); if (i % 2) putB(b, 25 + i * 3, FLOOR, 'u'); }
        mote(f, m, 15, 6, 'I'); mote(f, m, 27, 2, 'y');
      } }),
    makeFrame({ tag: 'FB3 BURY', phase: 'FOLLOW 3', hold: 3, where: 'COMBO GROUND',
      radiant: true, seed: 97, rim: 0.4, aura: 0.24, crown: 0, twoHand: true,
      lean: [1, 1], lunge: [3, 1], hand: [28, 18], angle: 58, reach: 15,
      fx: (b, f, m) => {
        arcSmear(b, CC[0], CC[1], FANG.r, FANG.act[1] - 130, FANG.act[1], ['W', 'I'], { maxW: 2, broken: true, dim: true, skim: true });
        ellipseRing(b, 36, FLOOR - 1, 9, 2.4, 'o', { dash: 12, phase: 0.5 });
        mote(f, m, 36, 24, 'I'); mote(f, m, 35, 20, 'y'); mote(f, m, 37, 16, 'G');
      } }),
    makeFrame({ tag: 'XB3 DRAW', phase: 'LINK 2 - INTO THE CHARGE', hold: 2, where: 'COMBO GROUND',
      radiant: true, seed: 101, rim: 0.34, aura: 0.2, crown: 1, twoHand: true,
      lean: [0, 0], hand: [26, 19], angle: -8, reach: 12,
      fx: (b, f, m) => {
        ellipseRing(b, 34, FLOOR - 1, 7, 2, 'G', { dash: 12, phase: 0.5 });
        mote(f, m, 33, 14, 'u'); mote(f, m, 30, 10, 'G');
      } }),
  ],
});

// ---- C. CROWN CHARGE — 90 ticks = 1.5 s, exactly (asserted) ----
// The blade is raised to the sky and the WRATH SIGIL opens overhead (detached
// world-space grid — same contract as the 8C-0 pillar: it does NOT ride the
// sprite). On the body: ground halo, converging motes (mean radius contracts —
// asserted), the kernel on the tip. GATHER -> IGNITE -> RELEASE on the sigil.
const TP = [25, 4];                                        // the raised tip — held forward of the face; the sigil hangs above it
SECTIONS.push({
  name: 'CROWN CHARGE', short: 'CHARGE', frames: [
    makeFrame({ tag: 'C0 ENTRY', phase: 'ENTRY 10', hold: 10, where: 'CHARGE GROUND',
      radiant: true, seed: 103, rim: 0.32, aura: 0.2, calmBlade: true, twoHand: true,
      lunge: [2, 1], hand: [25, 15], angle: -90, reach: 11,
      fx: (b, f, m) => {
        groundHalo(b, 21, 1);
        gatherMotes(f, TP[0], TP[1] + 2, [[-9, 4], [9, 3], [-6, 8]]);
      } }),
    makeFrame({ tag: 'C1 GATHER', phase: 'GATHER 18', hold: 18, where: 'CHARGE GROUND',
      radiant: true, seed: 107, rim: 0.32, aura: 0.2, calmBlade: true, twoHand: true,
      lunge: [2, 1], cape: [0, 1], hand: [25, 15], angle: -90, reach: 11,
      fx: (b, f, m) => {
        groundHalo(b, 21, 1);
        [[-8, 2], [8, 1], [-5, -1], [6, 4]].forEach(([dx, dy], i) => mote(f, m, TP[0] + dx, TP[1] + dy, i % 2 ? 'G' : 'y'));
        put(f, TP[0], TP[1] - 1, 'I');
      } }),
    makeFrame({ tag: 'C2 GEOMETRY', phase: 'BUILD 22', hold: 22, where: 'CHARGE GROUND',
      radiant: true, seed: 109, rim: 0.36, aura: 0.24, calmBlade: true, twoHand: true,
      lunge: [2, 1], hand: [25, 15], angle: -90, reach: 11,
      fx: (b, f, m) => {
        groundHalo(b, 21, 2);
        ringC(b, TP[0], TP[1] + 1, 4, 'I', { dash: 8, phase: 0.5 });
        [[-5, 1], [5, 0], [-3, -2], [4, 3]].forEach(([dx, dy], i) => mote(f, m, TP[0] + dx, TP[1] + dy, i % 2 ? 'y' : 'I'));
        put(f, TP[0], TP[1] - 1, 'W');
      } }),
    makeFrame({ tag: 'C3 PEAK', phase: 'PEAK 28', hold: 28, where: 'CHARGE GROUND - ARENA DARKENS',
      radiant: true, seed: 113, rim: 0.5, aura: 0.3, flare: true, flareBlade: true, calmBlade: true, twoHand: true,
      lunge: [2, 1], cape: [1, -1], hand: [25, 15], angle: -90, reach: 11,
      fx: (b, f, m) => {
        groundHalo(b, 21, 2);
        for (let i = 0; i < 7; i++) putB(b, 10 + i * 4, FLOOR - 1, i % 2 ? 'o' : 'y');
        for (let i = 0; i < 5; i++) putB(b, 13 + i * 4, FLOOR - 2, i % 2 ? 'G' : 'o');
        [[-4, 0], [4, -1], [-2, -3], [3, 2]].forEach(([dx, dy], i) => mote(f, m, TP[0] + dx, TP[1] + dy, i % 2 ? 'I' : 'W'));
        disc(f, TP[0], TP[1] - 1, 1.5, 'W');
        put(f, TP[0], TP[1] - 3, 'I'); put(f, TP[0], TP[1] + 3, 'I');
      } }),
    makeFrame({ tag: 'C4 RELEASE', phase: 'RELEASE 12 - THE FLASH FIRES', hold: 12, where: 'CHARGE GROUND',
      radiant: true, seed: 127, rim: 0.4, aura: 0.22, calmBlade: true, twoHand: true,
      lunge: [2, 1], hand: [25, 14], angle: -90, reach: 12,
      fx: (b, f, m) => {
        groundHalo(b, 21, 1);
        put(f, TP[0], 1, 'W'); put(f, TP[0], 0, 'I');
        mote(f, m, TP[0] - 3, 2, 'I'); mote(f, m, TP[0] + 3, 1, 'I');
      } }),
  ],
});

// ---- D. RELEASE WATCH + SETTLE — the hero during DRAGONFALL ----
// The greatsword is a world event; the hero holds a guard while it falls, then
// the state ENDS on the body: crown fragments, sheath breaks into rising motes,
// the blue edge returns. The wrath settles — it never just pops off.
SECTIONS.push({
  name: 'DRAGONFALL WATCH', short: 'RELEASE', frames: [
    makeFrame({ tag: 'F1 GUARD', phase: 'WATCH 22', hold: 22, where: 'UNDER THE FALL',
      radiant: true, seed: 131, rim: 0.34, aura: 0.2, crown: 1, twoHand: true,
      lean: [1, 0], hand: [26, 18], angle: -12, reach: 12,
      fx: (b, f, m) => {
        for (let i = 0; i < 5; i++) putB(b, 26 + i * 3, FLOOR - 1, i % 2 ? 'G' : 'o');
        mote(f, m, 18, 8, 'I');
      } }),
    makeFrame({ tag: 'F2 SETTLE', phase: 'STATE ENDS 22', hold: 22, where: 'AFTER THE STRIKE',
      settle: true, lean: [0, 1], hand: [25, 21], angle: 12, reach: 12,
      fx: (b, f, m) => {
        ringC(b, 21, 9, 5, 'G', { dash: 11, phase: 1.5, arcFrom: RAD(-150), arcTo: RAD(-30) });
        mote(f, m, 21, 4, 'u'); mote(f, m, 17, 6, 'G'); mote(f, m, 26, 5, 'u');
        for (let i = 0; i < 4; i++) putB(b, 15 + i * 5, FLOOR - 1, 'u');
      } }),
  ],
});

const STEP_NOTE = [
  ['THE ACTIVATION - GATHER - IGNITE - BURST - CROWN - WRATH IDLE - 22 TICKS',
   'THE STATE MINTS ITS THREE MARKS HERE - RADIANT SKIN + CROWN HALO + THE WRATH BLADE - EVERY LATER FRAME WEARS THEM',
   'DW0 IS THE ONLY BARE FRAME - THE SWORD IS STILL COLD-BLUE. ON DW1 THE LIGHT RUNS HILT TO TIP. DW2 IS THE 8B-0 BODYFLARE PEAK - HALO SNAP R12 -',
   '    NORTH RAY LONGEST - GROUND HALO FULL. DW3-DW4 SETTLE INTO THE REUSABLE STATE LOOP - SMALL CROWN ARC - BOUNDED AURA - NOTHING COVERS THE BODY.'],
  ['STRIKE 1 - THE RISING GUTTER-TO-SKY CUT - ONE HAND',
   'THE TRAIL RIPS ALONG THE FLOOR AND UP THE FRONT - PIVOT AT THE BODY CORE R18 - SWEEP 190 DEGREES',
   'THE COIL SHOWS THE ENTRY OF THE ARC IT IS ABOUT TO CUT - THE HIT RIDES IT FROM LOW-BACK THROUGH THE FLOOR SKIM TO HIGH-FRONT - THE FOLLOW LIFTS',
   '    OVERHEAD AND THE LINK CARRIES THE BLADE ACROSS THE CROWN INTO THE TURN. EXIT AND ENTRY ANGLES ARE SHARED CONSTANTS - ASSERTED WITHIN 6 CELLS.'],
  ['STRIKE 2 - THE LEVEL SPIN - THE ONLY MIRRORED BODY IN THE HERO SET',
   'A LEVEL SPIN SEEN SIDE-ON IS AN ELLIPSE - RX18 RY5 - THE BAND WRAPS THE BODY - LEAD EDGE WHITE',
   'WB2 TURN IS THE TELL - THE APPROVED BASE MIRRORED - CAPE SWUNG TO THE LEAD SIDE - CREST REVERSED - THE FAR-SIDE PASS RUNS DIM OVER THE TOP OF THE',
   '    ELLIPSE. AB2 LANDS FACING FRONT WITH THE BAND FULL AND THE EDGE HOT. THE LINK CHANGES GRIP TO TWO HANDS AND WHIPS THE BLADE UNDER - FLOOR SKIM.'],
  ['STRIKE 3 - THE OVER-THE-TOP CRASH - TWO HANDS - THE HEAVIEST',
   'THE BLADE GOES UP THE BACK - OVER THE CROWN - AND DOWN THE FRONT - SWEEP 260 DEGREES AT R19 - BIG STAR AT THE PLANT',
   'THE HOIST SHOWS THE ARC ALREADY CLIMBING THE BACK. THE CRASH HOLDS 6 TICKS - THE LONGEST HOLD IN THE CHAIN - WITH THE FULL SWEEP READABLE BEHIND',
   '    THE BODY AND THE IMPACT STAR AT THE TIP ON THE FLOOR AHEAD. THE BURY LETS THE MOTES RISE OFF THE PLANT - THE DRAW PULLS OUT INTO THE CHARGE.'],
  ['THE CHARGE - 90 TICKS = 1.5 SECONDS EXACTLY - ASSERTED',
   'BLADE RAISED TO THE SKY - THE WRATH SIGIL OPENS OVERHEAD - GATHER - IGNITE - RELEASE ON THE FAMILY GRAMMAR',
   'THE SIGIL IS A DETACHED WORLD-SPACE GRID - THE SAME CONTRACT AS THE 8C-0 PILLAR - IT DOES NOT RIDE THE SPRITE. ON THE BODY THE GROUND HALO HOLDS,',
   '    THE GATHER MOTES CONTRACT ON THE RAISED TIP - MEAN RADIUS ASSERTED FALLING - AND C3 PEAK IS WHERE THE ARENA BEGINS TO DARKEN. C4 SNAPS EVERYTHING',
   '    TIGHT AND FIRES THE FLASH - THE HANDOFF TO THE SKY POINT WHERE THE GREATSWORD MANIFESTS.'],
  ['THE HERO UNDER THE FALL - THEN THE STATE ENDS ON THE BODY',
   'F1 HOLDS A GUARD WHILE THE GREATSWORD FALLS. F2 IS THE DEACTIVATION - CROWN FRAGMENTS - SHEATH BREAKS INTO RISING MOTES - THE BLUE EDGE RETURNS',
   'THE WRATH NEVER JUST POPS OFF - THE SETTLE IS THE FAMILY DISSOLVE PLAYED ON THE WEAPON AND THE CROWN - LIGHT RISES OFF BOTH - AND THE CHARACTER',
   '    WALKS OUT OF THE STATE WITH HIS OWN COLD-BLUE SWORD BACK. THE SETTLE FRAME IS THE ONLY OTHER FRAME WITH BLUE ON THE BLADE - ASSERTED.'],
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
// THE MASTER CLOCK — every timing law of the move, as data.
// =====================================================================
const SEC_HOLDS = SECTIONS.map(s => s.frames.reduce((a, f) => a + f.hold, 0));
const T_SEC = []; { let t = 0; SEC_HOLDS.forEach(h => { T_SEC.push(t); t += h; }); }
const TOTAL = SEC_HOLDS.reduce((a, b) => a + b, 0);
const CHARGE_TICKS = SEC_HOLDS[4];                     // must be exactly 90 = 1.5 s
const CHARGE_T0 = T_SEC[4];
const DARKEN_START = CHARGE_T0 + 10 + 18 + 22;         // C3 PEAK begins — the arena starts dimming
const FLASH_START = CHARGE_T0 + CHARGE_TICKS - 3;      // straddles the release into the manifest
const FLASH_LEN = 6;                                   // WB0 2 + WB1 2 + WB2 2 — never a whiteout
const GS_T0 = T_SEC[5];                                // the greatsword clock starts with the watch
const GS_HOLDS = [6, 6, 8, 4, 10, 10];                 // GS0..GS5
const GS_T = []; { let t = GS_T0; GS_HOLDS.forEach(h => { GS_T.push(t); t += h; }); }
const CONTACT_TICK = GS_T[3];
const PEAK_TICK = GS_T[4];
const GS_END = GS_T0 + GS_HOLDS.reduce((a, b) => a + b, 0);
const DARKEN_LIFT = GS_T[5];                           // the room comes back as the sword dissolves
const HERO_LEN = 30;

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

// ---- per-frame body/effect law ----
const CHAR_BLUES = 6;   // visor 2 + chest sigil 4 — the character's own cold blue, never the effect
SECTIONS.forEach(sec => sec.frames.forEach(fr => {
  const id = `${sec.name} ${fr.tag}`;
  if (fr.grid.length !== GH || fr.grid.some(r => r.length !== GW)) fail('size', id);
  fr.grid.flat().forEach(k => { if (!ALLKEYS.has(k)) fail('key', id, k); });
  [fr.fxB, fr.fxF].forEach((fx, li) => fx.flat().forEach(k => {
    if (!FXKEYS.has(k)) fail('fx key', id, li ? 'front' : 'back', k);
  }));
  const bodyFeet = fr.body.slice(FLOOR - 1).flat().filter(k => k !== '.').length;
  if (bodyFeet < 6) fail('feet missing', id, bodyFeet);
  const bodyCount = litCount(fr.body);
  if (bodyCount < baseCount * 0.8 || bodyCount > baseCount * 1.4) fail('body mass', id, bodyCount, 'base', baseCount);
  if (fr.radiant) {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++)
      if ((fr.body[y][x] === '.') !== (fr.bodyPre[y][x] === '.')) { fail('radiant mask desync', id, x, y); y = GH; break; }
  }
  let cover = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++)
    if (fr.fxF[y][x] !== '.' && fr.body[y][x] !== '.') cover++;
  const lim = fr.flare ? 18 : 6;
  if (cover > lim) fail('body cover', id, cover, '>', lim);
  if (fr.meta.aura !== undefined && (fr.meta.aura < 5 || fr.meta.aura > 34))
    fail('aura bounds', id, fr.meta.aura);
  // THE WRATH BLADE LAW — on every wrath-active frame the blade is fully
  // awakened: it contributes ZERO blue, so the body can never carry more than
  // the character's own visor+sigil (6 cells — arms crossing the chest or a
  // high grip may legitimately cover some, but at least a trace must survive),
  // and the awakened white edge must actually be there. Pre-ignite and settle
  // frames must carry clearly MORE blue (the cold-blue blade exists on them).
  const blues = blueCount(fr.body);
  const bodyW = fr.body.flat().filter(k => k === 'W').length;
  if (fr.wrathOn) {
    if (blues > CHAR_BLUES) fail('wrath blade leaked blue', id, blues, '>', CHAR_BLUES);
    if (blues < 2) fail('character blues erased', id, blues);
    if (bodyW < 6) fail('wrath edge missing', id, bodyW);
  } else if (blues < CHAR_BLUES + 3) fail('non-wrath frame lost its blue blade', id, blues);
}));

// ---- THE MOMENTUM LAW — one rotation across three strikes ----
{
  const pairs = [
    ['TAL act end = follow start', ptCirc(CC, TAL.r, TAL.act[1]), ptCirc(CC, TAL.r, TAL.fol[0])],
    ['TAL follow end = link start', ptCirc(CC, TAL.r, TAL.fol[1]), ptCirc(CC, TAL.linkR, TAL.link[0])],
    ['TAL link end = WING pass start', ptCirc(CC, TAL.linkR, TAL.link[1]), ptEll(WING, WING.pass[0])],
    ['WING act end = under start', ptEll(WING, WING.act[1]), ptCirc(XB2.c, XB2.r, XB2.a[0])],
    ['under end = FANG act start', ptCirc(XB2.c, XB2.r, XB2.a[1]), ptCirc(CC, FANG.r, FANG.act[0])],
  ];
  pairs.forEach(([name, p, q]) => {
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d > 6) fail('momentum junction', name, d.toFixed(2), '> 6');
  });
  const tipXB1 = SECTIONS[1].frames[3].meta.tip, tipWB2 = SECTIONS[2].frames[0].meta.tip;
  const dTip = Math.hypot(tipXB1[0] - tipWB2[0], tipXB1[1] - tipWB2[1]);
  if (dTip > 9) fail('turn handoff tip distance', dTip.toFixed(2), '> 9');
  if (Math.abs(TAL.act[1] - TAL.act[0]) < 140) fail('TALON sweep too small');
  if (Math.abs(WING.act[1] - WING.act[0]) < 140) fail('WING sweep too small');
  if (Math.abs(FANG.act[1] - FANG.act[0]) < 200) fail('FANG sweep too small');
  // every junction frame carries a visible dim connector
  [[1, 3], [2, 0], [2, 3], [3, 0]].forEach(([si, fi]) => {
    const fr = SECTIONS[si].frames[fi];
    const dimCells = fr.fxB.flat().filter(k => k === 'o' || k === 'G' || k === 'u' || k === 'y').length;
    if (dimCells < 6) fail('junction connector missing', fr.tag, dimCells);
  });
}

// ---- escalation: strikes rise, and the whole move rises by stage ----
{
  const hit = si => lightCount(SECTIONS[si].frames[1].grid);
  const tal = hit(1), wing = hit(2), fang = hit(3);
  if (!(tal < wing && wing < fang)) fail('strike escalation', tal, wing, fang);
  if (fang < tal * 1.4) fail('FANG not dominant enough', fang, 'vs', tal);
  const lAct = lightCount(SECTIONS[0].frames[2].grid);
  const lCombo = fang;
  const lCharge = lightCount(SECTIONS[4].frames[3].grid) + lightCount(SIGIL[3]);
  const lFin = lightCount(GREATSWORD[4]) + lightCount(BURST[1]);
  if (!(lAct < lCombo && lCombo < lCharge && lCharge < lFin))
    fail('stage escalation', lAct, lCombo, lCharge, lFin);
}

// ---- sub-effect grids: pure LIGHT, correct size ----
function checkGrid(name, g, w, h, keys = LKD) {
  if (g.length !== h || g.some(r => r.length !== w)) fail('size', name, g.length, g[0].length);
  for (const r of g) for (const k of r) if (!keys.has(k)) fail('key', name, k);
}
SIGIL.forEach((g, i) => checkGrid('sigil' + i, g, SG.W, SG.H));
BURST.forEach((g, i) => checkGrid('burst' + i, g, WB.W, WB.H));
GREATSWORD.forEach((g, i) => checkGrid('greatsword' + i, g, GS.W, GS.H));
BLADESTUDY.forEach((g, i) => checkGrid('bladestudy' + i, g, SS.W, SS.H, new Set([...LK, '0', '1', '2', '3', '4', '5', 'l', 'L', 'g', '.'])));

// ---- family laws on the new grids ----
const hSym = (g, name) => {
  const w = g[0].length;
  for (let y = 0; y < g.length; y++) for (let x = 0; x < Math.floor(w / 2); x++)
    if (g[y][x] !== g[y][w - 1 - x]) { fail('h-symmetry', name, x, y); return; }
};
SIGIL.forEach((g, i) => hSym(g, 'sigil' + i));
BURST.forEach((g, i) => hSym(g, 'burst' + i));
GREATSWORD.forEach((g, i) => hSym(g, 'greatsword' + i));
{
  // sigil: growth + white ignition + north dominance at blaze
  const lits = SIGIL.map(litCount);
  if (!(lits[0] < lits[1] && lits[1] < lits[2] && lits[2] < lits[3])) fail('sigil growth', lits.join(','));
  const g3 = SIGIL[3];
  let up = 0, down = 0, side = 0;
  g3.forEach((row, y) => row.forEach((k, x) => {
    if (k === '.') return;
    if (x === SG.C && y < SG.C - 6) up = Math.max(up, SG.C - y);
    if (x === SG.C && y > SG.C + 6) down = Math.max(down, y - SG.C);
    if (y === SG.C && Math.abs(x - SG.C) > 6) side = Math.max(side, Math.abs(x - SG.C));
  }));
  if (!(up > down && up >= side)) fail('sigil north dominance', up, down, side);
  // burst: flash core is white-heavy, then clears hollow
  const wShare = g => g.flat().filter(k => k === 'W').length / Math.max(1, lightCount(g));
  if (wShare(BURST[0]) < 0.4) fail('burst core not white', wShare(BURST[0]).toFixed(2));
  let hollow = 0;
  BURST[2].forEach((row, y) => row.forEach((k, x) => { if (k !== '.' && Math.hypot(x - WB.C, y - WB.C) < 4) hollow++; }));
  if (hollow > 0) fail('burst does not clear', hollow);
  if (FLASH_LEN > 8) fail('flash lingers', FLASH_LEN);
  if (FLASH_START - DARKEN_START < 24) fail('darken lead too short', FLASH_START - DARKEN_START);
  if (CHARGE_TICKS !== 90) fail('charge is not 1.5 s', CHARGE_TICKS);
  if (GS_END !== TOTAL) fail('greatsword clock does not close the move', GS_END, TOTAL);
}
{
  // the greatsword is a SWORD, at overwhelming scale — never a beam
  const g1 = GREATSWORD[1];
  const widthAt = y => { let lo = -1, hi = -1; for (let x = 0; x < GS.W; x++) if (g1[y][x] !== '.') { if (lo < 0) lo = x; hi = x; } return lo < 0 ? 0 : hi - lo + 1; };
  const guardW = widthAt(GS.GUARD);
  const rootW = widthAt(GS.GUARD + 4);
  const nearTipW = widthAt(GS.TIP - 3);
  if (guardW < rootW * 1.7) fail('guard not dominant', guardW, rootW);
  if (nearTipW > 3) fail('tip not tapered', nearTipW);
  if (rootW - nearTipW < 4) fail('blade reads as a beam', rootW, nearTipW);
  const bladeLen = GS.TIP - (GS.GUARD + 3);
  if (bladeLen < 24 * 2.3) fail('blade not at overwhelming scale', bladeLen);
  let wCore = 0, coreRows = 0;
  for (let y = GS.GUARD + 3; y <= GS.TIP; y++) { coreRows++; if (g1[y][GS.C] === 'W') wCore++; }
  if (wCore / coreRows < 0.6) fail('white core broken', (wCore / coreRows).toFixed(2));
  // descent carries the same sword: every GS1 cell survives into GS2
  let missing = 0;
  for (let y = 0; y < GS.H; y++) for (let x = 0; x < GS.W; x++)
    if (g1[y][x] !== '.' && GREATSWORD[2][y][x] !== g1[y][x]) missing++;
  if (missing > 0) fail('descent changed the sword', missing);
  // dissolve: thinner, and the light has RISEN (burns out from the buried end up)
  if (!(litCount(GREATSWORD[5]) < litCount(GREATSWORD[4]) * 0.75)) fail('dissolve not thinning');
  const third = (g, lo, hi) => { let n = 0; g.forEach((row, y) => { if (y >= lo && y < hi) row.forEach(k => { if (k !== '.') n++; }); }); return n; };
  const bot4 = third(GREATSWORD[4], 56, 84), bot5 = third(GREATSWORD[5], 56, 84);
  const top4 = third(GREATSWORD[4], 0, 28), top5 = third(GREATSWORD[5], 0, 28);
  if (!(bot5 < bot4 * 0.6)) fail('buried end not burning out first', bot5, bot4);
  if (!(top5 > top4 * 0.35)) fail('crown vanished too soon', top5, top4);
  if (!(meanY(GREATSWORD[5]) < meanY(GREATSWORD[4]))) fail('greatsword light does not rise', meanY(GREATSWORD[5]).toFixed(1), meanY(GREATSWORD[4]).toFixed(1));
}
{
  // charge gather contracts on the raised tip
  const mR = fi => {
    const m = SECTIONS[4].frames[fi].meta.motes;
    if (!m.length) return 99;
    return m.reduce((a, [x, y]) => a + Math.hypot(x - TP[0], y - TP[1]), 0) / m.length;
  };
  const r1 = mR(1), r2 = mR(2), r3 = mR(3);
  if (!(r1 > r2 && r2 > r3)) fail('charge gather not contracting', r1.toFixed(1), r2.toFixed(1), r3.toFixed(1));
}

// =====================================================================
// SHEET
// =====================================================================
const SW = 690, SH = 1878, SCALE = 3;
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
text('HERO DRAGON WRATH + COMBO B - DRAGONS REND - STAGE 8C-1 CONCEPT - STRICT PIXEL ART', 3, 2, HEADC);
text('DRAGON WRATH IS A NAMED REUSABLE HERO POWER STATE IN THE APPROVED HERO LIGHT ECLIPSE FAMILY 8B-0. NOTHING WIRED INTO SRC.', 3, 9);
text('DAYBREAK IS ARCS AT THE SHOULDER - MERIDIAN IS LINES ACROSS THE ARENA - DRAGONS REND IS TURNS AROUND THE BODY CORE -', 3, 15);
text('THREE CONNECTED FULL-BODY ROTATIONS INSIDE A POWER STATE - EVERY TRAIL ENTERS WHERE THE LAST ONE EXITED - ASSERTED.', 3, 21);
text('PALETTE LAW - WHITE CORE + GOLD GLOW ONLY - NO BLUE EVER IN THE EFFECTS - NO BLUR - NO GRADIENTS - NO NEW COLORS - NO NEW RAMP', 3, 29, HEADC);
(() => {
  const keys = ['W', 'I', 'y', 'o', 'G', 'u'];
  const roles = ['CORE', 'IVORY', 'RADIANT', 'WARM', 'DEEP', 'BRONZE'];
  keys.forEach((k, i) => {
    const x = 3 + i * 34;
    cellFrame(x, 36, 30, 10, LIGHT[k]);
    text(k, x + 1, 49, '#6d6488'); text(roles[i], x + 6, 49, SUBC);
  });
  text('WARM LAW R OVER G OVER B EVERY STEP - BLUE CANNOT EXIST IN THE RAMP', 213, 37);
  text('THE VISOR AND CHEST SIGIL KEEP THEIR COLD BLUE - THAT IS THE CHARACTER NOT THE EFFECT', 213, 43);
  text('CANVAS 44X34 - HERO BASE AT 7.10 - FEET ROW 33 - IDENTICAL TO THE APPROVED COMBO CANVASES', 213, 49);
  text('THE STATE - RADIANT SKIN + CROWN HALO ARC + THE WRATH BLADE - MINTED AT ACTIVATION - DURING THE CHARGE THE SIGIL IS THE CROWN', 3, 56, GOLDC);
  text('THE WRATH BLADE - THE HEROS OWN SWORD AWAKENED - WHITE EDGE - STANDING-OFF GOLD SHEATH - RUNE PIPS - THE STEEL CORE NEVER CHANGES', 3, 62, GOLDC);
  text('GRAMMAR - EVERY BEAT PLAYS GATHER - IGNITE - RELEASE - DISSOLVE - THE SETTLE RUNS IT ON THE WEAPON AND THE CROWN - LIGHT RISES OUT', 3, 68, GOLDC);
})();

// ---------- full sequence ----------
let Y = 78;
text('FULL SEQUENCE - 24 BODY FRAMES - 6 GROUPS - HOLDS AT 60FPS - TOTAL ' + TOTAL + ' TICKS WITH THE GREATSWORD CLOCK', 3, Y, HEADC);
(() => {
  const all = [];
  SECTIONS.forEach((s, si) => s.frames.forEach(fr => all.push({ fr, si })));
  const oy0 = Y + 8;
  all.forEach(({ fr, si }, i) => {
    const row = Math.floor(i / 12), col = i % 12;
    const x = 3 + col * 57, y = oy0 + row * 52;
    cellFrame(x, y, GW, GH, '#100d1c');
    stampM(fr.grid, COMBO_PAL, x, y);
    text(['RISE', 'TAL', 'WING', 'FANG', 'CHRG', 'SETL'][si], x, y + GH + 3, GOLDC);
    text(fr.tag.split(' ')[0], x + 19, y + GH + 3, SUBC);
    text(fr.hold + 'T', x + 36, y + GH + 3, DIMC);
  });
})();
Y += 8 + 2 * 52 + 6;

// ---------- per-group bands ----------
SECTIONS.forEach((sec, si) => {
  text(sec.name + ' - ' + STEP_NOTE[si][0], 3, Y, HEADC);
  text(STEP_NOTE[si][1], 3, Y + 7, GOLDC);
  const oy = Y + 15;
  sec.frames.forEach((fr, fi) => {
    const x = 3 + fi * 96;
    cellFrame(x, oy, GW * 2, GH * 2, '#100d1c');
    stampM(fr.grid, COMBO_PAL, x, oy, { s: 2 });
    text(fr.tag, x, oy + GH * 2 + 3, SUBC);
    text(fr.phase, x, oy + GH * 2 + 9, DIMC);
    text(fr.where, x, oy + GH * 2 + 15, fr.where.indexOf('DARKEN') >= 0 || fr.where.indexOf('CRASH') >= 0 ? GOLDC : DIMC);
  });
  // the combo strikes get a PATH inset — the full swept arc from the constants
  if (si >= 1 && si <= 3) {
    const x = 3 + 4 * 96;
    cellFrame(x, oy, GW * 2, GH * 2, '#0d0a18');
    const pg = mkGrid();
    baseBody().forEach((row, y) => row.forEach((k, x2) => { if (k !== '.') pg[y][x2] = '1'; }));
    if (si === 1) {
      arcSmear(pg, CC[0], CC[1], TAL.r, TAL.act[0], TAL.act[1], ['W', 'I', 'y'], { maxW: 2, skim: true });
      arcSmear(pg, CC[0], CC[1], TAL.r, TAL.fol[0], TAL.fol[1], ['y', 'o'], { maxW: 1, broken: true, dim: true });
      arcSmear(pg, CC[0], CC[1], TAL.linkR, TAL.link[0], TAL.link[1], ['o', 'G'], { maxW: 1, broken: true, dim: true });
    } else if (si === 2) {
      ellipseBand(pg, WING.c[0], WING.c[1], WING.rx, WING.ry, WING.pass[0], WING.act[1], { lead: 30 });
      arcSmear(pg, XB2.c[0], XB2.c[1], XB2.r, XB2.a[0], XB2.a[1], ['o', 'G'], { maxW: 1, broken: true, dim: true, skim: true });
    } else {
      arcSmear(pg, CC[0], CC[1], FANG.r, FANG.act[0], FANG.act[1], ['W', 'I', 'y'], { maxW: 2, skim: true });
    }
    stampM(pg, COMBO_PAL, x, oy, { s: 2 });
    text('THE PATH - FROM THE SHARED CONSTANTS', x, oy + GH * 2 + 3, GOLDC);
    text('ENTRY DIM - EXIT HOT - ONE ROTATION', x, oy + GH * 2 + 9, DIMC);
  }
  const notes = STEP_NOTE[si].slice(2);
  notes.forEach((ln, i) => text(ln, 3, oy + GH * 2 + 24 + i * 6, i === 0 ? SUBC : DIMC));
  Y = oy + GH * 2 + 26 + notes.length * 6 + 4;
});

// ---------- THE WRATH BLADE STUDY ----------
text('THE WRATH BLADE - THE TRANSFORMED SWORD - 5 STATES AT 3X - THE PHYSICAL SWORD NEVER CHANGES SHAPE', 3, Y, HEADC);
text('BASE - AWAKEN - EMPOWERED - FLARE - SETTLE. THE GAP BETWEEN EDGE AND SHEATH IS THE LAW - ENERGY AROUND A BLADE - NEVER A GLOWING STICK', 3, Y + 7, GOLDC);
(() => {
  const oy = Y + 15;
  const names = ['SS0 BASE - COLD BLUE', 'SS1 AWAKEN - LIGHT RUNS IN', 'SS2 EMPOWERED', 'SS3 IMPACT FLARE', 'SS4 SETTLE - BLUE RETURNS'];
  BLADESTUDY.forEach((g, i) => {
    const x = 3 + i * 138;
    cellFrame(x, oy, SS.W * 3, SS.H * 3, '#100d1c');
    stampM(g, COMBO_PAL, x, oy, { s: 3 });
    text(names[i], x, oy + SS.H * 3 + 3, i === 0 || i === 4 ? SUBC : GOLDC);
  });
  Y = oy + SS.H * 3 + 12;
})();

// ---------- THE WRATH SIGIL + THE WRATH BURST ----------
text('WRATH SIGIL 41X41 - THE CHARGE GEOMETRY - THE 8B-0 EMBLEM OPENING OVERHEAD', 3, Y, HEADC);
text('WRATH BURST 41X41 - THE HOLY DETONATION - ' + FLASH_LEN + ' TICKS - A FLASH NEVER A WHITEOUT', 380, Y, HEADC);
(() => {
  const oy = Y + 8;
  SIGIL.forEach((g, i) => {
    const x = 3 + i * 48;
    cellFrame(x, oy, SG.W, SG.H, '#100d1c');
    stampM(g, LIGHT, x, oy);
    text(['SG0 SEED', 'SG1 RING', 'SG2 BUILD', 'SG3 BLAZE'][i], x, oy + SG.H + 3, i === 3 ? GOLDC : SUBC);
    text(['GATHER', 'IGNITE', 'BUILD', 'RELEASE'][i], x, oy + SG.H + 9, DIMC);
  });
  text('NOT A NEW SHAPE - IT IS THE FAMILY', 200, oy + 2);
  text('EMBLEM PLAYED AS A GROWTH - TRUE', 200, oy + 8);
  text('CIRCLES - WHITE CARDINALS - NORTH', 200, oy + 14);
  text('RAY LONGEST - ASCENSION. IT HANGS', 200, oy + 20);
  text('OVER THE RAISED BLADE - DETACHED -', 200, oy + 26);
  text('WORLD SPACE - THE PILLAR CONTRACT.', 200, oy + 32);
  text('GROWTH ASSERTED SG0-SG1-SG2-SG3', 200, oy + 40, GOLDC);
  text('H-SYMMETRY ASSERTED ON ALL 4', 200, oy + 46, GOLDC);
  BURST.forEach((g, i) => {
    const x = 380 + i * 48;
    cellFrame(x, oy, WB.W, WB.H, '#100d1c');
    stampM(g, LIGHT, x, oy);
    text(['WB0 CORE', 'WB1 BLAZE', 'WB2 OPEN'][i], x, oy + WB.H + 3, i === 1 ? GOLDC : SUBC);
  });
  text('THE FLASH THAT REVEALS THE SWORD.', 528, oy + 2);
  text('WB2 IS ALREADY HOLLOW - ASSERTED -', 528, oy + 8);
  text('THE SCREEN IS NEVER OBSTRUCTED', 528, oy + 14);
  text('LONGER THAN 6 TICKS. SPARKS RISE', 528, oy + 20);
  text('OUT OF IT - THE FAMILY EXIT LAW.', 528, oy + 26);
  Y = oy + SG.H + 18;
})();

// ---------- THE GIANT ECLIPSE GREATSWORD ----------
text('DRAGONFALL - THE GIANT ECLIPSE GREATSWORD 41X84 - 6 FRAMES - MANIFEST - REVEAL - DESCENT - CONTACT - PEAK - DISSOLVE', 3, Y, HEADC);
(() => {
  const oy = Y + 8;
  GREATSWORD.forEach((g, i) => {
    const x = 3 + i * 48;
    cellFrame(x, oy, GS.W, GS.H, '#100d1c');
    stampM(g, LIGHT, x, oy);
    text(['GS0 FORM', 'GS1 REVEAL', 'GS2 FALL', 'GS3 TOUCH', 'GS4 PEAK', 'GS5 FADE'][i], x, oy + GS.H + 3, i === 4 ? GOLDC : SUBC);
    text(GS_HOLDS[i] + 'T' + (i === 4 ? ' HOLD' : ''), x, oy + GS.H + 9, DIMC);
  });
  // 2x crop of the crown — the sword-not-beam argument at cell level
  const crop = GREATSWORD[1].slice(0, 26);
  cellFrame(298, oy, GS.W * 2, 52, '#100d1c');
  stampM(crop, LIGHT, 298, oy, { s: 2 });
  text('GS1 CROWN 2X', 298, oy + 55, SUBC);
  const nx = 392;
  text('THE FINISHER IS THE WRATH BLADE AT WORLD SCALE -', nx, oy + 2, HEADC);
  text('A SWORD - NEVER A BEAM. POMMEL - GRIP - A CROSSGUARD', nx, oy + 10);
  text('ASSERTED WIDER THAN 1.7X THE BLADE ROOT - A TRUE-', nx, oy + 16);
  text('CIRCLE HALO CROWNING THE GUARD - THE CHARGE SIGIL', nx, oy + 22);
  text('ARRIVED ON THE WEAPON - AND A TAPERED BLADE ON THE', nx, oy + 28);
  text('EMBLEM RAY LAW - W CORE - I FLANKS - Y BODY - O EDGE -', nx, oy + 34);
  text('G RUNE PIPS DOWN THE CORE.', nx, oy + 40);
  text('POINT DOWN - IT DESCENDS AND STRIKES. THE DESCENT', nx, oy + 50, GOLDC);
  text('CARRIES THE SAME SWORD - EVERY GS1 CELL SURVIVES', nx, oy + 56, GOLDC);
  text('INTO GS2 - ASSERTED. THE DISSOLVE BURNS FROM THE', nx, oy + 62, GOLDC);
  text('BURIED END UP - THE CROWN GOES LAST - MOTES RISE -', nx, oy + 68, GOLDC);
  text('ASSERTED ON THE THIRDS AND THE MEAN-Y.', nx, oy + 74, GOLDC);
  text('ANCHOR - THE TIP ROW PLANTS ON THE FLOOR LINE.', nx, oy + 84);
  text('ON SCREEN AT THE HERO 2PX GRID - 82X168 PX - 3.5X THE', nx, oy + 90);
  text('48PX HERO BODY. IT DWARFS BOTH FIGHTERS AND THE', nx, oy + 96);
  text('8C-0 NOON PILLAR - THE CAPSTONE OF THE FAMILY.', nx, oy + 102);
  Y = oy + GS.H + 28;
})();

// ---------- THE SCREEN EVENT ----------
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
// stepped corner darkening — diagonal pixel steps, NEVER flat rectangular bars
function cornerVign(ox, oy, w, h) {
  const tri = (s, col) => {
    for (let i = 0; i < s; i++) for (let j = 0; j < s - i; j++) {
      paint(ox + j, oy + i, 1, 1, col, 1);
      paint(ox + w - 1 - j, oy + i, 1, 1, col, 1);
      paint(ox + j, oy + h - 1 - i, 1, 1, col, 1);
      paint(ox + w - 1 - j, oy + h - 1 - i, 1, 1, col, 1);
    }
  };
  tri(16, VIG1); tri(10, VIG2);
}
function skyRing(cx, cy, r, col) {
  const steps = Math.ceil(Math.PI * 2 * r * 1.5);
  for (let i = 0; i < steps; i++) {
    if (i % 5 > 2) continue;
    const a = i / steps * Math.PI * 2;
    paint(R(cx + Math.cos(a) * r), R(cy + Math.sin(a) * r), 1, 1, col, 1);
  }
}
text('THE SCREEN EVENT - DARKEN THEN FLASH THEN REVEAL - THE DARKENING IS STEPPED CORNERS + DIMMED VALUES - NEVER FLAT BARS - FIGHTERS ALWAYS READ', 3, Y, HEADC);
(() => {
  const oy = Y + 8, w = 128, hh = 96, fRel = 84;
  const titles = ['SE0 CHARGE PEAK', 'SE1 THE ARENA DIMS', 'SE2 THE FLASH 6T', 'SE3 THE REVEAL', 'SE4 THE STRIKE'];
  for (let i = 0; i < 5; i++) {
    const ox = 3 + i * 138;
    const dim = i >= 1 && i <= 4;
    const floorY = nightRoom(ox, oy, w, hh, fRel, { dim });
    const skyX = ox + 78, skyY = oy + 22;
    if (dim) cornerVign(ox, oy, w, hh);
    if (i === 1) { skyRing(skyX, skyY, 12, '#c9962e'); skyRing(skyX, skyY, 7, '#8a6420'); }
    if (i === 2) {
      paint(ox + 1, oy + 1, w - 2, fRel - 2, '#0a0812', 0.72);
      stampM(BURST[1], LIGHT, skyX - WB.C, skyY - WB.C);
      for (let k = 0; k < 3; k++) { paint(ox + 8 + k * 3, skyY, 6 - k * 2, 1, '#f2e6bf', 1); paint(ox + w - 14 - k * 3, skyY + 1, 6 - k * 2, 1, '#f2c94e', 1); }
    }
    if (i === 3) stampM(GREATSWORD[1], LIGHT, skyX - GS.C, oy + 3);
    if (i === 4) stampM(GREATSWORD[4], LIGHT, skyX - GS.C, floorY - GS.TIP - 1);
    // fighters AFTER the darkening — they always read
    const hero = i === 0 ? SECTIONS[4].frames[3] : (i === 4 ? SECTIONS[5].frames[0] : SECTIONS[4].frames[4]);
    stampM(hero.grid, COMBO_PAL, ox + 6, floorY - FLOOR);
    stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, ox + 92, floorY - 47);
    if (i === 0) stampM(SIGIL[3], LIGHT, ox + 6 + TP[0] - SG.C, oy + 2);
    if (i === 3) { for (let k = 0; k < 3; k++) paint(skyX, oy + 8 + k * 3, 1, 2, '#f2e6bf', 1); }
    text(titles[i], ox, oy + hh + 3, i === 2 || i === 4 ? GOLDC : SUBC);
  }
  text('SE1 - VALUES STEP DOWN - ASSERTED DARKER PER CHANNEL - CORNERS STEP IN DIAGONALS - A GOLD DASH RING FRAMES THE SKY POINT', 3, oy + hh + 11, DIMC);
  text('SE2 - THE BURST FIRES AT THE SKY POINT - 6 TICKS - SE3 THE SWORD HANGS REVEALED - SE4 THE STRIKE FLOODS THE FLOOR LINE', 3, oy + hh + 17, DIMC);
  Y = oy + hh + 25;
})();

// ---------- THE MASTER CLOCK ----------
text('THE MASTER CLOCK - ' + TOTAL + ' TICKS AT 60FPS - THE CHARGE IS 90 TICKS = 1.5 SECONDS EXACTLY - ASSERTED', 3, Y, HEADC);
(() => {
  const oy = Y + 16, x0 = 96, px = (SW - x0 - 10) / TOTAL;
  const TX = t => x0 + Math.round(t * px);
  for (let t = 0; t <= TOTAL; t += 10) {
    paint(TX(t), oy - 5, 1, 3, '#3a3550', 1);
    text(t, TX(t) - 2, oy - 12, DIMC);
  }
  // track 0 — the hero
  const cols = ['#8a6420', '#c9962e', '#e0a93c', '#f2c94e', '#f2e6bf', '#c9962e'];
  text('HERO', 3, oy, SUBC);
  SECTIONS.forEach((s, i) => {
    paint(TX(T_SEC[i]), oy, Math.max(2, Math.round(SEC_HOLDS[i] * px) - 1), 7, cols[i], 1);
    text(s.short, TX(T_SEC[i]) + 1, oy + 10, DIMC);
  });
  // track 1 — the sigil
  text('SIGIL', 3, oy + 22, SUBC);
  const sig = [[CHARGE_T0 + 10, 18, '#8a6420', 'SG0'], [CHARGE_T0 + 28, 11, '#c9962e', 'SG1'], [CHARGE_T0 + 39, 11, '#e0a93c', 'SG2'], [CHARGE_T0 + 50, 28, '#f2c94e', 'SG3'], [CHARGE_T0 + 78, 12, '#f2e6bf', 'SNAP']];
  sig.forEach(([t, len, c, lb]) => { paint(TX(t), oy + 22, Math.round(len * px), 7, c, 1); text(lb, TX(t) + 1, oy + 32, DIMC); });
  // track 2 — the screen
  text('SCREEN', 3, oy + 44, SUBC);
  paint(TX(DARKEN_START), oy + 44, Math.round((FLASH_START - DARKEN_START) * px), 7, '#241f2e', 1);
  paint(TX(FLASH_START), oy + 44, Math.round(FLASH_LEN * px), 7, '#fffdf4', 1);
  paint(TX(FLASH_START + FLASH_LEN), oy + 44, Math.round((DARKEN_LIFT - FLASH_START - FLASH_LEN) * px), 7, '#15111b', 1);
  paint(TX(DARKEN_LIFT), oy + 44, Math.round((TOTAL - DARKEN_LIFT) * px), 7, '#241f2e', 1);
  text('DARKEN RAMP', TX(DARKEN_START) + 2, oy + 54, DIMC);
  text('FLASH', TX(FLASH_START) - 6, oy + 54, WHITEC);
  text('DARK HOLD', TX(FLASH_START + FLASH_LEN) + 4, oy + 54, DIMC);
  text('LIFT', TX(DARKEN_LIFT) + 2, oy + 54, DIMC);
  // track 3 — the greatsword
  text('GREATSWORD', 3, oy + 66, SUBC);
  GS_HOLDS.forEach((h, i) => {
    paint(TX(GS_T[i]), oy + 66, Math.max(2, Math.round(h * px) - 1), 7, ['#8a6420', '#f2c94e', '#e0a93c', '#fffdf4', '#f2c94e', '#8a6420'][i], 1);
    text(['GS0', 'GS1', 'GS2', 'GS3', 'GS4', 'GS5'][i], TX(GS_T[i]) + 1, oy + 76 + (i % 2) * 6, i === 4 ? GOLDC : DIMC);
  });
  const fx0 = TX(FLASH_START), cx0 = TX(CONTACT_TICK);
  paint(fx0, oy - 3, 1, 74, '#fffdf4', 1);
  paint(cx0, oy - 3, 1, 74, '#e0a93c', 1);
  text('FLASH TICK ' + FLASH_START, fx0 - 62, oy + 88, WHITEC);
  text('CONTACT ' + CONTACT_TICK + ' - PEAK ' + PEAK_TICK, cx0 - 30, oy + 94, GOLDC);
  paint(TX(CHARGE_T0), oy + 92, TX(CHARGE_T0 + 90) - TX(CHARGE_T0), 1, '#c9962e', 1);
  paint(TX(CHARGE_T0), oy + 90, 1, 5, '#c9962e', 1); paint(TX(CHARGE_T0 + 90), oy + 90, 1, 5, '#c9962e', 1);
  text('90 TICKS = 1.5 S - THE CHARGE LAW FROM THE BRIEF - ASSERTED IN-GENERATOR', TX(CHARGE_T0) + 8, oy + 95, GOLDC);
  text('TIMINGS ARE PRESENTATION INTENT - NOT AN FSM CONTRACT - INTEGRATION IS A LATER GAMEPLAY STAGE - SEE THE HANDOFF NOTES', 3, oy + 104, HEADC);
})();
Y += 16 + 116;

// ---------- TABLEAUS ----------
text('TABLEAU 1 - THE ACTIVATION IN THE ARENA', 3, Y, HEADC);
text('TABLEAU 2 - THE EMPOWERED COMBO AGAINST THE BOSS - THE THREE TRAILS ARE ONE ROTATION', 300, Y, HEADC);
(() => {
  const oy = Y + 7;
  let floorY = nightRoom(3, oy, 290, 104, 92);
  stampM(SECTIONS[0].frames[2].grid, COMBO_PAL, 3 + 60, floorY - FLOOR);
  stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, 3 + 214, floorY - 47);
  text('DW2 BURST', 3 + 66, floorY + 4, GOLDC);
  text('THE BOSS WATCHES THE STATE ARRIVE', 3 + 138, oy + 8, DIMC);

  floorY = nightRoom(300, oy, 387, 104, 92);
  stampM(SECTIONS[3].frames[1].grid, COMBO_PAL, 300 + 176, floorY - FLOOR);
  stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, 300 + 246, floorY - 47);
  const ghost1 = SECTIONS[1].frames[1], ghost2 = SECTIONS[2].frames[1];
  stampM(ghost1.fxB, LIGHT, 300 + 60, floorY - FLOOR);
  stampM(ghost2.fxB, LIGHT, 300 + 118, floorY - FLOOR);
  text('TALON TRAIL', 300 + 62, floorY + 4, DIMC);
  text('WING TRAIL', 300 + 124, floorY + 4, DIMC);
  text('FANG - THE CRASH', 300 + 186, floorY + 4, GOLDC);
})();
Y += 7 + 104 + 12;

text('TABLEAU 3 - THE CROWN CHARGE - THE SIGIL OPENS - THE ARENA BEGINS TO DIM', 3, Y, HEADC);
text('TABLEAU 4 - DRAGONFALL - THE DESCENT INTO THE THRONE ROOM', 300, Y, HEADC);
(() => {
  const oy = Y + 7;
  let floorY = nightRoom(3, oy, 290, 116, 104, { dim: true });
  cornerVign(3, oy, 290, 116);
  const hx = 3 + 96;
  stampM(SIGIL[3], LIGHT, hx + TP[0] - SG.C, oy + 35);   // the emblem hangs just over the raised tip
  stampM(SECTIONS[4].frames[3].grid, COMBO_PAL, hx, floorY - FLOOR);
  stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, 3 + 210, floorY - 47);
  text('C3 PEAK + SG3', hx + 4, floorY + 4, GOLDC);

  floorY = nightRoom(300, oy, 387, 116, 104, { dim: true });
  cornerVign(300, oy, 387, 116);
  const sx = 300 + 252;
  skyRing(sx, oy + 14, 14, '#8a6420');
  stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, sx - 60, floorY - 47);   // the boss stands beside the fall line
  stampM(GREATSWORD[2], LIGHT, sx - GS.C, floorY - GS.TIP - 26);
  stampM(SECTIONS[5].frames[0].grid, COMBO_PAL, 300 + 84, floorY - FLOOR);
  text('F1 GUARD', 300 + 88, floorY + 4, DIMC);
  text('GS2 DESCENT - 26 CELLS ABOVE THE FLOOR', sx - 190, oy + 6, GOLDC);
  text('THE STRIKE LANDS AT THE BOSS', sx - 80, floorY + 4, GOLDC);
})();
Y += 7 + 116 + 12;

// ---------- handoff notes ----------
text('HANDOFF NOTES', 3, Y, HEADC); Y += 8;
[
  'NAME - DRAGON WRATH - A NAMED REUSABLE HERO POWER STATE - HERO LIGHT ECLIPSE FAMILY - RECORDED HERE AND IN DRAGON WRATH HANDOFF MD',
  'THE STATE MARKS - RADIANT SKIN ONE RAMP STEP UP + BROKEN GOLD CONTOUR RIM - BOUNDED CONTOUR AURA 5 TO 34 CELLS ASSERTED -',
  '    CROWN HALO ARC ABOVE THE HELM - AND THE WRATH BLADE. ANY FUTURE EMPOWERED HERO MOMENT REPLAYS EXACTLY THESE FOUR MARKS.',
  'THE WRATH BLADE - THE HEROS OWN SWORD AWAKENED - WHITE EDGE REPLACES THE COLD-BLUE GLOW - STANDING-OFF BROKEN GOLD SHEATH -',
  '    G RUNE PIPS ON THE STEEL CORE - DETACHED TIP GLINT. ON WRATH FRAMES THE ONLY BLUE LEFT IS THE VISOR + CHEST SIGIL - ASSERTED 6 CELLS.',
  'COMBO B - DRAGONS REND - TALON - WING - FANG - 12 FRAMES - 34 TICKS - TURNS AROUND THE BODY CORE - THE MOMENTUM LAW IS ASSERTED -',
  '    EVERY TRAIL SEGMENT STARTS WITHIN 6 CELLS OF WHERE THE LAST ONE ENDED - THE THREE STRIKES ARE ONE ROTATION.',
  'DISTINCTNESS - DAYBREAK = ARCS AT THE SHOULDER ON THE BODY - MERIDIAN = LINES ACROSS THE ARENA - DRAGONS REND = TURNS AT THE CORE',
  '    INSIDE A POWER STATE. THE WING TURN FRAME IS THE ONLY MIRRORED BODY IN THE HERO SET - THE SPIN IS UNMISTAKABLE.',
  'THE CHARGE - CROWN CHARGE - 90 TICKS = 1.5 SECONDS EXACTLY - ASSERTED - BLADE RAISED - WRATH SIGIL 41X41 OPENS OVERHEAD -',
  '    DETACHED WORLD-SPACE GRID ON THE PILLAR CONTRACT - GATHER MOTES CONTRACT ON THE TIP - ASSERTED FALLING MEAN RADIUS.',
  'DRAGONFALL - DARKEN FROM TICK ' + DARKEN_START + ' - FLASH AT ' + FLASH_START + ' FOR ' + FLASH_LEN + ' TICKS - CONTACT ' + CONTACT_TICK + ' - PEAK ' + PEAK_TICK + ' - DONE ' + GS_END + ' - THE LIFT RIDES THE DISSOLVE.',
  '    THE GREATSWORD IS THE WRATH BLADE AT WORLD SCALE - 41X84 - 82X168 PX ON SCREEN - A SWORD NEVER A BEAM - GUARD WIDER THAN',
  '    1.7X THE BLADE ROOT ASSERTED - THE DESCENT CARRIES THE SAME SWORD CELL FOR CELL - THE DISSOLVE BURNS FROM THE BURIED END UP.',
  'THE SCREEN EVENT - DIMMED ENVIRONMENT VALUES ASSERTED DARKER PER CHANNEL + STEPPED CORNER DIAGONALS - NEVER FLAT BARS - THE',
  '    FIGHTERS ARE STAMPED AFTER THE DARKENING AND ALWAYS READ - THE FLASH IS 6 TICKS AND WB2 IS ALREADY HOLLOW - ASSERTED.',
  'MIRROR STAYS PURE - WHITE DISC IN GOLD CORONA - TRUE CIRCLES - NORTH RAY LONGEST - MOTES RISE - NEVER BOLTS - NEVER ASH -',
  '    NO RED - NO VOID - THE BOSS RED ECLIPSE LANGUAGE APPEARS NOWHERE IN THESE GRIDS.',
  'INTEGRATION REALITY - THE STATE IS RENDER-ONLY DRESSING ON EXISTING SEAMS - THE 3-HIT CHAIN NEEDS ITS OWN HIT TABLE OR A',
  '    TRIMMED COMBO FSM - THE CHARGE NEEDS A 90-TICK CHANNEL STATE - THE GREATSWORD AND SIGIL EXTEND THE WORLD-SPACE EFFECT',
  '    SEAM THE LIGHT-WAVE PROJECTILES ALREADY USE - THE DARKEN NEEDS A RENDER-ONLY OVERLAY PASS. ALL OF THAT IS A LATER',
  '    GAMEPLAY STAGE - SPECCED ON ITS OWN TERMS - NEVER SMUGGLED IN BEHIND AN ART SWAP.',
  'STAGE 8C-1 IS VISUAL DESIGN ONLY - SRC IS UNTOUCHED - NO HITBOX - NO TIMING - NO AI - NO BALANCE - NOTHING WIRED',
].forEach(ln => { text(ln, 3, Y); Y += 6; });

if (Y > SH - 4) throw new Error('layout overflow: ' + Y);
if (vErr) { console.error(vErr + ' validation failures'); process.exit(1); }

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
fs.writeFileSync(__dirname+'/dragon_wrath_combo_b_v1.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---------- literal dump ----------
let js = '// === HERO DRAGON WRATH + COMBO B "DRAGONS REND" literals (see dragon_wrath_combo_b_spec.md) ===\n';
js += '// STAGE 8C-1 CONCEPT — nothing wired into src/.\n';
js += '// DRAGON WRATH is a NAMED REUSABLE Hero power state (Hero Light Eclipse family).\n';
js += '// Body clips are 44x34 (hero base at 7,10; feet row 33) — the SAME canvas as the\n';
js += '// approved 8B-1 / 8C-0 combos, so the proven runtime path serves them.\n';
js += '// Keys = HERO keys + the six LIGHT keys (W #fffdf4 / I #f2e6bf / y #f2c94e /\n';
js += '// o #e0a93c / G #c9962e / u #8a6420).\n';
js += '// wrathSigil / wrathBurst / lightGreatsword are PURE LIGHT world-space grids —\n';
js += '// they do NOT ride the sprite anchor (the 8C-0 pillar contract). Anchors:\n';
js += '// sigil hangs over the raised tip; burst fires at the sky point; the\n';
js += '// greatsword TIP row (76) plants on the floor line.\n';
js += '// wrathBladeStudy is documentation: the weapon states isolated at 21x13.\n';
const CLIP_NAMES = ['dragonWrathRise', 'heroComboB1', 'heroComboB2', 'heroComboB3', 'wrathCharge', 'wrathRelease'];
SECTIONS.forEach((sec, si) => {
  js += `  ${CLIP_NAMES[si]}: [\n`;
  sec.frames.forEach(fr => {
    js += `    // ${fr.tag} — ${fr.phase} — ${fr.where}\n`;
    js += '    [' + stringify(fr.grid).map(r => JSON.stringify(r)).join(', ') + '],\n';
  });
  js += '  ],\n';
});
[['wrathSigil', SIGIL], ['wrathBurst', BURST], ['lightGreatsword', GREATSWORD], ['wrathBladeStudy', BLADESTUDY]].forEach(([n, set]) => {
  js += `  ${n}: [\n`;
  set.forEach(g => { js += '    [' + stringify(g).map(r => JSON.stringify(r)).join(', ') + '],\n'; });
  js += '  ],\n';
});
fs.writeFileSync(__dirname + '/dragon_wrath_combo_b_literal.txt', js);

// round-trip proof — the literal must re-parse to exactly what was authored
{
  const src = fs.readFileSync(__dirname + '/dragon_wrath_combo_b_literal.txt', 'utf8').replace(/\r/g, '');
  const reparse = n => {
    const m = src.match(new RegExp('  ' + n + ': \\[([\\s\\S]*?)\\n  \\],'));
    if (!m) throw new Error('clip not found on re-parse: ' + n);
    return [...m[1].matchAll(/\[((?:"[^"]*"(?:, )?)+)\]/g)].map(fm => fm[1].split(', ').map(s => JSON.parse(s)));
  };
  SECTIONS.forEach((sec, si) => {
    if (JSON.stringify(reparse(CLIP_NAMES[si])) !== JSON.stringify(sec.frames.map(fr => stringify(fr.grid))))
      throw new Error('round-trip fail: ' + CLIP_NAMES[si]);
  });
  [['wrathSigil', SIGIL], ['wrathBurst', BURST], ['lightGreatsword', GREATSWORD], ['wrathBladeStudy', BLADESTUDY]].forEach(([n, set]) => {
    if (JSON.stringify(reparse(n)) !== JSON.stringify(set.map(stringify))) throw new Error('round-trip fail: ' + n);
  });
}

console.log('wrote dragon_wrath_combo_b_v1.png', IW + 'x' + IH,
  '| clips', SECTIONS.map(s => s.frames.length).join('+'), '= 24 body frames + 18 detached grids',
  '\n  clock: total', TOTAL, '| charge', CHARGE_TICKS, '| darken', DARKEN_START, '| flash', FLASH_START, '+' + FLASH_LEN,
  '| contact', CONTACT_TICK, '| peak', PEAK_TICK,
  '\n  layout end Y', Y, '/', SH);
