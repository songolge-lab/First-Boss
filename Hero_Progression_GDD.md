# Game Design Document — Hero Progression & Encounter Matrix
### Working Title: *Apex* — A Reverse Roguelike
**Document owner:** Lead Game Balance & Systems Design
**Scope:** Encounters 1–30 · Hero (AI) progression spine · RNG power spikes · milestone mechanics · UI data contract
**Status:** Tunable v1.0 (fixed-seed reference build)

---

## 1. Premise & The Inversion Problem

The player controls the **Final Boss**: agile, high-speed, skill-expressive, and *statically powerful*. The AI controls the **Hero**, which pathfinds toward the Boss, dies on contact, and respawns infinitely — growing stronger with each death.

This inverts the normal roguelike power fantasy. In a standard roguelike the *player* accumulates power across runs; here the *opponent* does. That creates a unique balancing tension:

- The player begins **overwhelmingly dominant** (one touch kills the Hero) and must end up **genuinely threatened** (the Hero can kill them).
- The player's own power never changes numerically. **All of the player's growth is mastery, not stats.** The only thing the designer can tune is how fast the *Hero* closes the gap.

The entire job of this document is to pace that gap-closing so the experience is *never cheap-feeling early* and *inevitably lethal late*.

### The two failure modes we are designing against
1. **Early frustration (ramp too fast):** If the Hero becomes annoying before the player has learned the Boss's kit, the player feels cheated, not challenged. The early curve must be *barely perceptible*.
2. **Late boredom (ramp too slow / pure stat bloat):** If escalation is only bigger numbers, encounter 25 plays exactly like encounter 8 with a longer health bar. We must introduce **qualitative** change, not just quantitative.

---

## 2. Reference Constants (the Boss is fixed)

Because the player gains no stats, the Boss is modeled as a set of constants that the Hero curves are balanced *against*:

| Constant | Value | Meaning |
|---|---|---|
| `BOSS_MAX_HP` | **1000** | The player's health pool. The Hero's job is to deal this much damage in one encounter. |
| `BOSS_CONTACT_DMG` | **50** | Damage the Boss deals to the Hero per touch. This is the "player DPS" denominator. |
| `BOSS_TOP_SPEED` | **10.0** u/s | The Hero's *sustained* speed is intentionally kept below this for the entire game. |
| `SPEED_HARD_CAP` | **9.8** u/s | Even fully looted, the Hero can never out-sprint the Boss. |

Two derived readability metrics drive every balance decision:

- **Touches-to-Kill-Hero** = `ceil(Hero HP / 50)` → how long the player must survive/chase to win an encounter.
- **Hero-Hits-to-Kill-Boss** = `ceil(1000 / Hero Attack)` → how dangerous a single clean Hero combo is.

The whole campaign is the journey from `(1 touch to win / 125 hits to lose)` at Encounter 1 to `(90 touches to win / 4 hits to lose)` at Encounter 30.

---

## 3. Mathematical Philosophy: Three Stats, Three Curve Shapes

The core design thesis is that **HP, Move Speed, and Attack should not share a scaling formula.** Each stat serves a different role in the fight, so each gets a curve shape whose *mathematical behavior matches its intended feel*. This is the heart of the system.

### 3.1 HP → **Quadratic** (the predictable wall)
> `HP(n) = 50 + 3·(n − 1)²`

HP is the "time-to-kill" stat and the primary anti-frustration lever, so it must be **smooth and predictable** — no surprises in how long an encounter takes. Quadratic growth is ideal because its *first derivative is linear*: the encounter-over-encounter increase grows steadily rather than exploding.

Crucially, the early slope is almost flat. The first five encounters move `50 → 53 → 62 → 77 → 98` — a near-imperceptible ramp that lets the player learn the Boss while still one- or two-shotting the Hero. The curve only becomes a genuine "wall" in the back third, exactly when we *want* encounters to feel like a war of attrition. Encounter 1 is a one-shot; Encounter 30 is a ~90-touch endurance fight.

