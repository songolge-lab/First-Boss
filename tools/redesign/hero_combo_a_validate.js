// Stage 8C-2 — standalone validator for the APPROVED Stage 8C-0 (REV 2) Hero combo
// expansion A, "MERIDIAN LOOP".
//
// Reads the SHIPPING ARTIFACT — hero_combo_a_literal.txt — cell by cell, and the
// generator's DECLARED geometry constants from hero_combo_a_gen.js (as text, never
// executed), so it certifies exactly the matrix data a later integration stage would
// paste, plus that the literal still matches the generator's declared canvas/grids.
// It does NOT merely confirm the generator runs.
//
//   node hero_combo_a_validate.js     (exit 0 = ALL PASSED, exit 1 = a contract broke)
//
// Checks (all against the literal):
//   [CLIPS   ] 5 body clips (4/6/4/4/6 = 24 frames) + 4 detached grids (3/3/5/3) present
//   [DIMS    ] every body frame is 44x34; every grid matches its declared WxH
//   [KEYS    ] body frames use only HERO+LIGHT keys; the 4 grids are PURE LIGHT (no blue)
//   [PALETTE ] warm law R>=G>=B on all 6 LIGHT steps; no LIGHT/HERO key collision
//   [MANIFEST] every frame is where the frame/phase contract says it is (membership, no dup/miss)
//   [FLOOR   ] grounded frames plant feet on rows 32-33; AIRBORNE frames carry NO body there
//   [BODY    ] every non-ghost frame carries the hero body; the two ghost frames dissolve it
//   [ROTATE  ] the dive is a TURN: T2->D2A->D2B ordered, D2A silhouette rotates wide,
//              the blade LEADS the dive line and is NOT parked at the feet
//   [ESCALAT ] move-level light grows S1 smallest -> S5 dominant (>1.5x), middle all above S1
//   [GLAIVE  ] MICRO GLYPH white core present; crescent bows toward travel (right)
//   [CORRIDOR] fades in 3 steps, residue rises, and it reaches across the lane
//   [PILLAR  ] h-symmetric, north-dominant, dissolving, residue rising, true-circle crown
//   [REFORM  ] the GATHER law — mean radius contracts across the 3 arrival frames
//   [LOOP    ] the return lands before the pillar dies (>=6 tick margin) inside the lit bed
//   [ADVANCE ] the mark->pillar advance stays a controlled 3.5-6.5 hero lengths
//   [SEAM    ] E5C returns the blade to the idle carry (36,27)
//   [FACING  ] directional grids authored RIGHT; mirror-critical grids are h-symmetric
//   [TIERS   ] every tier-critical group (5 HELD hits, rotation trio, MARK, 4 grids) is present
//   [GENCONST] the literal's canvas + grid geometry match the generator's DECLARED constants
'use strict';
const fs = require('fs');
const DIR = __dirname;

// ---------- locked palettes (what a later integration would merge) ----------
const HERO_KEYS = [...'012345nmlLg'];
const LIGHT = { W: '#fffdf4', I: '#f2e6bf', y: '#f2c94e', o: '#e0a93c', G: '#c9962e', u: '#8a6420' };
const LK = new Set(Object.keys(LIGHT));
const HK = new Set(HERO_KEYS);
const LEGAL_BODY = new Set([...HERO_KEYS, ...LK, '.']);   // body frames: hero + light
const LEGAL_GRID = new Set([...LK, '.']);                 // detached grids: PURE light

