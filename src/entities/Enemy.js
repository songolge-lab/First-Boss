// src/entities/Enemy.js
// ---------------------------------------------------------------------------
// The Hero (AI enemy). Pursues the Boss horizontally along the ground. Stats
// (hp / move_speed / attack_damage) and the ability list are INJECTED at spawn
// from the Hero Progression Matrix, so encounter 5's spawn automatically arrives
// dash-capable with no special-casing here.
//
// ===========================================================================
//  AAA COMBAT OVERHAUL — the Hero now fights like a skilled action protagonist.
//  Five new pillars layered on top of the original hit-and-run spacing AI:
//
//    1. FOUR-HIT MELEE COMBO (Hades style). A forward-stepping sword chain:
//       three quick slashes that lunge into the Boss + a heavier finisher with
//       big knockback. Drives the SHARED `this.attackHitbox`, reshaped per hit,
//       so main.js's existing Hero->Boss damage check keeps working unchanged.
//
//    2. THREE-STAGE LIGHT-WAVE MAGIC. A ranged "combo": the Hero plants and
//       emits three free-moving projectiles in sequence, each TAGGED with
//       `waveType` (1 = diagonal, 2 = vertical, 3 = X-shape). They live in
//       `this.projectiles` and are surfaced via getActiveHitboxes().
//
//    3. PARRY STANCE (yellow aura). The Hero RANDOMLY braces. If the Boss
//       connects while braced, the hit is NULLIFIED (no HP lost) and a MASSIVE
//       circular counter-attack hitbox erupts around the Hero.
//
//    4. JUMP & POGO (Hollow Knight style). Jumping AI + an aerial DOWN-strike.
//       If the down-strike connects with the Boss, the Hero BOUNCES up and can
//       chain another dive — true pogo, detected against the Boss AABB.
//
//    5. FEAR STUN. `triggerFear()` makes the Hero crumple to the ground, stunned
//       and helpless for ~0.5s, when struck by the Boss's Fear Strike.
//
//  Project conventions are preserved throughout:
//    * Frame-based timing (~60fps): every duration / cooldown is in FRAMES.
//    * (this.x, this.y) is the CENTER of the entity (not top-left).
//    * Physics is per-frame: velocities are added once per frame.
//    * update() takes an OPTIONAL 3rd arg with the Boss's AABB for exact spacing,
//      dash-cancel AND pogo detection. main.js currently calls
//      `enemy.update(player.x, player.y)`; without bounds a massive-boss estimate
//      is used so everything (including the pogo) still works.
//
//  INTEGRATION NOTES (this is STEP 1 of a multi-file overhaul):
//    * Hero->Boss damage in main.js still reads `enemy.attackHitbox`. The combo,
//      the parry counter and the pogo down-strike all ride that shared hitbox,
//      so they damage the Boss IMMEDIATELY with the current main.js.
//    * The 3 wave projectiles (and any future AoE) are exposed via the new
//      `enemy.getActiveHitboxes()` — mirroring `player.getActiveHitboxes()`. They
//      will deal damage once main.js iterates that list for the Hero (the planned
//      symmetrical change the Boss side already uses). Until then they fly +
//      render but don't subtract Boss HP.
//    * New animation states reference clips ('cast', 'parry', 'air_attack',
//      'hurt', ...) the Hero sheet doesn't have YET. _clip() falls back to an
//      existing clip so the Hero never disappears; once SpriteManager gains those
//      clips (a later step) they light up automatically.
// ---------------------------------------------------------------------------

import { Hitbox } from '../core/Hitbox.js';
import { SpriteManager, SpriteAnimator, HERO_SPRITES, HERO_PIXEL } from '../core/SpriteManager.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const MoveState = Object.freeze({
    WALKING: 'WALKING',
    DASH_WINDUP: 'DASH_WINDUP', // brief telegraph so the dash is reactable / fair
    DASHING: 'DASHING',
    ATTACK_WINDUP: 'ATTACK_WINDUP', // telegraph before each combo hit
    ATTACKING: 'ATTACKING',         // a combo hit's active window (+ its link/recovery)
    CASTING: 'CASTING',             // planted, emitting the 3-stage light-wave magic
    PARRY_STANCE: 'PARRY_STANCE',   // braced defensive stance (yellow aura)
    PARRY_COUNTER: 'PARRY_COUNTER', // the circular counter-burst is live
    JUMPING: 'JUMPING',             // airborne, air-control + deciding whether to dive
    AIR_ATTACK: 'AIR_ATTACK',       // airborne DOWN-strike (the pogo strike)
    FEAR: 'FEAR',                   // crumpled on the ground, stunned by a Fear Strike
});

// ---------------------------------------------------------------------------
// Feature gating. Advanced mechanics are unlocked by ability flags from the
// progression matrix, but DEFAULT-ON so the overhaul is fully alive out of the
// box. Flip a *_DEFAULT to false to gate that pillar purely behind matrix
// `active_mechanics` (e.g. only let late encounters cast magic).
// ---------------------------------------------------------------------------
const FEATURES = Object.freeze({
    WAVES_DEFAULT: true, // light-wave magic available even without an explicit ability
    PARRY_DEFAULT: true, // parry stance available by default
    JUMP_DEFAULT: true,  // jump + pogo available by default
});

// Dash tuning. Frame-based (~60fps). COOLDOWN ~ the dash_roll 4s cooldown;
// WINDUP/DURATION are the telegraph and the high-speed burst.
const DASH = Object.freeze({
    MULTIPLIER: 6.0,
    DURATION_FRAMES: 10,
    WINDUP_FRAMES: 8,
    MIN_RANGE_PX: 180,
    COOLDOWN_FRAMES: 240,
    REPOSITION_FRAMES: 8,
});

// Base shape for the Hero's melee hitbox. The 4-hit combo reshapes THIS hitbox
// per swing; the parry counter and the pogo strike also borrow it. Reach is
// purposely shorter than the Boss's sword.
const ATTACK = Object.freeze({
    GAP_PX: 34,          // legacy single-strike trigger (combo uses COMBO.GAP_PX)
    REACH_PX: 24,        // hitbox center offset BEYOND the Hero's radius
    WIDTH: 42,
    HEIGHT: 48,
    DURATION_FRAMES: 3,
    COOLDOWN_FRAMES: 27,
    KNOCKBACK: 10,
});

// Dodge tuning. REUSES the dash burst (gated by dash_roll + the shared cooldown),
// skips the wind-up and grants invulnerability frames.
const DODGE = Object.freeze({
    THREAT_RANGE_PX: 130,
    IFRAMES: 16,
});

// Spacing tuning — EDGE-TO-EDGE gaps between the Hero's body and the Boss's body
// (correct against an arbitrarily massive Boss). Invariant: MIN_GAP < GAP_PX < HOVER_GAP.
const SPACING = Object.freeze({
    MIN_GAP: 16,
    HOVER_GAP: 44,
    DASH_STOP_GAP: 34,
    DASH_CANCEL_SKIN: 6,
    RETREAT_SPEED_MULT: 1.0,
    BOSS_HALFWIDTH_FALLBACK: 60,
    BOSS_HALFHEIGHT_FALLBACK: 90,
});

