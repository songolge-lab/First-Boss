// src/entities/HeroDragonWrath.js
// ---------------------------------------------------------------------------
// STAGE 8C-5 — DRAGON WRATH + HERO COMBO B live-game integration.
//
// DRAGON WRATH is the Hero's sacred battle-trance (family: HERO LIGHT ECLIPSE) — a
// TEMPORARY empowered state, never a permanent buff. It owns one complete sequence:
//
//   ACTIVATION   present -> raise -> ignite -> build -> snap -> streaks -> flourish
//                -> WRATH IDLE                              (dragonWrathRise2,  31t)
//   SWING 1      THE CRASH — high back-carry, forward pitch, one huge overhead ->
//                low-front crescent, deep long crouch       (heroComboB2Swing1, 18t)
//   SWING 2      THE SWEEP / LUNGE — low drag past the hip, floor-skimming cleave
//                into the longest lunge, rise to vertical, settle onto the shoulder
//                                                            (heroComboB2Swing2, 18t)
//   CROWN CHARGE the shouldered carry; streamers build C1->C2->C3; the arena darkens
//                at C3                                       (wrathCharge2,      90t)
//   DRAGONFALL   white flash -> the giant Light Eclipse sword FORMS high, is REVEALED,
//                DESCENDS, CONTACTS the floor, PEAKS, then burns out base-up while the
//                Hero guards and settles out of the state    (wrathRelease2,     44t)
//
// COMBO B IS EXACTLY TWO SWINGS. There is no third. (The 8C-3 validator fails on any
// third swing group; the data module's injector refuses to emit one.)
//
// SOURCE OF TRUTH: the approved reference-faithful Stage 8C-1 "v2" package via the
// Stage 8C-3 shipping literals (tools/redesign/dragon_wrath_literal.txt +
// hero_combo_b_literal.txt), emitted verbatim into src/core/dragonWrathData.js by
// tools/redesign/dragon_wrath_integrate.js. The superseded v1 package is NOT used.
// Do NOT hand-edit the matrix data or the clock — regenerate.
//
// PACING (durable production rule, same as Combo A): Hero action visuals must not
// default to overly fast pacing. The approved master clock is authored AT 60fps, so
// this controller runs exactly ONE tick per game frame (no time scale). That makes
// the charge measure 90/60 = 1.500 s and the whole sequence 201/60 = 3.350 s, which
// IS the approved presentation. Do not compress it, and do not apply a global speed
// change — every other Hero attack keeps its own timing.
//
// Body clips are 60x40 (hero base at 15,16; feet row 39). Row count >= 20 routes them
// to HERO_REDESIGN_PALETTE at HERO_IDLE_PIXEL, the same proven Enemy.draw path the
// DAYBREAK and MERIDIAN clips already use. Every effect — radiant skin, contour aura,
// crown halo, radiance streamers, sword trails and the transformed WRATH BLADE itself —
// is BAKED INTO THE FRAMES. No runtime slash hook may fire during the swings or every
// swing shows two trails (the standing 8B-3 law).
//
// The two detached grids are PURE LIGHT and do NOT ride the sprite anchor:
//   wrathBurst2       the flash, at a world sky point above the impact column
//   lightGreatsword2  the giant sword, world-space, TIP row 80 pinned to floorY
//
// RENDER-ONLY LAW: the darken, the letterbox, the flash and the giant sword's own
// grid never carry a hitbox. The only damaging boxes DRAGON WRATH opens are the two
// empowered swings (the shared attackHitbox, existing convention) and ONE floor-impact
// box at the giant sword's peak — all three scoped local and reported in the handoff.
// ---------------------------------------------------------------------------

import { Hitbox } from '../core/Hitbox.js';
import { SpriteManager, HERO_REDESIGN_PALETTE, HERO_IDLE_PIXEL } from '../core/SpriteManager.js';
import { isLiteVfx, isPerfVfx } from '../core/PerfMonitor.js';
import { HERO_DRAGON_WRATH_SPRITES, DRAGON_WRATH_GRIDS, DRAGON_WRATH_CLOCK } from '../core/dragonWrathData.js';

export { HERO_DRAGON_WRATH_SPRITES };

const CLOCK = DRAGON_WRATH_CLOCK;