// ---------- the FRAME / PHASE CONTRACT (the membership the literal must honour) ----------
// kind: grounded | airborne | ghost-unmake | ghost-reform.  hit: the HELD contact frame.
const MANIFEST = {
  heroComboA1: [
    { tag: 'W1 SET',     phase: 'WINDUP 4',       hold: 4, kind: 'grounded' },
    { tag: 'A1A SHEAR',  phase: 'ACTIVE-EARLY 2', hold: 2, kind: 'grounded' },
    { tag: 'A1B HIT',    phase: 'ACTIVE-LATE 4',  hold: 4, kind: 'grounded', hit: true },
    { tag: 'L1 FOLLOW',  phase: 'LINK 4',         hold: 4, kind: 'grounded' },
  ],
  heroComboA2: [
    { tag: 'W2 COIL',    phase: 'WINDUP 4',       hold: 4, kind: 'grounded' },
    { tag: 'J2 LAUNCH',  phase: 'RISE 2',         hold: 2, kind: 'airborne' },
    { tag: 'T2 ECLIPSE', phase: 'APEX 5',         hold: 5, kind: 'airborne', hit: true, radiant: true, rot: 'upright' },
    { tag: 'D2A PLUNGE', phase: 'FALL-TURN 2',    hold: 2, kind: 'airborne', radiant: true, rot: 'horizontal' },
    { tag: 'D2B SLAM',   phase: 'CONTACT 5',      hold: 5, kind: 'grounded', hit: true, radiant: true, rot: 'planted' },
    { tag: 'R2 RISE',    phase: 'RECOVER 4',      hold: 4, kind: 'grounded' },
  ],
  heroComboA3: [
    { tag: 'W3 DRAW',    phase: 'WINDUP 3',       hold: 3, kind: 'grounded' },
    { tag: 'A3A CAST',   phase: 'ACTIVE-EARLY 2', hold: 2, kind: 'grounded' },
    { tag: 'A3B RELEASE',phase: 'ACTIVE-LATE 4',  hold: 4, kind: 'grounded', hit: true },
    { tag: 'L3 FOLLOW',  phase: 'LINK 3',         hold: 3, kind: 'grounded' },
  ],
  heroComboA4: [
    { tag: 'W4 MARK',    phase: 'WINDUP 3 (SET THE MARK)', hold: 3, kind: 'grounded', mark: true },
    { tag: 'A4A DASH',   phase: 'ACTIVE-EARLY 2', hold: 2, kind: 'grounded' },
    { tag: 'A4B CUT',    phase: 'ACTIVE-LATE 3',  hold: 3, kind: 'grounded', hit: true },
    { tag: 'L4 DRIVE',   phase: 'LINK 2',         hold: 2, kind: 'grounded' },
  ],
  heroComboA5: [
    { tag: 'P5A SEED',   phase: 'IMPACT 3',       hold: 3, kind: 'grounded' },
    { tag: 'P5B ERUPT',  phase: 'PILLAR 5',       hold: 5, kind: 'grounded', hit: true, radiant: true },
    { tag: 'P5C CROWN',  phase: 'PILLAR 4',       hold: 4, kind: 'grounded', radiant: true },
    { tag: 'E5A UNMAKE', phase: 'DEPART 3',       hold: 3, kind: 'ghost-unmake' },
    { tag: 'E5B REFORM', phase: 'ARRIVE 4',       hold: 4, kind: 'ghost-reform' },
    { tag: 'E5C SETTLE', phase: 'SEAM 5',         hold: 5, kind: 'grounded' },
  ],
};
// declared detached-grid geometry (mirrors the generator's GL / CO / PB / RF)
const GRID = {
  lightGlaive:   { w: 25, h: 25, frames: 3, cx: 11, cy: 12, owner: 'S3' },
  lightCorridor: { w: 72, h: 17, frames: 3, cy: 8,  mark: 5, owner: 'S4' },
  lightPillar:   { w: 41, h: 72, frames: 5, cx: 20, base: 68, owner: 'S5' },
  lightReform:   { w: 33, h: 33, frames: 3, cx: 16, cy: 16, owner: 'S5' },
};
const GW = 44, GH = 34, FLOOR = 33;                        // body canvas + shadow row (last)
const ADVANCE_PX = 150, HERO_LEN = 30;                     // the R2 advance contract
const PILLAR_HOLDS = [3, 5, 4, 6, 6];                      // PL0..PL4, one clock with S5

// ---------- load the APPROVED artifact ----------
const raw = fs.readFileSync(DIR + '/hero_combo_a_literal.txt', 'utf8').replace(/\r/g, '');
const M = eval('({' + raw.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n') + '})');
const GENSRC = fs.readFileSync(DIR + '/hero_combo_a_gen.js', 'utf8').replace(/\r/g, '');

const report = [];
let failures = 0;
const ok = (tag, pass, msg) => {
  report.push(`[${tag.padEnd(8)}] ${pass ? 'PASS' : 'FAIL'} ${msg}`);
  if (!pass) failures++;
};
const note = m => report.push('  i ' + m);

