# Hero DRAGON WRATH + Combo B — v2 (Stage 8C-1 REDO, reference-faithful)

Production sheet: `dragon_wrath_combo_b_v2.png` (generator
`dragon_wrath_combo_b_v2_gen.js`, data `dragon_wrath_combo_b_v2_literal.txt`).
**STATUS: CONCEPT (Stage 8C-1 redo), pending approval. Nothing wired into
`src/`. This pass SUPERSEDES the v1 8C-1 output** (`dragon_wrath_combo_b_v1.png`
and its gen/literal/spec) — v1 was designed before the reference images
arrived and was rejected for reference drift. v2 is a full redo from scratch;
the v1 files are kept on disk untouched, for history only.

Strict pixel art: hard cells, no blur, no gradients, ZERO BLUE in the effects
(the visor + chest sigil keep their cold blue — the character, not the
effect). White core + gold. No Red Eclipse language anywhere.

---

## The reference map (the main source of truth for this pass)

All four references were recovered and the two animated ones decoded frame by
frame (31 + 19 frames) before any pose was authored:

| reference | what was taken | where it lands |
|---|---|---|
| **hero power up** (19f GIF) | the full activation beat map: present the blade LEVEL → raise it VERTICAL before the body + ground ring → the blade ignites GOLD hilt-to-tip → held blazing build with radiance climbing the body → radial STARBURST snap → rising streaks → a small presenting FLOURISH downswing → powered idle with the golden blade | `dragonWrathRise2` P0–P7, beat for beat |
| **bswordcombo** (31f GIF, Insignia) | Swing 1 = f0–f8: high back carry → forward pitch with the back leg kicked up → ONE huge overhead-to-low-front crescent → deep crouch held long. Swing 2 = f9–f30: low drag past the hip → floor-skimming cleave into the LONGEST lunge in the clip, held → follow-through rises to FULL VERTICAL with a fan smear → the blade settles onto the shoulder. Also the smear-frame idiom itself: the whole trail appears in one frame and the body holds | `heroComboB2Swing1` (5f) + `heroComboB2Swing2` (5f); the S2E shoulder settle is the charge entry |
| **bswordcombo2** (static) | the charge carry: greatsword SHOULDERED up-back (−128°), wide low stance, ragged energy flaring around the body | `wrathCharge2` C0–C4 — the flare adapted to gold radiance streamers (broken rising dashes, never fire), building C1→C3 (asserted) |
| **bigsword** (cinema frame + briefed structure) | the staging and feeling: cinematic LETTERBOX bars, arena darkening, a STRONG white flash, the giant golden sword appearing high, descending vertically, a huge impact, gold aftermath | the 7-panel screen event strip + `wrathBurst2` + `lightGreatsword2` + the master clock |

The chain between references is the reference's own: bswordcombo literally
ends with the blade coming to rest on the shoulder — which is bswordcombo2's
carry — so combo → charge needs no invented transition.

## What changed from v1 (the correction)

- **The blade law flipped.** v1's "air-gap sheath, never a glowing stick" is
  superseded by the corrected direction: the transformed sword is now a
  **bright yellow-gold GLOWING energy blade with a lightsaber-like feeling**
  — W core every cell, solid `y` gold body both sides, a few detached `o`
  energy winks (clean edges — deliberately not a saw), rounded W/I energy
  point. It is **larger**: reach 16 vs the steel 11 (asserted ≥1.3×), and
  every active swing is **two-handed** (asserted).
- **Two swings, not three** — and they follow the decoded Insignia frames
  closely (posture, footwork, weight, holds), not an invented rotation.
- **The charge is the shouldered carry**, not a raised-blade sigil pose.
- **The finisher embraces the reference's cinema**: letterbox bars are IN
  (they come from the reference frame), and the flash is allowed a genuine
  2-tick near-whiteout beat (82% white + burst) inside its 6 ticks — strong,
  but still clearing (WB2 hollow, asserted).
- **Canvas grew to 60×40** (hero base at 15,16; feet row 39): the enlarged
  blade, the deep crouch and the stretched lunge do not fit 44×34. The
  runtime path self-solves (feet-bottom anchor, row-count ≥20 detection, the
  8B-3 body-box clamps are canvas-independent).