### 3.2 Move Speed → **Logarithmic** (diminishing returns, soft-saturating)
> `Speed(n) = 3.5 + 1.75·ln(n)`  *(hard-capped at 9.8)*

Speed is the most dangerous stat to mishandle. A Hero that out-runs the player removes the player's core agility fantasy and produces the worst kind of unfair feeling — *you can't escape*. Logarithmic scaling is chosen precisely because it **front-loads the gains and then saturates**: the Hero gets noticeably faster early (`3.5 → 6.3` across the first five encounters, raising the challenge floor), then the gains shrink toward nothing as the curve flattens under the cap.

**Design principle — Speed is a "floor-raiser," not a "ceiling."** Sustained Hero speed is deliberately held *below* the Boss for the entire game. This means the player *always* has an escape valve via raw movement, so no respawn ever feels like an unwinnable footrace. You will notice the Speed column goes flat at **9.8 from Encounter 11 onward** — this is intentional, not stat bloat exhaustion. Once Speed has done its job of closing the early gap, **it stops being the lever.** From the midgame on, the threat escalates entirely through Attack and through unlocked mechanics (see §5). The Dash mechanic exists specifically to give the Hero *burst* gap-closing without ever raising its *sustained* speed past the player.

### 3.3 Attack Damage → **Exponential** (compounding, inevitable lethality)
> `Attack(n) = 8 · 1.10^(n − 1)`

Attack is the "stakes" stat — it answers *how badly a mistake hurts*. It uses compounding exponential growth (10% per encounter) because we want the **late game to feel like the walls are closing in**. Early, a Hero hit is trivial chip damage against the Boss's 1000 HP (Encounter 1: the player could eat 125 hits). The 10% compounding stays gentle for a long time, then turns vicious in the final stretch: by Encounter 30 a fully-kitted Hero kills the Boss in just **4 clean hits**. Exponential growth is the only shape that guarantees the "Boss is *eventually* defeated" requirement while still being a non-event for the first third of the game.

### 3.4 Why mixed curves matter
Putting all three on the same curve would make the Hero scale as a single blob. Mixing them creates **texture**: the Hero that feels fast-but-harmless at Encounter 7 is a different problem from the tanky-but-slow-feeling Hero at Encounter 19, which is different again from the glass-cannon-lethal Hero at Encounter 30. The player must continually re-read the threat. That re-reading *is* the gameplay.

---

## 4. RNG Power Spikes — "Legendary Loot"

### 4.1 Philosophy
Smooth curves are satisfying but emotionally flat. Roguelikes live on the **dopamine spike of an unexpected godly drop**. To inject that, the Hero "finds Legendary Loot before reaching the boss room" at irregular intervals, producing a sudden, *permanent*, off-curve power jump.

These spikes do three jobs:
1. **Emotional punctuation.** A flat curve has no memorable moments; a spike at Encounter 18 that nearly triples the Hero's effective HP is a *story beat* the player will remember (and dread).
2. **Pattern-breaking.** Spikes force the player out of autopilot. The encounter *right after* a Legendary plays differently from the one before.
3. **UI payoff.** The respawn "+/- overlay" (§6) exists largely to sell these moments — a Legendary row lights up with huge green numbers.

### 4.2 Spike mechanics
Each Legendary applies a **permanent modifier** from its drop encounter onward. Multipliers stack *multiplicatively* with the base curve and with each other; flat bonuses are added before multipliers. Speed modifiers always respect the 9.8 hard cap.

For this reference build the drops are **pre-rolled (fixed seed)** so the matrix is reproducible and reviewable. §8 describes how to convert this into true per-run RNG for shipping.

| Drop @ Encounter | Item | Effect | Design intent |
|---|---|---|---|
| **4** | Bloodthirst Greatblade | **+50% Attack, +60 HP** | First "oh, it can actually hurt me" moment. Early, before the player is complacent. |
| **11** | Galewalker Boots | **+30% Move Speed (→cap), +100 HP** | Pins the Hero near max speed. Marks the end of Speed as a lever. |
| **18** | Aegis of the Titan | **×1.5 HP, +15% Attack** | The "it became a wall" spike. Encounter length roughly doubles overnight. |
| **25** | Crown of the Fallen King | **+40% Attack, +15% Speed, +250 HP** | The final escalation into true boss-killer territory for the endgame stretch. |

