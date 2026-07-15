// Boss AFK INTIMIDATION / Sword-Planted Idle — stage 7A-0 concept + animation sheet.
// Derives the whole state from the APPROVED boss matrix (boss_matrix.txt) with the
// house pose pipeline (eraseBlade + redrawn arm/sword, moveUpper/bobUpper, emberUp),
// plus vfx_gen.js-style painted cells for the barrier / aura / crack / vignette.
// Emits: afk_v1.png (sheet) + afk_literal.txt (drop-in clip matrices).
//
// Sheet map (top -> bottom):
//   band A (checker bg = REAL drop-in matrices, 46x48):
//     row 1  afkSnap   (3) — dominance snap: straighten+flare / blade flipped point-down / release
//     row 2  afkPlant  (3) — descent / IMPACT overshoot / settled (== idle f0)
//     row 3  afkIdle   (2) — planted idle, palette-only heartbeat (geometry locked)
//     row 4  afkExit   (2) — re-grip / blade pulled free (then FSM returns to idle)
//     row 5  concepts  — denial tint (hit during snap) x2 + airborne force-down cell
//   band A right column: long-sword vs old-sword size study / plant-contact crack x2 /
//     hero hesitation arc / hero brace clip (2, REAL 30x24 matrices)
//   band B (solid bg = VFX cells 40x40): barrier lifecycle x4 + wall-bounce story x3 + vignette step demo
//   band C: intimidation aura loop x3 (66x58, real planted boss inside)
//   band D: cinematic tableau 314x74 — boss planted + aura + wave + braced hero + wall + vignette
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
// ember-void VFX ramp (sampler) + night-hall tones
const E0 = '#6e0f1c', E1 = '#a8182a', E2 = '#e0263a', E3 = '#ff5a4a';
const SMK = '#1a1420', UMB = '#14101c', DK = '#1c1d28';
const ST0 = '#2e3444', ST1 = '#7c88a0', ICY = '#7fd4ff', ICY2 = '#b8ecff';
const NW0 = '#191622', NW1 = '#1d1a28', NF0 = '#221c2b', NF1 = '#3a3346';
const WINL = '#6c82a8', CRK = '#0c0a12', GDK = '#3a1014';

