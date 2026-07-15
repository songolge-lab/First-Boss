// Stage 8A-1 — standalone validator for the APPROVED Stage 8A-0 Boss combo
// redesign drop-in matrices. Reads the ARTIFACT (combo_literal.txt), NOT the
// generator internals, so it certifies exactly what would be pasted into
// BOSS_REDESIGN_SPRITES (body clips) and the effect-grid painters (FX grids).
// Asset/handoff work only — reads nothing under src/, writes nothing.
//
//   node combo_validate.js        (exit 0 = ALL PASSED, exit 1 = a contract broke)
//
// Every check below is the DROP-IN LAW or an approved DESIGN CONTRACT from the
// 8A-0 sheet, re-proven against the literal that would actually ship:
//   [CLIPS ]  the 4 body clips + 2 effect grids are present with approved counts
//   [DIMS  ]  body 46x48, comboOrb 23x23, comboDetonation 72x52 (rows uniform)
//   [KEYS  ]  only BOSS_REDESIGN_PALETTE keys ("012345 abcd gh .")
//   [FLOOR ]  every body frame plants on row 46-47 (feet, no pop into locomotion)
//   [SWORD ]  every body frame carries the blade (>=20 ember cells) — one-sword law
//   [AWAY  ]  H2 f1 (the turn-through) hides the face: no hot ember (c/d) above r18
//   [VOID  ]  H4 rush-peak eclipse >=1.5x an opener frame's void (escalation)
//   [SEAM  ]  H4 f4 tip is back in the rear-lower quadrant (locomotion hand-off)
//   [ORB   ]  both orb FLIGHT cells keep the void-disc core + >=8 'd' corona
//   [DET   ]  detonation reaches up (<=r14), skitters race the floor, D3 is fully
//             cooled, the half-dome eats everything below floor+1, det > orb 'd'
const fs = require('fs');
const DIR = __dirname;

// ---------- palette (locked; matches BOSS_REDESIGN_PALETTE / BOSS_PAL) ----------
const LEGAL = new Set([...'012345abcdgh.']);

// approved package shape (8A-0)
const BODY = { attack1: 4, attack2: 4, attack3: 3, attack4: 5 };  // 16 body frames, 46x48
const FXSPEC = { comboOrb: [23, 23], comboDetonation: [72, 52] }; // 4 + 4 effect cells
const ORB_C = 11;                                                  // orb grid centre col/row
const DG = { W: 72, H: 52, CX: 38, CY: 34, FLOOR: 48 };            // detonation grid geometry

// ---------- load the APPROVED artifact ----------
const raw = fs.readFileSync(DIR + '/combo_literal.txt', 'utf8');
const body = raw.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n');
const M = eval('({' + body + '})');   // { attack1:[[rowStr,...],...], ..., comboOrb, comboDetonation }

const report = [];
let failures = 0;
const ok = (tag, pass, msg) => {
  report.push(`[${tag.padEnd(6)}] ${pass ? 'PASS' : 'FAIL'} ${msg}`);
  if (!pass) failures++;
};
const cnt = (frame, keys) => frame.join('').split('').filter(k => keys.includes(k)).length;

// ---------- [CLIPS] presence + counts ----------
for (const [n, want] of Object.entries(BODY)) {
  const got = M[n] ? M[n].length : 0;
  ok('CLIPS', got === want, `${n}: ${got}/${want} frames`);
}
for (const n of Object.keys(FXSPEC)) {
  const got = M[n] ? M[n].length : 0;
  ok('CLIPS', got === 4, `${n}: ${got}/4 cells`);
}

// ---------- [DIMS] + [KEYS] + [FLOOR] + [SWORD] per body frame ----------
let dimBad = 0, keyBad = 0, floorBad = 0, swordBad = 0, bodyFrames = 0;
const badKeys = new Set();
for (const n of Object.keys(BODY)) {
  (M[n] || []).forEach((f, i) => {
    bodyFrames++;
    if (f.length !== 48 || f.some(r => r.length !== 46)) { dimBad++; report.push(`  ! DIMS ${n}[${i}] h=${f.length} w=${[...new Set(f.map(r => r.length))]}`); }
    for (const r of f) for (const k of r) if (!LEGAL.has(k)) { keyBad++; badKeys.add(k); }
    let low = -1;
    f.forEach((r, y) => { if ([...r].some(k => k !== '.')) low = y; });
    if (low < 46) { floorBad++; report.push(`  ! FLOOR ${n}[${i}] lowest row ${low}`); }
    if (cnt(f, 'abcd') < 20) { swordBad++; report.push(`  ! SWORD ${n}[${i}] ember=${cnt(f, 'abcd')}`); }
  });
}
ok('DIMS', dimBad === 0, `${bodyFrames - dimBad}/${bodyFrames} body frames are exactly 46x48`);
ok('FLOOR', floorBad === 0, `${bodyFrames - floorBad}/${bodyFrames} body frames plant on row 46-47`);
ok('SWORD', swordBad === 0, `${bodyFrames - swordBad}/${bodyFrames} body frames carry the blade (>=20 ember)`);

