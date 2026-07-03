// src/environment/ThroneRoom.js
// ---------------------------------------------------------------------------
// Procedural Dark-Fantasy THRONE ROOM environment, drawn with the Canvas 2D API
// only (no external images). Replaces the flat sky + brown-rectangle world.
//
// What it renders, back-to-front:
//   1. Screen-space backdrop  : deep base wash + a slow-parallax gothic colonnade
//   2. Stone-brick back wall   : procedural running-bond bricks + regal pilasters
//   3. Flagstone floor         : procedural tiles, darkening with depth
//   4. Velvet carpet runner    : dark red, gold trim, damask diamonds, nap sheen
//   5. Torch light             : additive radial glow + a flattened pool on the floor
//   6. Torch bodies            : iron sconces + flickering teardrop flames (shadowBlur)
//   7. Embers                  : sparse rising sparks shed by the visible torches
//   8. Vignette                : radial + linear gradients that crush the edges black
//
// Coordinate model matches the game: (x, y) is WORLD space, the walking surface
// is at `floorY`, the world spans [0, worldWidth]. World-locked layers (2-7) are
// drawn under the SAME `camera.applyTransform(ctx)` the entities use, so they
// line up exactly with the gameplay floor. The backdrop (1) and vignette (8) are
// drawn in screen space. Assumes the camera applies a pure pan (no zoom).
//
// API:
//   new ThroneRoom({ worldWidth, floorY, torchSpacing, embers })
//   update(dt)                                  -> advances torch flicker + embers
//   render(ctx, camera, w, h, { skipVignette }) -> draws the scene (vignette last)
//   drawVignette(ctx, w, h)                     -> the vignette on its own (see notes)
// ---------------------------------------------------------------------------

import { PerfMonitor } from '../core/PerfMonitor.js';

export class ThroneRoom {
    constructor({ worldWidth = 4000, floorY = 600, torchSpacing = 480, embers = true } = {}) {
        this.worldWidth = worldWidth;
        this.floorY = floorY;
        this.enableEmbers = embers;

        this.time = 0;

        // --- Torches mounted along the back wall across the whole world ---
        this.torches = [];
        const torchY = floorY - 232;
        for (let x = torchSpacing * 0.5; x < worldWidth; x += torchSpacing) {
            this.torches.push({
                x,
                y: torchY,
                // Three sine layers (fast jitter / mid sway / slow breathe) with
                // random phases give each flame its own organic rhythm.
                p1: Math.random() * Math.PI * 2,
                p2: Math.random() * Math.PI * 2,
                p3: Math.random() * Math.PI * 2,
                s1: 10 + Math.random() * 4,
                s2: 4.5 + Math.random() * 2,
                s3: 1.7 + Math.random() * 1,
                flicker: 0.6, // 0..1 brightness, recomputed every update()
                gust: 0,      // decaying random walk for occasional flare-ups
            });
        }

        // --- Recycled ember pool, spawned near torches that are on-screen ---
        this.embers = [];
        if (this.enableEmbers) {
            for (let i = 0; i < 70; i++) this.embers.push(this._deadEmber());
        }
        this._spawnAccumulator = 0;

        // Last horizontal view bounds captured in render(), so update() only
        // spawns embers where the player can actually see them.
        this._view = { left: 0, right: worldWidth };
    }

    // ---- lifecycle ---------------------------------------------------------

    update(dt) {
        if (dt > 0.1) dt = 0.1; // clamp giant steps (tab refocus) so flicker stays smooth
        this.time += dt;

        for (const t of this.torches) {
            let f = 0.62
                + 0.20 * Math.sin(this.time * t.s1 + t.p1)
                + 0.12 * Math.sin(this.time * t.s2 + t.p2)
                + 0.08 * Math.sin(this.time * t.s3 + t.p3);
            // Occasional gust: a small decaying random walk layered on top.
            t.gust += (Math.random() * 2 - 1) * dt * 6;
            t.gust *= 0.92;
            f += t.gust * 0.12;
            t.flicker = f < 0 ? 0 : f > 1 ? 1 : f;
        }

        if (this.enableEmbers) this._updateEmbers(dt);
    }

