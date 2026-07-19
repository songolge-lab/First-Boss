# DRAGON WRATH — technical handoff + family registration (Stage 8C-3)

**This file is the durable registration of the name AND the Stage 8C-3
technical handoff for the STATE half of the package.** Future stages that
empower the Hero reuse **DRAGON WRATH** by replaying the contract below — they
never invent a second power state, a new ramp, or a competing glow. The Combo
B swings have their own handoff: [`hero_combo_b_handoff.md`](hero_combo_b_handoff.md).
The package map is [`dragon_wrath_package_index.md`](dragon_wrath_package_index.md).

- Family: **HERO LIGHT ECLIPSE** (Stage 8B-0, approved — see
  [`hero_eclipse_handoff.md`](hero_eclipse_handoff.md))
- **Reusable family name (locked, record verbatim): `DRAGON WRATH`.**
- Stage 8C-3 is **extraction / technical handoff only.** `src/` is untouched;
  no gameplay, hitbox, timing, balance, AI, camera, Boss, Combo A, throne room
  or package-config change. Nothing is integrated.

## Source of truth (approved, revised Stage 8C-1 "v2")

| role | file |
|------|------|
| production sheet | `dragon_wrath_combo_b_v2.png` |
| editable generator | `dragon_wrath_combo_b_v2_gen.js` (deterministic; all laws asserted in-file; byte-identical re-emit verified) |
| literal / matrix data | `dragon_wrath_combo_b_v2_literal.txt` |
| design specification | [`dragon_wrath_combo_b_v2_spec.md`](dragon_wrath_combo_b_v2_spec.md) |
| Hero Light Eclipse family | `hero_eclipse_*` + `src/core/HeroLightEclipse.js` |
| Hero sprite pipeline | `src/core/SpriteManager.js` (`HERO_REDESIGN_SPRITES`, row-count >= 20 detection) · `src/entities/Enemy.js` |

**The v1 8C-1 package (`dragon_wrath_combo_b_v1.png` + its gen/literal/spec) is
SUPERSEDED and was NOT used** — it was authored before the reference images
arrived and was rejected for reference drift. Its files remain on disk
untouched, for history only. The extractor and validator both refuse the v1
package and assert the v2 stamp.

### What Stage 8C-3 added (extraction artifacts)

| file | role |
|------|------|
| `dragon_wrath_literal.txt` | **shipping literal — STATE + finisher grids** (`dragonWrathRise2`, `wrathCharge2`, `wrathRelease2`, `wrathBurst2`, `lightGreatsword2`, `wrathBladeStudy2`) + a machine-readable `META` header (palette, anchors, holds, master clock, frame order, tiers, cleanup) |
| `hero_combo_b_literal.txt` | **shipping literal — the two swings** (`heroComboB2Swing1/2`) + META |
| `dragon_wrath_combo_b_extract.js` | slices the approved v2 clips **verbatim** and regroups them into the two shipping literals (never re-authors) |
| `dragon_wrath_combo_b_validate.js` | 85 checks against the SHIPPING literals + byte-compare vs the approved source |
| this doc + `hero_combo_b_handoff.md` + `dragon_wrath_package_index.md` | the technical handoff |

The shipping cells are **byte-identical** to the approved source (88,316 cells,
0 diffs — validated).

## Identity in one line

> The Hero's sacred battle-trance: white-core and warm-gold light lives INSIDE
> the body and ON the weapon — radiant, controlled, heroic — the exact opposite
> of the Boss's Red Eclipse, which voids the body and sinks ash.

---

## 1. DRAGON WRATH activation contract — the four marks

A frame is "in Dragon Wrath" exactly when it wears all four marks. **Sparse is
law** (a blob is a failure).

| # | mark | rule | ownership |
|---|------|------|-----------|
| 1 | **radiant skin** | 8B-0 BODYFLARE law: one ramp step brighter, palette-only (mask identity asserted), broken gold rim via the hero's own `g` key — the rim never touches the sword | **Hero-local** |
| 2 | **bounded radiance** | contour aura 4–34 cells, and/or the charge's radiance streamers 8–110 cells (broken RISING dashes — never fire), asserted per frame | **Hero-local** |
| 3 | **crown halo** | a small broken sacred arc above the helm — the at-a-glance state tell | **Hero-local** |
| 4 | **the WRATH BLADE** | §2 below | rides the Hero's own hand/hilt |