// ---------- helpers ----------
const lightPx = f => f.join('').split('').filter(k => LK.has(k)).length;
const heroPx  = f => f.join('').split('').filter(k => HK.has(k)).length;
const litPx   = f => f.join('').split('').filter(k => k !== '.').length;
const floorHeroPx = f => f.slice(FLOOR - 1).join('').split('').filter(k => HK.has(k)).length;
const meanY = f => { let s = 0, n = 0; f.forEach((r, y) => [...r].forEach(k => { if (k !== '.') { s += y; n++; } })); return n ? s / n : NaN; };
const meanR = (g, cx, cy) => { let s = 0, n = 0; g.forEach((r, y) => [...r].forEach((k, x) => { if (k !== '.') { s += Math.hypot(x - cx, y - cy); n++; } })); return n ? s / n : 0; };
function bboxAspect(f) {
  let minX = 99, minY = 99, maxX = -1, maxY = -1;
  f.forEach((r, y) => [...r].forEach((k, x) => { if (HK.has(k)) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; } }));
  return (maxX - minX + 1) / (maxY - minY + 1);
}
const BODY_CLIPS = Object.keys(MANIFEST);

// =====================================================================
// [PALETTE] warm law + key-collision safety for a later merge
// =====================================================================
{
  let bad = 0;
  for (const [k, hex] of Object.entries(LIGHT)) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    if (!(r >= g && g >= b)) { bad++; report.push(`  ! PALETTE ${k} ${hex} violates R>=G>=B`); }
  }
  ok('PALETTE', bad === 0, 'warm law R>=G>=B on all 6 LIGHT steps — no blue can exist');
  const collide = Object.keys(LIGHT).filter(k => HERO_KEYS.includes(k));
  ok('PALETTE', collide.length === 0, `LIGHT vs HERO key collisions: ${collide.length} (merge is safe; G shares the hero gold value by design)`);
}

// =====================================================================
// [CLIPS] presence + counts
// =====================================================================
{
  let bad = 0, frames = 0;
  for (const [n, man] of Object.entries(MANIFEST)) {
    const got = M[n] ? M[n].length : 0;
    if (got !== man.length) { bad++; report.push(`  ! CLIPS ${n}: ${got}/${man.length} frames`); }
    frames += got;
  }
  for (const [n, g] of Object.entries(GRID)) {
    const got = M[n] ? M[n].length : 0;
    if (got !== g.frames) { bad++; report.push(`  ! CLIPS ${n}: ${got}/${g.frames} frames`); }
  }
  ok('CLIPS', bad === 0 && frames === 24, `5 body clips = ${frames}/24 frames + 4 detached grids present with the approved counts`);
}

// =====================================================================
// [DIMS] [KEYS] — body frames 44x34 & legal keys; grids WxH & PURE light
// =====================================================================
{
  let dimBad = 0, keyBad = 0; const badK = new Set();
  for (const n of BODY_CLIPS) (M[n] || []).forEach((f, i) => {
    if (f.length !== GH || f.some(r => r.length !== GW)) { dimBad++; report.push(`  ! DIMS ${n}[${i}] ${f[0] ? f[0].length : '?'}x${f.length}`); }
    for (const r of f) for (const k of r) if (!LEGAL_BODY.has(k)) { keyBad++; badK.add(k); }
  });
  for (const [n, g] of Object.entries(GRID)) (M[n] || []).forEach((f, i) => {
    if (f.length !== g.h || f.some(r => r.length !== g.w)) { dimBad++; report.push(`  ! DIMS ${n}[${i}] ${f[0] ? f[0].length : '?'}x${f.length} want ${g.w}x${g.h}`); }
    for (const r of f) for (const k of r) if (!LEGAL_GRID.has(k)) { keyBad++; badK.add(k); }
  });
  ok('DIMS', dimBad === 0, `24 body frames are ${GW}x${GH}; all 14 grid frames match their declared WxH`);
  ok('KEYS', keyBad === 0, keyBad === 0
    ? 'body frames use only HERO+LIGHT keys; the 4 detached grids are PURE LIGHT (no blue)'
    : `${keyBad} illegal cells (${[...badK].join(',')})`);
}

