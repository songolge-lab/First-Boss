# Reverse Boss Game — Project Reference

## Core Premise

The game is a **2D side-scrolling platformer with gravity** (think *Hollow Knight*), **not** a top-down game.

The **Player is the Final Boss**. The AI-controlled **Hero** is the one who resurrects, scales up, and becomes increasingly dangerous over 30 encounters. The player (Boss) must survive an ever-growing threat using horizontal movement, jumping, positioning, **directional weapon strikes** (Sword/Scythe slashes), and **reactive dodge rolls**. The Boss has 1000 HP and a top horizontal speed of 10.0.

## Theme & Aesthetic

- **Dark Fantasy / Medieval Action** aesthetic, in the vein of *Hollow Knight* — moody, atmospheric, and weighty.
- Combat should **feel heavy and physical**: weapon strikes have wind-up, commitment, and impact rather than instant, weightless taps.
- **UI styling is intentionally flexible right now** — don't over-invest in visual chrome (overlay theme, fonts, colors). The current glassmorphism/dark overlay in `styles/style.css` is a placeholder and is expected to change. Spend effort on **gameplay feel**, not UI polish.

## Tech Stack

- **Pure Vanilla JS** + HTML5 Canvas — no frameworks, no build tools
- **Modular ES6** imports (`type="module"` in index.html)
- **File structure:**
  - `src/main.js` — game loop, world/floor geometry, gravity & ground collision, collision, state machine (`PLAYING` / `RESPAWNING`)
  - `src/entities/Player.js` — the Boss (player-controlled: A/D or ←/→ to move, Space/W/↑ to jump; gravity + jump physics)
  - `src/entities/Enemy.js` — the Hero (AI, gravity-bound, chases the Boss horizontally along the ground)
  - `src/core/Input.js` — horizontal movement axis + edge-detected jump
  - `src/core/Camera.js` — side-scroll lerp-follow camera with a stable floor horizon
  - `src/ui/UIManager.js` — Nemesis overlay DOM manipulation
  - `src/utils/math.js` — `lerp()`, `distance()`
  - `styles/style.css` — glassmorphism overlay, dark theme

## Platformer Physics

- The world is a wide arena (`WORLD_WIDTH`) with a single solid **floor** rectangle across the bottom (`floor` in `main.js`). Invisible side walls clamp entities to the world bounds.
- Both the Boss and the Hero have `velocityX`, `velocityY`, `gravity`, and `isGrounded`. The Boss additionally has `jumpForce`.
- **Gravity** is applied every frame in each entity's `update()`; the Boss uses stronger gravity while falling (`gravity * 1.4`) for a snappy, non-floaty feel.
- **Jumping** is only permitted when `isGrounded` is `true`. Jump height is variable: releasing the jump key mid-rise cuts upward velocity (short hops vs. full hops).
- **Ground detection** is basic AABB in `main.js` (`resolveFloorCollision`): when an entity's feet reach the floor surface it snaps to the floor, zeroes `velocityY`, and sets `isGrounded = true`.
- The camera follows the Boss horizontally and anchors the floor low on screen so the horizon stays stable during jumps.

## Combat Model (Weapon-Based)

> **Mutual body-contact damage has been removed.** Touching the Hero no longer damages anyone. All damage now comes from explicit attacks with directional hitboxes.

- **Directional Weapon Hitboxes** — the Boss attacks with a Sword/Scythe slash that spawns a transient hitbox in the facing direction. A strike connects only when its hitbox overlaps a target during its active frames; the same applies to the Hero's melee. Strikes are heavy and committed (wind-up + recovery) so positioning and timing matter.
- **Dodge Rolls (i-frames)** — a reactive roll granting a short invulnerability window, letting the Boss pass through incoming strikes. This replaces the old contact hit-flash i-frames as the Boss's primary defensive tool.
- **AI Decision Logic** — the Hero chooses between approach, attack, feint, and retreat based on range, cooldowns, and the Boss's state, instead of blindly bee-lining into a contact trade.

## Balancing Rules (from `hero_progression_matrix.json`)

All formulas use encounter number `n` (1–30):

