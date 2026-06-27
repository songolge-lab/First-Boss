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


// src/entities/Enemy.js
// ---------------------------------------------------------------------------
// The Hero (AI enemy). Pursues the player horizontally. At Encounter 5 it gains
// the "dash_roll" ability. Movement is a small finite-state machine:
//
//     WALKING --(can dash)--> DASH_WINDUP --(timer)--> DASHING --(timer)--> WALKING
//
// Stats (hp/move_speed/attack_damage) and the ability list are INJECTED at spawn
// from the Hero Progression Matrix, so encounter 5's spawn automatically arrives
// dash-capable with no special-casing here.
// ---------------------------------------------------------------------------

export const MoveState = Object.freeze({
  WALKING: 'WALKING',
  DASH_WINDUP: 'DASH_WINDUP', // brief telegraph so the dash is reactable / fair
  DASHING: 'DASHING',
});

// Dash tuning. COOLDOWN matches the dash_roll spec (4s). Set WINDUP to 0 to
// remove the telegraph. None of these are referenced anywhere else, so this
// block is your one stop for dash feel.
const DASH = Object.freeze({
  MULTIPLIER: 6.0,    // dash speed = walkSpeed * MULTIPLIER (ignores the walk cap)
  DURATION: 0.18,     // length of the high-speed burst (s)
  WINDUP: 0.12,       // telegraph before the burst (s)
  MIN_RANGE_PX: 180,  // only dash to CLOSE gaps larger than this
  COOLDOWN_S: 4.0,    // dash_roll cooldown
});

const GRAVITY = 2000;    // px/s^2
const WALK_ACCEL = 1400; // px/s^2 — how fast velocity eases toward walk speed

// Progression-matrix "units" -> pixels. Keep this identical to main.js.
const UNIT_TO_PX = 32;

