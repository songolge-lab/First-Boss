// src/environment/ThroneRoom.js
// ---------------------------------------------------------------------------
// "The Midnight Court" — redesigned NIGHT THRONE HALL (VISUAL_REDESIGN_BIBLE.md
// §5, newest approved direction: tools/redesign/env4_gen.js / env4_v3.png).
// Procedural Canvas 2D only (no external images, no offscreen tile baking).
//
// The approved art is ONE bespoke, non-repeating tableau. This module ports that
// philosophy into a 4000px panning world: every opening, pier, banner, statue and
// the throne is placed EXACTLY ONCE at a distinct world-x, and the night sky seen
// through the windows is ONE continuous world-space panorama sampled per opening —
// so adjacent windows show different, continuous terrain and NOTHING is a repeated
// module. Between features the wall runs as deterministically-varied masonry
// (per-stone tone / chip / crack keyed on world position), never a tiled block.
//
// Back-to-front layers (all world-locked except backdrop + vignette):
//   1. Backdrop (screen)   : deep night ceiling-void + faint dark colonnade
//   2. Wall + cornice      : cool night masonry (varied courses), baseboard
//   3. Openings            : 6 UNIQUE windows/arcades onto the moonlit panorama
//   4. Piers               : columns + aged banners / statues / ivy / cracks
//   5. Throne              : dthrone-inspired black+gold throne, apse, candelabra
//   6. Floor               : night flagstone, moon pools, clean combat lane
//   7. Carpet              : crimson runner with worn / torn / faded sections
//   8. Light washes        : cool moonlight + warm torch pools (faint, translucent)
//   9. Torch light/bodies  : existing flicker system (wall sconces on banner piers)
//  10. Embers              : existing rising sparks
//  11. Vignette (screen)   : night edge darkening (drawn after entities)
//
// Coordinate model is UNCHANGED: (x,y) is WORLD space, walking surface at floorY,
// world spans [0, worldWidth]. World-locked layers draw under the SAME
// camera.applyTransform(ctx) the entities use. Assumes a pure-pan camera.
//
// API (unchanged):
//   new ThroneRoom({ worldWidth, floorY, torchSpacing, embers })
//   update(dt)  /  render(ctx, camera, w, h, { skipVignette })  /  drawVignette(ctx, w, h)
// ---------------------------------------------------------------------------

import { PerfMonitor } from '../core/PerfMonitor.js';

// Night palette (from env4_gen.js). Cool stone by default; warm only near flame.
const PAL = {
    // cool night stone (dark -> light)
    st0: '#141219', st1: '#211f27', st2: '#2d2b35', st3: '#3a3743', st4: '#484450', st5: '#575263',
    // warm (torch-lit) stone accents
    wm1: '#443830', wm2: '#56463a', wm3: '#685646',
    // night sky (top -> horizon)
    sky0: '#070c18', sky1: '#0d1730', sky2: '#142344', sky3: '#1d3054',
    // moon + stars
    moon: '#efe9d3', moonSh: '#c9c3a8', star: '#dfe7f4', starDim: '#7d89a4',
    // panorama silhouettes
    ridgeFar: '#16223f', ridgeRim: '#31456e', ridgeNear: '#101a33', hill: '#0c1526',
    tree: '#0c1a16', meadow: '#0d1d14', meadowLit: '#14291c', keep: '#141d33', keepWin: '#ffcf7a',
    // gold
    gold0: '#6e4d17', gold1: '#a67b26', gold2: '#d9ab3f', gold3: '#f6dc82',
    // crimson + faded cloth
    red0: '#3c0a12', red1: '#5c1119', red2: '#7e1e2b', red3: '#9c2e3c', redFade: '#7b4e55',
    // throne blacks
    blk0: '#0c0b10', blk1: '#16151c', blk2: '#201f28', blk3: '#2b2a36',
    // wood / iron
    wood: '#241a12', wood2: '#3f2f1c', iron: '#20242e', iron2: '#343a48',
    // marble (statue)
    mar0: '#4f4f60', mar1: '#6b6b7c', mar2: '#8a8a9c',
    // greens (ivy / moss)
    ivy0: '#132218', ivy1: '#1b3122', ivy2: '#27442f',
    // flame
    fl0: '#a84e1c', fl1: '#e8873a', fl2: '#ffd27a',
};

export class ThroneRoom {
    constructor({ worldWidth = 4000, floorY = 600, torchSpacing = 600, embers = true } = {}) {
        this.worldWidth = worldWidth;
        this.floorY = floorY;
        this.torchSpacing = torchSpacing;   // kept for API compat (placement is per-pier)
        this.enableEmbers = embers;
        this.time = 0;

        // Vertical bands (world y), all referenced to floorY so the floor line is fixed.
        this.corniceY = floorY - 545;   // ceiling molding band
        this.winApex  = floorY - 520;   // window arch apex
        this.winSpring= floorY - 450;   // arch springline
        this.winSill  = floorY - 180;   // window sill (kept above the ~144px boss head)
        this.baseY    = floorY - 22;    // wall/floor baseboard

        // Focal throne at world centre — the boss spawns before its own throne.
        this.throneX = Math.round(worldWidth / 2);

        // Moon lives at ONE world position, high in the sky behind the grand rose
        // window; only that opening reveals it (continuous panorama, no repeat).
        this.moonX = 520;
        this.moonY = floorY - 470;
        this.moonR = 26;
        // The distant lit keep sits behind one arcade only.
        this.keepX = 2960;

        // ---- UNIQUE openings: each a different type, placed once ----
        // Types: rose | arcade | twin | lancet3 | wheel | lancetPair
        this.openings = [
            { x: 520,  half: 168, type: 'rose',       seed: 11 }, // grand rose window w/ the moon
            { x: 1040, half: 160, type: 'arcade',     seed: 23 }, // open arcade onto the terrace
            { x: 1520, half: 150, type: 'twin',       seed: 31 }, // two-light gothic window
            { x: 2480, half: 150, type: 'lancet3',    seed: 47 }, // triple stepped lancet
            { x: 2960, half: 160, type: 'arcade2',    seed: 53 }, // second arcade (different view)
            { x: 3460, half: 148, type: 'wheel',      seed: 67 }, // circular wheel window
            { x: 3860, half: 120, type: 'lancetPair', seed: 83 }, // twin tall lancets
        ];

        // ---- UNIQUE piers between/around the openings ----
        // Types: plain | banner | statue.  Banner sigil/wear varies by seed.
        this.piers = [
            { x: 200,  type: 'plain',  seed: 2,  ivy: true },
            { x: 780,  type: 'banner', seed: 5 },
            { x: 1280, type: 'statue', seed: 8 },
            { x: 1770, type: 'banner', seed: 12 },              // throne-left frame
            { x: 2230, type: 'statue', seed: 15 },              // throne-right frame
            { x: 2720, type: 'banner', seed: 19 },
            { x: 3220, type: 'plain',  seed: 22, ivy: true },
            { x: 3700, type: 'banner', seed: 26 },
            { x: 3950, type: 'plain',  seed: 29 },
        ];

        // Wall torches: mounted on the banner piers (existing flicker system).
        this.torches = [];
        const torchY = floorY - 150;
        for (const p of this.piers) {
            if (p.type !== 'banner') continue;
            this.torches.push({
                x: p.x + 24, y: torchY,
                p1: this._hash(p.x, 1) * Math.PI * 2, p2: this._hash(p.x, 2) * Math.PI * 2, p3: this._hash(p.x, 3) * Math.PI * 2,
                s1: 10 + this._hash(p.x, 4) * 4, s2: 4.5 + this._hash(p.x, 5) * 2, s3: 1.7 + this._hash(p.x, 6),
                flicker: 0.6, gust: 0,
            });
        }

        // Precompute varied masonry course lines once (non-uniform gaps -> not a grid).
        this._courses = this._buildCourses();
        // Precompute each course's stone chain ONCE, anchored to a fixed world
        // origin (never to the camera/view) so brick width/tone/crack are stable.
        this._stoneRows = this._buildStoneRows();

        this.embers = [];
        if (this.enableEmbers) for (let i = 0; i < 60; i++) this.embers.push(this._deadEmber());
        this._spawnAccumulator = 0;
        this._view = { left: 0, right: worldWidth };
    }

    _buildCourses() {
        const rows = [];
        let y = this.floorY - 4;
        const top = this.corniceY - 40;
        let i = 0;
        while (y > top) {
            rows.push(Math.round(y));
            y -= 34 + Math.round(this._hash(i, 71) * 12);   // 34..46px varied courses
            i++;
        }
        return rows;
    }