Spikes are spaced ~7 encounters apart so each has room to breathe and re-shape play before the next arrives.

---

## 5. Milestone Mechanic Unlocks — Behavior, Not Bloat

Stat curves answer *how much*; mechanics answer *how the Hero plays*. These are the antidote to "encounter 25 is encounter 8 with more HP." At fixed thresholds the Hero gains a new **behavioral capability** that changes the puzzle the player must solve.

The unlock schedule is sequenced so each new tool answers a "safe strategy" the player has just settled into:

| Encounter | Mechanic | What it changes for the player |
|---|---|---|
| **1** | Pursuit & Contact Strike | Baseline. On touch, **both** deal damage simultaneously (mutual-contact trade). The player wins the trade until the Hero has enough HP to survive it. |
| **3** | Telegraph Awareness | Hero leads its pathing toward your *predicted* position. Simply walking in a straight line stops working. |
| **5** | **Dash / Roll** | Burst gap-closer. Answers the player who kites at the edge of the (sub-Boss) speed gap. |
| **8** | Dash Feint | Hero cancels a dash to bait your dodge. Punishes panic-dodging. |
| **12** | **Invulnerability Shield (2s)** | Periodic immunity window — you *cannot* contact-kill during it. Forces patience and repositioning instead of greedy touches. |
| **15** | Adaptive Pathing | Hero uses cover and stops self-cornering. Kills the "lure it into a wall" exploit. |
| **20** | **Ranged Projectiles** | Distance is no longer safe. This is the structural answer to the Hero's capped sustained speed — it threatens you without needing to catch you. |
| **23** | Multishot Spread | 3-shot spread shrinks dodge windows. Standing still at range becomes lethal. |
| **27** | Enrage / Second Wind | Below 25% HP the Hero gains temporary Speed + Attack. Makes the *final blow* the tensest moment of the encounter. |
| **30** | Apex Predator (Capstone) | Full form: dashes leave a damaging trail, projectiles gain mild homing. Every prior system, weaponized at once. |

**The Speed↔Mechanic handshake (most important systemic interaction):** Because sustained speed is permanently capped below the Boss, the Hero can never threaten the player through raw chase. The danger is delivered instead by **Dash (burst), Shield (denies the kill), and Projectiles (threat at range)**. This is the design's central elegance — the player keeps their escape fantasy intact, and difficulty arrives through *new rules*, not through being out-statted.

---

## 6. The Encounter Matrix (Encounters 1–30)

All values are the **post-Legendary, post-cap** numbers the live game ships.
`Touches` = player touches needed to kill the Hero. `Hits` = Hero hits needed to kill the Boss.