### Activation phase map (`dragonWrathRise2`, 8f / 31t — from *hero power up* 19f)

| phase group | frame | purpose | hold | behavior |
|---|---|---|---|---|
| **entry / gather** | P0 PRESENT | present the steel blade LEVEL, energy gathers on the body | 3 | one-shot |
| | P1 RAISE | raise the blade VERTICAL before the body + underfoot ground ring | 3 | one-shot |
| **sword-buff ignition** | P2 IGNITE | the gold runs hilt→tip up the vertical blade (transformation begins) | 3 | one-shot |
| | P3 BUILD | held blazing build, radiance streamers climb the body | 6 | **hold** |
| **transformation peak** | P4 SNAP | radial STARBURST snap | 5 | **hold** |
| | P5 STREAKS | rising streak wisps | 3 | one-shot |
| **settle to stable state** | P6 FLOURISH | a small presenting downswing showing the transformed blade | 4 | one-shot |
| | P7 WRATH IDLE | powered idle with the gold blade — **the reusable empowered stance** | 4 | **loop** |

**Ownership through activation:** body radiance and crown halo are Hero-local
(painted around the sprite at the hero 2px grid); the transformed blade rides
the Hero's hand; the ground ring is floor-anchored underfoot. There is no
world-space effect yet — the giant sword and burst belong to the finisher only.

**The deliberate feel:** the Hero is *applying a buff to the sword* (present →
raise → ignite hilt-to-tip → present the result), not standing idle while an
aura appears. Do not reduce this phase to a generic body glow.

**Transition into Combo B:** P7 WRATH IDLE is the seam. Combo B Swing 1 (`S1A
CARRY`) enters directly from the powered idle carry.

---

## 2. Transformed-sword contract — the WRATH BLADE

The Hero's own sword awakened into a **bright yellow-gold glowing energy blade
with a lightsaber-like feeling** — the corrected direction (this supersedes the
v1 "air-gap sheath, never a glowing stick" law).

- The physical **HILT never changes**: his steel arm, hand, guard wings, his own
  gold `g` winks. The blade attaches at the hand anchor (see §5).
- The **BLADE is pure light**: `W` core every cell, solid gold `y` body both
  sides, a few detached `o` energy winks (clean edges — deliberately **not** a
  saw), rounded `W`/`I` energy point.
- **Larger than the steel sword: reach 16 vs 11 (asserted ≥ 1.3×, actual
  1.45×)** — and every active combo swing uses **two hands (asserted)**.
- **States** (documented cell-for-cell in `wrathBladeStudy2`, 5 × 25×13):
  1. `STUDY STEEL` — pre-wrath cold-blue blade (reach 11) — the out-of-state form
  2. `STUDY IGNITE` — gold runs hilt→tip
  3. `STUDY EMPOWERED` — W core + solid gold body (reach 16) — the active form
  4. `STUDY FLARE` — white crackle + tip star (swing / impact flare)
  5. `STUDY SETTLE` — gold drains from the tip in, breaks into rising motes, the
     cold-blue edge returns
- **Blue law (asserted):** in-state frames carry **no blue beyond the
  character's own visor + sigil** (`l`/`L` on the body only, never on the
  blade); out-of-state frames (`STUDY STEEL`, the settle tail) keep the blue
  blade.
- **Mirroring:** authored facing RIGHT; the runtime full-sprite flip mirrors
  the whole clip (blade included) for left-facing. No separate left art.

**The handoff must prevent later integration from:** shrinking it to normal
size, replacing it with a generic trail, detaching it from the hands, carrying
it in physically incoherent poses, or losing the powered-up identity between
phases. `wrathBladeStudy2` exists precisely so the empowered form is
reproducible without guessing.

---

## 3. Post-combo CROWN CHARGE + the ~1.5 s presentation

