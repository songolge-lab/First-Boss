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

export const PALETTE = { '.': null, ' ': null, 'K': '#0a0a0f', 'k': '#15151f', 'D': '#241338', 'P': '#3a1f5c', 'p': '#5a2f86', 'u': '#7b46b0', 'B': '#050507', 'E': '#ff3a3a', 'm': '#8a1414', 'S': '#dde4f0', 's': '#8b94a6', 'G': '#e8b341', 'g': '#9c7320', 'W': '#f4f6fb', 'w': '#c2cad8', 'i': '#97a2b6', 'L': '#7fc2ff', 'l': '#3f6ea5', 'Y': '#202838', 'O': '#ffe08a', 'q': '#e8b341', 'a': '#a87a1e', 'R': '#ff3366', 'C': '#33ccff' };

export const BOSS_PIXEL = 6;  // 24*6 = 144px tall
export const HERO_PIXEL = 3;  // 16*3 = 48px tall (Boss renders 3x the Hero)

export const BOSS_SPRITES = {
  idle: [
    ['................', '.......Ku.......', '......Kuuu......', '.....Kuuuuu.....', '.....Kpuuuu.....', '....KpmBmBuu....', '....KpEmEmuu....', '....KppBmuuu....', '...Kppppuuuuu...', '...KPppppuuuK...', '....Kppppuuu....', '....KPppppuu....', '....KPppppuuG...', '....KPPpppuG....', '....KPPpppGuS...', '....KPPppppuS...', '...KPPPPppppuS..', '...KPPPPppppu.S.', '..KPPPPPPppppuS.', '..KPPKPPPpKppu.S', '..KPK.KPPK.KpK..', '..Ku.KKPu.Kpu...', '...Ku..Ku..KK...', '....K...K..K....'],
    ['.......Ku.......', '......Kuuu......', '.....Kuuuuu.....', '.....Kpuuuu.....', '....KpmBmBuu....', '....KpEmEmuu....', '....KppBmuuu....', '...Kppppuuuuu...', '...KPppppuuuK...', '....Kppppuuu....', '....KPppppuu....', '....KPppppuuG...', '....KPPpppuG....', '....KPPpppGuS...', '....KPPppppuS...', '...KPPPPppppuS..', '...KPPPPppppu.S.', '..KPPPPPPppppuS.', '..KPPKPPPpKppu.S', '..KPK.KPPK.KpK..', '..Ku.KKPu.Kpu...', '...Ku..Ku..KK...', '....K...K..K....', '................'],
  ],
  run: [
    ['................', '........Ku......', '.......Kuuu.....', '......Kuuuuu....', '......Kuuuuu....', '.....KpmBmBuu...', '.....KpEmEmuu...', '.....KppBmuuu...', '....Kppppuuuuu..', '....KppppuuuuK..', '.....Kppppuuu...', '.....KppppuuKG..', '....KPPpppuuG...', '....KPPppppG.S..', '....KPPppppu..S.', '....KPPPpppu...S', '...KPPPPppppu...', '...KPPPPPpppu...', '...KPPPPPPppppu.', '...KPPKPPPPKppu.', '...KPK.KPPK.KpK.', '...Ku.KKPu.Kpu..', '....Ku.KKK..KK..', '.....K.k.k..K...'],
    ['........Ku......', '.......Kuuu.....', '......Kuuuuu....', '......Kuuuuu....', '.....KpmBmBuu...', '.....KpEmEmuu...', '.....KppBmuuu...', '....Kppppuuuuu..', '....KppppuuuuK..', '.....Kppppuuu...', '.....KppppuuKG..', '....KPPpppuuG...', '....KPPppppG.S..', '....KPPppppu.S..', '....KPPPpppu..S.', '...KPPPPppppu.S.', '...KPPPPPpppu..S', '..KPPPPPPppppu..', '..KPPKPPPPKppu..', '..KPK.KPPK.KpK..', '..Ku.KKPu.Kpu...', '...Ku..Ku..KK...', '....K.K.K.KK....', '......k...k.....'],
    ['........Ku......', '.......Kuuu.....', '......Kuuuuu....', '......Kuuuuu....', '.....KpmBmBuu...', '.....KpEmEmuu...', '.....KppBmuuu...', '....Kppppuuuuu..', '....KppppuuuuK..', '.....Kppppuuu...', '.....KppppuuKG..', '....KPPpppuuG...', '....KPPppppG.S..', '....KPPppppu..S.', '....KPPPpppu...S', '...KPPPPppppu...', '...KPPPPPpppu...', '.KPPPPPPppppu...', '.KPPKPPPPKppu...', '.KPK.KPPK.KpK...', '.Ku.KKPu.Kpu....', '..Ku..Ku..KK....', '...K.K.K..KK....', '.....k.....k....'],
    ['................', '........Ku......', '.......Kuuu.....', '......Kuuuuu....', '......Kuuuuu....', '.....KpmBmBuu...', '.....KpEmEmuu...', '.....KppBmuuu...', '....Kppppuuuuu..', '....KppppuuuuK..', '.....Kppppuuu...', '.....KppppuuK...', '....KPPpppuGGG..', '....KPPppppu.S..', '....KPPppppu.S..', '....KPPPpppu..S.', '...KPPPPppppu.S.', '...KPPPPPpppu..S', '..KPPPPPPppppu..', '..KPPKPPPPKppu..', '..KPK.KPPK.KpK..', '..Ku.KKPu.Kpu...', '...Ku.KKu.KKK...', '....K.k.K.kK....'],
  ],
  jump: [
    ['............S...', '.......Ku...S...', '......Kuuu..S...', '.....KuuuuuS....', '.....KpuuuuS....', '....KpmBmBuS....', '....KpEmEmuS....', '....KppBmuuS....', '...KPpppuuuSu...', '...KPPpppuSuK...', '....KPpppuSu....', '....KPpppGGG....', '....KPPpppuu....', '....KPPpppuu....', '....KPPppppu....', '....KPPPpppu....', '...KPPPPpppuu...', '...KPPPPPpppu...', '...KPPPPPpppu...', '...KPPPPPpppK...', '....KPPPPKpu....', '.....KKKu.Ku....', '....KK..KKKK....', '................'],
  ],
  fall: [
    ['................', '.......Ku.......', '......Kuuu......', '.....Kuuuuu.....', '.....Kpuuuu.....', '....KpmBmBuu....', '....KpEmEmuu....', '....KppBmuuu....', '...KPpppuuuuu...', '...KPPpppuuuK...', '....KPpppuuu....', '....KPppppuG....', '....KPPpppuGSS..', '....KPPpppuG..SS', '....KPPppppu....', '....KPPPpppu....', '...KPPPPpppuu...', '...KPPPPPpppu...', '...KPPPPPpppu...', '...KPPPPPpppK...', '....KPPPPKpu....', '.....KKKu.Ku....', '....KK..KKKK....', '................'],
  ],
  doubleJump: [
    ['................', '..S....Ku.......', '...S..Kuuu......', '...S.Kuuuuuu....', '....SKpuuuu.....', '..u.SpmBmBuu..u.', '....KSEmEmuu....', '....KpSBmuuu....', 'u..KPpSpuuuuu...', '...KPPpSpuuuK...', '....KPpSpGuu....', '....KPppGuuu....', '....KPPGppuu....', '....KPPpppuu....', 'u...KPPppppu....', '....KPPPpppu....', '...KPPPPpppuu...', '..uKPPPPPpppu.u.', '...KPPPPPpppu...', '...KPPPPPpppK...', '....KPPPPPKK....', '....KPPPPK......', '.....KKKK.......', '................'],
    ['................', '.......Ku.......', '......Kuuu......', '.....Kuuuuu.....', '...u.Kpuuuu..u..', '....KpmBmBuu....', '.u..KpEmEmuu...u', '....KppBmuuu....', '...KPpppuuuuu...', '...KPPpppuuuK...', '....KPpppGuu....', '....KPppGuuu....', '....KPPGpSuu....', '....KPPppSuu....', '....KPPpppSu....', '....KPPPppSu....', '.u.KPPPPpppSu..u', '...KPPPPPpppS...', '...KPPPPPpppSu..', '...KPPPPPpppKS..', '....KPPPPPKK.S..', '....KPPPPK....S.', '.....KKKK.......', '................'],
  ],
  attack: [
    ['..............S.', '.......Ku....S..', '......Kuuu...S..', '.....Kuuuuu..S..', '.....Kpuuuu..S..', '....KpmBmBuuS...', '....KpEmEmuuS...', '....KppBmuuuS...', '...KppppuuuuS...', '...KPppppuuSK...', '....KppppuuS....', '....KPppppGGG...', '....KPppppuu....', '....KPPpppuu....', '....KPPppppu....', '....KPPppppu....', '...KPPPPppppu...', '...KPPPPppppu...', '..KPPPPPPppppu..', '..KPPKPPPpKppu..', '..KPK.KPPK.KpK..', '..Ku.KKPu.Kpu...', '...Ku..Ku..KK...', '....K...K..K....'],
    ['................', '.......Ku.......', '......Kuuu......', '.....Kuuuuu.....', '.....Kpuuuu.....', '....KpmBmBuu....', '....KpEmEmuu....', '....KppBmuuu....', '...Kppppuuuuu...', '...KPppppuuuK...', '....KppppuuG....', '....KPppppuGSSSS', '....KPppppuG....', '....KPPpppuu....', '....KPPppppu....', '....KPPppppu....', '...KPPPPppppu...', '...KPPPPppppu...', '..KPPPPPPppppu..', '..KPPKPPPpKppu..', '..KPK.KPPK.KpK..', '..Ku.KKPu.Kpu...', '...Ku..Ku..KK...', '....K...K..K....'],
    ['................', '.......Ku.......', '......Kuuu......', '.....Kuuuuu.....', '.....Kpuuuu.....', '....KpmBmBuu....', '....KpEmEmuu....', '....KppBmuuu....', '...Kppppuuuuu...', '...KPppppuuuK...', '....KppppuuuG...', '....KPppppuG....', '....KPppppGuS...', '....KPPpppuuS...', '....KPPppppu.S..', '....KPPppppu..S.', '...KPPPPppppu.S.', '...KPPPPppppu..S', '..KPPPPPPppppu.S', '..KPPKPPPpKppu..', '..KPK.KPPK.KpK..', '..Ku.KKPu.Kpu...', '...Ku..Ku..KK...', '....K...K..K....'],
  ],
  dash: [
    ['................', '..........Ku....', '.........Kuuu...', '........KuuuuK..', '.......Kuuuuu...', '......KpmBmBuu..', '......KpEmEmuu..', '......KppBmuuu..', '.....Kppppuuuuu.', '.....KppppuuuuK.', '......Kppppuuu..', 'S.....KppppuuK..', 'uPuP.KPpppppu...', '...SSKGPppppu...', 'pDpD.SGPppppu...', '.....KGPPpppu...', '....KPPPPppppu..', '....KPPPPPpppu..', '...KPPPPPPppppu.', '...KPKPPPPKpppK.', '..KPK.KPPK.KpK..', '..Ku.KKPu.KPu...', '...Ku..Ku..KK...', '....K...K..K....'],
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
     * REQUIREMENT 4 — the Boss's dark aura. A layered, animated shadow-field:
     * a violet haze, a ring of swirling shadow wisps, and a few rising red
     * embers. Procedural (driven by `time`), so it lives and breathes. Draw it
     * BEFORE the Boss sprite so the figure sits inside the aura.
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

        // 1) Dark haze body (additive-free, just a soft violet/black cloud).
        const pulse = 0.85 + 0.15 * Math.sin(t * 1.6);
        const haze = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius * pulse);
        haze.addColorStop(0.0, `rgba(40, 10, 60, ${0.30 * intensity})`);
        haze.addColorStop(0.55, `rgba(24, 6, 40, ${0.22 * intensity})`);
        haze.addColorStop(1.0, 'rgba(4, 1, 8, 0)');
        ctx.fillStyle = haze;
        ctx.beginPath();
        ctx.arc(0, 0, radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        // 2) Swirling shadow wisps orbiting the figure.
        const N = 16;
        ctx.shadowBlur = 10;
        for (let i = 0; i < N; i++) {
            const ang = t * (0.5 + 0.04 * i) + (i * Math.PI * 2) / N;
            const orbit = radius * (0.52 + 0.34 * Math.sin(t * 1.2 + i * 1.7));
            const x = Math.cos(ang) * orbit;
            const y = Math.sin(ang) * orbit * 0.82 - radius * 0.08;
            const s = 2.2 + 3.2 * ((i * 7) % 5) / 5;
            const red = i % 5 === 0;
            const a = 0.18 + 0.30 * (0.5 + 0.5 * Math.sin(t * 2.1 + i));
            ctx.globalAlpha = a * intensity;
            ctx.fillStyle = red ? 'rgba(255, 50, 50, 0.85)' : 'rgba(120, 60, 190, 0.85)';
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(x, y, s, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3) A few embers drifting upward through the figure.
        const E = 5;
        for (let i = 0; i < E; i++) {
            const phase = (t * 0.6 + i / E) % 1;          // 0..1 rise
            const x = Math.sin((i * 12.9 + t) * 1.3) * radius * 0.4;
            const y = radius * 0.5 - phase * radius * 1.2;  // bottom -> top
            const a = (1 - phase) * 0.5 * intensity;
            ctx.globalAlpha = a;
            ctx.fillStyle = i % 2 ? 'rgba(255, 70, 60, 0.9)' : 'rgba(150, 80, 220, 0.9)';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x, y, 1.6 + (1 - phase) * 1.6, 0, Math.PI * 2);
            ctx.fill();
        }

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
