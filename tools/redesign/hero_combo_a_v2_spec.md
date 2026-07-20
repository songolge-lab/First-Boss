# Hero Combo A — "MERIDIAN LOOP" V2 (Stage 8C-4 visual correction pass)

Production sheet: `hero_combo_a_v2.png` (generator `hero_combo_a_v2_gen.js`, data
`hero_combo_a_v2_literal.txt`).
**STATUS: CORRECTION PASS over the approved-and-integrated 8C-0 REV 2 package.
Visual package only — `src/` untouched, nothing re-wired, no commit. The v1
package (`hero_combo_a_gen.js` / `hero_combo_a_v1.png` / `hero_combo_a_literal.txt`
/ `hero_combo_a_spec.md`) stays on disk unmodified; the NEXT integration pass
targets THIS v2 package.**

> **This is not a redesign.** Same hero, same Light Eclipse family, same five-step
> structure, same choreography logic, same glaive / chase / teleport-return
> concepts, same canvas, same ramp, same production-sheet style. Four corrections
> only; everything outside them is the approved art unchanged.

---

## The four V2 corrections

### C1 — Pacing: 82 → 97 ticks (~18% slower)

The v1 combo read too fast. The full sequence is now **97 ticks (+18.3%)**,
inside the requested 96–98 band. The slowdown is distributed where readability
was missing — **anticipation, launch, apex, plunge, post-hit, the pillar event,
and the teleport return** — and **never** into the travel frames, which keep
their 2 ticks, so the combo still spends its time moving, not posing. It reads
slightly heavier and less rushed, still dynamic and dangerous.

| step | v1 holds | v2 holds | v1 → v2 |
|------|----------|----------|---------|
| S1 SUNSTEP | 4+2+4+4 = 14 | **5**+2+**5**+4 = **16** | windup +1, hit hold +1 |
| S2 ZENITH DIVE | 4+2+5+2+5+4 = 22 | **5**+**3**+**6**+**3**+**6**+4 = **27** | coil +1, launch +1, apex +1, plunge +1, slam +1 |
| S3 SUNGLAIVE | 3+2+4+3 = 12 | **4**+2+**5**+3 = **14** | draw +1, release hold +1 |
| S4 CHASECUT | 3+2+3+2 = 10 | **4**+2+**4**+2 = **12** | mark +1 (the return anchor reads longer), cut hold +1 |
| S5 CHAIN + RETURN | 3+5+4+3+4+5 = 24 | **4**+**6**+**5**+**4**+4+5 = **28** | seed +1, erupt +1, crown +1, unmake +1 |
| **TOTAL** | **82** | **97** | **+15 ticks = +18.3%** |

Identity revision that comes with C1: the v1 line "faster and more graceful
than the boss combo" (16.4 ticks/step) is superseded. V2 is **19.4 ticks/step
vs Daybreak's 16.75 — deliberately a touch heavier**; the grace now comes from
the distance covered and the loop closing, and the holds live only on the true
impacts, the apex, and the anticipation beats.

### C2 — The aerial descent is a DIAGONAL plunge

V1's dive read as a mostly level body over a mostly vertical drop. Corrected:
the hero **launches upward, rotates through the air (unchanged), then descends
diagonally and strikes the ground on a clearly diagonal attack path** — cutting
down through space on a line. Not a horizontal dash, not a vertical slam.

How it is built (still lossless, still house-idiom):

