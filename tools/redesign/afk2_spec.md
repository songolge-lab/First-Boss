# Stage 7A-2A — AFK Intimidation Visual Polish (concept hand-off)

Concept sheet: `afk2_v1.png` (generator `afk2_gen.js`).

> **STATUS: INTEGRATED in Stage 7A-2C (July 2026).** This concept is now live in
> `src/`. The curse-pressure darkening rebuilt `SpriteManager.drawIntimidationVignette`
> (a pixel-exact port of `paintCurse`) and the void-fracture arcs shipped as
> `SpriteManager.drawVoidFractureArcs`, scheduled off the heartbeat in `Player`.
> `main.js` passes the breathing `phase`. Enemy.js / throne room / hero VFX untouched.
> The notes below are the original concept hand-off, kept for reference.

Redesigns two things about the live AFK state, everything else (barrier wave, planted clips,
hero brace/WARY, aura, denial tint) stays as approved in 7A-0/7A-1:

1. **Screen darkening** — the rejected quantized rectangular corner strips
   (`drawIntimidationVignette`) are replaced by the organic **"curse-pressure"** family.
2. **Boss lightning** — NEW **"void-fracture"** black-red arc family around the planted boss
   (ref-3 motion language adapted to the ember-void palette), chest-core synced.

---

## A. Curse-pressure screen darkening (replaces the vignette internals)

Five systems, painted screen-space over the world, **no straight band edge anywhere**
(every boundary is a tongue silhouette, a dither, or a petal). Colors: `#060409` (VOID),
`#0a0410` (DEEP) + sparse `#6e0f1c`/`#a8182a` (E0/E1) accents only. No blue/purple ever.

| # | System | Construction | Values |
|---|--------|--------------|--------|
| 0 | pressure haze | quantized dither field by noisy edge-distance: 75% density (outermost ~35% of depth, skip `(x+y+ph)%4==0`), 50% (`(x+y+ph)%2==0`), 25% (`x%2==0 && (y+ph)%2==0`); per-pixel noise ±3 on the distance kills straight seams | VOID @ 0.45, depth ≈ 22px @ 1080-scale reference (scale with viewport) |
| 1 | bottom curse-tongues | irregular tent profiles (span 8–13, sharp curve), 2 layers + ≤3 thin 1px spikes near corners; top pixel of every column dither-broken | back DEEP @ 0.62 (max ~15px), mid VOID @ 0.85 (~65% of back), spikes VOID @ 0.95 |
| 2 | top void-folds | same builder, wider spans (9–14) + rounder curve; 2 hanging 1px drip tails off fold apexes | same alphas; max ~13px; drip tip E0 @ 0.85 winks |
| 3 | side tongues | vertical profiles, depth biased hard toward corners (center rows ≈ 0) | back DEEP @ 0.58 (max ~13px), mid VOID @ 0.8 |
| 4 | void petals | 6–8 detached 3–7px angular shards floating just inside the dark zone, ±1px drift per phase; alternate ones carry a 1px E0 glint | VOID @ 0.88 |

- **Ember accents**: E0 caps on every 3rd mid-tongue apex, one E1 wink per beat. Nothing else.
- **Breathing**: 3-phase loop (~1.2s): every 3rd tongue +1px, dither edge shifts, caps wink,
  petals drift. Drive `phase` off the same clock as the aura so the whole state breathes together.
- **Center contract**: edge-bias caps tongue height at ~55–62% in the middle 55% of the
  screen; haze never reaches further than its depth knob from an edge. Fighters at combat
  height are untouched (verified in the mocks — boss/hero minis stay readable in all 3 variants).
- **Pick**: V3 "unified" (sheet band A right) — V1/V2 exist to bracket the family.
- Corners darken *naturally* where systems 1+2+3 overlap — that is the replacement for the
  old corner rectangles.

## B. Void-fracture arcs (new SpriteManager statics)

Anatomy (sheet "ANATOMY 2X"): **VOID `#060409` crack-sheath** flanking a **1px E2 `#e0263a`
filament**, **E3 `#ff5a4a` 1x2 hot kinks** at direction changes, **E1 branches** ending in a
single **E0 tip**. Path = 4px segments with ±2px jitter (deterministic per spawn seed).

Lifecycle (fixed path across all frames):

| frame | look | hold @60fps |
|-------|------|-------------|
| F0 ignite | 2x2 E3 spark + 4 E2 diagonals + first ~6 path px as VOID hairline | 3f |
| F1 flash | full sheath + filament + kinks + branches (+2 E1 ground ticks if it ends on the floor) | 4f |
| F2 fracture | filament broken into runs (`i%5<3`), E1 body / E2 kinks, sheath only at run starts, 2 E0 motes | 4f |
| F3 ash | every 4th px becomes a 1x2–1x3 SMK/E0 sliver that **sinks** (matches the aura's sink language) | 6f, fade |

Spawn anchors (sheet "SPAWN ANCHORS", matrix coords on the 46x48 planted frames):
1. chest core (19,15) — main forks, fired **on the aura heartbeat beat frame** (core-sync strip)
2. guard gem (31,18) — short chest→grip connector
3. blade mid (31,32) — crawl runs 2–3px *beside* the blade (sheath separates it from the red blade)
4. plant point (31,46) — ground skitter along the shadow-pool rim, fracture-mode look

Restraint rules: **max 2 concurrent arcs**, arc length ≤ 60% boss height, never crosses the
hero, never leaves the aura footprint. Idle gaps show micro-sparks only (1px E2/E3 ticks).

## C. Tiering

- normal: all 5 darkening systems, 2 concurrent arcs + micro-sparks
- lite: drop spikes + drips, petals→3, haze 2 bands only; 1 concurrent arc
- performance: haze 1 band + tongues back layer only (silhouette intact); micro-sparks only, no arcs

## D. Integration map (for the later implementation stage)

- `SpriteManager.drawIntimidationVignette` → rebuilt as the curse-pressure painter
  (screen-space; profiles precomputed once per resize, only phase-dependent bits per frame).
- New statics: `drawVoidFractureArc(ctx, x0,y0,x1,y1, frame, seed, opts)` + micro-spark helper;
  called from `Player._tickAfkVfx`/`_drawIntimidationFX` (arc scheduler keyed to the existing
  heartbeat phase). Plain render-only objects, **never Hitboxes** (7A-1 invariant).
- `paintAura` (drawIntimidationAura) unchanged. Barrier wave unchanged. Hero visuals unchanged.
- No gameplay/timing/hitbox/AI changes. Purity: fillRect only, no gradients, no shadowBlur.