| Stat           | Curve        | Formula                                    | Notes                                        |
|----------------|--------------|---------------------------------------------|----------------------------------------------|
| **HP**         | Quadratic    | `50 + 3*(n-1)^2`                            | Grows fast; encounter 30 = 4474 HP           |
| **Move Speed** | Logarithmic  | `3.5 + 1.75*ln(n)` hard-capped at **9.8**  | Caps at encounter 11 (Galewalker Boots)      |
| **Attack**     | Exponential  | `8 * 1.10^(n-1)`                            | encounter 30 = 306.5 damage                  |

### Legendary Drops (stat spikes)

| Encounter | Item                    | Effects                                   |
|-----------|-------------------------|-------------------------------------------|
| 4         | Bloodthirst Greatblade  | +50% Attack, +60 HP                       |
| 11        | Galewalker Boots        | +30% Move Speed (capped), +100 HP         |
| 18        | Aegis of the Titan      | x1.5 HP, +15% Attack                      |
| 25        | Crown of the Fallen King| +40% Attack, +15% Speed (capped), +250 HP |

### Hero Mechanic Unlock Order

1. **Enc 1** — `pathfind_melee`: Pursuit & Melee Strike (directional weapon hitbox — **not** contact damage)
2. **Enc 3** — `telegraph_awareness`: Leads pathing toward predicted position (250ms)
3. **Enc 5** — `dash_roll`: Burst movement gap-closer (4s CD, 6 units)
4. **Enc 8** — `feint`: Cancels dash mid-animation to bait dodges (300ms window)
5. **Enc 12** — `invuln_shield`: 2s immunity, 12s cooldown
6. **Enc 15** — `adaptive_pathing`: Uses cover, avoids traps, stops self-cornering
7. **Enc 20** — `ranged_projectile`: 60% attack damage, speed 14, 3s cooldown
8. **Enc 23** — `multishot`: 3-shot spread, 20-degree cone
9. **Enc 27** — `enrage`: Below 25% HP => +20% speed, +30% attack for 6s
10. **Enc 30** — `apex_predator` (capstone): Dash trails deal 20% DPS, projectiles gain 0.15 homing

## UI Contract: Nemesis Overlay

The respawn overlay **must** be driven by `stat_delta` (signed numeric diff) and `stat_delta_pct` (percentage change) from the encounter data, not hardcoded values.

- `previous_encounter_stats` is `null` on encounter 1 (first spawn, no diff to show)
- On every subsequent death, the overlay renders the signed delta for HP, Speed, and Attack
- Currently uses mock data in `handleCollision()` — needs to be wired to the real matrix

## Current State

The codebase has a working **2D platformer** game loop with:
- A solid floor and gravity; entities fall and land instead of floating
- Player (Boss) horizontal movement (acceleration, friction, speed capping) plus grounded-only jumping with variable jump height
- Enemy (Hero) that obeys gravity and chases the Boss horizontally along the ground
- AABB ground detection in `main.js` setting `isGrounded`, plus world-bound side-wall clamping
- Side-scrolling camera with a stable floor horizon
- **Combat is being migrated from Mutual-Contact Trade to the weapon-based model
  (see "Combat Model" above).** The legacy contact code still exists and must be torn out:
  - The Boss's `contactDamage` (50) and the AABB-overlap exchange that has both fighters
    damage each other on touch — **remove this.** Damage should come from weapon hitboxes only.
  - The Boss keeps its HP pool (1000), and the Hero keeps its encounter-scaled HP and
    `attackDamage`. Floating health bars above both entities stay.
- **i-frames are moving from a contact hit-flash to dodge-roll i-frames.** The old
  ~500ms i-frames + white hit-flash that gated the contact trade should be replaced by
  the dodge-roll invulnerability window. Knockback-on-hit can stay but should be driven
  by weapon strikes, not body overlap.
- Combat outcomes (unchanged): the Nemesis overlay / resurrection only fires when the
  Hero's HP hits 0; when the Boss's HP hits 0 the game pauses on a `GAMEOVER` state and
  renders a basic "GAME OVER — HERO WINS" banner (to be polished later).
- Weapon hitbox system, dodge roll, and Hero AI decision logic are **not yet implemented**
- The progression matrix exists (30 encounters) but is **not yet integrated** into gameplay
- `handleCollision()` in main.js still uses hardcoded mockData instead of reading from the matrix
- Enemy does not scale stats between encounters
- No mechanic system (dash, projectiles, etc.) is implemented yet
- The Hero does not yet jump or pursue the Boss vertically (`targetY` is reserved for this)