Charge stance from *bswordcombo2*: the greatsword **shouldered up-back**
(−128°), wide low stance, gold radiance streamers flaring and BUILDING.

### Phase contract (`wrathCharge2`, 5f / **90t = ~1.5 s asserted**)

| phase | frame | rel. weight | behavior | effect growth | event triggers |
|---|---|---|---|---|---|
| charge entry | C0 PLANT | 10t | one-shot | streamers seed | — |
| early gathering | C1 EARLY | 18t | hold | streamers build (C1 level) | — |
| energy escalation | C2 STRONG | 22t | hold | streamers build (C2 level) | — |
| peak hold | C3 PEAK | 28t | hold | streamers peak (C3), ground halo | **arena darken starts (tick 117)** |
| release transition | C4 LOOSE | 12t | one-shot | blade swings up | **white flash fires (tick 154)** |

Streamers are asserted to build strictly **C1 → C2 → C3**. The charge is the
shouldered carry, **not** a raised-blade sigil pose. The Hero visibly exerts
force: wide braced stance + shoulder-loaded blade + streamers escalating — not
an idle pose with particles sprinkled on.

**Timing is presentation intent, not an FSM contract.** At integration the
90-tick channel maps to ~1.5 s; the darken and flash trigger points are
relative offsets inside it (darken at C3 entry, flash 3 ticks before C4 end).

---

## 4. DRAGONFALL — screen darkening, white flash, giant sword

The *bigsword* finisher. Exact approved lifecycle (do not redesign):

1. charge reaches its release point (C4)
2. **arena darkens** (tick 117, ramps through C3)
3. **strong white / white-gold flash** (tick 154)
4. giant sword appears high above (GS0 FORM, tick 157)
5. giant sword fully revealed (GS1 REVEAL, tick 163)
6. sword descends vertically (GS2 DESCENT, tick 169)
7. near-contact / point meets floor (GS3 CONTACT, tick 177)
8. ground impact — peak Light Eclipse event (GS4 PEAK, tick 181)
9. sword + effects dissolve (GS5 FADE, tick 191)
10. environment returns to normal (darken lift, tick 191)
11. Hero exits Dragon Wrath cleanly (F2 SETTLE, closes at tick 201)

### Screen-darkening contract

- **Start:** tick 117 (C3 PEAK entry); ramps up through the peak hold.
- **Treatment:** environment **value reduction** — a per-channel dim map
  (`DIMENV` darkens each stone/window colour one step) **plus cinematic
  LETTERBOX bars** (`LBAR #060509`) that come from the *bigsword* reference
  frame itself. Contrast framing, not a flat black wash.
- **Affected layers:** arena background + panorama + masonry (dimmed). The
  Hero silhouette, the transformed blade, the streamers, the flash and the
  giant sword are **NOT** dimmed — they read against the darkened arena.
- **Restore:** darken lifts at tick 191 (GS4→GS5). **The handoff forbids ugly
  flat black UI bars** — the letterbox is a thin cinematic frame; the darken is
  a value dip, not an opaque overlay.

### White-flash contract (`wrathBurst2`, 3f / 41×41, centre (20,20))

- **Trigger:** tick 154 (3 ticks before the charge ends), immediate onset.
- **Frames:** WB0 SEED → **WB1 WHITEOUT** (2-tick near-whiteout beat, white-share
  ≥ 45% asserted) → **WB2 CLEAR** (hollow core — asserted 0 cells within r4).
- **Duration:** 6 ticks total, ≤ 2 of whiteout — **strong but brief; it must
  clear** and never permanently obscure the scene.
- **Relationship:** the flash covers the giant sword's manifestation (it appears
  behind/through the flash at 157), then clears to reveal it hanging.
- **World/screen-space, render-only.**

### Giant Light Eclipse sword contract (`lightGreatsword2`, 6f / 41×88)

The massive version of the transformed blade — same gold energy body
(`W` core / solid `y` / `o` fringe) on a real greatsword frame.

| anchor | value |
|---|---|
| grid | 41×88; **on screen 82×176 px** |
| horizontal centre | column **20** |
| pommel (spawn top) | row **2** |
| crossguard | row **12** |
| **TIP / floor-contact** | row **80** (plants on the floor line) |
| space | **world-space** (the 8C-0 pillar contract — pure LIGHT keys, never rides the sprite anchor) |