| # | HP | Move Spd | Attack | Touches to Kill Hero | Hero Hits to Kill Boss | Legendary | Mechanic Unlock |
|---|----|---------|--------|----------------------|------------------------|-----------|-----------------|
| 1 | 50 | 3.50 | 8.0 | 1 | 125 |  | Pursuit & Contact Strike |
| 2 | 53 | 4.71 | 8.8 | 2 | 114 |  |  |
| 3 | 62 | 5.42 | 9.7 | 2 | 104 |  | Telegraph Awareness |
| 4 | 137 | 5.93 | 16.0 | 3 | 63 | **LEGENDARY: Bloodthirst Greatblade** |  |
| 5 | 158 | 6.32 | 17.6 | 4 | 57 |  | Dash / Roll |
| 6 | 185 | 6.64 | 19.3 | 4 | 52 |  |  |
| 7 | 218 | 6.91 | 21.3 | 5 | 47 |  |  |
| 8 | 257 | 7.14 | 23.4 | 6 | 43 |  | Dash Feint |
| 9 | 302 | 7.35 | 25.7 | 7 | 39 |  |  |
| 10 | 353 | 7.53 | 28.3 | 8 | 36 |  |  |
| 11 | 510 | 9.80 | 31.1 | 11 | 33 | **LEGENDARY: Galewalker Boots** |  |
| 12 | 573 | 9.80 | 34.2 | 12 | 30 |  | Invulnerability Shield (2s) |
| 13 | 642 | 9.80 | 37.7 | 13 | 27 |  |  |
| 14 | 717 | 9.80 | 41.4 | 15 | 25 |  |  |
| 15 | 798 | 9.80 | 45.6 | 16 | 22 |  | Adaptive Pathing |
| 16 | 885 | 9.80 | 50.1 | 18 | 20 |  |  |
| 17 | 978 | 9.80 | 55.1 | 20 | 19 |  |  |
| 18 | 1616 | 9.80 | 69.8 | 33 | 15 | **LEGENDARY: Aegis of the Titan** |  |
| 19 | 1773 | 9.80 | 76.7 | 36 | 14 |  |  |
| 20 | 1940 | 9.80 | 84.4 | 39 | 12 |  | Ranged Projectiles |
| 21 | 2115 | 9.80 | 92.8 | 43 | 11 |  |  |
| 22 | 2300 | 9.80 | 102.1 | 46 | 10 |  |  |
| 23 | 2493 | 9.80 | 112.3 | 50 | 9 |  | Multishot Spread |
| 24 | 2696 | 9.80 | 123.6 | 54 | 9 |  |  |
| 25 | 3282 | 9.80 | 190.3 | 66 | 6 | **LEGENDARY: Crown of the Fallen King** |  |
| 26 | 3502 | 9.80 | 209.3 | 71 | 5 |  |  |
| 27 | 3732 | 9.80 | 230.3 | 75 | 5 |  | Enrage / Second Wind |
| 28 | 3970 | 9.80 | 253.3 | 80 | 4 |  |  |
| 29 | 4218 | 9.80 | 278.6 | 85 | 4 |  |  |
| 30 | 4474 | 9.80 | 306.5 | 90 | 4 |  | Apex Predator (Capstone) |

### Reading the curve (balance-review notes)
- **Encounters 1–3 (Tutorial-by-stealth):** Effectively free kills. The player is learning; the Hero is a target dummy that happens to walk toward them.
- **Encounter 4 spike:** First Legendary nearly doubles Attack and cuts Hero-Hits-to-Boss from ~104 to 63. The player first registers the Hero as a threat *to them*.
- **Encounters 5–10 (Skill floor rises):** Dash + Feint mean positioning now matters. Encounters lengthen from 4 to 8 touches.
- **Encounter 11 spike + 12 Shield:** Back-to-back disruption. Speed pins at cap; the Shield denies greedy kills. This is the first "the rules changed" wall.
- **Encounters 18–24 (Attrition):** The Aegis spike (33 touches) plus Projectiles turns encounters into real fights with both melee and ranged threat layers.
- **Encounters 25–30 (Climax):** The final Legendary pushes Hero-Hits-to-Boss to 4–6. The player must now play near-flawlessly, dodge multishot, and survive Enrage to land ~90 touches without dying. **This is where the Boss is "eventually defeated"** if the player slips.

---

## 7. JSON Data Structure for UI Integration

### 7.1 Contract & intent
The frontend renders a **"+/- difference" overlay during the respawn phase**: when the Hero dies in encounter *N−1* and respawns into encounter *N*, the overlay shows what changed. The schema therefore makes the diff a **first-class, pre-computed field** so the UI never has to do math — it just reads `stat_delta` and paints it green/red.