// Move `current` toward `target` by at most `maxDelta`, no overshoot.
// This is our acceleration AND friction in one function: it eases velocity
// toward the desired walk velocity. After a dash it naturally "skids" the
// high velocity back down to walk speed instead of hard-snapping.
function approach(current, target, maxDelta) {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

export class Enemy {
  /**
   * @param {object}   cfg
   * @param {number}   cfg.x
   * @param {number}   cfg.y
   * @param {{hp:number, move_speed:number, attack_damage:number}} cfg.stats
   * @param {string[]} cfg.abilities   e.g. ["pathfind_melee","dash_roll"]
   * @param {number}   [cfg.groundY]   world Y of the ground surface
   */
  constructor({ x, y, stats, abilities = [], groundY }) {
    this.x = x; this.y = y;
    this.width = 40; this.height = 56;
    this.vx = 0; this.vy = 0;
    this.groundY = groundY ?? (y + this.height);
    this.grounded = true;
    this.facing = 1;

    // Injected progression data
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.walkSpeed = stats.move_speed * UNIT_TO_PX; // px/s
    this.attackDamage = stats.attack_damage;
    this.abilities = new Set(abilities);

    // Movement FSM
    this.moveState = MoveState.WALKING;
    this.dashCooldown = 0; // counts DOWN; <= 0 means ready
    this._dashTimer = 0;   // time left in current windup/burst phase
    this._dashDir = 1;

    this.isDead = false;
  }

  getCenter() {
    return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
  }

  // The full gate the AI checks before committing to a dash.
  canDash(distToPlayer) {
    return (
      this.abilities.has('dash_roll') &&
      this.dashCooldown <= 0 &&
      this.moveState === MoveState.WALKING &&
      this.grounded &&
      distToPlayer > DASH.MIN_RANGE_PX
    );
  }

  _startDash(dir) {
    this._dashDir = dir;
    this.facing = dir;
    if (DASH.WINDUP > 0) {
      this.moveState = MoveState.DASH_WINDUP;
      this._dashTimer = DASH.WINDUP;
      this.vx = 0; // plant for the telegraph
    } else {
      this._enterBurst();
    }
  }

  _enterBurst() {
    this.moveState = MoveState.DASHING;
    this._dashTimer = DASH.DURATION;
  }

  _endDash() {
    this.moveState = MoveState.WALKING;
    this.dashCooldown = DASH.COOLDOWN_S;
    // Intentionally do NOT zero vx — approach() skids it back down to walk speed.
  }

  /**
   * @param {number} dt
   * @param {{x:number,y:number,width:number,height:number}} player
   */
  update(dt, player) {
    if (this.isDead) return;

    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    const playerCx = player.x + player.width / 2;
    const selfCx = this.x + this.width / 2;
    const dx = playerCx - selfCx;
    const dist = Math.abs(dx);
    const dirToPlayer = Math.sign(dx) || 1;

    switch (this.moveState) {
      case MoveState.WALKING: {
        if (this.canDash(dist)) {
          this._startDash(dirToPlayer);
        } else {
          // Normal pursuit: ease velocity toward walk speed toward the player.
          this.facing = dirToPlayer;
          const desired = dirToPlayer * this.walkSpeed;
          this.vx = approach(this.vx, desired, WALK_ACCEL * dt);
        }
        break;
      }

      case MoveState.DASH_WINDUP: {
        this._dashTimer -= dt;
        this.vx = 0; // frozen telegraph
        if (this._dashTimer <= 0) this._enterBurst();
        break;
      }

      case MoveState.DASHING: {
        // OVERRIDE: constant high speed. We bypass approach() entirely here,
        // which is exactly what "ignore walking friction & speed limits" means.
        this.vx = this._dashDir * this.walkSpeed * DASH.MULTIPLIER;
        this._dashTimer -= dt;
        if (this._dashTimer <= 0) this._endDash();
        break;
      }
    }

    // --- platformer vertical physics (gravity + ground) ---
    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y + this.height >= this.groundY) {
      this.y = this.groundY - this.height;
      this.vy = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }
  }

  get isDashing() { return this.moveState === MoveState.DASHING; }

  render(ctx) {
    // Placeholder draw — swap for your sprite/animation.
    // Color states double as a visual telegraph for the dash.
    if (this.moveState === MoveState.DASH_WINDUP) {
      ctx.fillStyle = (Math.floor(performance.now() / 60) % 2) ? '#ffffff' : '#e23b3b';
    } else if (this.moveState === MoveState.DASHING) {
      ctx.fillStyle = '#ff7a00';
    } else {
      ctx.fillStyle = '#c0392b';
    }
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}


// src/main.js
// ---------------------------------------------------------------------------
// Game orchestrator + cinematic spawn STATE MACHINE.
//
// Kill flow:
//   PLAYING --(enemy.hp<=0)--> ENEMY_DEAD --(hit-stop ends)--> PAN_TO_ENEMY
//      --(camera arrives)--> NEMESIS_UI --(3s)--> PAN_TO_PLAYER
//      --(camera arrives)--> PLAYING
//
// THE KEY ARCHITECTURAL RULE:
//   World logic (player input, enemy AI, collisions) runs ONLY in PLAYING.
//   The camera, the UI animation, and rendering run EVERY frame in EVERY state.
//   That separation is what lets the camera pan smoothly *while the gameplay is
//   frozen* during the 3-second focus. No separate "cinematic loop" needed.
//
// State transitions are driven two ways:
//   - timers (hit-stop, the 3s UI hold)
//   - camera.panTo(...) onComplete callbacks (so the FSM and Camera stay
//     decoupled: the camera just reports "I arrived").
// ---------------------------------------------------------------------------

import { Camera } from './core/Camera.js';
import { Enemy } from './entities/Enemy.js';

// --- Assumed to already exist in your project (adjust import paths) ---------
//   Player:    needs getCenter() OR {x,y,width,height}, update(dt), render(ctx), takeDamage(n)
//   NemesisUI: needs show(data), hide(), update(dt), render(ctx)   (screen-space)
import { Player } from './entities/Player.js';
import { NemesisUI } from './ui/NemesisUI.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- world + cinematic config ---------------------------------------------
const WORLD = { minX: 0, minY: 0, maxX: 4000, maxY: 720 };
const GROUND_Y = 640;
const ENEMY_SPAWN_X = WORLD.minX + 80; // far left
const ENEMY_H = 56;

const PAN_DURATION = 1.1; // seconds per cinematic pan
const HITSTOP_S = 0.35;   // beat to register the kill before the camera leaves
const NEMESIS_UI_S = 3.0; // focused pause length
const BOSS_CONTACT_DMG = 50;
const CONTACT_COOLDOWN_S = 0.4; // so one "touch" registers once, not every frame
const UNIT_TO_PX = 32;          // keep identical to Enemy.js

export const State = Object.freeze({
  PLAYING: 'PLAYING',
  ENEMY_DEAD: 'ENEMY_DEAD',
  PAN_TO_ENEMY: 'PAN_TO_ENEMY',
  NEMESIS_UI: 'NEMESIS_UI',
  PAN_TO_PLAYER: 'PAN_TO_PLAYER',
});

const game = {
  state: null,
  player: null,
  enemy: null,
  camera: null,
  ui: null,
  progression: null,    // loaded JSON matrix
  encounterIndex: 0,    // 0-based index into progression.encounters
  _timer: 0,
  _contactCd: 0,
};

// --- spawning --------------------------------------------------------------

function spawnEnemyForCurrentEncounter() {
  const idx = Math.min(game.encounterIndex, game.progression.encounters.length - 1);
  const data = game.progression.encounters[idx];
  const enemy = new Enemy({
    x: ENEMY_SPAWN_X,
    y: GROUND_Y - ENEMY_H,
    groundY: GROUND_Y,
    stats: data.current_encounter_stats,   // { hp, move_speed, attack_damage }
    abilities: data.active_mechanics,       // includes "dash_roll" from encounter 5
  });
  return { enemy, data };
}

// --- state machine ---------------------------------------------------------

const states = {
  [State.PLAYING]: {
    enter() { game.camera.follow(game.player); },
    update(dt) {
      game.player.update(dt);
      game.enemy.update(dt, game.player);
      handleContact(dt);
      if (game.enemy.hp <= 0) changeState(State.ENEMY_DEAD);
    },
  },

  // Transient "death moment": a short hit-stop, then spawn next + kick off the pan.
  [State.ENEMY_DEAD]: {
    enter() {
      game._timer = HITSTOP_S;
      game.enemy.isDead = true; // freeze the corpse; we despawn after the beat
      // spawnDeathFX(game.enemy.getCenter());
    },
    update(dt) {
      game._timer -= dt;
      if (game._timer <= 0) {
        game.enemy = null;             // despawn old
        game.encounterIndex++;         // advance the run
        // TODO: if encounterIndex >= encounters.length -> trigger end-of-run here.
        game.enemy = spawnEnemyForCurrentEncounter().enemy; // new enemy waits, frozen, far left
        game.camera.panTo(
          game.enemy.getCenter(),
          PAN_DURATION,
          () => changeState(State.NEMESIS_UI), // fires when the pan arrives
        );
        changeState(State.PAN_TO_ENEMY);
      }
    },
  },

  // World frozen; just wait for the camera onComplete (-> NEMESIS_UI).
  [State.PAN_TO_ENEMY]: { update() {} },

  // Focused on the enemy. Show the Nemesis card (the +/- overlay), hold 3s.
  [State.NEMESIS_UI]: {
    enter() {
      game._timer = NEMESIS_UI_S;
      const data = game.progression.encounters[game.encounterIndex];
      game.ui.show({
        encounter: data.encounter_id,
        previous: data.previous_encounter_stats,
        current: data.current_encounter_stats,
        delta: data.stat_delta,            // pre-computed signed diffs
        deltaPct: data.stat_delta_pct,
        legendary: data.legendary_item,    // non-null -> play Legendary VFX
        unlocked: data.unlocked_mechanic,  // non-null -> "Ability Unlocked" banner
      });
    },
    update(dt) {
      game.ui.update(dt);
      game._timer -= dt;
      if (game._timer <= 0) {
        game.ui.hide();
        game.camera.panTo(
          game.player.getCenter(),
          PAN_DURATION,
          () => changeState(State.PLAYING), // PLAYING.enter() re-attaches follow
        );
        changeState(State.PAN_TO_PLAYER);
      }
    },
  },

  // Wait for the camera onComplete (-> PLAYING). No snap: the player is frozen,
  // so the pan's end point equals where FOLLOW wants the camera. Seamless handoff.
  [State.PAN_TO_PLAYER]: { update() {} },
};

function changeState(next) {
  const prev = game.state;
  if (states[prev] && states[prev].exit) states[prev].exit();
  game.state = next;
  if (states[next] && states[next].enter) states[next].enter();
}

// --- contact / combat (minimal; plug your real combat in here) -------------

function handleContact(dt) {
  if (game._contactCd > 0) game._contactCd -= dt;
  if (game._contactCd > 0) return;

  if (aabb(game.player, game.enemy)) {
    game.enemy.hp -= BOSS_CONTACT_DMG;          // the Boss (player) one-touch model
    // game.player.takeDamage(game.enemy.attackDamage); // enemy hurts the Boss
    game._contactCd = CONTACT_COOLDOWN_S;        // discrete "touch", matches the GDD model
  }
}

function aabb(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

// --- render (runs every frame, all states) ---------------------------------

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  game.camera.applyTransform(ctx); // world-space below this line
  drawWorld(ctx);
  ctx.restore();

  // Screen-space overlays — NOT affected by the camera transform:
  if (game.state === State.NEMESIS_UI) game.ui.render(ctx);
  // drawHUD(ctx);
}

function drawWorld(ctx) {
  ctx.fillStyle = '#23252b';
  ctx.fillRect(WORLD.minX, GROUND_Y, WORLD.maxX - WORLD.minX, WORLD.maxY - GROUND_Y);
  if (game.enemy) game.enemy.render(ctx);
  game.player.render(ctx);
}

// --- boot + main loop ------------------------------------------------------

async function init() {
  // Vanilla-ESM-safe JSON load (works without import-assertion syntax quirks).
  game.progression = await fetch('./data/hero_progression_matrix.json').then((r) => r.json());

  game.camera = new Camera(canvas.width, canvas.height, WORLD);
  game.player = new Player({ x: 600, y: GROUND_Y - ENEMY_H, groundY: GROUND_Y });
  game.ui = new NemesisUI(canvas.width, canvas.height);

  game.enemy = spawnEnemyForCurrentEncounter().enemy; // encounter 1

  game.camera.follow(game.player, { snap: true });
  game.state = State.PLAYING;
  states[State.PLAYING].enter();

  requestAnimationFrame(loop);
}

let _last = performance.now();
function loop(now) {
  let dt = (now - _last) / 1000;
  _last = now;
  dt = Math.min(dt, 1 / 30); // clamp so a backgrounded tab can't produce a huge step

  states[game.state].update(dt); // world only advances in PLAYING
  game.camera.update(dt);        // ALWAYS — this is what animates the pans
  render();

  requestAnimationFrame(loop);
}

init();
