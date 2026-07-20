// Stage 8B-2 — standalone validator for the APPROVED Stage 8B-0 HERO LIGHT ECLIPSE
// reusable VFX family drop-in grids.
//
// Reads the ARTIFACTS — hero_eclipse_literal.txt AND hero_light_eclipse_dropin.mjs —
// never the generator internals, so it certifies exactly what would be pasted into
// the SpriteManager painters downstream.
//
//   node hero_eclipse_validate.js   (exit 0 = ALL PASSED, exit 1 = a contract broke)
//
// Checks (each one is an APPROVED 8B-0 design law, re-proven on the shipped data):
//   [EXTRACT] the drop-in module is cell-for-cell identical to the approved literal
//   [FAMILY ] all six families present with the approved cell counts
//   [DIMS   ] every grid matches its declared canvas (rows uniform)
//   [PALETTE] warm law R>=G>=B on all 6 steps — blue cannot exist in the ramp
//   [NOBLUE ] every EFFECT grid uses LIGHT keys ONLY — the hero's cold blues are the
//             CHARACTER and can never leak into the effect family
//   [EMBLEM ] perfect h-symmetry + white core + white/gold share balance
//   [CIRCLE ] halo cells sit on true radii — the Hero owns TRUE CIRCLES (the boss
//             owns broken octagons); this is the distinctness contract
//   [IMPACT ] the star reaches far enough to read at 2px scale
//   [CYCLE  ] gather contracts -> release expands -> dissolve thins AND RISES
//   [BFMASK ] bodyflare re-skin mask is byte-identical to the base hero matrix —
//             geometry can never desync from the character
//   [BFKEYS ] bodyflare bodies use HERO keys only (palette-only re-skin)
//   [BFNORTH] BF1 PEAK is north-dominant — light ASCENDS (inverse of the boss dive)
//   [BFFLOOR] nothing spills below the floor (front <= feet+2, back <= feet+1)
'use strict';
const fs = require('fs');
const DIR = __dirname;

const LIGHT = { W: '#fffdf4', I: '#f2e6bf', y: '#f2c94e', o: '#e0a93c', G: '#c9962e', u: '#8a6420' };
const LK = new Set(Object.keys(LIGHT));
const HERO_KEYS = new Set([...'012345nmlLg']);

// approved package shape (8B-0): name -> [w, h, cells]
const SPEC = {
  lightEmblem: [41, 41, 1],
  lightEmblemMicro: [13, 13, 1],
  lightHalo: [33, 33, 3],
  lightGroundHalo: [41, 13, 2],
  lightSlash: [37, 37, 4],
  lightImpact: [21, 21, 3],
  lightCycle: [45, 45, 8],
};
const EC = 20, HC = 16, PC = 10, CC = 22;                 // grid centres
const BF = { W: 48, H: 36, CX: 22, CY: 18, FEET: 31 };    // bodyflare geometry

const raw = fs.readFileSync(DIR + '/hero_eclipse_literal.txt', 'utf8').replace(/\r/g, '');
const M = eval('({' + raw.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n') + '})');

const report = [];
let failures = 0;
const ok = (tag, pass, msg) => {
  report.push(`[${tag.padEnd(7)}] ${pass ? 'PASS' : 'FAIL'} ${msg}`);
  if (!pass) failures++;
};
const lit = g => g.join('').split('').filter(k => k !== '.').length;
const meanY = g => {
  let s = 0, n = 0;
  g.forEach((r, y) => [...r].forEach(k => { if (k !== '.') { s += y; n++; } }));
  return n ? s / n : NaN;
};

// ---------- [PALETTE] ----------
{
  let bad = 0;
  for (const [k, hex] of Object.entries(LIGHT)) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    if (!(r >= g && g >= b)) { bad++; report.push(`  ! PALETTE ${k} ${hex} violates R>=G>=B`); }
  }
  ok('PALETTE', bad === 0, `warm law R>=G>=B on all 6 LIGHT steps — no blue can exist`);
}