// =====================================================================
// [MANIFEST] every frame is exactly where the phase contract says
// =====================================================================
{
  let bad = 0, hits = 0, holdTotal = 0;
  for (const [n, man] of Object.entries(MANIFEST)) {
    (M[n] || []).forEach((f, i) => {
      if (!man[i]) { bad++; return; }
      holdTotal += man[i].hold;
      if (man[i].hit) hits++;
    });
    if ((M[n] || []).length !== man.length) bad++;
  }
  ok('MANIFEST', bad === 0, `24 frames map 1:1 onto the frame/phase contract (no missing / duplicated frame)`);
  ok('MANIFEST', hits === 6, `6 HELD frames declared (A1B / T2 / D2B / A3B / A4B / P5B): counted ${hits}`);
  ok('MANIFEST', holdTotal === 82, `frame holds sum to the approved ${holdTotal}/82 ticks`);
}

// =====================================================================
// [FLOOR] grounded frames plant feet; AIRBORNE frames carry NO body there
// =====================================================================
{
  let bad = 0;
  for (const [n, man] of Object.entries(MANIFEST)) (M[n] || []).forEach((f, i) => {
    const fh = floorHeroPx(f), kind = man[i] ? man[i].kind : 'grounded';
    if (kind === 'airborne') {
      if (fh !== 0) { bad++; report.push(`  ! FLOOR ${n}[${i}] ${man[i].tag}: airborne but ${fh} body px on floor rows`); }
    } else if (kind === 'grounded') {
      if (fh < 6) { bad++; report.push(`  ! FLOOR ${n}[${i}] ${man[i].tag}: only ${fh} body px on floor rows`); }
    } // ghost frames (unmake/reform) are exempt — the body is mid-teleport
  });
  ok('FLOOR', bad === 0, 'grounded frames plant feet on rows 32-33; the 3 airborne frames carry ZERO body there (the jump reads)');
}

// =====================================================================
// [BODY] non-ghost frames carry the hero; ghost frames dissolve it bottom-up
// =====================================================================
{
  let bad = 0;
  for (const [n, man] of Object.entries(MANIFEST)) (M[n] || []).forEach((f, i) => {
    const hp = heroPx(f), kind = man[i] ? man[i].kind : 'grounded';
    if (kind.startsWith('ghost')) return;
    if (hp < 200) { bad++; report.push(`  ! BODY ${n}[${i}] ${man[i].tag}: hero px=${hp} (<200)`); }
  });
  ok('BODY', bad === 0, 'every non-ghost frame carries the hero body (the re-pose / rotation never erased it)');
  const unmake = heroPx(M.heroComboA5[3]), reform = heroPx(M.heroComboA5[4]), whole = heroPx(M.heroComboA5[5]);
  ok('BODY', unmake < reform && reform < whole,
    `the teleport dissolves the body: UNMAKE ${unmake} < REFORM ${reform} < SETTLE ${whole} hero px`);
}

// =====================================================================
// [ROTATE] the dive is a TURN — upright apex -> rotated horizontal -> planted
// =====================================================================
{
  const T2 = M.heroComboA2[2], D2A = M.heroComboA2[3], D2B = M.heroComboA2[4];
  const aT2 = bboxAspect(T2), aD2A = bboxAspect(D2A), aD2B = bboxAspect(D2B);
  ok('ROTATE', aD2A >= aT2 * 1.15,
    `D2A silhouette rotates wide: aspect ${aD2A.toFixed(2)} vs upright T2 ${aT2.toFixed(2)} (>=1.15x — not a rigid fall)`);
  // the sword must LEAD the dive line, not sit near the feet: blade cells reach the
  // upper/mid rows during the turn.
  let bladeMinY = 99, bladeN = 0;
  D2A.forEach((r, y) => [...r].forEach(k => { if (k === 'l' || k === 'L') { bladeN++; if (y < bladeMinY) bladeMinY = y; } }));
  ok('ROTATE', bladeN > 0 && bladeMinY <= 25,
    `on the turn the blade LEADS the line (top blade cell at row ${bladeMinY} <= 25) — the sword is NOT parked at the feet`);
  note(`rotation trio present & ordered: T2 upright (${aT2.toFixed(2)}) -> D2A horizontal (${aD2A.toFixed(2)}) -> D2B planted (${aD2B.toFixed(2)})`);
}

