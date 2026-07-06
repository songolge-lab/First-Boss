// Hero "Dawnguard Knight" MOVEMENT + COMBAT generator (VISUAL_REDESIGN_BIBLE.md §7 Step 4).
// Derives run/jump/fall/dash/roll + attack/cast/parry/parry_counter/air_attack/hurt from
// the approved hero idle matrix by re-posing legs, cape, and the sword arm. Visual-only;
// on-screen size unchanged (24 rows * HERO_IDLE_PIXEL 2 = 48px, feet on the last row).
// Emits a filmstrip PNG and a JS-literal dump for HERO_REDESIGN_SPRITES in SpriteManager.js.
const fs = require('fs');
const zlib = require('zlib');

const PAL = {
  '.': null, ' ': null,
  '0': '#10141e', '1': '#2e3444', '2': '#4a5468', '3': '#7c88a0', '4': '#aeb9cc', '5': '#e2e8f2',
  'n': '#141c30', 'm': '#1c2438', 'l': '#7fd4ff', 'L': '#b8ecff', 'g': '#c9962e',
};

const base = fs.readFileSync(__dirname + '/hero_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
const H = base.length, W = base[0].length;   // 24 x 30

const clone = g => g.map(r => r.slice());
const blank = () => Array.from({ length: H }, () => Array(W).fill('.'));
const stringify = g => g.map(r => r.join(''));
const setC = (g, x, y, k) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = k; };
function cut(g, x0, y0, x1, y1) {
  const c = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (y < 0 || y >= H || x < 0 || x >= W) continue;
    if (g[y][x] !== '.') { c.push([x, y, g[y][x]]); g[y][x] = '.'; }
  }
  return c;
}
function paste(g, cells, dx, dy) { for (const [x, y, k] of cells) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < W && ny >= 0 && ny < H) g[ny][nx] = k; } }
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
function lineC(g, x0, y0, x1, y1, k, thick) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { setC(g, x, y, k); if (thick) setC(g, x, y + 1, k);
    if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
// Brighten the cold-blue accents (visor / sigil / blade glow) one step — the breath /
// channel pulse. Palette-only, so geometry can never desync.
const blueUp = g => g.map(r => r.map(k => (k === 'l' ? 'L' : k)));

const BACK = [10, 12], FRONT = [14, 16];   // leg bands; stance gap col 13
function liftLeg(g, band, kneeRow, up, dx) { paste(g, cut(g, band[0], kneeRow, band[1], 23), dx, -up); }
function shearBody(g, div) {
  const out = blank();
  for (let y = 0; y < H; y++) { const s = Math.round((H - y) / div);
    for (let x = 0; x < W; x++) { if (g[y][x] === '.') continue; const nx = x + s; if (nx < W) out[y][nx] = g[y][x]; } }
  return out;
}
// Cape flow: shift the lower cape (cols 3-9) back(dx)/up(dy) so it trails motion.
function capeFlow(g, dx, dy) { paste(g, cut(g, 3, 10, 9, 19), dx, dy); return g; }

// ---- sword re-pose (steel blade, cold-blue glow edge) ----
function eraseBlade(g) { for (let y = 10; y <= 18; y++) for (let x = 18; x <= 29; x++) g[y][x] = '.'; }
function drawSword(g, hx, hy, angleDeg, reach, bright) {
  lineC(g, 14, 12, hx, hy, '2', true);                       // forearm
  setC(g, hx, hy, '3'); setC(g, hx - 1, hy, '3'); setC(g, hx, hy + 1, '1'); // fist
  const a = angleDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx, R = Math.round;
  const gx = hx + dx, gy = hy + dy;
  for (let s = -1; s <= 1; s++) setC(g, R(gx + px * s), R(gy + py * s), s === 0 ? 'l' : '1'); // guard + gem
  for (let i = 2; i <= reach; i++) {                          // blade: steel core + blue glow edge
    const bx = R(hx + dx * i), by = R(hy + dy * i), t = i / reach;
    setC(g, bx, by, bright ? (t > 0.6 ? 'L' : '4') : '4');
    setC(g, R(bx + px), R(by + py), 'l');                     // cold-blue glow underside
    setC(g, R(bx - px), R(by - py), '3');
  }
  setC(g, R(hx + dx * (reach + 1)), R(hy + dy * (reach + 1)), 'L'); // bright tip
}
function pose(bodyGrid, hx, hy, angle, reach, bright) {
  const g = bodyGrid.map(r => r.slice());
  eraseBlade(g); drawSword(g, hx, hy, angle, reach, bright);
  return bright ? blueUp(g) : g;
}
const lean = dx => moveUpper(clone(base), 14, dx, 0);

// ===== MOVEMENT =====
const idleFrames = () => [stringify(base), stringify(blueUp(base))];
function runFrames() {
  const cL = clone(base); liftLeg(cL, FRONT, 18, 3, 1); capeFlow(cL, -1, -1);
  const p1 = moveUpper(clone(base), 15, 0, -1); liftLeg(p1, BACK, 19, 2, 0); capeFlow(p1, -1, 0);
  const cR = clone(base); liftLeg(cR, BACK, 18, 3, -1); capeFlow(cR, -1, -1);
  const p2 = moveUpper(clone(base), 15, 0, -1); liftLeg(p2, FRONT, 19, 2, 0); capeFlow(p2, -1, 0);
  return [cL, p1, cR, p2].map(stringify);
}
function jumpFrames() {
  const a = clone(base);
  paste(a, cut(a, BACK[0], 17, BACK[1], 23), 1, -3); paste(a, cut(a, FRONT[0], 17, FRONT[1], 23), 0, -3);
  capeFlow(a, -1, -2);
  const b = moveUpper(clone(a), 15, 0, -1);
  return [a, b].map(stringify);
}
function fallFrames() {
  const a = clone(base);
  paste(a, cut(a, BACK[0], 20, BACK[1], 23), -1, 0); paste(a, cut(a, FRONT[0], 20, FRONT[1], 23), 1, 0);
  capeFlow(a, -1, -2);
  const b = clone(a); paste(b, cut(b, 3, 6, 6, 12), -1, -1);
  return [a, b].map(stringify);
}
function dashFrames() {
  const a = shearBody(base, 6); capeFlow(a, -2, 0);
  return [a, clone(a)].map(stringify);
}
function rollFrames() {
  // defensive tuck: whole upper body crouched down over the legs, cape wrapped forward.
  const a = moveUpper(clone(base), 14, 1, 4);
  paste(a, cut(a, BACK[0], 19, FRONT[1], 23), 0, -2);   // pull feet up into the ball
  const b = moveUpper(clone(base), 14, 2, 5);
  paste(b, cut(b, BACK[0], 19, FRONT[1], 23), 1, -3);
  return [a, b].map(stringify);
}

// ===== COMBAT =====
// attack — 4-hit combo swing: over-shoulder wind-up -> forward slash -> cross slash -> recover.
function attackFrames() {
  return [ pose(clone(base), 18, 12, -40, 11),
           pose(lean(1), 19, 13, 15, 12),
           pose(lean(1), 19, 14, 45, 11),
           pose(clone(base), 18, 14, 55, 10) ].map(stringify);
}
// cast — Holy Light Wave: planted, blade channelled up-forward, blue flaring (wave VFX is separate).
function castFrames() {
  return [ pose(clone(base), 18, 12, -20, 11, true),
           pose(clone(base), 19, 11, -8, 12, true) ].map(stringify);
}
// parry — brace: blade raised vertical in guard, slight crouch.
function parryFrames() {
  const body = () => moveUpper(clone(base), 14, 0, 1);
  return [ pose(body(), 18, 12, -82, 11, true),
           pose(body(), 18, 11, -80, 11, true) ].map(stringify);
}
// parry_counter — riposte burst: blade sweeps out, cold light flaring (counter-ring VFX is separate).
function parryCounterFrames() {
  return [ pose(lean(1), 19, 12, -35, 12, true),
           pose(lean(1), 20, 13, 10, 12, true) ].map(stringify);
}
// air_attack — pogo down-strike: airborne (legs tucked), blade angled down toward the front foot.
function airAttackFrames() {
  const body = () => { const a = clone(base);
    paste(a, cut(a, BACK[0], 17, BACK[1], 23), 1, -3); paste(a, cut(a, FRONT[0], 17, FRONT[1], 23), 0, -3);
    capeFlow(a, -1, -1); return a; };
  return [ pose(body(), 18, 13, 72, 11) ].map(stringify);
}
// hurt — stagger: upper body recoiled back, blade drooped, no blue flare (dim).
function hurtFrames() {
  return [ pose(moveUpper(clone(base), 14, -1, 0), 17, 14, 48, 10),
           pose(moveUpper(clone(base), 14, -2, 1), 16, 15, 55, 9) ].map(stringify);
}

// ---- build all clips ----
const CLIPS = {
  idle: idleFrames(), run: runFrames(), jump: jumpFrames(), fall: fallFrames(),
  dash: dashFrames(), roll: rollFrames(),
  attack: attackFrames(), cast: castFrames(), parry: parryFrames(),
  parry_counter: parryCounterFrames(), air_attack: airAttackFrames(), hurt: hurtFrames(),
};

// ---- filmstrip PNG ----
const SCALE = 8, GAP = 2;
const names = Object.keys(CLIPS);
const maxF = Math.max(...names.map(n => CLIPS[n].length));
const cellW = W + GAP, cellH = H + GAP;
const gw = maxF * cellW + GAP, gh = names.length * cellH + GAP;
const grid = Array.from({ length: gh }, () => Array(gw).fill(null));
function stamp(fr, ox, oy) { fr.forEach((row, y) => [...row].forEach((k, x) => { if (k !== '.' && PAL[k]) grid[oy + y][ox + x] = PAL[k]; })); }
names.forEach((n, r) => CLIPS[n].forEach((f, c) => stamp(f, GAP + c * cellW, GAP + r * cellH)));
function h2(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function crc(b){let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}let r=0xFFFFFFFF;for(const x of b)r=t[(r^x)&0xFF]^(r>>>8);return(r^0xFFFFFFFF)>>>0;}
function ch(ty,d){const t=Buffer.from(ty,'ascii'),l=Buffer.alloc(4);l.writeUInt32BE(d.length);const c=Buffer.alloc(4);c.writeUInt32BE(crc(Buffer.concat([t,d])));return Buffer.concat([l,t,d,c]);}
const IW=gw*SCALE,IH=gh*SCALE,raw=Buffer.alloc(IH*(1+IW*4));
for(let y=0;y<IH;y++){const ro=y*(1+IW*4);raw[ro]=0;for(let x=0;x<IW;x++){const cc=grid[(y/SCALE)|0][(x/SCALE)|0],o=ro+1+x*4;if(!cc){const dk=(((x/16|0)+(y/16|0))%2)===0;raw[o]=dk?22:26;raw[o+1]=dk?23:27;raw[o+2]=dk?34:40;raw[o+3]=255;}else{const[r,g,b]=h2(cc);raw[o]=r;raw[o+1]=g;raw[o+2]=b;raw[o+3]=255;}}}
const ih=Buffer.alloc(13);ih.writeUInt32BE(IW,0);ih.writeUInt32BE(IH,4);ih[8]=8;ih[9]=6;
fs.writeFileSync(__dirname+'/hero_anim.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),ch('IHDR',ih),ch('IDAT',zlib.deflateSync(raw)),ch('IEND',Buffer.alloc(0))]));

let js='';
for(const n of names){ js+=`  ${n}: [\n`; for(const f of CLIPS[n]) js+='    ['+f.map(r=>JSON.stringify(r)).join(', ')+'],\n'; js+='  ],\n'; }
fs.writeFileSync(__dirname+'/hero_anim_literal.txt', js);
const widths=[...new Set(Object.values(CLIPS).flat().map(f=>f[0].length))];
const heights=[...new Set(Object.values(CLIPS).flat().map(f=>f.length))];
console.log('wrote hero_anim.png', IW+'x'+IH, '| clips:', names.map(n=>`${n}(${CLIPS[n].length})`).join(' '), '| widths', JSON.stringify(widths), 'heights', JSON.stringify(heights));