// === The 201-tick presentation schedule ====================================
// Built FROM the approved clock data (never retyped): each clip's frames are laid
// out in order at their approved holds, so the runtime schedule is provably the
// handoff schedule. TICK_MAP[t] = { clip, frame, tag, first }.
const CLIP_ORDER = [
    'dragonWrathRise2',
    'heroComboB2Swing1',
    'heroComboB2Swing2',
    'wrathCharge2',
    'wrathRelease2',
];
const TICK_MAP = (() => {
    const out = [];
    for (const clip of CLIP_ORDER) {
        CLOCK.frameOrder[clip].forEach((f, index) => {
            for (let k = 0; k < f.hold; k++) {
                out.push({ clip, frame: index, tag: f.tag, first: k === 0 });
            }
        });
    }
    return out;
})();
const TOTAL_TICKS = TICK_MAP.length; // 201

// === Dragon-Wrath-local gameplay values (scoped here; reported in the handoff) ===
// Both swings wield the transformed WRATH BLADE (reach 16 vs the steel blade's 11,
// i.e. 1.45x), so their reach/extent sit ABOVE the normal 4-hit chain's (reachOff
// 22..32, width 40..56) while damage stays inside the existing melee band. Nothing
// global is touched: these configure the SHARED attackHitbox for this sequence only,
// exactly as Combo A does, and scale off the Hero's own encounter attackDamage.
//
// Swing 1 arms on S1C CRASH (the ACTIVE held frame — its contact anchor is the
// low-front crescent + floor star). Swing 2 arms on S2B SWEEP and its window spans
// the S2C LUNGE extension, because the approved contact anchor for Swing 2 is "the
// S2B low sweep band + the lunge extension" — ONE strike across both frames, so the
// sequence still lands exactly two empowered melee hits.
const STRIKES = {
    'S1C CRASH': { reachOff: 34, width: 58, height: 56, dmgMult: 1.4, knockback: 14, active: 6 },
    'S2B SWEEP': { reachOff: 38, width: 66, height: 46, dmgMult: 1.4, knockback: 12, active: 10 },
};

// The DRAGONFALL floor impact — the giant sword's GS4 PEAK. A Dragon-Wrath-owned
// stationary Hitbox on the existing projectiles[] seam (surfaced by the Hero's own
// getActiveHitboxes, so main.js damages the Boss with it exactly like a light wave).
// kind !== 'wave' keeps drawWaveProjectiles from drawing it; this module paints the
// approved lightGreatsword2 grid instead. Extents envelop the impact halo at the
// floor (the blade is 82px wide on screen; the base detonation reads wider).
const FALL_IMPACT = {
    WIDTH: 110, HEIGHT: 120, DMG_MULT: 2.0, KNOCKBACK: 20, KIND: 'dragonWrathFall',
};

// Swing 2's lunge — the only locomotion the sequence adds. A short committed forward
// step across the SWEEP + LUNGE frames so the approved footwork/weight transfer reads
// in world space instead of sliding in place. velocityX, so main.js clampToWorld()
// is the in-bounds backstop exactly as for every other Hero move.
const LUNGE_PX = 46;
const LUNGE_TAGS = { 'S2B SWEEP': true, 'S2C LUNGE': true };
const LUNGE_TICKS = 10;                       // S2B(6) + S2C(4)
const LUNGE_PER_TICK = LUNGE_PX / LUNGE_TICKS;

// === World-space anchors (handoff §5) ======================================
const GS = CLOCK.world.greatsword;            // 41x88, cx 20, pommel 2, guard 12, TIP row 80
const BURST = CLOCK.world.burst;              // 41x41, centre (20,20)

// Where the sword falls. Committed ONCE at the charge release (C4 LOOSE) to the
// Hero's forward strike line, then arena-clamped — deterministic and dodgeable, never
// homing on the Boss. ~2 hero widths ahead: in front of where Swing 2's lunge ends.
const IMPACT_OFFSET_PX = 110;

// The descent. GS0 FORM / GS1 REVEAL hang the sword this far above its planted
// position; GS2 DESCENT travels the whole distance so the TIP meets floorY exactly on
// GS3 CONTACT. Quadratic ease-in — it accelerates, so it reads as a fall rather than
// a slide, and it is never simply "already at the floor".
const DESCENT_PX = 240;
// The flash's sky point, above the impact column where the sword manifests.
const FLASH_SKY_PX = 230;