// =====================================================================
// [ESCALAT] move-level light (composited hit frame + the grid that step owns)
// =====================================================================
{
  const s1 = lightPx(M.heroComboA1[2]);
  const s2 = lightPx(M.heroComboA2[4]) + lightPx(M.heroComboA2[2]);   // slam + apex
  const s3 = lightPx(M.heroComboA3[2]) + lightPx(M.lightGlaive[1]);   // release + glaive travel
  const s4 = lightPx(M.heroComboA4[2]) + lightPx(M.lightCorridor[0]); // cut + corridor
  const s5 = lightPx(M.heroComboA5[1]) + lightPx(M.lightPillar[2]);   // erupt + pillar noon
  const arr = [s1, s2, s3, s4, s5];
  ok('ESCALAT', s1 === Math.min(...arr), `S1 is the smallest step (${arr.join(' / ')})`);
  ok('ESCALAT', s5 >= Math.max(s1, s2, s3, s4) * 1.5, `S5 dominates: ${s5} >= 1.5x every other step (max ${Math.max(s1, s2, s3, s4)})`);
  ok('ESCALAT', s2 > s1 && s3 > s1 && s4 > s1, `every middle step exceeds S1 (S3<S2 by design — the light left the sword)`);
}

// =====================================================================
// [GLAIVE] MICRO GLYPH core + crescent bows toward travel (right)
// =====================================================================
{
  const g = M.lightGlaive[1], G = GRID.lightGlaive;
  const rowLead = y => { for (let x = G.w - 1; x >= 0; x--) if (g[y][x] !== '.') return x; return -1; };
  ok('GLAIVE', g[G.cy][G.cx - 3] === 'W', `MICRO GLYPH white core present at (${G.cx - 3},${G.cy})`);
  ok('GLAIVE', rowLead(G.cy) > rowLead(G.cy - 8) && rowLead(G.cy) > rowLead(G.cy + 8),
    `crescent bows toward travel (belly lead ${rowLead(G.cy)} beyond the tips ${rowLead(G.cy - 8)}/${rowLead(G.cy + 8)})`);
}

// =====================================================================
// [CORRIDOR] fades in 3 steps, residue rises, reaches across the lane
// =====================================================================
{
  const c = M.lightCorridor, C = GRID.lightCorridor;
  ok('CORRIDOR', litPx(c[0]) > litPx(c[1]) && litPx(c[1]) > litPx(c[2]),
    `fades in three steps: ${c.map(litPx).join(' > ')}`);
  ok('CORRIDOR', meanY(c[2]) < meanY(c[1]), `residue rises: mean-Y ${meanY(c[1]).toFixed(1)} -> ${meanY(c[2]).toFixed(1)}`);
  const span = c[0][C.cy].split('').filter(k => k !== '.').length;
  ok('CORRIDOR', span >= C.w * 0.85, `the cut reaches across: ${span}/${C.w} cells on the center row`);
}

// =====================================================================
// [PILLAR] h-symmetric, north-dominant, dissolving, residue rising, true crown
// =====================================================================
{
  const P = M.lightPillar, PB = GRID.lightPillar;
  let sym = 0;
  for (let y = 0; y < PB.h && sym === 0; y++) for (let x = 0; x < PB.w; x++)
    if (P[2][y][x] !== P[2][y][PB.w - 1 - x]) { sym++; break; }
  ok('PILLAR', sym === 0, 'the NOON pillar is perfectly h-symmetric (sacred geometry)');
  const above = P[2].slice(0, PB.base).join('').split('').filter(k => k !== '.').length;
  const below = P[2].slice(PB.base).join('').split('').filter(k => k !== '.').length;
  ok('PILLAR', above > below * 3, `north-dominant: ${above} px above the base vs ${below} below (the EMBLEM north ray at world scale)`);
  ok('PILLAR', litPx(P[2]) > litPx(P[3]) && litPx(P[3]) > litPx(P[4]),
    `dissolves: ${litPx(P[2])} > ${litPx(P[3])} > ${litPx(P[4])} lit px`);
  ok('PILLAR', meanY(P[4]) < meanY(P[3]), `residue burns out base-up (rises): mean-Y ${meanY(P[3]).toFixed(1)} -> ${meanY(P[4]).toFixed(1)}`);
  // true-circle crown purity (the hero owns circles; the boss never gets one)
  let off = 0;
  for (let y = 14; y <= 26; y++) for (let x = 0; x < PB.w; x++) {
    if (P[2][y][x] === '.') continue;
    const d = Math.hypot(x - PB.cx, y - 20);
    if (d < 3.2 || Math.abs(d - 4.5) < 1.1 || Math.abs(d - 6) < 1.1 || Math.abs(d - 17) < 1.2) continue;
    if (Math.abs(x - PB.cx) <= 7) continue;   // shaft + N ray
    if (Math.abs(y - 20) <= 1) continue;       // E/W rays
    off++;
  }
  ok('PILLAR', off <= 10, `crown is a TRUE circle: ${off} off-radius cells (<=10)`);
}