// ---------------------------------------------------------------------------
// 1. FOUR-HIT MELEE COMBO. Per-hit table tunes telegraph, active window, link
//    (recovery) gap, hitbox shape, damage multiplier, knockback and lunge speed.
//    Hits 0-2 are quick; hit 3 is the finisher (bigger, slower, heavy knockback).
// ---------------------------------------------------------------------------
const COMBO = Object.freeze({
    GAP_PX: 42,          // edge gap at which the chain may START (it steps in to close)
    COOLDOWN: 36,        // frames after a full chain before melee is ready again
    MIN_STEP_GAP: 4,     // a forward lunge never closes past this edge gap (no body-grind)
    HITS: [
        { windup: 5, active: 4, link: 7,  reachOff: 22, width: 40, height: 46, dmgMult: 0.8, knockback: 6,  step: 3.2 },
        { windup: 3, active: 4, link: 7,  reachOff: 24, width: 42, height: 46, dmgMult: 0.8, knockback: 6,  step: 3.4 },
        { windup: 3, active: 4, link: 8,  reachOff: 26, width: 44, height: 48, dmgMult: 0.9, knockback: 7,  step: 3.6 },
        { windup: 6, active: 6, link: 10, reachOff: 32, width: 56, height: 54, dmgMult: 1.5, knockback: 16, step: 5.0 }, // finisher
    ],
});

// ---------------------------------------------------------------------------
// 2. THREE-STAGE LIGHT-WAVE MAGIC. Planted cast; three projectiles emitted in
//    sequence. Each TYPES[] entry is tagged via waveType on the spawned Hitbox.
// ---------------------------------------------------------------------------
const WAVE = Object.freeze({
    MIN_RANGE: 120,      // only cast when the Boss is at least this far (center dist)
    MAX_RANGE: 1000,     // ...and within this
    CHANCE: 0.020,       // per eligible WALKING frame
    WINDUP: 8,           // plant/telegraph before the first wave
    GAP: 7,              // frames between successive waves
    RECOVER: 12,         // recovery after the third wave
    COOLDOWN: 110,       // frames before the Hero can cast again
    LIFETIME: 80,        // projectile active frames
    TYPES: [
        // Hitbox width/height now ENVELOP the massive procedural Holy Light Wave
        // (SpriteManager.drawLightWave): its crescent blade arcs at radius ~70px
        // from the projectile centre, so the bright slash spans ~200-215px. Sizes
        // below were measured off the actual render (bright-blade bbox + small
        // margin) so collision matches the visual. Speed / vy / dmgMult / knockback
        // are UNCHANGED — only the hit extents grew.
        // waveType 1 — diagonal: travels forward AND drifts down (a falling slash)
        { width: 210, height: 210, speed: 7.0, vy: 1.4, dmgMult: 0.6, knockback: 4 },
        // waveType 2 — vertical: an upright crescent sweeping forward
        { width: 218, height: 214, speed: 6.2, vy: 0.0, dmgMult: 0.7, knockback: 5 },
        // waveType 3 — X-shape: a big, fast crossing burst (the ranged finisher)
        { width: 220, height: 212, speed: 8.2, vy: 0.0, dmgMult: 1.0, knockback: 8 },
    ],
});

// ---------------------------------------------------------------------------
// 3. PARRY STANCE + circular counter.
// ---------------------------------------------------------------------------
const PARRY = Object.freeze({
    STANCE_FRAMES: 48,   // ~0.8s braced before the stance lapses unused
    COOLDOWN: 150,       // ~2.5s before the Hero will brace again
    CHANCE: 0.012,       // per eligible WALKING frame (randomly enters the stance)
});
const COUNTER = Object.freeze({
    ACTIVE: 10,          // active frames of the circular burst
    WIDTH: 150,          // "massive circular" burst (square AABB approximation)
    HEIGHT: 150,
    DMG_MULT: 1.8,
    KNOCKBACK: 18,
    IFRAMES: 14,         // invulnerable through the counter
    FEAR_IMMUNE: 16,     // a parried Fear Strike does NOT stun (see triggerFear)
});

// ---------------------------------------------------------------------------
// 4. JUMP & POGO.
// ---------------------------------------------------------------------------
const JUMP = Object.freeze({
    STRENGTH: 14,        // initial upward velocity (vs gravity 0.9)
    HORIZ: 3.0,          // initial horizontal nudge toward the Boss
    COOLDOWN: 70,        // frames between jumps
    SETUP_MIN: 70,       // jump-to-dive band: only hop toward the Boss within...
    SETUP_MAX: 460,      // ...this center-distance band
    SETUP_CHANCE: 0.020, // per eligible frame inside the band
    APPROACH_CHANCE: 0.010, // long-range "approach hop"
});
const AIR = Object.freeze({
    CONTROL: 0.55,       // per-frame horizontal air acceleration toward the Boss
    MAX_VX_MULT: 1.6,    // air horizontal speed cap = maxSpeed * this
});
const POGO = Object.freeze({
    HORIZ_RANGE: 60,     // start the dive once within this horizontal distance of the Boss
    REACH_DOWN: 26,      // down-strike hitbox center offset BELOW the Hero center
    WIDTH: 44,
    HEIGHT: 34,
    ACTIVE: 8,           // active frames of one dive window
    DMG_MULT: 0.9,
    BOUNCE: 12,          // upward velocity granted on a successful pogo
    ARM_COOLDOWN: 12,    // gate before a new dive window can arm
    RECHAIN: 6,          // shorter gate right after a successful bounce (fast re-dive)
});

// ---------------------------------------------------------------------------
// 5. FEAR STUN.
// ---------------------------------------------------------------------------
const FEAR = Object.freeze({
    // TWO INDEPENDENT clocks. The knockdown STUN is a short, jarring interrupt;
    // the DEBUFF is the long tail. The stun lives ENTIRELY inside the debuff
    // window (30 of the 240 frames), so the Hero spends ~0.5s on the floor and
    // the remaining ~3.5s back on its feet but still "afraid" (+30% dmg, dark aura).
    STUN_FRAMES: 30,         // 0.5s @60fps: crumpled & helpless on the ground (this ONLY)
    DEBUFF_FRAMES: 240,      // 4s   @60fps: +30% dmg taken + the Boss's dark-aura trigger
    DAMAGE_TAKEN_MULT: 1.3,  // +30% incoming damage to the Hero while the DEBUFF is up
    FRICTION: 0.8,           // horizontal velocity bleed during the knockdown
    NUDGE: 3,                // small backward stagger on the triggering frame
    HOP: 2,                  // tiny upward stagger so the crumple reads, then gravity drops it
});

