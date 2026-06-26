# Reverse Boss Game — Project Reference

## Core Premise

The **Player is the Final Boss**. The AI-controlled **Hero** is the one who resurrects, scales up, and becomes increasingly dangerous over 30 encounters. The player (Boss) must survive an ever-growing threat using movement, positioning, and contact damage (50 per touch). The Boss has 1000 HP and a top speed of 10.0.

## Tech Stack

- **Pure Vanilla JS** + HTML5 Canvas — no frameworks, no build tools
- **Modular ES6** imports (`type="module"` in index.html)
- **File structure:**
  - `src/main.js` — game loop, collision, state machine (`PLAYING` / `RESPAWNING`)
  - `src/entities/Player.js` — the Boss (player-controlled, WASD/Arrows)
  - `src/entities/Enemy.js` — the Hero (AI, pathfinds toward Boss)
  - `src/core/Input.js` — keyboard axis with diagonal normalization
  - `src/core/Camera.js` — lerp-follow camera
  - `src/ui/UIManager.js` — Nemesis overlay DOM manipulation
  - `src/utils/math.js` — `lerp()`, `distance()`
  - `styles/style.css` — glassmorphism overlay, dark theme

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

1. **Enc 1** — `pathfind_melee`: Pursuit & Contact Strike (mutual-contact trade)
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

The codebase has a working game loop with:
- Player (Boss) movement with physics (acceleration, friction, speed capping)
- Enemy (Hero) with basic pathfinding toward the player
- Collision detection triggering the Nemesis overlay with mock data
- Camera with lerp smoothing
- The progression matrix exists (30 encounters) but is **not yet integrated** into gameplay
- `handleCollision()` in main.js still uses hardcoded mockData instead of reading from the matrix
- Enemy does not scale stats between encounters
- No mechanic system (dash, projectiles, etc.) is implemented yet