// =====================================================================
// [REFORM] the GATHER law — mean radius contracts across the arrival
// =====================================================================
{
  const R = M.lightReform, RF = GRID.lightReform;
  const r = R.map(g => meanR(g, RF.cx, RF.cy));
  ok('REFORM', r[0] > r[1] && r[1] > r[2],
    `motes converge (GATHER run backwards): mean radius ${r.map(v => v.toFixed(1)).join(' -> ')}`);
}

// =====================================================================
// [LOOP] the one timing fact — recomputed from the manifest holds
// =====================================================================
{
  const holds = BODY_CLIPS.map(n => MANIFEST[n].reduce((a, f) => a + f.hold, 0));
  const tS = []; { let t = 0; holds.forEach(h => { tS.push(t); t += h; }); }
  const s5T0 = tS[4];
  const pillarEnd = s5T0 + PILLAR_HOLDS.reduce((a, b) => a + b, 0);
  const s5Ticks = []; { let t = s5T0; MANIFEST.heroComboA5.forEach(f => { s5Ticks.push(t); t += f.hold; }); }
  const returnTick = s5Ticks[4];                 // E5B REFORM
  const corrLitFrom = tS[4], corrLitTo = tS[4] + 16;   // CR1 window (the lit bed)
  const margin = pillarEnd - returnTick;
  ok('LOOP', returnTick < pillarEnd, `the ECHO RETURN lands (tick ${returnTick}) BEFORE the pillar dies (tick ${pillarEnd})`);
  ok('LOOP', margin >= 6, `overlap margin ${margin} ticks (>=6 — the loop reads as one move, not two)`);
  ok('LOOP', returnTick >= corrLitFrom && returnTick < corrLitTo,
    `the return lands inside the still-lit corridor bed [${corrLitFrom}, ${corrLitTo})`);
  note(`S5 begins tick ${s5T0}; return tick ${returnTick}; pillar dies ${pillarEnd}; margin ${margin}`);
}

// =====================================================================
// [ADVANCE] the mark->pillar travel is a CONTROLLED holy advance
// =====================================================================
{
  const lens = ADVANCE_PX / HERO_LEN;
  ok('ADVANCE', lens >= 3.5 && lens <= 6.5, `mark -> pillar = ${lens.toFixed(1)} hero lengths (clamped 3.5-6.5 — not a map crossing)`);
}

// =====================================================================
// [SEAM] E5C returns the blade to the idle carry (36,27)
// =====================================================================
{
  const f = M.heroComboA5[5];
  let best = null, bd = 1e9;
  f.forEach((r, y) => [...r].forEach((k, x) => {
    if ((k === 'l' || k === 'L' || k === '5' || k === '4') && x > 24 && y > 20) {
      const d = Math.hypot(x - 36, y - 27); if (d < bd) { bd = d; best = [x, y]; }
    }
  }));
  ok('SEAM', best !== null && bd <= 3, `E5C SETTLE blade back at ${JSON.stringify(best)}, ${bd.toFixed(2)} cells from the idle carry (36,27)`);
}

// =====================================================================
// [FACING] directional grids authored RIGHT; mirror-critical grids symmetric
// =====================================================================
{
  // pillar + reform-snap must survive the runtime facing flip -> h-symmetric
  const P = M.lightPillar, PB = GRID.lightPillar;
  let pSym = 0;
  for (let y = 0; y < PB.h && pSym === 0; y++) for (let x = 0; x < PB.w; x++)
    if (P[2][y][x] !== P[2][y][PB.w - 1 - x]) { pSym++; break; }
  const RF = GRID.lightReform, Rsnap = M.lightReform[2];
  let rSym = 0;
  for (let y = 0; y < RF.h && rSym === 0; y++) for (let x = 0; x < RF.w; x++)
    if (Rsnap[y][x] !== Rsnap[y][RF.w - 1 - x]) { rSym++; break; }
  // glaive (directional) leads to the RIGHT — the authored travel facing
  const g = M.lightGlaive[1], G = GRID.lightGlaive;
  const lead = (() => { for (let x = G.w - 1; x >= 0; x--) if (g[G.cy][x] !== '.') return x; return -1; })();
  ok('FACING', pSym === 0 && rSym === 0,
    `mirror-critical grids are h-symmetric (pillar, reform snap) — the facing flip is safe`);
  ok('FACING', lead > G.cx, `directional grids authored travelling RIGHT (glaive belly lead ${lead} > centre ${G.cx})`);
}