// The approved giant-sword clock: t0 157, marks [157,163,169,177,181,191],
// holds [6,6,8,4,10,10], contact 177, peak 181, end 201.
const GS_CLOCK = CLOCK.greatsword;

// Resolve the giant-sword frame for a master tick from that clock.
function greatswordFrame(t) {
    const marks = GS_CLOCK.t;
    if (t < marks[0] || t >= GS_CLOCK.end) return -1;
    for (let i = marks.length - 1; i >= 0; i--) if (t >= marks[i]) return i;
    return -1;
}

// ---------------------------------------------------------------------------
// The controller. One instance per Enemy (host). All state is namespaced here so
// nothing leaks into Combo A or the original DAYBREAK combo. Cleanup is idempotent.
// ---------------------------------------------------------------------------
export class HeroDragonWrath {
    constructor(host) {
        this.host = host;
        this._reset();
    }

    _reset() {
        this.active = false;
        this.clock = 0;          // master tick, 1 per game frame (the approved 60fps clock)
        this._lastTick = -1;
        this.drawTick = 0;
        this.tag = null;
        this.frameName = CLIP_ORDER[0];
        this.frameIndex = 0;
        this.facingLock = 1;
        // captured anchors
        this.floorY = 0;
        this.impactX = 0;
        // per-run ownership / status
        this._impactArmed = false;
    }

    get isActive() { return this.active; }

    // True only while the transformed WRATH BLADE is the Hero's weapon: from the
    // ignition in the activation through to F2 SETTLE, where the gold drains and the
    // cold-blue steel blade returns. Exposed so nothing outside can mistake the
    // empowered form for a permanent buff.
    get isBladeTransformed() {
        if (!this.active) return false;
        return this.drawTick >= CLOCK.sections.rise.t0 + 6 && this.drawTick < TOTAL_TICKS;
    }

    // Begin the sequence. The Hero is grounded and in range (Enemy gates this).
    start() {
        const h = this.host;
        this._reset();
        this.active = true;
        this.facingLock = h.facing;
        this.floorY = h.y + h.halfHeight;    // grounded at activation -> exact floor surface
        this.impactX = h.x;                  // provisional; committed at C4 LOOSE
        h.velocityX = 0;
        // publish frame 0 (drawn on the transition frame, before the first update tick)
        const e = TICK_MAP[0];
        this.frameName = e.clip; this.frameIndex = e.frame; this.tag = e.tag;
        this.drawTick = 0;
    }

    // The Enemy delegates its per-frame AI/physics to this while in DRAGON_WRATH.
    // Exactly one master tick per call: the body frame, the world effects and the
    // screen treatment all key off the JUST-processed tick, so they cannot drift.
    update() {
        const t = Math.floor(this.clock);
        if (t >= TOTAL_TICKS) { this._complete(); return; }
        const h = this.host;
        h.facing = this.facingLock;          // the sequence commits its direction (baitable)

        this.drawTick = t;
        const e = TICK_MAP[t];
        this.frameName = e.clip; this.frameIndex = e.frame; this.tag = e.tag;

        const newTick = t !== this._lastTick;
        this._lastTick = t;
        if (newTick && e.first) this._enter(e.tag);
        this._continuous(e.tag);
        // The finisher's world events are driven off the master tick, not off a frame
        // tag, because the giant sword outlives the frame that spawned it.
        if (newTick) this._tickFinisher(t);

        this.clock += 1;
    }

    // Frame descriptor consumed by Enemy._animState (index-driven, like Combo A).
    animFrame() { return { name: this.frameName, hold: 1, index: this.frameIndex }; }

    // --- transitions on the first tick of a frame ---
    _enter(tag) {
        const h = this.host;
        if (STRIKES[tag]) { this._armStrike(STRIKES[tag]); return; }
        switch (tag) {
            case 'C0 PLANT':
                // The charge begins from EXACTLY the pose Swing 2 ended on (S2E SHOULDER
                // *is* the shouldered carry) — no invented transition. Just plant.
                h.velocityX = 0;
                this.floorY = h.y + h.halfHeight;   // grounded — refresh the floor line
                break;
            case 'C4 LOOSE':
                // Release. Commit the impact column ONCE, arena-clamped, so the whole
                // finisher (flash sky point, sword descent, floor impact) shares one anchor.
                this.impactX = this._clampX(h.x + this.facingLock * IMPACT_OFFSET_PX);
                break;
            default: break;
        }
    }

