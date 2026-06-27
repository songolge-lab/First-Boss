// src/entities/Enemy.js
// ---------------------------------------------------------------------------
// The Hero (AI enemy). Pursues the Boss horizontally along the ground. Stats
// (hp / move_speed / attack_damage) and the ability list are INJECTED at spawn
// from the Hero Progression Matrix, so encounter 5's spawn automatically arrives
// dash-capable with no special-casing here.
//
// Movement is a small finite-state machine layered on top of the existing
// frame-based pursuit + knockback. The weapon-based combat upgrade EXTENDS that
// same FSM with two committed combat states (so attacking and moving stay
// mutually exclusive, which keeps the AI readable):
//
//     WALKING --(can dash)----> DASH_WINDUP --(timer)--> DASHING --(timer)--> WALKING
//     WALKING --(in range)----> ATTACK_WINDUP --(timer)--> ATTACKING --(timer)--> WALKING
//     WALKING --(Boss swings)-> DASHING (dodge: away + i-frames, no windup) --> WALKING
//
// NOTE on conventions (kept from the original Enemy so Player.js / Input.js /
// main.js collision code all stay valid):
//   - (this.x, this.y) is the CENTER of the entity (not top-left).
//   - Physics is FRAME-BASED: velocities are added once per frame; all timings
//     are expressed in frames, not seconds.
// ---------------------------------------------------------------------------

import { Hitbox } from '../core/Hitbox.js';

export const MoveState = Object.freeze({
    WALKING: 'WALKING',
    DASH_WINDUP: 'DASH_WINDUP', // brief telegraph so the dash is reactable / fair
    DASHING: 'DASHING',
    ATTACK_WINDUP: 'ATTACK_WINDUP', // telegraph before the Hero's own slash
    ATTACKING: 'ATTACKING',         // the Hero's weapon hitbox is live
});

// Dash tuning. Frame-based to match the existing per-frame physics (~60fps).
// COOLDOWN_FRAMES ~ the dash_roll 4s cooldown; WINDUP/DURATION are the telegraph
// and the high-speed burst. This block is the one stop for dash feel.
const DASH = Object.freeze({
    MULTIPLIER: 6.0,        // dash speed = maxSpeed * MULTIPLIER (ignores the walk cap)
    DURATION_FRAMES: 10,    // length of the high-speed burst (~0.18s @60fps)
    WINDUP_FRAMES: 8,       // telegraph before the burst (~0.12s @60fps)
    MIN_RANGE_PX: 180,      // only dash to CLOSE gaps larger than this
    COOLDOWN_FRAMES: 240,   // dash_roll cooldown (~4s @60fps)
});

// Weapon tuning for the Hero's telegraphed melee slash. The wind-up is the
// "tell" the player reads to dodge or punish; the cooldown keeps it from being
// spammed. Shorter reach than the Boss's sword on purpose (the Boss out-ranges).
const ATTACK = Object.freeze({
    RANGE_PX: 74,         // enter the wind-up when the Boss is within this distance
    WINDUP_FRAMES: 16,    // telegraph before the slash (~0.27s @60fps)
    REACH_PX: 24,         // hitbox center offset BEYOND the Hero's radius
    WIDTH: 42,            // hitbox full width
    HEIGHT: 48,           // hitbox full height
    DURATION_FRAMES: 9,   // active frames of the slash (~0.15s)
    COOLDOWN_FRAMES: 80,  // ~1.33s between slashes (heavy)
    KNOCKBACK: 10,        // horizontal knockback dealt to the Boss on a connect
});

// Dodge tuning. The dodge REUSES the dash burst (so it's gated by dash_roll +
// the shared dash cooldown — Heroes below encounter 5 can't dodge), but unlike
// the gap-closer it skips the wind-up and grants invulnerability frames.
const DODGE = Object.freeze({
    THREAT_RANGE_PX: 130, // only react to a Boss slash thrown within this distance
    IFRAMES: 16,          // i-frames granted by a dodge (outlasts the 10-frame burst)
});

