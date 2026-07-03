// src/core/SpriteManager.js
// ---------------------------------------------------------------------------
// Procedural pixel-art sprite engine for the Reverse Boss Game.
//
//   * No external PNGs - every sprite is a 2D matrix of PALETTE keys (see
//     BOSS_SPRITES / HERO_SPRITES below). '.' / ' ' == transparent.
//   * SpriteManager paints one ctx.fillRect per opaque cell, scaled up by a
//     per-character `pixelSize` so the Boss (BOSS_PIXEL=6, 24 rows -> 144px)
//     renders exactly 3x the Hero (HERO_PIXEL=3, 16 rows -> 48px).
//   * SpriteAnimator handles frame timing; SpriteManager.drawAura() is the
//     Boss's procedural dark aura.
//
// The sprite matrices are auto-generated (tools/generate_sprites.py) and pasted
// in below; everything under "Rendering engine" is hand-written and stable.
// This file is rendering-only and never mutates entity physics/AI.
// ---------------------------------------------------------------------------

import { isLiteVfx, isPerfVfx } from './PerfMonitor.js';

// VFX quality gate (?vfxQuality=normal|lite|performance|auto; legacy
// ?perf=1&vfxBudget=lite). Each VFX method below reads two booleans once at its
// top:
//     const LITE = isLiteVfx();  // true in BOTH the lite and performance tiers
//     const PERF = isPerfVfx();  // true ONLY in the performance tier
// so the values are DYNAMIC per frame. In 'normal' both are false → every
// `PERF ? … : (LITE ? … : …)` branch collapses to its ORIGINAL value, so normal-
// mode visuals are byte-for-byte unchanged. In 'lite' LITE is true and PERF false
// → the tested lite reductions (fewer shadowBlur passes, dropped duplicate glow
// layers, fewer decorative particles). In 'performance' both are true → the lite
// reductions PLUS the more aggressive cuts (further-reduced glow passes/overdraw,
// fewer particles inside heavy VFX, capped large aura glow sizes). Every tier
// KEEPS each attack's silhouette/readability. The flags only change between frames
// (at frameStart via vfxAutoTick), so they are stable within any one draw.
// Rendering-only: they never read or write any physics/AI/hitbox/timer state.

export const PALETTE = { '.': null, ' ': null, 'K': '#0a0a0f', 'k': '#15151f', 'D': '#241338', 'P': '#3a1f5c', 'p': '#5a2f86', 'u': '#7b46b0', 'B': '#050507', 'E': '#ff3a3a', 'm': '#8a1414', 'S': '#dde4f0', 's': '#8b94a6', 'G': '#e8b341', 'g': '#9c7320', 'W': '#f4f6fb', 'w': '#c2cad8', 'i': '#97a2b6', 'L': '#7fc2ff', 'l': '#3f6ea5', 'Y': '#202838', 'O': '#ffe08a', 'q': '#e8b341', 'a': '#a87a1e', 'R': '#ff3366', 'C': '#33ccff', 'V': '#160a28', 'v': '#2a1450', 'x': '#7e3fd6', 'X': '#c77dff', 'e': '#c41e2a' };

export const BOSS_PIXEL = 6;  // 24*6 = 144px tall
export const HERO_PIXEL = 3;  // 16*3 = 48px tall (Boss renders 3x the Hero)