- **Manifestation:** high above the arena (pommel at the top of the grid);
  horizontal centre at the impact column.
- **Descent:** vertical; GS1 REVEAL → GS2 DESCENT is asserted **identical blade
  cells** (no stretch / shrink) + fall streaks; acceleration read via streaks +
  pressure under the point.
- **Near-contact:** GS3 CONTACT — the point meets the floor at row 80 (impact
  star + floor ellipse).
- **Impact:** GS4 PEAK (tick 181) — base detonation, double halo, burst rays,
  floor streaks, risen fragments; the visual dominant of the finisher.
- **Dissolution:** GS5 FADE — burns out **base-up** (buried end first, asserted),
  the **crown goes last** (asserted), motes RISE (mean-Y rises, asserted).
- Anatomy asserted: guard ≥ 1.7× root width, tapered tip (not a beam), length
  ≥ 2.5× hero, W core ≥ 90% of the blade centreline, gold ≥ 30% of the light.

**The handoff forbids** turning it into a generic vertical beam, a stretched
normal sword, a smooth non-pixel asset, a floating sword with no descent, or a
sword that clips through the floor without a clear impact.

### The Hero under the fall (`wrathRelease2`, 2f / 44t)

- **F1 GUARD** (22t, ticks 157–179) — guards under the descending sword.
- **F2 SETTLE** (22t, ticks 179–201) — the state ENDS: crown fragments, gold
  drains from the tip in, the **cold-blue blade returns**, radiance breaks into
  rising motes. The seam back to normal locomotion.

---

## 5. Anchor documentation (all real repo coordinates)

Authoring canvas **60×40** (grown from the 44×34 combo canvas for the enlarged
blade + Insignia-scale motion). `drawSprite`'s centerX / feet-bottom anchor
self-solves any canvas size; the 8B-3 `HERO_BODY_ROWS/COLS` clamps already make
HP-bar / shadow framing canvas-independent; row-count ≥ 20 routes these frames
to `HERO_REDESIGN_PALETTE`.

### Body (60×40 grid)
| anchor | value |
|---|---|
| hero sprite origin | (15, 16) |
| feet / floor row | 39 (last-but-one; shadow row 39) |
| shoulder (grip root) | (29, 28) |
| hip | row 30 |
| steel reach / wrath reach | 11 / 16 |

### Per-frame hand-grip + blade-angle anchors
The blade is drawn from the hand `(hx,hy)` at `angle°` for `reach`. Key poses:

| frame | hand | angle° | notes |
|---|---|---|---|
| P0 PRESENT | (35,26) | 0 | steel, level, two-hand |
| P1–P4 (raise→peak) | (34,25) | −90 | vertical; ignites, then empowered |
| P6 FLOURISH | (36,27) | 38 | presenting downswing |
| P7 WRATH IDLE | (33,27) | −14 | powered carry |
| S1B PITCH | (33,15) | −95 | high back carry, leg lifts |
| S1C CRASH | (38,27) | 52 | overhead→low-front crescent |
| S2B SWEEP | (40,30) | 8 | low floor-skimming cleave |
| S2C LUNGE | (41,31) | 4 | full-stretch lunge |
| S2D RISE | (33,22) | −85 | to vertical (fan) |
| S2E SHOULDER / C0–C4 | (31,24) | −128 | the shouldered charge carry |

### Swing crescent centres (for the trail painter)
- Swing 1: radius 20, arc **−125° → 55°** (overhead-back → low-front).
- Swing 2: centre (29,16), radius 19, arc **150° → 28°**; rise 28°→−85°;
  shoulder carry −128°.

### World-space (detached grids — the pillar contract)
| effect | grid | centre / key rows | space |
|---|---|---|---|
| flash `wrathBurst2` | 41×41 | centre (20,20) | screen / sky point |
| giant sword `lightGreatsword2` | 41×88 | col 20; pommel row 2; guard row 12; **TIP row 80 = floor line** | world |
| blade study `wrathBladeStudy2` | 25×13 | documentation only | n/a |