    // Per-course stone chains, walked ONCE from a fixed world anchor (never from
    // the current view/camera). Each stone's width is still hashed from a running
    // position, but because that walk always starts at the same world x and never
    // restarts mid-stream, every stone lands at the same world position on every
    // frame regardless of where the camera currently is. Margin covers cameras
    // panned to either world edge (view can extend ~1 canvas-width past worldWidth).
    _buildStoneRows() {
        const MARGIN = 1600;
        const rows = [];
        for (let ci = 0; ci < this._courses.length; ci++) {
            const off = (this._hash(ci, 13) * 90) | 0;
            const stones = [];
            for (let x = -MARGIN - off; x < this.worldWidth + MARGIN; ) {
                const bw = 78 + Math.round(this._hash(x, ci) * 40);   // 78..118 varied width
                stones.push({ x, bw });
                x += bw;
            }
            rows.push(stones);
        }
        return rows;
    }

    // ---- lifecycle ---------------------------------------------------------

    update(dt) {
        if (dt > 0.1) dt = 0.1;
        this.time += dt;
        for (const t of this.torches) {
            let f = 0.62 + 0.20 * Math.sin(this.time * t.s1 + t.p1)
                         + 0.12 * Math.sin(this.time * t.s2 + t.p2)
                         + 0.08 * Math.sin(this.time * t.s3 + t.p3);
            t.gust += (Math.random() * 2 - 1) * dt * 6; t.gust *= 0.92; f += t.gust * 0.12;
            t.flicker = f < 0 ? 0 : f > 1 ? 1 : f;
        }
        if (this.enableEmbers) this._updateEmbers(dt);
    }

    render(ctx, camera, canvasWidth, canvasHeight, opts = {}) {
        const w = canvasWidth, h = canvasHeight;
        const view = { left: camera.x - w / 2, right: camera.x + w / 2, top: camera.y - h / 2, bottom: camera.y + h / 2 };
        this._view.left = view.left; this._view.right = view.right;

        PerfMonitor.start('render clear/background');
        this._drawBackdrop(ctx, camera, w, h);
        PerfMonitor.end('render clear/background');

        PerfMonitor.start('throneRoom render');
        ctx.save();
        camera.applyTransform(ctx);
        this._drawWall(ctx, view);
        this._drawOpenings(ctx, view);
        this._drawPiers(ctx, view);
        this._drawThrone(ctx, view);
        this._drawFloor(ctx, view);
        this._drawCarpet(ctx, view);
        this._drawLightWashes(ctx, view);
        this._drawTorchLight(ctx, view);
        this._drawTorchBodies(ctx, view);
        if (this.enableEmbers) this._drawEmbers(ctx, view);
        ctx.restore();
        PerfMonitor.end('throneRoom render');

        if (!opts.skipVignette) this.drawVignette(ctx, w, h);
    }

    // ---- 1. screen-space backdrop (deep night void behind the wall) --------

    _drawBackdrop(ctx, camera, w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#070810');
        g.addColorStop(0.55, '#0b0c15');
        g.addColorStop(1, '#0f1018');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        // Faint cold parallax colonnade for depth above the wall line.
        const par = 0.35, spacing = 320, pillarW = 44, top = h * 0.05, colH = h * 0.5;
        ctx.save();
        ctx.fillStyle = 'rgba(10,12,20,0.55)';
        for (let x = -((camera.x * par) % spacing) - spacing; x < w + spacing; x += spacing) {
            ctx.fillRect(x, top, pillarW, colH);
            ctx.fillRect(x - 6, top, pillarW + 12, 10);
        }
        ctx.restore();
    }

    // ---- 2. wall + ceiling cornice (cool night masonry) --------------------

    _drawWall(ctx, view) {
        const floorY = this.floorY;
        const top = Math.min(view.top - 40, this.corniceY - 60);
        const left = view.left - 120, right = view.right + 120, span = right - left;

        // Base cool-stone wash.
        ctx.fillStyle = PAL.st2;
        ctx.fillRect(left, top, span, floorY - top);

        // Varied-course ashlar: per-course offset + per-stone tone/chip/crack, all
        // keyed on world position (deterministic) so it never reads as a tiled grid.
        // Stone chains are precomputed once (see _buildStoneRows) and only FILTERED
        // to the current view here — never re-walked from it — so bricks stay
        // locked to world space as the camera pans.
        for (let ci = 0; ci < this._courses.length; ci++) {
            const yB = this._courses[ci];
            const yT = ci + 1 < this._courses.length ? this._courses[ci + 1] : yB - 40;
            const chH = yB - yT;
            if (yB < top || yT > floorY) continue;
            const stones = this._stoneRows[ci];
            for (let si = 0; si < stones.length; si++) {
                const { x, bw } = stones[si];
                if (x + bw < left || x > right) continue;
                const hsh = this._hash(Math.round(x / 17) + ci * 7, 3);
                // stone body value: cool blue-grey, subtly varied per stone
                let v = 34 + Math.floor(hsh * 16);                           // 34..50
                if (hsh > 0.9) v -= 14; else if (hsh < 0.08) v += 12;        // rare dark/light stones
                ctx.fillStyle = `rgb(${v - 4}, ${v - 2}, ${v + 8})`;
                ctx.fillRect(x + 2, yT + 2, bw - 3, chH - 3);
                ctx.fillStyle = 'rgba(87,82,99,0.10)';                       // top catch-light
                ctx.fillRect(x + 2, yT + 2, bw - 3, 1);
                ctx.fillStyle = 'rgba(9,8,12,0.5)';                          // bottom mortar shadow
                ctx.fillRect(x + 2, yB - 2, bw - 3, 2);
                // occasional chipped corner
                if (hsh > 0.82) { ctx.fillStyle = PAL.st0; ctx.fillRect(x + 3, yT + 3, 4, 3); }
                // rare hairline crack down a stone (offset cells, never identical)
                if (this._hash(x, ci + 40) > 0.93) {
                    ctx.fillStyle = PAL.st0;
                    let cx = x + 10 + (bw >> 1);
                    for (let yy = yT + 3; yy < yB - 2; yy += 3) { ctx.fillRect(cx, yy, 1, 3); cx += this._hash(cx, yy) > 0.5 ? 1 : -1; }
                }
            }
        }

        // Ceiling void + cornice band above the openings.
        ctx.fillStyle = PAL.st0;
        ctx.fillRect(left, top, span, this.corniceY - top);
        ctx.fillStyle = PAL.st4;
        ctx.fillRect(left, this.corniceY - 4, span, 2);
        ctx.fillStyle = PAL.st1;
        ctx.fillRect(left, this.corniceY - 1, span, 3);
        for (let x = Math.floor(left / 72) * 72; x < right; x += 72) {      // corbels
            ctx.fillStyle = PAL.st3; ctx.fillRect(x, this.corniceY - 10, 12, 6);
            ctx.fillStyle = PAL.st1; ctx.fillRect(x + 3, this.corniceY - 4, 6, 2);
        }

        // Scattered wall storytelling (moss / repaired patch / mason's mark),
        // deterministic and sparse so it never becomes noise.
        this._wallStory(ctx, view);

        // Baseboard where the wall meets the floor.
        ctx.fillStyle = PAL.st1;
        ctx.fillRect(left, this.baseY, span, floorY - this.baseY);
        ctx.fillStyle = 'rgba(87,82,99,0.08)';
        ctx.fillRect(left, this.baseY, span, 2);
    }

    _wallStory(ctx, view) {
        // Damp moss collecting along the baseboard at a few fixed world spots.
        const spots = [340, 1150, 1980, 2610, 3300];
        for (const sx of spots) {
            if (sx < view.left - 60 || sx > view.right + 60) continue;
            ctx.fillStyle = PAL.ivy0; ctx.fillRect(sx, this.floorY - 30, 22, 8);
            ctx.fillStyle = PAL.ivy1; ctx.fillRect(sx + 4, this.floorY - 34, 10, 6);
            ctx.fillStyle = PAL.ivy2; ctx.fillRect(sx + 8, this.floorY - 32, 4, 3);
        }
        // A repaired patch of newer, paler stone with its own mortar outline.
        const px = 1620;
        if (px > view.left - 120 && px < view.right + 120) {
            const py = this.floorY - 230;
            ctx.fillStyle = PAL.st3; ctx.fillRect(px, py, 70, 46);
            ctx.strokeStyle = PAL.st0; ctx.lineWidth = 2;
            ctx.strokeRect(px + 1, py + 1, 68, 44);
            ctx.beginPath(); ctx.moveTo(px + 34, py); ctx.lineTo(px + 34, py + 46);
            ctx.moveTo(px, py + 22); ctx.lineTo(px + 70, py + 22); ctx.stroke();
        }
    }

