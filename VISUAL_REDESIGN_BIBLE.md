# VISUAL REDESIGN BIBLE — "The Obsidian Court"

Implementation-ready spec for the approved visual redesign. Source of truth for any
agent implementing visuals into `src/core/SpriteManager.js`, `src/environment/ThroneRoom.js`,
`src/entities/Player.js`, and `src/entities/Enemy.js`.

**Approved reference assets (checked into this repo):**

| Asset | Data | Generator | Preview |
|---|---|---|---|
| Boss idle sprite (final) | `tools/redesign/boss_matrix.txt` (46×48) | `tools/redesign/boss_gen.js` | `tools/redesign/boss_v10.png` |
| Hero idle sprite (final) | `tools/redesign/hero_matrix.txt` (30×24) | `tools/redesign/hero_gen.js` | `tools/redesign/hero_v2.png` |
| Throne room (final, daylight hall) | — | `tools/redesign/env2_gen.js` | `tools/redesign/env2_v3.png` |
| Throne room (REJECTED dark draft — do not use) | — | `tools/redesign/env_gen.js` | `tools/redesign/env_v3.png` |
| VFX sampler sheet | — | `tools/redesign/vfx_gen.js` | `tools/redesign/vfx_v1.png` |

Matrix files are rows of palette-key characters (`.` = transparent) — the exact format
`BOSS_SPRITES` / `HERO_SPRITES` already consume. The generators are the editable source
for producing further animation frames (re-pose, re-run, paste output).

---

## 1. FINAL ART DIRECTION LOCK

**Boss — "The Hollow Regent."** Sleek obsidian humanoid sovereign. Smooth swept-back
mask-helm with a single red visor slit (no face). Broad shoulders, hard V-taper, wide
planted stance with a visible gap between the legs. Armor reads grown, not bolted:
smooth carapace plates, thin seams. Corruption expressed as thorn spikes on both
shoulders (bigger on the lead side), ember crack-lines, and one glowing sternum core.
Fully human gauntleted hands with visible fingers wrapped over the sword grip — never
claws. Sword held raised, up-diagonal, battle-ready.

**Hero — "The Dawnguard Knight."** Noble crowned knight, faithful to the pixel-knight
reference: crowned ridge-helm (one gold center spike), cold blue visor glow, oversized
layered lead pauldron, glowing blue chest sigil, plate skirt, dark navy war cape
falling behind, bright steel blade with a cold blue glow edge held low-forward.
Gold appears at exactly three points: crown spike, cape clasp, belt buckle.

**Boss sword — "Kingsgrief."** Long dark blade with an unbroken molten core that ramps
hotter toward the tip. Two-tier crossguard with upswept horn quillons, single bright
gem at the blade base, wrapped grip, dim red pommel stone. Raised pose is part of the
boss's identity silhouette.

**Throne room — "The Sundered Court" (daylight hall).** Warm aged tan stone, grand and
alive: a monumental two-light gothic tracery window and an open balustraded arcade,
both showing bright sky, clouds, mountains, and trees; ivy/moss/planters; cracked,
varied masonry; an ornate gothic throne (gold finial orb, jeweled crown cornice,
pinnacles, crimson upholstery, scrolled gold armrests) inside a shadowed apse recess
on a 4-step dais; crimson/gold carpet runner; warm daylight shafts falling toward the
throne; golden braziers. Old but not abandoned; regal, naturally lit.

**VFX identity.** Two effect families sharing one lifecycle grammar
(*gather → crisp strike → dissipation*):
- Boss "ember-void": black-bodied shapes with molten interiors; dissipates as embers + smoke.
- Hero "cold sanctity": white-core, blue-edged clean shapes; dissipates as sparkles.
Neutral physical events (landing dust, wall impacts) use the hall's stone tones.

**Color harmony rules (LAW):**
- Boss owns black/charcoal `#08080c→#3d4052` + ember ramp `#6e0f1c → #a8182a → #e0263a → #ff5a4a`.
- Hero owns steel `#2e3444→#e2e8f2` + light ramp `#4a7a9e → #7fd4ff → #b8ecff → #eaf6ff` + gold `#c9962e` (rationed).
- Environment owns warm stone `#2e2620→#d8c9a8`, sky `#6fb7e8→#e8f4fc`, greens `#2e5c34→#6fa85c`, crimson `#5c1616→#b03030`, gold `#8a6420→#ecc95e`.
- Neither fighter's accent ramp ever appears in the environment or on the other fighter.
  Any red pixel = boss threat; any cold-blue pixel = hero threat. No exceptions.