// ---------- [FAMILY] [DIMS] [NOBLUE] ----------
{
  let dimBad = 0, keyBad = 0, grids = 0;
  const badKeys = new Set();
  for (const [n, [w, h, cells]] of Object.entries(SPEC)) {
    ok('FAMILY', (M[n] || []).length === cells, `${n}: ${(M[n] || []).length}/${cells} cells`);
    (M[n] || []).forEach((g, i) => {
      grids++;
      if (g.length !== h || g.some(r => r.length !== w)) {
        dimBad++; report.push(`  ! DIMS ${n}[${i}] ${g[0] ? g[0].length : '?'}x${g.length} want ${w}x${h}`);
      }
      for (const r of g) for (const k of r) if (k !== '.' && !LK.has(k)) { keyBad++; badKeys.add(k); }
    });
  }
  ok('DIMS', dimBad === 0, `${grids - dimBad}/${grids} effect grids match their declared canvas`);
  ok('NOBLUE', keyBad === 0, keyBad === 0
    ? `all ${grids} effect grids are LIGHT-keys-only — zero blue, zero hero keys`
    : `${keyBad} non-LIGHT cells leaked into the effects (${[...badKeys].join(',')})`);
}

// ---------- [EMBLEM] symmetry + core + share ----------
{
  const g = M.lightEmblem[0];
  const sym = g.every(r => r === [...r].reverse().join(''));
  ok('EMBLEM', sym, `perfect horizontal symmetry across all 41 rows`);
  ok('EMBLEM', g[EC][EC] === 'W', `core cell (${EC},${EC}) is white ('${g[EC][EC]}')`);
  const n = lit(g);
  const w = g.join('').split('').filter(k => k === 'W' || k === 'I').length;
  const gold = g.join('').split('').filter(k => 'yoGu'.includes(k)).length;
  ok('EMBLEM', w / n >= 0.2 && gold / n >= 0.4,
    `white disc in a gold corona: white/ivory ${(w / n * 100).toFixed(0)}% (>=20%), gold ${(gold / n * 100).toFixed(0)}% (>=40%)`);
  ok('EMBLEM', M.lightEmblemMicro[0].every(r => r === [...r].reverse().join('')),
    `micro glyph keeps the same symmetry at 13x13`);
}

// ---------- [CIRCLE] halo true-circle purity (the distinctness contract) ----------
{
  // Every lit cell must sit on a declared true radius (+/- 0.5 cell). The Hero owns
  // true circles; the boss Red Eclipse owns broken octagons. This must never blur.
  const RADII = { 0: [5.5, 6, 6.5, 7.5, 8, 8.5, 10], 1: [9.5, 10, 10.5, 11.5], 2: [9.5, 10, 10.5, 14.5] };
  let off = 0, cells = 0;
  M.lightHalo.forEach((g, i) => {
    g.forEach((r, y) => [...r].forEach((k, x) => {
      if (k === '.') return;
      cells++;
      const rad = Math.hypot(x - HC, y - HC);
      if (!RADII[i].some(R => Math.abs(rad - R) <= 0.5)) {
        off++; report.push(`  ! CIRCLE H${i} cell (${x},${y}) r=${rad.toFixed(2)} off every declared radius`);
      }
    }));
  });
  ok('CIRCLE', off === 0, `${cells - off}/${cells} halo cells sit on true radii — sacred geometry intact`);
}

// ---------- [IMPACT] star reach ----------
{
  const g = M.lightImpact[1];
  let reach = 0;
  g.forEach((r, y) => [...r].forEach((k, x) => {
    if (k !== '.') reach = Math.max(reach, Math.max(Math.abs(x - PC), Math.abs(y - PC)));
  }));
  ok('IMPACT', reach >= 7, `P1 STAR reaches ${reach} cells from centre (>=7)`);
}

// ---------- [CYCLE] the family grammar ----------
{
  const meanR = g => {
    let s = 0, n = 0;
    g.forEach((r, y) => [...r].forEach((k, x) => { if (k !== '.') { s += Math.hypot(x - CC, y - CC); n++; } }));
    return n ? s / n : NaN;
  };
  const [G0, G1, I0, R0, , D0, D1, D2] = M.lightCycle;
  ok('CYCLE', meanR(G0) > meanR(G1) && meanR(G1) > meanR(I0),
    `GATHER contracts: mean radius ${meanR(G0).toFixed(1)} -> ${meanR(G1).toFixed(1)} -> ${meanR(I0).toFixed(1)}`);
  ok('CYCLE', meanR(R0) > meanR(I0) * 1.6,
    `RELEASE expands: mean radius ${meanR(R0).toFixed(1)} > 1.6x ignite ${meanR(I0).toFixed(1)}`);
  ok('CYCLE', lit(D0) > lit(D1) && lit(D1) > lit(D2),
    `DISSOLVE thins: lit ${lit(D0)} -> ${lit(D1)} -> ${lit(D2)}`);
  ok('CYCLE', meanY(D2) < meanY(D1) && meanY(D1) < meanY(D0),
    `motes RISE (light never ashes): mean-Y ${meanY(D0).toFixed(1)} -> ${meanY(D1).toFixed(1)} -> ${meanY(D2).toFixed(1)}`);
}

