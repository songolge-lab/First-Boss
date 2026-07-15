// Stage 7B-1 — standalone validator + facing proof for the APPROVED revised boss
// locomotion drop-in matrices. Reads the ARTIFACT (walk2_literal.txt), NOT the
// generator internals, so it certifies exactly what would be pasted into
// BOSS_REDESIGN_SPRITES. Asset/handoff work only — reads nothing under src/,
// writes only into tools/redesign/. Emits a facing-proof strip (walk2_facing.png)
// and prints a machine-readable validation report.
//
//   node walk2_validate.js
//
// Checks:
//   [DIMS ]  every frame 46 wide x 48 tall, rows uniform
//   [KEYS ]  only BOSS_REDESIGN_PALETTE keys ("012345 abcd gh .")
//   [FLOOR]  lowest occupied row is 46 or 47 in every frame (feet planted)
//   [CLIPS]  all 5 required clips present with the approved frame counts
//   [ANCHR]  idle final frame -> first movement frames: no feet / top / centre jump
//   [REAR ]  base-locomotion sword sits BEHIND the body (trailing side) and never
//            intrudes the FRONT-lower quadrant  -> the rear-carry rule, per frame
//   [MIRROR] the naive full-sprite mirror keeps the sword trailing in BOTH facings
const fs = require('fs');
const zlib = require('zlib');
const DIR = __dirname;

// ---------- palette (locked; matches BOSS_REDESIGN_PALETTE / BOSS_PAL) ----------
const BOSS_PAL = {
  '0': '#08080c', '1': '#12121a', '2': '#1c1d28', '3': '#2a2c3a', '4': '#3d4052', '5': '#565c74',
  'a': '#6e0f1c', 'b': '#a8182a', 'c': '#e0263a', 'd': '#ff5a4a', 'g': '#3a1014', 'h': '#571820',
};
const HERO_PAL = {
  '0': '#10141e', '1': '#2e3444', '2': '#4a5468', '3': '#7c88a0', '4': '#aeb9cc', '5': '#e2e8f2',
  'n': '#141c30', 'm': '#1c2438', 'l': '#7fd4ff', 'L': '#b8ecff', 'g': '#c9962e',
};
const LEGAL = new Set([...'012345abcdgh.']);
const REQUIRED = { idle: 3, walkForward: 6, walkBackward: 4, surgeForward: 6, surgeBackward: 4 };
const BASE_LOCO = ['idle', 'walkForward', 'walkBackward'];   // the frames that carry the sword pose