    // --- continuous behaviour while a frame is held ---
    _continuous(tag) {
        const h = this.host;
        if (LUNGE_TAGS[tag]) {
            h.velocityX = this.facingLock * LUNGE_PER_TICK;   // the committed forward lunge
        } else {
            h.velocityX = 0;                                   // planted for every other beat
        }
    }

    // --- the finisher's world events, on the approved master clock ---
    _tickFinisher(t) {
        // The floor impact opens on GS4 PEAK and lives exactly that frame's hold.
        if (t === GS_CLOCK.peak && !this._impactArmed) this._spawnFallImpact();
    }

    // --- the shared attackHitbox, configured per empowered swing (existing convention) ---
    _armStrike(cfg) {
        const h = this.host;
        h.attackHitbox.configure({
            reach: h.radius + cfg.reachOff,
            width: cfg.width,
            height: cfg.height,
            duration: cfg.active,
            damage: Math.max(1, Math.round(h.attackDamage * cfg.dmgMult)),
            knockback: cfg.knockback,
            velocityX: 0,
            velocityY: 0,
        });
        h.attackHitbox.kind = null;
        h.attackHitbox.trigger(true);
        h.attackHitbox.reposition(h.x, h.y, this.facingLock);
    }

    // --- the DRAGONFALL floor impact (world-anchored, stationary) ---
    _spawnFallImpact() {
        if (this._impactArmed) return;      // one impact per activation
        this._impactArmed = true;
        const h = this.host;
        const hold = GS_CLOCK.holds[4];     // GS4 PEAK's approved hold
        const hb = new Hitbox({
            reach: 0,
            width: FALL_IMPACT.WIDTH,
            height: FALL_IMPACT.HEIGHT,
            duration: hold,
            cooldown: 0,
            damage: Math.max(1, Math.round(h.attackDamage * FALL_IMPACT.DMG_MULT)),
            knockback: FALL_IMPACT.KNOCKBACK,
            velocityX: 0,
            velocityY: 0,
            kind: FALL_IMPACT.KIND,
        });
        hb.x = this.impactX;
        hb.y = this.floorY - FALL_IMPACT.HEIGHT / 2;   // seated on the floor line
        hb.trigger(true);
        h.projectiles.push(hb);
    }

    // ---------------------------------------------------------------------
    // SCREEN TREATMENT (layer 1 + layer 5). Render-only, owned here, consumed by
    // main.js draw(). Returns null whenever nothing is on screen, so a replaced /
    // dead / reset Enemy can never leave a stale overlay behind — there is no
    // separate flag for main.js to forget to clear.
    //
    //   dim       0..1 environment value dip (arena only; the Hero, the blade, the
    //             streamers, the flash and the giant sword are NOT dimmed)
    //   letterbox 0..1 cinematic bar extension (from the bigsword reference frame)
    //   flash     0..1 the strong white/white-gold beat — strictly <= flashLen ticks
    // ---------------------------------------------------------------------
    get screenFx() {
        if (!this.active) return null;
        const t = this.drawTick;

        // Darken: starts at C3 PEAK entry, ramps over that hold, lifts across GS5 FADE.
        let dim = 0;
        if (t >= CLOCK.darkenStart) {
            const rampIn = CLOCK.frameOrder.wrathCharge2[3].hold;             // the C3 PEAK hold
            const rampOut = TOTAL_TICKS - CLOCK.darkenLift;                   // the GS5 FADE tail
            // +1 so the dip is already visible ON its approved start tick (117) and
            // reaches full exactly as the C3 PEAK hold ends — never a dead first frame.
            if (t < CLOCK.darkenLift) dim = Math.min(1, (t - CLOCK.darkenStart + 1) / rampIn);
            else dim = Math.max(0, 1 - (t - CLOCK.darkenLift) / rampOut);     // restored by TOTAL_TICKS
        }

        // Flash: immediate onset, brief, and it ALWAYS clears (WB2 is a hollow core).
        let flash = 0;
        const fT = t - CLOCK.flashStart;
        if (fT >= 0 && fT < CLOCK.flashLen) {
            // Exactly flashFull ticks at full whiteout, then a strictly decreasing tail
            // that is still > 0 on the last tick and gone on the next — so the beat is
            // as strong and as SHORT as the contract says, and it always clears.
            flash = fT < CLOCK.flashFull
                ? 1                                                            // the whiteout beat
                : (CLOCK.flashLen - fT) / (CLOCK.flashLen - CLOCK.flashFull + 1);
        }

        if (dim <= 0 && flash <= 0) return null;
        // performance tier sheds the cinematic bars (secondary chrome); the value dip,
        // the flash and the whole giant-sword event are preserved at every tier.
        return { dim, letterbox: isPerfVfx() ? 0 : dim, flash: flash * (isLiteVfx() ? 0.85 : 1) };
    }