    render(ctx, camera, canvasWidth, canvasHeight, opts = {}) {
        const w = canvasWidth;
        const h = canvasHeight;

        // Visible world rectangle (pure-pan camera).
        const view = {
            left: camera.x - w / 2,
            right: camera.x + w / 2,
            top: camera.y - h / 2,
            bottom: camera.y + h / 2,
        };
        this._view.left = view.left;
        this._view.right = view.right;

        // 1) Screen-space backdrop.
        PerfMonitor.start('render clear/background');
        this._drawBackdrop(ctx, camera, w, h);
        PerfMonitor.end('render clear/background');

        // 2-7) World-locked scene, under the same transform the entities use.
        PerfMonitor.start('throneRoom render');
        ctx.save();
        camera.applyTransform(ctx);
        this._drawWalls(ctx, view);
        this._drawFloor(ctx, view);
        this._drawCarpet(ctx, view);
        this._drawTorchLight(ctx, view);  // additive glow + floor pools (behind sconces)
        this._drawTorchBodies(ctx, view); // sconces + flames
        if (this.enableEmbers) this._drawEmbers(ctx, view);
        ctx.restore();
        PerfMonitor.end('throneRoom render');

        // 8) Atmosphere. Skip if the caller wants the vignette AFTER the entities
        //    (so the characters also fall into shadow at the screen edges).
        if (!opts.skipVignette) this.drawVignette(ctx, w, h);
    }

    // ---- screen-space backdrop --------------------------------------------

    _drawBackdrop(ctx, camera, w, h) {
        const base = ctx.createLinearGradient(0, 0, 0, h);
        base.addColorStop(0, '#070608');
        base.addColorStop(0.6, '#0b0910');
        base.addColorStop(1, '#110b0c');
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);