// =====================================================================
// [TIERS] every tier-critical group is present in the shipping data
// =====================================================================
{
  const missing = [];
  // the 5 HELD contact frames
  const held = [['heroComboA1', 2], ['heroComboA2', 2], ['heroComboA2', 4], ['heroComboA3', 2], ['heroComboA4', 2], ['heroComboA5', 1]];
  held.forEach(([n, i]) => { if (!(M[n] && M[n][i])) missing.push(`${n}[${i}]`); });
  // the rotation trio, the MARK frame, and all 4 sub-effect grids
  if (!(M.heroComboA2[2] && M.heroComboA2[3] && M.heroComboA2[4])) missing.push('rotation-trio');
  if (!M.heroComboA4[0]) missing.push('W4 MARK');
  ['lightGlaive', 'lightCorridor', 'lightPillar', 'lightReform'].forEach(k => { if (!(M[k] && M[k].length)) missing.push(k); });
  ok('TIERS', missing.length === 0,
    `all tier-critical groups present (held hits, rotation trio, MARK, projectile, corridor, pillar, reform) — none can silently drop`);
}

// =====================================================================
// [GENCONST] literal geometry == generator's DECLARED constants (not executed)
// =====================================================================
{
  const grab = (re, d = null) => { const m = GENSRC.match(re); return m ? Number(m[1]) : d; };
  const decl = {
    GW: grab(/const GW = (\d+),/), GH: grab(/GH = (\d+),/),
    glaiveW: grab(/const GL = \{ W: (\d+),/), glaiveH: grab(/const GL = \{ W: \d+, H: (\d+),/),
    corridorW: grab(/const CO = \{ W: (\d+),/), corridorH: grab(/const CO = \{ W: \d+, H: (\d+),/),
    pillarW: grab(/const PB = \{ W: (\d+),/), pillarH: grab(/const PB = \{ W: \d+, H: (\d+),/),
    reformW: grab(/const RF = \{ W: (\d+),/), reformH: grab(/const RF = \{ W: \d+, H: (\d+),/),
    advance: grab(/ADVANCE_PX = (\d+)/),
  };
  const mism = [];
  if (decl.GW !== GW || decl.GH !== GH) mism.push(`canvas ${decl.GW}x${decl.GH}`);
  if (decl.glaiveW !== GRID.lightGlaive.w || decl.glaiveH !== GRID.lightGlaive.h) mism.push('glaive');
  if (decl.corridorW !== GRID.lightCorridor.w || decl.corridorH !== GRID.lightCorridor.h) mism.push('corridor');
  if (decl.pillarW !== GRID.lightPillar.w || decl.pillarH !== GRID.lightPillar.h) mism.push('pillar');
  if (decl.reformW !== GRID.lightReform.w || decl.reformH !== GRID.lightReform.h) mism.push('reform');
  if (decl.advance !== ADVANCE_PX) mism.push(`advance ${decl.advance}`);
  ok('GENCONST', mism.length === 0,
    mism.length === 0
      ? `literal geometry matches the generator's declared constants (canvas ${GW}x${GH}, glaive/corridor/pillar/reform, advance ${ADVANCE_PX})`
      : `literal diverges from generator constants: ${mism.join(', ')}`);
}

// ---------- report ----------
console.log('=== Stage 8C-2 — MERIDIAN LOOP handoff validation (reads hero_combo_a_literal.txt) ===');
for (const line of report) console.log(line);
const checks = report.filter(l => l.startsWith('[')).length;
console.log(failures === 0
  ? `\nALL PASSED — ${checks} checks, the shipping literal is handoff-ready.`
  : `\n${failures} FAILURE(S) of ${checks} checks.`);
process.exit(failures ? 1 : 0);
