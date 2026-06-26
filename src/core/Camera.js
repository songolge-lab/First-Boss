// src/core/Camera.js
// ---------------------------------------------------------------------------
// Center-based 2D camera with two modes:
//   FOLLOW - frame-rate-independent exponential smoothing toward a target.
//            Used during normal gameplay. Feels organic & responsive.
//   PAN    - a TIMED, eased tween from point A -> B that fires an onComplete
//            callback when it arrives. Used for the cinematic spawn sequence.
//   IDLE   - holds a fixed point (e.g. focused on the enemy while the UI is up).
//
// Coordinate model: (this.x, this.y) is the CENTER of the view in WORLD space.
// That makes "center on entity X" trivial: just panTo(entity.getCenter()).
//
// Why a tween for the cinematics instead of plain lerp-to-target?
//   Lerp-to-target asymptotically approaches and never quite arrives, so the
//   duration is undefined and you need an epsilon check to know when you're
//   "done". A cinematic wants PRECISE, repeatable timing and an exact end, so
//   the pans use a fixed-duration eased tween. Normal follow still uses lerp,
//   because there "good enough, organic" beats "exact".
// ---------------------------------------------------------------------------

export const CameraMode = Object.freeze({
  FOLLOW: 'FOLLOW',
  PAN: 'PAN',
  IDLE: 'IDLE',
});

// Smooth acceleration in, smooth deceleration out. The classic "cinematic" curve.
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const lerp = (a, b, t) => a + (b - a) * t;

export class Camera {
  /**
   * @param {number} viewportWidth  canvas width in px
   * @param {number} viewportHeight canvas height in px
   * @param {{minX:number,minY:number,maxX:number,maxY:number}|null} worldBounds
   */
  constructor(viewportWidth, viewportHeight, worldBounds = null) {
    this.vw = viewportWidth;
    this.vh = viewportHeight;
    this.bounds = worldBounds;

    this.x = 0; // center X (world)
    this.y = 0; // center Y (world)

    this.mode = CameraMode.IDLE;

    // FOLLOW config
    this.followTarget = null; // anything with getCenter() or {x,y,width,height}
    this.followStiffness = 6; // higher = snappier; used as 1 - e^(-k*dt)

    // PAN state
    this._pan = {
      startX: 0, startY: 0,
      endX: 0, endY: 0,
      elapsed: 0, duration: 1,
      onComplete: null, done: false,
    };
  }

  // --- public API ----------------------------------------------------------

  /** Lock onto a target and smoothly follow it. snap=true jumps there instantly. */
  follow(target, { snap = false } = {}) {
    this.followTarget = target;
    this.mode = CameraMode.FOLLOW;
    if (snap) {
      const c = this._centerOf(target);
      this.x = c.x; this.y = c.y;
      this._clampToBounds();
    }
  }

  /**
   * Cinematic tween to a world point over `duration` seconds.
   * Fires `onComplete` exactly once on arrival, then switches to IDLE (holds end).
   * The onComplete callback is how the game's state machine learns "pan finished".
   */
  panTo(point, duration = 1.0, onComplete = null) {
    const end = this._clampPoint(point.x, point.y);
    this._pan.startX = this.x;
    this._pan.startY = this.y;
    this._pan.endX = end.x;
    this._pan.endY = end.y;
    this._pan.elapsed = 0;
    this._pan.duration = Math.max(0.0001, duration);
    this._pan.onComplete = onComplete;
    this._pan.done = false;
    this.mode = CameraMode.PAN;
  }

  // Keep the viewport in sync with a canvas resize. (Added so the existing
  // window-resize handler in main.js keeps working with the new camera.)
  resize(viewportWidth, viewportHeight) {
    this.vw = viewportWidth;
    this.vh = viewportHeight;
  }

  update(dt) {
    switch (this.mode) {
      case CameraMode.FOLLOW: this._updateFollow(dt); break;
      case CameraMode.PAN:    this._updatePan(dt);    break;
      case CameraMode.IDLE:   /* hold position */     break;
    }
  }

  /** Apply world->screen transform. Call inside ctx.save()/restore() before drawing the world. */
  applyTransform(ctx) {
    // Math.round avoids sub-pixel shimmer on tilemaps/sprites.
    ctx.translate(
      Math.round(-(this.x - this.vw / 2)),
      Math.round(-(this.y - this.vh / 2)),
    );
  }

  worldToScreen(wx, wy) {
    return { x: wx - (this.x - this.vw / 2), y: wy - (this.y - this.vh / 2) };
  }
  screenToWorld(sx, sy) {
    return { x: sx + (this.x - this.vw / 2), y: sy + (this.y - this.vh / 2) };
  }

  // --- internals -----------------------------------------------------------

  _updateFollow(dt) {
    if (!this.followTarget) return;
    const c = this._centerOf(this.followTarget);
    // Frame-rate-independent damping: identical feel at 30fps and 144fps.
    const t = 1 - Math.exp(-this.followStiffness * dt);
    this.x = lerp(this.x, c.x, t);
    this.y = lerp(this.y, c.y, t);
    this._clampToBounds();
  }

  _updatePan(dt) {
    const p = this._pan;
    p.elapsed += dt;
    const raw = Math.min(p.elapsed / p.duration, 1);
    const e = easeInOutCubic(raw);
    this.x = lerp(p.startX, p.endX, e);
    this.y = lerp(p.startY, p.endY, e);
    if (raw >= 1 && !p.done) {
      p.done = true;
      this.mode = CameraMode.IDLE; // hold on the focus point while UI plays
      if (typeof p.onComplete === 'function') p.onComplete();
    }
  }

  _centerOf(target) {
    if (typeof target.getCenter === 'function') return target.getCenter();
    return {
      x: target.x + (target.width || 0) / 2,
      y: target.y + (target.height || 0) / 2,
    };
  }

  // Keep the viewport inside the world. If the world is smaller than the
  // viewport on an axis, center on that axis instead.
  _clampPoint(x, y) {
    if (!this.bounds) return { x, y };
    const b = this.bounds;
    const halfW = this.vw / 2, halfH = this.vh / 2;
    let cx, cy;
    if (b.maxX - b.minX > this.vw) cx = Math.min(Math.max(x, b.minX + halfW), b.maxX - halfW);
    else cx = (b.minX + b.maxX) / 2;
    if (b.maxY - b.minY > this.vh) cy = Math.min(Math.max(y, b.minY + halfH), b.maxY - halfH);
    else cy = (b.minY + b.maxY) / 2;
    return { x: cx, y: cy };
  }

  _clampToBounds() {
    const c = this._clampPoint(this.x, this.y);
    this.x = c.x; this.y = c.y;
  }
}