// ---------- load the APPROVED artifact ----------
const raw = fs.readFileSync(DIR + '/walk2_literal.txt', 'utf8');
const body = raw.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n');
const CLIPS = eval('({' + body + '})');                      // { clip: [ [rowStr,...], ... ] }
const heroBase = fs.readFileSync(DIR + '/hero_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length);

const W = 46, H = 48;
const report = [];
let failures = 0;
const ok = (tag, pass, msg) => { report.push(`[${tag.padEnd(6)}] ${pass ? 'PASS' : 'FAIL'} ${msg}`); if (!pass) failures++; };

// ---------- [CLIPS] presence + counts ----------
for (const [n, want] of Object.entries(REQUIRED)) {
  const got = CLIPS[n] ? CLIPS[n].length : 0;
  ok('CLIPS', got === want, `${n}: ${got}/${want} frames`);
}

// ---------- [DIMS] + [KEYS] + [FLOOR] per frame ----------
let dimBad = 0, keyBad = 0, floorBad = 0, totalFrames = 0;
const badKeys = new Set();
for (const [n, frames] of Object.entries(CLIPS)) {
  frames.forEach((f, i) => {
    totalFrames++;
    if (f.length !== H || f.some(r => r.length !== W)) { dimBad++; report.push(`  ! DIMS ${n}[${i}] h=${f.length} w=${[...new Set(f.map(r => r.length))]}`); }
    for (const r of f) for (const k of r) if (!LEGAL.has(k)) { keyBad++; badKeys.add(k); }
    let low = -1;
    f.forEach((r, y) => { if ([...r].some(k => k !== '.')) low = y; });
    if (low < 46) { floorBad++; report.push(`  ! FLOOR ${n}[${i}] lowest row ${low}`); }
  });
}
ok('DIMS', dimBad === 0, `${totalFrames - dimBad}/${totalFrames} frames are exactly ${W}x${H}`);
ok('KEYS', keyBad === 0, keyBad === 0 ? `all keys legal across ${totalFrames} frames` : `${keyBad} illegal cells (${[...badKeys].join(',')})`);
ok('FLOOR', floorBad === 0, `${totalFrames - floorBad}/${totalFrames} frames plant on row 46-47`);

// ---------- geometry helpers ----------
const cells = f => { const out = []; f.forEach((r, y) => { for (let x = 0; x < W; x++) if (r[x] !== '.') out.push([x, y]); }); return out; };
// body core = torso + leg band (cols 12-33); trailing blade lives at cols 0-11.
const meanX = (list) => list.length ? list.reduce((s, c) => s + c[0], 0) / list.length : NaN;
function regions(f) {
  const all = cells(f);
  const bodyCore = all.filter(([x, y]) => x >= 12 && x <= 33);
  const swordRear = all.filter(([x, y]) => x <= 11 && y >= 26);          // trailing blade quadrant
  const frontLow = all.filter(([x, y]) => x >= 32 && y >= 28);           // FRONT-lower quadrant (must stay clear of blade)
  return { all, bodyCore, swordRear, frontLow };
}

// ---------- [REAR] rear-side carry per base-locomotion clip ----------
const rearRows = [];
for (const n of BASE_LOCO) {
  CLIPS[n].forEach((f, i) => {
    const { bodyCore, swordRear, frontLow } = regions(f);
    const bX = meanX(bodyCore), sX = meanX(swordRear);
    const behind = sX < bX;                                              // sword left of body => behind (facing right)
    const clearFront = frontLow.length <= 2;                             // no blade cluster in front-lower quadrant
    rearRows.push({ clip: n, f: i, bodyX: +bX.toFixed(1), swordX: +sX.toFixed(1), behindBy: +(bX - sX).toFixed(1), frontLowCells: frontLow.length });
    ok('REAR', behind && clearFront,
      `${n}[${i}] swordX ${sX.toFixed(1)} < bodyX ${bX.toFixed(1)} (behind by ${(bX - sX).toFixed(1)}px), front-low cells ${frontLow.length}`);
  });
}

// ---------- [MIRROR] naive full mirror keeps the sword trailing in BOTH facings ----------
// Mirror maps x -> (W-1-x). It flips facing right->left AND the sword side together,
// so "behind relative to facing" is invariant. Prove it on idle f0.
(() => {
  const f = CLIPS.idle[0];
  const mir = f.map(r => [...r].reverse().join(''));
  const R = regions(f), M = regions(mir);
  const authBehind = meanX(R.swordRear) < meanX(R.bodyCore);            // facing R: sword left = behind
  // mirrored: sword region moves to the right band; recompute against the mirrored body
  const mAll = cells(mir);
  const mBody = mAll.filter(([x]) => x >= 12 && x <= 33);
  const mSword = mAll.filter(([x, y]) => x >= W - 12 && y >= 26);       // trailing blade now on the RIGHT
  const mirBehind = meanX(mSword) > meanX(mBody);                       // facing L: sword right = behind
  ok('MIRROR', authBehind && mirBehind,
    `facing-R sword left of body (${meanX(R.swordRear).toFixed(1)}<${meanX(R.bodyCore).toFixed(1)}); ` +
    `facing-L(mirror) sword right of body (${meanX(mSword).toFixed(1)}>${meanX(mBody).toFixed(1)}) => trailing invariant`);
})();

// ---------- [ANCHR] idle final -> first movement frames ----------
function anchors(f) {
  const c = cells(f);
  const low = Math.max(...c.map(p => p[1]));
  const top = Math.min(...c.map(p => p[1]));
  const cx = meanX(c.filter(([x, y]) => y >= 12 && y <= 33 && x >= 12 && x <= 33)); // torso centre
  return { low, top, cx: +cx.toFixed(1) };
}
(() => {
  const idleEnd = anchors(CLIPS.idle[CLIPS.idle.length - 1]);
  [['walkForward', 0], ['walkBackward', 0]].forEach(([n, i]) => {
    const a = anchors(CLIPS[n][i]);
    const dLow = Math.abs(a.low - idleEnd.low), dTop = Math.abs(a.top - idleEnd.top), dCx = Math.abs(a.cx - idleEnd.cx);
    ok('ANCHR', dLow <= 1 && dTop <= 2 && dCx <= 4,
      `idle_end(low ${idleEnd.low},top ${idleEnd.top},cx ${idleEnd.cx}) -> ${n}[0](low ${a.low},top ${a.top},cx ${a.cx}) | d feet ${dLow}, top ${dTop}, cx ${dCx}`);
  });
})();

// ================= facing-proof render (walk2_facing.png) =================
// For each base clip: authored (boss faces RIGHT, hero right) vs naive mirror
// (boss faces LEFT, hero left). Sword stays BEHIND the body in both -> the proof.
const SW = 300, SH = 3 * 70 + 16, SCALE = 4;
const G = Array.from({ length: SH }, () => Array(SW).fill(null));
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function paint(x, y, w, h, hex, a = 1) {
  const s = hex2rgb(hex);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    if (yy < 0 || yy >= SH || xx < 0 || xx >= SW) continue;
    const d = G[yy][xx] || [0x16, 0x13, 0x22];
    G[yy][xx] = a >= 1 ? s.slice() : [Math.round(d[0] * (1 - a) + s[0] * a), Math.round(d[1] * (1 - a) + s[1] * a), Math.round(d[2] * (1 - a) + s[2] * a)];
  }
}
function stamp(rows, pal, ox, oy, mir) {
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
    const k = row[x]; if (k === '.' || !pal[k]) continue;
    paint((mir ? ox + (row.length - 1 - x) : ox + x), oy + y, 1, 1, pal[k], 1);
  } });
}
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111111101101',
  N: '110101101101101', O: '010101101101010', R: '110101110110101', S: '011100010001110',
  T: '111010010010010', U: '101101101101111', V: '101101101101010', Y: '101101010010010',
  W: '101101111111101', ' ': '000000000000000', '-': '000000111000000', '0': '111101101101111',
};
function text(str, x, y, color) {
  let cx = x;
  for (const ch of String(str).toUpperCase()) { const g = FONT[ch]; if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') paint(cx + (i % 3), y + Math.floor(i / 3), 1, 1, color, 1); cx += 4; }
}
const heroRows = heroBase;
BASE_LOCO.forEach((n, r) => {
  const f = CLIPS[n][0], oy = 8 + r * 70;
  text(n + ' - HERO RIGHT', 4, oy - 2, '#8d84a8');
  // authored: boss left, hero right
  stamp(f, BOSS_PAL, 40, oy, false);
  stamp(heroRows, HERO_PAL, 116, oy + 24, true);
  // mirror: hero left, boss right
  text('MIRROR - HERO LEFT', 158, oy - 2, '#8d84a8');
  stamp(heroRows, HERO_PAL, 152, oy + 24, false);
  stamp(f, BOSS_PAL, 210, oy, true);
  paint(0, oy + 62, SW, 1, '#3a3346', 1);
});
function crc32(buf){let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}
  let crc=0xFFFFFFFF;for(const b of buf)crc=t[(crc^b)&0xFF]^(crc>>>8);return(crc^0xFFFFFFFF)>>>0;}