export class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 30;
        this.radius = this.size / 2;
        this.color = '#33ccff';

        // --- Encounter-driven stats (set via applyStats from the progression matrix) ---
        this.maxHp = 50;
        this.hp = this.maxHp;
        this.maxSpeed = 3.5;
        this.attackDamage = 8;

        // Abilities unlocked for this encounter. Injected at spawn.
        this.abilities = new Set();

        // Derived ability gates (resolved in applyStats). A bare Enemy is inert
        // until applyStats configures it (spawnEnemy always calls applyStats).
        this.canMelee = false;
        this.canDashRoll = false;
        this.canCastWaves = false;
        this.canParry = false;
        this.canJumpPogo = false;

        // Collision half-extents (AABB world resolution in main.js + spacing math).
        this.halfWidth = this.size / 2;
        this.halfHeight = this.size / 2;

        // --- Velocity & platformer physics ---
        this.velocityX = 0;
        this.velocityY = 0;
        this.gravity = 0.9;
        this.isGrounded = false;
        this.facing = 1;

        // --- Movement FSM ---
        this.moveState = MoveState.WALKING;
        this.dashCooldown = 0;
        this._dashTimer = 0;
        this._dashDir = 1;
        this._dashIsDodge = false;

        // --- Weapon: shared directional hitbox (combo / counter / pogo all use it) ---
        this.attackHitbox = new Hitbox({
            reach: this.radius + ATTACK.REACH_PX,
            width: ATTACK.WIDTH,
            height: ATTACK.HEIGHT,
            duration: ATTACK.DURATION_FRAMES,
            cooldown: ATTACK.COOLDOWN_FRAMES,
            damage: this.attackDamage,
            knockback: ATTACK.KNOCKBACK,
        });
        this._attackWindup = 0;               // (kept for back-compat; combo uses _comboPhaseTimer)
        this._repositionAfterAttack = false;  // peel away after a strike completes

        // --- 1. Combo bookkeeping ---
        this._comboIndex = 0;                 // 0..3 (which hit of the chain)
        this._comboPhase = 'windup';          // 'windup' | 'active' | 'link'
        this._comboPhaseTimer = 0;
        this._comboStep = 0;                  // lunge speed for the current active window
        this._comboCooldown = 0;

        // --- 2. Light-wave magic bookkeeping ---
        this._castIndex = 0;                  // 0..2 (which wave to emit next)
        this._castPhase = 'windup';           // 'windup' | 'emit' | 'recover'
        this._castPhaseTimer = 0;
        this._castCooldown = 0;

        // Free projectiles owned by the Hero (the 3 light waves; future AoE).
        // Surfaced via getActiveHitboxes() — mirrors player.projectiles.
        this.projectiles = [];

        // --- 3. Parry / counter bookkeeping ---
        this._parryTimer = 0;                 // frames left in the brace
        this._parryCooldown = 0;
        this._counterTimer = 0;               // frames left in the counter burst
        this._fearImmuneTimer = 0;            // a parry briefly immunises against the Fear Strike

        // --- 4. Jump / pogo bookkeeping ---
        this._jumpCooldown = 0;
        this._airAttackCooldown = 0;          // gate before a new dive window can arm
        this._pogoConsumed = false;           // one bounce per dive window

        // --- 5. Fear: a brief 0.5s KNOCKDOWN STUN nested inside a 4s DEBUFF ---
        // Two INDEPENDENT clocks. The stun (crumpled & helpless) is short; the
        // debuff (+30% dmg taken + the Boss's dark-aura trigger) far outlives it,
        // so the Hero is back up and fighting long before the fear wears off.
        this.fearStunTimer = 0;               // frames of the 0.5s knockdown stun remaining
        this.fearDebuffTimer = 0;             // frames of the 4s fear DEBUFF remaining (+30% dmg taken)

        // --- Dodge i-frames ---
        this.iFrames = 0;
        this.iFrameDuration = DODGE.IFRAMES;

        // --- Knockback ---
        this.knockbackForce = 11;
        this.knockbackLift = 9;
        this.knockbackFriction = 0.9;
        this.knockbackTimer = 0;
        this.knockbackDuration = 12;

        // Hit-flash feedback.
        this.hitFlash = 0;
        this.hitFlashDuration = 8;

        // --- Pixel-art rendering (visual only) ---
        this.anim = new SpriteAnimator(HERO_SPRITES);
        this._spriteTopY = null;
    }

    getCenter() {
        return { x: this.x, y: this.y };
    }

    // Apply the current encounter's stats + abilities.
    applyStats(stats, abilities = []) {
        if (stats) {
            this.maxHp = stats.hp;
            this.hp = stats.hp;            // resurrect at full HP for the new encounter
            this.maxSpeed = stats.move_speed;
            this.attackDamage = stats.attack_damage;
        }
        const ab = new Set(abilities);
        this.abilities = ab;

        // Resolve the ability gates. Melee + dash stay faithful to the matrix;
        // the new pillars are DEFAULT-ON (see FEATURES) but matrix-overridable.
        this.canMelee = ab.has('pathfind_melee');
        this.canDashRoll = ab.has('dash_roll');
        this.canCastWaves = ab.has('light_wave') || ab.has('wave_magic') || ab.has('cast_magic') || FEATURES.WAVES_DEFAULT;
        this.canParry = ab.has('parry') || ab.has('parry_stance') || FEATURES.PARRY_DEFAULT;
        this.canJumpPogo = ab.has('pogo') || ab.has('jump') || FEATURES.JUMP_DEFAULT;

        if (this.attackHitbox) this.attackHitbox.damage = this.attackDamage;
    }

    // === Generic dash ======================================================

    canDash(distToPlayer) {
        return (
            this.canDashRoll &&
            this.dashCooldown <= 0 &&
            this.moveState === MoveState.WALKING &&
            this.isGrounded &&
            distToPlayer > DASH.MIN_RANGE_PX
        );
    }

    _startDash(dir) {
        this._dashDir = dir;
        this.facing = dir;
        this._dashIsDodge = false;
        if (DASH.WINDUP_FRAMES > 0) {
            this.moveState = MoveState.DASH_WINDUP;
            this._dashTimer = DASH.WINDUP_FRAMES;
            this.velocityX = 0;
        } else {
            this._enterBurst();
        }
    }

    _enterBurst() {
        this.moveState = MoveState.DASHING;
        this._dashTimer = DASH.DURATION_FRAMES;
    }

    _endDash() {
        this.moveState = MoveState.WALKING;
        this.dashCooldown = DASH.COOLDOWN_FRAMES;
    }

    _canRepositionDash() {
        return (
            this.canDashRoll &&
            this.dashCooldown <= 0 &&
            this.isGrounded &&
            this.knockbackTimer <= 0 &&
            this.fearStunTimer <= 0
        );
    }

    _startRepositionDash(dir) {
        this._dashDir = dir;        // points AWAY from the Boss
        this.facing = -dir;         // keep eyes on the Boss while back-dashing
        this._dashIsDodge = true;   // defensive burst, exempt from the dash-cancel
        this.moveState = MoveState.DASHING;
        this._dashTimer = DASH.REPOSITION_FRAMES;
        this.dashCooldown = DASH.COOLDOWN_FRAMES;
        this._attackWindup = 0;
    }

    // === Shared melee hitbox helpers =======================================

    // Restore the hitbox to its baseline melee shape (before reshaping it for a
    // different role, and after the counter burst).
    _resetMeleeHitbox() {
        this.attackHitbox.configure({
            reach: this.radius + ATTACK.REACH_PX,
            width: ATTACK.WIDTH,
            height: ATTACK.HEIGHT,
            duration: ATTACK.DURATION_FRAMES,
            cooldown: ATTACK.COOLDOWN_FRAMES,
            damage: this.attackDamage,
            knockback: ATTACK.KNOCKBACK,
            velocityX: 0,
            velocityY: 0,
        });
        this.attackHitbox.kind = null;
    }

    // Place the shared hitbox correctly for the CURRENT state: centred for the
    // counter, BELOW for the pogo dive, in-front for everything else.
    _repositionAttackHitbox() {
        if (this.moveState === MoveState.PARRY_COUNTER) {
            this.attackHitbox.facing = this.facing;
            this.attackHitbox.x = this.x;
            this.attackHitbox.y = this.y;
        } else if (this.moveState === MoveState.AIR_ATTACK) {
            // reach is repurposed as a DOWNWARD offset for the dive strike.
            this.attackHitbox.facing = this.facing;
            this.attackHitbox.x = this.x;
            this.attackHitbox.y = this.y + this.attackHitbox.reach;
        } else {
            this.attackHitbox.reposition(this.x, this.y, this.facing);
        }
    }

    // === 1. Four-hit melee combo ===========================================

    _meleeReady() {
        return (
            this.canMelee &&
            this.isGrounded &&
            this.knockbackTimer <= 0 &&
            this.fearStunTimer <= 0 &&
            this._comboCooldown <= 0
        );
    }

    _canStartCombo(edgeGap) {
        return this._meleeReady() && edgeGap <= COMBO.GAP_PX;
    }

    _startCombo(dir) {
        this.facing = dir;        // facing LOCKS for the chain (the Boss can bait it)
        this.velocityX = 0;
        this.moveState = MoveState.ATTACK_WINDUP;
        this._comboIndex = 0;
        this._comboPhase = 'windup';
        this._comboPhaseTimer = COMBO.HITS[0].windup;
    }

    _configureComboHit(i) {
        const h = COMBO.HITS[i];
        this.attackHitbox.configure({
            reach: this.radius + h.reachOff,
            width: h.width,
            height: h.height,
            duration: h.active,
            damage: Math.max(1, Math.round(this.attackDamage * h.dmgMult)),
            knockback: h.knockback,
            velocityX: 0,
            velocityY: 0,
        });
        this.attackHitbox.kind = null;
    }

    _enterComboActive() {
        const h = COMBO.HITS[this._comboIndex];
        this.moveState = MoveState.ATTACKING;
        this._comboPhase = 'active';
        this._comboPhaseTimer = h.active;
        this._comboStep = h.step;
        this._configureComboHit(this._comboIndex);
        this.attackHitbox.trigger(true);                            // force-fire: the combo owns its cadence
        this.attackHitbox.reposition(this.x, this.y, this.facing);  // connect from frame one
    }

    // === 2. Three-stage light-wave magic ===================================

    _canCast(dist) {
        return (
            this.canCastWaves &&
            this.isGrounded &&
            this.knockbackTimer <= 0 &&
            this.fearStunTimer <= 0 &&
            this._castCooldown <= 0 &&
            dist >= WAVE.MIN_RANGE &&
            dist <= WAVE.MAX_RANGE
        );
    }

    _startCast(dir) {
        this.facing = dir;
        this.velocityX = 0;
        this.moveState = MoveState.CASTING;
        this._castIndex = 0;
        this._castPhase = 'windup';
        this._castPhaseTimer = WAVE.WINDUP;
        this._castCooldown = WAVE.COOLDOWN;   // set now -> no immediate re-cast
    }

    // Spawn wave `i` (0,1,2) as a free-moving Hitbox tagged with waveType (1,2,3).
    _spawnWave(i) {
        const t = WAVE.TYPES[i];
        const dir = this.facing;
        const hb = new Hitbox({
            reach: 0,
            width: t.width,
            height: t.height,
            duration: WAVE.LIFETIME,
            cooldown: 0,
            damage: Math.max(1, Math.round(this.attackDamage * t.dmgMult)),
            knockback: t.knockback,
            velocityX: dir * t.speed,
            velocityY: t.vy,
            kind: 'wave',
        });
        hb.waveType = i + 1;   // REQUIREMENT: 1 = diagonal, 2 = vertical, 3 = X-shape
        hb.x = this.x + dir * (this.radius + 10);
        hb.y = this.y - 6;
        hb.trigger(true);
        this.projectiles.push(hb);
    }

    // === 3. Parry stance + circular counter ================================

    _startParry(dir) {
        this.facing = dir;        // brace toward the Boss
        this.velocityX = 0;
        this.moveState = MoveState.PARRY_STANCE;
        this._parryTimer = PARRY.STANCE_FRAMES;
    }

    // Fired from takeDamage() when the Boss connects during the brace: nullify
    // the hit and erupt the massive circular counter (armed centred on the Hero
    // so the current main.js Hero->Boss check damages the Boss this very frame).
    _triggerParryCounter(knockbackDir) {
        if (knockbackDir !== 0) this.facing = -knockbackDir; // the strike came from -dir => face it
        this.velocityX = 0;
        this.moveState = MoveState.PARRY_COUNTER;
        this._counterTimer = COUNTER.ACTIVE;
        this.iFrames = COUNTER.IFRAMES;              // invulnerable through the counter
        this._fearImmuneTimer = COUNTER.FEAR_IMMUNE; // a parried Fear Strike won't stun
        this._parryCooldown = PARRY.COOLDOWN;
        this.hitFlash = this.hitFlashDuration;

        this._resetMeleeHitbox();
        this.attackHitbox.configure({
            reach: 0,
            width: COUNTER.WIDTH,
            height: COUNTER.HEIGHT,
            duration: COUNTER.ACTIVE,
            damage: Math.max(1, Math.round(this.attackDamage * COUNTER.DMG_MULT)),
            knockback: COUNTER.KNOCKBACK,
            velocityX: 0,
            velocityY: 0,
        });
        this.attackHitbox.x = this.x;
        this.attackHitbox.y = this.y;
        this.attackHitbox.facing = this.facing;
        this.attackHitbox.trigger(true);
    }

    // === 4. Jump & pogo ====================================================

    _canJump() {
        return (
            this.canJumpPogo &&
            this.isGrounded &&
            this.knockbackTimer <= 0 &&
            this.fearStunTimer <= 0 &&
            this._jumpCooldown <= 0 &&
            this.moveState === MoveState.WALKING
        );
    }

    // Decide whether to hop this frame: a dive-setup hop inside the band, or a
    // rarer long-range approach hop. Too close -> never (would sail over the Boss).
    _shouldJump(dist) {
        if (dist >= JUMP.SETUP_MIN && dist <= JUMP.SETUP_MAX) return Math.random() < JUMP.SETUP_CHANCE;
        if (dist > JUMP.SETUP_MAX) return Math.random() < JUMP.APPROACH_CHANCE;
        return false;
    }

    _startJump(dir) {
        this.facing = dir;
        this.velocityY = -JUMP.STRENGTH;
        this.velocityX = dir * Math.min(this.maxSpeed, JUMP.HORIZ);
        this.isGrounded = false;
        this.moveState = MoveState.JUMPING;
        this._jumpCooldown = JUMP.COOLDOWN;
    }

    // Arm an aerial DOWN-strike (the pogo strike) on the shared hitbox.
    _startAirAttack() {
        this.moveState = MoveState.AIR_ATTACK;
        this._resetMeleeHitbox();
        this.attackHitbox.configure({
            reach: POGO.REACH_DOWN,   // repurposed as the DOWN offset (see _repositionAttackHitbox)
            width: POGO.WIDTH,
            height: POGO.HEIGHT,
            duration: POGO.ACTIVE,
            damage: Math.max(1, Math.round(this.attackDamage * POGO.DMG_MULT)),
            knockback: 0,
            velocityX: 0,
            velocityY: 0,
        });
        this.attackHitbox.trigger(true);
        this._pogoConsumed = false;
        this._airAttackCooldown = POGO.ACTIVE + POGO.ARM_COOLDOWN; // don't re-arm mid-dive
    }

    // === Dodge (reactive defense) ==========================================

    /**
     * If the Boss is mid-swing, FACING this Hero, and close, burst AWAY with
     * i-frames. Shares the dash resource/cooldown with the gap-closer (so it can
     * be baited). Called once per frame from main.js's handleCombat.
     * @param {Player} player
     * @returns {boolean} true if a dodge started this frame.
     */
    tryDodge(player) {
        if (!player) return false;
        if (this.moveState !== MoveState.WALKING) return false; // committed states can't dodge
        if (!this.canDashRoll) return false;
        if (this.dashCooldown > 0 || !this.isGrounded || this.knockbackTimer > 0) return false;
        if (this.iFrames > 0) return false;

        const swing = player.attackHitbox;
        if (!swing || !swing.isActive) return false;
        const bossFacingHero = Math.sign(this.x - player.x) === player.facing;
        if (!bossFacingHero) return false;
        if (Math.abs(this.x - player.x) > DODGE.THREAT_RANGE_PX) return false;

        this._startDodge(player);
        return true;
    }

    _startDodge(player) {
        const awayDir = Math.sign(this.x - player.x) || -this.facing;
        this.facing = -awayDir;            // keep looking at the Boss while back-dashing
        this._dashDir = awayDir;
        this._dashIsDodge = true;
        this.moveState = MoveState.DASHING;
        this._dashTimer = DASH.DURATION_FRAMES;
        this.dashCooldown = DASH.COOLDOWN_FRAMES;
        this.iFrames = this.iFrameDuration;
        this._attackWindup = 0;
    }

    // === Public combat surface =============================================

    // All of the Hero's currently-damaging hitboxes (mirrors player.getActiveHitboxes()).
    // Includes the shared melee hitbox (combo / counter / pogo) and every live wave.
    getActiveHitboxes() {
        const out = [];
        if (this.attackHitbox.isActive) out.push(this.attackHitbox);
        for (const p of this.projectiles) if (p.isActive) out.push(p);
        return out;
    }

    /**
     * REQUIREMENT 5: the Hero is struck by the Boss's Fear Strike -> it crumples
     * to the ground, stunned and unable to act for ~0.5s. Called by main.js right
     * after a fear-tagged hitbox connects. A fresh parry (or any i-frames) makes
     * the Hero immune, so a parried Fear Strike neither damages nor stuns.
     * @returns {boolean} true if the stun was applied.
     */
    triggerFear() {
        if (this._fearImmuneTimer > 0 || this.iFrames > 0) return false;

        // (1) The brief KNOCKDOWN stun: the Hero crumples and is helpless ONLY for
        // this short window (~0.5s). It expires in update() and the Hero stands up.
        this.fearStunTimer = FEAR.STUN_FRAMES;
        // (2) The much longer FEAR DEBUFF, started on the SAME frame but lasting far
        // longer (~4s). It OUTLIVES the stun: once the Hero is back on its feet and
        // fighting, it still takes +30% damage (takeDamage) and the Boss keeps
        // flaring its dark aura (read externally) until THIS timer runs out.
        this.fearDebuffTimer = FEAR.DEBUFF_FRAMES;
        this.hitFlash = this.hitFlashDuration;
        this.moveState = MoveState.FEAR;

        // Cancel everything the Hero was mid-way through.
        this.knockbackTimer = 0;
        this._dashTimer = 0;
        this._attackWindup = 0;
        this._comboPhaseTimer = 0;
        this._comboPhase = 'windup';
        this._castPhaseTimer = 0;
        this._castPhase = 'windup';
        this._parryTimer = 0;
        this._counterTimer = 0;
        this._repositionAfterAttack = false;
        this.attackHitbox.activeTimer = 0;

        // Stagger backward a touch, hop, then gravity drops the Hero to the floor.
        this.velocityX = -Math.sign(this.velocityX || this.facing) * FEAR.NUDGE;
        this.velocityY = Math.min(this.velocityY, -FEAR.HOP);
        this.isGrounded = false;
        return true;
    }

    /**
     * Per-frame AI + physics.
     *
     * @param {number} targetX  Boss center x.
     * @param {number} targetY  Boss center y.
     * @param {object} [targetBounds] Boss AABB source — the Player, or
     *        { halfWidth, halfHeight } (radius accepted too). Strongly recommended:
     *        without it, spacing, the dash-cancel AND the pogo fall back to a
     *        massive-boss estimate (still functional, just not pixel-accurate).
     */
    update(targetX, targetY, targetBounds = null) {
        // --- Timers (count down every frame) ---
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.iFrames > 0) this.iFrames--;
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this._comboCooldown > 0) this._comboCooldown--;
        if (this._castCooldown > 0) this._castCooldown--;
        if (this._jumpCooldown > 0) this._jumpCooldown--;
        if (this._airAttackCooldown > 0) this._airAttackCooldown--;
        if (this._parryCooldown > 0) this._parryCooldown--;
        if (this._fearImmuneTimer > 0) this._fearImmuneTimer--;
        if (this.fearDebuffTimer > 0) this.fearDebuffTimer--; // 4s fear DEBUFF bleeds down here, independent of the stun
        this.attackHitbox.tick(); // advance the shared weapon's active/cooldown timers

        // --- Advance free projectiles every frame (independent of any Hero stun) ---
        if (this.projectiles.length) {
            for (const p of this.projectiles) p.update();
            this.projectiles = this.projectiles.filter((p) => p.isActive);
        }

        // Resolve the Boss's AABB half-extents (see param doc above).
        const bossHalfWidth =
            (targetBounds && Number.isFinite(targetBounds.halfWidth)) ? targetBounds.halfWidth :
            (targetBounds && Number.isFinite(targetBounds.radius)) ? targetBounds.radius :
            SPACING.BOSS_HALFWIDTH_FALLBACK;
        const bossHalfHeight =
            (targetBounds && Number.isFinite(targetBounds.halfHeight)) ? targetBounds.halfHeight :
            (targetBounds && Number.isFinite(targetBounds.radius)) ? targetBounds.radius :
            SPACING.BOSS_HALFHEIGHT_FALLBACK;

        const dx = targetX - this.x;
        const dist = Math.abs(dx);
        const dirToPlayer = Math.sign(dx) || 1;
        const awayDir = -dirToPlayer;
        const edgeGap = dist - this.halfWidth - bossHalfWidth; // negative => overlapping
        const airMaxVx = this.maxSpeed * AIR.MAX_VX_MULT;

        if (this.fearStunTimer > 0) {
            // 5. FEAR KNOCKDOWN: crumpled + helpless, but only for the brief stun
            // window (~0.5s). Bleed horizontal speed; gravity drops the Hero to the
            // floor. The fearDebuffTimer above is UNAFFECTED and keeps running, so
            // the +30%-damage / dark-aura status persists after the Hero stands up.
            this.fearStunTimer--;
            this.velocityX *= FEAR.FRICTION;
            this.moveState = MoveState.FEAR;
            // Recover the instant the stun ends: the FSM switch has no FEAR case,
            // so without this the Hero would stay frozen in FEAR forever.
            if (this.fearStunTimer <= 0) this.moveState = MoveState.WALKING;
        } else if (this.knockbackTimer > 0) {
            // Knocked back: ride the bounce velocity (friction) instead of pursuing.
            this.knockbackTimer--;
            this.velocityX *= this.knockbackFriction;
            this.moveState = MoveState.WALKING;
            this._dashTimer = 0;
            this._attackWindup = 0;
            this._repositionAfterAttack = false;
        } else {
            switch (this.moveState) {
                case MoveState.WALKING: {
                    // a) peel away after a just-landed strike
                    if (this._repositionAfterAttack) {
                        this._repositionAfterAttack = false;
                        if (edgeGap < SPACING.HOVER_GAP && this._canRepositionDash()) {
                            this._startRepositionDash(awayDir);
                            break;
                        }
                    }

                    // b) CONTACT DANGER -> bail; never trade body-contact damage
                    if (edgeGap < SPACING.MIN_GAP) {
                        this.facing = dirToPlayer;
                        if (this._canRepositionDash()) this._startRepositionDash(awayDir);
                        else this.velocityX = awayDir * this.maxSpeed;
                        break;
                    }

                    // c) randomly brace into a PARRY stance (defensive), only when safe & grounded
                    if (this.isGrounded && this.iFrames <= 0 && this._parryCooldown <= 0 &&
                        this.canParry && Math.random() < PARRY.CHANCE) {
                        this._startParry(dirToPlayer);
                        break;
                    }

                    // d) ranged poke at distance (light-wave magic), out of melee range
                    if (edgeGap > COMBO.GAP_PX && this._canCast(dist) && Math.random() < WAVE.CHANCE) {
                        this._startCast(dirToPlayer);
                        break;
                    }

                    // e) jump / pogo (approach hop or dive setup)
                    if (this._canJump() && this._shouldJump(dist)) {
                        this._startJump(dirToPlayer);
                        break;
                    }

                    // f) deterministic melee / approach / spacing
                    if (this._meleeReady()) {
                        if (edgeGap <= COMBO.GAP_PX) {
                            this._startCombo(dirToPlayer);                 // in range -> 4-hit combo
                        } else if (this.canDash(dist)) {
                            this._startDash(dirToPlayer);                  // big gap -> dash in
                        } else {
                            this.facing = dirToPlayer;
                            this.velocityX = dirToPlayer * this.maxSpeed;  // walk in to range
                        }
                    } else if (edgeGap > COMBO.GAP_PX && this._canCast(dist)) {
                        // melee recovering but well spaced: occasionally fill with magic
                        if (Math.random() < WAVE.CHANCE * 1.5) this._startCast(dirToPlayer);
                        else { this.facing = dirToPlayer; this.velocityX = 0; }
                    } else if (edgeGap < SPACING.HOVER_GAP) {
                        this.facing = dirToPlayer;
                        this.velocityX = awayDir * this.maxSpeed * SPACING.RETREAT_SPEED_MULT; // back off
                    } else {
                        this.facing = dirToPlayer;
                        this.velocityX = 0;                                // hold, wait out cooldown
                    }
                    break;
                }

                case MoveState.DASH_WINDUP: {
                    this.velocityX = 0; // frozen telegraph
                    this._dashTimer--;
                    if (this._dashTimer <= 0) this._enterBurst();
                    break;
                }

                case MoveState.DASHING: {
                    // OVERRIDE: constant high speed, bypassing the walk cap entirely.
                    this.velocityX = this._dashDir * this.maxSpeed * DASH.MULTIPLIER;

                    // SMART DASH CANCEL: a gap-CLOSING dash never plows into the Boss.
                    const closingOnBoss =
                        !this._dashIsDodge && Math.sign(targetX - this.x) === this._dashDir;
                    if (closingOnBoss) {
                        const towardSign = this._dashDir;
                        const stopHalfW = this.halfWidth + bossHalfWidth + SPACING.DASH_STOP_GAP;
                        const limitX = targetX - towardSign * stopHalfW;
                        const nextX = this.x + this.velocityX;
                        const verticallyOverlapping =
                            Math.abs(this.y - targetY) <
                            (this.halfHeight + bossHalfHeight + SPACING.DASH_CANCEL_SKIN);
                        const breached = towardSign > 0 ? (nextX >= limitX) : (nextX <= limitX);
                        if (verticallyOverlapping && breached) {
                            const clamped = limitX - this.x;
                            this.velocityX = towardSign > 0 ? Math.max(0, clamped) : Math.min(0, clamped);
                            this._endDash();
                            break;
                        }
                    }

                    this._dashTimer--;
                    if (this._dashTimer <= 0) this._endDash();
                    break;
                }

                case MoveState.ATTACK_WINDUP: {
                    // Combo telegraph (facing LOCKED). Releases into the active swing.
                    this.velocityX = 0;
                    this._comboPhaseTimer--;
                    if (this._comboPhaseTimer <= 0) this._enterComboActive();
                    break;
                }

                case MoveState.ATTACKING: {
                    if (this._comboPhase === 'active') {
                        // Forward lunge (Hades step), clamped so it never grinds the Boss.
                        let step = this.facing * this._comboStep;
                        const towardSign = Math.sign(targetX - this.x) || this.facing;
                        if (this.facing === towardSign) {
                            const minCenterDist = this.halfWidth + bossHalfWidth + COMBO.MIN_STEP_GAP;
                            const room = dist - minCenterDist;
                            step = room <= 0 ? 0 : towardSign * Math.min(this._comboStep, room);
                        }
                        this.velocityX = step;
                        this._comboPhaseTimer--;
                        if (this._comboPhaseTimer <= 0) {
                            this._comboPhase = 'link';
                            this._comboPhaseTimer = COMBO.HITS[this._comboIndex].link;
                            this.velocityX = 0;
                        }
                    } else { // 'link' (recovery between hits / after the chain)
                        this.velocityX = 0;
                        this._comboPhaseTimer--;
                        if (this._comboPhaseTimer <= 0) {
                            if (this._comboIndex < COMBO.HITS.length - 1) {
                                this._comboIndex++;
                                this._comboPhase = 'windup';
                                this._comboPhaseTimer = COMBO.HITS[this._comboIndex].windup;
                                this.moveState = MoveState.ATTACK_WINDUP;
                            } else {
                                this.moveState = MoveState.WALKING;       // chain complete
                                this._comboCooldown = COMBO.COOLDOWN;
                                this._repositionAfterAttack = true;
                            }
                        }
                    }
                    break;
                }

                case MoveState.CASTING: {
                    // Planted 3-stage cast; keep aiming so each wave tracks the Boss's side.
                    this.velocityX = 0;
                    this.facing = dirToPlayer;
                    if (this._castPhase === 'windup') {
                        this._castPhaseTimer--;
                        if (this._castPhaseTimer <= 0) { this._castPhase = 'emit'; this._castPhaseTimer = 0; }
                    } else if (this._castPhase === 'emit') {
                        if (this._castPhaseTimer <= 0) {
                            this._spawnWave(this._castIndex);
                            this._castIndex++;
                            if (this._castIndex >= WAVE.TYPES.length) {
                                this._castPhase = 'recover';
                                this._castPhaseTimer = WAVE.RECOVER;
                            } else {
                                this._castPhaseTimer = WAVE.GAP;
                            }
                        } else {
                            this._castPhaseTimer--;
                        }
                    } else { // recover
                        this._castPhaseTimer--;
                        if (this._castPhaseTimer <= 0) {
                            this.moveState = MoveState.WALKING;
                            this._repositionAfterAttack = true;
                        }
                    }
                    break;
                }

                case MoveState.PARRY_STANCE: {
                    // Braced. If the Boss connects now, takeDamage() fires the counter.
                    this.velocityX = 0;
                    this.facing = dirToPlayer;
                    this._parryTimer--;
                    if (this._parryTimer <= 0) {
                        this.moveState = MoveState.WALKING;     // lapsed unused
                        this._parryCooldown = PARRY.COOLDOWN;
                    }
                    break;
                }

                case MoveState.PARRY_COUNTER: {
                    // The circular burst is live (armed in takeDamage). Hold, then recover.
                    this.velocityX = 0;
                    this._counterTimer--;
                    if (this._counterTimer <= 0) {
                        this.moveState = MoveState.WALKING;
                        this._resetMeleeHitbox();
                        this._repositionAfterAttack = true;
                    }
                    break;
                }

                case MoveState.JUMPING: {
                    // Airborne: steer toward the Boss; dive once roughly overhead.
                    this.facing = dirToPlayer;
                    this.velocityX = clamp(this.velocityX + dirToPlayer * AIR.CONTROL, -airMaxVx, airMaxVx);
                    if (this.canJumpPogo && this._airAttackCooldown <= 0 &&
                        Math.abs(targetX - this.x) <= POGO.HORIZ_RANGE) {
                        this._startAirAttack();
                    } else if (this.isGrounded) {
                        this.moveState = MoveState.WALKING;     // landed without diving
                    }
                    break;
                }

                case MoveState.AIR_ATTACK: {
                    // Diving DOWN-strike. Slight homing; the actual pogo bounce is
                    // resolved AFTER integration (post-step) against the Boss AABB.
                    this.facing = dirToPlayer;
                    this.velocityX = clamp(this.velocityX + dirToPlayer * AIR.CONTROL * 0.5, -airMaxVx, airMaxVx);
                    if (this.isGrounded) {
                        this.moveState = MoveState.WALKING;     // dive hit the floor
                        this._repositionAfterAttack = true;
                        this.attackHitbox.activeTimer = 0;
                    } else if (!this.attackHitbox.isActive) {
                        this.moveState = MoveState.JUMPING;     // window elapsed -> keep falling
                    }
                    break;
                }
            }
        }

        // --- Integrate horizontal movement ---
        this.x += this.velocityX;

        // --- Gravity ---
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        // Re-place the shared melee hitbox for the (possibly updated) state/position.
        this._repositionAttackHitbox();

        // --- 4. POGO RESOLUTION (post-step, geometrically exact) ---
        // While diving, a down-strike overlapping the Boss AABB bounces the Hero
        // up (Hollow Knight) and lets it chain another dive. main.js applies the
        // actual damage via enemy.attackHitbox; this only handles the bounce.
        if (this.moveState === MoveState.AIR_ATTACK && this.attackHitbox.isActive && !this._pogoConsumed) {
            const bossLike = { x: targetX, y: targetY, halfWidth: bossHalfWidth, halfHeight: bossHalfHeight };
            if (this.attackHitbox.overlaps(bossLike)) {
                this.velocityY = -POGO.BOUNCE;
                this.isGrounded = false;
                this._pogoConsumed = true;
                this._airAttackCooldown = POGO.RECHAIN;
                this.moveState = MoveState.JUMPING; // rise, then dive again
            }
        }
    }

    get isDashing() { return this.moveState === MoveState.DASHING; }
    get isDodging() { return this.iFrames > 0 && this.moveState === MoveState.DASHING; }

    // --- Fear status surface (read by other systems; e.g. the Boss's dark aura) ---
    // Two independent clocks (see triggerFear): a 0.5s knockdown STUN nested inside
    // a 4s DEBUFF. Expose intent rather than raw frame counts.
    get isFearStunned()  { return this.fearStunTimer > 0; }    // crumpled & helpless (~0.5s)
    get isFearDebuffed() { return this.fearDebuffTimer > 0; }  // +30% dmg taken + Boss dark aura (~4s)

    // Back-compat shims. Earlier call sites (main.js / Boss.js) may still read the
    // PREVIOUS field names; these alias the new clocks so nothing breaks during the
    // migration. NOTE: the Boss's dark aura should track the DEBUFF, so point it at
    // `isFearDebuffed` / `fearDebuffTimer` (the old `fearStatusTimer` already maps
    // there). Prefer the new names going forward.
    get fearTimer()        { return this.fearStunTimer; }
    set fearTimer(v)       { this.fearStunTimer = v; }
    get fearStatusTimer()  { return this.fearDebuffTimer; }
    set fearStatusTimer(v) { this.fearDebuffTimer = v; }

    /**
     * Take a hit from the Boss. Honors dodge/counter i-frames (ignored entirely).
     * If braced in a PARRY stance, the hit is NULLIFIED and the circular counter
     * is unleashed instead — the swing still returns true so main.js marks it
     * spent and suppresses body-contact, but NO HP is lost. Any landed hit
     * interrupts whatever the Hero was doing (combo, cast, dive, dash, brace).
     *
     * @param {number} amount
     * @param {number} knockbackDir -1 / +1 push direction away from the Boss; 0 => reverse travel.
     * @returns {boolean} true if the hit "registered" (damage OR parry), false if i-framed.
     */
    takeDamage(amount, knockbackDir = 0) {
        if (this.iFrames > 0) return false; // dodging / counter invuln -> ignore the hit

        if (this.moveState === MoveState.PARRY_STANCE) {
            this._triggerParryCounter(knockbackDir); // PARRY! nullify + counter
            return true;                             // swing consumed; NO HP lost
        }

        // FEAR DEBUFF: while the 4s window is live, the Hero takes +30% — and this
        // outlasts the 0.5s knockdown, so most amplified hits land while the Hero is
        // back up and fighting. (The Fear Strike that APPLIES the debuff isn't
        // amplified itself — main.js calls triggerFear() AFTER this takeDamage(), so
        // on the triggering frame the debuff isn't live yet; only later hits scale.)
        const dmg = this.fearDebuffTimer > 0 ? amount * FEAR.DAMAGE_TAKEN_MULT : amount;
        this.hp = Math.max(0, this.hp - dmg);
        this.hitFlash = this.hitFlashDuration;

        // A hit interrupts ANY action in progress.
        this.moveState = MoveState.WALKING;
        this._dashTimer = 0;
        this._attackWindup = 0;
        this._comboPhaseTimer = 0;
        this._comboPhase = 'windup';
        this._castPhaseTimer = 0;
        this._castPhase = 'windup';
        this._parryTimer = 0;
        this.attackHitbox.activeTimer = 0; // cancel a live swing
        this._repositionAfterAttack = false;

        const dir = knockbackDir !== 0 ? knockbackDir : -Math.sign(this.velocityX || 1);
        this.velocityX = dir * this.knockbackForce;
        this.velocityY = -this.knockbackLift;
        this.isGrounded = false;
        this.knockbackTimer = this.knockbackDuration;
        return true;
    }

    // === Rendering (visual only; never writes the AI/physics state) =========

    // Pick the first sprite clip that actually exists, so aspirational state
    // names ('cast', 'parry', 'air_attack', 'hurt', ...) degrade gracefully
    // until the Hero sprite sheet gains them, then light up automatically.
    _clip(...names) {
        for (const n of names) if (HERO_SPRITES[n]) return n;
        return 'idle';
    }

    _animState() {
        const ms = this.moveState;
        if (this.fearStunTimer > 0) return { name: this._clip('hurt', 'fall', 'roll'), hold: 6 };
        if (ms === MoveState.PARRY_COUNTER) return { name: this._clip('parry_counter', 'attack'), hold: 2 };
        if (ms === MoveState.PARRY_STANCE)  return { name: this._clip('parry', 'guard', 'idle'), hold: 8 };
        if (ms === MoveState.CASTING)       return { name: this._clip('cast', 'attack'), hold: 4 };
        if (ms === MoveState.AIR_ATTACK)    return { name: this._clip('air_attack', 'attack'), hold: 3 };
        if (ms === MoveState.ATTACKING || ms === MoveState.ATTACK_WINDUP) {
            return { name: this._clip('attack'), hold: 3 };
        }
        if (ms === MoveState.DASHING) {
            const defensive = this._dashIsDodge || this.iFrames > 0; // dodge / back-dash
            return defensive ? { name: this._clip('roll', 'dash'), hold: 2 } : { name: this._clip('dash'), hold: 3 };
        }
        if (ms === MoveState.DASH_WINDUP) return { name: this._clip('dash'), hold: 3 };
        if (ms === MoveState.JUMPING || !this.isGrounded) {
            return { name: this._clip(this.velocityY < 0 ? 'jump' : 'fall'), hold: 6 };
        }
        if (Math.abs(this.velocityX) > 0.5) return { name: this._clip('run'), hold: 4 };
        return { name: this._clip('idle'), hold: 12 };
    }

    draw(ctx) {
        const { name, hold } = this._animState();
        this.anim.set(name, hold);
        this.anim.tick();
        const frame = this.anim.current();
        if (!frame) return;

        const feetY = this.y + this.halfHeight; // the sprite stands here
        const flip = this.facing === -1;        // art is drawn facing right
        const inCounter = this.moveState === MoveState.PARRY_COUNTER;
        const dodging = this.iFrames > 0 && !inCounter && this.fearStunTimer <= 0;

        // Tint: white hit-flash; dazed grey while feared; white/red dash-windup flicker.
        let tint = null;
        if (this.hitFlash > 0) tint = '#ffffff';
        else if (this.fearStunTimer > 0) tint = '#5a5f78';
        else if (this.moveState === MoveState.DASH_WINDUP) {
            tint = (Math.floor(performance.now() / 60) % 2) ? '#ffffff' : '#e23b3b';
        }

        // Free projectiles (the 3 light waves) render in world space.
        this.drawWaveProjectiles(ctx);

        // Soft contact shadow, only while actually on the ground.
        if (this.isGrounded) {
            SpriteManager.drawShadow(ctx, this.x, feetY, frame[0].length * HERO_PIXEL * 0.7);
        }

        const res = SpriteManager.drawSprite(ctx, frame, this.x, feetY, {
            pixelSize: HERO_PIXEL, flip, tint,
            alpha: dodging ? 0.55 : 1,
        });
        this._spriteTopY = res ? res.originY : null;

        // Combat-readability overlays.
        if (dodging) this.drawDodgeAura(ctx);
        if (this.moveState === MoveState.ATTACK_WINDUP) this.drawTelegraph(ctx);
        if (this.moveState === MoveState.PARRY_STANCE) this.drawParryAura(ctx);
        if (inCounter) this.drawCounterBurst(ctx);
        if (this.moveState === MoveState.AIR_ATTACK) this.drawPogoStrike(ctx);
        if (this.fearStunTimer > 0) this.drawFearStun(ctx);

        this.drawHealthBar(ctx);
    }

    // Red warning arc in the strike direction that "fills" as the combo hit's
    // wind-up completes — the cue to dodge or punish.
    drawTelegraph(ctx) {
        const w = COMBO.HITS[this._comboIndex] ? COMBO.HITS[this._comboIndex].windup : 1;
        const progress = w > 0 ? 1 - this._comboPhaseTimer / w : 1; // 0..1
        const r = this.radius + 22;
        const spread = Math.PI * 0.5;
        const base = this.facing === 1 ? 0 : Math.PI;
        const a0 = base - spread / 2;
        const a1 = a0 + spread * progress;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(255, 70, 50, ${0.4 + 0.5 * progress})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(255, 60, 40, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, r, a0, a1);
        ctx.stroke();
        ctx.restore();
    }

    // Cyan aura signalling the Hero's dodge invulnerability window.
    drawDodgeAura(ctx) {
        const pct = this.iFrames / this.iFrameDuration; // 1 -> 0
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = `rgba(120, 240, 255, ${0.25 + 0.5 * pct})`;
        ctx.shadowBlur = 14;
        ctx.shadowColor = 'rgba(120, 240, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 8 + (1 - pct) * 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // 3. Pulsing YELLOW aura + a brace arc — the parry-stance tell.
    drawParryAura(ctx) {
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 90);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(255, 210, 70, ${0.45 + 0.35 * pulse})`;
        ctx.shadowBlur = 16;
        ctx.shadowColor = 'rgba(255, 200, 60, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
        ctx.stroke();
        // Brace arc in the facing direction.
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(255, 230, 140, ${0.6 + 0.3 * pulse})`;
        const base = this.facing === 1 ? 0 : Math.PI;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 20, base - Math.PI * 0.35, base + Math.PI * 0.35);
        ctx.stroke();
        ctx.restore();
    }

    // 3. Expanding golden ring — the circular counter erupting.
    drawCounterBurst(ctx) {
        const prog = clamp(1 - this._counterTimer / COUNTER.ACTIVE, 0, 1);
        const r = (this.radius + 6) + prog * (COUNTER.WIDTH / 2 - this.radius);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = 0.4 * (1 - prog);
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.85 * (1 - prog);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#ffe08a';
        ctx.shadowBlur = 24;
        ctx.shadowColor = 'rgba(255, 200, 60, 1)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // 4. Downward chevron shock under the Hero during the pogo dive.
    drawPogoStrike(ctx) {
        if (!this.attackHitbox.isActive) return;
        const y = this.y + POGO.REACH_DOWN;
        ctx.save();
        ctx.translate(this.x, y);
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#bfe6ff';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#7fc2ff';
        ctx.lineWidth = 4;
        const w = POGO.WIDTH / 2;
        ctx.beginPath();
        ctx.moveTo(-w, -6); ctx.lineTo(0, 10); ctx.lineTo(w, -6);
        ctx.stroke();
        ctx.restore();
    }

    // 5. Orbiting stars above the Hero's head while fear-stunned.
    drawFearStun(ctx) {
        const topY = (this._spriteTopY != null ? this._spriteTopY : this.y - this.halfHeight) - 8;
        const t = performance.now() / 240;
        ctx.save();
        ctx.translate(this.x, topY);
        ctx.fillStyle = '#ffe08a';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255, 220, 120, 0.9)';
        for (let i = 0; i < 3; i++) {
            const a = t + (i * Math.PI * 2) / 3;
            const px = Math.cos(a) * 12;
            const py = Math.sin(a) * 4;
            ctx.beginPath();
            ctx.arc(px, py, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 2. Light-wave projectiles — rendered with the procedural Holy Light Wave
    //    (SpriteManager.drawLightWave): a massive golden crescent slash per
    //    waveType (1 diagonal, 2 vertical, 3 X-cross). Travel direction is read
    //    from velocityX's sign (waves carry no explicit facing); alpha fades the
    //    slash over its lifetime. Rendering ONLY — speeds / damage / hitbox sizes
    //    are untouched.
    drawWaveProjectiles(ctx) {
        for (const p of this.projectiles) {
            if (!p.isActive || p.kind !== 'wave') continue;
            const alpha = 0.85 * (1 - p.lifeProgress * 0.6); // fade over lifetime (unchanged feel)
            const facing = Math.sign(p.velocityX) || 1;      // direction the wave travels
            SpriteManager.drawLightWave(ctx, p.x, p.y, p.waveType, facing, { alpha });
        }
    }

    // Floating HP bar above the Hero so the fight stays readable.
    drawHealthBar(ctx) {
        const barWidth = 44;
        const barHeight = 6;
        const x = this.x - barWidth / 2;
        const y = (this._spriteTopY != null ? this._spriteTopY - barHeight - 6 : this.y - this.size / 2 - 14);
        const pct = Math.max(0, this.hp / this.maxHp);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

        ctx.fillStyle = '#33ccff';
        ctx.fillRect(x, y, barWidth * pct, barHeight);
    }
}