**Coordinate conversion:** the 60×40 body clips are authored one row-count class
(≥ 20) so the existing hero 2px path renders them at `HERO_IDLE_PIXEL` 2. The
world-space grids do NOT ride the sprite anchor — at integration the giant sword
draws at a world x (impact column) with its TIP row pinned to `floorY`, on the
same seam the light-wave projectiles already use (`drawWaveProjectiles`).

---

## 6. Layering contract (back → front)

| layer | content | space |
|---|---|---|
| 0 | arena background + panorama | world (dimmed by darken) |
| 1 | **darken treatment** (value dip + letterbox bars) | screen/world overlay, render-only |
| 2 | Hero body radiance / contour aura / streamers (behind body) | Hero-local |
| 3 | **Hero body** (radiant skin) | Hero-local |
| 4 | transformed sword + sword trails + crown halo (front accents) | Hero-local, rides the hand |
| 5 | **white flash** `wrathBurst2` | screen-space |
| 6 | **giant sword** `lightGreatsword2` + supporting geometry + impact | world-space, TIP floor-pinned |
| 7 | foreground fragments / dissolution residue (rising motes) | world / Hero-local |

Explicit ownership: radiance / aura / streamers / crown halo / transformed blade
= **Hero-local**. Darken + letterbox + flash = **screen-space, render-only**.
Giant sword + its halos/impact = **world-space, floor-anchored**. **None of the
render-only presentation may silently become a gameplay mechanic.**

---

## 7. Quality tiers

| tier | behavior |
|---|---|
| **normal** | full presentation: complete transformed-sword detail, full trails + sacred geometry, full darken + flash + giant sword + impact + dissolution |
| **lite** | reduce secondary fragments / sparks / minor rays / repeated particles. **Preserve:** body choreography, transformed-sword shape, both swings, charge readability, darken, flash, giant-sword silhouette |
| **performance** | preserve all core silhouettes + sequence identity: transformed sword, the 2-swing structure, charge pose, giant-sword descent + impact. **Never** replace the event with a generic glow / beam placeholder |
| **auto** | follow the project's existing quality-selection behavior (the `?vfxQuality` / PerfMonitor path) |

The tier cuts are the same grammar as the shipped Light Eclipse combo:
secondary motes/sparks drop first; silhouettes and the sequence never degrade.

---

## 8. Gameplay-handoff notes (minimum for Stage 8C-5 — do NOT do now)

Enter the named **DRAGON WRATH** state → activate the transformed sword →
preserve it through both swings + charge → map Swing 1 / Swing 2 → transition
S2E→charge → present the ~1.5 s charge → start + restore arena darkening →
trigger + clean the white flash → spawn the giant sword at col 20 / TIP row 80
→ vertical descent → floor pinning → impact → sequence completion → deactivate
→ transformed-sword cleanup → interruption cleanup → Hero-death cleanup →
encounter-reset cleanup → repeated-use cleanup → quality-tier cleanup → prevent
duplicate effects + stale screen treatment. No new mechanics; no Hero-AI
redesign.

---

## 9. Interruption & cleanup expectations

| event | required cleanup |
|---|---|
| **normal completion** | F2 SETTLE (tick 201) drains the state: blue blade returns, streamers → rising motes, darken lifted (191), flash long cleared, giant sword dissolved |
| **interruption (any)** | restore the cold-blue steel blade; drop radiance / streamers / crown halo; cancel any pending giant sword + burst; restore the screen (lift darken, kill flash). No stale screen treatment or floating sword survives |
| **Hero death** | Dragon Wrath must NOT survive death: force the interruption cleanup; world-space sword + burst must be explicitly despawned |
| **encounter reset** | purge all render state (flag, blade transform, world effects, screen overlay) — a fresh encounter starts clean |
| **repeated use** | each activation spawns exactly one giant sword + one burst; guard against duplicate world effects and duplicate darken/letterbox overlays |
| **screen overlay** | darken + letterbox + flash are one idempotent render-only pass, always restored |