- `D2A PLUNGE` — the 90° transpose body (v1's rotation, kept) now gets a
  **per-column stair shear** (`DIVE_SLOPE 0.45`, each column intact, offset down
  by `floor(col * slope)`) — clean pixel stairs, no resampling, no mush. The
  silhouette pitches **nose-down**: head leading low-forward, legs trailing
  high-behind, cape up the back. Both hands drive the sword **down-forward at
  52°** so the **blade leads the diagonal line**; white/ivory tip glints continue
  the line toward the landing spot. Three wake lines run **parallel to the dive
  line** (45°, upper-back → lower-front). The apex light is left behind at the
  **upper-back origin** of the line and rises (mirror law intact: the hero falls
  out of its own light; north stays the longest ray).
- `D2B SLAM` — the rotation completes on the diagonal: weight sunk, crouch
  pushed **further forward** (the dive carried him), blade planted into the
  floor **at 62°, not vertical**; the impact star sits at the diagonal plant
  (32,29); the **entry line still burns behind him along the arrival diagonal**;
  skid ticks trail back along the arrival path.
- Body rotation, sword rotation, silhouette readability, Light Eclipse identity,
  and the airborne law (no body on the floor rows — asserted) all preserved.
- **Trajectory intent for the next integration pass:** the dive's descending arc
  should carry **forward drift** so the hero lands ahead of the launch point
  (tableau 1 stages it at roughly a 30–40° descent). The live `HeroComboA`
  parametric arc gains a forward x-velocity on the descending half — gameplay
  wiring, out of scope here.

### C3 — The end event is a FORWARD SEQUENTIAL PILLAR CHAIN

The single Noon Pillar is corrected into a **chained Light Eclipse pillar burst
that propagates forward** in the attack direction. `lightPillar` is now
**100×72 cells, 7 frames (PC0..PC6), four stations** at local cols
**12 / 36 / 60 / 84** on base row 68 (2px on screen: 200×144 px, stations 48 px
apart).

- **4 pillar beats** (the requested "a few": more than one, nowhere near a wall).
- **Appear in sequence:** station k erupts at frame k+1 — nearest first, marching
  away from the mark, one station per beat.
- **Dissolve in sequence:** each station plays erupt → full+crown → breaking →
  rising residue → embers on its own 4-frame life; station 0 dies first, the far
  station burns last.
- **PC0 declares the whole path** as ground marks dimming with distance (the
  fuse) — the sequence reads ordered and intentional, never four random
  explosions.
- **Heights escalate forward** (34/40/46/52 rows tall): the chain grows as it
  travels — and the **far station peaks with the grand true-circle emblem crown
  on PC5, after the hero is already home.**
- Family purity unchanged: every pillar is still **the EMBLEM's north ray at
  world scale** — tapered base→tip, own ground halo, true circles, north-
  dominant, motes rise (the boss rams the floor and sinks ash; every chain
  pillar tears OUT of the floor and its light lifts).
- Asserted in-generator: appear-in-order + dissolve-in-order (per-station column
  mass over the 7 frames), one-station-per-beat, per-station local h-symmetry at
  erupt/full (a `ringSym` plotter replaces v1's whole-grid `mirrorH`, which a
  forward-marching chain cannot use), escalating heights, north-dominance every
  frame, per-station rising residue, end-thinning, grand-crown circle purity.
- **Anchor change for integration:** v1 anchored the pillar's centre col 20 at
  the far end. V2 anchors the **NEAR station (col 12) on the same far-end spot**;
  the chain extends **forward** from there (+176 px on screen at 2px). The
  hero's S5 body frames still show the near edge of station 0 beside him —
  unchanged approved art, and consistent: P5B/P5C (ticks 73–84) overlap PC1/PC2,
  exactly when station 0 erupts and peaks.

### C4 — Recorded notes (REQUIRED — read before the next integration pass)

> **GAMEPLAY NOTE — contact-damage immunity during Combo A.**
> **During Combo A, from combo start to combo end, the Hero must ignore
> body-contact / collision damage from the Boss.** If the Boss physically
> collides with the Hero during Combo A, the Hero takes no contact damage and
> the collision does not break the combo. **This immunity covers body-contact
> collision damage ONLY — it is NOT full invulnerability.** Normal attacks
> (weapon strikes, projectiles — anything that is not plain body contact) must
> still be able to **damage the Hero, interrupt the Hero, and stop the combo**
> if appropriate. Wire this into the `COMBO_A` state at the next integration
> pass (the state already centralizes its cleanup in `takeDamage` — the contact
> path must be gated there without touching the normal-attack path).

> **PRODUCTION NOTE — durable, applies to all future Hero action visuals.**
> **Future Hero combo / action visuals must NOT default to overly fast animation
> pacing.** Use readable anticipation, impact holds, and event readability by
> default; go fast only when the user explicitly requests a fast sequence.
> (This pass exists because 8C-0 defaulted to too fast. Do not repeat it.)

---

## The chain (5 steps, 24 frames, 97 ticks) — v2 clock

| # | Name | Frames (holds) | Starts at tick |
|---|------|----------------|----------------|
| S1 | SUNSTEP | W1 5 · A1A 2 · A1B **5 (hold)** · L1 4 | 0 |
| S2 | ZENITH DIVE | W2 5 · J2 3 · T2 **6 (hold)** · D2A 3 · D2B **6 (hold)** · R2 4 | 16 |
| S3 | SUNGLAIVE | W3 4 · A3A 2 · A3B **5 (hold)** · L3 3 | 43 |
| S4 | CHASECUT | W4 4 · A4A 2 · A4B **4 (hold)** · L4 2 | 57 |
| S5 | PILLAR CHAIN + ECHO RETURN | P5A 4 · P5B **6 (hold)** · P5C 5 · E5A 4 · E5B 4 · E5C 5 | 69 |

Step structure, frame tags, poses, effects and the five-step identity are the
approved v1 art (only D2A/D2B were re-authored, per C2).

## The loop clock (asserted — v2 numbers)

| | tick |
|---|---|
| S5 begins / chain seeds (PC0) | 69 |
| chain wave beats | PC0 69 · PC1 73 · PC2 77 · PC3 81 · **PC4 85** · PC5 89 · PC6 93 |
| **ECHO RETURN lands** (`E5B REFORM`) | **88** (during **PC4** — station 3 full, station 4 erupting) |
| **Chain dies** (end of PC6) | **97** |
| **Margin** | **9 ticks** (identical to v1's margin — the identity is preserved) |

The return still lands inside the lit corridor bed: CR0 runs 57–69 (S4), **CR1
69–89 (the lit bed — return at 88 lands inside it)**, CR2 89–101. The far
station's grand crown opens at PC5 (89) — **after** the hero is home: he watches
his own finisher finish from the mark. The overlap is still the whole move.

## Escalation law (v2 measurements)

Measured per step as hero hit-frame LIGHT + the step's owned detached grid
(unchanged law): **S1 101 → S2 295 → S3 196 → S4 478 → S5 1343.** S1 smallest,
S5 dominant (>1.5× all others), middle band above the opener — asserted. S3 <
S2 remains by design (the light left the sword for the glaive). The chain peak
frame (PC4, 1239 lit cells) is what S5 owns.

## What did NOT change

- Hero design, canvas (44×34, base at 7,10, feet row 33), palette (HERO keys +
  six LIGHT keys, zero blue in effects), authored facing right.
- S1 bow opener, S3 glaive cast, S4 mark + chase — untouched art, new holds only.
- `lightGlaive` 25×25×3, `lightCorridor` 72×17×3, `lightReform` 33×33×3 —
  cell-identical to v1.
- The advance: 5 hero lengths (`ADVANCE_PX 150`, asserted 3.5–6.5).
- The teleport-return grammar (DISSOLVE at the far end / GATHER at the mark,
  both bottom-up, light rises in both halves) and THE MARK as the return anchor.
- Radiant skin + bounded contour aura (5–34 cells, asserted) on the key moments.
- All v1 frame-level laws still asserted: warm law, fx-key restriction, airborne
  law, body-mass conservation, unmake/reform ratios + bottom-up mean-Y proof,
  radiant mask identity, body-cover limits, the S4-settle seam, literal
  round-trip re-parse, byte-identical re-emit.

## Integration deltas for the NEXT pass (this pass wires nothing)

1. Re-emit `src/core/HeroLightEclipse.js` grids from **`hero_combo_a_v2_literal.txt`**
   via the (updated) integrate tool — `lightPillar` becomes 100×72×7.
2. Retune the `HeroComboA` step clock to the **v2 holds** (97 ticks) and the
   chain/corridor clocks above.
3. Anchor the chain at its **near station col 12** on the old pillar spot,
   marching **away from the mark** (mirror via aimDir for left-facing).
4. Give the dive's descending arc **forward drift** (lands ahead of launch).
5. Wire the **contact-damage immunity** note (C4) — contact path only.
6. Arena-bounds note: the chain extends ~176 px beyond the cast point at 2px;
   clamp or slide the chain anchor if cast near the far wall (same policy the
   corridor already needs).

## Reproduce / verify

```bash
cd tools/redesign
node hero_combo_a_v2_gen.js    # re-emits hero_combo_a_v2.png + hero_combo_a_v2_literal.txt
                               # byte-identical across runs; all laws asserted in-generator
node hero_combo_a_validate.js  # (v1 validator) still passes — proves the v1 package untouched
```