What did NOT change: the LIGHT ramp (warm law asserted), the four state
marks of DRAGON WRATH (radiant skin + bounded radiance + crown halo + the
transformed blade), the family grammar, the world-space grid contract, and
the settle law (the state ends by draining: blue returns, light rises).

## The clips

| clip | frames | ticks | what |
|------|--------|-------|------|
| `dragonWrathRise2` | 8 | 31 | P0 PRESENT · P1 RAISE(+ground ring) · P2 IGNITE(gold runs in) · P3 BUILD(hold, streamers) · P4 SNAP(starburst, hold) · P5 STREAKS · P6 FLOURISH · P7 WRATH IDLE |
| `heroComboB2Swing1` | 5 | 18 | S1A CARRY · S1B PITCH(leg kicks up) · S1C CRASH(hold 6, the giant crescent + floor star) · S1D CROUCH(weight down) · S1E SETTLE |
| `heroComboB2Swing2` | 5 | 18 | S2A DRAG · S2B SWEEP(hold 6, low band + lunge + skim) · S2C LUNGE(full stretch hold) · S2D RISE(to vertical, fan) · S2E SHOULDER(charge entry) |
| `wrathCharge2` | 5 | **90 = 1.5 s (asserted)** | C0 PLANT · C1 EARLY · C2 STRONG · C3 PEAK(arena darkens) · C4 LOOSE(the flash fires) |
| `wrathRelease2` | 2 | 44 | F1 GUARD(under the fall) · F2 SETTLE(state ends, blue returns) |

Detached world-space grids (pure LIGHT, the pillar contract): `wrathBurst2`
41×41×3 (the strong flash), `lightGreatsword2` 41×88×6 (FORM · HANG · FALL ·
TOUCH · PEAK · FADE; TIP row 80 plants on the floor line; 82×176 px on
screen), `wrathBladeStudy2` 25×13×5 (weapon-state documentation).

## The master clock (asserted)

activation 0–31 · swing1 31–49 · swing2 49–67 · charge 67–157 (90 exactly) ·
**darken from 117** · **flash 154 (+6, 2-tick whiteout beat)** · greatsword
157–201 · **contact 177 · peak 181** · fade + darken lift + state settle →
**201**. Timings are presentation intent, not an FSM contract.

## Validation (all asserted in-generator, throws on violation)

Warm law; dim map darker per channel; sizes/keys; fx layers LIGHT+steel only;
feet law; body mass; radiant mask identity; cover ≤8 (≤18 flare); radiance
bounds (aura 4–34, streamers 8–110); the gold blade law (wrath frames: no
blue beyond the character's 6, W core + `y` body present, thresholds for
behind-carries and flare; igniting keeps the character blues; settle/base
keep a blue blade); blade larger ≥1.3×; two-handed actives; **reference
fidelity laws** — S1 crescent spans overhead-back AND low-front, S1 crouch ≤
0.85× standing height, S1 pitch lifts the back leg (floor-cell window), S2
lunge ≥1.18× standing width, S2 sweep skims the floor rows, S2 rise vertical
±8°, shoulder carry −115°..−145°, charge streamers strictly build C1→C3;
move escalation with the finisher dominant; burst white-share ≥45% + hollow
clear + whiteout ≤4 ticks inside flash ≤10 + darken lead ≥24; charge = 90;
clocks close together; greatsword sword-anatomy (guard ≥1.7× root, taper,
length ≥2.5× hero, W core ≥90%, gold share ≥30%), GS1⊂GS2 descent identity,
fade thinning + base-up burnout + crown-last + rising mean-Y; literal
round-trip on all 8 clips; deterministic re-emit (verified byte-identical).

## Integration — a LATER gameplay stage

A 2-hit chain needs its own hit table (or a trimmed combo FSM); the charge
needs a 90-tick channel state; the greatsword + burst extend the world-space
effect seam the light-wave projectiles already use; the darken + letterbox
bars are a render-only overlay pass. None of it ships behind an art swap.

## Reproduce

```bash
node tools/redesign/dragon_wrath_combo_b_v2_gen.js   # re-emits sheet + literal, byte-identical
```
