// Boss "Hollow Regent" LOCOMOTION generator (VISUAL_REDESIGN_BIBLE.md §7 Step 2).
// Derives idle-breath / run / retreat / jump / fall / doubleJump / dash frames from
// the approved idle matrix by re-posing legs, torso bob, lean, shear, and an ember
// core-pulse. Visual-only; on-screen size unchanged (48 rows * BOSS_IDLE_PIXEL 3 =
// 144px, feet on the last row). Emits a filmstrip PNG and a JS-literal dump for the
// BOSS_REDESIGN_SPRITES body in SpriteManager.js.
const fs = require('fs');
const zlib = require('zlib');

const PAL = {
  '.': null, ' ': null,
  '0': '#08080c', '1': '#12121a', '2': '#1c1d28', '3': '#2a2c3a', '4': '#3d4052', '5': '#565c74',
  'a': '#6e0f1c', 'b': '#a8182a', 'c': '#e0263a', 'd': '#ff5a4a', 'g': '#3a1014', 'h': '#571820',
};

// ---- load base idle grid (48 rows x 46 cols) ----
const base = fs.readFileSync(__dirname + '/boss_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
const H = base.length, W = base[0].length;

const clone = g => g.map(r => r.slice());
const blank = () => Array.from({ length: H }, () => Array(W).fill('.'));
const stringify = g => g.map(r => r.join(''));

// Move a rectangular region into a list of [x,y,key] cells, clearing the source.
function cut(g, x0, y0, x1, y1) {
  const cells = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (y < 0 || y >= H || x < 0 || x >= W) continue;
    if (g[y][x] !== '.') { cells.push([x, y, g[y][x]]); g[y][x] = '.'; }
  }
  return cells;
}
function paste(g, cells, dx, dy) {
  for (const [x, y, k] of cells) {
    const nx = x + dx, ny = y + dy;
    if (ny < 0 || ny >= H || nx < 0 || nx >= W) continue;
    g[ny][nx] = k;
  }
}
// Shift the whole upper body (at/above hipRow) by (dx,dy) — torso bob + retreat lean.
// Moving the full block keeps the arm+sword attached to the torso.
function moveUpper(g, hipRow, dx, dy) {
  if (dx === 0 && dy === 0) return g;
  const out = blank();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] === '.') continue;
    if (y <= hipRow) { const ny = y + dy, nx = x + dx; if (ny >= 0 && ny < H && nx >= 0 && nx < W) out[ny][nx] = g[y][x]; }
    else out[y][x] = g[y][x];
  }
  return out;
}
const bobUpper = (g, hipRow, dy) => moveUpper(g, hipRow, 0, dy);

// Leg column bands (from the idle art): back leg cols 12-17, front leg cols 18-26.
const BACK = [12, 17], FRONT = [18, 26];
// Lift a leg's lower half (kneeRow..47) up `up` and along `dx` — a stride swing.
function liftLeg(g, band, kneeRow, up, dx) {
  paste(g, cut(g, band[0], kneeRow, band[1], 47), dx, -up);
}
// Brighten every ember pixel one ramp step (the "inhale" of the corruption pulse).
const emberUp = g => g.map(r => r.map(k => (k === 'a' ? 'b' : k === 'b' ? 'c' : k === 'c' ? 'd' : k)));

// ===== IDLE — 2 frames: base (exhale) + core/crack pulse (inhale). Geometry
// unchanged (palette-only), so the figure can never desync from itself. =====
function idleFrames() {
  return [stringify(base), stringify(emberUp(base))];
}

// ===== RUN — 4-frame stride: contact-L, passing, contact-R, passing. Menacing
// hover-walk: torso bobs 1px on the passing frames, legs swing around the gap. =====
function runFrames() {
  const contactL = clone(base); liftLeg(contactL, FRONT, 36, 5, 2);
  const passing1 = bobUpper(clone(base), 28, -1); liftLeg(passing1, BACK, 38, 3, 1);
  const contactR = clone(base); liftLeg(contactR, BACK, 36, 5, -2);
  const passing2 = bobUpper(clone(base), 28, -1); liftLeg(passing2, FRONT, 38, 3, -1);
  return [contactL, passing1, contactR, passing2].map(stringify);
}

