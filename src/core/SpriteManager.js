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
        const T = 10;
        ctx.shadowBlur = 16;
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
        const N = 22;
        ctx.shadowBlur = 10;
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
        const E = 8;
        for (let i = 0; i < E; i++) {
            const phase = (t * 0.6 + i / E) % 1;            // 0..1 rise
            const x = Math.sin((i * 12.9 + t) * 1.3) * radius * 0.45;
            const y = radius * 0.55 - phase * radius * 1.35;  // bottom -> top
            const a = (1 - phase) * 0.55 * intensity;
            ctx.globalAlpha = a;
            ctx.fillStyle = i % 2 ? 'rgba(255, 70, 60, 0.95)' : 'rgba(160, 85, 230, 0.95)';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
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

        ctx.shadowBlur = 8;
        for (let i = 0; i < 6; i++) {
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
            ctx.shadowBlur = 16;
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
            ctx.shadowBlur = 6;
            const Nd = 14;
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
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(255, 140, 60, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, r * (0.85 + 0.2 * progress), 0, Math.PI * 2);
        ctx.stroke();

        // Radial shards flung outward.
        ctx.shadowBlur = 10;
        const Ns = 20;
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
        for (let i = 0; i < 6; i++) {
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
