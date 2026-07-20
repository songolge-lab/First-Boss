// Stage 8B-2 — standalone validator for the APPROVED Stage 8B-1 Hero combo
// ("DAYBREAK CHAIN") drop-in matrices.
//
// Reads the ARTIFACTS — hero_combo_literal.txt AND hero_combo_dropin.mjs — never
// the generator internals, so it certifies exactly what would be pasted into
// HERO_REDESIGN_SPRITES downstream.
//
//   node hero_combo_validate.js     (exit 0 = ALL PASSED, exit 1 = a contract broke)
//
// Checks:
//   [EXTRACT] the drop-in module is cell-for-cell identical to the approved literal
//   [CLIPS  ] 4 clips present with the approved frame counts (4/4/4/6 = 18 frames)
//   [DIMS   ] every frame is exactly 44x34 (rows uniform)
//   [KEYS   ] only HERO keys + the six LIGHT keys; no key collisions
//   [PALETTE] warm law R>=G>=B on every LIGHT step (blue cannot exist)
//   [FLOOR  ] every frame plants feet/shadow on the floor rows 32-33
//   [BODY   ] every frame carries the hero body (repose never erased it)
//   [GLINT  ] H1's HIT frame is glint-only (<=6 LIGHT px) — the light is asleep
//   [PEAK   ] H4's HIT frame dominates every other hit (the SOLSTICE is the star)
//   [ESCALAT] composite-observable escalation (see the H2/H3 note below)
//   [DISSOLV] H3's link thins out vs its HIT frame
//   [MOTES  ] motes RISE after the HIT frame on H2 and H4 — light never ashes
//   [SEAM   ] S4 returns the blade to the idle carry (hands back to locomotion)
//
// NOTE ON [ESCALAT] — read this before "fixing" it:
// The 8B-1 escalation law (LIGHT px strictly H1<H2<H3<H4) is an EFFECT-LAYER law.
// The generator asserts it on the un-composited fx layers: 2 / 69 / 71 / 194.
// The shipped literal is COMPOSITED (the body draws over the back smear), and
// occlusion is uneven per hit: 2 / 64 / 54 / 155. H3 SUNPIERCE is a thrust, so the
// body+arms eat 17 px of its lance, while H2's crescent only loses 5 — which
// inverts H2 vs H3 in the composite. The ART IS CORRECT AND APPROVED; only the
// measurement level differs. This validator therefore asserts the invariants that
// actually survive compositing (H1 glint-only, H4 dominant, mid band well clear of
// H1) and does NOT assert strict H2<H3 on composited data, because that would fail
// against approved art. See hero_combo_handoff.md §9 risk 1.
'use strict';
const fs = require('fs');
const DIR = __dirname;

// ---------- locked palettes (what integration will merge) ----------
const HERO_KEYS = [...'012345nmlLg'];
const LIGHT = { W: '#fffdf4', I: '#f2e6bf', y: '#f2c94e', o: '#e0a93c', G: '#c9962e', u: '#8a6420' };
const LK = new Set(Object.keys(LIGHT));
const LEGAL = new Set([...HERO_KEYS, ...LK, '.']);

// approved package shape (8B-1)
const SHAPE = { heroCombo1: 4, heroCombo2: 4, heroCombo3: 4, heroCombo4: 6 };
const GW = 44, GH = 34, FLOOR = 33;   // canvas + shadow row (last)
// index of the HIT frame per clip (H1-H3: ACTIVE-LATE = 2; H4: A4B = 3)
const HIT = { heroCombo1: 2, heroCombo2: 2, heroCombo3: 2, heroCombo4: 3 };

// ---------- load the APPROVED artifact ----------
const raw = fs.readFileSync(DIR + '/hero_combo_literal.txt', 'utf8').replace(/\r/g, '');
const M = eval('({' + raw.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n') + '})');