export class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 30;
        this.radius = this.size / 2; // used for circle-based collision tests vs. the Boss
        this.color = '#33ccff';

        // --- Encounter-driven stats (set via applyStats from the progression matrix) ---
        this.maxHp = 50;
        this.hp = this.maxHp;
        this.maxSpeed = 3.5;       // top horizontal pursuit speed for this encounter
        this.attackDamage = 8;     // damage the Hero's WEAPON deals to the Boss

        // Abilities unlocked for this encounter (e.g. "dash_roll"). Injected at spawn.
        this.abilities = new Set();

        // Collision half-extents (used for AABB ground/world resolution in main.js).
        this.halfWidth = this.size / 2;
        this.halfHeight = this.size / 2;

        // --- Velocity & platformer physics ---
        this.velocityX = 0;
        this.velocityY = 0;
        this.gravity = 0.9;
        this.isGrounded = false; // set by ground collision in main.js each frame
        this.facing = 1;         // last horizontal direction faced (+1 right, -1 left)

        // --- Movement FSM (dash_roll, unlocked at encounter 5) ---
        this.moveState = MoveState.WALKING;
        this.dashCooldown = 0; // frames; counts DOWN, <= 0 means ready
        this._dashTimer = 0;   // frames left in the current windup/burst phase
        this._dashDir = 1;
        this._dashIsDodge = false; // tags the active dash as a defensive dodge (for FX)

        // --- Weapon: telegraphed directional slash (the Hero's own hitbox) ---
        this.attackHitbox = new Hitbox({
            reach: this.radius + ATTACK.REACH_PX,
            width: ATTACK.WIDTH,
            height: ATTACK.HEIGHT,
            duration: ATTACK.DURATION_FRAMES,
            cooldown: ATTACK.COOLDOWN_FRAMES,
            damage: this.attackDamage,
            knockback: ATTACK.KNOCKBACK,
        });
        this._attackWindup = 0; // frames left in the attack telegraph

        // --- Dodge i-frames (granted when the Hero rolls away from a Boss slash) ---
        this.iFrames = 0;
        this.iFrameDuration = DODGE.IFRAMES;

        // --- Knockback ---
        // When hit the Hero is briefly stunned and flung away from the Boss so the
        // two bounce apart instead of overlapping and trading damage every frame.
        this.knockbackForce = 11;
        this.knockbackLift = 9;
        this.knockbackFriction = 0.9;
        this.knockbackTimer = 0;       // frames of stun remaining
        this.knockbackDuration = 12;

        // Hit-flash feedback (frames the Hero renders bright white after a hit).
        this.hitFlash = 0;
        this.hitFlashDuration = 8;
    }

    getCenter() {
        return { x: this.x, y: this.y };
    }

    // Apply the current encounter's stats (from hero_progression_matrix.json).
    // `stats` is a `current_encounter_stats` object: { hp, move_speed, attack_damage }.
    // `abilities` is the encounter's `active_mechanics` list (e.g. ["pathfind_melee","dash_roll"]).
    applyStats(stats, abilities = []) {
        if (stats) {
            this.maxHp = stats.hp;
            this.hp = stats.hp;              // resurrect at full HP for the new encounter
            this.maxSpeed = stats.move_speed;
            this.attackDamage = stats.attack_damage;
        }
        this.abilities = new Set(abilities);
        // Keep the weapon's damage in sync with the (now scaled) attack stat.
        if (this.attackHitbox) this.attackHitbox.damage = this.attackDamage;
    }

    // The full gate the AI checks before committing to a (gap-closing) dash.
    canDash(distToPlayer) {
        return (
            this.abilities.has('dash_roll') &&
            this.dashCooldown <= 0 &&
            this.moveState === MoveState.WALKING &&
            this.isGrounded &&
            distToPlayer > DASH.MIN_RANGE_PX
        );
    }

    _startDash(dir) {
        this._dashDir = dir;
        this.facing = dir;
        this._dashIsDodge = false; // this is the aggressive gap-closer, not a dodge
        if (DASH.WINDUP_FRAMES > 0) {
            this.moveState = MoveState.DASH_WINDUP;
            this._dashTimer = DASH.WINDUP_FRAMES;
            this.velocityX = 0; // plant for the telegraph
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
        // Intentionally do NOT zero velocityX — pursuit naturally eases it back down.
    }

    // --- Weapon attack -------------------------------------------------------

    // Gate the AI checks before committing to a telegraphed slash.
    _canAttack(distToPlayer) {
        return (
            this.abilities.has('pathfind_melee') &&
            this.attackHitbox.isReady &&
            this.isGrounded &&
            this.knockbackTimer <= 0 &&
            distToPlayer <= ATTACK.RANGE_PX
        );
    }

    _startAttackWindup(dir) {
        this.facing = dir;
        this.velocityX = 0;
        this.moveState = MoveState.ATTACK_WINDUP;
        this._attackWindup = ATTACK.WINDUP_FRAMES;
    }

    _releaseAttack() {
        this.moveState = MoveState.ATTACKING;
        this.attackHitbox.damage = this.attackDamage; // stay encounter-scaled
        this.attackHitbox.trigger();                  // arms the hitbox for its duration
    }

    // --- Dodge (reactive defense) -------------------------------------------

    /**
     * Defensive reaction: if the Boss is mid-swing and FACING this Hero (and the
     * dash is available), burst AWAY and gain i-frames to slip the strike. Uses
     * the SAME dash resource as the gap-closer, so it shares the 4s cooldown —
     * meaning the player can BAIT a dodge, then punish freely while it recharges.
     * Called once per frame from main.js's handleCombat (so it can react to the
     * Boss's weapon at range, not just on body overlap).
     *
     * @param {Player} player
     * @returns {boolean} true if a dodge started this frame.
     */
    tryDodge(player) {
        if (!player) return false;
        if (this.moveState !== MoveState.WALKING) return false; // committed states can't dodge
        if (!this.abilities.has('dash_roll')) return false;
        if (this.dashCooldown > 0 || !this.isGrounded || this.knockbackTimer > 0) return false;
        if (this.iFrames > 0) return false; // already dodging

        // Only react to a LIVE Boss slash that is actually aimed at us and close.
        const swing = player.attackHitbox;
        if (!swing || !swing.isActive) return false;
        const bossFacingHero = Math.sign(this.x - player.x) === player.facing;
        if (!bossFacingHero) return false;
        if (Math.abs(this.x - player.x) > DODGE.THREAT_RANGE_PX) return false;

        this._startDodge(player);
        return true;
    }

    _startDodge(player) {
        const awayDir = Math.sign(this.x - player.x) || -this.facing; // bolt away from the Boss
        this.facing = -awayDir;            // keep looking at the Boss while back-dashing
        this._dashDir = awayDir;
        this._dashIsDodge = true;
        this.moveState = MoveState.DASHING;
        this._dashTimer = DASH.DURATION_FRAMES;
        this.dashCooldown = DASH.COOLDOWN_FRAMES; // shares the dash cooldown
        this.iFrames = this.iFrameDuration;       // invulnerable through the dodge
        this._attackWindup = 0;                   // cancel any pending attack telegraph
    }

    update(targetX, targetY) {
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.iFrames > 0) this.iFrames--;
        if (this.dashCooldown > 0) this.dashCooldown--;
        this.attackHitbox.tick(); // advance the weapon's active/cooldown timers

        if (this.knockbackTimer > 0) {
            // Stunned by a hit: ride out the knockback velocity (with friction)
            // instead of pursuing, so the Hero visibly bounces off the Boss. A hit
            // also interrupts any in-progress dash OR attack.
            this.knockbackTimer--;
            this.velocityX *= this.knockbackFriction;
            this.moveState = MoveState.WALKING;
            this._dashTimer = 0;
            this._attackWindup = 0;
        } else {
            // Horizontal pursuit along the ground toward the Boss, driven by the
            // movement FSM. Pursuit speed is capped at the encounter's maxSpeed,
            // so the Hero visibly gets faster as the matrix scales it up; the dash
            // (encounter 5+) bursts past that cap to close large gaps.
            const dx = targetX - this.x;
            const dist = Math.abs(dx);
            const dirToPlayer = Math.sign(dx) || 1;

            switch (this.moveState) {
                case MoveState.WALKING: {
                    // Priority: strike if in range, else dash to close a big gap,
                    // else walk toward the Boss.
                    if (this._canAttack(dist)) {
                        this._startAttackWindup(dirToPlayer);
                    } else if (this.canDash(dist)) {
                        this._startDash(dirToPlayer);
                    } else {
                        this.facing = dirToPlayer;
                        this.velocityX = dist > 2 ? dirToPlayer * this.maxSpeed : 0;
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
                    // OVERRIDE: constant high speed, bypassing the walk cap entirely
                    // (this is exactly "ignore walking speed limits during the dash").
                    // Used for BOTH the gap-closer (_dashDir toward) and the dodge
                    // (_dashDir away + i-frames already set).
                    this.velocityX = this._dashDir * this.maxSpeed * DASH.MULTIPLIER;
                    this._dashTimer--;
                    if (this._dashTimer <= 0) this._endDash();
                    break;
                }

                case MoveState.ATTACK_WINDUP: {
                    // Planted telegraph. Facing is LOCKED (set at wind-up start) so
                    // the strike commits to one direction — the Boss can bait it and
                    // slip behind. Releases into the live swing when the timer ends.
                    this.velocityX = 0;
                    this._attackWindup--;
                    if (this._attackWindup <= 0) this._releaseAttack();
                    break;
                }

                case MoveState.ATTACKING: {
                    this.velocityX = 0; // committed to the swing
                    if (!this.attackHitbox.isActive) {
                        this.moveState = MoveState.WALKING; // swing done -> resume pursuit
                    }
                    break;
                }
            }
        }

        this.x += this.velocityX;

        // --- Gravity ---
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        // Keep the slash hitbox glued in front of the Hero after moving.
        this.attackHitbox.reposition(this.x, this.y, this.facing);

        // targetY is reserved for future vertical pursuit (jumping to reach the Boss).
        void targetY;
    }

    get isDashing() { return this.moveState === MoveState.DASHING; }
    get isDodging() { return this.iFrames > 0 && this.moveState === MoveState.DASHING; }

    /**
     * Take a hit from the Boss and bounce away. Honors the dodge i-frame window:
     * while invulnerable the hit is ignored entirely (this is what makes a dodge
     * actually slip a strike). A landed hit also interrupts any dash or attack.
     *
     * @param {number} amount       damage to apply
     * @param {number} knockbackDir -1 / +1 horizontal push direction (away from
     *                              the Boss); 0 falls back to reversing current travel.
     * @returns {boolean} true if the hit landed, false if blocked by i-frames.
     */
    takeDamage(amount, knockbackDir = 0) {
        if (this.iFrames > 0) return false; // dodging / invulnerable -> ignore the hit

        this.hp = Math.max(0, this.hp - amount);
        this.hitFlash = this.hitFlashDuration;

        // A hit interrupts any dash OR attack in progress.
        this.moveState = MoveState.WALKING;
        this._dashTimer = 0;
        this._attackWindup = 0;
        this.attackHitbox.activeTimer = 0; // cancel a live swing (cooldown still applies)

        // Reverse course away from the attacker and pop slightly upward. The stun
        // timer keeps the pursuit logic from instantly cancelling this velocity.
        const dir = knockbackDir !== 0 ? knockbackDir : -Math.sign(this.velocityX || 1);
        this.velocityX = dir * this.knockbackForce;
        this.velocityY = -this.knockbackLift;
        this.isGrounded = false;
        this.knockbackTimer = this.knockbackDuration;
        return true;
    }

    draw(ctx) {
        // Body color doubles as a telegraph. Priority: hit-flash > attack wind-up >
        // dash wind-up > dashing (cyan if dodging, orange if gap-closing) > base.
        let fill;
        if (this.hitFlash > 0) {
            fill = '#ffffff';
        } else if (this.moveState === MoveState.ATTACK_WINDUP) {
            // Pulse toward danger-red as the wind-up completes.
            fill = (Math.floor(performance.now() / 70) % 2) ? '#ff5a3c' : '#ffd23c';
        } else if (this.moveState === MoveState.DASH_WINDUP) {
            fill = (Math.floor(performance.now() / 60) % 2) ? '#ffffff' : '#e23b3b';
        } else if (this.moveState === MoveState.DASHING) {
            fill = this._dashIsDodge ? '#7af0ff' : '#ff7a00';
        } else {
            fill = this.color;
        }

        // Dodge i-frames read as a translucent body + a cyan ghost ring.
        const dodging = this.iFrames > 0;
        ctx.save();
        if (dodging) ctx.globalAlpha = 0.55;
        ctx.fillStyle = fill;
        ctx.shadowBlur = 10;
        ctx.shadowColor = fill;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.restore(); // restores alpha + shadow

        if (dodging) this.drawDodgeAura(ctx);
        if (this.moveState === MoveState.ATTACK_WINDUP) this.drawTelegraph(ctx);
        if (this.moveState === MoveState.ATTACKING) this.drawSwordSwing(ctx);

        this.drawHealthBar(ctx);
    }

    // A red warning arc in the strike direction that "fills" as the wind-up
    // completes — the player's cue to dodge or punish.
    drawTelegraph(ctx) {
        const progress = 1 - this._attackWindup / ATTACK.WINDUP_FRAMES; // 0..1
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

    // Red/orange crescent slash, the mirror of the Boss's golden one, shown while
    // the Hero's hitbox is live.
    drawSwordSwing(ctx) {
        const hb = this.attackHitbox;
        if (!hb.isActive) return;

        const t = hb.swingProgress;
        const swing = -Math.PI * 0.5 + Math.PI * 0.95 * t;
        const pop = Math.sin(Math.PI * t);

        const outerR = this.radius + 34;
        const innerR = this.radius + 12;
        const halfArc = Math.PI * 0.28;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.facing, 1);
        ctx.rotate(swing);
        ctx.globalAlpha = 0.35 + 0.65 * pop;

        const grad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
        grad.addColorStop(0, 'rgba(255, 90, 40, 0.10)');
        grad.addColorStop(1, 'rgba(255, 120, 40, 0.95)');

        ctx.beginPath();
        ctx.arc(0, 0, outerR, -halfArc, halfArc);
        ctx.arc(0, 0, innerR, halfArc, -halfArc, true);
        ctx.closePath();
        ctx.shadowBlur = 16;
        ctx.shadowColor = 'rgba(255, 80, 30, 0.9)';
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 220, 200, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, outerR, -halfArc, halfArc);
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

    // Floating HP bar above the Hero so the fight stays readable.
    drawHealthBar(ctx) {
        const barWidth = 44;
        const barHeight = 6;
        const x = this.x - barWidth / 2;
        const y = this.y - this.size / 2 - 14;
        const pct = Math.max(0, this.hp / this.maxHp);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

        ctx.fillStyle = '#33ccff';
        ctx.fillRect(x, y, barWidth * pct, barHeight);
    }
}