---

## 2. BOSS SPRITE IMPLEMENTATION SPEC

**Style / size.** True pixel art, 46 wide × 48 tall source grid, side view facing
right (engine flip handles left). Feet on row 47. On-screen size UNCHANGED:
set `BOSS_PIXEL = 3` (48 rows × 3 px = 144 px, exactly today's 24 × 6). Collision
half-extents in `Player.js` (`radius`/`halfWidth`/`halfHeight` = 20) stay untouched;
visual body width (~20 cols ≈ 60 px) matches the current visual-vs-collision ratio.

**Palette keys (boss sheet):**

| key | hex | use |
|---|---|---|
| `0` | `#08080c` | outline accents / seams |
| `1` | `#12121a` | far-side limbs, deep shadow |
| `2` | `#1c1d28` | base plate |
| `3` | `#2a2c3a` | lit plate faces |
| `4` | `#3d4052` | rim highlights |
| `5` | `#565c74` | sheen glints (max ~2 px per frame) |
| `a` | `#6e0f1c` | deep ember |
| `b` | `#a8182a` | ember |
| `c` | `#e0263a` | bright ember |
| `d` | `#ff5a4a` | hot core |
| `g` | `#3a1014` | grip dark |
| `h` | `#571820` | grip light |

NOTE: boss and hero key sets collide (`0–5`, `g`). Give `SpriteManager.drawSprite` an
optional `palette` parameter and store `BOSS_PALETTE` / `HERO_PALETTE` separately
(rendering-only change), or remap hero keys to unique characters. Do not merge blindly.

**Body part breakdown (rows, from `boss_matrix.txt`):** mask-helm 0–9 (visor slit
row 5 at the front edge; tail sweeps down-back rows 4–7); neck/collar 10–11; torso
12–18 (lit face `3` upper-right, sternum seam+core column x19); abdomen 19–25 (two
plate seams that stop short of the edges); pelvis 26–28; legs 28–47 (front leg `2`/`3`,
back leg all `1`, transparent stance gap at column x18); pointed sabatons with heel
spur (back) rows 45–47. Lead pauldron dome rows 11–16 with three thorn spikes
up-forward; rear pauldron rows 12–14 with two smaller rear thorns. Lead arm bent,
fist rows 16–19 gripping the raised sword; far arm hangs rows 15–24.

**Per-clip notes (all clips keep their current names, frame counts may grow; `hold`
values and the FSM in `Player.js` are untouched):**
- *idle* (4 fr): ±1 px chest rise; blade tip sway 1 px; core pulse = palette swap `c↔d`.
- *run* (6 fr): re-pose legs around the stance gap; mask tail + blade trail the body by 1 frame.
- *retreat* (4 fr): run legs reversed, torso leaning back 1 px, blade held slightly higher.
- *jump / fall / doubleJump* (2 fr each): legs tuck (jump) / trail (fall); mask tail and
  blade align toward the motion diagonal.
- *dash* (2 fr + smears): body compresses horizontally; keep crimson drill FX (below).
- *attack1 / attack2* (3–4 fr): shoulders rotate; raised blade sweeps down-forward and
  returns. The raised idle IS the anticipation pose — reuse it as frame 0.
- *attack3 (cast) / groundCharge / airCharge* (2–3 fr): grip hand opens toward camera;
  cracks and core step up one ramp stop (`b→c`, `c→d`).
- *attack4 / fireLaser / airDive / chargedDive* (2–3 fr): whole silhouette forms one
  diagonal arrow; laser pose plants both feet, blade leveled at the beam height.
- *hit/stagger*: no new clip — existing white `tint` flash + head drops 1 px variant;
  all reds drop to `a` for the flash frames.

**Sword integration.** The sword is drawn INTO the frames (as now). Grip cells `g/h`,
guard `2/3` with `4` tips, gem `c`, pommel `b`. Blade core column ramps `b` (rows ≥12)
→ `c` (rows 6–11) → `d` (rows ≤5). The core is the registration line slash VFX attach to.

**Red accent placement rules.** Only six sanctioned zones: visor slit, sternum
seam+core, one crack per limb region (front thigh bright `b-c-b`; far-side thigh/arm
dim `a-b-a`), shoulder vein feeding the middle thorn, guard/pommel gems, blade core.
Far-side reds use only `a`/`b` (never `c`/`d`). Total red budget ≈ 35 px per frame.

**Corruption detail rules.** Thorns: 2–3 px diagonal spikes, `3` body with `2`/`1`
tips (lead side), one value darker on the far side. Veins: single diagonal 3-px cracks
with one bright node, never rings or webs. Depth law: far side is always exactly one
value step darker than the near side.

**Side-view readability.** Five silhouette landmarks must survive every frame: swept
mask point, pauldron mass, V-taper waist, leg gap, raised blade line. All hot pixels
and the weapon live on the facing side (engine flip preserves this). If a pose breaks
a landmark, fix the pose, not the landmark.

---

## 3. HERO SPRITE IMPLEMENTATION SPEC

**Style / size.** 30 wide × 24 tall source grid, side view facing right, feet row 23.
On-screen size UNCHANGED: `HERO_PIXEL = 2` (24 × 2 = 48 px, exactly today's 16 × 3).
Collision size (30) in `Enemy.js` untouched.

**Palette keys (hero sheet — see collision warning in §2):**

| key | hex | use |
|---|---|---|
| `0` | `#10141e` | outline / soles |
| `1` | `#2e3444` | dark steel / far limbs |
| `2` | `#4a5468` | base steel |
| `3` | `#7c88a0` | lit steel |
| `4` | `#aeb9cc` | bright plate / blade steel |
| `5` | `#e2e8f2` | rim glint (1 px) |
| `n` | `#141c30` | cape shadow |
| `m` | `#1c2438` | cape body |
| `l` | `#7fd4ff` | cold blue glow |
| `L` | `#b8ecff` | bright blue |
| `g` | `#c9962e` | gold (3 px max: crown, clasp, buckle) |

**Armor breakdown (rows, from `hero_matrix.txt`):** crowned helm 0–5 (3 crown points,
center one gold; blue visor `l`/`L` at row 3 front; brow `4`); gorget 5; cuirass 6–12
(lit chest `3`/`4`, blue sigil 2×2 at x12–13 rows 9–10, belt `1` + gold buckle);
pauldrons 6–9 (lead: `4` rim + `5` glint + layered under-plate; far: dark echo);
plate skirt 13–15 (two `1` seams); legs 15–21 (front `2`/`3`, back `1`, stance gap
col x13); sabatons 22–23 (front pointed with `4` top edge); cape rows 6–19 behind
everything (`m` body, `n` edge, torn hem); lead arm + fist 10–13; sword: `1` guard
with `l` gem, blade `4` top + `l` glow underside + `L` tip, shallow forward-down angle.

**Clip notes** (existing clips: `idle run jump fall attack dash roll`; NEW clips to
author — `Enemy.js` already requests them via `_clip()` fallbacks, zero AI changes:
`cast`, `parry`, `parry_counter`, `air_attack`, `hurt`):
- *idle* (4 fr): breath + cape sway 1 px; visor glow steady.
- *run* (6 fr): cape is the motion seller — stretches on contact frames; plate bounce 1 px.
- *jump / fall* (2 fr): cape rises / trails; legs tuck.
- *dash* (2 fr): body smear; cape flat behind; blue tip leads.
- *roll* (4 fr): cape-ball with the bright pauldron as the rotating landmark.
- *attack* (4 poses for the combo): blade lifts 1 row (windup) and extends 2 (strike);
  blade glow edge doubles as the built-in trail.
- *cast* (3 fr): sigil brightens `l→L`, free hand forward.
- *parry* (2 fr): pauldron rotates forward, blade vertical.
- *parry_counter* (2 fr): arms open, ring VFX carries the moment.
- *air_attack* (2 fr): blade points straight down (pogo).
- *hurt* (2 fr): visor glow drops to `l`→`0` for 1 frame, head dips.

**Silhouette rules.** Four landmarks every frame: crowned dome, lead pauldron mass,
cape trailing back, blade line forward. Brightest pixels always on the threat side,
darkest mass (cape) always on the retreat side. Blue diagnostic line (visor → sigil →
gem → blade glow) must stay unbroken at 48 px.

**Compatibility.** Feet anchor and `_spriteTopY` HP-bar logic work unchanged. Visual
poses never extend the body beyond current width impressions (cape may, sword may not).

---

## 4. BOSS SWORD SPEC

- **Shape.** Long straight dark blade; two-tier crossguard (long lit main cross +
  short upper cross), upswept horn tips at both main-cross ends; one bright gem at
  blade base; wrapped grip; small pommel stone.
- **Palette.** Metal `#1c1d28`/`#2a2c3a` with `#3d4052` tips; grip `#3a1014`/`#571820`;
  gems `#e0263a` (guard) / `#a8182a` (pommel); core ramp `#a8182a → #e0263a → #ff5a4a`
  hottest at the tip.
- **Length / angle.** ~17 source px of steel (≈ 1.4× the boss torso height). Idle/ready:
  raised up-diagonal (~2 rows rise per column). Attacks sweep it through down-forward
  arcs; the LASER pose levels it horizontally at beam height.
- **Animation usage.** The blade never detaches from the fist; fingers stay drawn over
  the grip in every frame. Implied reach must match the existing melee hitbox
  (`COMBO` boxes in Player.js) — do not lengthen reach visually beyond ~15%.
- **Slash trails.** Trails are born from the core line, in ember ramp only
  (smoke rim `#1a1420`, body `#a8182a`, inner edge `#e0263a`, belly streak `#ff5a4a`).
- **Charge glow.** Charging relocates the old wand glow to the pommel/blade: core line
  widens 1 px and steps one ramp stop; fully charged = tip flares `#ff5a4a` + 1 px halo.

---

## 5. THRONE ROOM IMPLEMENTATION SPEC

Port `tools/redesign/env2_gen.js` (the approved daylight hall) into the existing
`ThroneRoom.js` back-to-front layer stack. Scale: 1 scene px = 3 world px
(scene row 94 = `floor.y`; the scene's 240-px width covers 720 world px — repeat the
bay rhythm across `WORLD_WIDTH`, with ONE dais/throne at a chosen focal x).

**Layer order (maps onto existing render steps):**
1. *Far background* (existing screen-space backdrop): warm wash `#6b5c48` + soft tonal
   patches (`#8d7b60` / `#4a3f33` at 15–25% alpha); slow parallax kept.
2. *Ceiling band*: `#2e2620` cornice rows + `#b3a184` molding line + corbels every 24 scene px.
3. *Windows / outside light*: two-light gothic tracery window per bay pair (stepped
   pointed apex, center mullion to the peak, side mullions, transom; sky gradient
   `#e8f4fc → #a8d8f5 → #6fb7e8`, cloud bars, mountain bands `#8fa5c4`/`#6d87ab`,
   treeline `#2e5c34`/`#4a8248`, meadow at the sill, 2 bird px) alternating with the
   open ARCADE (no glass; balustrade rail `#b3a184` + posts; closer lusher canopy).
4. *Wall / piers*: masonry piers `#8d7b60` with `#b3a184` lit edge + `#4a3f33` shadow
   edge, capitals and plinths, mortar course lines (60% alpha), banner per pier
   (crimson `#8a2020`, gold rod/fringe/sigil, forked or straight tail), bracket torch
   (reuse existing flicker system).
5. *Moss / ivy / weathering*: see rules below.
6. *Throne*: shadowed apse recess (`#4a3f33` fill, `#2e2620` inner arch line) framing
   the throne — tapering 3-panel back `#40301f`, gold crown cornice `#c99b3a` +
   `#ecc95e` top edge + 3 ruby `#b03030` insets, finial spire + gold orb, flanking
   pinnacles with gilded pointed caps, gold-bordered crimson inner panel, crimson seat,
   scrolled gold-capped armrests, stone plinth. 4-step dais (`#8d7b60`, `#b3a184`
   nosings, worn `#4a3f33` chips) with the carpet strip climbing the center. Golden
   braziers on the platform (existing torch/ember system drives the flames). Planters
   with green bushes flanking on the steps.
7. *Floor / gameplay plane*: `#4e463a` with a single `#b3a184` highlight line exactly
   at `floor.y`; sparse vertical joints in the top 5 px only; carpet runner
   (`#8a2020`, `#5c1616` edges, `#8a6420` trim, gold diamonds every 32 px) ending at
   the dais; depth darkening (`#241d18` 30–35% alpha) toward the screen bottom.
8. *Light shafts + dust* (new translucent pass, after walls, before entities):
   warm `#fdf6e3` stepped quads at 5–9% alpha from windows and arcade angling toward
   the throne, pools on the floor, ~8 dust-mote px at 50% alpha.
9. *Grounding shadow*: `#2e2620` at 12% alpha across the 6 rows above the floor line.
10. *Vignette* (existing, after entities): gentle — 25% alpha edges only.

**Lighting direction:** daylight enters from the windows and falls toward the throne;
braziers add warm counter-light near the dais. No light over 15% alpha in the combat band.

**Stone variation rules:** per pier — 2–4 accent stones one value darker, one hairline
crack (2–3 offset 1-px cells), one chipped corner. Never full per-brick texture.

**Moss / vine placement:** only where water/shade would collect — pier bases, window
sill, balustrade rail, step ends, floor cracks; ivy strands (1-px wiggling `#2e5c34`
lines with 2×2 leaf clusters `#4a8248`/`#6fa85c`) on the far-left wall zone and window
frame corner; one vine per pier capital. Greens never appear in the combat band below
the floor line.

**Gameplay readability:** the floor highlight line is sacred; nothing bright behind
the fighters' body zone except the deliberately mid-value wall; carpet trim strictly
horizontal; verified — boss reads darker, hero cooler, than every wall/floor value.

---

## 6. VFX IMPLEMENTATION SPEC

Global grammar for ALL effects: **gather** (dim fragments/glints converging, during
existing windup frames) → **strike** (crisp single silhouette at peak brightness,
during existing active frames) → **dissipate** (embers/sparkles + fade, during
existing recovery/cull frames). Never change: hitbox extents, frame lifetimes,
anchors, spawn logic, damage. Reference shapes: `tools/redesign/vfx_v1.png`.

Quality tiers use the existing `LITE`/`PERF` flags: **normal** = full recipe;
**lite** = drop halo passes + ~half the particles; **performance** = core silhouette
only, no halos, minimal particles. Every tier keeps the silhouette.

| Effect (function) | Colors | Shape / phases | Tier cuts | Must not change |
|---|---|---|---|---|
| Boss idle aura (`drawAura`) | `#1a1420` smoke + `#6e0f1c` motes | slow void wisps hugging the body; constant | fewer wisps → none, keep 2 motes | radius, anchor |
| Boss charge auras (`drawChargedAirAura`, `drawChargeReadyAura`, wand→pommel glow) | ember ramp | ring of sparks with inward tails converging on the sternum core + ground scorch; spark count & core pulse scale with `chargeRatio`; ready-state doubles sparks | 8→4→2 sparks, drop scorch | charge thresholds, flags |
| Boss laser (`drawLaserBeam`) | BLACK core `#14101c`, sheath `#a8182a`, rim `#e0263a`, filaments `#ff5a4a`, glow 13% | muzzle flare + beam; grow 4 fr → sustain (filament dashes crawl) → collapse 6 fr | drop outer glow → drop filaments | 520×70 extent, 30-fr life |
| Boss sword slash (combo 1–2; new visual) | smoke rim `#1a1420`, body `#a8182a`, edge `#e0263a`, belly `#ff5a4a` | crescent arc, convex leading, tapered tips; fragments in commit → crescent in active → ember scatter in recovery | thinner arc, no fragments/embers | hitbox, commit/active/recovery counts |
| Boss air dive (`drawShockwave` + dive trail) | ember ramp; fear version adds black-flame curtain | diagonal streaks during dive; landing = expanding ember ring sitting on the ground line | ring only, no streaks | dive physics, SHOCK extents, fear routing |
| Dark Flame / finisher (`drawDarkFlame`, `drawExplosion`) | black shell, ember interior, `#6e0f1c` ash | rolling flame w/ red tongues; explosion = shell burst → red ring → embers over its 26 fr | fewer tongues/embers | FLAME/EXPL sizes & lifetimes |
| Hero light wave (`drawLightWave`, 3 `waveType`s) | core `#eaf6ff`, body `#b8ecff`, edge `#7fd4ff` | crescent language, keep diagonal/vertical/X identities; spawn glints ≈4 fr → shimmer travel → shard+sparkle cull | no shimmer, thinner body | 80-fr life, sizes, speeds |
| Hero melee slash (new visual) | same light ramp | mirror of boss crescent, white-core; finisher = double edge; pogo = rotated down | thinner arc | combo windup/active/link counts |
| Hero parry / counter | ring `#7fd4ff`, cardinal `#eaf6ff`, sparks `#b8ecff`, 4 gold px `#c9962e` | stance = faint inner ring pulse (40% alpha); counter = full ring + radial sparks expanding over the 10 active fr | drop sparks → drop inner ring | COUNTER extents, i-frames |
| Impact effects (all hits) | white 2-fr flash (existing `tint`) + 3-spark directional burst tinted by ATTACKER's ramp | sparks fly away from the hit for 4–6 fr | 3→2→0 sparks (flash always stays) | damage, knockback, i-frames |
| Dash / roll / jump support (`drawDashAura`, `drawSpeedStreaks`, new dust) | boss: crimson streaks + `#1c1d28` afterimages + `#ff5a4a` tip; hero: steel streaks + cape-dark line + blue tip; dust: `#8d7b60`/`#6b5c48`/`#4a3f33` | streak bundle + 35%/60% stepped afterimages; landing = symmetric stone puffs + tiny chevron + 2 rising motes | fewer streaks, 1 afterimage, smaller dust | dash speeds/durations, jump physics |

**Readability rules (all VFX):** active shapes are single crisp silhouettes (particles
only at birth/death); hot pixels ≤ ~15% beyond the hitbox; halos ≤ 15% alpha;
dissipation always dimmer than any anticipation; the two ramps never mix in one
effect; nothing paints over either fighter's head/visor zone.

---

## 7. ANIMATION PRODUCTION ORDER

Each step must run in the live game (`npm start`) before the next begins.

1. **Foundations**: per-sheet palettes in `SpriteManager` (key-collision fix, §2);
   `BOSS_PIXEL` 6→3, `HERO_PIXEL` 3→2; wire the two idle matrices in; verify anchors,
   HP bars, shadow widths, flips in-arena.
2. **Boss locomotion**: idle ×4, run, retreat, jump, fall, doubleJump, dash.
3. **Hero locomotion**: idle ×4, run, jump, fall, dash, roll — verify the pair in play.
4. **Throne room** (§5, its own order: re-palette → windows/arcade → shafts →
   piers/banners → dais/throne/planters → readability soak). Environment before
   combat frames so effect contrast is judged against final ground truth.
5. **Boss combat clips**: attack1–4, airDive, charges, fireLaser, chargedDive.
6. **Hero combat clips**: attack ×4, cast, parry, parry_counter, air_attack, hurt.
7. **VFX** in §6 table order (foundations → slashes → waves → laser/charge → trails → ports).
8. **Cohesion soak**: encounters 1–30, all mechanics, all three VFX tiers; fix
   readability regressions only.

## 8. IMPLEMENTATION SAFETY RULES

- **Do not change hitboxes** — no edits to `Hitbox.js`, any `SWORD/COMBO/FLAME/EXPL/
  DIVE/SHOCK/LASER/CHARGE` constants, or `ATTACK/WAVE/PARRY/COUNTER/POGO` tables.
- **Do not change timings** — every frame count, cooldown, `hold` semantic, FSM phase,
  and lifetime stays. New animation frames subdivide existing windows only.
- **Do not change character scale** — `BOSS_PIXEL × rows` and `HERO_PIXEL × rows`
  must equal 144 and 48 px exactly; collision half-extents untouched.
- **Do not change movement** — no edits to velocities, gravity, accel, dash speeds,
  jump forces, or `resolveFloorCollision`/`clampToWorld`.
- **Do not change AI** — `Enemy.js` decision logic, chances, ranges untouched
  (new hero clips only remove `_clip()` fallbacks).
- **Visual-only integration** — allowed files: `SpriteManager.js` (matrices, palettes,
  draw functions), `ThroneRoom.js` (layers), and the *draw/animState* sections of
  `Player.js`/`Enemy.js`. `main.js` combat/state logic is off-limits; `PerfMonitor`
  tier flags must keep working.
- When in doubt: if a change would alter what the game *does* rather than what it
  *shows*, stop and flag it instead.