    // ---------------------------------------------------------------------
    // World-space effects (pure LIGHT grids), painted at the world seam in FRONT of
    // the Hero (layering contract layers 5-6). Frames derive from the master tick, so
    // they can never desync from the body.
    // ---------------------------------------------------------------------
    drawWorldEffects(ctx) {
        if (!this.active) return;
        const t = this.drawTick;

        // Layer 5 — the flash, at the sky point above the impact column. It appears
        // BEFORE the sword (154 vs 157) and the sword forms behind/through it. lite and
        // performance shed this secondary sparkle layer; main.js's screen beat still
        // delivers the flash itself, so the event never disappears.
        const fT = t - CLOCK.flashStart;
        if (fT >= 0 && fT < CLOCK.flashLen && !isLiteVfx()) {
            const bf = Math.min(2, Math.floor(fT / (CLOCK.flashLen / 3)));   // WB0 -> WB1 -> WB2
            this._paint(ctx, DRAGON_WRATH_GRIDS.wrathBurst2[bf], BURST.cx, BURST.cy,
                this.impactX, this.floorY - FLASH_SKY_PX, false);            // h-symmetric
        }

        // Layer 6 — the giant Light Eclipse sword. World-space, vertical, its TIP row
        // pinned to the floor line at contact. Preserved at EVERY quality tier: it is
        // the central visual event and is never swapped for a glow or a beam.
        const gf = greatswordFrame(t);
        if (gf >= 0) {
            this._paint(ctx, DRAGON_WRATH_GRIDS.lightGreatsword2[gf], GS.cx, GS.tipRow,
                this.impactX, this.floorY + this._descentOffset(t), false);  // h-symmetric
        }
    }

    // The vertical fall. Hangs high through FORM + REVEAL, then travels the whole
    // distance across DESCENT with a quadratic ease-in (accelerating, like a fall),
    // reaching 0 exactly on CONTACT and staying planted for PEAK and FADE.
    _descentOffset(t) {
        const start = GS_CLOCK.t[2];                 // GS2 DESCENT
        const end = GS_CLOCK.contact;                // GS3 CONTACT — the TIP meets the floor
        if (t >= end) return 0;
        if (t <= start) return -DESCENT_PX;
        const p = (t - start) / (end - start);       // 0..1
        return -DESCENT_PX * (1 - p * p);
    }

    // Paint a pure-LIGHT grid so its (cx,cy) cell lands on (worldCX,worldCY), at the
    // hero 2px grid. Same helper shape Combo A uses for its detached grids.
    _paint(ctx, matrix, cx, cy, worldCX, worldCY, flip) {
        if (!matrix || !matrix.length) return;
        const PX = HERO_IDLE_PIXEL;
        const cols = matrix[0].length;
        const effCx = flip ? (cols - 1 - cx) : cx;
        const ox = Math.round(worldCX - effCx * PX);
        const oy = Math.round(worldCY - cy * PX);
        SpriteManager.drawMatrix(ctx, matrix, ox, oy, PX, { palette: HERO_REDESIGN_PALETTE, flip });
    }

    // Arena clamp for the impact column. The giant sword is a render-only world effect
    // with no clampToWorld backstop, so the committed anchor is kept in-bounds.
    _clampX(x) {
        const h = this.host;
        const margin = (GS.w / 2) * HERO_IDLE_PIXEL;      // half the sword's on-screen width
        const max = (h.worldWidth || Infinity) - margin;
        return Math.max(margin, Math.min(max, x));
    }