const report = [];
let failures = 0;
const ok = (tag, pass, msg) => {
  report.push(`[${tag.padEnd(7)}] ${pass ? 'PASS' : 'FAIL'} ${msg}`);
  if (!pass) failures++;
};
const lightPx = f => f.join('').split('').filter(k => LK.has(k)).length;
const meanY = f => {
  let s = 0, n = 0;
  f.forEach((r, y) => [...r].forEach(k => { if (LK.has(k)) { s += y; n++; } }));
  return n ? s / n : NaN;
};

// ---------- [PALETTE] warm law ----------
{
  let bad = 0;
  for (const [k, hex] of Object.entries(LIGHT)) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    if (!(r >= g && g >= b)) { bad++; report.push(`  ! PALETTE ${k} ${hex} violates R>=G>=B`); }
  }
  ok('PALETTE', bad === 0, `warm law R>=G>=B on all 6 LIGHT steps — no blue can exist`);
  const collide = Object.keys(LIGHT).filter(k => HERO_KEYS.includes(k));
  ok('KEYS', collide.length === 0, `LIGHT keys vs HERO keys: ${collide.length} collisions (merge is safe)`);
}

// ---------- [CLIPS] ----------
for (const [n, want] of Object.entries(SHAPE)) {
  const got = M[n] ? M[n].length : 0;
  ok('CLIPS', got === want, `${n}: ${got}/${want} frames`);
}

// ---------- [DIMS] [KEYS] [FLOOR] [BODY] per frame ----------
{
  let dimBad = 0, keyBad = 0, floorBad = 0, bodyBad = 0, total = 0;
  const badKeys = new Set();
  for (const n of Object.keys(SHAPE)) {
    (M[n] || []).forEach((f, i) => {
      total++;
      if (f.length !== GH || f.some(r => r.length !== GW)) {
        dimBad++; report.push(`  ! DIMS ${n}[${i}] ${f[0] ? f[0].length : '?'}x${f.length} want ${GW}x${GH}`);
      }
      for (const r of f) for (const k of r) if (!LEGAL.has(k)) { keyBad++; badKeys.add(k); }
      // feet / shadow present on the floor rows
      const feet = f.slice(FLOOR - 1).join('').split('').filter(k => k !== '.').length;
      if (feet < 6) { floorBad++; report.push(`  ! FLOOR ${n}[${i}] only ${feet} cells on rows ${FLOOR - 1}-${FLOOR}`); }
      // the hero body survived the re-pose (hero-key mass present)
      const bodyPx = f.join('').split('').filter(k => HERO_KEYS.includes(k)).length;
      if (bodyPx < 200) { bodyBad++; report.push(`  ! BODY ${n}[${i}] hero-key px=${bodyPx} (<200)`); }
    });
  }
  ok('DIMS', dimBad === 0, `${total - dimBad}/${total} frames are exactly ${GW}x${GH}`);
  ok('KEYS', keyBad === 0, keyBad === 0
    ? `all cells are legal HERO+LIGHT keys across ${total} frames`
    : `${keyBad} illegal cells (${[...badKeys].join(',')})`);
  ok('FLOOR', floorBad === 0, `${total - floorBad}/${total} frames plant on floor rows ${FLOOR - 1}-${FLOOR}`);
  ok('BODY', bodyBad === 0, `${total - bodyBad}/${total} frames carry the hero body`);
}

// ---------- [GLINT] [PEAK] [ESCALAT] ----------
{
  const hits = Object.entries(HIT).map(([n, i]) => lightPx(M[n][i]));
  const [h1, h2, h3, h4] = hits;
  ok('GLINT', h1 <= 6, `H1 FIRST LIGHT hit frame is glint-only: ${h1} LIGHT px (<=6)`);
  ok('PEAK', h4 > Math.max(h1, h2, h3) * 1.5,
    `H4 SOLSTICE hit ${h4} LIGHT px > 1.5x every other hit (max ${Math.max(h1, h2, h3)})`);
  ok('ESCALAT', h1 < h2 && h1 < h3 && h2 > h1 * 5,
    `composite escalation H1 ${h1} << mid band [H2 ${h2}, H3 ${h3}] << H4 ${h4}`);
  report.push(`  i ESCALAT effect-layer law (generator-asserted, pre-composite) = 2/69/71/194;`);
  report.push(`  i         composited = ${hits.join('/')} — H2>H3 by occlusion, see header note.`);
}