export const BOSS_SPRITES = {
  idle: [
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB........X', '....PKkDKDDBEBEK......Xv', '....PkKkKDDBmBmK....KXeK', '...PkKDKKDDBBBDK...KXvVK', '..PkKkKKKDKDDDKK..XXeVK.', '...PkDKKDDDDDDDKKX.vV.K.', '...PKkKPKDPppPOPX.v.VK..', '..PKDKkDKDPpKpPgKv.VK...', '..PkKkKKDPDpKPDDG.V.K...', '.PkDkKDKDPPpKPPKKg.K....', '.PKkKkKKDPDpKpDPDKO.....', '.PDKkDKDDPppKpPDDK......', 'P.KkKkKDDPDpKpDDDK......', 'P.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', 'k..KkDKKKK..KKK...K.....', 'K...K...KK...K..........', 'k...D...kK...K..........', '........KK...KK.........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB........X', '....PKkDKDDBEBEK......Xv', '....PkKkKDDBmBmK....KXeK', '...PkKDKKDDBBBDK...KXvVK', '..PkKkKKKDKDDDKK..XXeVK.', '....PDKKDDDDDDDKKX.vV.K.', '....PkKPKDPppPOPX.v.VK..', '...PDKkDKDPpKpPgKv.VK...', '...PKkKKDPDpKPDDG.V.K...', '..PDkKDKDPPpKPPKKg.K....', '..PkKkKKDPDpKpDPDKO.....', '..PKkDKDDPppKpPDDK......', '.PKkKkKDDPDpKpDDDK......', '.PkKDKDDPPppKpPPDDK.....', 'P.KkKKDDPPDpKpDPDDK.....', 'P.kDKKDPPKKKKPPKKKK.....', 'P.KkKDDDDPppDPDPDDD.....', 'k.D.kDKKKK..KKK...K.....', '.k...k...K...K..........', '.D...K...K...K..........', '........KK...KK.........'],
  ],
  run: [
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB........X', '....PKkDKDDBEBEK......Xv', '....PkKkKDDBmBmK....KXeK', '...PkKDKKDDBBBDK...KXvVK', '..PkKkKKKDKDDDKK..XXeVK.', '...PkDKKDDDDDDDKKX.vV.K.', '...PKkKPKDPppPOPX.v.VK..', '..PKDKkDKDPpKpPgKv.VK...', '..PkKkKKDPDpKPDDG.V.K...', '.PkDkKDKDPPpKPPKKg.K....', '.PKkKkKKDPDpKpDPDKO.....', 'PKDKkDKDDPppKpPDDK......', 'P.KkKkKDDPDpKpDDDK......', 'P.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPPpDPDPDDD.....', 'k..KkDKKKKK.KKK...K.....', 'K...K...K.K..K..........', 'k...D...k.K..K..........', '..........K..K..........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK........K', '....PkKkKKDDBBB.......KX', '....PKkDKDDBEBEK.....KXv', '....PkKkKDDBmBmK....XXeK', '...PkKDKKDDBBBDK..KXXvK.', '..PkKkKKKDKDDDKK.XXveVK.', '..PKkDKKDDDDDDOgXXv.VK..', '..PkKkKPKDPppPpgKv.VK...', '.PkKDKkDKDPpKpPDG.VK....', 'PkKkKkKKDPDpKPKgKgK.....', 'PKkDkKDKDPPpKPPDKgO.....', 'KkKkKkKKDPDpKpDPDK......', 'kKDKkDKDDPppKpPDDK......', 'K.KkKkKDDPDpKpDDDK......', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPpPPDDPDDD.....', 'k.DKk.KKKK.KKKK...K.....', '..Kk..Kk...KK...........', '..........K..K..........', '..........K..K..........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB........X', '....PKkDKDDBEBEK......Xv', '....PkKkKDDBmBmK....KXeK', '...PkKDKKDDBBBDK...KXvVK', '..PkKkKKKDKDDDKK..XXeVK.', '....PDKKDDDDDDDKKX.vV.K.', '...PKkKPKDPppPOPX.v.VK..', '...PDKkDKDPpKpPgKv.VK...', '...PKkKKDPDpKPDDG.V.K...', '..PDkKDKDPPpKPPKKg.K....', '..PkKkKKDPDpKpDPDKO.....', '.PDKkDKDDPppKpPDDK......', '.PKkKkKDDPDpKpDDDK......', '.PkKDKDDPPppKpPPDDK.....', 'P.KkKKDDPPDpKpDPDDK.....', 'P.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPPpDPDPDDD.....', 'k.D.kDKKKKK.KKK...K.....', '.k...k...kK..K..........', '.D...K...KK..K..........', '..........K..K..........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK........K', '....PkKkKKDDBBB.......KX', '....PKkDKDDBEBEK.....KXv', '....PkKkKDDBmBmK....XXeK', '...PkKDKKDDBBBDK..KXXvK.', '..PkKkKKKDKDDDKK.XXveVK.', '....PDKKDDDDDDOgXXv.VK..', '....PkKPKDPppPpgKv.VK...', '...PDKkDKDPpKpPDG.VK....', '...PKkKKDPDpKPKgKgK.....', '...PkKDKDPPpKPPDKgO.....', '...PKkKKDPDpKpDPDK......', '..PKkDKDDPppKpPDDK......', '..PkKkKDDPDpKpDDDK......', '.PkKDKDDPPppKpPPDDK.....', '.PKkKKDDPPDpKpDPDDK.....', 'P.kDKKDPPKKKKPPKKKK.....', 'P.KkKDDDPPppDDDPDDD.....', 'k..KkDKKKK..KKKK..K.....', 'K..kK..kK......K........', 'k......K........K.......', '.......K........K.......'],
  ],
  retreat: [
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDmmmm........X', '....PKkDKDDmEBEm......XX', '....PkKkKDDBmBmK.....XXv', '...PkKDKKDDBBBDK....XveV', '..PkKkKKKDKDDDKK..XXe.VK', '..PKkDKKDDDDDDDKKXXv.VK.', '.PKkKkKPKDPppPOPXXv.VK..', 'PDkKDKkDKDPpKpPgKv.V.K..', 'PkKkKkKKDPDpKPDDG.V.K...', 'DKkDkKDKDPPpKPPKKg.K....', 'KkKkKkKKDPDpKpDPDKO.....', 'kKDKkDKDDPppKpPDDK......', 'K.KkKkKDDPDpKpDDDK......', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDPPppPDDPDDD.....', 'k..Kk.KKK...KKK...K.....', 'K..kK.KkK...K...........', '.....K......K...........', '....K........K..........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDmmmm........X', '....PKkDKDDmEBEm......XX', '....PkKkKDDBmBmK.....XXv', '...PkKDKKDDBBBDK....XveV', '..PkKkKKKDKDDDKK..XXe.VK', '..PKkDKKDDDDDDDKKXXv.VK.', '..PkKkKPKDPppPOPXXv.VK..', '.PkKDKkDKDPpKpPgKv.V.K..', 'PkKkKkKKDPDpKPDDG.V.K...', 'PKkDkKDKDPPpKPPKKg.K....', 'KkKkKkKKDPDpKpDPDKO.....', 'kKDKkDKDDPppKpPDDK......', 'K.KkKkKDDPDpKpDDDK......', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDPPppPDDPDDD.....', '..DK.DKKKK..KKK...K.....', '..K...K.....K...........', '..k..Kk.....K...........', '....K........K..........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDmmmm........X', '....PKkDKDDmEBEm......XX', '....PkKkKDDBmBmK.....XXv', '...PkKDKKDDBBBDK....XveV', '..PkKkKKKDKDDDKK..XXe.VK', '...PkDKKDDDDDDDKKXXv.VK.', '...PKkKPKDPppPOPXXv.VK..', '..PKDKkDKDPpKpPgKv.V.K..', '..PkKkKKDPDpKPDDG.V.K...', '..PDkKDKDPPpKPPKKg.K....', '.PKkKkKKDPDpKpDPDKO.....', '.PDKkDKDDPppKpPDDK......', 'P.KkKkKDDPDpKpDDDK......', 'P.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDPPppPDDPDDD.....', 'k.D.kDKKKK..KKK...K.....', '.k..KkK.Kk..K...........', '.....K......K...........', '....K........K..........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDmmmm........X', '....PKkDKDDmEBEm......XX', '....PkKkKDDBmBmK.....XXv', '...PkKDKKDDBBBDK....XveV', '..PkKkKKKDKDDDKK..XXe.VK', '...PkDKKDDDDDDDKKXXv.VK.', '...PKkKPKDPppPOPXXv.VK..', '...PDKkDKDPpKpPgKv.V.K..', '..PkKkKKDPDpKPDDG.V.K...', '..PDkKDKDPPpKPPKKg.K....', '.PKkKkKKDPDpKpDPDKO.....', '.PDKkDKDDPppKpPDDK......', 'P.KkKkKDDPDpKpDDDK......', 'P.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppPDDPDDD.....', 'k.DKk.KKK...KKK...K.....', 'K..kK..kK..K............', '.......K...K............', '......K...K.............'],
  ],
  jump: [
    ['...........KK..........X', '..........KPDK........Xe', '.....PkKD.KKKKK......X.K', '....PkKkKKDDBBB.....X.VK', '....PKkDKDDBEBEK...KXeK.', '....PkKkKDDBmBmK..KXvVK.', '...PkKDKKDDBBBDK.KXe.K..', '..PkKkKKKDKDDDKKKX.vVK..', '....PDKKDDDDDDDKX.vVK...', '...PKkKPKDPppPOgKv.VK...', '...PDKkDKDPpKpPDG.VK....', '...PKkKKDPDpKPDgKgO.....', '..PDkKDKDPPpKPPKK.......', '..PkKkKKDPDpKpDPDK......', '..PKkDKDDPppKpPDDK......', '.PKkKkKDDPDpKpDDDK......', '.PkKDKDDPPppKpPPDDK.....', '.PKkKKDDPPDpKpDPDDK.....', 'P.kDKKDPPKKKKPPKKKK.....', 'P.KkKDDDDPppDPDPDDD.....', 'P..KkDKKKK..KKK...K.....', 'P...K..kK.K.K...........', 'k.........K.K...........', '........................'],
    ['...........KK...........', '..........KPDK.........v', '.....PkKD.KKKKK.......Xe', '....PkKkKKDDBBB......XVK', '....PKkDKDDBEBEK...KXeVK', '....PkKkKDDBmBmK..KXvVK.', '...PkKDKKDDBBBDK.KXe.K..', '..PkKkKKKDKDDDKKKX.vVK..', '...PkDKKDDDDDDOKX.vVK...', '...PKkKPKDPppPggKv.VK...', '..PKDKkDKDPpKpPDG.VK....', '..PkKkKKDPDpKPDgKgg.....', '.PkDkKDKDPPpKPPKK.O.....', '.PKkKkKKDPDpKpDPDK......', '.PDKkDKDDPppKpPDDK......', '.PKkKkKDDPDpKpDDDK......', 'P.kKDKDDPPppKpPPDDK.....', 'P.KkKKDDPPDpKpDPDDK.....', 'P.kDKKDPPKKKKPPKKKK.....', 'P.KkKDDDDPppDPDPDDD.....', 'P.DKk.KKKK..KKK...K.....', '...k...k..K.K...........', '...K...D..K.K...........', '........................'],
  ],
  fall: [
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB.........', '....PKkDKDDBEBEK........', '....PkKkKDDBmBmK.......K', '...PkKDKKDDBBBDK......Xv', '..PkKkKKKDKDDDKK....XXeK', '...PkDKKDDDDDDDKK..XXvK.', '..PkKkKPKDPppPpPKXXveVK.', '.PkKDKkDKDPpKpOgXXv.VK..', '.PKkKkKKDPDpKPDgKv.VK...', 'PKkDkKDKDPPpKPPDG.VK....', 'KkKkKkKKDPDpKpKgDgK.....', 'kKDKkDKDDPppKpPDDgO.....', 'K.KkKkKDDPDpKpDDDK......', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', '..DK.DKKKK..KKK...K.....', '.kK..kK.Kk....K.........', '.......K.......K........', '.......K.......K........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB.........', '....PKkDKDDBEBEK........', '....PkKkKDDBmBmK........', '...PkKDKKDDBBBDK......Xx', '..PkKkKKKDKDDDKK....XXev', '...PkDKKDDDDDDDKK..X.vVK', '..PkKkKPKDPppPpPKXXxeVK.', '.PkKDKkDKDPpKpPOX.xvVK..', '.PKkKkKKDPDpKPDgKxvVK...', 'PKkDkKDKDPPpKPPDGvVK....', 'PkKkKkKKDPDpKpKgDgK.....', 'kKDKkDKDDPppKpPDDO......', 'K.KkKkKDDPDpKpDDDK......', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', 'k.D.kDKKKK..KKK...K.....', '.k...k..Kk....K.........', '.D...K.K.K.....K........', '.......K.......K........'],
  ],
  doubleJump: [
    ['........................', '........................', '........................', '........................', '........................', '........................', '........................', '.......x.PPKPPK.........', '........PKkDkKDP........', '.....x.PKkKkKkKkP.......', '......PDkBBBOKKKDK......', '......PkKBBBgXXXXKK.....', '....x.KKkBKgGvveveeXX...', '......PkKBBBgVVKKKK.....', '......PKDKkDOKKKkP......', '.......PKkKkKkKkP.......', '........KKDKkDkP........', '.........PKPPKP.........', '........................', '........................', '........................', '........................', '........................', '........................'],
    ['........................', '........................', '........................', '........................', '........................', '...........x............', '..............x.........', '.........PPKPPK..x......', '........PKkDkKDP........', '.......PKkKkKkKkP.......', '......PDkBBBBDkKDK......', '......PkKBBBKkKkKP......', '......KKkBBBgKkDkP......', '......PkKBOgGgOkKK......', '......PKDKKVvXKKkP......', '.......PKkKVvXKkP.......', '........KKDKeXkP........', '.........PKKvXP.........', '...........KeK..........', '...........KeK..........', '............X...........', '............X...........', '........................', '........................'],
    ['........................', '........................', '........................', '........................', '........................', '........................', '........................', '.........PPKPPK.........', '........PKkDkKDP........', '.......PKkKkKkKkP.......', '......PDKKOBBDkKDK......', '....KKKKVVgBBkKkKP......', '..XXeevevvGgKKkDkPx.....', '....KKXXXXgBBkKkKK......', '......PKKKODkKDKkP......', '.......PKkKkKkKkP.x.....', '........KKDKkDkP........', '.........PKPPKP.x.......', '........................', '........................', '........................', '........................', '........................', '........................'],
    ['........................', '........................', '........................', '............X...........', '............X...........', '...........KeK..........', '...........KeK..........', '.........PPXvKK.........', '........PKkXeKDP........', '.......PKkKXvVKkP.......', '......PDkBKXvVKKDK......', '......PkKBOgGgOkKP......', '......KKkBBBgKkDkP......', '......PkKBBBKkKkKK......', '......PKDKkDkKDKkP......', '.......PKkKkKkKkP.......', '........KKDKkDkP........', '......x..PKPPKP.........', '.........x..............', '............x...........', '........................', '........................', '........................', '........................'],
  ],
  attack: [
    ['........XVKKK...........', '.........eKPDK..........', '.....PkKDXvKKKK.........', '....PkKkKKxeKBB.........', '....PKkDKDXvVKEK........', '....PkKkKDKxeKmK........', '...PkKDKKDDXxVKK........', '..PkKkKKKDKKxvVK........', '...PkDKKDDDDXxvgO.......', '...PKkKPKDPpKPGPK.......', '..PKDKkDKDPpOggDK.......', '..PkKkKKDPDpKPDKK.......', '..PDkKDKDPPpKPPDK.......', '.PKkKkKKDPDpKpDPDK......', '.PDKkDKDDPppKpPDDK......', '.PKkKkKDDPDpKpDDDK......', 'P.kKDKDDPPppKpPPDDK.....', 'P.KkKKDDPPDpKpDPDDK.....', 'P.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', 'k..KkDKKKK..KKK...K.....', 'K..kK..kKK...K..........', '.........K...K..........', '........KK...KK.........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.....x.x.', '....PkKkKKDDBBB........x', '....PKkDKDDBEBEK........', '....PkKkKDDBmBmK........', '...PkKDKKDDBBBDK........', '..PkKkKKKDKDDDKK........', '..PKkDKKDDDDDDDKK.......', '.PKkKkKPKDPppPpPK.O.....', '.PkKDKkDKDPpKpPKPg.X....', 'PkKkKkKKDPDpKPDDgGxxXX..', 'PKkDkKDKDPPpKPPDKgvvxxXX', 'KkKkKkKKDPDpKpDPOKVVVvex', 'kKDKkDKDDPppKpPDDKKKVVVV', 'K.KkKkKDDPDpKpDDDK..KKKK', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', 'k.DKk.KKKK..KKK...K.....', '..Kk..Kk.K...K..........', '.........K...K..........', '........KK...KK.........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB.........', '....PKkDKDDBEBEK........', '....PkKkKDDBmBmK........', '...PkKDKKDDBBBDK........', '..PkKkKKKDKDDDKK........', '...PkDKKDDDDDDDKK.......', '...PKkKPKDPppPpPK....XXX', '..PKDKkDKDPpKpPDO.XXXxev', '..PkKkKKDPDpKPDDPgxxvvvV', '.PkDkKDKDPPpKPPDgGvv.VKK', '.PKkKkKKDPDpKpDKDg.VKK..', 'PKDKkDKDDPppKpPDDKOK....', 'P.KkKkKDDPDpKpDDDK......', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', '..DK.DKKKK..KKK...K.....', '..K...K..K...K..........', '..k...k..K...K..........', '........KK...KK.........'],
  ],
  dash: [
    ['........................', '........................', '........................', '........................', '........................', '....XX..................', '....VVXXX...............', '....KVVxDXXX............', '....KKVVxDKVXX..........', '....DKVVVxDKVxXXX.......', '....xDKVVxDDKVxDKXXX....', '.kkkVxDKVExDKVVxDKVxXX..', '....VxeDKeVxeKVeDDeVxXX.', '.KKKKVxDKEVVxDKVxDKVXX..', '....DKVxDKVVxxDKVXXX....', '....DDKVxDKVVxXXX.......', '....xDKVxxDKXX..........', '....VxDKVXXX............', '....KVXXX...............', '....XX..................', '........................', '........................', '........................', '........................'],
    ['........................', '........................', '........................', '........................', '........................', '....XX..................', '....xDXXX...............', '....VxDKVXXX............', '....VVxDKVxDXX..........', '....VVxDDKVxDKXXX.......', '....KVVxDKVVxDKVxXXX....', '.kkkDKVVxEKVxDDKVxDKXX..', '....eKVeVxeKVeDKeVxeKXX.', '.KKKxDKVVExDKVxDKVxDXX..', '....VxDKVVxDKKVxDXXX....', '....VVxDKVVxDKXXX.......', '....KVxDKKVVXX..........', '....DKVxDXXX............', '....xDXXX...............', '....XX..................', '........................', '........................', '........................', '........................'],
    ['........................', '........................', '........................', '........................', '........................', '....XX..................', '....KVXXX...............', '....DKVxDXXX............', '....DDKVxDKVXX..........', '....xDKVVxDKVxXXX.......', '....VxDKVxDDKVxDKXXX....', '.kkkVVxDKExDKVVxDKVxXX..', '....VexxeKVeDKexDeKVeXX.', '.KKKKVVxDEKVxDKVxDKVXX..', '....DKVVxDKVxxDKVXXX....', '....DDKVVxDKVxXXX.......', '....xDKVVVxDXX..........', '....VxDKVXXX............', '....KVXXX...............', '....XX..................', '........................', '........................', '........................', '........................'],
    ['........................', '........................', '........................', '........................', '........................', '....XX..................', '....xDXXX...............', '....VxDKVXXX............', '....VVxDKVxDXX..........', '....KVxDDKVxDKXXX.......', '....DKVxDKVVxDKVxXXX....', '.kkkxDKVxEKVxDDKVxDKXX..', '....xDeKVeDKexDeVVeDKXX.', '.KKKVxDKVExDKVxDKVxDXX..', '....VVxDKVxDKKVxDXXX....', '....VVVxDKVxDKXXX.......', '....KVVxDDKVXX..........', '....DKVVxXXX............', '....xDXXX...............', '....XX..................', '........................', '........................', '........................', '........................'],
  ],
  attack1: [
    ['........XVKKK...........', '.........eKPDK..........', '.....PkKDXvKKKK.........', '....PkKkKKxeKBB.........', '....PKkDKDXvVKEK........', '....PkKkKDKxeKmK........', '...PkKDKKDDXxVKK........', '..PkKkKKKDKKxvVK........', '...PkDKKDDDDXxvgO.......', '...PKkKPKDPpKPGPK.......', '..PKDKkDKDPpOggDK.......', '..PkKkKKDPDpKPDKK.......', '..PDkKDKDPPpKPPDK.......', '.PKkKkKKDPDpKpDPDK......', '.PDKkDKDDPppKpPDDK......', '.PKkKkKDDPDpKpDDDK......', 'P.kKDKDDPPppKpPPDDK.....', 'P.KkKKDDPPDpKpDPDDK.....', 'P.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', 'k..KkDKKKK..KKK...K.....', 'K..kK..kKK...K..........', '.........K...K..........', '........KK...KK.........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.....x.x.', '....PkKkKKDDBBB........x', '....PKkDKDDBEBEK........', '....PkKkKDDBmBmK........', '...PkKDKKDDBBBDK........', '..PkKkKKKDKDDDKK........', '..PKkDKKDDDDDDDKK.......', '.PKkKkKPKDPppPpPK.O.....', '.PkKDKkDKDPpKpPKPg.X....', 'PkKkKkKKDPDpKPDDgGxxXX..', 'PKkDkKDKDPPpKPPDKgvvxxXX', 'KkKkKkKKDPDpKpDPOKVVVvex', 'kKDKkDKDDPppKpPDDKKKVVVV', 'K.KkKkKDDPDpKpDDDK..KKKK', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', 'k.DKk.KKKK..KKK...K.....', '..Kk..Kk.K...K..........', '.........K...K..........', '........KK...KK.........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB.........', '....PKkDKDDBEBEK........', '....PkKkKDDBmBmK........', '...PkKDKKDDBBBDK........', '..PkKkKKKDKDDDKK........', '...PkDKKDDDDDDDKK.......', '...PKkKPKDPppPpPK....XXX', '..PKDKkDKDPpKpPDO.XXXxev', '..PkKkKKDPDpKPDDPgxxvvvV', '.PkDkKDKDPPpKPPDgGvv.VKK', '.PKkKkKKDPDpKpDKDg.VKK..', 'PKDKkDKDDPppKpPDDKOK....', 'P.KkKkKDDPDpKpDDDK......', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', '..DK.DKKKK..KKK...K.....', '..K...K..K...K..........', '..k...k..K...K..........', '........KK...KK.........'],
  ],
  attack2: [
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.....x.x.', '....PkKkKKDDBBB........x', '....PKkDKDDBEBEK........', '....PkKkKDDBmBmK........', '...PkKDKKDDBBBDK........', '..PkKkKKKDKDDDKK........', '..PKkDKKDDDDDDDKK.......', '.PKkKkKPKDPppPpPK.O.....', '.PkKDKkDKDPpKpPKPg.X....', 'PkKkKkKKDPDpKPDDgGxxXX..', 'PKkDkKDKDPPpKPPDKgvvxxXX', 'KkKkKkKKDPDpKpDPOKVVVvex', 'kKDKkDKDDPppKpPDDKKKVVVV', 'K.KkKkKDDPDpKpDDDK..KKKK', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', 'k.DKk.KKKK..KKK...K.....', '..Kk..Kk.K...K..........', '.........K...K..........', '........KK...KK.........'],
    ['...........KK...........', '..........KDPK..........', '.x.x.....KKKKK.DKkP.....', 'x........BBBDDKKkKkP....', '........KEBEBDDKDkKP....', '........KmBmBDDKkKkP....', '........KDBBBDDKKDKkP...', '........KKDDDKDKKKkKkP..', '.......KKDDDDDDDKKDkKP..', '.....O.KPpPppPDKPKkKkKP.', '....X.gPKPpKpPDKDkKDKkP.', '..XXxxGgDDPKpDPDKKkKkKkP', 'XXxxvvgKDPPKpPPDKDKkDkKP', 'xevVVVKOPDpKpDPDKKkKkKkK', 'VVVVKKKDDPpKppPDDKDkKDKk', 'KKKK..KDDDpKpDPDDKkKkK.K', '.....KDDPPpKppPPDDKDKk.k', '.....KDDPDpKpDPPDDKKkK.K', '.....KKKKPPKKKKPPDKKDk.D', '.....DDDPDPDppPDDDDKkK.K', '.....K...KKK..KKKK.kKD.k', '..........K...K.kK..kK..', '..........K...K.........', '.........KK...KK........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB.........', '....PKkDKDDBEBEK........', '....PkKkKDDBmBmK........', '...PkKDKKDDBBBDK........', '..PkKkKKKDKDDDKK........', '...PkDKKDDDDDDDKK.......', '...PKkKPKDPppPpPK....XXX', '..PKDKkDKDPpKpPDO.XXXxev', '..PkKkKKDPDpKPDDPgxxvvvV', '.PkDkKDKDPPpKPPDgGvv.VKK', '.PKkKkKKDPDpKpDKDg.VKK..', 'PKDKkDKDDPppKpPDDKOK....', 'P.KkKkKDDPDpKpDDDK......', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', '..DK.DKKKK..KKK...K.....', '..K...K..K...K..........', '..k...k..K...K..........', '........KK...KK.........'],
    ['...........KK...........', '..........KDPK..........', '.........KKKKK.DKkP.....', '.........BBBDDKKkKkP....', '........KEBEBDDKDkKP....', '........KmBmBDDKkKkP....', '........KDBBBDDKKDKkP...', '........KKDDDKDKKKkKkP..', '.......KKDDDDDDDKKDkP...', 'XXX....KPpPppPDKPKkKP...', 'vexXXX.ODPpKpPDKDkKDKP..', 'VvvvxxgPDDPKpDPDKKkKkP..', 'KKV.vvGgDPPKpPPDKDKkDkP.', '..KKV.gDKDpKpDPDKKkKkKP.', '....KOKDDPpKppPDDKDkKDKP', '......KDDDpKpDPDDKkKkK.P', '.....KDDPPpKppPPDDKDKk.k', '.....KDDPDpKpDPPDDKKkK.K', '.....KKKKPPKKKKPPDKKDk.D', '.....DDDPDPDppPDDDDKkK.K', '.....K...KKK..KKKKD.KD..', '..........K...K..K...K..', '..........K...K..k...k..', '.........KK...KK........'],
  ],
  attack3: [
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB........X', '....PKkDKDDBEBEK......Xv', '....PkKkKDDBmBmK....KXeK', '...PkKDKKDDBBBDK...KXvVK', '..PkKkKKKDKDDDKK..vXXVK.', '...PkDKKDDDDDDDKKvXxXvK.', '...PKkKPKDPppPOPXXxOxX..', '..PKDKkDKDPpKpPgKvXxXv..', '..PkKkKKDPDpKPDDG.vXX...', '.PkDkKDKDPPpKPPKKg.K....', '.PKkKkKKDPDpKpDPDKO.....', '.PDKkDKDDPppKpPDDK......', 'P.KkKkKDDPDpKpDDDK......', 'P.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', 'k..KkDKKKK..KKK...K.....', 'K...K...KK...K..........', 'k...D...kK...K..........', '........KK...KK.........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB........X', '....PKkDKDDBEBEK......Xv', '....PkKkKDDBmBmK....KXeK', '...PkKDKKDDBBBDK...KXvVK', '..PkKkKKKDKDDDKK..XvXVK.', '....PDKKDDDDDDDKKXxXxXK.', '....PkKPKDPppPOPXvXOXv..', '...PDKkDKDPpKpPgKXxXxX..', '...PKkKKDPDpKPDDG.XvX...', '..PDkKDKDPPpKPPKKg.K....', '..PkKkKKDPDpKpDPDKO.....', '..PKkDKDDPppKpPDDK......', '.PKkKkKDDPDpKpDDDK......', '.PkKDKDDPPppKpPPDDK.....', 'P.KkKKDDPPDpKpDPDDK.....', 'P.kDKKDPPKKKKPPKKKK.....', 'P.KkKDDDDPppDPDPDDD.....', 'k.D.kDKKKK..KKK...K.....', '.k...k...K...K..........', '.D...K...K...K..........', '........KK...KK.........'],
  ],
  attack4: [
    ['........................', '........................', '........................', '........................', '........................', '....XX..................', '....VVXXX...............', '....KVVxDXXX............', '....KKVVxDKVXX..........', '....DKVVVxDKVxXXX.......', '....xDKVVxDDKVxDKXXX....', '.kkkVxDKVExDKVVxDKVxXX..', '....VxeDKeVxeKVeDDeVxXX.', '.KKKKVxDKEVVxDKVxDKVXX..', '....DKVxDKVVxxDKVXXX....', '....DDKVxDKVVxXXX.......', '....xDKVxxDKXX..........', '....VxDKVXXX............', '....KVXXX...............', '....XX..................', '........................', '........................', '........................', '........................'],
    ['........................', '........................', '........................', '........................', '........................', '....XX..................', '....xDXXX...............', '....VxDKVXXX............', '....VVxDKVxDXX..........', '....VVxDDKVxDKXXX.......', '....KVVxDKVVxDKVxXXX....', '.kkkDKVVxEKVxDDKVxDKXX..', '....eKVeVxeKVeDKeVxeKXX.', '.KKKxDKVVExDKVxDKVxDXX..', '....VxDKVVxDKKVxDXXX....', '....VVxDKVVxDKXXX.......', '....KVxDKKVVXX..........', '....DKVxDXXX............', '....xDXXX...............', '....XX..................', '........................', '........................', '........................', '........................'],
    ['........................', '........................', '........................', '........................', '........................', '....XX..................', '....KVXXX...............', '....DKVxDXXX............', '....DDKVxDKVXX..........', '....xDKVVxDKVxXXX.......', '....VxDKVxDDKVxDKXXX....', '.kkkVVxDKExDKVVxDKVxXX..', '....VexxeKVeDKexDeKVeXX.', '.KKKKVVxDEKVxDKVxDKVXX..', '....DKVVxDKVxxDKVXXX....', '....DDKVVxDKVxXXX.......', '....xDKVVVxDXX..........', '....VxDKVXXX............', '....KVXXX...............', '....XX..................', '........................', '........................', '........................', '........................'],
    ['........................', '........................', '........................', '........................', '........................', '....XX..................', '....xDXXX...............', '....VxDKVXXX............', '....VVxDKVxDXX..........', '....KVxDDKVxDKXXX.......', '....DKVxDKVVxDKVxXXX....', '.kkkxDKVxEKVxDDKVxDKXX..', '....xDeKVeDKexDeVVeDKXX.', '.KKKVxDKVExDKVxDKVxDXX..', '....VVxDKVxDKKVxDXXX....', '....VVVxDKVxDKXXX.......', '....KVVxDDKVXX..........', '....DKVVxXXX............', '....xDXXX...............', '....XX..................', '........................', '........................', '........................', '........................'],
  ],
  airDive: [
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB.........', '....PKkDKDDBEBEK........', '....PkKkKDDBmBmK.......K', '...PkKDKKDDBBBDK......Xv', '..PkKkKKKDKDDDKK....XXeK', '...PkDKKDDDDDDDKK..XXvK.', '..PkKkKPKDPppPpGgXXveVK.', '.PkKDKkDKDPpKpOgSXv.VK..', '.PKkKkKKDPDpKPDgWS.VK...', 'PKkDkKDKDPPpKPPDGWSK....', 'KkKkKkKKDPDpKpKgDgWS....', 'kKDKkDKDDPppKpPDDgOWS...', 'K.KkKkKDDPDpKpDDDK..WS..', 'k.kKDKDDPPppKpPPDDK..WO.', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', '..DK.DKKKK..KKK...K.....', '.kK..kK.Kk....K.........', '.......K.......K........', '.......K.......K........'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB.........', '....PKkDKDDBEBEK........', '....PkKkKDDBmBmK........', '...PkKDKKDDBBBDK......Xx', '..PkKkKKKDKDDDKK....XXev', '...PkDKKDDDDDDDKK..X.vVK', '..PkKkKPKDPppPpGgXXxeVK.', '.PkKDKkDKDPpKpPOS.xvVK..', '.PKkKkKKDPDpKPDgWSvVK...', 'PKkDkKDKDPPpKPPDGWSK....', 'PkKkKkKKDPDpKpKgDgWS....', 'kKDKkDKDDPppKpPDDO.WS...', 'K.KkKkKDDPDpKpDDDK..WS..', 'k.kKDKDDPPppKpPPDDK..WO.', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', 'k.D.kDKKKK..KKK...K.....', '.k...k..Kk....K.........', '.D...K.K.K.....K........', '.......K.......K........'],
  ],
  // --- STEP 2: charged-attack poses (2 frames each, 24x24, PALETTE keys). Wand
  // uses gold a/g/G shaft + cyan/white C/L/W orb, kept visually distinct from the
  // violet void-sword. Selected by Player._animState() during the charge states.
  groundCharge: [
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB.........', '....PKkDKDDBEBEK..X.....', '....PkKkKDDBmBmK.lCC....', '...PkKDKKDDBBBDK..LLC...', '..PkKkKKKDKDDDKK..al....', '...PkDKKDDDDDDDK.g......', '...PKkKPKDPppPOP.a......', '..PKDKkDKDPpKpPgG.......', '..PkKkKKDPDpKPDDa.......', '.PkDkKDKDPPpKPPg........', '.PKkKkKKDPDpKpDP........', '.PDKkDKDDPppKpPDDK......', 'P.KkKkKDDPDpKpDDDK......', 'P.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDPKKKKPDPDDD.....', 'k.....DK.KKDKDK...K.....', 'K....Kk.......kK........', 'k....kK.......Kk........', '....KK.........KK.......'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK....x....', '....PkKkKKDDBBB...X.C...', '....PKkDKDDBEBEK.XCCX...', '....PkKkKDDBmBmK.CWWCx..', '...PkKDKKDDBBBDK.CWWCC..', '..PkKkKKKDKDDDKK.xCCx...', '...PkDKKDDDDDDDK.g.X....', '...PKkKPKDPppPOP.a......', '..PKDKkDKDPpKpPgG.......', '..PkKkKKDPDpKPDDa.......', '.PkDkKDKDPPpKPPg........', '.PKkKkKKDPDpKpDP........', '.PDKkDKDDPppKpPDDK......', 'P.KkKkKDDPDpKpDDDK......', 'P.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDPKKKKPDPDDD.....', 'k.....DK.KKDKDK...K.....', 'K....Kk.......kK........', 'k....kK.......Kk........', '....KK.........KK.......'],
  ],
  fireLaser: [
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB.........', '....PKkDKDDBEBE.........', '....PkKkKDDBmBm.........', '...PkKDKKDDBBBD.........', '..PkKkKKKDKDDDK.......x.', '...PkDKKDDDDDDD.......Xx', '...PKkKPKDPppPO.KKK.gXCL', '..PKDKkDKDPpKpPKuupkaCWW', '..PkKkKKDPDpKPDKpPDK.XCL', '.PkDkKDKDPPpKPP.......Xx', '.PKkKkKKDPDpKpD.......x.', '.PDKkDKDDPppKpPDDK......', 'P.KkKkKDDPDpKpDDDK......', 'P.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', 'k..KkDKKKK..KKK...K.....', 'K...K...KK.....K........', 'k...D...kK.....K........', '........KK.....KK.......'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....PkKkKKDDBBB.........', '....PKkDKDDBEBE.........', '....PkKkKDDBmBm.........', '...PkKDKKDDBBBD.......x.', '..PkKkKKKDKDDDK.......xx', '...PkDKKDDDDDDD......CXC', '...PKkKPKDPppPO.KKK.gCWW', '..PKDKkDKDPpKpPKuupkCWWW', '..PkKkKKDPDpKPDKpPDK.CWW', '.PkDkKDKDPPpKPP......CXC', '.PKkKkKKDPDpKpD.......xx', '.PDKkDKDDPppKpPDDK....x.', 'P.KkKkKDDPDpKpDDDK......', 'P.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', 'k..KkDKKKK..KKK...K.....', 'K...K...KK.....K........', 'k...D...kK.....K........', '........KK.....KK.......'],
  ],
  airCharge: [
    ['........kDPKKPDk........', '......PDk.KPDK.kDP......', '...x.PkKP.KKKKKP...x....', '..DPPkKkKKDDBBB...PD....', 'x.PpPKkDKDDBEBEK..Dpx...', '.PD.PkKkKDDBmBmK.Pp....K', 'XDPPkKDKKDDBBBDKDPX...Xv', '.kPkKkKKKDKDDDKKkP..XXeK', 'DP.PkDKKDDDDDDDKPD.XXvK.', 'kPPkKkKPKDPppPpPPkXveVK.', '.PkKDKkDKDPpKpOgXXv.VK..', '.PKkKkKKDPDpKPDgKv.VK...', 'PKkDkKDKDPPpKPPDG.VK....', 'KkKkKkKKDPDpKpKgDgK.....', 'kKDKkDKDDPppKpPDDgO.....', 'K.KkKkKDDPDpKpDDDK......', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKDDDDPppDPDPDDD.....', '..DK.XKKKK..KKKX..K.....', '.kK..xKkKk...kKx........', '......CK..ll.KC.........', '.......X..vv.X..........'],
    ['........PDkKKkPD........', '......kDP.KPDK..P...Dx..', '.....PkKD.KKKKK.....P...', '....PkKkKKDDBBB....PDx..', '..xDPKkDKDDBEBEK..Dp....', '..PpPkKkKDDBmBmK..PpX..K', '.XPDkKDKKDDBBBDK.DP...Xv', '.kPkKkKKKDKDDDKK.kP.XXeK', '.DPPkDKKDDDDDDDKPD.XXvK.', 'kPPkKkKPKDPppPpPPkXveVK.', '.PkKDKkDKDPpKpOgXXv.VK..', '.PKkKkKKDPDpKPDgKv.VK...', 'PKkDkKDKDPPpKPPDG.VK....', 'KkKkKkKKDPDpKpKgDgK.....', 'kKDKkDKDDPppKpPDDgO.....', 'K.KkKkKDDPDpKpDDDK......', 'k.kKDKDDPPppKpPPDDK.....', 'K.KkKKDDPPDpKpDPDDK.....', 'D.kDKKDPPKKKKPPKKKK.....', 'K.KkKXDDDPppDPDXDDD.....', '..DK.DxKKK..KKx...K.....', '.kK..kCkKk...kC.........', '.......X..ll.X..........', '..........vv............'],
  ],
  chargedDive: [
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '...XwkKkKKDDBBB.........', '..xWPKkDKDDBEBEK........', '..XwPkKkKDDBmBmK.......K', '.xSPkKDKKDDBBBDK......Xv', '.wPkKkKKKDKDDDKK....XXeK', 'xW.PkDKKDDDDDDDKK..XXvK.', 'wXPkKkKPKDPppPpGgXXveVK.', 'xPkKDKkDKDPpKpOgSXv.VK..', '.PKkKkKKDPDpKPDgWS.VK...', 'PKkDkKDKDPPpKPPXGWSK....', 'KkKkKkKKDPDpKpKgXgWS....', 'kKDKkDKDDPppKpPDDxOWS...', 'K.KkKkKDDPDpKpDDDKSxWS..', 'k.kKDKDDPPppKpPPDDVWXWO.', 'K.KkKKDDPPDpKpDPDDvSx...', 'D.kDKKDPPKKKKPPKKKKVWX..', 'K.KkKDDDDPppDPDPDDDvSx..', '..DK.DKKKK..KKK...K.VWX.', '......Kk.....kK......Cx.', '......................CC', '......................LW'],
    ['...........KK...........', '..........KPDK..........', '.....PkKD.KKKKK.........', '....xSKkKKDDBBB.........', '....XwkDKDDBEBEK........', '...xWkKkKDDBmBmK.......K', '..XwkKDKKDDBBBDK......Xv', '.xSkKkKKKDKDDDKK....XXeK', '..wPkDKKDDDDDDDKK..XXvK.', 'xWPkKkKPKDPppPpGgXXveVK.', 'wXkKDKkDKDPpKpOgSXv.VK..', 'xPKkKkKKDPDpKPDgWS.VK...', 'PKkDkKDKDPPpKPPXGWSK....', 'KkKkKkKKDPDpKpKgXgWS....', 'kKDKkDKDDPppKpPDDxXWS...', 'K.KkKkKDDPDpKpDDDKWXWS..', 'k.kKDKDDPPppKpPPDDVWxWO.', 'K.KkKKDDPPDpKpDPDDvWX...', 'D.kDKKDPPKKKKPPKKKKVSx..', 'K.KkKDDDDPppDPDPDDDvWX..', '..DK.DKKKK..KKK...K.VWx.', '......Kk.....kK......CX.', '......................CC', '.......................L'],
  ],
};