        // Far colonnade drifting at 0.4x parallax for a sense of depth behind the wall.
        const par = 0.4, spacing = 300, pillarW = 40;
        const top = h * 0.06, colH = h * 0.72;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        for (let x = -((camera.x * par) % spacing) - spacing; x < w + spacing; x += spacing) {
            ctx.fillRect(x, top, pillarW, colH);                 // shaft
            ctx.fillRect(x - 6, top, pillarW + 12, 12);          // capital
            ctx.fillRect(x - 6, top + colH - 12, pillarW + 12, 12); // base
        }
        ctx.restore();
    }

    // ---- world-locked: walls ----------------------------------------------

    _drawWalls(ctx, view) {
        const floorY = this.floorY;
        const top = view.top - 48;
        const left = view.left - 120;
        const right = view.right + 120;
        const span = right - left;

        // Base fill so mortar gaps read dark.
        ctx.fillStyle = '#161320';
        ctx.fillRect(left, top, span, floorY - top);

        // Running-bond brick courses, anchored to floorY (rows) and world X (cols)
        // so the pattern stays rock-steady while the camera scrolls.
        const bw = 86, bh = 40, m = 4;
        const rows = Math.ceil((floorY - top) / bh) + 1;
        for (let i = 0; i < rows; i++) {
            const y = floorY - (i + 1) * bh;
            const rowOffset = (i & 1) ? bw / 2 : 0;
            const x0 = Math.floor((left - rowOffset) / bw) * bw + rowOffset;
            for (let x = x0; x < right; x += bw) {
                const hsh = this._hash(Math.round(x / bw), i);
                const l = 26 + Math.floor(hsh * 14); // per-brick stone shade
                ctx.fillStyle = `rgb(${l + 8}, ${l + 4}, ${l + 14})`;
                ctx.fillRect(x + m / 2, y + m / 2, bw - m, bh - m);
                // Bevel: top highlight + bottom shadow for a bit of relief.
                ctx.fillStyle = 'rgba(255,255,255,0.04)';
                ctx.fillRect(x + m / 2, y + m / 2, bw - m, 2);
                ctx.fillStyle = 'rgba(0,0,0,0.28)';
                ctx.fillRect(x + m / 2, y + bh - m / 2 - 2, bw - m, 2);
                // A few darker, weathered bricks.
                if (hsh > 0.93) {
                    ctx.fillStyle = 'rgba(0,0,0,0.35)';
                    ctx.fillRect(x + m / 2, y + m / 2, bw - m, bh - m);
                }
            }
        }

        // Depth shade: wall darkens toward the top (ceiling) of the room.
        const dk = ctx.createLinearGradient(0, top, 0, floorY);
        dk.addColorStop(0, 'rgba(0,0,0,0.55)');
        dk.addColorStop(0.5, 'rgba(0,0,0,0.12)');
        dk.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = dk;
        ctx.fillRect(left, top, span, floorY - top);

        this._drawPilasters(ctx, view);

        // Baseboard band where the wall meets the floor.
        ctx.fillStyle = '#100d16';
        ctx.fillRect(left, floorY - 22, span, 22);
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(left, floorY - 22, span, 2);
    }

    _drawPilasters(ctx, view) {
        const floorY = this.floorY;
        const spacing = 600, width = 46;
        const top = Math.max(view.top - 20, floorY - 560);
        const x0 = Math.floor(view.left / spacing) * spacing;
        for (let x = x0; x < view.right + spacing; x += spacing) {
            // Column body shaded left-light / right-shadow to suggest a round-ish form.
            const g = ctx.createLinearGradient(x, 0, x + width, 0);
            g.addColorStop(0, 'rgba(60,54,72,0.9)');
            g.addColorStop(0.5, 'rgba(40,36,50,0.9)');
            g.addColorStop(1, 'rgba(20,18,26,0.95)');
            ctx.fillStyle = g;
            ctx.fillRect(x, top, width, floorY - top);
            // Capital + base.
            ctx.fillStyle = 'rgba(70,62,84,0.95)';
            ctx.fillRect(x - 8, top, width + 16, 16);
            ctx.fillRect(x - 8, floorY - 30, width + 16, 18);
            // Center groove.
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(x + width / 2 - 1, top + 16, 2, floorY - top - 46);
        }
    }

    // ---- world-locked: floor ----------------------------------------------

    _drawFloor(ctx, view) {
        const floorY = this.floorY;
        const bottom = view.bottom + 60;
        const left = view.left - 120;
        const right = view.right + 120;
        const span = right - left;

        ctx.fillStyle = '#0d0b12';
        ctx.fillRect(left, floorY, span, bottom - floorY);

        // Flagstones, anchored to world X and to floorY.
        const tile = 96, m = 5;
        const cx0 = Math.floor(left / tile) * tile;
        const rows = Math.ceil((bottom - floorY) / tile) + 1;
        for (let r = 0; r < rows; r++) {
            const y = floorY + r * tile;
            const rowOffset = (r & 1) ? tile / 2 : 0;
            for (let x = cx0 - rowOffset; x < right; x += tile) {
                const hsh = this._hash(Math.round(x / tile) + 99, r + 7);
                const l = 16 + Math.floor(hsh * 10);
                ctx.fillStyle = `rgb(${l + 4}, ${l + 2}, ${l + 8})`;
                ctx.fillRect(x + m / 2, y + m / 2, tile - m, tile - m);
                ctx.fillStyle = 'rgba(255,255,255,0.025)';
                ctx.fillRect(x + m / 2, y + m / 2, tile - m, 2);
            }
        }

        // Floor recedes into darkness toward the bottom of the screen.
        const dk = ctx.createLinearGradient(0, floorY, 0, bottom);
        dk.addColorStop(0, 'rgba(0,0,0,0)');
        dk.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = dk;
        ctx.fillRect(left, floorY, span, bottom - floorY);
    }

    // ---- world-locked: velvet carpet --------------------------------------

    _drawCarpet(ctx, view) {
        const floorY = this.floorY;
        const left = view.left - 120;
        const right = view.right + 120;
        const span = right - left;
        const thick = 64;        // visible band height of the runner
        const top = floorY;      // sits on the walking surface

        // Velvet body with a vertical sheen (lighter near the top edge).
        const g = ctx.createLinearGradient(0, top, 0, top + thick);
        g.addColorStop(0, '#7c1622');
        g.addColorStop(0.5, '#5a0f19');
        g.addColorStop(1, '#360810');
        ctx.fillStyle = g;
        ctx.fillRect(left, top, span, thick);

        // Nap texture: faint deterministic vertical streaks (won't crawl while scrolling).
        ctx.save();
        ctx.globalAlpha = 0.06;
        for (let x = Math.floor(left / 7) * 7; x < right; x += 7) {
            ctx.fillStyle = this._hash(Math.round(x / 7), 1234) > 0.5 ? '#ff5a4a' : '#000000';
            ctx.fillRect(x, top, 2, thick);
        }
        ctx.restore();

        // Gold trim near both edges.
        const trim = (yy) => {
            ctx.fillStyle = '#caa24a';
            ctx.fillRect(left, yy, span, 3);
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(left, yy + 3, span, 1);
        };
        trim(top + 7);
        trim(top + thick - 11);

        // Repeating damask diamonds down the center.
        ctx.save();
        ctx.strokeStyle = 'rgba(202,162,74,0.6)';
        ctx.lineWidth = 1.5;
        const midY = top + thick / 2;
        const step = 46, dh = (thick - 30) / 2;
        const dx0 = Math.floor(left / step) * step;
        for (let x = dx0; x < right; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, midY - dh);
            ctx.lineTo(x + step / 2, midY);
            ctx.lineTo(x, midY + dh);
            ctx.lineTo(x - step / 2, midY);
            ctx.closePath();
            ctx.stroke();
        }
        ctx.restore();

        // Soft contact shadow where the carpet meets the wall/air.
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(left, top, span, 2);
    }

    // ---- world-locked: torch light (additive) -----------------------------

    _drawTorchLight(ctx, view) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const t of this.torches) {
            if (t.x < view.left - 260 || t.x > view.right + 260) continue;
            const f = t.flicker;
            const intensity = 0.55 + 0.5 * f;

            // Wall halo (radius + alpha pulse with the flicker).
            const R = 150 * (0.85 + 0.3 * f);
            const halo = ctx.createRadialGradient(t.x, t.y, 6, t.x, t.y, R);
            halo.addColorStop(0, `rgba(255,196,110,${0.55 * intensity})`);
            halo.addColorStop(0.35, `rgba(255,120,40,${0.22 * intensity})`);
            halo.addColorStop(1, 'rgba(255,80,20,0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(t.x, t.y, R, 0, Math.PI * 2);
            ctx.fill();

            // Light pool cast onto the floor/carpet, flattened into an ellipse.
            const poolY = this.floorY + 8;
            const poolR = 150 * (0.9 + 0.25 * f);
            const pool = ctx.createRadialGradient(t.x, poolY, 8, t.x, poolY, poolR);
            pool.addColorStop(0, `rgba(255,150,60,${0.25 * intensity})`);
            pool.addColorStop(1, 'rgba(255,120,40,0)');
            ctx.save();
            ctx.translate(t.x, poolY);
            ctx.scale(1, 0.42);
            ctx.translate(-t.x, -poolY);
            ctx.fillStyle = pool;
            ctx.beginPath();
            ctx.arc(t.x, poolY, poolR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    // ---- world-locked: torch sconces + flames -----------------------------

    _drawTorchBodies(ctx, view) {
        for (const t of this.torches) {
            if (t.x < view.left - 80 || t.x > view.right + 80) continue;
            const f = t.flicker;

            // Iron sconce: stem + bowl.
            ctx.fillStyle = '#0e0c0a';
            ctx.fillRect(t.x - 5, t.y + 4, 10, 30);
            ctx.fillStyle = '#1b1712';
            ctx.beginPath();
            ctx.moveTo(t.x - 14, t.y + 30);
            ctx.lineTo(t.x + 14, t.y + 30);
            ctx.lineTo(t.x + 9, t.y + 42);
            ctx.lineTo(t.x - 9, t.y + 42);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,160,60,0.15)'; // rim catches the firelight
            ctx.fillRect(t.x - 14, t.y + 29, 28, 2);

            // Flame: additive, with bloom via shadowBlur. Size + sway flicker.
            const sway = Math.sin(this.time * t.s1 + t.p1) * 3;
            const baseY = t.y + 28;
            const flH = 34 * (0.8 + 0.5 * f);
            const flW = 15 * (0.85 + 0.3 * f);

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 26 * (0.7 + 0.6 * f);
            ctx.shadowColor = 'rgba(255,140,40,0.9)';

            // Outer flame.
            const og = ctx.createRadialGradient(t.x + sway, baseY - flH * 0.4, 2, t.x + sway, baseY - flH * 0.4, flW * 1.6);
            og.addColorStop(0, 'rgba(255,170,60,0.95)');
            og.addColorStop(0.6, 'rgba(240,90,20,0.6)');
            og.addColorStop(1, 'rgba(180,40,10,0)');
            ctx.fillStyle = og;
            this._flameShape(ctx, t.x + sway, baseY, flW, flH);
            ctx.fill();

            // Inner core.
            ctx.shadowBlur = 12;
            const ig = ctx.createRadialGradient(t.x + sway * 0.6, baseY - flH * 0.35, 1, t.x + sway * 0.6, baseY - flH * 0.35, flW * 0.9);
            ig.addColorStop(0, 'rgba(255,248,200,0.95)');
            ig.addColorStop(0.7, 'rgba(255,200,90,0.7)');
            ig.addColorStop(1, 'rgba(255,150,50,0)');
            ctx.fillStyle = ig;
            this._flameShape(ctx, t.x + sway * 0.6, baseY, flW * 0.6, flH * 0.7);
            ctx.fill();
            ctx.restore();
        }
    }

    // A teardrop flame: pointed tip up, rounded base.
    _flameShape(ctx, cx, baseY, w, h) {
        ctx.beginPath();
        ctx.moveTo(cx, baseY - h);
        ctx.quadraticCurveTo(cx + w, baseY - h * 0.45, cx + w * 0.5, baseY);
        ctx.quadraticCurveTo(cx, baseY + h * 0.12, cx - w * 0.5, baseY);
        ctx.quadraticCurveTo(cx - w, baseY - h * 0.45, cx, baseY - h);
        ctx.closePath();
    }

    // ---- embers ------------------------------------------------------------

    _deadEmber() {
        return { life: 0, maxLife: 0, x: 0, y: 0, vx: 0, vy: 0, size: 1 };
    }

    _updateEmbers(dt) {
        // Spawn budget for this frame (gentle steady stream from visible torches).
        this._spawnAccumulator += dt * 26;
        let toSpawn = Math.floor(this._spawnAccumulator);
        this._spawnAccumulator -= toSpawn;

        for (const e of this.embers) {
            if (e.life > 0) {
                e.life -= dt;
                e.x += e.vx * dt;
                e.y += e.vy * dt;
                e.vy += 6 * dt;                                   // gentle settle
                e.vx += Math.sin((this.time + e.x) * 3) * 4 * dt; // lateral drift
            } else if (toSpawn > 0) {
                this._spawnEmber(e);
                toSpawn--;
            }
        }
    }

    _spawnEmber(e) {
        const visible = this.torches.filter(
            (t) => t.x > this._view.left - 100 && t.x < this._view.right + 100,
        );
        const pool = visible.length ? visible : this.torches;
        const t = pool[Math.floor(Math.random() * pool.length)];
        if (!t) { e.life = 0; return; }
        e.x = t.x + (Math.random() * 2 - 1) * 10;
        e.y = t.y + 24 + (Math.random() * 2 - 1) * 6;
        e.vx = (Math.random() * 2 - 1) * 10;
        e.vy = -(24 + Math.random() * 30); // rise (canvas Y grows downward)
        e.maxLife = 1.1 + Math.random() * 1.4;
        e.life = e.maxLife;
        e.size = 1 + Math.random() * 1.8;
    }

    _drawEmbers(ctx, view) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const e of this.embers) {
            if (e.life <= 0) continue;
            if (e.x < view.left - 40 || e.x > view.right + 40) continue;
            const k = e.life / e.maxLife;          // 1 -> 0
            const a = Math.sin(Math.PI * k) * 0.9;  // fade in then out
            ctx.fillStyle = `rgba(255,${140 + Math.floor(80 * k)},60,${a})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * (0.6 + 0.6 * k), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // ---- atmosphere: vignette ---------------------------------------------

    drawVignette(ctx, w, h) {
        // Radial: clear near the center, crushing to near-black at the corners.
        const cx = w / 2, cy = h * 0.52;
        const inner = Math.min(w, h) * 0.16;
        const outer = Math.hypot(w, h) * 0.62;
        const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.55, 'rgba(2,1,0,0.28)');
        g.addColorStop(0.82, 'rgba(2,1,0,0.62)');
        g.addColorStop(1, 'rgba(0,0,0,0.94)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        // Press the ceiling + floor extremes darker for a boxed-in, torch-lit feel.
        const v = ctx.createLinearGradient(0, 0, 0, h);
        v.addColorStop(0, 'rgba(0,0,0,0.55)');
        v.addColorStop(0.22, 'rgba(0,0,0,0)');
        v.addColorStop(0.8, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, w, h);
    }

    // ---- util --------------------------------------------------------------

    // Cheap deterministic hash -> 0..1, used for stable per-brick / per-tile variation.
    _hash(x, y) {
        const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return n - Math.floor(n);
    }
}