    // ---------------------------------------------------------------------
    // Lifecycle end. cleanup() is idempotent: safe to call repeatedly / after an
    // interrupt / on Hero death / on Boss defeat / on encounter reset without
    // creating new errors, duplicate effects or stale presentation.
    // ---------------------------------------------------------------------
    _complete() {
        const h = this.host;
        this.cleanup();                     // active -> false; Enemy sees this and exits
        h._dragonWrathCooldown = DRAGON_WRATH_COOLDOWN;
        h._repositionAfterAttack = true;    // peel away, like every other attack
    }

    cleanup() {
        const h = this.host;
        // Despawn the world-space impact box (the giant sword + burst are pure render
        // and die with `active` below, but this one is a real Hitbox).
        if (h.projectiles && h.projectiles.length) {
            h.projectiles = h.projectiles.filter((p) => p.kind !== FALL_IMPACT.KIND);
        }
        // Close any empowered-swing window this sequence opened.
        if (h.attackHitbox) h.attackHitbox.activeTimer = 0;
        // Dropping `active` tears down, in one place: the transformed WRATH BLADE (the
        // body clips stop being selected, so the cold-blue steel blade returns with the
        // normal clips), the body radiance / crown halo / streamers (baked into those
        // frames), the combo phase, the charge, the arena darkening and the letterbox
        // (screenFx now returns null), the white flash, the giant sword and its descent
        // state. No movement or action lock survives: the Enemy returns to WALKING.
        this.active = false;
        this._impactArmed = false;
        this.clock = 0;
        this._lastTick = -1;
        this.drawTick = 0;
        this.tag = null;
        h.velocityX = 0;
    }
}

// Selection tuning — the gate after one runs. Deliberately longer-cooled than
// Combo A (300): this is a 3.35 s cinematic finisher. Retained as a backstop even
// though the once-per-life rule below is now the binding constraint; no other
// selection weight is changed.
export const DRAGON_WRATH_COOLDOWN = 900;         // ~15s @60fps before it can be picked again

// STAGE 8C-5 FOLLOW-UP — ONCE-PER-HERO-LIFE availability.
//
// DRAGON WRATH is no longer rolled per melee-start (the old 0.14 chance is gone).
// Each Hero LIFE — spawn/respawn -> fight -> death — grants EXACTLY ONE use, and
// the randomness moved from "will it fire?" to "WHEN does it become eligible?".
// On every (re)spawn the Enemy rolls one eligibility delay in this window; once it
// elapses, Dragon Wrath is queued for the next SAFE melee-start opportunity and is
// then permanently spent for that life (interruption never refunds it).
//
// Window rationale, against the current melee cadence (~60 fps):
//   * MIN 480 (8 s) — the Hero spawns at the far-left edge and has to close the
//     arena before it can start any melee at all. 8 s clears the approach plus
//     roughly two-to-three normal melee engagements (the DAYBREAK chain and Combo A
//     both recycle on a ~300-frame / 5 s cooldown), so the fight is always
//     established before the finisher can appear — never a spawn-time opener.
//   * MAX 1500 (25 s) — still inside a plausible mid-length life, so the single use
//     is usually reachable rather than routinely wasted.
// The 17 s spread means no two lives share a timestamp, and the old 900-frame (15 s)
// cooldown sits mid-window, so the felt cadence stays near what was approved.
// Local and tunable; touches nothing but Dragon Wrath's own availability.
export const DRAGON_WRATH_LIFE_DELAY_MIN = 480;   // ~8s  @60fps — earliest eligibility in a life
export const DRAGON_WRATH_LIFE_DELAY_MAX = 1500;  // ~25s @60fps — latest eligibility in a life

/**
 * Roll one life's Dragon Wrath eligibility delay, in frames.
 * Called once per Hero spawn/respawn; the value is life-local and never carried over.
 * @returns {number} frames until Dragon Wrath may be queued this life.
 */
export function rollDragonWrathLifeDelay() {
    const span = DRAGON_WRATH_LIFE_DELAY_MAX - DRAGON_WRATH_LIFE_DELAY_MIN;
    return DRAGON_WRATH_LIFE_DELAY_MIN + Math.floor(Math.random() * (span + 1));
}