// ---------- [DIMS]/[KEYS] for the effect grids ----------
let fxDimBad = 0;
for (const [n, [w, h]] of Object.entries(FXSPEC)) {
  (M[n] || []).forEach((f, i) => {
    if (f.length !== h || f.some(r => r.length !== w)) { fxDimBad++; report.push(`  ! FX-DIMS ${n}[${i}] ${f[0] ? f[0].length : '?'}x${f.length} want ${w}x${h}`); }
    for (const r of f) for (const k of r) if (!LEGAL.has(k)) { keyBad++; badKeys.add(k); }
  });
}
ok('DIMS', fxDimBad === 0, `comboOrb 23x23 + comboDetonation 72x52 grids uniform`);
ok('KEYS', keyBad === 0, keyBad === 0 ? `all keys legal across body + FX` : `${keyBad} illegal cells (${[...badKeys].join(',')})`);

// ---------- [AWAY] H2 turn-through hides the face (no hot ember above r18) ----------
{
  let bad = 0;
  const f = M.attack2[1];
  for (let y = 0; y <= 18; y++) for (const k of f[y]) if (k === 'c' || k === 'd') bad++;
  ok('AWAY', bad === 0, `H2 f1 (AWAY) hot-ember cells above row 18 = ${bad}`);
}

// ---------- [VOID] H4 rush-peak eclipse dominance ----------
{
  const v2 = cnt(M.attack4[2], '01'), v0 = cnt(M.attack1[1], '01');
  ok('VOID', v2 >= v0 * 1.5, `H4 RUSH-B void ${v2} >= 1.5x H1 opener void ${v0} (=${(v0 * 1.5).toFixed(0)})`);
}

// ---------- [SEAM] H4 f4 tip back in the rear-lower quadrant ----------
{
  const f = M.attack4[4]; let tip = null;
  f.forEach((r, y) => { for (let x = 0; x < 14; x++) if (r[x] === 'd') tip = [x, y]; });
  ok('SEAM', tip && tip[1] >= 40, `H4 RECOVER tip ${JSON.stringify(tip)} in rear-lower quadrant (x<14, y>=40)`);
}

// ---------- [ORB] both flight cells: void-disc core + hot corona ----------
{
  let bad = 0;
  M.comboOrb.slice(1, 3).forEach((f, i) => {
    if (f[ORB_C][ORB_C] !== '0') { bad++; report.push(`  ! ORB O${i + 1} centre !='0' (${f[ORB_C][ORB_C]})`); }
    let d = 0;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++)
      if (Math.abs(dx) + Math.abs(dy) <= 4 && f[ORB_C + dy][ORB_C + dx] === 'd') d++;
    if (d < 8) { bad++; report.push(`  ! ORB O${i + 1} corona 'd'=${d} (<8)`); }
  });
  ok('ORB', bad === 0, `O1/O2 flight cells: void-disc core + >=8 'd' corona`);
}

// ---------- [DET] reach, floor skitter, cooled D3, half-dome, escalation ----------
{
  const D = M.comboDetonation;
  let up = 99; D[1].forEach((r, y) => { if ([...r].some(k => k !== '.')) up = Math.min(up, y); });
  let sk = 0;
  for (const y of [46, 47, 48]) for (let x = 0; x < DG.W; x++)
    if (Math.abs(x - DG.CX) > 8 && D[1][y][x] !== '.') sk++;
  const cooled = !D[3].join('').includes('d');
  let underfloor = 0;
  D.forEach(f => { for (let y = DG.FLOOR + 2; y < DG.H; y++) if ([...f[y]].some(k => k !== '.')) underfloor++; });
  const dOrb = cnt(M.comboOrb[1], 'd'), dDet = cnt(D[1], 'd');
  ok('DET', up <= 14, `D1 burst reaches up to row ${up} (<=14)`);
  ok('DET', sk >= 6, `D1 floor skitters racing the floor = ${sk} (>=6)`);
  ok('DET', cooled, `D3 ASHFALL fully cooled (0 hot 'd' cells)`);
  ok('DET', underfloor === 0, `half-dome: ${underfloor} cells below floor+1`);
  ok('DET', dDet > dOrb, `finisher outshines the orb: det 'd'=${dDet} > orb 'd'=${dOrb}`);
}

// ---------- report ----------
console.log('=== Stage 8A-1 — combo drop-in validation (reads combo_literal.txt) ===');
for (const line of report) console.log(line);
console.log(failures === 0
  ? `\nALL PASSED — ${report.length} checks, artifact is drop-in-ready.`
  : `\n${failures} FAILURE(S) of ${report.length} checks.`);
process.exit(failures ? 1 : 0);