    // ---- 3. openings: 6 unique windows onto the continuous night panorama --

    _drawOpenings(ctx, view) {
        for (const op of this.openings) {
            if (op.x + op.half < view.left - 60 || op.x - op.half > view.right + 60) continue;
            this._drawOpening(ctx, op);
        }
    }

    _drawOpening(ctx, op) {
        const { x: cx, half, type, seed } = op;
        const apex = this.winApex, spring = this.winSpring, sill = this.winSill;
        const L = cx - half, R = cx + half, W = half * 2;
        const arcade = type === 'arcade' || type === 'arcade2';

        // Deep stone reveal behind the opening (reads as wall thickness).
        ctx.fillStyle = PAL.st1;
        ctx.fillRect(L - 12, apex - 6, W + 24, sill - apex + 14);
        ctx.fillStyle = PAL.st3;
        ctx.fillRect(L - 12, apex - 6, 6, sill - apex + 14);   // lit left jamb

        // Clip to the pointed opening and paint the panorama slice.
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(L, sill);
        ctx.lineTo(L, spring);
        ctx.quadraticCurveTo(L, apex, cx, apex);
        ctx.quadraticCurveTo(R, apex, R, spring);
        ctx.lineTo(R, sill);
        ctx.closePath();
        ctx.clip();
        this._drawVista(ctx, L, R, apex, sill, seed, arcade);
        ctx.restore();

        // Type-specific tracery / mullions / balustrade over the vista.
        switch (type) {
            case 'rose':       this._traceryRose(ctx, cx, L, R, apex, spring, sill); break;
            case 'arcade':     this._traceryArcade(ctx, cx, L, R, apex, spring, sill, seed); break;
            case 'arcade2':    this._traceryArcadeTriple(ctx, cx, L, R, apex, spring, sill, seed); break;
            case 'twin':       this._traceryTwin(ctx, cx, L, R, apex, spring, sill); break;
            case 'lancet3':    this._traceryLancet(ctx, cx, L, R, apex, spring, sill, 3); break;
            case 'lancetPair': this._traceryLancetPair(ctx, cx, L, R, apex, spring, sill); break;
            case 'wheel':      this._traceryWheel(ctx, cx, L, R, apex, spring, sill); break;
        }

        // Arch outline + jamb shading + sill ledge (shared).
        ctx.strokeStyle = PAL.st0; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(L, sill); ctx.lineTo(L, spring);
        ctx.quadraticCurveTo(L, apex, cx, apex);
        ctx.quadraticCurveTo(R, apex, R, spring);
        ctx.lineTo(R, sill);
        ctx.stroke();
        ctx.fillStyle = PAL.st4; ctx.fillRect(L - 12, sill, W + 24, 6);      // sill ledge
        ctx.fillStyle = PAL.st1; ctx.fillRect(L - 12, sill + 6, W + 24, 4);
        // Moss + a dead leaf collecting on the sill (deterministic).
        ctx.fillStyle = PAL.ivy1; ctx.fillRect(L + 14, sill + 2, 12, 3); ctx.fillRect(R - 30, sill + 2, 9, 3);
        ctx.fillStyle = PAL.ivy2; ctx.fillRect(cx + 20, sill + 3, 5, 2);
        ctx.fillStyle = PAL.wm2; ctx.fillRect(L + 40 + (seed % 30), sill + 1, 3, 2);
    }