export const HERO_SPRITES = {
  idle: [
    ['..............', '.....KWWW.....', '....KwWWWW....', '....KwWWWW....', '....KYLLYW...O', '...KiwwWWWW..O', '...liwwwWWl.O.', '....KiwwWq.O..', '....KiwwwWq...', '....lLllLl.q..', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
    ['.....KWWW.....', '....KwWWWW....', '....KwWWWW....', '....KYLLYW...O', '...KiwwWWWW..O', '...liwwwWWl.O.', '....KiwwWq.O..', '....KiwwwWq...', '....lLllLl.q..', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............', '..............'],
  ],
  run: [
    ['..............', '.....KWWW.....', '....KWWWWW....', '....KwWWWW....', '....KYLLYW....', '...KwwwWWWW...', '...liwwwWWl..O', '....KiwwwWqOO.', '....KiwwwWq...', '....lLllLlq...', '....KW..KW....', '....KK...KW...', '...KW....KW...', '..KiK....KwW..', '..KK......KK..', '..............'],
    ['.....KWWW.....', '....KwWWWW...O', '....KwWWWW...O', '....KYLLYW..O.', '...KiwwWWWW.O.', '...liiwwWWlO..', '....KiwwWq.O..', '....KiiwwWq...', '....lLllLl.q..', '....KW..KK....', '.....KWWW.....', '.....KKKW.....', '....KK..KW....', '....K....K....', '..............', '..............'],
    ['...........O..', '.....KWWW..O..', '....KWWWWW.O..', '....KwWWWW.O..', '....KYLLYWO...', '...KwwwWWWO...', '...liwwwWWO...', '....KiwwWWO...', '....Kiwwwqqq..', '....lLllLl....', '....KK..KW....', '...KW...KW....', '...KW....KW...', '..KiK....KwW..', '..KK......KK..', '..............'],
    ['.....KWWW.....', '....KwWWWW...O', '....KwWWWW...O', '....KYLLYW..O.', '...KiwwWWWW.O.', '...liiwwWWlO..', '....KiwwWq.O..', '....KiiwwWq...', '....lLllLl.q..', '....KW..KK....', '.....KWWW.....', '.....KKKW.....', '....KK..KW....', '....K....K....', '..............', '..............'],
  ],
  jump: [
    ['...........O..', '.....KWWW..O..', '....KwWWWW.O..', '....KwWWWWO...', '....KYLLYWO...', '...KiwwWWWO...', '...liiwwWWO...', '....KiwwWqqq..', '....KiiwwW....', '....lLllLl....', '....KW..KK....', '.....KKKW.....', '....KK..KW....', '...KK....KK...', '..............', '..............'],
  ],
  fall: [
    ['..............', '.....KWWW.....', '....KWWWWW....', '....KwWWWW....', '....KYLLYW....', '...KwwwwWWW...', '...liwwwWWl...', '....KiwwwW....', '....KiwwwWq...', '....lLllLlqO..', '....KK..KWq.OO', '...KK....KW...', '..KK......KW..', '.KK........KW.', '.K..........K.', '..............'],
  ],
  attack: [
    ['..........O...', '.....KWWW.O...', '....KwWWWWO...', '....KwWWWWO...', '....KYLLYWO...', '...KiwwWWWO...', '...liwwwWOl...', '....KiwwWO....', '....Kiwwqqq...', '....lLllLl....', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
    ['..............', '.....KWWW.....', '....KwWWWW....', '....KwWWWW....', '....KYLLYW....', '...KiwwWWWW...', '...liwwwWWl...', '....KiwwWq..OO', '....KiwwwqOO..', '....lLllLq....', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
    ['..............', '.....KWWW.....', '....KwWWWW....', '....KwWWWW....', '....KYLLYW....', '...KiwwWWWW...', '...liwwwWWl...', '....KiwwWWq...', '....Kiwwwq....', '....lLllqlO...', '....KW..KWO...', '....KW..KW.O..', '....KW..KW..O.', '...KiK..KwW.O.', '...KK....KK..O', '..............'],
  ],
  dash: [
    ['..............', '........KWWW..', '.......KWWWWK.', '......KwWWWW..', '......KYLLYW..', '.....KiwwWWWW.', '.....liwwwWWl.', 'wLw...KiwwWK..', '.OO.qKiiwwW...', '...OqlLllLl...', '....qKW..KK...', '......KWWW....', '......KKiW....', '....KK..KW....', '....K....K....', '..............'],
  ],
  roll: [
    ['..............', '..............', '..............', '..............', '..............', '..............', '....KWWWWW....', '...KwWWWWWl...', '..KwwwWWWWWl..', '..KiwwwqWYWW..', '..KiiwqOWWWW..', '..KiiiqwOOOW..', '..KiiiiwwwWOO.', '...Kiiiiwwl...', '....KKKKKK....', '..............'],
    ['..............', '..............', '..............', '..............', '..............', '..............', '....KWWWWW....', '...KwwWWWWW...', '..KiwwwWWWWW..', '..KiiwwwWWWW..', '..KiiiqqwWWW..', '..KiiiOwwwWW..', '..KiiOiiwwwK..', '...liOiiYwl...', '....lOKKKl....', '....O.........'],
    ['..............', '..............', '..............', '..............', '..............', '..............', '....KWWWWW....', '...lwwWWWWW...', '.OOiwwwWWWWW..', '..KOOwwqWWWW..', '..KiiOqqwWWW..', '..KiYiqwwwWW..', '..liiiiiwwwK..', '...liiiiiwK...', '....KKKKKK....', '..............'],
    ['..............', '..............', '..............', '..............', '.........O....', '.........O....', '....lWWWOl....', '...lwYWWOWl...', '..KwwwWOWWWW..', '..KiwwwOWWWW..', '..KiiwqqWWWW..', '..KiiiwwwWWW..', '..KiiiiwwwWK..', '...KiiiiwwK...', '....KKKKKK....', '..............'],
  ],
  attackCombo1: [
    ['.........qO...', '.....KWWW.qO..', '....KwWWWWqO..', '....KwWWWWO...', '....KYLLYWO...', '...KiwwWWWO...', '...liwwwWql...', '....Kiwwwq....', '....KiwwwW....', '....lLllLl....', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
    ['..............', '.....KWWW.....', '....KwWWWW....', '....KwWWWW....', '....KYLLYW....', '...KiwwWWWW...', '...liwwwWqlOO.', '....KiwwwqOO..', '....KiwwwqO...', '....lLllLl....', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
  ],
  attackCombo2: [
    ['..............', '.....KWWW.....', '....KwWWWW....', '....KwWWWW....', '....KYLLYW....', '...KiwwWWWW...', '...liwwwWWl...', '....KiwwwqO...', '....KiwwwqO...', '....lLllLlO...', '....KW..KWO...', '....KW..KWqO..', '....KW..KW.O..', '...KiK..KwW...', '...KK....KK...', '..............'],
    ['...........O..', '.....KWWW..O..', '....KwWWWW.O..', '....KwWWWWqO..', '....KYLLYWqO..', '...KiwwWWWql..', '...liwwwWWl...', '....KiwwwW....', '....KiwwwW....', '....lLllLl....', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
  ],
  attackCombo3: [
    ['..............', '.....KWWW.....', '....KwWWWW....', '....KwWWWW....', '....KYLLYW....', '...KiwwWWWW...', '...liwwwWWlq..', '....KiwwwWq...', '....KiwwwW....', '....lLllLl....', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
    ['..............', '.....KWWW.....', '....KwWWWW....', '....KwWWWW....', '....KYLLYW....', '...KiwwWWWW...', '...liwwwWqOOOO', '....Kiwwwq....', '....KiwwwW....', '....lLllLl....', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
  ],
  attackCombo4: [
    ['....qOOOq.....', '....KWWWO.....', '....KwWWWW....', '....KwWWWW....', '....KYLLYW....', '...KiwwWWWW...', '...liwwwWWl...', '....KiwwwWq...', '....KiwwwWq...', '....lLllLl....', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
    ['..............', '.....KWWW...O.', '....KwWWWW.OO.', '....KwWWWWOq..', '....KYLLYWqOO.', '...KiwwWWWqOO.', '...liwwwWWlO..', '....KiwwwWq...', '....KiwwwW....', '....lLllLl....', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
    ['..............', '.....KWWW.....', '....KwWWWW....', '....KwWWWW..O.', '....KYLLYW.OO.', '...KiwwWWWqOOO', '...liwwwWqOOO.', '....KiwwwqOO..', '....KiwwwqO...', '....lLllLlO...', '....KW..KW.O..', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
  ],
  castMagic: [
    ['..............', '.....KWWW.....', '....KwWWWW....', '....KwWWWW....', '....KYLLYW....', '...KiwwWWWWq..', '...liwwwWWlqL.', '....KiwwwWq.L.', '....KiwwwW....', '....lLllLl....', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
    ['..............', '.....KWWW....L', '....KwWWWW..LC', '....KwWWWW.LCL', '....KYLLYWqLCW', '...KiwwWWWqLCW', '...liwwwWWlqCL', '....KiwwwWq.LC', '....KiwwwW...L', '....lLllLl....', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
    ['...........L..', '.....KWWW.LCL.', '....KwWWWWLCWC', '....KwWWWWqCWW', '....KYLLYWqWWC', '...KiwwWWWqCWW', '...liwwwWWlqWC', '....KiwwwWq.CL', '....KiwwwW..L.', '....lLllLl....', '....KW..KW....', '....KW..KW....', '....KW..KW....', '...KiK..KwW...', '...KK....KK...', '..............'],
  ],
  parryStance: [
    ['..............', '..........O...', '.....KWWW.....', '....KwWWWWq...', '....KYLLYWqO..', '..O.KiwwWWql..', '...liwwwWWq...', '...KiwwwWWq...', '...KillLll....', '...KWK..KWK...', '..KW.....KW...', '..KW.....KW...', '.OKK.....KKO..', '..K.......K...', '..............', '..............'],
    ['..............', '..O.......O...', '.....KWWW.q...', '....KwWWWWqO..', '....KYLLYWqG..', '.O..KiwwWWql..', '...liwwwWWq...', '...KiwwwWWq...', '...KillLll.O..', '...KWK..KWK...', '..KW.....KW...', '.OKW.....KWO..', '..KK.....KK...', '..K.......K...', '..............', '..............'],
  ],
  airDownStrike: [
    ['..............', '..............', '.....KWWW.....', '....KwWWWW....', '....KYLLYW....', '...KiwwWWWW...', '...liwwwWWl...', '....KiwwwWq...', '....KiwwwWq...', '....lLllLl....', '.....KqqK.....', '.....KOOK.....', '......OO......', '......OO......', '......LL......', '......ll......'],
    ['..............', '..............', '.....KWWW.....', '....KwWWWW....', '....KYLLYW....', '...KiwwWWWW...', '...liwwwWWl...', '....KiwwwWq...', '....KiwwwWq...', '....lLllLl....', '.....KqqK.....', '.....KOOK.....', '......OO......', '.....LLLl.....', '......LL......', '......ll......'],
  ],
  fearStunned: [
    ['..............', '..............', '..............', '..............', '..............', '..............', '..............', '..............', '..............', '..............', '...KWWk.......', '..KWLLWk......', '.KwWWWWWwwiK..', '..KKkWWWwKkK..', '...K..qKK.K...', '..............'],
    ['..............', '..............', '..............', '..............', '..............', '..............', '..............', '..............', '..............', '..............', '...KWWk....q..', '..KWLLWk...q..', '.KwWWWWWwwiK..', '..KKkWWWwKkK..', '...K...qKKk...', '..............'],
  ],
};

// ---------------------------------------------------------------------------
// Rendering engine
// ---------------------------------------------------------------------------
// A "sprite frame" is a matrix: an array of equal-length strings where each
// character is a key into PALETTE ('.' / ' ' == transparent). The engine paints
// one ctx.fillRect per opaque cell, scaled up by `pixelSize` for the chunky
// retro-pixel look. Nothing here touches game logic — it is pure drawing.

export class SpriteManager {
    /**
     * Paint a matrix at a top-left origin (in world/canvas space).
     * @param {object} opts { flip, alpha, tint }  tint overrides every opaque
     *        pixel with one color (used for the white hit-flash / telegraphs).
     */
    static drawMatrix(ctx, matrix, originX, originY, pixelSize, opts = {}) {
        if (!matrix || !matrix.length) return;
        const { flip = false, alpha = 1, tint = null } = opts;
        const rows = matrix.length;
        const cols = matrix[0].length;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (alpha !== 1) ctx.globalAlpha *= alpha;

        for (let r = 0; r < rows; r++) {
            const row = matrix[r];
            for (let c = 0; c < cols; c++) {
                const key = row[c];
                if (key === '.' || key === ' ') continue;
                const color = tint || PALETTE[key];
                if (!color) continue;
                const cc = flip ? (cols - 1 - c) : c;
                ctx.fillStyle = color;
                ctx.fillRect(originX + cc * pixelSize, originY + r * pixelSize, pixelSize, pixelSize);
            }
        }
        ctx.restore();
    }

    /**
     * Draw a frame centered horizontally on `centerX` with its FEET resting on
     * `bottomY` (so sprites stand on the ground regardless of grid height).
     * Origin is rounded to whole pixels to keep the art crisp.
     * @returns {{width:number,height:number,originX:number,originY:number}}
     */
    static drawSprite(ctx, frame, centerX, bottomY, opts = {}) {
        if (!frame || !frame.length) return null;
        const pixelSize = opts.pixelSize || 4;
        const cols = frame[0].length;
        const rows = frame.length;
        const wpx = cols * pixelSize;
        const hpx = rows * pixelSize;
        const originX = Math.round(centerX - wpx / 2);
        const originY = Math.round(bottomY - hpx);
        SpriteManager.drawMatrix(ctx, frame, originX, originY, pixelSize, opts);
        return { width: wpx, height: hpx, originX, originY };
    }

    static frameSize(frame, pixelSize) {
        return { width: frame[0].length * pixelSize, height: frame.length * pixelSize };
    }

    /** Soft contact shadow on the floor (call only while grounded). */
    static drawShadow(ctx, cx, groundY, width, opts = {}) {
        const { alpha = 0.3 } = opts;
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(cx, groundY, Math.max(6, width / 2), Math.max(3, width * 0.14), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /**
     * REQUIREMENT 2 + 4 — the Boss's procedural dark aura, upgraded to be far
     * larger and more majestic: a soft pool of darkness underfoot, a twin-layer
     * void haze, a slow-rotating crown of shadow tendrils, a dense ring of
     * swirling wisps, and rising embers. Driven by `time`, so it lives and
     * breathes. Draw it BEFORE the Boss sprite so the figure sits inside it.
     *
     * @param {object} opts { radius, time(ms), seed, intensity }
     */
    static drawAura(ctx, cx, cy, opts = {}) {
        const {
            radius = 70,
            time = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            seed = 0,
            intensity = 1,
        } = opts;
        const t = time / 1000 + seed;
        const LITE = isLiteVfx();
        const PERF = isPerfVfx();

        ctx.save();
        ctx.translate(cx, cy);

        // 0) Pool of darkness pooled beneath the figure.
        ctx.save();
        ctx.globalAlpha = 0.30 * intensity;
        const pool = ctx.createRadialGradient(0, radius * 0.80, 2, 0, radius * 0.80, radius * 0.95);
        pool.addColorStop(0, 'rgba(10, 2, 16, 0.85)');
        pool.addColorStop(1, 'rgba(4, 1, 8, 0)');
        ctx.fillStyle = pool;
        ctx.beginPath();
        ctx.ellipse(0, radius * 0.82, radius * 0.98, radius * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 1) Twin-layer void haze: inner violet glow over a broad dark cloud.
        const pulse = 0.85 + 0.18 * Math.sin(t * 1.6);
        const haze = ctx.createRadialGradient(0, 0, radius * 0.12, 0, 0, radius * pulse * 1.15);
        haze.addColorStop(0.00, `rgba(72, 20, 122, ${0.34 * intensity})`);
        haze.addColorStop(0.38, `rgba(40, 10, 70, ${0.26 * intensity})`);
        haze.addColorStop(0.72, `rgba(18, 5, 34, ${0.18 * intensity})`);
        haze.addColorStop(1.00, 'rgba(4, 1, 8, 0)');
        ctx.fillStyle = haze;
        ctx.beginPath();
        ctx.arc(0, 0, radius * pulse * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // 2) Slow-rotating crown of shadow tendrils (the "majestic" silhouette).
        // Performance keeps the crown readable but thins it and drops the blur pass.
        const T = PERF ? 4 : (LITE ? 6 : 10);
        ctx.shadowBlur = PERF ? 0 : (LITE ? 8 : 16);
        for (let i = 0; i < T; i++) {
            const ang = t * 0.5 + (i * Math.PI * 2) / T;
            const len = radius * (0.95 + 0.18 * Math.sin(t * 1.3 + i));
            const x = Math.cos(ang) * len;
            const y = Math.sin(ang) * len * 0.92 - radius * 0.05;
            const a = 0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.0));
            ctx.globalAlpha = a * intensity;
            ctx.fillStyle = 'rgba(26, 8, 48, 0.9)';
            ctx.shadowColor = 'rgba(80, 30, 150, 0.8)';
            ctx.beginPath();
            ctx.ellipse(x, y, radius * 0.16, radius * 0.07, ang, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3) Dense ring of swirling shadow wisps (violet, with red sparks).
        const N = PERF ? 7 : (LITE ? 12 : 22);
        ctx.shadowBlur = LITE ? 0 : 10;
        for (let i = 0; i < N; i++) {
            const ang = t * (0.5 + 0.05 * i) + (i * Math.PI * 2) / N;
            const orbit = radius * (0.50 + 0.40 * Math.sin(t * 1.2 + i * 1.7));
            const x = Math.cos(ang) * orbit;
            const y = Math.sin(ang) * orbit * 0.80 - radius * 0.08;
            const s = 2.0 + 3.4 * ((i * 7) % 5) / 5;
            const red = i % 5 === 0;
            const a = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(t * 2.1 + i));
            ctx.globalAlpha = a * intensity;
            ctx.fillStyle = red ? 'rgba(255, 50, 50, 0.9)' : 'rgba(130, 65, 200, 0.9)';
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(x, y, s, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4) Embers drifting upward through the figure.
        const E = PERF ? 2 : (LITE ? 4 : 8);
        for (let i = 0; i < E; i++) {
            const phase = (t * 0.6 + i / E) % 1;            // 0..1 rise
            const x = Math.sin((i * 12.9 + t) * 1.3) * radius * 0.45;
            const y = radius * 0.55 - phase * radius * 1.35;  // bottom -> top
            const a = (1 - phase) * 0.55 * intensity;
            ctx.globalAlpha = a;
            ctx.fillStyle = i % 2 ? 'rgba(255, 70, 60, 0.95)' : 'rgba(160, 85, 230, 0.95)';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = LITE ? 0 : 8;
            ctx.beginPath();
            ctx.arc(x, y, 1.6 + (1 - phase) * 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * REQUIREMENT 3 (dash) — crimson "drill" aura. A tight blood-red halo
     * wrapping the curled Boss plus a spray of fast sparks spiralling around the
     * spin axis. Pair with drawSpeedStreaks() for the wind trail. Visual-only.
     *
     * @param {number} dir  +1 / -1 travel direction (the dash direction).
     * @param {object} opts { radius, time(ms), intensity }
     */
    static drawDashAura(ctx, cx, cy, dir = 1, opts = {}) {
        const {
            radius = 55,
            time = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            intensity = 1,
        } = opts;
        const t = time / 1000;

        ctx.save();
        ctx.translate(cx, cy);

        // Tight crimson halo, stretched along the travel axis.
        ctx.save();
        ctx.scale(1.35, 0.80);
        const halo = ctx.createRadialGradient(0, 0, radius * 0.10, 0, 0, radius);
        halo.addColorStop(0.0, `rgba(255, 60, 50, ${0.55 * intensity})`);
        halo.addColorStop(0.4, `rgba(200, 20, 30, ${0.35 * intensity})`);
        halo.addColorStop(1.0, 'rgba(60, 0, 8, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Sparks whipping around the drill (counter to travel = sense of spin).
        ctx.shadowBlur = 8;
        const N = 14;
        for (let i = 0; i < N; i++) {
            const ang = -dir * (t * 9 + i * 0.9);
            const orbit = radius * (0.35 + 0.30 * ((i * 3) % 5) / 5);
            const x = Math.cos(ang) * orbit * 1.30;
            const y = Math.sin(ang) * orbit * 0.70;
            const a = 0.40 + 0.40 * (0.5 + 0.5 * Math.sin(t * 6 + i));
            ctx.globalAlpha = a * intensity;
            ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 180, 120, 0.95)' : 'rgba(255, 50, 40, 0.95)';
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(x, y, 1.6 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /**
     * REQUIREMENT 3 (dash) — wind / vacuum speed streaks left behind a fast
     * entity. `trail` is an array of {x, y} from OLDEST to NEWEST (the entity's
     * recent positions). Draws tapered motion lines that brighten toward the
     * head plus a few short wind dashes streaming off the back. Visual-only.
     *
     * @param {Array<{x:number,y:number}>} trail
     * @param {object} opts { time(ms), spread }  spread = fan half-height in px.
     */
    static drawSpeedStreaks(ctx, trail, opts = {}) {
        if (!trail || trail.length < 2) return;
        const {
            time = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            spread = 22,
        } = opts;
        const n = trail.length;
        const head = trail[n - 1];
        const tail = trail[0];
        const dx = head.x - tail.x, dy = head.y - tail.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;      // perpendicular, for fanning
        const dir = Math.sign(dx) || 1;

        ctx.save();
        ctx.lineCap = 'round';

        // Parallel streak lines fanned across the body height.
        const lanes = [-0.7, -0.3, 0.0, 0.35, 0.75];
        for (let L = 0; L < lanes.length; L++) {
            const off = lanes[L] * spread;
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
                const x = trail[i].x + nx * off;
                const y = trail[i].y + ny * off;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            const crimson = L % 2 === 0;
            const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
            grad.addColorStop(0, 'rgba(255, 40, 40, 0)');
            grad.addColorStop(1, crimson ? 'rgba(255, 80, 70, 0.55)' : 'rgba(255, 200, 180, 0.50)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = crimson ? 3 : 1.5;
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(255, 60, 50, 0.7)';
            ctx.stroke();
        }

        // Short wind dashes streaming off the back (behind the head).
        const t = time / 1000;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(255, 90, 70, 0.6)';
        for (let i = 0; i < 6; i++) {
            const back = (i + ((t * 6) % 1)) * 10;
            const bx = head.x - dir * (10 + back);
            const off = (((i * 37) % 100) / 100 - 0.5) * spread * 1.4;
            const by = head.y + ny * off;
            const a = Math.max(0, 0.5 - back / 90);
            ctx.globalAlpha = a;
            ctx.strokeStyle = i % 2 ? 'rgba(255, 210, 190, 0.8)' : 'rgba(255, 70, 55, 0.85)';
            ctx.lineWidth = i % 2 ? 1 : 2;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx - dir * 9, by);
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * REQUIREMENT 2 (void sword) — a small swirling glow that rides on the
     * Boss's blade so the weapon reads as bleeding dark energy. The caller
     * positions (x, y) on the blade; `dir` aims the swirl in the facing
     * direction. Visual-only.
     *
     * @param {object} opts { radius, time(ms), intensity }
     */
    static drawVoidEdge(ctx, x, y, dir = 1, opts = {}) {
        const {
            radius = 26,
            time = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            intensity = 1,
        } = opts;
        const t = time / 1000;
        const LITE = isLiteVfx();
        const PERF = isPerfVfx();

        ctx.save();
        ctx.translate(x, y);
        const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, radius);
        glow.addColorStop(0.0, `rgba(150, 90, 255, ${0.50 * intensity})`);
        glow.addColorStop(0.5, `rgba(90, 40, 180, ${0.28 * intensity})`);
        glow.addColorStop(1.0, 'rgba(20, 6, 40, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = LITE ? 0 : 8;
        for (let i = 0; i < (PERF ? 2 : (LITE ? 3 : 6)); i++) {
            const ang = dir * (t * 3 + i * 1.05);
            const orbit = radius * (0.30 + 0.40 * ((i * 3) % 4) / 4);
            const px = Math.cos(ang) * orbit;
            const py = Math.sin(ang) * orbit * 0.80;
            const a = 0.35 + 0.40 * (0.5 + 0.5 * Math.sin(t * 4 + i));
            ctx.globalAlpha = a * intensity;
            ctx.fillStyle = i % 4 === 0 ? 'rgba(255, 60, 70, 0.9)' : 'rgba(180, 110, 255, 0.9)';
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(px, py, 1.4 + (i % 3) * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /**
     * REQUIREMENT 3 - the Dark Flame projectile (Hit 3). A travelling ball of
     * violet hellfire: a dark-violet core, crackling crimson/amber tongues that
     * flicker forward along `dir`, and a smoky ember tail streaming behind it.
     * Procedural (gradients + particles), not a sprite matrix. Visual-only.
     *
     * @param {number} cx, cy  flame centre in world space.
     * @param {number} dir     +1 / -1 travel direction (default +1).
     * @param {object} opts     { time(ms), progress(0..1), width, height, intensity }
     */
    static drawDarkFlame(ctx, cx, cy, dir = 1, opts = {}) {
        const {
            time = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            progress = 0, width = 64, height = 56, intensity = 1,
        } = opts;
        const t = time / 1000;
        const grow = Math.min(1, progress / 0.12);                       // quick spawn-in
        const fade = progress > 0.85 ? Math.max(0, 1 - (progress - 0.85) / 0.15) : 1; // burn-out
        const a = grow * fade * intensity;
        const R = height * 0.5;

        ctx.save();
        ctx.translate(cx, cy);

        // Smoky ember tail behind the flame (opposite the travel direction).
        for (let i = 0; i < 6; i++) {
            const back = (i + ((t * 4) % 1)) * (width * 0.16);
            const tx = -dir * (R * 0.4 + back);
            const ty = Math.sin(t * 6 + i) * R * 0.18;
            const ta = a * Math.max(0, 0.5 - back / (width * 1.1));
            ctx.globalAlpha = ta;
            ctx.fillStyle = i % 2 ? 'rgba(60, 20, 90, 0.8)' : 'rgba(120, 40, 40, 0.7)';
            ctx.beginPath();
            ctx.arc(tx, ty, R * (0.5 - i * 0.05), 0, Math.PI * 2);
            ctx.fill();
        }

        // Dark-violet core glow.
        ctx.globalAlpha = a;
        const core = ctx.createRadialGradient(0, 0, R * 0.12, 0, 0, R * 1.15);
        core.addColorStop(0.0, 'rgba(200, 130, 255, 0.95)');
        core.addColorStop(0.35, 'rgba(126, 63, 214, 0.85)');
        core.addColorStop(0.70, 'rgba(42, 20, 80, 0.55)');
        core.addColorStop(1.0, 'rgba(12, 4, 24, 0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // Crackling fire tongues licking forward + up (amber / crimson / violet).
        ctx.shadowBlur = 10;
        const N = 16;
        for (let i = 0; i < N; i++) {
            const flick = 0.5 + 0.5 * Math.sin(t * 14 + i * 1.7);
            const ang = (-Math.PI / 2) + (i / N - 0.5) * Math.PI * 1.1 + dir * 0.2;
            const len = R * (0.6 + 0.7 * flick);
            const fx = Math.cos(ang) * len * 0.7 + dir * R * 0.25 * flick;
            const fy = Math.sin(ang) * len;
            ctx.globalAlpha = a * (0.4 + 0.5 * flick);
            ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 200, 110, 0.95)'
                          : i % 3 === 1 ? 'rgba(255, 70, 50, 0.95)'
                                        : 'rgba(190, 80, 255, 0.9)';
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(fx, fy, 2 + 2.5 * flick, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /**
     * REQUIREMENT 3 - the Explosive Finisher blast (Hit 4) AND the air-dive
     * landing shockwave. Both are the same detonation, so one function renders
     * both forms; pass `flat: true` for the ground-hugging shockwave variant.
     * Procedural (gradients + particles); visual-only.
     *
     *   default  : a massive spherical blast - white-hot heart, fiery
     *              orange/red/violet body, an expanding shock ring, flung shards
     *              and rising smoke. Draw it OVER the Boss for maximum impact.
     *   flat:true : a flattened ring of force racing outward across the floor
     *              with an inner glow + a kick of dust motes. Draw it UNDER the
     *              Boss, anchored at the ground line.
     *
     * @param {number} cx, cy  blast centre (spherical) / ground point (flat).
     * @param {object} opts     { time(ms), progress(0..1), radius, intensity, flat }
     */
    static drawExplosion(ctx, cx, cy, opts = {}) {
        const {
            time = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            progress = 0, radius = 100, intensity = 1, flat = false,
        } = opts;
        const t = time / 1000;
        const ease = (p) => 1 - (1 - p) * (1 - p);
        const LITE = isLiteVfx();
        const PERF = isPerfVfx();

        // ---- Ground shockwave variant (air-dive landing) ----------------------
        if (flat) {
            const r = radius * (0.15 + 0.95 * ease(progress));
            const fade = Math.max(0, 1 - progress);
            const squash = 0.32; // vertical squash => a ground-hugging ring

            ctx.save();
            ctx.translate(cx, cy);

            // Inner ground glow.
            ctx.globalAlpha = fade * 0.5 * intensity;
            const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
            glow.addColorStop(0.0, 'rgba(190, 120, 255, 0.5)');
            glow.addColorStop(0.6, 'rgba(120, 40, 160, 0.22)');
            glow.addColorStop(1.0, 'rgba(20, 6, 30, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.ellipse(0, 0, r, r * squash, 0, 0, Math.PI * 2);
            ctx.fill();

            // The racing ring (bright violet crest + crimson under-ring).
            ctx.globalAlpha = fade * intensity;
            ctx.lineWidth = Math.max(2, r * 0.06 * (1 - progress * 0.6));
            ctx.shadowBlur = PERF ? 4 : (LITE ? 8 : 16);
            ctx.shadowColor = 'rgba(150, 80, 255, 0.9)';
            ctx.strokeStyle = 'rgba(230, 200, 255, 0.95)';
            ctx.beginPath();
            ctx.ellipse(0, 0, r, r * squash, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.lineWidth = Math.max(1, r * 0.03);
            ctx.strokeStyle = 'rgba(255, 70, 90, 0.7)';
            ctx.shadowColor = 'rgba(255, 60, 70, 0.8)';
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.82, r * squash * 0.82, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Dust motes kicked up around the ring crest.
            ctx.shadowBlur = LITE ? 0 : 6;
            const Nd = PERF ? 4 : (LITE ? 7 : 14);
            for (let i = 0; i < Nd; i++) {
                const ang = (i / Nd) * Math.PI * 2;
                const dx = Math.cos(ang) * r;
                const dy = Math.sin(ang) * r * squash - progress * 18; // lift as it travels
                ctx.globalAlpha = fade * (0.4 + 0.4 * Math.sin(t * 12 + i)) * intensity;
                ctx.fillStyle = i % 2 ? 'rgba(200, 160, 255, 0.85)' : 'rgba(150, 90, 210, 0.8)';
                ctx.shadowColor = ctx.fillStyle;
                ctx.beginPath();
                ctx.arc(dx, dy, 1.6 + (i % 3), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
            return;
        }

        // ---- Spherical blast variant (finisher) -------------------------------
        const r = radius * (0.25 + 0.85 * ease(progress));
        const fade = progress < 0.6 ? 1 : Math.max(0, 1 - (progress - 0.6) / 0.4);

        ctx.save();
        ctx.translate(cx, cy);

        // Fiery body.
        ctx.globalAlpha = fade * intensity;
        const body = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r);
        body.addColorStop(0.00, 'rgba(255, 255, 240, 0.98)');
        body.addColorStop(0.18, 'rgba(255, 220, 130, 0.95)');
        body.addColorStop(0.42, 'rgba(255, 110, 50, 0.9)');
        body.addColorStop(0.68, 'rgba(190, 40, 60, 0.7)');
        body.addColorStop(0.86, 'rgba(110, 40, 160, 0.45)');
        body.addColorStop(1.00, 'rgba(20, 6, 30, 0)');
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Expanding shock ring.
        ctx.globalAlpha = fade * 0.8 * intensity;
        ctx.lineWidth = Math.max(1.5, r * 0.05 * (1 - progress));
        ctx.strokeStyle = 'rgba(255, 230, 180, 0.9)';
        ctx.shadowBlur = PERF ? 5 : (LITE ? 9 : 18);
        ctx.shadowColor = 'rgba(255, 140, 60, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, r * (0.85 + 0.2 * progress), 0, Math.PI * 2);
        ctx.stroke();

        // Radial shards flung outward.
        ctx.shadowBlur = LITE ? 0 : 10;
        const Ns = PERF ? 6 : (LITE ? 10 : 20);
        for (let i = 0; i < Ns; i++) {
            const ang = (i / Ns) * Math.PI * 2 + i * 0.3;
            const dist = r * (0.6 + 0.5 * ((i * 7) % 5) / 5);
            const sx = Math.cos(ang) * dist;
            const sy = Math.sin(ang) * dist;
            ctx.globalAlpha = fade * (0.5 + 0.4 * Math.sin(t * 10 + i)) * intensity;
            ctx.fillStyle = i % 2 ? 'rgba(255, 180, 90, 0.95)' : 'rgba(255, 80, 60, 0.95)';
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(sx, sy, 2 + (i % 3) * 1.6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Rising smoke puffs as it dissipates.
        for (let i = 0; i < (PERF ? 2 : (LITE ? 3 : 6)); i++) {
            const rise = progress * r * 0.9;
            const px = Math.cos(i * 1.7) * r * 0.4;
            const py = -rise + Math.sin(i * 2.1) * r * 0.1;
            ctx.globalAlpha = fade * 0.3 * intensity;
            ctx.fillStyle = 'rgba(40, 20, 50, 0.7)';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(px, py, r * (0.18 + 0.05 * i) * progress, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /**
     * Convenience alias: the air-dive landing shockwave is simply the explosion
     * rendered in its flattened ground mode. Kept so call sites (Player.js) read
     * by intent; it adds no new logic - just forwards to drawExplosion().
     */
    static drawShockwave(ctx, gx, gy, opts = {}) {
        return SpriteManager.drawExplosion(ctx, gx, gy, { radius: 110, ...opts, flat: true });
    }

    /**
     * The Hero's HOLY LIGHT WAVE — a divine, white-hot golden crescent slash that
     * looks like it is tearing the air open ("Holy Lightning"). Fully procedural,
     * self-positioning at (x, y) and self-animating off opts.time.
     *
     * The blade is a sharp, fat-bellied crescent moon traced with quadratic/bezier
     * curves (pointed cusps, thick belly, hooked like the reference). It is built
     * up in concentric glow layers under heavy golden shadowBlur:
     *     soft gold aura -> thick gold body (+ glowing gold stroke)
     *                    -> pale gold -> blinding white-hot core -> searing centerline
     * then dressed with motion-smear ghosts, trailing "speed" slashes peeling off
     * the back tip, and energy sparks flying along the edge.
     *
     * SCALE: sized to MATCH the ~144px Boss (default size = 140). The solid blade
     * spans about one Boss-height tip-to-tip — menacing and proportionally matched,
     * never bigger than the Boss. Only the soft glow bleeds slightly past, which is
     * exactly what a holy glow should do.  (If your call site still passes
     * opts.size = 210 from the old version, drop it or set it to ~140.)
     *
     * waveType:  1 = powerful DIAGONAL slash
     *            2 = powerful VERTICAL / upright slash
     *            3 = devastating X-CROSS  (two intersecting crescents)
     * facing:    +1 / -1  mirrors the whole slash along travel direction.
     *
     * NOTE: `opts` is kept optional so existing call sites (which pass time/alpha
     * for the lifetime animation + fade) still work — calling it as
     * drawLightWave(ctx, x, y, waveType, facing) alone is also valid.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y          world position (slash centre)
     * @param {number} waveType   1 | 2 | 3
     * @param {number} facing     +1 / -1 (mirrors the slash)
     * @param {object} [opts]      { time(ms), alpha, size }  alpha fades by lifetime
     */
    static drawLightWave(ctx, x, y, waveType = 1, facing = 1, opts = {}) {
        const {
            time  = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            alpha = 1,
            size  = 140,                 // ~= Boss height (24 * BOSS_PIXEL = 144): matched, not bigger
        } = opts;
        if (alpha <= 0 || size <= 0) return;

        const t   = time / 1000;
        const LITE = isLiteVfx();
        const PERF = isPerfVfx();
        const dir = facing >= 0 ? 1 : -1;
        // High-frequency searing flicker -> drives brightness + a little thickness pulse.
        const flick = 0.82 + 0.18 * Math.sin(t * 22 + waveType * 1.9);

        // --- Crescent geometry (local frame, rotated per type below) -------------
        // Rs = radius of the spine arc, so the blade spans ~size px tip-to-tip.
        const Rs    = size * 0.50;
        const sweep = waveType === 2 ? 2.70 : 2.85;                 // arc length (radians, ~155-163deg)
        const Wmax  = size * (waveType === 3 ? 0.150 : waveType === 2 ? 0.165 : 0.175)
                           * (0.90 + 0.14 * flick);                 // fattest half-width (pulses)
        const N     = 26;                                           // spine samples -> bezier anchors

        // Orientation per type, authored for dir = +1 (mirrored as a whole below).
        const baseRot = waveType === 2 ? -Math.PI / 2 + 0.15        // upright / vertical slash
                      : waveType === 3 ? -Math.PI * 0.62            // leading blade of the X
                      :                  -Math.PI * 0.30;           // diagonal slash

        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha *= alpha;
        const baseGA = ctx.globalAlpha;
        ctx.scale(dir, 1);                       // mirror the whole slash by travel direction
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        // Trace a CLOSED outline smoothly through `pts` using quadratic curves
        // (midpoint method) -> organic, sharp-tipped bezier edges.
        const smoothClosed = (pts) => {
            const n = pts.length;
            ctx.beginPath();
            ctx.moveTo((pts[n - 1].x + pts[0].x) / 2, (pts[n - 1].y + pts[0].y) / 2);
            for (let i = 0; i < n; i++) {
                const cur = pts[i], nxt = pts[(i + 1) % n];
                ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + nxt.x) / 2, (cur.y + nxt.y) / 2);
            }
            ctx.closePath();
        };

        // Build one crescent at rotation `rot`: spine samples + an outline()
        // generator that scales half-width by `k` (for the concentric layers).
        const buildCrescent = (rot) => {
            const a0 = rot - sweep / 2, a1 = rot + sweep / 2;
            const spine = [];
            for (let s = 0; s <= N; s++) {
                const u = s / N, ang = a0 + (a1 - a0) * u;
                spine.push({ ang, u, x: Math.cos(ang) * Rs, y: Math.sin(ang) * Rs });
            }
            // 0 at both tips (sharp cusps), fat belly, biased toward the front tip
            // for the hooked / comma silhouette of the reference image.
            const halfW = (u) =>
                Math.max(0, Wmax * Math.pow(Math.sin(Math.PI * u), 0.60) * (1 + 0.35 * (u - 0.5)));
            const outline = (k) => {
                const pts = [];
                for (let s = 0; s <= N; s++) {                       // outer edge: back -> front
                    const p = spine[s], w = halfW(p.u) * k;
                    pts.push({ x: p.x + Math.cos(p.ang) * w, y: p.y + Math.sin(p.ang) * w });
                }
                for (let s = N; s >= 0; s--) {                       // inner edge: front -> back
                    const p = spine[s], w = halfW(p.u) * k;
                    pts.push({ x: p.x - Math.cos(p.ang) * w, y: p.y - Math.sin(p.ang) * w });
                }
                return pts;
            };
            return { spine, outline, tipBack: spine[0] };
        };

        // Render one crescent with the full holy-glow stack (or a cheap ghost smear).
        const paintCrescent = (rot, ghost = false) => {
            const cr = buildCrescent(rot);

            if (!ghost && !PERF) {
                // (a) Soft holy aura hugging the blade — fat, heavily blurred gold.
                // Performance drops this single biggest translucent-overdraw+blur pass
                // (a 1.55x-scaled full-blade fill); the gold body + white core below
                // still carry the blade's shape and readability.
                ctx.shadowBlur  = LITE ? 16 : 40;                    // <- pushed to the max (30-40)
                ctx.shadowColor = `rgba(255, 205, 70, ${0.95 * flick})`;
                ctx.fillStyle   = `rgba(255, 198, 72, ${0.34 * flick})`;
                smoothClosed(cr.outline(1.55));
                ctx.fill();
            }

            // (b) Thick gold BODY of the blade.
            ctx.shadowBlur  = ghost ? (LITE ? 8 : 16) : (PERF ? 6 : (LITE ? 14 : 34));
            ctx.shadowColor = 'rgba(255, 200, 60, 0.95)';
            ctx.fillStyle   = ghost ? 'rgba(255, 210, 90, 0.50)' : 'rgba(255, 216, 96, 0.96)';
            smoothClosed(cr.outline(1.0));
            ctx.fill();

            if (!ghost && !LITE) {
                // (b2) Intense, thick golden outer STROKE around the body.
                // Lite drops this duplicate glow layer; the body fill above +
                // the amber rim below keep the same blade outline.
                ctx.shadowBlur  = 32;
                ctx.shadowColor = 'rgba(255, 196, 56, 0.95)';
                ctx.strokeStyle = 'rgba(255, 208, 80, 0.90)';
                ctx.lineWidth   = Math.max(1.5, size * 0.016);
                smoothClosed(cr.outline(1.0));
                ctx.stroke();
            }

            // (c) Pale-gold mid layer (smooth white -> gold falloff).
            ctx.shadowBlur  = ghost ? (LITE ? 6 : 8) : (PERF ? 5 : (LITE ? 12 : 30));
            ctx.shadowColor = 'rgba(255, 238, 168, 0.95)';
            ctx.fillStyle   = 'rgba(255, 240, 172, 0.96)';
            smoothClosed(cr.outline(0.60));
            ctx.fill();

            // (d) Blinding WHITE-HOT core (thin inner ribbon).
            ctx.shadowBlur  = ghost ? (LITE ? 4 : 6) : (PERF ? 5 : (LITE ? 10 : 24));
            ctx.shadowColor = 'rgba(255, 250, 214, 1)';
            ctx.fillStyle   = 'rgba(255, 255, 250, 0.98)';
            smoothClosed(cr.outline(0.30));
            ctx.fill();

            if (!ghost) {
                // (e) Crisp amber rim — the darker "tearing" edge from the reference.
                ctx.shadowBlur  = 0;
                ctx.strokeStyle = 'rgba(230, 150, 28, 0.55)';
                ctx.lineWidth   = Math.max(1, size * 0.006);
                smoothClosed(cr.outline(1.0));
                ctx.stroke();

                // (f) Searing white centerline down the spine (the "lightning").
                ctx.beginPath();
                cr.spine.forEach((p, s) => (s ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
                ctx.shadowBlur  = PERF ? 6 : (LITE ? 10 : 18);
                ctx.shadowColor = 'rgba(255, 232, 150, 1)';
                ctx.strokeStyle = 'rgba(255, 248, 206, 0.95)';
                ctx.lineWidth   = Math.max(1.5, size * 0.018);
                ctx.stroke();
                ctx.shadowBlur  = PERF ? 4 : (LITE ? 6 : 10);
                ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
                ctx.lineWidth   = Math.max(1, size * 0.008);
                ctx.stroke();
            }
            return cr;
        };

        // 1) Motion-smear ghosts — faint shrinking trailing copies, drawn first.
        // Lite keeps a single ghost so the slash still reads as "in motion";
        // performance drops them entirely (the main slash still reads clearly).
        for (let g = (PERF ? 0 : (LITE ? 1 : 3)); g >= 1; g--) {
            ctx.save();
            ctx.rotate(-0.06 * g);
            ctx.scale(1 - 0.06 * g, 1 - 0.06 * g);
            ctx.globalAlpha = baseGA * (0.18 / g);
            paintCrescent(baseRot, true);
            ctx.restore();
        }

        // 2) Main slash at full glory. Type 3 adds a second crossing crescent -> X.
        ctx.globalAlpha = baseGA;
        const main = paintCrescent(baseRot);
        if (waveType === 3) {
            ctx.save();
            ctx.scale(1, -1);                    // reflect -> the two blades cross in an X
            paintCrescent(baseRot);
            ctx.restore();
        }

        // 3) Trailing sharp "speed" slashes peeling off the back tip (tearing air).
        ctx.shadowBlur  = PERF ? 4 : (LITE ? 8 : 16);
        ctx.shadowColor = 'rgba(255, 220, 110, 0.90)';
        const back = main.tipBack;
        const ox = Math.cos(back.ang),               oy = Math.sin(back.ang);            // along the arc
        const nx = Math.cos(back.ang + Math.PI / 2), ny = Math.sin(back.ang + Math.PI / 2);
        for (let i = 0; i < (PERF ? 1 : (LITE ? 2 : 4)); i++) {
            const len = size * (0.22 + 0.10 * i) * (0.80 + 0.20 * Math.sin(t * 8 + i));
            const off = (i - 1.5) * size * 0.014;
            const sx  = back.x + nx * off, sy = back.y + ny * off;
            ctx.globalAlpha = baseGA * (0.50 - 0.10 * i) * flick;
            ctx.strokeStyle = i % 2 ? 'rgba(255, 214, 96, 0.90)' : 'rgba(255, 250, 220, 0.95)';
            ctx.lineWidth   = Math.max(1, size * (0.012 - 0.002 * i));
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(                                    // bow the streak for a "whip"
                sx + ox * len * 0.5 + nx * len * 0.10,
                sy + oy * len * 0.5 + ny * len * 0.10,
                sx + ox * len, sy + oy * len);
            ctx.stroke();
        }

        // 4) Energy sparks flying along the blade edge.
        ctx.shadowBlur = PERF ? 3 : (LITE ? 6 : 12);
        const SP = PERF ? 4 : (LITE ? 8 : (waveType === 3 ? 20 : 14));
        for (let i = 0; i < SP; i++) {
            const u   = (t * 0.9 + i / SP) % 1;
            const ang = (baseRot - sweep / 2) + sweep * u;
            const env = Math.sin(Math.PI * u);
            const r   = Rs + Wmax * (0.5 + 0.5 * env) + 0.05 * Rs * Math.sin(t * 6 + i * 1.3);
            const sx  = Math.cos(ang) * r, sy = Math.sin(ang) * r;
            ctx.globalAlpha = baseGA * (0.30 + 0.65 * env) * flick;
            ctx.fillStyle   = i % 3 === 0 ? 'rgba(255, 255, 240, 1)' : 'rgba(255, 212, 92, 1)';
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.4 + 2.4 * env, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Glorious lingering golden sparkle burst for the parry COUNTER-ATTACK.
     * A radiant bloom, an expanding shock ring, long radiating rays and a swarm
     * of twinkling motes. Self-positions at (x, y) and self-animates, so it can
     * simply be called every frame the counter is live.
     *
     * @param {object} [opts] { time(ms), intensity, radius, progress }
     *        progress 0..1 (optional) drives the ring expansion + fade; if
     *        omitted the burst breathes on a gentle loop (good for a hold).
     */
    static drawParrySparkles(ctx, x, y, opts = {}) {
        const {
            time = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            intensity = 1,
            radius = 90,
            progress = null,
        } = opts;
        const t = time / 1000;

        const grow = progress != null ? progress : (0.5 + 0.5 * Math.sin(t * 3));
        const A = intensity * (progress != null ? Math.max(0, 1 - progress) : 1);
        if (A <= 0) return;

        ctx.save();
        ctx.translate(x, y);
        ctx.lineCap = 'round';

        // 0) Golden bloom core.
        const bloom = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 0.9);
        bloom.addColorStop(0.00, `rgba(255, 250, 210, ${0.55 * A})`);
        bloom.addColorStop(0.35, `rgba(255, 215, 110, ${0.32 * A})`);
        bloom.addColorStop(1.00, 'rgba(255, 190, 50, 0)');
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // 1) Expanding shock ring.
        ctx.globalAlpha = 0.80 * A;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255, 230, 140, 0.9)';
        ctx.shadowBlur = 22;
        ctx.shadowColor = 'rgba(255, 200, 60, 1)';
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.35 + 0.55 * grow), 0, Math.PI * 2);
        ctx.stroke();

        // 2) Long radiating rays (alternating long/short), slowly spinning.
        const RAYS = 12;
        for (let i = 0; i < RAYS; i++) {
            const ang = t * 0.8 + (i * Math.PI * 2) / RAYS;
            const long = i % 2 === 0;
            const r0 = radius * 0.18;
            const r1 = radius * (long ? (0.85 + 0.12 * Math.sin(t * 4 + i)) : 0.5);
            const cos = Math.cos(ang), sin = Math.sin(ang);
            ctx.globalAlpha = (long ? 0.85 : 0.5) * A * (0.6 + 0.4 * Math.sin(t * 5 + i));
            ctx.lineWidth = long ? 2.4 : 1.4;
            ctx.strokeStyle = 'rgba(255, 240, 170, 0.95)';
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(255, 210, 90, 0.95)';
            ctx.beginPath();
            ctx.moveTo(cos * r0, sin * r0);
            ctx.lineTo(cos * r1, sin * r1);
            ctx.stroke();
        }

        // 3) Twinkling motes scattered through the bloom (golden-angle spread).
        const M = 18;
        ctx.shadowBlur = 8;
        for (let i = 0; i < M; i++) {
            const ang = i * 2.399963 + t * (0.6 + 0.04 * i);
            const rad = radius * (0.15 + 0.70 * ((i * 7) % 11) / 11);
            const px = Math.cos(ang) * rad;
            const py = Math.sin(ang) * rad * 0.92;
            const tw = 0.5 + 0.5 * Math.sin(t * 7 + i * 1.7);
            ctx.globalAlpha = tw * 0.9 * A;
            ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 255, 240, 0.95)' : 'rgba(255, 215, 110, 0.95)';
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(px, py, 1.3 + 1.6 * tw, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * SCREEN-SPACE fear effect — call while the Hero is under the 4s Fear Status.
     * Walls of roaring black-and-crimson fire climb the LEFT and RIGHT edges only
     * (top & bottom are intentionally clear now). Each wall is a stack of
     * overlapping sine-driven flame curtains — deep-black roots bleeding up into
     * bright crimson — plus flickering bezier tongues that lick inward and rising
     * embers. Draw in SCREEN space, after the camera transform is restored.
     *
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @param {object} [opts] { time(ms), intensity }  intensity (0..1) fades it in/out.
     */
    static drawFearScreenEffect(ctx, canvasWidth, canvasHeight, opts = {}) {
        const {
            time = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            intensity = 1,
        } = opts;
        const A = intensity;
        if (A <= 0) return;
        const t = time / 1000;
        const W = canvasWidth, H = canvasHeight;
        if (W <= 0 || H <= 0) return; // nothing to paint on a zero-size canvas

        // How far the fire reaches in from each side (capped so wide monitors
        // don't swallow the play area).
        const band = Math.min(W * 0.24, 280);

        // Layered curtains, back (darkest) -> front (brightest lick). `reach` is a
        // fraction of `band`; amp/freq/speed shape the sine sway; `stops` paint the
        // black -> crimson -> red heat ramp. Each stop is [offset, "r,g,b", alpha].
        const LAYERS = [
            { reach: 0.62, amp: 0.10, freq: 2.6, speed: 1.4, a: 0.95,
              stops: [[0, '2,0,0', 0.96], [0.45, '45,3,3', 0.85], [0.80, '120,10,9', 0.45], [1, '150,16,12', 0]] },
            { reach: 0.84, amp: 0.16, freq: 1.9, speed: 2.1, a: 0.80,
              stops: [[0, '10,0,0', 0.0], [0.40, '130,10,8', 0.55], [0.78, '205,26,18', 0.30], [1, '235,44,26', 0]] },
            { reach: 1.04, amp: 0.24, freq: 1.4, speed: 2.9, a: 0.70,
              stops: [[0, '60,3,2', 0.0], [0.50, '200,22,16', 0.0], [0.82, '255,60,38', 0.35], [1, '255,110,52', 0]] },
        ];

        ctx.save();

        for (const side of [-1, 1]) {            // -1 = left edge, +1 = right edge
            const edgeX = side < 0 ? 0 : W;
            const inX = -side;                    // inward screen direction (+x for left)
            const steps = 26;

            // --- stacked wavy flame curtains (overlapping sine waves) ----------
            for (const L of LAYERS) {
                const grad = ctx.createLinearGradient(edgeX, 0, edgeX + inX * band, 0);
                for (const [p, rgb, al] of L.stops) grad.addColorStop(p, `rgba(${rgb},${al * A})`);
                ctx.fillStyle = grad;

                ctx.beginPath();
                ctx.moveTo(edgeX, -2);
                ctx.lineTo(edgeX, H + 2);         // straight outer screen edge
                for (let s = steps; s >= 0; s--) {            // wavy inner boundary, bottom -> top
                    const y = (s / steps) * H;
                    const u = y / H;
                    // big slow undulation + a faster flicker => a living, roaring edge.
                    const wob =
                        Math.sin(u * L.freq * Math.PI * 2 + t * L.speed + side * 1.3) * L.amp +
                        Math.sin(u * (L.freq * 2.7) * Math.PI * 2 - t * (L.speed * 1.7)) * (L.amp * 0.4);
                    const reach = band * (L.reach * (0.78 + 0.22 * (0.5 + 0.5 * Math.sin(t * 0.7 + side))) + wob);
                    ctx.lineTo(edgeX + inX * Math.max(0, reach), y);
                }
                ctx.closePath();
                ctx.globalAlpha = L.a;
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // --- flickering bezier tongues licking inward off the front curtain --
            const TONGUES = 7;
            ctx.shadowBlur = 18;
            for (let i = 0; i < TONGUES; i++) {
                const base = (i + 0.5) / TONGUES;
                const ry = base * H + Math.sin(t * 1.1 + i * 2.2) * H * 0.03;
                const flick = 0.5 + 0.5 * Math.sin(t * 9 + i * 1.9);
                const len = band * (0.55 + 0.65 * flick);
                const halfH = H * (0.05 + 0.03 * flick);
                const rootX = edgeX + inX * band * 0.30;
                const tipX = edgeX + inX * (band * 0.30 + len);
                const sway = Math.sin(t * 3.3 + i) * H * 0.02;

                const g = ctx.createLinearGradient(rootX, 0, tipX, 0);
                g.addColorStop(0.00, 'rgba(8, 0, 0, 0)');
                g.addColorStop(0.25, `rgba(150, 12, 10, ${0.55 * A * flick})`);
                g.addColorStop(0.70, `rgba(238, 40, 30, ${0.6 * A * flick})`);
                g.addColorStop(1.00, 'rgba(255, 110, 52, 0)');
                ctx.fillStyle = g;
                ctx.shadowColor = `rgba(220, 40, 20, ${0.7 * A})`;

                ctx.beginPath();
                ctx.moveTo(rootX, ry - halfH);
                ctx.quadraticCurveTo(rootX + inX * len * 0.5, ry - halfH * 0.3 + sway, tipX, ry + sway);
                ctx.quadraticCurveTo(rootX + inX * len * 0.5, ry + halfH * 0.3 + sway, rootX, ry + halfH);
                ctx.closePath();
                ctx.fill();
            }
            ctx.shadowBlur = 0;

            // --- rising embers (additive, so they glow where they pile up) ------
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const EM = 16;
            for (let i = 0; i < EM; i++) {
                const phase = (t * 0.5 + i / EM) % 1;             // 1 -> 0 rise
                const ex = edgeX + inX * band * (0.12 + 0.7 * ((i * 7) % 5) / 5) + Math.sin(t * 2 + i) * 8;
                const ey = H - phase * H * 1.05;
                ctx.globalAlpha = (1 - phase) * 0.5 * A;
                ctx.fillStyle = i % 4 === 0 ? 'rgba(255, 150, 70, 1)' : 'rgba(255, 48, 28, 1)';
                ctx.beginPath();
                ctx.arc(ex, ey, 1.2 + (1 - phase) * 2.0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore();
    }

    /**
     * Boss "empowered" aura — call while the Hero's 4s Fear Status is live
     * (Player.fearAuraActive). The same roaring black-and-crimson fire wraps the
     * Boss: a bed of dark-red glow, a rising crown of flickering bezier flame
     * tongues (black roots -> bright crimson tips) curling up the silhouette,
     * swirling crimson sparks, and rising embers. Draw it BEFORE the Boss sprite
     * (like drawAura) so the figure stands inside the fire. Pass `intensity`
     * (e.g. fearAuraTimer/30) to fade it out as the debuff lapses.
     *
     * @param {number} x, y   the Boss figure centre (FX anchor), world space.
     * @param {object} [opts] { radius, time(ms), intensity }
     */
    static drawFearBossAura(ctx, x, y, opts = {}) {
        const {
            radius = 70,
            time = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            intensity = 1,
        } = opts;
        const A = intensity;
        if (A <= 0) return;
        const t = time / 1000;
        const R = radius;

        ctx.save();
        ctx.translate(x, y);

        // 0) Bed of dark-red fire pooled around/under the figure.
        const bed = ctx.createRadialGradient(0, R * 0.5, R * 0.1, 0, R * 0.5, R * 1.25);
        bed.addColorStop(0.00, `rgba(120, 10, 8, ${0.40 * A})`);
        bed.addColorStop(0.45, `rgba(60, 4, 4, ${0.30 * A})`);
        bed.addColorStop(1.00, 'rgba(4, 0, 0, 0)');
        ctx.fillStyle = bed;
        ctx.beginPath();
        ctx.ellipse(0, R * 0.5, R * 1.25, R * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        // 1) Rising crown of bezier flame tongues wrapping the silhouette. Roots
        //    ring the body; each rises (fire goes up) with an outward lean on the
        //    sides, sways, flickers in height, and is filled with a black-root ->
        //    crimson -> bright-red gradient (the reference heat ramp).
        const TONGUES = 16;
        for (let i = 0; i < TONGUES; i++) {
            const ang = (i / TONGUES) * Math.PI * 2;
            const rootX = Math.cos(ang) * R * 0.72;
            const rootY = Math.sin(ang) * R * 0.52 + R * 0.18;   // ring sits a touch low
            const flick = 0.5 + 0.5 * Math.sin(t * 10 + i * 1.7);
            const len = R * (0.55 + 0.6 * flick) * (0.7 + 0.3 * Math.sin(t * 1.3 + i));
            const halfW = R * (0.10 + 0.04 * flick);
            const lean = Math.sign(rootX || 1) * R * 0.18;        // lean outward on the flanks
            const sway = Math.sin(t * 3.0 + i * 1.3) * R * 0.10;
            const tipX = rootX + lean + sway;
            const tipY = rootY - len;                            // upward

            const g = ctx.createLinearGradient(rootX, rootY, tipX, tipY);
            g.addColorStop(0.00, `rgba(6, 0, 0, ${0.85 * A})`);   // near-black root
            g.addColorStop(0.30, `rgba(120, 10, 8, ${0.75 * A})`);
            g.addColorStop(0.68, `rgba(228, 32, 26, ${0.7 * A * (0.6 + 0.4 * flick)})`);
            g.addColorStop(1.00, 'rgba(255, 110, 52, 0)');        // bright fading tip
            ctx.fillStyle = g;
            ctx.shadowColor = `rgba(220, 40, 20, ${0.6 * A})`;
            ctx.shadowBlur = 14;

            // teardrop: two quadratics bowing out from the base corners to the tip.
            const px = -(tipY - rootY), py = (tipX - rootX);      // axis perpendicular
            const pl = Math.hypot(px, py) || 1;
            const nx = px / pl, ny = py / pl;
            ctx.beginPath();
            ctx.moveTo(rootX + nx * halfW, rootY + ny * halfW);
            ctx.quadraticCurveTo(rootX + (tipX - rootX) * 0.5 + nx * halfW * 1.4,
                                 rootY + (tipY - rootY) * 0.5 + ny * halfW * 1.4,
                                 tipX, tipY);
            ctx.quadraticCurveTo(rootX + (tipX - rootX) * 0.5 - nx * halfW * 1.4,
                                 rootY + (tipY - rootY) * 0.5 - ny * halfW * 1.4,
                                 rootX - nx * halfW, rootY - ny * halfW);
            ctx.closePath();
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // 2) Swirling crimson sparks + 3) rising embers (additive, last layer).
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const S = 20;
        for (let i = 0; i < S; i++) {
            const ang = t * (0.8 + 0.04 * i) + (i * Math.PI * 2) / S;
            const orbit = R * (0.55 + 0.35 * Math.sin(t * 1.4 + i * 1.9));
            const sx = Math.cos(ang) * orbit;
            const sy = Math.sin(ang) * orbit * 0.8 - R * 0.05;
            ctx.globalAlpha = (0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.3 + i))) * A;
            ctx.fillStyle = i % 5 === 0 ? 'rgba(255, 150, 70, 1)' : 'rgba(235, 40, 24, 1)';
            ctx.beginPath();
            ctx.arc(sx, sy, 1.6 + 2.0 * ((i * 7) % 5) / 5, 0, Math.PI * 2);
            ctx.fill();
        }
        const E = 10;
        for (let i = 0; i < E; i++) {
            const phase = (t * 0.7 + i / E) % 1;
            const ex = Math.sin((i * 12.9 + t) * 1.3) * R * 0.5;
            const ey = R * 0.6 - phase * R * 1.6;
            ctx.globalAlpha = (1 - phase) * 0.55 * A;
            ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 140, 60, 1)' : 'rgba(255, 50, 30, 1)';
            ctx.beginPath();
            ctx.arc(ex, ey, 1.4 + (1 - phase) * 1.7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        ctx.restore();
    }

    // =======================================================================
    // STEP 3 — Charged-attack VFX (procedural, Canvas-API; visual-only).
    // Style guides: the laser reference (blinding white core + red/orange bloom)
    // and darkaura.gif (roaring black/red fire). All three follow the house
    // idioms above: opts.time (ms) drives the animation, a local save()/
    // translate()/restore(), rgba gradients, shadowBlur/shadowColor glow, and
    // 'lighter' compositing for additive embers. None read or write physics.
    // =======================================================================

    /**
     * REQUIREMENT 1 — wand charge glow, drawn OVER the wand during 'groundCharge'.
     * `progress` is the 0..1 charge ratio (Player.chargeRatio): a cool blue→white
     * orb that PULSES faster and swells as it fills, then at 1.0 SNAPS to a
     * blinding red core wrapped in a strobing fiery aura + flame tongues — the
     * "ready to fire the Laser" tell. Draw it at the wand-tip world position.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x, y        wand-tip centre (world space)
     * @param {number} progress    0..1 charge ratio (>=1 == fully charged)
     * @param {object} [opts]       { time(ms), intensity, radius }
     */
    static drawWandGlow(ctx, x, y, progress = 0, opts = {}) {
        const {
            time = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            intensity = 1,
            radius = 16,
        } = opts;
        const A = intensity;
        if (A <= 0) return;
        const t = time / 1000;
        const p = Math.max(0, Math.min(1, progress));
        const ready = progress >= 0.999;
        const LITE = isLiteVfx();
        const PERF = isPerfVfx();

        // Pulse quickens as the charge builds; at full it strobes hard.
        const pulseSpeed = 2 + p * 9 + (ready ? 9 : 0);
        const pulse = 0.62 + 0.38 * Math.sin(t * pulseSpeed);
        const r = radius * (0.55 + 0.85 * p) * (0.85 + 0.30 * pulse);

        ctx.save();
        ctx.translate(x, y);
        ctx.globalCompositeOperation = 'lighter'; // glows add together

        // 1) Soft aura — cyan/white while charging, fiery red once ready.
        const aura = ctx.createRadialGradient(0, 0, r * 0.10, 0, 0, r * 1.9);
        if (ready) {
            const f = 0.6 + 0.4 * Math.sin(t * 22); // red strobe
            aura.addColorStop(0.00, `rgba(255, 244, 224, ${0.95 * A})`);
            aura.addColorStop(0.20, `rgba(255, ${Math.round(70 + 70 * f)}, 40, ${0.90 * A})`);
            aura.addColorStop(0.55, `rgba(220, 30, 24, ${0.55 * A})`);
            aura.addColorStop(1.00, 'rgba(60, 0, 0, 0)');
        } else {
            const warm = p; // 0 = cool blue, 1 = near-white
            aura.addColorStop(0.00, `rgba(255, 255, 255, ${(0.50 + 0.40 * p) * A})`);
            aura.addColorStop(0.30, `rgba(${Math.round(130 + 110 * warm)}, ${Math.round(205 - 35 * warm)}, 255, ${0.60 * A})`);
            aura.addColorStop(0.70, `rgba(70, 120, 230, ${0.30 * A})`);
            aura.addColorStop(1.00, 'rgba(20, 30, 80, 0)');
        }
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
        ctx.fill();

        // 2) Blinding core.
        ctx.shadowBlur = PERF ? (6 + 4 * p) : (LITE ? (10 + 8 * p) : (18 + 22 * p));
        ctx.shadowColor = ready ? 'rgba(255, 60, 30, 0.95)' : 'rgba(150, 200, 255, 0.9)';
        ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * A})`;
        ctx.beginPath();
        ctx.arc(0, 0, r * (ready ? 0.60 : 0.42) * pulse, 0, Math.PI * 2);
        ctx.fill();

        // 3) Orbiting sparks — more + faster as the charge climbs.
        const N = PERF ? (3 + Math.round(p * 2)) : (LITE ? (4 + Math.round(p * 4)) : (6 + Math.round(p * 10)));
        for (let i = 0; i < N; i++) {
            const ang = t * (3 + 6 * p) + (i * Math.PI * 2) / N;
            const orbit = r * (0.95 + 0.6 * Math.sin(t * 4 + i));
            const sx = Math.cos(ang) * orbit;
            const sy = Math.sin(ang) * orbit;
            ctx.globalAlpha = (0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 6 + i))) * A;
            ctx.fillStyle = ready
                ? (i % 3 ? 'rgba(255, 70, 40, 1)' : 'rgba(255, 170, 80, 1)')
                : (i % 3 ? 'rgba(150, 210, 255, 1)' : 'rgba(230, 245, 255, 1)');
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = LITE ? 0 : 8;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.3 + 2.0 * ((i * 7) % 5) / 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 4) READY: fiery flame tongues fanning up + a strobing red ring flash.
        if (ready) {
            const F = PERF ? 3 : (LITE ? 5 : 8);
            for (let i = 0; i < F; i++) {
                const ang = -Math.PI / 2 + (i / (F - 1) - 0.5) * Math.PI * 1.7 + Math.sin(t * 4 + i) * 0.15;
                const flick = 0.5 + 0.5 * Math.sin(t * 16 + i * 1.7);
                const len = r * (1.0 + 0.8 * flick);
                const tipX = Math.cos(ang) * len;
                const tipY = Math.sin(ang) * len - r * 0.2; // bias upward (fire rises)
                const hw = r * 0.22 * (0.6 + 0.4 * flick);
                const dx = tipX, dy = tipY;
                const pl = Math.hypot(dx, dy) || 1;
                const nx = -dy / pl, ny = dx / pl;
                const g = ctx.createLinearGradient(0, 0, tipX, tipY);
                g.addColorStop(0.00, 'rgba(20, 0, 0, 0)');
                g.addColorStop(0.25, `rgba(150, 12, 8, ${0.70 * A})`);
                g.addColorStop(0.70, `rgba(255, 60, 30, ${0.70 * A * flick})`);
                g.addColorStop(1.00, 'rgba(255, 150, 60, 0)');
                ctx.fillStyle = g;
                ctx.shadowColor = `rgba(255, 50, 20, ${0.7 * A})`;
                ctx.shadowBlur = PERF ? 4 : (LITE ? 8 : 14);
                ctx.beginPath();
                ctx.moveTo(nx * hw, ny * hw);
                ctx.quadraticCurveTo(dx * 0.5 + nx * hw * 1.3, dy * 0.5 + ny * hw * 1.3, tipX, tipY);
                ctx.quadraticCurveTo(dx * 0.5 - nx * hw * 1.3, dy * 0.5 - ny * hw * 1.3, -nx * hw, -ny * hw);
                ctx.closePath();
                ctx.fill();
            }
            const rf = 0.5 + 0.5 * Math.sin(t * 20);
            ctx.globalAlpha = (0.4 + 0.5 * rf) * A;
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = PERF ? 4 : (LITE ? 8 : 16);
            ctx.shadowColor = 'rgba(255, 40, 20, 0.95)';
            ctx.strokeStyle = 'rgba(255, 220, 200, 0.9)';
            ctx.beginPath();
            ctx.arc(0, 0, r * (1.2 + 0.2 * rf), 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    /**
     * REQUIREMENT 2 — the fully-charged ground LASER BEAM. A massive, screen-
     * spanning bolt fired from (x, y) along `facing`: a blinding white-hot core
     * sheathed in searing orange and deep-red glow strokes under heavy
     * shadowBlur (the reference look), capped by a radial muzzle flare with
     * flickering lens-flare star rays at the source. Draw it in world space
     * (e.g. for the 'laser' projectile), OVER the Boss.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x, y      beam origin (the wand muzzle), world space
     * @param {number} facing    +1 / -1 (the beam shoots this way; mirrors it)
     * @param {object} [opts]      { time(ms), intensity, length, thickness,
     *                               progress } progress(0..1) drives an ignition
     *                               ramp-in + fade-out; omit for a steady beam.
     */
    static drawLaserBeam(ctx, x, y, facing = 1, opts = {}) {
        const {
            time = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            intensity = 1,
            length = 2400,
            thickness = 46,
            progress = null,
        } = opts;

        // Lifetime envelope: fast ignition ramp, hold, smooth tail fade.
        let env = 1;
        if (progress != null) {
            const pr = Math.max(0, Math.min(1, progress));
            const inP = Math.min(1, pr / 0.12);
            const outP = pr > 0.75 ? Math.max(0, 1 - (pr - 0.75) / 0.25) : 1;
            env = Math.min(inP, outP);
        }
        const A = intensity * env;
        if (A <= 0) return;
        const t = time / 1000;
        const th = thickness;
        const LITE = isLiteVfx();
        const PERF = isPerfVfx();

        // Energy flicker (fast crackle over a slow swell).
        const flk = (0.86 + 0.14 * Math.sin(t * 40)) * (0.94 + 0.06 * Math.sin(t * 7.3));

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(facing, 1);          // draw rightward; facing mirrors the whole bolt
        ctx.lineCap = 'round';

        // Per-layer colour with a soft fade over the last stretch (the beam is
        // "screen-spanning", so it trails off rather than ending hard).
        const beamGrad = (rgb, a) => {
            const g = ctx.createLinearGradient(0, 0, length, 0);
            g.addColorStop(0.00, `rgba(${rgb}, ${a})`);
            g.addColorStop(0.72, `rgba(${rgb}, ${a})`);
            g.addColorStop(1.00, `rgba(${rgb}, 0)`);
            return g;
        };
        const beam = (w, rgb, a, blur, sc) => {
            ctx.lineWidth = Math.max(1, w * flk);
            ctx.strokeStyle = beamGrad(rgb, a);
            ctx.shadowBlur = blur;
            ctx.shadowColor = `rgba(${sc}, 0.9)`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(length, 0);
            ctx.stroke();
        };

        // Outer bloom -> body -> bright sheath (red/orange glowing strokes).
        // Lite collapses the two widest translucent bloom passes into one slightly
        // stronger red glow and caps every shadowBlur, keeping the thick red/orange
        // beam identity at a fraction of the fill+blur cost. Performance narrows that
        // widest bloom stroke further (less full-length transparent overdraw) and
        // caps its blur harder — the body + sheath below still read as a thick beam.
        beam(th * (PERF ? 2.0 : 2.8), '255, 40, 20', (LITE ? 0.42 : 0.30) * A, PERF ? 8 : (LITE ? 16 : 48), '255, 40, 20');
        if (!LITE) beam(th * 1.9, '255, 90, 30', 0.45 * A, 34, '255, 80, 30');
        beam(th * 1.15, '255, 140, 50', 0.70 * A, PERF ? 6 : (LITE ? 12 : 22), '255, 120, 40');
        beam(th * 0.62, '255, 230, 180', 0.90 * A, PERF ? 6 : (LITE ? 10 : 16), '255, 160, 80');

        // Blinding white-hot core + searing centerline (additive => over-bright).
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = Math.max(1, th * 0.34 * flk);
        ctx.strokeStyle = beamGrad('255, 255, 255', 0.95 * A);
        ctx.shadowBlur = PERF ? 6 : (LITE ? 10 : 14);
        ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(length, 0); ctx.stroke();

        ctx.lineWidth = Math.max(2, th * 0.12);
        ctx.strokeStyle = beamGrad('255, 255, 255', 1.0 * A);
        ctx.shadowBlur = PERF ? 4 : (LITE ? 6 : 8);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(length, 0); ctx.stroke();

        // Muzzle flare — radial white→orange→red burst at the source.
        const fr = th * 1.9 * (0.9 + 0.2 * Math.sin(t * 30));
        const flare = ctx.createRadialGradient(0, 0, 2, 0, 0, fr);
        flare.addColorStop(0.00, `rgba(255, 255, 255, ${0.95 * A})`);
        flare.addColorStop(0.25, `rgba(255, 200, 120, ${0.80 * A})`);
        flare.addColorStop(0.55, `rgba(255, 70, 30, ${0.45 * A})`);
        flare.addColorStop(1.00, 'rgba(120, 0, 0, 0)');
        ctx.fillStyle = flare;
        ctx.beginPath();
        ctx.arc(0, 0, fr, 0, Math.PI * 2);
        ctx.fill();

        // Lens-flare star rays radiating from the muzzle.
        const R = PERF ? 4 : (LITE ? 6 : 12);
        ctx.shadowBlur = PERF ? 4 : (LITE ? 6 : 12);
        ctx.shadowColor = 'rgba(255, 120, 50, 0.9)';
        for (let i = 0; i < R; i++) {
            const ang = t * 0.5 + (i * Math.PI * 2) / R;
            const len = fr * (0.8 + 1.5 * ((i * 7) % 5) / 5) * (0.55 + 0.45 * Math.sin(t * 9 + i));
            ctx.globalAlpha = (0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 11 + i * 1.7))) * A;
            ctx.lineWidth = i % 3 === 0 ? 2.2 : 1.2;
            ctx.strokeStyle = i % 3 === 0 ? 'rgba(255, 235, 200, 1)' : 'rgba(255, 110, 50, 1)';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    /**
     * REQUIREMENT 3 — the charged-attack aura: roaring, chaotic BLACK & RED fire
     * wrapping the Boss while 'airCharge' is held and through the 'chargedDive'
     * (style: darkaura.gif). A black/crimson core haze, a turbulent double crown
     * of bezier flame tongues (black roots → blood-red → bright tips), drifting
     * black smoke puffs, plus chaotic additive embers and white-hot crackle
     * sparks. Draw it BEFORE the Boss sprite (like drawAura) so it stands inside
     * the fire. Pass `intensity` to fade it in/out.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x, y      the Boss figure centre (FX anchor), world space
     * @param {object} [opts]     { radius, time(ms), intensity }
     */
    static drawChargedAirAura(ctx, x, y, opts = {}) {
        const {
            radius = 80,
            time = (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            intensity = 1,
        } = opts;
        const A = intensity;
        if (A <= 0) return;
        const t = time / 1000;
        const R = radius;
        const LITE = isLiteVfx();
        const PERF = isPerfVfx();
        // Performance caps the large transparent haze radius so this big airborne
        // aura fill covers less overdraw while still enveloping the figure.
        const haloR = PERF ? R * 1.2 : R * 1.5;

        ctx.save();
        ctx.translate(x, y);

        // 0) Black/red core haze enveloping the figure (all around — it's airborne).
        const core = ctx.createRadialGradient(0, 0, R * 0.10, 0, 0, haloR);
        core.addColorStop(0.00, `rgba(80, 4, 4, ${0.42 * A})`);
        core.addColorStop(0.35, `rgba(30, 2, 4, ${0.50 * A})`);
        core.addColorStop(0.72, `rgba(8, 0, 2, ${0.40 * A})`);
        core.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, haloR, 0, Math.PI * 2);
        ctx.fill();

        // 1) Two crowns of roaring, chaotic flame tongues (black root -> red tip).
        const crown = (count, baseLen, ringX, ringY, biasUp, seed) => {
            for (let i = 0; i < count; i++) {
                const ang = (i / count) * Math.PI * 2 + seed;
                const chaos = Math.sin(t * 7 + i * 2.3 + seed) * Math.sin(t * 3.1 + i * 1.1);
                const flick = 0.5 + 0.5 * Math.sin(t * 13 + i * 1.9 + seed);
                const rootX = Math.cos(ang) * ringX;
                const rootY = Math.sin(ang) * ringY;
                const len = baseLen * (0.55 + 0.7 * flick) * (0.7 + 0.5 * Math.abs(chaos));
                const hw = R * (0.10 + 0.05 * flick);
                const ox = Math.cos(ang), oy = Math.sin(ang);
                const sway = Math.sin(t * 4 + i * 1.7) * R * 0.12 + chaos * R * 0.10;
                const tipX = rootX + ox * len * 0.5 + sway;
                const tipY = rootY + oy * len * 0.4 - len * biasUp;  // upward bias (fire rises)

                const g = ctx.createLinearGradient(rootX, rootY, tipX, tipY);
                g.addColorStop(0.00, `rgba(4, 0, 0, ${0.90 * A})`);   // near-black root
                g.addColorStop(0.28, `rgba(90, 6, 6, ${0.80 * A})`);
                g.addColorStop(0.62, `rgba(210, 28, 20, ${0.78 * A * (0.6 + 0.4 * flick)})`);
                g.addColorStop(0.88, `rgba(255, 80, 36, ${0.50 * A * flick})`);
                g.addColorStop(1.00, 'rgba(255, 140, 60, 0)');
                ctx.fillStyle = g;
                ctx.shadowColor = `rgba(200, 30, 16, ${0.6 * A})`;
                ctx.shadowBlur = PERF ? 4 : (LITE ? 8 : 16);

                const dx = tipX - rootX, dy = tipY - rootY;
                const pl = Math.hypot(dx, dy) || 1;
                const nx = -dy / pl, ny = dx / pl;
                ctx.beginPath();
                ctx.moveTo(rootX + nx * hw, rootY + ny * hw);
                ctx.quadraticCurveTo(rootX + dx * 0.5 + nx * hw * 1.5, rootY + dy * 0.5 + ny * hw * 1.5, tipX, tipY);
                ctx.quadraticCurveTo(rootX + dx * 0.5 - nx * hw * 1.5, rootY + dy * 0.5 - ny * hw * 1.5, rootX - nx * hw, rootY - ny * hw);
                ctx.closePath();
                ctx.fill();
            }
        };
        crown(PERF ? 8 : (LITE ? 12 : 20), R * 1.05, R * 0.70, R * 0.62, 0.85, 0.0);  // tall outer crown
        crown(PERF ? 5 : (LITE ? 8 : 14), R * 0.70, R * 0.50, R * 0.45, 0.60, 1.3);   // dense inner fire
        ctx.shadowBlur = 0;

        // 2) Drifting BLACK smoke puffs (normal blend) — the chaotic dark element.
        for (let i = 0; i < (PERF ? 2 : (LITE ? 4 : 7)); i++) {
            const ph = (t * 0.5 + i / 7) % 1;
            const ang = t * 0.6 + i * 2.4;
            const dist = R * (0.4 + 0.7 * ph);
            const sx = Math.cos(ang) * dist * 0.9;
            const sy = Math.sin(ang) * dist - ph * R * 0.7;
            ctx.globalAlpha = (1 - ph) * 0.40 * A;
            ctx.fillStyle = 'rgba(6, 2, 4, 0.9)';
            ctx.beginPath();
            ctx.arc(sx, sy, R * (0.12 + 0.16 * ph), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 3) Chaotic flying embers + 4) white-hot crackle sparks (additive).
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const P = PERF ? 8 : (LITE ? 14 : 30);
        for (let i = 0; i < P; i++) {
            const ph = (t * (0.7 + 0.05 * (i % 5)) + i / P) % 1;
            const ang = i * 2.39996 + t * (1.2 + 0.5 * Math.sin(i)); // golden-angle scatter + drift
            const spin = Math.sin(t * 5 + i * 1.7);
            const dist = R * (0.2 + 1.1 * ph) * (0.8 + 0.3 * spin);
            const ex = Math.cos(ang) * dist + Math.sin(t * 6 + i) * R * 0.08;
            const ey = Math.sin(ang) * dist - ph * R * 0.9;        // rise
            ctx.globalAlpha = (1 - ph) * 0.70 * A;
            ctx.fillStyle = i % 5 === 0 ? 'rgba(255, 150, 60, 1)'
                          : (i % 3 ? 'rgba(230, 36, 20, 1)' : 'rgba(150, 12, 10, 1)');
            ctx.beginPath();
            ctx.arc(ex, ey, 1.2 + 2.4 * ((i * 7) % 5) / 5, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = 0; i < (PERF ? 2 : (LITE ? 3 : 6)); i++) {
            const ang = t * (3 + i) + i * 1.3;
            const orbit = R * (0.9 + 0.4 * Math.sin(t * 8 + i));
            ctx.globalAlpha = (0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 20 + i))) * A;
            ctx.fillStyle = 'rgba(255, 210, 170, 1)';
            ctx.beginPath();
            ctx.arc(Math.cos(ang) * orbit, Math.sin(ang) * orbit * 0.9, 1.0 + 0.8 * Math.abs(Math.sin(t * 15 + i)), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        ctx.restore();
    }

    /**
     * STEP 2 — the "CHARGE READY" aura. Rendered CONTINUOUSLY while
     * Player.isChargeReady is true (Boss airborne, attack button still held, the
     * 1-second charge complete). A violent, pulsing dark-red & black energy
     * burst CONTAINED around the Boss — the "this is about to detonate" tell.
     *
     * Style guides — darkredaura1/2:
     *   • a blinding white / bright-red CORE pinned on the figure,
     *   • a roaring crimson energy RING that breathes with the pulse,
     *   • black-rooted crimson FLARES stabbing outward into the dark,
     *   • everything backed by deep black for maximum contrast.
     *
     * House idioms (same as drawAura / drawChargedAirAura): `time` (ms) drives the
     * loop, a local save()/translate()/restore(), rgba gradient heat ramps
     * (near-black root → crimson → bright tip), HIGH shadowBlur with red/crimson
     * shadowColor for the menacing glow, and 'lighter' compositing for the
     * additive cores/embers. Visual-only — it never reads or writes physics/AI.
     *
     * Signature is (ctx, x, y, time) as requested; an optional trailing `opts`
     * ({ radius, intensity }) is accepted so callers can scale / fade it exactly
     * like the sibling auras. Draw it BEFORE the Boss sprite (like drawAura) so
     * the figure stands inside the energy; the bright additive core is layered so
     * it still reads over the silhouette.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x, y   the Boss figure centre (FX anchor), world space
     * @param {number} time   animation clock in ms (e.g. performance.now())
     * @param {object} [opts] { radius, intensity }
     */
    static drawChargeReadyAura(ctx, x, y, time = (typeof performance !== 'undefined' ? performance.now() : Date.now()), opts = {}) {
        const { radius = 90, intensity = 1 } = opts;
        const A = intensity;
        if (A <= 0) return;
        const t = time / 1000;
        const R = radius;
        const LITE = isLiteVfx();
        const PERF = isPerfVfx();
        // Performance caps the huge deep-black backing radius so this large aura's
        // biggest transparent fill covers less overdraw (still frames the figure).
        const backR = PERF ? R * 1.4 : R * 1.7;

        // Unstable pulse signals: a punchy heartbeat, a fast flicker, and a chaotic
        // jitter so the whole thing reads as power that's barely being contained.
        const beat    = 0.5 + 0.5 * Math.sin(t * 6.0);                       // 0..1 main pulse
        const flicker = 0.55 + 0.45 * Math.sin(t * 22.0 + Math.sin(t * 5) * 3);
        const jitter  = 0.5 * Math.sin(t * 37.0) + 0.5 * Math.sin(t * 19.0); // -1..1 chaos
        const swell   = 0.90 + 0.16 * beat;                                  // ring breathing

        ctx.save();
        ctx.translate(x, y);

        // 0) DEEP BLACK backing — a pool of contained darkness the energy strains
        //    against, so every bright element below reads with maximum contrast.
        const dark = ctx.createRadialGradient(0, 0, R * 0.05, 0, 0, backR);
        dark.addColorStop(0.00, `rgba(10, 0, 2, ${0.55 * A})`);
        dark.addColorStop(0.55, `rgba(4, 0, 1, ${0.50 * A})`);
        dark.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(0, 0, backR, 0, Math.PI * 2);
        ctx.fill();

        // 1) CRIMSON FLARES stabbing outward past the ring (darkredaura1 "burst"):
        //    long, thin, black-rooted blades that flicker independently and shoot
        //    hot crimson tips. High red shadowBlur makes them roar.
        const FLARES = PERF ? 8 : (LITE ? 12 : 24);
        ctx.shadowBlur = PERF ? 6 : (LITE ? 12 : 26);
        for (let i = 0; i < FLARES; i++) {
            const ang  = (i / FLARES) * Math.PI * 2 + t * 0.5 + jitter * 0.05;
            const fl   = 0.5 + 0.5 * Math.sin(t * 17 + i * 2.7);             // per-blade flicker
            const long = i % 3 === 0;                                        // a few extra-long spikes
            const len  = R * (0.95 + (long ? 1.15 : 0.65) * fl) * swell;
            const baseR = R * 0.55;
            const hw   = R * (0.05 + 0.05 * fl);                             // half-width at the root
            const ox = Math.cos(ang), oy = Math.sin(ang);
            const rx = ox * baseR, ry = oy * baseR;                          // root (near the ring)
            const tx = ox * len,   ty = oy * len;                            // tip (out in the dark)
            const nx = -oy, ny = ox;                                         // perpendicular

            const g = ctx.createLinearGradient(rx, ry, tx, ty);
            g.addColorStop(0.00, `rgba(6, 0, 0, ${0.85 * A})`);             // black root
            g.addColorStop(0.30, `rgba(150, 10, 8, ${0.80 * A})`);
            g.addColorStop(0.70, `rgba(240, 36, 28, ${0.85 * A * (0.6 + 0.4 * fl)})`);
            g.addColorStop(1.00, 'rgba(255, 170, 150, 0)');                 // hot fading point
            ctx.fillStyle = g;
            ctx.shadowColor = `rgba(220, 30, 20, ${0.7 * A})`;
            ctx.globalAlpha = (0.55 + 0.45 * fl) * A;
            ctx.beginPath();
            ctx.moveTo(rx + nx * hw, ry + ny * hw);
            ctx.lineTo(tx, ty);
            ctx.lineTo(rx - nx * hw, ry - ny * hw);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // 2) The roaring ENERGY RING (darkredaura2): a glowing crimson annulus that
        //    breathes with the pulse. Drawn additively with a fat red shadow so the
        //    band blooms like fire rather than reading as a clean stroked circle.
        const ringR = R * swell;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const band = ctx.createRadialGradient(0, 0, ringR * 0.62, 0, 0, ringR * 1.06);
        band.addColorStop(0.00, 'rgba(40, 0, 0, 0)');
        band.addColorStop(0.55, `rgba(150, 12, 10, ${0.45 * A})`);
        band.addColorStop(0.80, `rgba(240, 40, 30, ${0.85 * A * flicker})`); // bright crest
        band.addColorStop(0.92, `rgba(255, 90, 60, ${0.55 * A * flicker})`);
        band.addColorStop(1.00, 'rgba(60, 0, 0, 0)');
        ctx.fillStyle = band;
        ctx.shadowColor = `rgba(255, 40, 30, ${0.9 * A})`;
        ctx.shadowBlur = PERF ? 8 : (LITE ? 16 : 34);
        ctx.beginPath();
        ctx.arc(0, 0, ringR * 1.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2b) Fire tongues licking off the ring (black root -> blood-red -> bright),
        //     counter-rotating against the flares so the band churns.
        const TONGUES = PERF ? 6 : (LITE ? 10 : 22);
        ctx.shadowBlur = PERF ? 4 : (LITE ? 8 : 18);
        for (let i = 0; i < TONGUES; i++) {
            const ang = (i / TONGUES) * Math.PI * 2 - t * 0.9;
            const fk  = 0.5 + 0.5 * Math.sin(t * 14 + i * 1.9);
            const ox = Math.cos(ang), oy = Math.sin(ang);
            const rootX = ox * ringR * 0.86, rootY = oy * ringR * 0.86;
            const len  = R * (0.22 + 0.40 * fk);
            const sway = Math.sin(t * 5 + i * 1.7) * R * 0.06;
            const tipX = ox * (ringR + len) + (-oy) * sway;
            const tipY = oy * (ringR + len) + ( ox) * sway;
            const dx = tipX - rootX, dy = tipY - rootY;
            const pl = Math.hypot(dx, dy) || 1;
            const nx = -dy / pl, ny = dx / pl;
            const hw = R * (0.05 + 0.03 * fk);

            const g = ctx.createLinearGradient(rootX, rootY, tipX, tipY);
            g.addColorStop(0.00, `rgba(4, 0, 0, ${0.85 * A})`);
            g.addColorStop(0.40, `rgba(150, 12, 10, ${0.80 * A})`);
            g.addColorStop(0.80, `rgba(245, 45, 32, ${0.70 * A * fk})`);
            g.addColorStop(1.00, 'rgba(255, 120, 70, 0)');
            ctx.fillStyle = g;
            ctx.shadowColor = `rgba(220, 30, 18, ${0.6 * A})`;
            ctx.beginPath();
            ctx.moveTo(rootX + nx * hw, rootY + ny * hw);
            ctx.quadraticCurveTo(rootX + dx * 0.5 + nx * hw * 1.4, rootY + dy * 0.5 + ny * hw * 1.4, tipX, tipY);
            ctx.quadraticCurveTo(rootX + dx * 0.5 - nx * hw * 1.4, rootY + dy * 0.5 - ny * hw * 1.4, rootX - nx * hw, rootY - ny * hw);
            ctx.closePath();
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // 3) The blinding WHITE / RED CORE pinned on the Boss (max contrast vs the
        //    black backing). Small, savage, and pulsing — the fully-charged heart.
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const coreR = R * (0.30 + 0.10 * beat) * (0.9 + 0.2 * flicker);
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
        core.addColorStop(0.00, `rgba(255, 255, 250, ${0.95 * A})`);        // white-hot
        core.addColorStop(0.22, `rgba(255, 225, 210, ${0.90 * A})`);
        core.addColorStop(0.45, `rgba(255, 70, 50, ${0.85 * A})`);          // bright red
        core.addColorStop(0.78, `rgba(150, 12, 10, ${0.45 * A})`);
        core.addColorStop(1.00, 'rgba(60, 0, 0, 0)');
        ctx.fillStyle = core;
        ctx.shadowColor = `rgba(255, 60, 40, ${A})`;
        ctx.shadowBlur = PERF ? 10 : (LITE ? 18 : 40);
        ctx.beginPath();
        ctx.arc(0, 0, coreR, 0, Math.PI * 2);
        ctx.fill();

        // A tighter white pinpoint that strobes with the flicker for instability.
        ctx.globalAlpha = (0.5 + 0.5 * flicker) * A;
        ctx.fillStyle = 'rgba(255, 248, 240, 1)';
        ctx.shadowColor = 'rgba(255, 120, 90, 1)';
        ctx.shadowBlur = PERF ? 8 : (LITE ? 14 : 30);
        ctx.beginPath();
        ctx.arc(0, 0, coreR * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 4) Chaotic flying EMBERS + crackle sparks bursting outward (additive).
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const EM = PERF ? 8 : (LITE ? 12 : 28);
        for (let i = 0; i < EM; i++) {
            const ph  = (t * (0.9 + 0.06 * (i % 5)) + i / EM) % 1;          // 0..1 fly-out
            const ang = i * 2.39996 + t * (1.1 + 0.4 * Math.sin(i));        // golden-angle scatter
            const dist = R * (0.35 + 1.25 * ph);
            const ex = Math.cos(ang) * dist;
            const ey = Math.sin(ang) * dist;
            ctx.globalAlpha = (1 - ph) * 0.8 * A;
            ctx.fillStyle = i % 6 === 0 ? 'rgba(255, 230, 200, 1)'          // a few white sparks
                          : (i % 2 ? 'rgba(240, 40, 28, 1)' : 'rgba(150, 10, 8, 1)');
            ctx.shadowColor = 'rgba(255, 40, 26, 1)';
            ctx.shadowBlur = PERF ? 3 : (LITE ? 6 : 12);
            ctx.beginPath();
            ctx.arc(ex, ey, 1.2 + 2.6 * ((i * 7) % 5) / 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        ctx.restore();
    }
}

// ---------------------------------------------------------------------------
// SpriteAnimator — frame timing only (no state decisions).
// ---------------------------------------------------------------------------
// The game is frame-based (one update/draw per rAF), so the animator advances by
// whole game-frames: `hold` = how many game-frames each sprite frame is shown.
// Entities call set(name, hold) to choose the clip, tick() once per draw, then
// current() to fetch the frame. Switching clips resets to frame 0.
export class SpriteAnimator {
    constructor(sprites, hold = 6) {
        this.sprites = sprites;
        this.hold = hold;
        this.name = null;
        this.frame = 0;
        this._count = 0;
    }

    set(name, hold = this.hold) {
        if (name !== this.name) {
            this.name = name;
            this.frame = 0;
            this._count = 0;
        }
        this._hold = hold;
    }

    tick() {
        const frames = this.sprites[this.name];
        if (!frames || frames.length <= 1) return;
        if (++this._count >= (this._hold || this.hold)) {
            this._count = 0;
            this.frame = (this.frame + 1) % frames.length;
        }
    }

    current() {
        const frames = this.sprites[this.name];
        if (!frames || !frames.length) return null;
        return frames[this.frame % frames.length];
    }
}