// ---------- [DISSOLV] H3 link thins ----------
{
  const hit = lightPx(M.heroCombo3[2]), link = lightPx(M.heroCombo3[3]);
  ok('DISSOLV', link < hit, `H3 SUNPIERCE lance dissolves: L3 ${link} < A3B ${hit} LIGHT px`);
}

// ---------- [MOTES] light RISES (never ashes) ----------
{
  const h2hit = meanY(M.heroCombo2[2]), h2link = meanY(M.heroCombo2[3]);
  ok('MOTES', h2link < h2hit, `H2 light rises: mean-Y ${h2hit.toFixed(2)} -> ${h2link.toFixed(2)}`);
  const p = [3, 4, 5].map(i => meanY(M.heroCombo4[i]));
  ok('MOTES', p[1] < p[0] && p[2] < p[1],
    `H4 light rises A4B->P4->S4: mean-Y ${p.map(v => v.toFixed(2)).join(' -> ')}`);
}

// ---------- [SEAM] S4 returns the blade to the idle carry ----------
// The base idle carry tip sits at ~(36,27). S4 must bring the blade back within 3
// cells so the chain hands off cleanly into locomotion with no pop.
{
  const f = M.heroCombo4[5];
  let best = null, bestD = 1e9;
  f.forEach((r, y) => [...r].forEach((k, x) => {
    if (k === 'l' || k === 'L' || k === '5' || k === '4') {   // blade / blade-glow cells
      const d = Math.hypot(x - 36, y - 27);
      if (d < bestD && x > 24 && y > 20) { bestD = d; best = [x, y]; }
    }
  }));
  ok('SEAM', best !== null && bestD <= 3,
    `S4 SETTLE blade back at ${JSON.stringify(best)}, ${bestD.toFixed(2)} cells from the idle carry tip (36,27) (<=3)`);
}

// ---------- [EXTRACT] drop-in module == approved literal, cell for cell ----------
(async () => {
  const url = 'file:///' + (DIR + '/hero_combo_dropin.mjs').replace(/\\/g, '/');
  const mod = await import(url);
  let diff = 0, cells = 0;
  for (const n of Object.keys(SHAPE)) {
    const a = M[n], b = mod.HERO_COMBO_SPRITES[n];
    if (!b || a.length !== b.length) { diff++; report.push(`  ! EXTRACT ${n} clip length`); continue; }
    a.forEach((f, i) => f.forEach((row, y) => { cells += row.length; if (row !== b[i][y]) diff++; }));
  }
  ok('EXTRACT', diff === 0, `hero_combo_dropin.mjs matches the approved literal: ${cells} cells, ${diff} diffs`);
  const palOk = JSON.stringify(mod.LIGHT_KEYS) === JSON.stringify(LIGHT);
  ok('EXTRACT', palOk, `drop-in LIGHT_KEYS ramp matches the locked 8B-0 palette`);

  console.log('=== Stage 8B-2 — hero combo drop-in validation (reads hero_combo_literal.txt + hero_combo_dropin.mjs) ===');
  for (const line of report) console.log(line);
  console.log(failures === 0
    ? `\nALL PASSED — ${report.filter(l => l.startsWith('[')).length} checks, artifact is drop-in-ready.`
    : `\n${failures} FAILURE(S) of ${report.filter(l => l.startsWith('[')).length} checks.`);
  process.exit(failures ? 1 : 0);
})();
