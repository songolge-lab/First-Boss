// src/combat/Hitbox.js
// ---------------------------------------------------------------------------
// A directional, temporary weapon hitbox — the core primitive of the weapon-
// based combat model. It is OWNED and driven by an entity (the Boss or the
// Hero): the owner ticks it every frame, repositions it in front of itself
// (in the facing direction), and `trigger()`s it to start a swing.
//
// Conventions match the rest of the game:
//   - Frame-based timing: durations / cooldowns are counted in frames (~60fps),
//     NOT seconds — exactly like Enemy's dash tuning.
//   - (x, y) is the CENTER of the hitbox.
//   - Overlap tests are AABB against entities exposing {x, y, halfWidth, halfHeight}
//     (the same shape main.js's entitiesIntersect() already relies on).
//
// One swing damages a given target at most once: `_hitSet` is cleared on every
// trigger() and the collision resolver in main.js marks targets via
// hasHit()/markHit(), so a multi-frame active window can't re-hit each frame.
// ---------------------------------------------------------------------------

export class Hitbox {
    /**
     * @param {object}  cfg
     * @param {number}  cfg.reach      distance from the owner's center to the hitbox center
     * @param {number}  cfg.width      hitbox width  (full extent)
     * @param {number}  cfg.height     hitbox height (full extent)
     * @param {number}  cfg.duration   active frames per swing
     * @param {number}  cfg.cooldown   frames before it can fire again
     * @param {number}  cfg.damage     damage dealt on a connect (can be overwritten per-swing)
     * @param {number} [cfg.knockback] horizontal knockback applied on a connect
     */
    constructor({ reach, width, height, duration, cooldown, damage, knockback = 0 }) {
        this.reach = reach;
        this.width = width;
        this.height = height;
        this.halfWidth = width / 2;
        this.halfHeight = height / 2;

        this.duration = duration;
        this.cooldown = cooldown;
        this.damage = damage;
        this.knockback = knockback;

        // Runtime timers (frames).
        this.activeTimer = 0;   // > 0 while the swing is live
        this.cooldownTimer = 0; // > 0 while recharging

        // Current world placement (center), refreshed each frame by reposition().
        this.x = 0;
        this.y = 0;
        this.facing = 1;

        // Targets already damaged by the CURRENT swing (cleared on trigger()).
        this._hitSet = new Set();
    }

    get isActive() { return this.activeTimer > 0; }
    get isReady() { return this.cooldownTimer <= 0 && this.activeTimer <= 0; }

    /** 0..1 — how far through the active swing we are (0 at start, 1 at end). */
    get swingProgress() {
        return this.duration > 0 ? 1 - this.activeTimer / this.duration : 1;
    }

    /** Start a swing if off cooldown and not already active. Returns success. */
    trigger() {
        if (!this.isReady) return false;
        this.activeTimer = this.duration;
        this.cooldownTimer = this.cooldown;
        this._hitSet.clear();
        return true;
    }

    /** Advance timers one frame (position-independent). Call every frame. */
    tick() {
        if (this.cooldownTimer > 0) this.cooldownTimer--;
        if (this.activeTimer > 0) this.activeTimer--;
    }

    /** Glue the hitbox to the owner, in front of it along `facing`. */
    reposition(ownerX, ownerY, facing) {
        this.facing = facing;
        this.x = ownerX + facing * this.reach;
        this.y = ownerY;
    }

    /** AABB overlap vs an entity {x, y, halfWidth, halfHeight}. False when inactive. */
    overlaps(entity) {
        if (this.activeTimer <= 0) return false;
        return (
            Math.abs(this.x - entity.x) < this.halfWidth + entity.halfWidth &&
            Math.abs(this.y - entity.y) < this.halfHeight + entity.halfHeight
        );
    }

    hasHit(target) { return this._hitSet.has(target); }
    markHit(target) { this._hitSet.add(target); }

    /** Optional: translucent box showing the active hitbox region (debugging). */
    drawDebug(ctx) {
        if (this.activeTimer <= 0) return;
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x - this.halfWidth, this.y - this.halfHeight, this.width, this.height);
        ctx.restore();
    }
}