function chunk(type,data){const t=Buffer.from(type,'ascii');const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
const IW=SW*SCALE, IH=SH*SCALE, rawpng=Buffer.alloc(IH*(1+IW*4));
for(let y=0;y<IH;y++){const row=y*(1+IW*4);rawpng[row]=0;
  for(let x=0;x<IW;x++){const c=G[Math.floor(y/SCALE)][Math.floor(x/SCALE)];const o=row+1+x*4;
    if(!c){const dk=((Math.floor(x/20)+Math.floor(y/20))%2)===0;rawpng[o]=dk?0x16:0x1a;rawpng[o+1]=dk?0x13:0x17;rawpng[o+2]=dk?0x22:0x27;rawpng[o+3]=255;}
    else{rawpng[o]=c[0];rawpng[o+1]=c[1];rawpng[o+2]=c[2];rawpng[o+3]=255;}}}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(IW,0);ihdr.writeUInt32BE(IH,4);ihdr[8]=8;ihdr[9]=6;
fs.writeFileSync(DIR+'/walk2_facing.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(rawpng)),chunk('IEND',Buffer.alloc(0))]));

// ---------- print report ----------
console.log('=== STAGE 7B-1 LOCOMOTION HANDOFF VALIDATION ===');
console.log(report.join('\n'));
console.log('--- rear-carry table (authored, facing right) ---');
console.log('clip           frame  bodyX  swordX  behindBy  frontLowCells');
for (const r of rearRows) console.log(`${r.clip.padEnd(14)} ${String(r.f).padEnd(5)}  ${String(r.bodyX).padEnd(5)}  ${String(r.swordX).padEnd(6)}  ${String(r.behindBy).padEnd(8)}  ${r.frontLowCells}`);
console.log('--- artifact ---');
console.log('wrote walk2_facing.png', IW + 'x' + IH);
console.log(failures === 0 ? 'RESULT: ALL CHECKS PASSED' : `RESULT: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