// ---------- [BFMASK] [BFKEYS] [BFNORTH] [BFFLOOR] ----------
{
  const base = fs.readFileSync(DIR + '/hero_matrix.txt', 'utf8').replace(/\r/g, '')
    .split('\n').filter(l => l.trim().length);
  const mask = g => g.map(r => [...r].map(k => (k !== '.' ? '#' : '.')).join('')).join('\n');
  const baseMask = mask(base);

  let maskBad = 0, keyBad = 0, floorBad = 0;
  M.lightBodyFlare.forEach((fr, i) => {
    if (mask(fr.body) !== baseMask) { maskBad++; report.push(`  ! BFMASK BF${i} silhouette drifted from the base hero`); }
    fr.body.forEach(r => [...r].forEach(k => { if (k !== '.' && !HERO_KEYS.has(k)) { keyBad++; } }));
    // back <= FEET+1, front <= FEET+2 (the BF1 ground sparkle legally sits at 32-33)
    fr.back.forEach((r, y) => { if (y > BF.FEET + 1 && [...r].some(k => k !== '.')) floorBad++; });
    fr.front.forEach((r, y) => { if (y > BF.FEET + 2 && [...r].some(k => k !== '.')) floorBad++; });
  });
  ok('BFMASK', maskBad === 0, `3/3 radiant re-skins are mask-identical to hero_matrix.txt — geometry cannot desync`);
  ok('BFKEYS', keyBad === 0, `bodyflare bodies use HERO keys only (palette-only re-skin): ${keyBad} foreign cells`);
  ok('BFFLOOR', floorBad === 0, `nothing spills below the floor (back<=r${BF.FEET + 1}, front<=r${BF.FEET + 2})`);

  // BF1 PEAK north dominance — light ASCENDS (the inverse of the boss's south dive ray)
  const g = M.lightBodyFlare[1].back;
  let top = 99, bot = -1;
  g.forEach((r, y) => [...r].forEach(k => { if (k !== '.') { top = Math.min(top, y); bot = Math.max(bot, y); } }));
  ok('BFNORTH', (BF.CY - top) > (bot - BF.CY),
    `BF1 PEAK is north-dominant: reaches ${BF.CY - top} up vs ${bot - BF.CY} down — light rises`);
}

// ---------- [EXTRACT] drop-in module == approved literal, cell for cell ----------
(async () => {
  const url = 'file:///' + (DIR + '/hero_light_eclipse_dropin.mjs').replace(/\\/g, '/');
  const mod = await import(url);
  let diff = 0, cells = 0;
  for (const n of Object.keys(SPEC)) {
    const a = M[n], b = mod.LIGHT_ECLIPSE_GRIDS[n];
    if (!b || a.length !== b.length) { diff++; report.push(`  ! EXTRACT ${n} cell count`); continue; }
    a.forEach((g, i) => g.forEach((row, y) => { cells += row.length; if (row !== b[i][y]) diff++; }));
  }
  M.lightBodyFlare.forEach((fr, i) => {
    const b = mod.LIGHT_ECLIPSE_BODY_FLARE[i];
    for (const k of ['back', 'front', 'body']) {
      fr[k].forEach((row, y) => { cells += row.length; if (!b || row !== b[k][y]) diff++; });
    }
  });
  ok('EXTRACT', diff === 0, `hero_light_eclipse_dropin.mjs matches the approved literal: ${cells} cells, ${diff} diffs`);
  const pal = { '.': null, ...LIGHT };
  ok('EXTRACT', JSON.stringify(mod.LIGHT_ECLIPSE_PALETTE) === JSON.stringify(pal),
    `drop-in LIGHT_ECLIPSE_PALETTE matches the locked 8B-0 ramp`);

  console.log('=== Stage 8B-2 — hero light eclipse drop-in validation (reads hero_eclipse_literal.txt + hero_light_eclipse_dropin.mjs) ===');
  for (const line of report) console.log(line);
  console.log(failures === 0
    ? `\nALL PASSED — ${report.filter(l => l.startsWith('[')).length} checks, artifact is drop-in-ready.`
    : `\n${failures} FAILURE(S) of ${report.filter(l => l.startsWith('[')).length} checks.`);
  process.exit(failures ? 1 : 0);
})();
