// src/entities/Enemy.js
// ---------------------------------------------------------------------------
// The Hero (AI enemy). Pursues the Boss horizontally along the ground. Stats
// (hp / move_speed / attack_damage) and the ability list are INJECTED at spawn
// from the Hero Progression Matrix, so encounter 5's spawn automatically arrives
// dash-capable with no special-casing here.
//
// Movement is a small finite-state machine layered on top of the existing
// frame-based pursuit + knockback:
//
//     WALKING --(can dash)--> DASH_WINDUP --(timer)--> DASHING --(timer)--> WALKING
//
// NOTE on conventions (kept from the original Enemy so Player.js / Input.js /
// main.js collision code all stay valid):
//   - (this.x, this.y) is the CENTER of the entity (not top-left).
//   - Physics is FRAME-BASED: velocities are added once per frame; dash timings
//     are expressed in frames, not seconds. (The blueprint's dt-seconds dash was
//     translated into this model.)
// ---------------------------------------------------------------------------

export const MoveState = Object.freeze({
    WALKING: 'WALKING',
    DASH_WINDUP: 'DASH_WINDUP', // brief telegraph so the dash is reactable / fair
    DASHING: 'DASHING',
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
        this.attackDamage = 8;     // contact damage dealt to the Boss

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

        // --- Knockback (Mutual-Contact Trade) ---
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
    }

    // The full gate the AI checks before committing to a dash.
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

    update(targetX, targetY) {
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.dashCooldown > 0) this.dashCooldown--;

        if (this.knockbackTimer > 0) {
            // Stunned by a hit: ride out the knockback velocity (with friction)
            // instead of pursuing, so the Hero visibly bounces off the Boss. A hit
            // also interrupts any in-progress dash.
            this.knockbackTimer--;
            this.velocityX *= this.knockbackFriction;
            this.moveState = MoveState.WALKING;
            this._dashTimer = 0;
        } else {
            // Horizontal pursuit along the ground toward the Boss, now driven by
            // the movement FSM. Pursuit speed is capped at the encounter's maxSpeed,
            // so the Hero visibly gets faster as the matrix scales it up; the dash
            // (encounter 5+) bursts past that cap to close large gaps.
            const dx = targetX - this.x;
            const dist = Math.abs(dx);
            const dirToPlayer = Math.sign(dx) || 1;

            switch (this.moveState) {
                case MoveState.WALKING: {
                    if (this.canDash(dist)) {
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
                    this.velocityX = this._dashDir * this.maxSpeed * DASH.MULTIPLIER;
                    this._dashTimer--;
                    if (this._dashTimer <= 0) this._endDash();
                    break;
                }
            }
        }

        this.x += this.velocityX;

        // --- Gravity ---
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        // targetY is reserved for future vertical pursuit (jumping to reach the Boss).
        void targetY;
    }

    get isDashing() { return this.moveState === MoveState.DASHING; }

    /**
     * Take a hit from the Boss and bounce away (the Hero's half of the trade).
     *
     * @param {number} amount       damage to apply
     * @param {number} knockbackDir -1 / +1 horizontal push direction (away from
     *                              the Boss); 0 falls back to reversing current travel.
     */
    takeDamage(amount, knockbackDir = 0) {
        this.hp = Math.max(0, this.hp - amount);
        this.hitFlash = this.hitFlashDuration;

        // A hit interrupts any dash in progress.
        this.moveState = MoveState.WALKING;
        this._dashTimer = 0;

        // Reverse course away from the attacker and pop slightly upward. The stun
        // timer keeps the pursuit logic from instantly cancelling this velocity.
        const dir = knockbackDir !== 0 ? knockbackDir : -Math.sign(this.velocityX || 1);
        this.velocityX = dir * this.knockbackForce;
        this.velocityY = -this.knockbackLift;
        this.isGrounded = false;
        this.knockbackTimer = this.knockbackDuration;
    }

    draw(ctx) {
        // Color doubles as a visual telegraph for the dash. Hit-flash wins so a
        // landed hit always reads as white regardless of dash state.
        let fill;
        if (this.hitFlash > 0) {
            fill = '#ffffff';
        } else if (this.moveState === MoveState.DASH_WINDUP) {
            fill = (Math.floor(performance.now() / 60) % 2) ? '#ffffff' : '#e23b3b';
        } else if (this.moveState === MoveState.DASHING) {
            fill = '#ff7a00';
        } else {
            fill = this.color;
        }

        ctx.fillStyle = fill;
        ctx.shadowBlur = 10;
        ctx.shadowColor = fill;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.shadowBlur = 0;

        this.drawHealthBar(ctx);
    }

    // Floating HP bar above the Hero so the mutual-contact trade is visible.
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