// ===== RETREAT — angry backpedal: run legs + whole upper body leaned back 1px. =====
function retreatFrames() {
  return runFrames().map(s => s.map(r => r.split(''))).map(g => stringify(moveUpper(g, 28, -1, 0)));
}

// ===== JUMP — 2 frames: legs tuck up under the body, second frame rises 1px. =====
function jumpFrames() {
  const a = clone(base);
  paste(a, cut(a, BACK[0], 34, BACK[1], 47), 2, -4);
  paste(a, cut(a, FRONT[0], 34, FRONT[1], 47), -1, -4);
  const b = bobUpper(clone(a), 28, -1);
  return [a, b].map(stringify);
}

// ===== FALL — 2 frames: legs extend/spread, mask tail flares up-back. =====
function fallFrames() {
  const a = clone(base);
  paste(a, cut(a, BACK[0], 40, BACK[1], 47), -1, 0);
  paste(a, cut(a, FRONT[0], 40, FRONT[1], 47), 1, 0);
  const b = clone(a);
  paste(b, cut(b, 9, 4, 15, 8), -1, -1);
  return [a, b].map(stringify);
}

// ===== DOUBLE JUMP — 2 frames: deeper tuck / spin read (legs way up, compact). =====
function doubleJumpFrames() {
  const a = clone(base);
  paste(a, cut(a, BACK[0], 32, BACK[1], 47), 3, -6);
  paste(a, cut(a, FRONT[0], 32, FRONT[1], 47), -2, -6);
  const b = bobUpper(clone(a), 28, -1);
  return [a, b].map(stringify);
}

// ===== DASH — 2 frames: body shears forward into the direction (top leans most). =====
function dashFrames() {
  const a = clone(base), out = blank();
  for (let y = 0; y < H; y++) {
    const shear = Math.round((H - y) / 12);
    for (let x = 0; x < W; x++) {
      if (a[y][x] === '.') continue;
      const nx = x + shear; if (nx < W) out[y][nx] = a[y][x];
    }
  }
  return [out, clone(out)].map(stringify);
}
// forward shear as a reusable body transform (for slam / dive lunges).
function shearBody(g, div) {
  const out = blank();
  for (let y = 0; y < H; y++) { const s = Math.round((H - y) / div);
    for (let x = 0; x < W; x++) { if (g[y][x] === '.') continue; const nx = x + s; if (nx < W) out[y][nx] = g[y][x]; } }
  return out;
}