These are also encoded as `cleanup` metadata in `dragon_wrath_literal.txt` and
asserted present by the validator.

---

## 10. Stage 8C-5 integration risks (practical, integration-facing)

1. **Wrong assets** — do not select the obsolete v1 package. The extractor +
   validator refuse it; integration must read `dragon_wrath_literal.txt` /
   `hero_combo_b_literal.txt` (or the approved v2 literal), never `*_v1*`.
2. **Three swings** — Combo B is exactly TWO. The validator fails on any third
   swing group. Do not pad the chain.
3. **Two-handed coherence** — the active swings + charge are two-handed; keep the
   far arm and the blade attached to the hand anchor.
4. **Detached sword** — the blade rides `(hx,hy)`; if the hand anchor drifts the
   blade floats. Preserve the per-frame hand anchors (§5).
5. **Sword survives the sequence** — the transformed blade must be torn down at
   F2 SETTLE / on interruption; a lingering gold blade is a bug.
6. **Bad S2→charge transition** — S2E SHOULDER *is* the bswordcombo2 carry; the
   charge begins from exactly that pose. Don't insert a transition.
7. **Charge mis-timing** — 90 ticks, darken at C3 entry, flash at C4−3. Getting
   the relative offsets wrong desyncs the finisher.
8. **Darken not restored** — must lift at 191; a stuck darken kills the arena.
9. **Flash stuck** — must clear (WB2 hollow); a stuck flash whites out the game.
10. **Giant sword wrong space** — it is WORLD-space with the TIP pinned to
    `floorY`; using screen-space (or not pinning) breaks the impact.
11. **Giant sword layer** — must draw in front of the arena/darken but its impact
    reads at the floor; behind-layer mistakes hide it.
12. **Interruption during charge/descent** — must run the full cleanup; a
    mid-descent interrupt must despawn the world sword.
13. **Dragon Wrath surviving death/reset** — force cleanup on both.
14. **Duplicate Light Eclipse effects** — one sword + one burst per activation.
15. **Over-degraded performance mode** — never swap the event for a plain beam.

---

## 11. Validation

```bash
cd tools/redesign
node dragon_wrath_combo_b_extract.js    # re-emit the two shipping literals from the approved v2 source (byte-identical)
node dragon_wrath_combo_b_validate.js   # 85 checks — exit 0 = ALL PASSED
```

The validator reads the **shipping literals** (`dragon_wrath_literal.txt` +
`hero_combo_b_literal.txt`) and byte-compares them against the approved v2
source (88,316 cells, 0 diffs). It fails loudly on: wrong/missing frame groups,
bad dimensions or row widths, illegal palette keys, warm-law violation, a third
swing, missing anchors, a shrunk / beam-like giant sword, wrong floor-contact
row, mis-timed charge / darken / flash, a non-clearing flash, a non-rising
dissolution, missing facing/tier/cleanup metadata, or use of the v1 package.

## Distinctness (the mirror stays pure)

| | BOSS Red Eclipse | HERO Dragon Wrath |
|---|---|---|
| body | eclipseSkin voids the body | radiant skin brightens it one step |
| weapon | molten black/red blade | a golden light blade on his own hilt |
| geometry | broken octagon, never a circle | true circles, halos, starbursts |
| exit | ash sinks | motes rise; blue returns to the blade |
| finisher | rams the floor, void detonation | the sword descends FROM the sky; burns out base-up; the crown goes last |

No red, no void, no bolts, anywhere in these grids (asserted palette law).

## Reuse map

- **Enrage (encounter 27)** — the natural first consumer: enrage IS Dragon Wrath
  turning on (rise → wrath idle → empowered swings).
- **Empowered phases** — the WRATH IDLE + gold blade, no combo required.
- **Future ultimates** — charge = the shouldered carry + streamers; detonation =
  `wrathBurst2`; world-scale finishers compose from `lightGreatsword2`'s laws.
- **Screen events** — the letterbox + value-dip darken and the
  strong-flash-that-clears law.

Integration is a **later gameplay stage** (8C-5). Stage 8C-1 (both passes) and
Stage 8C-3 touched nothing in `src/`.