**Key rules the frontend can rely on:**
- `previous_encounter_stats` is `null` **only** on `encounter_id: 1` (the very first spawn has nothing to diff against). Render that as a clean baseline with no +/-.
- For every other encounter, `previous_encounter_stats + stat_delta === current_encounter_stats` **exactly** (values are rounded *before* diffing). Safe to display the raw numbers without rounding artifacts.
- `is_legendary_drop: true` is the cue to play the Legendary VFX/SFX and highlight the (large) deltas. `legendary_item` carries the name/effects for the toast.
- `unlocked_mechanic` is non-null on milestone encounters — drive an "ability unlocked" banner from it. `active_mechanics` is the cumulative list for an always-visible loadout HUD.

### 7.2 Schema (top-level shape)

```jsonc
{
  "schema_version": "1.0.0",
  "metadata": {
    "title":               "string",
    "boss_max_hp":         "number",        // 1000
    "boss_contact_damage": "number",        // 50
    "boss_top_speed":      "number",        // 10.0
    "speed_hard_cap":      "number",        // 9.8
    "total_encounters":    "number",        // 30
    "stat_curves": {                        // human-readable formula strings (docs/tooltips)
      "hp":            "string",
      "move_speed":    "string",
      "attack_damage": "string"
    },
    "legendary_drops":     { "<encounter_id>": { "name": "string", "effects": "string" } },
    "ui_contract":         "string"         // notes for the frontend team
  },
  "encounters": [ /* array of Encounter objects, ordered by encounter_id 1..N */ ]
}
```

### 7.3 The `Encounter` object (the unit the respawn overlay consumes)

```jsonc
{
  "encounter_id":             1,            // integer, 1-indexed
  "is_legendary_drop":        false,        // boolean — triggers Legendary VFX when true
  "legendary_item":           null,         // null | { "name": string, "effects": string }
  "unlocked_mechanic":        null,         // null | { id, name, description, params }
  "active_mechanics":         ["..."],      // string[] — cumulative ability ids for the HUD
  "previous_encounter_stats": null,         // null ONLY on encounter 1; else StatBlock
  "current_encounter_stats":  { },          // StatBlock — always present
  "stat_delta":               null,         // null on encounter 1; else signed StatBlock
  "stat_delta_pct":           null,         // null on encounter 1; else % change per stat
  "derived": {                              // pre-computed readability metrics
    "boss_touches_to_kill_hero": 1,
    "hero_hits_to_kill_boss":    125
  }
}
```

**`StatBlock`** (used by `current_`, `previous_`, and `stat_delta`):
```jsonc
{ "hp": 0, "move_speed": 0.0, "attack_damage": 0.0 }
```

### 7.4 Worked examples (verbatim from the generated data)

**Encounter 1 — baseline, no diff:**
```json
{
  "encounter_id": 1,
  "is_legendary_drop": false,
  "legendary_item": null,
  "unlocked_mechanic": {
    "id": "pathfind_melee",
    "name": "Pursuit & Contact Strike",
    "description": "Hero paths toward the Boss and deals its Attack on contact. On touch, both deal damage simultaneously (mutual-contact trade).",
    "params": {}
  },
  "active_mechanics": ["pathfind_melee"],
  "previous_encounter_stats": null,
  "current_encounter_stats": { "hp": 50, "move_speed": 3.5, "attack_damage": 8.0 },
  "stat_delta": null,
  "stat_delta_pct": null,
  "derived": { "boss_touches_to_kill_hero": 1, "hero_hits_to_kill_boss": 125 }
}
```

**Encounter 5 — mechanic unlock, normal diff (note `previous + delta === current`):**
```json
{
  "encounter_id": 5,
  "is_legendary_drop": false,
  "legendary_item": null,
  "unlocked_mechanic": {
    "id": "dash_roll",
    "name": "Dash / Roll",
    "description": "Burst movement to close the sustained-speed gap. The Hero's main early gap-closer.",
    "params": { "cooldown_s": 4.0, "distance_units": 6.0, "iframes_ms": 0 }
  },
  "active_mechanics": ["pathfind_melee", "telegraph_awareness", "dash_roll"],
  "previous_encounter_stats": { "hp": 137, "move_speed": 5.93, "attack_damage": 16.0 },
  "current_encounter_stats":  { "hp": 158, "move_speed": 6.32, "attack_damage": 17.6 },
  "stat_delta":     { "hp": 21,   "move_speed": 0.39, "attack_damage": 1.6 },
  "stat_delta_pct": { "hp": 15.3, "move_speed": 6.6,  "attack_damage": 10.0 },
  "derived": { "boss_touches_to_kill_hero": 4, "hero_hits_to_kill_boss": 57 }
}
```