// =====================================================================
// COMBAT / CHARGE — re-pose the sword arm. The idle's raised blade is ERASED
// and a fresh black/red blade is redrawn from the fist at the pose's angle, so
// every attack reads distinctly while keeping the boss's obsidian+ember identity.
// Angle: 0 = forward (horizontal), + = down, - = up. `reach` ~ idle blade length
// (never longer than ~19px, so implied gameplay reach is unchanged).
// =====================================================================
const setC = (g, x, y, k) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = k; };
function lineC(g, x0, y0, x1, y1, k, thick) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { setC(g, x, y, k); if (thick) { setC(g, x + 1, y, k); }
    if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
// Erase the idle blade+guard+hand so a new sword can be drawn (keeps thorns/head/torso).
function eraseBlade(g) {
  for (let y = 0; y <= 20; y++) for (let x = 31; x <= 45; x++) g[y][x] = '.';
  for (let y = 13; y <= 20; y++) for (let x = 27; x <= 33; x++) g[y][x] = '.';
}
// Draw forearm + fist + guard + molten blade from the shoulder to a hand pivot.
function drawArmSword(g, hx, hy, angleDeg, reach, bright) {
  lineC(g, 26, 17, hx, hy, '2', true);                    // forearm (dark, 2px)
  setC(g, hx, hy, '3'); setC(g, hx - 1, hy, '3'); setC(g, hx, hy + 1, '1'); // fist
  const a = angleDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
  const R = Math.round, gx = hx + dx, gy = hy + dy;
  for (let s = -2; s <= 2; s++) setC(g, R(gx + px * s), R(gy + py * s), s === 0 ? (bright ? 'd' : 'c') : '2'); // guard band + gem
  setC(g, R(gx + px * 3), R(gy + py * 3), '1'); setC(g, R(gx - px * 3), R(gy - py * 3), '1'); // horn quillons
  for (let i = 2; i <= reach; i++) {                       // blade with molten core + edges
    const bx = R(hx + dx * i), by = R(hy + dy * i), t = i / reach;
    setC(g, bx, by, bright ? (t < 0.4 ? 'c' : 'd') : (t < 0.35 ? 'b' : t < 0.7 ? 'c' : 'd'));
    setC(g, R(bx + px), R(by + py), '1'); setC(g, R(bx - px), R(by - py), '3');
  }
  setC(g, R(hx + dx * (reach + 1)), R(hy + dy * (reach + 1)), 'd'); // hot tip
}
// Build a combat frame: optional body transform, erase idle blade, draw posed sword.
function pose(bodyGrid, hx, hy, angle, reach, bright) {
  const g = bodyGrid.map(r => r.slice());
  eraseBlade(g);
  drawArmSword(g, hx, hy, angle, reach, bright);
  return bright ? emberUp(g) : g;
}
const lean = (dx) => moveUpper(clone(base), 28, dx, 0);

// attack1 — Horizontal Slash: raised wind-up -> horizontal strike (lunge) -> recover.
function attack1Frames() {
  return [ pose(clone(base), 32, 16, -55, 18),          // wind-up (raised, like idle)
           pose(lean(2), 33, 17, 6, 19),                 // strike forward (upper-body lunge)
           pose(lean(1), 33, 18, 28, 18) ].map(stringify); // follow-through low
}
// attack2 — Spinning / wide slash: over-head -> wide down-forward sweep -> recover.
function attack2Frames() {
  return [ pose(clone(base), 31, 14, -75, 18),          // over-head wind-up
           pose(lean(2), 33, 18, 46, 19),                 // wide down-forward sweep
           pose(lean(1), 33, 18, 20, 18) ].map(stringify);
}
// attack3 — Dark Flame cast: planted, sword out mid, corruption flaring (bright).
function attack3Frames() {
  return [ pose(clone(base), 33, 17, 18, 17),            // gather
           pose(clone(base), 34, 17, 12, 18, true) ].map(stringify); // release (ember flare)
}
// attack4 — Explosive dash finisher / slam: raised -> forward-shear lunge + down slam.
function attack4Frames() {
  return [ pose(clone(base), 31, 14, -70, 18),           // rear back
           pose(shearBody(base, 9), 34, 18, 58, 19) ].map(stringify); // shear-lunge slam
}
// groundCharge — rooted charge hold: raised sword, corruption glowing hotter (2-frame pulse).
function groundChargeFrames() {
  return [ pose(clone(base), 32, 16, -58, 18, true),
           emberUp(pose(clone(base), 32, 15, -58, 18, true)) ].map(stringify); // "ready" flare
}
// airCharge — hover-and-charge aloft: legs tucked, raised sword, glowing.
function airChargeFrames() {
  const body = () => { const a = clone(base);
    paste(a, cut(a, BACK[0], 34, BACK[1], 47), 2, -4); paste(a, cut(a, FRONT[0], 34, FRONT[1], 47), -1, -4); return a; };
  return [ pose(body(), 32, 16, -55, 18, true),
           emberUp(pose(body(), 32, 15, -55, 18, true)) ].map(stringify);
}
// fireLaser — rooted beam release: both feet planted, blade leveled horizontal at beam height.
function fireLaserFrames() {
  return [ pose(clone(base), 33, 17, 0, 19, true),
           emberUp(pose(clone(base), 33, 17, 0, 20, true)) ].map(stringify);
}
// airDive — diagonal descent arrow: forward-shear body, blade pointing down-forward.
function airDiveFrames() {
  return [ pose(shearBody(base, 8), 34, 18, 52, 18) ].map(stringify);
}
// chargedDive — the fully-charged Fear dive: steeper, corruption maxed.
function chargedDiveFrames() {
  return [ pose(shearBody(base, 7), 34, 19, 62, 18, true) ].map(stringify);
}

// ---- build all clips ----
const CLIPS = {
  idle: idleFrames(),
  run: runFrames(),
  retreat: retreatFrames(),
  jump: jumpFrames(),
  fall: fallFrames(),
  doubleJump: doubleJumpFrames(),
  dash: dashFrames(),
  attack1: attack1Frames(),
  attack2: attack2Frames(),
  attack3: attack3Frames(),
  attack4: attack4Frames(),
  groundCharge: groundChargeFrames(),
  airCharge: airChargeFrames(),
  fireLaser: fireLaserFrames(),
  airDive: airDiveFrames(),
  chargedDive: chargedDiveFrames(),
};

// ---- filmstrip PNG (one clip per row) ----
const SCALE = 5, GAP = 2;
const names = Object.keys(CLIPS);
const maxF = Math.max(...names.map(n => CLIPS[n].length));
const cellW = W + GAP, cellH = H + GAP;
const gw = maxF * cellW + GAP, gh = names.length * cellH + GAP;
const grid = Array.from({ length: gh }, () => Array(gw).fill(null));
function stamp(frameStrs, ox, oy) {
  frameStrs.forEach((row, y) => [...row].forEach((k, x) => { if (k !== '.' && PAL[k]) grid[oy + y][ox + x] = PAL[k]; }));
}
names.forEach((n, r) => CLIPS[n].forEach((f, c) => stamp(f, GAP + c * cellW, GAP + r * cellH)));

function hex2rgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function crc32(buf){let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}
  let crc=0xFFFFFFFF;for(const b of buf)crc=t[(crc^b)&0xFF]^(crc>>>8);return(crc^0xFFFFFFFF)>>>0;}