// ---------- load approved matrices ----------
const bossBase = fs.readFileSync(__dirname + '/boss_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
const heroBase = fs.readFileSync(__dirname + '/hero_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
const BH = bossBase.length, BW = bossBase[0].length;   // 48 x 46
const HH = heroBase.length, HW = heroBase[0].length;   // 24 x 30

// ---------- house matrix helpers (boss_anim_gen.js idiom) ----------
const clone = g => g.map(r => r.slice());
const blankB = () => Array.from({ length: BH }, () => Array(BW).fill('.'));
const stringify = g => g.map(r => r.join(''));
const setB = (g, x, y, k) => { if (x >= 0 && x < BW && y >= 0 && y < BH) g[y][x] = k; };
function cut(g, x0, y0, x1, y1, W, H) {
  const c = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (y < 0 || y >= H || x < 0 || x >= W) continue;
    if (g[y][x] !== '.') { c.push([x, y, g[y][x]]); g[y][x] = '.'; }
  }
  return c;
}
function paste(g, cells, dx, dy, W, H) {
  for (const [x, y, k] of cells) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < W && ny >= 0 && ny < H) g[ny][nx] = k; }
}
function moveUpperB(g, hipRow, dx, dy) {
  if (dx === 0 && dy === 0) return g;
  const out = blankB();
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
    if (g[y][x] === '.') continue;
    if (y <= hipRow) { const ny = y + dy, nx = x + dx; if (ny >= 0 && ny < BH && nx >= 0 && nx < BW) out[ny][nx] = g[y][x]; }
    else out[y][x] = g[y][x];
  }
  return out;
}
function lineB(g, x0, y0, x1, y1, k, thick) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { setB(g, x, y, k); if (thick) setB(g, x, y + 1, k);
    if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
const emberUp = g => g.map(r => r.map(k => (k === 'a' ? 'b' : k === 'b' ? 'c' : k === 'c' ? 'd' : k)));
// Erase the idle blade + fist (boss_anim_gen idiom) + the idle bent lead forearm,
// so the planted arm/sword can be re-drawn clean.
function eraseBladeB(g) {
  for (let y = 0; y <= 20; y++) for (let x = 31; x <= 45; x++) g[y][x] = '.';
  for (let y = 13; y <= 20; y++) for (let x = 27; x <= 33; x++) g[y][x] = '.';
  for (let y = 17; y <= 22; y++) for (let x = 24; x <= 29; x++) g[y][x] = '.';
  g[21][31] = '.'; g[21][30] = '.';                       // idle pommel remnant
}

// ---------- THE LONGER SWORD (locked planted stack) ----------
// One parametric drawer so every frame is byte-consistent. `gemRow` = pommel-bead row.
// Stack: bead / pommel / grip(5) / MAIN double-crossguard w/ down-swept horns + heart
// gem / short tier-2 cross / 27px molten blade (b->c->d) w/ dark+lit flanks / hot tip.
// Total bead->tip = 36 rows (~75% of the boss) vs the idle sword's ~23 -> +55%.
function plantedSword(g, gemRow, opts = {}) {
  const { handOn = 'pommel', flash = false, bite = false } = opts;
  const X = 31, r = gemRow;
  setB(g, X, r, flash ? 'c' : 'b');                                     // pommel ember bead
  setB(g, X - 1, r + 1, '2'); setB(g, X, r + 1, '4'); setB(g, X + 1, r + 1, '2'); // pommel
  for (let y = r + 2; y <= r + 6; y++) setB(g, X, y, '1');              // grip
  setB(g, X, r + 5, 'a');                                               // grip wrap node
  // MAIN cross (bar + bright tips + down-swept horns + heart gem)
  const cy = r + 7;
  for (let x = X - 3; x <= X + 3; x++) setB(g, x, cy, '3');
  setB(g, X - 4, cy, '4'); setB(g, X + 4, cy, '4');
  setB(g, X - 4, cy + 1, '3'); setB(g, X - 5, cy + 2, '2');
  setB(g, X + 4, cy + 1, '3'); setB(g, X + 5, cy + 2, '2');
  setB(g, X, cy, flash ? 'd' : 'c');                                    // guard heart gem
  // tier-2 short cross hugging the blade root
  setB(g, X - 2, cy + 2, '2'); setB(g, X - 1, cy + 2, '3'); setB(g, X + 1, cy + 2, '3'); setB(g, X + 2, cy + 2, '2');
  // blade: 27 rows, molten core ramp + dark left flank / lit right flank, taper at tip
  const b0 = cy + 2, tip = b0 + 26;
  for (let y = b0; y <= tip && y < BH; y++) {
    const t = (y - b0) / 26;
    setB(g, X, y, t < 0.33 ? 'b' : t < 0.66 ? 'c' : 'd');
    if (y > b0 && y <= tip - 3) setB(g, X - 1, y, '1');
    if (y > b0 && y <= tip - 6) setB(g, X + 1, y, '3');
    else if (y > b0 && y <= tip - 3) setB(g, X + 1, y, '1');
  }
  if (tip < BH) setB(g, X, tip, 'd');
  if (bite && tip + 1 < BH) {                                           // tip buried in the floor
    setB(g, X, tip + 1, 'c'); setB(g, X - 1, tip + 1, 'a'); setB(g, X + 1, tip + 1, 'a');
  }
  // hands: stacked two-tone gauntlets (near pair lit, far knuckles dark)
  const hy = handOn === 'pommel' ? r + 2 : r + 4;                       // pommel-rest vs drive-grip
  setB(g, X - 1, hy, '3'); setB(g, X, hy, '4'); setB(g, X + 1, hy, '3');
  setB(g, X - 1, hy + 1, '1'); setB(g, X, hy + 1, '3'); setB(g, X + 1, hy + 1, '1');
  return hy;
}
// arm reaching from the lead shoulder to the hand rows (regal body: shoulder at x25).
function reachArm(g, hy) { lineB(g, 25, 17, 29, hy + 1, '2', true); setB(g, 24, 17, '2'); }

// ---------- BOSS CLIPS ----------
// upright regal body: battle lean pulled back 1px.
const regal = () => moveUpperB(clone(bossBase), 28, -1, 0);

// afkSnap — 3: (0) the stop: straighten + whole-figure corruption flare, idle blade still
// raised; (1) the flip: blade re-gripped POINT-DOWN, held high; (2) the release: chest
// out 1px, full flare — the pressure barrier fires on this frame.
function snapFrames() {
  const s0 = emberUp(regal());
  const s1 = regal(); eraseBladeB(s1); reachArm(s1, plantedSword(s1, 5, { handOn: 'grip' }));
  let s2 = regal(); eraseBladeB(s2); reachArm(s2, plantedSword(s2, 5, { handOn: 'grip', flash: true }));
  s2 = emberUp(moveUpperB(s2, 28, 0, -1));
  return [s0, s1, s2].map(stringify);
}
// afkPlant — 3: (0) descent begins; (1) IMPACT — 4px drive, tip bites the floor, body
// weight drops 1px, flash; (2) settled — hands slide up onto the pommel, body composed.
// Frame 2 IS afkIdle frame 0, so the handoff can never pop.
function plantFrames() {
  const p0 = regal(); eraseBladeB(p0); reachArm(p0, plantedSword(p0, 7, { handOn: 'grip' }));
  let p1 = regal(); eraseBladeB(p1);
  p1 = moveUpperB(p1, 28, 0, 1);
  reachArm(p1, plantedSword(p1, 11, { handOn: 'grip', flash: true, bite: true }));
  const p2 = plantedIdleBase();
  return [p0, p1, p2].map(stringify);
}
// the LOCKED planted-idle geometry (base frame of the state).
function plantedIdleBase() {
  const g = regal(); eraseBladeB(g);
  reachArm(g, plantedSword(g, 11, { handOn: 'pommel', bite: true }));
  return g;
}
// afkIdle — 2: geometry-locked, palette-only heartbeat (house idle idiom).
function idleFrames() { const g = plantedIdleBase(); return [g, emberUp(g)].map(stringify); }
// afkExit — 2: (0) re-grip down onto the grip, slight forward intent; (1) blade pulled
// free (tip clears the floor). FSM then returns to the normal idle clip.
function exitFrames() {
  const e0 = plantedIdleBase();
  // hands drop from pommel-rest to drive-grip (re-grip read)
  for (let y = 13; y <= 14; y++) for (let x = 30; x <= 32; x++) e0[y][x] = '.';
  setB(e0, 31, 13, '1'); setB(e0, 31, 14, '1');                    // grip re-exposed
  setB(e0, 30, 15, '3'); setB(e0, 31, 15, '4'); setB(e0, 32, 15, '3');
  setB(e0, 30, 16, '1'); setB(e0, 31, 16, '3'); setB(e0, 32, 16, '1');
  const e1 = regal(); eraseBladeB(e1); reachArm(e1, plantedSword(e1, 7, { handOn: 'grip' }));
  return [stringify(e0), stringify(e1)];
}
// airborne force-down concept body: fall pose + point-down long sword (concept cell only).
function airborneBody() {
  const a = regal();
  paste(a, cut(a, 11, 40, 16, 47, BW, BH), -1, 0, BW, BH);
  paste(a, cut(a, 17, 40, 25, 47, BW, BH), 1, 0, BW, BH);
  eraseBladeB(a); reachArm(a, plantedSword(a, 5, { handOn: 'grip' }));
  return a;
}

// ---------- HERO brace clip (30x24) ----------
const heroClone = () => heroBase.map(r => r.slice());
function heroEraseBlade(g) { for (let y = 10; y <= 18; y++) for (let x = 18; x <= 29; x++) g[y][x] = '.'; }
function heroSword(g, hx, hy, angleDeg, reach, k0) {
  lineB2(g, 14, 12, hx, hy, '2', true);
  hset(g, hx, hy, '3'); hset(g, hx - 1, hy, '3'); hset(g, hx, hy + 1, '1');
  const a = angleDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx, R = Math.round;
  for (let s = -1; s <= 1; s++) hset(g, R(hx + dx + px * s), R(hy + dy + py * s), s === 0 ? 'l' : '1');
  for (let i = 2; i <= reach; i++) {
    const bx = R(hx + dx * i), by = R(hy + dy * i);
    hset(g, bx, by, '4'); hset(g, R(bx + px), R(by + py), 'l'); hset(g, R(bx - px), R(by - py), '3');
  }
  hset(g, R(hx + dx * (reach + 1)), R(hy + dy * (reach + 1)), k0 || 'L');
}
const hset = (g, x, y, k) => { if (x >= 0 && x < HW && y >= 0 && y < HH) g[y][x] = k; };
function lineB2(g, x0, y0, x1, y1, k, thick) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { hset(g, x, y, k); if (thick) hset(g, x, y + 1, k);
    if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
const heroBlueUp = g => g.map(r => r.map(k => (k === 'l' ? 'L' : k)));
function capeFlow(g, dx, dy) { paste(g, cut(g, 3, 10, 9, 19, HW, HH), dx, dy, HW, HH); return g; }
// brace: head tucked 1px, cape pressed back, blade pulled into a short low guard.
function braceFrames() {
  const mk = (capeDx, blue) => {
    let g = heroClone();
    capeFlow(g, capeDx, 0);
    paste(g, cut(g, 8, 0, 18, 5, HW, HH), -1, 1, HW, HH);       // head tucked + pulled back
    heroEraseBlade(g);
    heroSword(g, 16, 13, 18, 8);                                // lowered defensive guard
    return blue ? heroBlueUp(g) : g;
  };
  return [mk(-1, false), mk(-2, true)].map(stringify);
}

// ================= SHEET CANVAS =================
const SW = 322, SH = 448, SCALE = 4;
const G = Array.from({ length: SH }, () => Array(SW).fill(null));   // null = checker bg
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
// stamp a char-matrix through a palette; mir flips horizontally; tintFn overrides colors.
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

// ---------- build clips ----------
const CLIPS = {
  afkSnap: snapFrames(),
  afkPlant: plantFrames(),
  afkIdle: idleFrames(),
  afkExit: exitFrames(),
};
const HERO_CLIPS = { brace: braceFrames() };

// ---------- band A: matrix clips on checker ----------
const A_X = 3, CELL = 48, ROWH = 50;
Object.keys(CLIPS).forEach((n, r) => {
  CLIPS[n].forEach((f, c) => stampM(f.map(s => [...s]), BOSS_PAL, A_X + c * CELL, 3 + r * ROWH));
});
// row 5 — concept cells: denial tint x2 + airborne force-down
(() => {
  const y = 3 + 4 * ROWH;
  const s1 = CLIPS.afkSnap[1].map(s => [...s]);
  // denial A: the hit is swallowed — full umbral silhouette, ember rim ONLY on the
  // outer left/right contour (per-row extremes), so it reads as a clean eclipse.
  const rim = s1.map(row => {
    let lo = -1, hi = -1;
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') { if (lo < 0) lo = x; hi = x; }
    return [lo, hi];
  });
  stampM(s1, BOSS_PAL, A_X, y, { tintFn: (k, x, yy) =>
    (x === rim[yy][0] || x === rim[yy][1]) ? E2 : UMB });
  // denial B: recovery flicker — normal body, shed ember shards falling off
  stampM(s1, BOSS_PAL, A_X + CELL, y);
  [[8, 20], [12, 30], [40, 26], [38, 38]].forEach(([x, yy]) => paint(A_X + CELL + x, y + yy, 1, 2, E0, 1));
  // airborne force-down: fall body + point-down sword + pressure column slamming him down
  const air = airborneBody();
  stampM(air, BOSS_PAL, A_X + CELL * 2, y);
  const ax = A_X + CELL * 2;
  [[14, 44], [22, 46], [18, 42]].forEach(([x, yy]) => paint(ax + x, y + yy + 4, 1, 3, '#060409', 1));
  [[16, 43], [24, 45]].forEach(([x, yy]) => { paint(ax + x, y + yy + 6, 1, 1, E1, 1); });
  // down chevrons under the feet
  [[19, 46], [19, 49]].forEach(([x, yy]) => {
    paint(ax + x - 2, y + yy, 2, 1, E1, 1); paint(ax + x + 2, y + yy, 2, 1, E1, 1);
    paint(ax + x - 1, y + yy + 1, 4, 1, E2, 1);
  });
  // speed ticks above the head (falling FAST, by his own will)
  [[16, -2], [26, -3], [21, -5]].forEach(([x, yy]) => paint(ax + x, y + yy + 4, 1, 2, DK, 1));
})();

// ---------- band A right column ----------
const R_X = 160;
// (1) sword size study: OLD idle sword (extracted) vs NEW planted sword, same scale.
(() => {
  cellFrame(R_X, 4, 44, 56, '#100d1c');
  // old: copy the idle blade/guard region (rows 0-15, x28-41) from the approved matrix,
  // lowest pixel resting on the shared floor line
  const old = blankB();
  for (let y = 0; y <= 15; y++) for (let x = 28; x <= 41; x++) old[y][x] = bossBase[y][x];
  stampM(old, BOSS_PAL, R_X - 24, 40);
  // new: standalone planted stack, bead at top, tip on the same floor line
  const solo = blankB();
  plantedSword(solo, 12, { handOn: 'pommel', bite: true });
  stampM(solo, BOSS_PAL, R_X - 2, 8);
  paint(R_X + 2, 4 + 52, 40, 1, NF1, 1);                       // shared floor line
})();
// (2) plant-contact crack: impact wink -> settled crack + ember seep
(() => {
  const cy = 66;
  cellFrame(R_X, cy, 26, 20); cellFrame(R_X + 30, cy, 26, 20);
  const fl = (ox) => { paint(ox, cy + 14, 26, 1, NF1, 1); paint(ox, cy + 15, 26, 5, NF0, 1); };
  fl(R_X); fl(R_X + 30);
  // C0 impact wink: hot cross + diagonal sparks + first crack dashes
  const c0x = R_X + 13;
  paint(c0x, cy + 11, 1, 3, E3, 1); paint(c0x - 1, cy + 12, 3, 1, E3, 1);
  [[-3, -1], [3, -1], [-2, 1], [2, 1]].forEach(([dx, dy]) => paint(c0x + dx, cy + 12 + dy, 1, 1, E2, 1));
  paint(c0x - 5, cy + 15, 2, 1, CRK, 1); paint(c0x + 4, cy + 15, 2, 1, CRK, 1);
  // C1 settled: jagged cracks + ember seep + 2 slow motes
  const c1x = R_X + 30 + 13;
  paint(c1x, cy + 11, 1, 4, E3, 1);                            // buried tip stub
  const crack = (pts, k) => pts.forEach(([dx, dy, w]) => paint(c1x + dx, cy + 15 + dy, w || 1, 1, k, 1));
  crack([[-2, 0, 2], [-4, 1, 2], [-7, 2, 3]], CRK); crack([[1, 0, 2], [3, 1, 3], [6, 2, 2]], CRK);
  crack([[-3, 1], [4, 0]], GDK);
  crack([[-2, 1], [2, 1]], E0); crack([[-5, 2], [5, 2]], E0); paint(c1x - 1, cy + 15, 1, 1, E1, 1);
  paint(c1x + 1, cy + 16, 1, 1, E0, 1);
  paint(c1x - 4, cy + 8, 1, 1, E0, 1); paint(c1x + 5, cy + 6, 1, 1, E1, 1);   // rising motes
})();
// (3) hero hesitation arc — the cold line he will not cross (steel + one icy tick)
(() => {
  const cy = 92;
  cellFrame(R_X, cy, 56, 14);
  paint(R_X, cy + 10, 56, 1, NF1, 1); paint(R_X, cy + 11, 56, 3, NF0, 1);
  [[6, 0], [14, -1], [22, -1], [30, -1], [38, 0]].forEach(([dx, dy], i) =>
    paint(R_X + 6 + dx, cy + 8 + dy, 3, 1, i === 2 ? ICY : ST0, 1));
  paint(R_X + 29, cy + 6, 1, 1, ICY2, 1);                      // one held-breath glint
})();
// (4) hero brace clip (REAL matrices)
HERO_CLIPS.brace.forEach((f, c) => stampM(f.map(s => [...s]), HERO_PAL, R_X + c * 34, 112));

// ---------- band B: barrier lifecycle + wall bounce + vignette demo ----------
const B_Y = 258;
// pressure-wave painter (right-traveling). ph 0=flare 1=near 2=far 3=dissipate.
function paintWave(ox, oy, ph, hgt = 32) {
  const foot = oy + hgt + 2;
  if (ph === 0) {                                             // chest-point pressure snap
    const cx = ox, cyy = oy + Math.floor(hgt / 2);
    paint(cx - 1, cyy - 1, 2, 2, E3, 1);                      // hot core
    // umbral diamond ring pressed outward
    [[-4, 0], [4, 0], [0, -4], [0, 4], [-3, -2], [3, -2], [-3, 2], [3, 2]].forEach(([dx, dy]) =>
      paint(cx + dx, cyy + dy, 1, 1, '#060409', 1));
    // radial pressure ticks (pointing AWAY — this is a push, not a gather)
    [[-8, 0, 3, 1], [6, 0, 3, 1], [0, -8, 1, 3], [0, 6, 1, 3]].forEach(([dx, dy, w, h]) =>
      paint(cx + dx, cyy + dy, w, h, E1, 1));
    [[-7, -6, 2, 1], [6, -6, 2, 1], [-7, 6, 2, 1], [6, 6, 2, 1]].forEach(([dx, dy, w, h]) =>
      paint(cx + dx, cyy + dy, w, h, E0, 1));
    [[-6, -3], [6, -3], [-6, 3], [6, 3]].forEach(([dx, dy]) => paint(cx + dx, cyy + dy, 1, 1, SMK, 1));
    // first hint of the wave wall detaching
    [[-11, -3, 1, 2], [-11, 2, 1, 2], [10, -3, 1, 2], [10, 2, 1, 2]].forEach(([dx, dy, w, h]) =>
      paint(cx + dx, cyy + dy, w, h, E0, 1));
    return;
  }
  if (ph === 3) {                                             // dissipate: vertical shard remnants
    [[0, 6, 4], [3, 16, 5], [-2, 24, 3], [2, 30, 2]].forEach(([dx, dy, ln]) =>
      paint(ox + dx, oy + dy, 1, ln, dy % 2 ? SMK : E0, 1));
    [[-4, 10], [5, 20], [-3, 28], [6, 8]].forEach(([dx, dy]) => paint(ox + dx, oy + dy, 1, 1, E0, 1));
    return;
  }
  const wide = ph === 2;
  for (let i = 0; i <= hgt; i++) {
    const t = i / hgt, s = Math.sin(t * Math.PI);
    const xo = ox + Math.round((wide ? 4 : 6) * s);
    const y = oy + i;
    // leading edge
    paint(xo, y, 1, 1, wide ? E1 : E2, 1);
    // umbral body with dither gaps (translucent void pressure)
    for (let b = 1; b <= (wide ? 2 : 3); b++) if ((xo - b + y) % 3 !== 0) paint(xo - b, y, 1, 1, UMB, 1);
    // trailing smoke dashes
    if (y % 4 === 0) paint(xo - (wide ? 5 : 6), y, 2, 1, SMK, 1);
  }
  // crest sparks on the leading edge + pressure teeth
  [[0.25], [0.5], [0.75]].forEach(([t]) => {
    const y = oy + Math.round(hgt * t), xo = ox + Math.round((wide ? 4 : 6) * Math.sin(t * Math.PI));
    paint(xo + 1, y, 1, 1, E3, 1);
  });
  [0.18, 0.38, 0.62, 0.82].forEach(t => {
    const y = oy + Math.round(hgt * t), xo = ox + Math.round((wide ? 4 : 6) * Math.sin(t * Math.PI));
    paint(xo + 1, y - 1, wide ? 1 : 2, 1, E1, 1);
    if (!wide) paint(xo + 3, y - 1, 1, 1, E0, 1);
  });
  // ground skim: the wave hugs the floor
  paint(ox - 8, foot, 12, 1, UMB, 1);
  paint(ox + 2, foot, 3, 1, E0, 1); paint(ox + 6, foot - 1, 2, 1, E1, 1);
}
(() => {
  for (let c = 0; c < 4; c++) cellFrame(3 + c * 44, B_Y, 40, 40);
  paintWave(3 + 20, B_Y + 3, 0);                              // flare
  paintWave(3 + 44 + 16, B_Y + 2, 1);                         // near wave
  paintWave(3 + 88 + 18, B_Y + 2, 2);                         // far/thin wave
  paintWave(3 + 132 + 18, B_Y + 2, 3);                        // dissipate
  for (let c = 0; c < 4; c++) { const x = 3 + c * 44; paint(x, B_Y + 37, 40, 1, NF1, 1); paint(x, B_Y + 38, 40, 2, NF0, 1); }
})();
// wall-bounce storyboard x3
(() => {
  const ox0 = 3 + 176 + 4;
  for (let c = 0; c < 3; c++) cellFrame(ox0 + c * 44, B_Y, 40, 40);
  const drawWallCell = (ox, stage) => {
    paint(ox, B_Y + 34, 40, 1, NF1, 1); paint(ox, B_Y + 35, 40, 4, NF0, 1);
    // wall column (night stone)
    paint(ox + 33, B_Y, 7, 34, '#241e30', 1);
    paint(ox + 33, B_Y, 1, 34, '#332a44', 1);
    for (let y = 4; y < 34; y += 6) paint(ox + 35, B_Y + y, 3, 1, '#1d1a28', 1);
    const hero = braceMini();
    if (stage === 0) {          // wave arrives, hero shoved toward the wall
      stampM(hero, HERO_PAL, ox + 12, B_Y + 11);
      paintWave(ox + 6, B_Y + 4, 2, 26);
      [[26, 18], [27, 22], [26, 26]].forEach(([x, y]) => paint(ox + x + 2, B_Y + y, 2, 1, UMB, 1));
    } else if (stage === 1) {   // wall impact: cold flash line + dark chevrons, NO red on the hero
      stampM(hero, HERO_PAL, ox + 17, B_Y + 12);
      paint(ox + 32, B_Y + 8, 1, 24, ST1, 1);                 // steel impact rim on the wall
      [[28, 10], [27, 17], [28, 25]].forEach(([x, y]) => {
        paint(ox + x - 2, B_Y + y, 2, 1, UMB, 1); paint(ox + x - 4, B_Y + y + 1, 2, 1, SMK, 1);
      });
      paint(ox + 28, B_Y + 31, 3, 2, '#4a3f33', 1); paint(ox + 26, B_Y + 30, 2, 2, '#6b5c48', 1); // dust
    } else {                    // ricochet away: one steel afterimage + streaks + icy ticks
      stampM(hero, HERO_PAL, ox + 15, B_Y + 10, { mir: true, tintFn: (k, x, yy) => ((x + yy) % 3 === 0 ? null : '#242d3d') });
      stampM(hero, HERO_PAL, ox + 5, B_Y + 9, { mir: true });
      paint(ox + 26, B_Y + 13, 7, 1, ST0, 1); paint(ox + 28, B_Y + 20, 6, 1, ST0, 1);   // steel streaks off the wall
      [[28, 14], [25, 19], [28, 24]].forEach(([x, y]) => paint(ox + x, B_Y + y, 2, 1, ICY, 1));
      paint(ox + 30, B_Y + 31, 3, 2, '#4a3f33', 1);
    }
  };
  drawWallCell(ox0, 0); drawWallCell(ox0 + 44, 1); drawWallCell(ox0 + 88, 2);
})();
// mini hero for VFX cells: braced pose scaled 1:1 but cropped to 20x22 silhouette zone
function braceMini() {
  const f = HERO_CLIPS.brace[0].map(s => [...s]);
  return f.map(r => r.slice(4, 26));
}
// vignette step demo (quantized corner pressure, boss-readability preserved)
(() => {
  const ox = R_X, oy = 142;
  cellFrame(ox, oy, 40, 40, '#241e30');
  paint(ox, oy + 30, 40, 1, NF1, 1); paint(ox, oy + 31, 40, 9, NF0, 1);
  // room hints so it reads as a screen mock (window slit + stone dashes)
  paint(ox + 17, oy + 6, 4, 14, '#141826', 1); paint(ox + 18, oy + 8, 2, 10, '#1b2438', 1);
  paint(ox + 18, oy + 9, 1, 4, WINL, 0.5);
  [[4, 12], [28, 9], [8, 22], [30, 20]].forEach(([x, y]) => paint(ox + x, oy + y, 5, 1, NW1, 1));
  // 3 quantized steps of corner darkness + outer ember tint — NO smooth gradient
  const steps = [[0, 12, 0.38], [4, 8, 0.22], [10, 5, 0.10]];
  for (const [inset, w, a] of steps) {
    paint(ox + inset, oy + inset, 40 - 2 * inset, w, '#0a0410', a);
    paint(ox + inset, oy + 40 - inset - w, 40 - 2 * inset, w, '#0a0410', a);
    paint(ox + inset, oy + inset, w, 40 - 2 * inset, '#0a0410', a);
    paint(ox + 40 - inset - w, oy + inset, w, 40 - 2 * inset, '#0a0410', a);
  }
  paint(ox, oy, 40, 2, E0, 0.10); paint(ox, oy + 38, 40, 2, E0, 0.10);
  paint(ox, oy, 2, 40, E0, 0.10); paint(ox + 38, oy, 2, 40, E0, 0.10);
})();

// ---------- band C: intimidation aura loop (real planted boss inside) ----------
const C_Y = 304;
// aura painter — reused verbatim by the tableau. Anchors: boss origin (bx,by = matrix
// 0,0), floor row = by+47, plant column = bx+31, chest core = (bx+19, by+15).
function paintAura(bx, by, ph) {
  const plantX = bx + 31, floorY = by + 47, coreX = bx + 19, coreY = by + 15;
  // 0) spreading floor shadow from the plant point (broken ember rim)
  const spread = 15 + ph * 3;
  for (let dx = -spread; dx <= spread; dx++) {
    if ((dx + ph) % 3 === 0) continue;
    paint(plantX + dx, floorY + 1, 1, 1, UMB, 0.85);
    if (Math.abs(dx) > spread - 6 && (dx % 2 === 0)) paint(plantX + dx, floorY + 2, 1, 1, UMB, 0.5);
  }
  paint(plantX - spread, floorY, 2, 1, E0, 1); paint(plantX + spread - 1, floorY, 2, 1, E0, 1);
  [[-8, 2], [7, 2], [-13, 1], [12, 1]].forEach(([dx, dy]) => paint(plantX + dx, floorY + dy, 1, 1, E0, 0.8));
  // 1) hanging pressure shards — near-black void slivers with a dim ember cap and a
  //    1px ember drip-tip; they SINK 1px/frame (phase-offset), never orbit, never rise
  const shards = [
    [bx - 6, by + 12, 4, 1], [bx + 0, by + 4, 5, 2], [bx + 10, by - 3, 4, 1], [bx + 22, by - 5, 6, 2],
    [bx + 33, by - 2, 4, 1], [bx + 42, by + 5, 5, 2], [bx + 48, by + 14, 3, 1],
  ];
  shards.forEach(([sx, sy, ln, wd], i) => {
    const sink = (ph + i) % 3;
    paint(sx, sy + sink, wd, ln, '#060409', 1);
    paint(sx, sy + sink, wd, 1, (i % 3 === 0 && sink === 0) ? E1 : E0, 1);  // cap (occasional wink)
    if (i % 3 === 1) paint(sx, sy + sink + ln, 1, 1, E0, 0.7);              // sparse drip tips
  });
  // 2) static pressure marks close to the body (unnatural stillness)
  paint(bx + 6, by + 20, 1, 6, '#060409', 1); paint(bx + 6, by + 26, 1, 1, E0, 0.8);
  paint(bx + 40, by + 18, 1, 6, '#060409', 1); paint(bx + 40, by + 24, 1, 1, E0, 0.8);
  // 3) heartbeat ring from the chest core: rest / tight E1 ring / wide fading E0 ring
  if (ph === 1) {
    [[-5, 0, 1, 2], [5, 0, 1, 2], [0, -4, 2, 1], [0, 4, 2, 1], [-4, -3, 1, 1], [4, 3, 1, 1],
     [4, -3, 1, 1], [-4, 3, 1, 1]].forEach(([dx, dy, w, h]) =>
      paint(coreX + dx, coreY + dy, w, h, E1, 1));
  } else if (ph === 2) {
    [[-9, 0, 1, 2], [9, 0, 1, 2], [0, -7, 2, 1], [0, 7, 2, 1], [-7, -5, 1, 1], [7, 5, 1, 1],
     [-7, 5, 1, 1], [7, -5, 1, 1]].forEach(([dx, dy, w, h]) =>
      paint(coreX + dx, coreY + dy, w, h, E0, 0.85));
  }
  // 4) three slow rising ember motes (the only upward motion — sparse and calm)
  const motes = [[bx - 3, by + 30, E1], [bx + 45, by + 26, E0], [bx + 26, by - 8, E2]];
  motes.forEach(([mx, my, k], i) => paint(mx, my - ph * 2 - i, 1, 1, k, 1));
}
(() => {
  for (let c = 0; c < 3; c++) {
    const ox = 3 + c * 70, oy = C_Y;
    cellFrame(ox, oy, 66, 58);
    paint(ox, oy + 53, 66, 1, NF1, 1); paint(ox, oy + 54, 66, 4, NF0, 1);
    const bx = ox + 10, by = oy + 6;
    paintAura(bx, by, c);
    const frame = (c === 1 ? CLIPS.afkIdle[1] : CLIPS.afkIdle[0]).map(s => [...s]);
    stampM(frame, BOSS_PAL, bx, by);
  }
})();

// ---------- band D: cinematic tableau ----------
(() => {
  const ox = 3, oy = 368, w = 316, h = 76, floorY = oy + 58;
  cellFrame(ox, oy, w, h, NW0);
  // night wall with sparse stone hints + two cool window slits
  for (let y = 2; y < 56; y += 7) for (let x = (y % 14 === 2 ? 4 : 9); x < w - 2; x += 17)
    paint(ox + x, oy + y, 6, 1, NW1, 1);
  const slit = (sx) => {
    paint(ox + sx, oy + 6, 5, 26, '#141826', 1);
    paint(ox + sx + 1, oy + 8, 3, 22, '#1b2438', 1);
    paint(ox + sx + 2, oy + 10, 1, 5, WINL, 0.55); paint(ox + sx + 2, oy + 18, 1, 3, WINL, 0.35);
  };
  slit(34); slit(232);
  // floor
  paint(ox, floorY, w, 1, NF1, 1); paint(ox, floorY + 1, w, h - (floorY - oy) - 1, NF0, 1);
  paint(ox + 8, floorY + 1, 60, 1, '#6c5f4e', 0.25); paint(ox + 180, floorY + 1, 80, 1, '#6c5f4e', 0.18);
  // right-hand wall (the bounce wall)
  paint(ox + w - 12, oy, 12, floorY - oy, '#241e30', 1);
  paint(ox + w - 12, oy, 1, floorY - oy, '#332a44', 1);
  for (let y = 6; y < floorY - oy; y += 8) paint(ox + w - 8, oy + y, 5, 1, NW1, 1);
  // BOSS planted (heartbeat frame) + full aura + crack, feet on the floor line
  const bx = ox + 92, by = floorY - 47;
  paintAura(bx, by, 1);
  stampM(CLIPS.afkIdle[1].map(s => [...s]), BOSS_PAL, bx, by);
  // plant crack at the tip
  const px = bx + 31;
  paint(px - 3, floorY + 1, 2, 1, CRK, 1); paint(px + 2, floorY + 1, 3, 1, CRK, 1);
  paint(px - 5, floorY + 2, 2, 1, CRK, 1); paint(px + 4, floorY + 2, 2, 1, CRK, 1);
  paint(px - 2, floorY + 1, 1, 1, E0, 1); paint(px + 2, floorY + 2, 1, 1, E0, 1);
  // barrier wave mid-travel + smoke wake back toward the boss
  paintWave(ox + 196, by + 8, 1, 38);
  for (let x = bx + 52; x < ox + 190; x += 9) paint(x, floorY - 2 - (x % 3), 3, 1, SMK, 0.7);
  // HERO braced near the wall, facing the boss (mirrored), hesitation arc at his toes
  const hx = ox + 258, hy = floorY - 23;
  stampM(HERO_CLIPS.brace[1].map(s => [...s]), HERO_PAL, hx, hy, { mir: true });
  [[-16, 0], [-11, -1], [-6, -1], [-1, 0]].forEach(([dx, dy], i) =>
    paint(hx + dx, floorY - 1 + dy, 3, 1, i === 1 ? ICY : ST0, 1));
  // ghost of the earlier wall bounce: two faint steel ticks + dust at the wall base
  paint(ox + w - 16, floorY - 14, 2, 1, ST0, 0.6); paint(ox + w - 20, floorY - 10, 2, 1, ST0, 0.4);
  paint(ox + w - 18, floorY - 1, 3, 1, '#4a3f33', 1);
  // quantized fear vignette (3 steps + ember tint, centre untouched)
  const steps = [[0, 10, 0.42], [6, 8, 0.24], [15, 6, 0.11]];
  for (const [inset, bw, a] of steps) {
    paint(ox + inset, oy + inset, w - 2 * inset, bw, '#0a0410', a);
    paint(ox + inset, oy + h - inset - bw, w - 2 * inset, bw, '#0a0410', a);
    paint(ox + inset, oy + inset, bw, h - 2 * inset, '#0a0410', a);
    paint(ox + w - inset - bw, oy + inset, bw, h - 2 * inset, '#0a0410', a);
  }
  paint(ox, oy, w, 3, E0, 0.10); paint(ox, oy + h - 3, w, 3, E0, 0.10);
  paint(ox, oy, 3, h, E0, 0.10); paint(ox + w - 3, oy, 3, h, E0, 0.10);
})();

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
fs.writeFileSync(__dirname+'/afk_v1.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---------- JS-literal dump ----------
let js = '// === BOSS_REDESIGN_SPRITES additions (46x48, BOSS_REDESIGN_PALETTE) ===\n';
for (const n of Object.keys(CLIPS)) {
  js += `  ${n}: [\n`;
  for (const f of CLIPS[n]) js += '    [' + f.map(r => JSON.stringify(r)).join(', ') + '],\n';
  js += '  ],\n';
}
js += '// === HERO_REDESIGN_SPRITES additions (30x24, HERO_REDESIGN_PALETTE) ===\n';
for (const n of Object.keys(HERO_CLIPS)) {
  js += `  ${n}: [\n`;
  for (const f of HERO_CLIPS[n]) js += '    [' + f.map(r => JSON.stringify(r)).join(', ') + '],\n';
  js += '  ],\n';
}
fs.writeFileSync(__dirname + '/afk_literal.txt', js);

const widths = [...new Set(Object.values(CLIPS).flat().map(f => f[0].length))];
const heights = [...new Set(Object.values(CLIPS).flat().map(f => f.length))];
console.log('wrote afk_v1.png', IW + 'x' + IH,
  '| boss clips:', Object.keys(CLIPS).map(n => `${n}(${CLIPS[n].length})`).join(' '),
  '| hero clips:', Object.keys(HERO_CLIPS).map(n => `${n}(${HERO_CLIPS[n].length})`).join(' '),
  '| boss frame widths', JSON.stringify(widths), 'heights', JSON.stringify(heights));