    // Continuous world-space night panorama, cropped by the opening's clip.
    _drawVista(ctx, L, R, apex, sill, seed, arcade) {
        const W = R - L;
        // Sky gradient.
        const g = ctx.createLinearGradient(0, apex, 0, sill);
        g.addColorStop(0, PAL.sky0); g.addColorStop(0.45, PAL.sky1);
        g.addColorStop(0.8, PAL.sky2); g.addColorStop(1, PAL.sky3);
        ctx.fillStyle = g;
        ctx.fillRect(L, apex, W, sill - apex);

        // Stars: keyed on world cells so they're stable and continuous.
        for (let x = Math.floor(L / 26) * 26; x < R; x += 26) {
            const s = this._hash(x, 91);
            if (s < 0.55) continue;
            const sy = apex + 8 + this._hash(x, 92) * (this.winSpring - apex - 4);
            ctx.fillStyle = s > 0.85 ? PAL.star : PAL.starDim;
            ctx.fillRect(x + (this._hash(x, 93) * 14 | 0), sy, s > 0.85 ? 2 : 1, s > 0.85 ? 2 : 1);
        }

        // Moon (only in the opening whose clip contains moonX).
        if (this.moonX > L - this.moonR && this.moonX < R + this.moonR) {
            ctx.save();
            ctx.globalAlpha = 0.16; ctx.fillStyle = PAL.moon;
            ctx.beginPath(); ctx.arc(this.moonX, this.moonY, this.moonR + 10, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; ctx.fillStyle = PAL.moon;
            ctx.beginPath(); ctx.arc(this.moonX, this.moonY, this.moonR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = PAL.moonSh;                                     // shaded lower-left limb + craters
            ctx.beginPath(); ctx.arc(this.moonX - 5, this.moonY + 4, this.moonR - 4, Math.PI * 0.15, Math.PI * 1.05); ctx.fill();
            ctx.fillStyle = PAL.moon;
            ctx.beginPath(); ctx.arc(this.moonX + 6, this.moonY - 6, this.moonR - 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = PAL.moonSh;
            ctx.beginPath(); ctx.arc(this.moonX - 8, this.moonY + 2, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.moonX + 4, this.moonY + 8, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // Ridgelines: sampled from continuous world-space noise so neighbouring
        // openings show continuous, non-repeating terrain.
        const farBase = sill - 150, nearBase = sill - 112, hillBase = sill - 80;
        this._ridgeBand(ctx, L, R, sill, farBase, 46, 260, seed, PAL.ridgeFar, true);
        this._ridgeBand(ctx, L, R, sill, nearBase, 34, 190, seed + 1, PAL.ridgeNear, false);
        this._ridgeBand(ctx, L, R, sill, hillBase, 20, 150, seed + 2, PAL.hill, false);

        // Distant keep silhouette (behind one arcade only).
        if (this.keepX > L - 40 && this.keepX < R + 40) this._drawKeep(ctx, this.keepX, sill);

        // Treeline + meadow at the base of the view.
        const treeTop = sill - 52;
        ctx.fillStyle = PAL.meadow; ctx.fillRect(L, sill - 30, W, 30);
        ctx.fillStyle = PAL.tree;
        for (let x = Math.floor(L / 34) * 34; x < R; x += 34) {
            const th = 10 + this._hash(x, 41) * 18;
            const tw = 12 + this._hash(x, 42) * 10;
            ctx.beginPath();
            ctx.moveTo(x, treeTop + 6); ctx.lineTo(x + tw / 2, treeTop + 6 - th); ctx.lineTo(x + tw, treeTop + 6);
            ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = PAL.meadowLit; ctx.fillRect(L, sill - 4, W, 4);      // dim rim of light on the grass

        // Fireflies over the terrace (only for open arcades — they feel closer).
        if (arcade) {
            ctx.fillStyle = PAL.fl2;
            for (let i = 0; i < 3; i++) {
                const fx = L + 30 + this._hash(seed + i, 61) * (W - 60);
                const fy = sill - 24 - this._hash(seed + i, 62) * 30;
                ctx.globalAlpha = 0.5 + 0.4 * Math.sin(this.time * 2 + i * 2);
                ctx.fillRect(fx, fy, 2, 2);
            }
            ctx.globalAlpha = 1;
        }
    }

    _ridgeBand(ctx, L, R, sill, base, amp, wl, seed, color, moonlit) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(L, sill);
        const yAt = (x) => base - amp * (0.65 * this._noise(x / wl, seed) + 0.35 * this._noise(x / (wl * 0.4), seed + 9));
        for (let x = L; x <= R; x += 6) ctx.lineTo(x, yAt(x));
        ctx.lineTo(R, sill); ctx.closePath(); ctx.fill();
        // Moonlit rim: a thin cool highlight on slopes nearest the moon.
        if (moonlit) {
            ctx.strokeStyle = PAL.ridgeRim; ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let x = L; x <= R; x += 6) {
                const d = 1 - Math.min(1, Math.abs(x - this.moonX) / 900);
                if (d <= 0.15) continue;
                const y = yAt(x);
                if (x === L) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    _drawKeep(ctx, kx, sill) {
        const base = sill - 30, h = 66;
        ctx.fillStyle = PAL.keep;
        ctx.fillRect(kx - 14, base - h, 28, h);
        ctx.fillRect(kx - 20, base - h + 6, 8, h - 6);         // side turret
        ctx.fillRect(kx + 12, base - h + 6, 8, h - 6);
        ctx.beginPath(); ctx.moveTo(kx - 16, base - h); ctx.lineTo(kx, base - h - 14); ctx.lineTo(kx + 16, base - h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = PAL.keepWin;                           // two lit windows
        ctx.fillRect(kx - 6, base - h + 20, 3, 4); ctx.fillRect(kx + 4, base - h + 34, 3, 4);
    }

    // ---- tracery variants (each opening reads differently) -----------------

    _traceryRose(ctx, cx, L, R, apex, spring, sill) {
        // Radiating voussoir arch band.
        this._voussoirs(ctx, cx, L, R, apex, spring, 5);
        // Three tall cusped lights below a big rose.
        const roseY = spring - 6, roseR = 46;
        ctx.fillStyle = PAL.st2;
        ctx.fillRect(cx - roseR - 6, spring + 8, 4, sill - spring - 8);     // light mullions
        ctx.fillRect(cx - 2, spring + 8, 4, sill - spring - 8);
        ctx.fillRect(cx + roseR + 2, spring + 8, 4, sill - spring - 8);
        // Rose window ring + dark stone spokes silhouetted on the moon/sky.
        ctx.strokeStyle = PAL.st3; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, roseY, roseR, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = PAL.st4; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, roseY, roseR - 10, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = PAL.st2; ctx.lineWidth = 3;
        for (let a = 0; a < 8; a++) {
            const an = (a / 8) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(cx, roseY); ctx.lineTo(cx + Math.cos(an) * roseR, roseY + Math.sin(an) * roseR); ctx.stroke();
        }
        ctx.fillStyle = PAL.st1; ctx.beginPath(); ctx.arc(cx, roseY, 7, 0, Math.PI * 2); ctx.fill();
    }

    _traceryArcade(ctx, cx, L, R, apex, spring, sill, seed) {
        // Two DIFFERENT round arches over the terrace, separated by a colonnette.
        const midGap = 8;
        const lc = cx - (cx - L) * 0.5, rc = cx + (R - cx) * 0.5;
        const lrx = (cx - L) * 0.44, rrx = (R - cx) * 0.4;                  // different radii
        ctx.strokeStyle = PAL.st3; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(lc, spring + 6, lrx, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(rc, spring + 16, rrx, Math.PI, 0); ctx.stroke();
        // Central colonnette with entasis + capital/base.
        ctx.fillStyle = PAL.st3; ctx.fillRect(cx - 4, spring + 4, 8, sill - spring - 4);
        ctx.fillStyle = PAL.st4; ctx.fillRect(cx - 4, spring + 4, 3, sill - spring - 4);
        ctx.fillStyle = PAL.st2; ctx.fillRect(cx - 8, spring + 2, 16, 6); ctx.fillRect(cx - 8, sill - 18, 16, 6);
        // Balustrade at the sill (uneven balusters, one broken + moss).
        ctx.fillStyle = PAL.st4; ctx.fillRect(L, sill - 22, R - L, 3);
        ctx.fillStyle = PAL.st2; ctx.fillRect(L, sill - 8, R - L, 8);
        let bx = L + 10;
        for (let i = 0; bx < R - 8; i++) {
            const broken = ((seed + i) % 7) === 3;
            ctx.fillStyle = PAL.st3;
            ctx.fillRect(bx, sill - 19, 5, broken ? 6 : 11);
            if (broken) { ctx.fillStyle = PAL.ivy1; ctx.fillRect(bx, sill - 13, 6, 3); }
            bx += 14 + ((this._hash(bx, seed) * 6) | 0);
        }
    }

    // "arcade2" opening — a TRIFORIUM-style triple arcade: three EQUAL round
    // arches carried on two slender colonnettes, instead of "arcade"'s two
    // asymmetric arches on one thick central colonnette. Same open-terrace
    // family (round arches, balustrade), but an unmistakably different arch
    // count/rhythm and post arrangement — obvious at a glance, not a near-copy.
    _traceryArcadeTriple(ctx, cx, L, R, apex, spring, sill, seed) {
        const W = R - L, third = W / 3;
        const centers = [L + third * 0.5, L + third * 1.5, L + third * 2.5];
        const rx = third * 0.46;
        ctx.strokeStyle = PAL.st3; ctx.lineWidth = 5;
        for (const c of centers) { ctx.beginPath(); ctx.arc(c, spring + 10, rx, Math.PI, 0); ctx.stroke(); }
        // Two slender colonnettes at the 1/3 and 2/3 marks (no thick central post).
        for (const px of [L + third, L + third * 2]) {
            ctx.fillStyle = PAL.st3; ctx.fillRect(px - 3, spring + 6, 6, sill - spring - 6);
            ctx.fillStyle = PAL.st4; ctx.fillRect(px - 3, spring + 6, 2, sill - spring - 6);
            ctx.fillStyle = PAL.st2; ctx.fillRect(px - 6, spring + 4, 12, 5); ctx.fillRect(px - 6, sill - 16, 12, 5);
        }
        // Balustrade at the sill — same terrace treatment as the other arcade.
        ctx.fillStyle = PAL.st4; ctx.fillRect(L, sill - 22, R - L, 3);
        ctx.fillStyle = PAL.st2; ctx.fillRect(L, sill - 8, R - L, 8);
        let bx = L + 10;
        for (let i = 0; bx < R - 8; i++) {
            const broken = ((seed + i) % 7) === 3;
            ctx.fillStyle = PAL.st3;
            ctx.fillRect(bx, sill - 19, 5, broken ? 6 : 11);
            if (broken) { ctx.fillStyle = PAL.ivy1; ctx.fillRect(bx, sill - 13, 6, 3); }
            bx += 14 + ((this._hash(bx, seed) * 6) | 0);
        }
    }

    // "twin" opening — ORNATE family member: two broad rounded-head lights under
    // a flared/capped central mullion, each light crossed by a leaded transom,
    // crowned by a four-lobed (quatrefoil) oculus. Rich, rounded, decorative.
    _traceryTwin(ctx, cx, L, R, apex, spring, sill) {
        this._voussoirs(ctx, cx, L, R, apex, spring, 4);
        const lc = cx - (cx - L) * 0.5, rc = cx + (R - cx) * 0.5;
        // Central mullion with a flared capital + base (distinct from the plain
        // mullion used on the lancet-pair window).
        ctx.fillStyle = PAL.st2;
        ctx.fillRect(cx - 3, spring - 4, 6, sill - spring + 4);
        ctx.fillStyle = PAL.st4;
        ctx.fillRect(cx - 6, spring + 24, 12, 4);                          // capital flare
        ctx.fillRect(cx - 6, sill - 10, 12, 4);                            // base flare
        // Broad rounded-head lights (gentle round arch, not a sharp point).
        ctx.strokeStyle = PAL.st3; ctx.lineWidth = 4;
        for (const c of [lc, rc]) {
            ctx.beginPath();
            ctx.moveTo(c - 28, spring + 30); ctx.lineTo(c - 28, spring + 16);
            ctx.arc(c, spring + 16, 28, Math.PI, 0); ctx.lineTo(c + 28, spring + 30);
            ctx.stroke();
            // leaded transom crossbar partway down each light.
            ctx.fillStyle = PAL.st2; ctx.fillRect(c - 24, spring + 54, 48, 4);
        }
        // Quatrefoil (four-lobed) oculus above the lights — distinct from the
        // lancet-pair window, which has no oculus at all.
        ctx.strokeStyle = PAL.st4; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, spring + 12, 13, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = PAL.st2;
        for (let a = 0; a < 4; a++) { const an = a * (Math.PI / 2); ctx.beginPath(); ctx.arc(cx + Math.cos(an) * 7, spring + 12 + Math.sin(an) * 7, 4, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = PAL.st1; ctx.beginPath(); ctx.arc(cx, spring + 12, 3, 0, Math.PI * 2); ctx.fill();
    }

    // "lancetPair" opening — AUSTERE family member: two tall, slender, acutely
    // pointed spire-lights under a plain unadorned mullion, no oculus, braced
    // near the base by simple crossed struts. Sharp, narrow, severe — reads as
    // a clearly different design from the twin window's broad rounded lights.
    _traceryLancetPair(ctx, cx, L, R, apex, spring, sill) {
        this._voussoirs(ctx, cx, L, R, apex, spring, 4);
        const lc = cx - (cx - L) * 0.5, rc = cx + (R - cx) * 0.5;
        // Plain, unflared central mullion (deliberately austere).
        ctx.fillStyle = PAL.st2;
        ctx.fillRect(cx - 2, spring - 10, 4, sill - spring + 10);
        // Tall acutely-pointed lancet heads (sharp straight-line spire, not a
        // rounded arc), narrower than the twin window's lights.
        ctx.strokeStyle = PAL.st3; ctx.lineWidth = 4;
        for (const c of [lc, rc]) {
            ctx.beginPath();
            ctx.moveTo(c - 18, sill - 8); ctx.lineTo(c - 18, spring + 10);
            ctx.lineTo(c, spring - 16); ctx.lineTo(c + 18, spring + 10);
            ctx.lineTo(c + 18, sill - 8);
            ctx.stroke();
            // Simple crossed diagonal struts bracing the base of each light —
            // a rustic touch the twin window (transom + quatrefoil) does not have.
            ctx.strokeStyle = PAL.st2; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(c - 16, sill - 46); ctx.lineTo(c + 16, sill - 16);
            ctx.moveTo(c + 16, sill - 46); ctx.lineTo(c - 16, sill - 16);
            ctx.stroke();
            ctx.strokeStyle = PAL.st3; ctx.lineWidth = 4;
        }
    }

    _traceryLancet(ctx, cx, L, R, apex, spring, sill, count) {
        this._voussoirs(ctx, cx, L, R, apex, spring, 4);
        const W = R - L, step = W / count;
        ctx.strokeStyle = PAL.st3; ctx.lineWidth = 4;
        for (let i = 0; i < count; i++) {
            const c = L + step * (i + 0.5);
            const lh = spring + 14 + (count === 3 ? Math.abs(i - 1) * 18 : 0); // stepped heads for triple
            ctx.beginPath();
            ctx.moveTo(c - step * 0.32, sill - 6);
            ctx.lineTo(c - step * 0.32, lh + 14);
            ctx.quadraticCurveTo(c - step * 0.32, lh, c, lh);
            ctx.quadraticCurveTo(c + step * 0.32, lh, c + step * 0.32, lh + 14);
            ctx.lineTo(c + step * 0.32, sill - 6);
            ctx.stroke();
            if (i > 0) { ctx.fillStyle = PAL.st2; ctx.fillRect(L + step * i - 2, spring + 6, 4, sill - spring - 6); }
        }
    }

    _traceryWheel(ctx, cx, L, R, apex, spring, sill) {
        this._voussoirs(ctx, cx, L, R, apex, spring, 5);
        const wy = (spring + sill) / 2 - 6, wr = Math.min((R - L) * 0.42, (sill - spring) * 0.42);
        ctx.strokeStyle = PAL.st3; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(cx, wy, wr, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = PAL.st4; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, wy, wr - 8, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = PAL.st2; ctx.lineWidth = 3;
        for (let a = 0; a < 12; a++) {                                       // 12 spokes (distinct from rose's 8)
            const an = (a / 12) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(cx, wy); ctx.lineTo(cx + Math.cos(an) * wr, wy + Math.sin(an) * wr); ctx.stroke();
        }
        ctx.fillStyle = PAL.st1; ctx.beginPath(); ctx.arc(cx, wy, 6, 0, Math.PI * 2); ctx.fill();
    }

    _voussoirs(ctx, cx, L, R, apex, spring, n) {
        // Radiating joint marks around the pointed arch head.
        ctx.strokeStyle = PAL.st1; ctx.lineWidth = 2;
        for (let i = 1; i < n; i++) {
            const t = i / n;
            const x = L + (R - L) * t;
            const y = spring - (spring - apex) * Math.sin(t * Math.PI);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 8); ctx.stroke();
        }
    }

    // ---- 4. piers: columns + aged banners / statues / ivy ------------------

    _drawPiers(ctx, view) {
        const floorY = this.floorY, top = this.corniceY;
        const PIER_W = 60;
        for (const p of this.piers) {
            const x = p.x - PIER_W / 2;
            if (x + PIER_W < view.left - 40 || x > view.right + 40) continue;

            // Engaged column: tonal cylinder shading (lit centre, dark edges).
            const grad = ctx.createLinearGradient(x, 0, x + PIER_W, 0);
            grad.addColorStop(0, PAL.st1); grad.addColorStop(0.5, PAL.st3); grad.addColorStop(1, PAL.st1);
            ctx.fillStyle = grad; ctx.fillRect(x, top, PIER_W, floorY - top);
            // Capital + plinth.
            ctx.fillStyle = PAL.st3; ctx.fillRect(x - 8, top, PIER_W + 16, 14);
            ctx.fillStyle = PAL.st4; ctx.fillRect(x - 8, top, PIER_W + 16, 2);
            ctx.fillStyle = PAL.st3; ctx.fillRect(x - 8, floorY - 34, PIER_W + 16, 22);
            ctx.fillStyle = PAL.st4; ctx.fillRect(x - 8, floorY - 34, PIER_W + 16, 2);
            // Chipped capital corner + a hairline crack (deterministic).
            ctx.fillStyle = PAL.st0; ctx.fillRect(x - 6, top, 5, 5);
            const cy = floorY - 210 - this._hash(p.seed, 3) * 120;
            ctx.fillStyle = PAL.st0;
            ctx.fillRect(x + 22, cy, 1, 10); ctx.fillRect(x + 21, cy + 10, 1, 8); ctx.fillRect(x + 22, cy + 18, 1, 8);

            // Ivy on flagged piers (wiggling strand + leaf clusters, unique length).
            if (p.ivy) this._drawIvy(ctx, x + PIER_W - 8, top + 8, 150 + (p.seed % 4) * 30, p.seed);

            if (p.type === 'banner') this._drawBanner(ctx, p.x, top + 20, p.seed);
            else if (p.type === 'statue') this._drawStatueNiche(ctx, p.x, floorY, p.seed);
        }
    }

    _drawIvy(ctx, x, y, len, seed) {
        const ph = seed * 0.7;
        ctx.fillStyle = PAL.ivy0;
        for (let i = 0; i < len; i += 3) { const wob = Math.round(Math.sin((i + ph) * 0.16) * 3); ctx.fillRect(x + wob, y + i, 2, 3); }
        ctx.fillStyle = PAL.ivy2;
        for (let i = 14; i < len; i += 24) { const wob = Math.round(Math.sin((i + ph) * 0.16) * 3); ctx.fillRect(x + wob - 2, y + i, 5, 4); }
        ctx.fillStyle = PAL.ivy1;
        for (let i = 26; i < len; i += 38) { const wob = Math.round(Math.sin((i + ph) * 0.16) * 3); ctx.fillRect(x + wob, y + i, 2, 2); }
    }

    // Aged, noble, individually-worn banner (no two alike).
    _drawBanner(ctx, cx, top, seed) {
        const w = 42, h = 128, L = cx - w / 2;
        const sigilGold = (seed % 2) === 0;
        ctx.fillStyle = PAL.gold1; ctx.fillRect(L - 4, top - 4, w + 8, 5);           // rod
        // Cloth body with a sun-bleached faded patch.
        ctx.fillStyle = PAL.red1; ctx.fillRect(L, top, w, h);
        ctx.fillStyle = PAL.red0; ctx.fillRect(L, top, 4, h);                        // shadow edge
        ctx.fillStyle = PAL.redFade; ctx.fillRect(L + 10 + (seed % 12), top + 40, 12, 22); // bleached patch
        // Worn chevron / crest with a missing-stitch gap.
        ctx.fillStyle = sigilGold ? PAL.gold1 : PAL.gold0;
        for (let i = 0; i <= 8; i++) {
            if (i === 2 || i === 6) continue;                                        // gaps = worn stitches
            const yy = top + 26 - (i < 4 ? i : 8 - i) * 2;
            ctx.fillRect(L + 7 + i * 3, yy, 2, 2);
        }
        ctx.fillStyle = PAL.gold0; ctx.fillRect(cx - 6, top + 34, 12, 12);           // crest roundel
        ctx.fillStyle = sigilGold ? PAL.gold2 : PAL.red2; ctx.fillRect(cx - 3, top + 37, 6, 6);
        // Torn hem: three tails of different lengths + a hole + a hanging thread.
        ctx.fillStyle = PAL.red1;
        ctx.fillRect(L, top + h - 6, 12, 10 + (seed % 5));
        ctx.fillRect(L + 15, top + h - 6, 10, 4);                                    // shorter torn tail
        ctx.fillRect(L + 30, top + h - 6, 12, 8 + (seed % 4));
        ctx.fillStyle = PAL.red0; ctx.fillRect(L + 16, top + h - 20, 5, 5);          // hole
        ctx.fillRect(L + 8, top + h + (6 + seed % 6), 1, 6);                          // hanging thread
        ctx.fillStyle = PAL.gold0; ctx.fillRect(L, top + h - 8, w, 2);
    }

    _drawStatueNiche(ctx, cx, floorY, seed) {
        // Arched niche recessed into the pier.
        const nTop = floorY - 230, nBot = floorY - 120;
        ctx.fillStyle = PAL.st0;
        ctx.beginPath();
        ctx.moveTo(cx - 16, nBot); ctx.lineTo(cx - 16, nTop + 8);
        ctx.quadraticCurveTo(cx - 16, nTop - 6, cx, nTop - 6);
        ctx.quadraticCurveTo(cx + 16, nTop - 6, cx + 16, nTop + 8);
        ctx.lineTo(cx + 16, nBot); ctx.closePath(); ctx.fill();
        // Plinth.
        ctx.fillStyle = PAL.st3; ctx.fillRect(cx - 16, nBot, 32, 6);
        // Bowed robed marble figure (candle-lit warm rim on one side).
        ctx.fillStyle = PAL.mar1;
        ctx.fillRect(cx - 3, nTop + 6, 6, 5);                                        // bowed head
        ctx.beginPath();
        ctx.moveTo(cx - 12, nBot); ctx.lineTo(cx - 7, nTop + 12); ctx.lineTo(cx + 7, nTop + 12); ctx.lineTo(cx + 12, nBot); ctx.closePath(); ctx.fill();
        ctx.fillStyle = PAL.mar0; ctx.fillRect(cx - 12, nTop + 30, 24, 2);           // robe fold
        ctx.fillStyle = PAL.mar2; ctx.fillRect(cx + 6, nTop + 14, 2, nBot - nTop - 20); // warm-lit edge
        // Votive candles at the feet.
        const f = 0.6 + 0.3 * Math.sin(this.time * 8 + seed);
        for (const dx of [-9, 6]) {
            ctx.fillStyle = PAL.gold2; ctx.fillRect(cx + dx, nBot - 6, 2, 6);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const gg = ctx.createRadialGradient(cx + dx + 1, nBot - 8, 1, cx + dx + 1, nBot - 8, 10 * (0.8 + 0.4 * f));
            gg.addColorStop(0, 'rgba(255,220,150,0.9)'); gg.addColorStop(1, 'rgba(255,140,50,0)');
            ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx + dx + 1, nBot - 9, 8, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        // A vine trailing down one side of the niche (different rhythm from ivy).
        ctx.fillStyle = PAL.ivy1;
        for (let i = 0; i < 90; i += 4) { const wob = Math.round(Math.sin((i + seed) * 0.22) * 2); ctx.fillRect(cx + 18 + wob, nTop + i, 2, 3); }
    }

    // ---- 5. throne: dthrone-inspired black + gold seat of power ------------

    _drawThrone(ctx, view) {
        const X = this.throneX, floorY = this.floorY;
        if (X < view.left - 320 || X > view.right + 320) return;    // cull when far off-screen

        // -- curved apse recess with an oculus skylight --
        const apseTop = floorY - 340, apseW = 150;
        ctx.fillStyle = PAL.st0;
        ctx.beginPath();
        ctx.moveTo(X - apseW, floorY);
        ctx.lineTo(X - apseW, apseTop + 40);
        ctx.quadraticCurveTo(X - apseW, apseTop - 30, X, apseTop - 30);
        ctx.quadraticCurveTo(X + apseW, apseTop - 30, X + apseW, apseTop + 40);
        ctx.lineTo(X + apseW, floorY); ctx.closePath(); ctx.fill();
        // oculus with a sliver of night sky + soft beam
        ctx.fillStyle = PAL.sky1; ctx.beginPath(); ctx.arc(X, apseTop - 6, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PAL.star; ctx.fillRect(X + 4, apseTop - 12, 2, 2);
        ctx.strokeStyle = PAL.st3; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, apseTop - 6, 17, 0, Math.PI * 2); ctx.stroke();
        ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = PAL.moon;
        ctx.beginPath(); ctx.moveTo(X - 14, apseTop); ctx.lineTo(X + 14, apseTop); ctx.lineTo(X + 34, floorY - 120); ctx.lineTo(X - 34, floorY - 120); ctx.closePath(); ctx.fill();
        ctx.restore();

        // -- crimson swag drapes framing the apse (left long, right short/frayed) --
        this._swag(ctx, X - apseW + 8, apseTop + 10, 150, false);
        this._swag(ctx, X + apseW - 14, apseTop + 20, 96, true);

        // -- stepped dais (background platform behind the fighters) --
        const step = (dy, hw) => {
            ctx.fillStyle = PAL.st3; ctx.fillRect(X - hw, floorY - dy, hw * 2, 4);
            ctx.fillStyle = PAL.st4; ctx.fillRect(X - hw, floorY - dy, hw * 2, 1);
            ctx.fillStyle = PAL.st1; ctx.fillRect(X - hw, floorY - dy + 4, hw * 2, dy > 20 ? 8 : dy);
        };
        step(78, 90); step(60, 108); step(42, 128); step(24, 150);
        // Worn nosing chips + a half-gone gilt rosette.
        ctx.fillStyle = PAL.st0; ctx.fillRect(X - 150, floorY - 24, 8, 2); ctx.fillRect(X + 120, floorY - 42, 8, 2);
        ctx.fillStyle = PAL.gold1; ctx.fillRect(X - 116, floorY - 60, 4, 4); ctx.fillRect(X + 100, floorY - 60, 3, 3);
        // Traffic-worn crimson runner up the dais (pale worn centre).
        ctx.fillStyle = PAL.red1; ctx.fillRect(X - 30, floorY - 78, 60, 78);
        ctx.fillStyle = PAL.gold0; ctx.fillRect(X - 30, floorY - 78, 3, 78); ctx.fillRect(X + 27, floorY - 78, 3, 78);
        ctx.fillStyle = PAL.redFade; ctx.fillRect(X - 8, floorY - 74, 16, 74);      // worn centre
        ctx.fillStyle = PAL.red0; ctx.fillRect(X - 30, floorY - 60, 60, 2); ctx.fillRect(X - 30, floorY - 40, 60, 2);

        // -- the throne body (dthrone: black bell silhouette, gold-traced) --
        const seatY = floorY - 130;
        // Half-width profile from crown (top) to skirt base (on the dais).
        const prof = [
            [-300, 26], [-288, 34], [-272, 44], [-256, 54], [-240, 66],
            [-224, 80], [-212, 90], [-200, 86], [-186, 78], [-170, 70],
            [-150, 68], [-130, 72], [-112, 84], [-94, 96], [-80, 106], [-70, 112],
        ];
        // Fill black body.
        ctx.beginPath();
        ctx.moveTo(X + prof[0][1], floorY + prof[0][0]);
        for (let i = 1; i < prof.length; i++) ctx.lineTo(X + prof[i][1], floorY + prof[i][0]);
        for (let i = prof.length - 1; i >= 0; i--) ctx.lineTo(X - prof[i][1], floorY + prof[i][0]);
        ctx.closePath();
        ctx.fillStyle = PAL.blk1; ctx.fill();
        // Inner value break (subtle sculpt).
        ctx.fillStyle = PAL.blk2; ctx.fillRect(X - 60, floorY - 210, 120, 70);
        ctx.fillStyle = PAL.blk0; ctx.fillRect(X - 10, floorY - 150, 20, 80);
        // Gold contour trim (brighter on the lower, candle-lit rows).
        ctx.strokeStyle = PAL.gold1; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(X + prof[0][1], floorY + prof[0][0]);
        for (let i = 1; i < prof.length; i++) ctx.lineTo(X + prof[i][1], floorY + prof[i][0]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(X - prof[0][1], floorY + prof[0][0]);
        for (let i = 1; i < prof.length; i++) ctx.lineTo(X - prof[i][1], floorY + prof[i][0]);
        ctx.stroke();
        ctx.strokeStyle = PAL.gold2; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(X - 112, floorY - 70); ctx.lineTo(X + 112, floorY - 70); ctx.stroke();

        // Pierced wing scrolls — the warm apse shows THROUGH the holes.
        for (const dx of [-72, 72]) {
            ctx.fillStyle = PAL.wm1; ctx.fillRect(X + dx - 4, floorY - 214, 8, 12);
            ctx.fillStyle = PAL.fl0; ctx.fillRect(X + dx - 2, floorY - 210, 4, 4);
            ctx.strokeStyle = PAL.gold1; ctx.lineWidth = 2; ctx.strokeRect(X + dx - 5, floorY - 215, 10, 14);
        }

        // Crown: band + points + rubies + cross-and-orb finial.
        ctx.fillStyle = PAL.gold1; ctx.fillRect(X - 30, floorY - 300, 60, 12);
        ctx.fillStyle = PAL.gold2; ctx.fillRect(X - 30, floorY - 300, 60, 3);
        for (const dx of [-24, -8, 8, 24]) { ctx.fillStyle = PAL.gold2; ctx.fillRect(X + dx - 2, floorY - 312, 4, 12); ctx.fillStyle = PAL.gold3; ctx.fillRect(X + dx - 1, floorY - 312, 2, 3); }
        for (const dx of [-16, 0, 16]) { ctx.fillStyle = PAL.red2; ctx.fillRect(X + dx - 3, floorY - 297, 6, 6); ctx.fillStyle = PAL.red3; ctx.fillRect(X + dx - 1, floorY - 296, 2, 2); }
        ctx.fillStyle = PAL.gold2; ctx.fillRect(X - 2, floorY - 330, 4, 18); ctx.fillRect(X - 8, floorY - 322, 16, 4);  // cross
        ctx.fillStyle = PAL.gold3; ctx.beginPath(); ctx.arc(X, floorY - 308, 5, 0, Math.PI * 2); ctx.fill();

        // Red center drape (crown to seat) with a gold fringe.
        ctx.fillStyle = PAL.red1; ctx.fillRect(X - 16, floorY - 288, 32, 158);
        ctx.fillStyle = PAL.red2; ctx.fillRect(X - 10, floorY - 280, 20, 120);
        ctx.fillStyle = PAL.red0; ctx.fillRect(X - 16, floorY - 288, 5, 158);
        ctx.fillStyle = PAL.gold2; for (let dx = -14; dx <= 14; dx += 4) ctx.fillRect(X + dx, floorY - 130, 2, 3);

        // Seat cushion + scrolled gold-capped armrests.
        ctx.fillStyle = PAL.red2; ctx.fillRect(X - 60, seatY, 120, 16);
        ctx.fillStyle = PAL.red1; ctx.fillRect(X - 60, seatY, 120, 3);
        for (const dir of [-1, 1]) {
            const ax = X + dir * 76;
            ctx.fillStyle = PAL.blk2; ctx.fillRect(ax - 8, seatY - 2, 16, 22);
            ctx.fillStyle = PAL.gold2; ctx.fillRect(ax - 8, seatY - 2, 16, 3);
            ctx.fillStyle = PAL.gold1; ctx.beginPath(); ctx.arc(ax + dir * 5, seatY, 6, 0, Math.PI * 2); ctx.fill();  // volute
            ctx.fillStyle = PAL.blk0; ctx.beginPath(); ctx.arc(ax + dir * 5, seatY, 2, 0, Math.PI * 2); ctx.fill();
        }

        // Skirt fold lines + worn gold hem + claw feet.
        ctx.strokeStyle = PAL.blk0; ctx.lineWidth = 2;
        for (const dx of [-60, -30, 0, 30, 60]) { ctx.beginPath(); ctx.moveTo(X + dx, floorY - 108); ctx.lineTo(X + dx * 1.4, floorY - 72); ctx.stroke(); }
        ctx.fillStyle = PAL.gold2;
        for (let dx = -104; dx <= 104; dx += 8) { if (dx > -20 && dx < 20) continue; ctx.fillRect(X + dx, floorY - 72, 4, 2); }  // gapped worn hem
        for (const dir of [-1, 1]) { const fx = X + dir * 104; ctx.fillStyle = PAL.gold1; ctx.fillRect(fx - 4, floorY - 72, 8, 5); ctx.fillStyle = PAL.gold2; ctx.fillRect(fx - 4, floorY - 68, 3, 3); ctx.fillRect(fx + 1, floorY - 68, 3, 3); }

        // Flanking candelabra (two DIFFERENT designs) + faint crimson aura.
        ctx.save(); ctx.globalAlpha = 0.10; ctx.fillStyle = PAL.red2; ctx.fillRect(X - 90, floorY - 280, 180, 150); ctx.restore();
        this._candelabra(ctx, X - 168, floorY, 3);
        this._candelabra(ctx, X + 168, floorY, 2);
    }

    _swag(ctx, x, y, len, frayed) {
        ctx.fillStyle = PAL.red1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (len > 120 ? -6 : 6), y + len * 0.6, x + (len > 120 ? -2 : 2), y + len);
        ctx.lineTo(x + 8, y + len); ctx.quadraticCurveTo(x + 8, y + len * 0.5, x + 8, y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = PAL.gold2; ctx.fillRect(x - 2, y - 2, 10, 3);           // tieback
        ctx.fillStyle = PAL.red0; ctx.fillRect(x, y + len * 0.4, 3, 4);         // tear/fold
        if (frayed) { ctx.fillStyle = PAL.red0; ctx.fillRect(x, y + len - 4, 8, 4); ctx.fillRect(x + 2, y + len, 1, 4); }
    }

    _candelabra(ctx, x, floorY, arms) {
        // Stand.
        ctx.fillStyle = PAL.gold0; ctx.fillRect(x - 2, floorY - (arms === 3 ? 150 : 120), 4, (arms === 3 ? 150 : 120));
        ctx.fillStyle = PAL.gold1; ctx.fillRect(x - 1, floorY - (arms === 3 ? 150 : 120), 2, (arms === 3 ? 150 : 120));
        ctx.fillStyle = PAL.gold0; ctx.fillRect(x - 8, floorY - 4, 16, 4);      // foot
        const armY = floorY - (arms === 3 ? 150 : 120);
        // Arms + flames (one flame per candelabra runs low/guttering for variety).
        for (let i = 0; i < arms; i++) {
            const dx = (i - (arms - 1) / 2) * 14;
            ctx.fillStyle = PAL.gold1; ctx.fillRect(x + dx - 1, armY - 2, 2, 8);
            ctx.fillStyle = PAL.gold0; ctx.fillRect(x + Math.min(dx, 0), armY + 2, Math.abs(dx) + 1, 2);
            const gutter = (arms === 2 && i === 1);
            const f = (gutter ? 0.3 : 0.7) + 0.3 * Math.sin(this.time * 9 + x + i * 2);
            this._flame(ctx, x + dx, armY - 2, 6 * (gutter ? 0.5 : 1), 16 * (0.8 + 0.4 * f), f);
        }
    }

    // ---- 6. floor (night flagstone; clean combat lane) ---------------------

    _drawFloor(ctx, view) {
        const floorY = this.floorY;
        const bottom = view.bottom + 60, left = view.left - 120, right = view.right + 120, span = right - left;

        ctx.fillStyle = PAL.st1;
        ctx.fillRect(left, floorY, span, bottom - floorY);
        ctx.fillStyle = PAL.st4;                                  // the one sacred highlight line
        ctx.fillRect(left, floorY, span, 1);

        // Sparse flag joints in the TOP band only (keeps the combat lane clean).
        ctx.fillStyle = PAL.st0;
        for (let x = Math.floor(left / 132) * 132; x < right; x += 132) ctx.fillRect(x + (this._hash(x, 5) * 20 | 0), floorY + 2, 1, 6);
        ctx.fillStyle = 'rgba(20,18,25,0.5)'; ctx.fillRect(left, floorY + 10, span, 1);

        // Cool moonlight pools where windows cast down (faint; never floods the lane).
        ctx.save();
        ctx.globalAlpha = 0.05; ctx.fillStyle = PAL.ridgeRim;
        for (const op of this.openings) {
            if (op.x < view.left - 200 || op.x > view.right + 200) continue;
            ctx.fillRect(op.x - op.half * 0.6, floorY + 1, op.half * 1.2, 5);
        }
        ctx.restore();

        // Depth darkening toward the bottom (below the play area).
        const dk = ctx.createLinearGradient(0, floorY + 40, 0, bottom);
        dk.addColorStop(0, 'rgba(7,8,14,0)');
        dk.addColorStop(1, 'rgba(7,8,14,0.6)');
        ctx.fillStyle = dk;
        ctx.fillRect(left, floorY + 40, span, bottom - (floorY + 40));
    }

    // ---- 7. carpet runner (uniform red/gold, repeating diamond ornament) ---

    _drawCarpet(ctx, view) {
        const floorY = this.floorY;
        const left = view.left - 120, right = view.right + 120, span = right - left;
        const thick = 40, top = floorY + 1;

        ctx.fillStyle = PAL.red1; ctx.fillRect(left, top, span, thick);
        ctx.fillStyle = PAL.red0; ctx.fillRect(left, top, span, 2); ctx.fillRect(left, top + thick - 2, span, 2);
        ctx.fillStyle = PAL.gold0; ctx.fillRect(left, top + 4, span, 2); ctx.fillRect(left, top + thick - 6, span, 2);

        // Gold lozenges down the centre: the single approved repeating pattern,
        // evenly spaced, uniform bright gold, with no special-case segments.
        const midY = top + thick / 2;
        for (let x = Math.floor(left / 108) * 108; x < right; x += 108) {
            ctx.fillStyle = PAL.gold1;
            ctx.beginPath(); ctx.moveTo(x, midY - 6); ctx.lineTo(x + 6, midY); ctx.lineTo(x, midY + 6); ctx.lineTo(x - 6, midY); ctx.closePath(); ctx.fill();
        }
    }

    // ---- 8. light washes (cool moonlight + warm torch pools; translucent) --

    _drawLightWashes(ctx, view) {
        if (PerfMonitor.shouldSkip && PerfMonitor.shouldSkip('throneRoomShafts')) return;
        ctx.save();
        // Cool moon shafts angling down from windows (very faint).
        for (const op of this.openings) {
            if (op.x < view.left - 200 || op.x > view.right + 200) continue;
            const steps = [[0, 0.05], [24, 0.04], [54, 0.03]];
            for (const [dx, a] of steps) {
                ctx.globalAlpha = a; ctx.fillStyle = PAL.moon;
                const y = this.winSill, w = op.half * 1.3, hgt = this.floorY - this.winSill;
                ctx.beginPath();
                ctx.moveTo(op.x - w / 2 + dx, y); ctx.lineTo(op.x + w / 2 + dx, y);
                ctx.lineTo(op.x + w / 2 + dx + 26, y + hgt); ctx.lineTo(op.x - w / 2 + dx + 26, y + hgt);
                ctx.closePath(); ctx.fill();
            }
        }
        ctx.restore();
        // Grounding shadow just above the floor line (helps the fighters read).
        ctx.save();
        ctx.globalAlpha = 0.16; ctx.fillStyle = PAL.st0;
        ctx.fillRect(view.left - 120, this.floorY - 18, (view.right - view.left) + 240, 18);
        ctx.restore();
    }

    // ---- 9. torch light (additive) ----------------------------------------

    _drawTorchLight(ctx, view) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const t of this.torches) {
            if (t.x < view.left - 240 || t.x > view.right + 240) continue;
            const f = t.flicker, intensity = 0.4 + 0.4 * f, R = 118 * (0.85 + 0.3 * f);
            const halo = ctx.createRadialGradient(t.x, t.y, 6, t.x, t.y, R);
            halo.addColorStop(0, `rgba(255,196,120,${0.4 * intensity})`);
            halo.addColorStop(0.4, `rgba(255,140,60,${0.16 * intensity})`);
            halo.addColorStop(1, 'rgba(255,90,30,0)');
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(t.x, t.y, R, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    _drawTorchBodies(ctx, view) {
        for (const t of this.torches) {
            if (t.x < view.left - 80 || t.x > view.right + 80) continue;
            const f = t.flicker;
            ctx.fillStyle = '#141019'; ctx.fillRect(t.x - 4, t.y + 4, 8, 22);       // iron bracket
            ctx.fillStyle = '#0a0810';
            ctx.beginPath(); ctx.moveTo(t.x - 11, t.y + 24); ctx.lineTo(t.x + 11, t.y + 24); ctx.lineTo(t.x + 7, t.y + 34); ctx.lineTo(t.x - 7, t.y + 34); ctx.closePath(); ctx.fill();
            const sway = Math.sin(this.time * t.s1 + t.p1) * 3;
            this._flame(ctx, t.x + sway, t.y + 22, 13 * (0.85 + 0.3 * f), 30 * (0.8 + 0.5 * f), f);
        }
    }

    // Shared additive flame (outer + inner core), minimal shadowBlur.
    _flame(ctx, cx, baseY, w, h, f) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 18 * (0.7 + 0.6 * f); ctx.shadowColor = 'rgba(255,140,40,0.85)';
        const og = ctx.createRadialGradient(cx, baseY - h * 0.4, 2, cx, baseY - h * 0.4, w * 1.6);
        og.addColorStop(0, 'rgba(255,170,60,0.95)'); og.addColorStop(0.6, 'rgba(240,90,20,0.55)'); og.addColorStop(1, 'rgba(180,40,10,0)');
        ctx.fillStyle = og; this._flameShape(ctx, cx, baseY, w, h); ctx.fill();
        ctx.shadowBlur = 8;
        const ig = ctx.createRadialGradient(cx, baseY - h * 0.35, 1, cx, baseY - h * 0.35, w * 0.85);
        ig.addColorStop(0, 'rgba(255,248,200,0.95)'); ig.addColorStop(0.7, 'rgba(255,200,90,0.7)'); ig.addColorStop(1, 'rgba(255,150,50,0)');
        ctx.fillStyle = ig; this._flameShape(ctx, cx, baseY, w * 0.6, h * 0.7); ctx.fill();
        ctx.restore();
    }

    _flameShape(ctx, cx, baseY, w, h) {
        ctx.beginPath();
        ctx.moveTo(cx, baseY - h);
        ctx.quadraticCurveTo(cx + w, baseY - h * 0.45, cx + w * 0.5, baseY);
        ctx.quadraticCurveTo(cx, baseY + h * 0.12, cx - w * 0.5, baseY);
        ctx.quadraticCurveTo(cx - w, baseY - h * 0.45, cx, baseY - h);
        ctx.closePath();
    }

    // ---- 10. embers --------------------------------------------------------

    _deadEmber() { return { life: 0, maxLife: 0, x: 0, y: 0, vx: 0, vy: 0, size: 1 }; }

    _updateEmbers(dt) {
        this._spawnAccumulator += dt * 20;
        let toSpawn = Math.floor(this._spawnAccumulator);
        this._spawnAccumulator -= toSpawn;
        for (const e of this.embers) {
            if (e.life > 0) {
                e.life -= dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 6 * dt;
                e.vx += Math.sin((this.time + e.x) * 3) * 4 * dt;
            } else if (toSpawn > 0) { this._spawnEmber(e); toSpawn--; }
        }
    }

    _spawnEmber(e) {
        const visible = this.torches.filter((t) => t.x > this._view.left - 100 && t.x < this._view.right + 100);
        const pool = visible.length ? visible : this.torches;
        const t = pool[Math.floor(Math.random() * pool.length)];
        if (!t) { e.life = 0; return; }
        e.x = t.x + (Math.random() * 2 - 1) * 8; e.y = t.y + 18 + (Math.random() * 2 - 1) * 6;
        e.vx = (Math.random() * 2 - 1) * 10; e.vy = -(22 + Math.random() * 28);
        e.maxLife = 1.0 + Math.random() * 1.3; e.life = e.maxLife; e.size = 1 + Math.random() * 1.6;
    }

    _drawEmbers(ctx, view) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const e of this.embers) {
            if (e.life <= 0) continue;
            if (e.x < view.left - 40 || e.x > view.right + 40) continue;
            const k = e.life / e.maxLife, a = Math.sin(Math.PI * k) * 0.85;
            ctx.fillStyle = `rgba(255,${150 + Math.floor(70 * k)},70,${a})`;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.size * (0.6 + 0.6 * k), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    // ---- 11. vignette (night edges; keeps the combat centre readable) ------

    drawVignette(ctx, w, h) {
        const cx = w / 2, cy = h * 0.5;
        const inner = Math.min(w, h) * 0.26, outer = Math.hypot(w, h) * 0.62;
        const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.65, 'rgba(6,8,14,0.22)');
        g.addColorStop(1, 'rgba(4,5,10,0.6)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        const v = ctx.createLinearGradient(0, 0, 0, h);
        v.addColorStop(0, 'rgba(4,5,10,0.42)');
        v.addColorStop(0.22, 'rgba(0,0,0,0)');
        v.addColorStop(0.82, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(4,5,10,0.4)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, w, h);
    }

    // ---- util --------------------------------------------------------------

    _hash(x, y) {
        const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return n - Math.floor(n);
    }

    // Smooth value noise (continuous across the whole world; non-repeating).
    _noise(x, seed) {
        const xi = Math.floor(x), xf = x - xi;
        const a = this._hash(xi, seed), b = this._hash(xi + 1, seed);
        const u = xf * xf * (3 - 2 * xf);
        return a + (b - a) * u;
    }
}