**Encounter 18 — Legendary drop (huge green numbers; `is_legendary_drop` cues VFX):**
```json
{
  "encounter_id": 18,
  "is_legendary_drop": true,
  "legendary_item": { "name": "Aegis of the Titan", "effects": "x1.5 HP, +15% Attack" },
  "unlocked_mechanic": null,
  "active_mechanics": ["pathfind_melee","telegraph_awareness","dash_roll","feint","invuln_shield","adaptive_pathing"],
  "previous_encounter_stats": { "hp": 978,  "move_speed": 9.8, "attack_damage": 55.1 },
  "current_encounter_stats":  { "hp": 1616, "move_speed": 9.8, "attack_damage": 69.8 },
  "stat_delta":     { "hp": 638,  "move_speed": 0.0, "attack_damage": 14.7 },
  "stat_delta_pct": { "hp": 65.2, "move_speed": 0.0, "attack_damage": 26.7 },
  "derived": { "boss_touches_to_kill_hero": 33, "hero_hits_to_kill_boss": 15 }
}
```

> The complete, ready-to-consume data for all 30 encounters ships as **`hero_progression_matrix.json`** (accompanying this document).

---

## 8. From Fixed Seed to Live RNG

The matrix above bakes in one pre-rolled loot sequence so it is reviewable. For the shipping game, generalize as follows so each run feels different while staying balanced:

- **Drop windows, not fixed encounters.** Instead of "Legendary at 4," roll the drop somewhere in a window — e.g. `4 ± 1`, `11 ± 2`, `18 ± 2`, `25 ± 2`. This keeps pacing intact while varying the exact beat.
- **Weighted stat-target table.** When a Legendary rolls, pick which stat(s) it boosts from a weighted table (e.g. Attack 40% / HP 35% / Speed 25%), with magnitude drawn from a tuned range per rarity. The *number* of Legendaries per 30-encounter run stays fixed (4) so total power lands in band.
- **Guardrails (clamp the variance).** After applying any roll, clamp the run against soft min/max envelope curves so an unlucky or godly seed never falls outside a shippable difficulty band. Speed always clamps to 9.8.
- **Seed surfacing.** Persist the run seed so QA can reproduce a specific bad/good run, and so a "daily challenge" mode can share one seed across all players.

The JSON schema is already seed-agnostic — a live run simply emits the same 30 `Encounter` objects with different numbers and Legendary placements.

---

## 9. Tuning Levers (quick reference for balance passes)

If playtests report a problem, reach for these knobs in order:

- **"Too easy / boring early"** → raise the HP quadratic coefficient (`3 → 4`) for a steeper wall; do *not* touch the early Speed curve.
- **"Feels unfair, can't escape"** → lower `SPEED_HARD_CAP` (9.8 → 9.5) and/or reduce the Galewalker multiplier. Speed is the #1 source of unfair feeling.
- **"Endgame never threatens me"** → raise the Attack exponential base (`1.10 → 1.12`) or buff the Encounter 25 Legendary. This is the "ensure the Boss is defeated" dial.
- **"Encounters drag late"** → lower the Aegis HP multiplier (1.5 → 1.4) to trim Touches-to-Kill at the top end.
- **"Spikes don't feel special"** → increase Legendary magnitudes and *decrease* base-curve growth, shifting more total power into the spikes.

All curve coefficients, the Legendary table, and the mechanic schedule live as data in the generator — none are hard-coded into gameplay logic, so a balance pass is a data edit, not a code change.

---

*End of section — Hero Progression & Encounter Matrix v1.0.*