function chunk(type,data){const t=Buffer.from(type,'ascii');const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
const IW=gw*SCALE, IH=gh*SCALE, raw=Buffer.alloc(IH*(1+IW*4));
for(let y=0;y<IH;y++){const row=y*(1+IW*4);raw[row]=0;
  for(let x=0;x<IW;x++){const c=grid[Math.floor(y/SCALE)][Math.floor(x/SCALE)];const o=row+1+x*4;
    if(!c){const dk=((Math.floor(x/20)+Math.floor(y/20))%2)===0;raw[o]=dk?0x16:0x1a;raw[o+1]=dk?0x13:0x17;raw[o+2]=dk?0x22:0x27;raw[o+3]=255;}
    else{const[r,g,b]=hex2rgb(c);raw[o]=r;raw[o+1]=g;raw[o+2]=b;raw[o+3]=255;}}}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(IW,0);ihdr.writeUInt32BE(IH,4);ihdr[8]=8;ihdr[9]=6;
fs.writeFileSync(__dirname+'/boss_anim.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---- JS-literal dump (object body for BOSS_REDESIGN_SPRITES) ----
let js='';
for(const n of names){
  js+=`  ${n}: [\n`;
  for(const f of CLIPS[n]) js+='    [' + f.map(r=>JSON.stringify(r)).join(', ') + '],\n';
  js+='  ],\n';
}
fs.writeFileSync(__dirname+'/boss_anim_literal.txt', js);
const widths=[...new Set(Object.values(CLIPS).flat().map(f=>f[0].length))];
const heights=[...new Set(Object.values(CLIPS).flat().map(f=>f.length))];
console.log('wrote boss_anim.png', IW+'x'+IH, '| clips:', names.map(n=>`${n}(${CLIPS[n].length})`).join(' '),
  '| frame widths', JSON.stringify(widths), 'heights', JSON.stringify(heights));
