// Dev-only performance profiler. Disabled by default; enable with ?perf=1.
//
// When disabled, `PerfMonitor` is bound to a Noop instance whose methods are
// empty function bodies — call sites in main.js are unconditional, so the
// "off" path costs a single monomorphic call that V8 trivially inlines away.
// Enable/disable is decided once at module load, not re-checked per call.

const HISTORY_SIZE = 120;

// Frame-drop thresholds (ms): one dropped 60fps frame, one dropped 30fps frame.
const DROP_THRESHOLD_16_7 = 16.7;
const DROP_THRESHOLD_33_3 = 33.3;

// --- Dev-only VFX isolation toggles (?perf=1&skip=label1,label2) -----------
// Parsed once at module load, same as ENABLED below. Only ever consulted via
// PerfMonitor.shouldSkip(label), which draw call sites wrap around a single
// VFX/draw call — never around update/AI/timer/hitbox logic. When perf mode
// is off (the normal-play path), the Noop's shouldSkip() always returns
// false, so nothing here changes normal rendering.
const _perfParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const PERF_ENABLED = _perfParams.get('perf') === '1';
const SKIP_LABELS = new Set(
    (PERF_ENABLED ? (_perfParams.get('skip') || '') : '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
);

// --- Dev-only render-scale diagnostic (?perf=1&renderScale=0.5) ------------
// Scales DOWN the canvas's internal drawing buffer (fill-rate / GPU pixel
// cost) while the CSS-displayed size stays identical, to isolate whether
// FPS drops come from pixel fill cost vs. JS/update cost. Only ever parsed
// when PERF_ENABLED, so normal play (?perf absent) always gets RENDER_SCALE
// === 1, i.e. today's unscaled behavior.
const _renderScaleRaw = PERF_ENABLED ? parseFloat(_perfParams.get('renderScale')) : NaN;
export const RENDER_SCALE = (PERF_ENABLED && Number.isFinite(_renderScaleRaw) && _renderScaleRaw > 0 && _renderScaleRaw <= 1)
    ? _renderScaleRaw
    : 1;

// --- Permanent VFX quality system ------------------------------------------
// Promotes the old dev-test ?perf=1&vfxBudget=lite switch into a first-class,
// always-available quality setting with THREE tiers that trade a little VFX
// intensity for stable 60 FPS on weaker devices by shedding the most Canvas/GPU-
// expensive draw work: large-area transparent overdraw, repeated shadowBlur
// passes, duplicate translucent glow layers, and decorative particle counts. It
// is consumed ONLY by draw code (the SpriteManager VFX helpers + this overlay):
// it NEVER touches hitboxes, damage, cooldowns, physics, AI, controls, movement,
// or attack timing; it preserves each attack's silhouette/readability; and
// 'normal' is byte-for-byte today's visuals.
//
// Tiers (ascending aggressiveness): normal ⊂ lite ⊂ performance.
//   * normal      — full VFX, today's visuals, unchanged.
//   * lite        — the current tested lite reductions.
//   * performance — every lite reduction PLUS extra cuts (fewer glow passes,
//                   less transparent overdraw, fewer decorative particles, capped
//                   aura glow sizes). Because performance is a SUPERSET of lite,
//                   isLiteVfx() is true in BOTH tiers (so every existing `LITE`
//                   branch fires in performance too) and the extra performance-only
//                   cuts hang off isPerfVfx().
//
//   ?vfxQuality=normal      -> always full VFX (today's visuals, unchanged)
//   ?vfxQuality=lite        -> always the lite budget
//   ?vfxQuality=performance -> always the most aggressive budget
//   ?vfxQuality=auto        -> start in normal; judged continuously over a trailing
//                              ~1s rolling window of real gameplay frames. If that
//                              window's average FPS drops below 55 OR its p95 frame
//                              delta exceeds 18ms, drop to lite; if lite's trailing
//                              window is STILL bad, drop to performance. The tier
//                              only ever moves DOWN (monotonic latch) so there is no
//                              visual flicker/popping between modes.
//   ?perf=1&vfxBudget=lite  -> legacy alias, still resolves to 'lite'
//   (no query)              -> 'auto'
//
// Independent of the ?perf profiler: auto monitoring runs even when the overlay
// is off, so weak devices benefit without needing perf mode. Resolved once at
// module load.
const VFX_QUALITY_MODE = (() => {
    const q = _perfParams.get('vfxQuality');
    if (q === 'normal' || q === 'lite' || q === 'performance' || q === 'auto') return q;
    if (_perfParams.get('vfxBudget') === 'lite') return 'lite'; // legacy alias
    return 'auto';                                              // default
})();

// Effective tier constants (also the auto-latch ladder rungs).
const TIER_NORMAL = 0;
const TIER_LITE = 1;
const TIER_PERFORMANCE = 2;

// Auto-mode tuning + state. `_autoTier` is a one-way (monotonic) latch: it only
// ever climbs 0 -> 1 -> 2 and never drops back, so quality never flickers up
// mid-session. Each downgrade needs its own fresh ~1s rolling window of bad frames.
const AUTO_FPS_THRESHOLD = 55;         // rolling-window avg fps below this counts as "struggling"
const AUTO_P95_THRESHOLD_MS = 18;      // rolling-window p95 frame delta above this counts as "struggling"
const AUTO_WINDOW_MS = 1000;           // trailing wall-clock window judged each frame
const AUTO_STARTUP_GRACE_MS = 500;     // ignore load/warm-up jank before this much real time has passed
const AUTO_MAX_FRAME_MS = 64;          // clamp one stall/tab-switch frame (~15fps floor) before it enters the window
let _autoTier = TIER_NORMAL;
let _vfxLastTs = null;
let _autoOriginTs = null;      // timestamp of the very first tick, for the startup grace period
let _autoWindow = [];          // trailing ~1s of {t, dt} samples, time-pruned every tick
let _autoDowngradeReason = null;   // 'fps' | 'p95' | 'both', set on each downgrade, for the overlay
let _autoDowngradeAtTs = null;
const AUTO_DOWNGRADE_REASON_DISPLAY_MS = 4000; // how long the overlay keeps showing the reason

// The effective render tier RIGHT NOW: 0 normal, 1 lite, 2 performance. For the
// fixed modes it's constant; for 'auto' it tracks the latched `_autoTier`.
function effectiveTier() {
    if (VFX_QUALITY_MODE === 'lite') return TIER_LITE;
    if (VFX_QUALITY_MODE === 'performance') return TIER_PERFORMANCE;
    if (VFX_QUALITY_MODE === 'auto') return _autoTier;
    return TIER_NORMAL;
}

// True when VFX should shed cost (lite OR performance). This is the single source
// of truth read by every SpriteManager VFX branch (`const LITE = ...`); because
// performance is a superset of lite, it is true in both.
export function isLiteVfx() {
    return effectiveTier() >= TIER_LITE;
}

// True ONLY in the performance tier — gates the extra, more aggressive cuts on top
// of the lite reductions (`const PERF = ...` in the SpriteManager VFX helpers).
export function isPerfVfx() {
    return effectiveTier() >= TIER_PERFORMANCE;
}

// The configured mode: 'normal' | 'lite' | 'performance' | 'auto'.
export function getVfxQuality() {
    return VFX_QUALITY_MODE;
}

// Effective label for the perf overlay. Fixed modes report themselves; 'auto'
// reports the arrow form of its latched tier so both the selection AND what it
// currently resolves to are visible:
//   'normal' | 'lite' | 'performance' |
//   'auto→normal' | 'auto→lite' | 'auto→performance'
export function getVfxQualityLabel() {
    if (VFX_QUALITY_MODE !== 'auto') return VFX_QUALITY_MODE;
    return _autoTier === TIER_PERFORMANCE ? 'auto→performance'
         : _autoTier === TIER_LITE ? 'auto→lite'
         : 'auto→normal';
}

// Overlay-only: the reason ('fps' | 'p95' | 'both') the most recent auto downgrade
// fired, shown briefly (AUTO_DOWNGRADE_REASON_DISPLAY_MS) right after it happens and
// then cleared so the overlay stays clean/uncluttered afterward. null when no
// downgrade has happened yet, the reason has expired, or mode isn't 'auto'.
export function getVfxAutoDowngradeReason() {
    if (VFX_QUALITY_MODE !== 'auto' || _autoDowngradeReason === null) return null;
    if (performance.now() - _autoDowngradeAtTs > AUTO_DOWNGRADE_REASON_DISPLAY_MS) return null;
    return _autoDowngradeReason;
}

// Per-frame auto-mode driver, called once per frame from the game loop with the
// rAF timestamp and whether live gameplay is running. Measures the REAL frame
// cadence (not the clamped simulation dt) via a trailing ~1s rolling window
// (time-pruned, so it always covers "the last second" regardless of current fps)
// and steps the tier DOWN one rung (normal->lite->performance) as soon as that
// window's average FPS drops below 55 OR its p95 frame delta exceeds 18ms, requiring
// a FRESH window (reset on every downgrade) before the next step can fire. Because
// judgment is continuous over ~60 samples' worth of real frames rather than a
// single-frame accumulator that resets on the first good frame, one bad frame can't
// trigger a downgrade, but genuinely sustained bad performance is caught within
// about a second instead of being reset away by incidental good frames. No-op
// unless mode === 'auto' (and once it has bottomed out at performance). Draw-only
// side effect: it never influences the simulation.
export function vfxAutoTick(timestamp, active) {
    const now = typeof timestamp === 'number' ? timestamp : performance.now();
    const last = _vfxLastTs;
    _vfxLastTs = now;
    if (_autoOriginTs === null) _autoOriginTs = now;
    if (VFX_QUALITY_MODE !== 'auto' || _autoTier >= TIER_PERFORMANCE) return;

    // Ignore jank in the first ~0.5s after load (asset decode / JIT warm-up / init GC
    // is not representative of steady-state VFX cost) so it can't false-positive a
    // downgrade before real gameplay has even started.
    if (now - _autoOriginTs < AUTO_STARTUP_GRACE_MS) { _autoWindow.length = 0; return; }

    // Only accumulate during live gameplay; pauses/cinematics drop stale samples so a
    // dip outside real play can't trip a downgrade.
    if (!active || last === null) { _autoWindow.length = 0; return; }

    const dtMs = now - last;
    if (!(dtMs > 0)) return;

    // Clamp one stall/tab-switch frame's contribution so it can't single-handedly
    // dominate the window's average/p95 — sustained badness still needs many samples.
    _autoWindow.push({ t: now, dt: Math.min(dtMs, AUTO_MAX_FRAME_MS) });
    while (_autoWindow.length > 0 && now - _autoWindow[0].t > AUTO_WINDOW_MS) {
        _autoWindow.shift();
    }

    // Require close to a full window's worth of real elapsed time before judging —
    // otherwise a handful of samples right after a reset (e.g. right after a pause)
    // could look artificially bad or good.
    if (_autoWindow.length < 8 || now - _autoWindow[0].t < AUTO_WINDOW_MS * 0.9) return;

    const n = _autoWindow.length;
    const dts = new Array(n);
    let sum = 0;
    for (let i = 0; i < n; i++) {
        const dt = _autoWindow[i].dt;
        dts[i] = dt;
        sum += dt;
    }
    const avgFps = 1000 / (sum / n);
    dts.sort((a, b) => a - b);
    const p95 = dts[Math.min(n - 1, Math.floor(0.95 * n))];

    const fpsBad = avgFps < AUTO_FPS_THRESHOLD;
    const p95Bad = p95 > AUTO_P95_THRESHOLD_MS;
    if (fpsBad || p95Bad) {
        _autoTier++; // normal->lite, then (after another fresh window) lite->performance
        _autoDowngradeReason = fpsBad && p95Bad ? 'both' : fpsBad ? 'fps' : 'p95';
        _autoDowngradeAtTs = now;
        _autoWindow.length = 0; // each further downgrade needs its own fresh window
    }
}

// Top-level, NON-OVERLAPPING render subsections (each called exactly once per
// frame from main.js/ThroneRoom.js) whose sum should approximate 'render'
// total. Anything left over (vignette, fear screen flash, game-over banner,
// stray ctx save/restore, ...) shows up as "render unaccounted" below.
const RENDER_SUBSECTIONS = [
    'render clear/background',
    'camera transform setup',
    'throneRoom render',
    'player draw total',
    'enemy draw total',
    'debug/perf overlay itself',
];

// Coarse aggregates excluded from the "biggest section" hunt — they're sums of
// their own children, so flagging them as "biggest" doesn't point at a cause.
const EXCLUDE_FROM_BIGGEST = new Set([
    'frame total', 'update', 'render', 'player update', 'enemy update', 'combat',
    'player draw total', 'enemy draw total',
]);

// Fixed-size ring buffer + running sum so average() is O(1) per sample
// instead of re-summing 120 floats every frame. max()/p95()/countOver() scan
// the buffer on demand — only called from renderOverlay(), i.e. at most once
// per frame and only when ?perf=1 is set, so an O(HISTORY_SIZE) scan/sort is
// negligible and doesn't need its own running-state bookkeeping.
class Section {
    constructor() {
        this.samples = new Float32Array(HISTORY_SIZE);
        this.index = 0;
        this.count = 0;
        this.sum = 0;
        this.last = 0; // most recent pushed value, for same-frame "unaccounted" math
    }

    push(ms) {
        this.sum += ms - this.samples[this.index];
        this.samples[this.index] = ms;
        this.index = (this.index + 1) % HISTORY_SIZE;
        if (this.count < HISTORY_SIZE) this.count++;
        this.last = ms;
    }

    lastValue() {
        return this.last;
    }

    average() {
        return this.count === 0 ? 0 : this.sum / this.count;
    }

    maxValue() {
        let m = 0;
        for (let i = 0; i < this.count; i++) {
            if (this.samples[i] > m) m = this.samples[i];
        }
        return m;
    }

    percentile95() {
        if (this.count === 0) return 0;
        const sorted = Array.from(this.samples.subarray(0, this.count)).sort((a, b) => a - b);
        const idx = Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length));
        return sorted[idx];
    }

    countOver(thresholdMs) {
        let n = 0;
        for (let i = 0; i < this.count; i++) {
            if (this.samples[i] > thresholdMs) n++;
        }
        return n;
    }
}

class LivePerfMonitor {
    constructor() {
        this.enabled = true;
        this.sections = new Map();   // label -> Section, insertion order = display order
        this._starts = new Map();    // label -> performance.now() at start()
        this._frameStartedAt = 0;

        // Real wall-clock cadence between requestAnimationFrame callbacks (distinct
        // from the "frame total" section below, which only measures JS work time
        // *inside* one rAF callback and misses vsync/compositor/throttling stalls).
        this.frameDeltaSection = new Section();
        this._lastFrameTimestamp = null;
    }

    // `timestamp` is the DOMHighResTimeStamp requestAnimationFrame passes to its
    // callback (same clock/epoch as performance.now()). Falls back to
    // performance.now() if the caller doesn't have one handy.
    frameStart(timestamp) {
        const now = typeof timestamp === 'number' ? timestamp : performance.now();
        if (this._lastFrameTimestamp !== null) {
            this.frameDeltaSection.push(now - this._lastFrameTimestamp);
        }
        this._lastFrameTimestamp = now;
        this._frameStartedAt = now;
    }

    frameEnd() {
        this._record('frame total', performance.now() - this._frameStartedAt);
    }

    start(label) {
        this._starts.set(label, performance.now());
    }

    end(label) {
        const startedAt = this._starts.get(label);
        if (startedAt === undefined) return;
        this._record(label, performance.now() - startedAt);
    }

    // Dev-only VFX isolation: true only when ?perf=1 AND `label` is present in
    // ?skip=. Call sites wrap a single draw/VFX call with this — never
    // hitbox creation, timers, damage, AI, or other update logic.
    shouldSkip(label) {
        return SKIP_LABELS.has(label);
    }

    // VFX quality system (delegates to the module-level singletons above so the
    // Live/Noop split shares one source of truth). See isLiteVfx()/vfxAutoTick().
    isLiteVfx() { return isLiteVfx(); }
    isPerfVfx() { return isPerfVfx(); }
    getVfxQuality() { return getVfxQuality(); }
    getVfxQualityLabel() { return getVfxQualityLabel(); }
    getVfxAutoDowngradeReason() { return getVfxAutoDowngradeReason(); }
    vfxAutoTick(timestamp, active) { vfxAutoTick(timestamp, active); }

    _record(label, ms) {
        let section = this.sections.get(label);
        if (!section) {
            section = new Section();
            this.sections.set(label, section);
        }
        section.push(ms);
    }

    // Small unobtrusive overlay, top-left, screen space. Caller must invoke
    // this outside any camera/world transform (ctx should be identity).
    //
    // Self-timed: measures its own text-assembly + draw cost and records it
    // under 'debug/perf overlay itself'. Because that cost can only be known
    // AFTER this function runs, the value shown/used-in-unaccounted-math for
    // that one label is always the PREVIOUS frame's overlay cost — a standard
    // (and harmless) one-frame lag for a self-profiling overlay.
    renderOverlay(ctx, _width, _height) {
        const overlayStart = performance.now();
        const lines = []; // { text, color }
        const DEFAULT_COLOR = '#e0e0e0';
        const HEADER_COLOR = '#7CFC7C';
        const HIGHLIGHT_COLOR = '#ff9933';

        const push = (text, color = DEFAULT_COLOR) => lines.push({ text, color });

        // --- Real FPS / frame cadence, from actual rAF timestamps (not the
        // clamped simulation dt) so spikes/stalls show up honestly. ---
        const fd = this.frameDeltaSection;
        if (fd.count > 0) {
            const avgDelta = fd.average();
            const fps = avgDelta > 0 ? 1000 / avgDelta : 0;
            push(`FPS ${fps.toFixed(1).padStart(6)}      frame Δ avg ${avgDelta.toFixed(2)}ms`);
            push(`frame Δ max ${fd.maxValue().toFixed(2)}ms   p95 ${fd.percentile95().toFixed(2)}ms`);
            push(`dropped >16.7ms:${fd.countOver(DROP_THRESHOLD_16_7)}  >33.3ms:${fd.countOver(DROP_THRESHOLD_33_3)}  (n=${fd.count})`);
        }

        // --- Canvas / GPU-adjacent clues ---
        const canvas = ctx.canvas;
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            push(`canvas internal ${canvas.width}x${canvas.height}   renderScale ${RENDER_SCALE}`);
            push(`canvas CSS      ${Math.round(rect.width)}x${Math.round(rect.height)}   DPR ${window.devicePixelRatio}`);
        }

        // --- Effective VFX quality (?vfxQuality=normal|lite|performance|auto; legacy
        // ?vfxBudget=lite). Shows the selected mode and, for auto, the tier it has
        // resolved to: 'normal' / 'lite' / 'performance' / 'auto→normal' / 'auto→lite'
        // / 'auto→performance'. Highlighted whenever any cost-shedding tier (lite or
        // performance) is actually in effect right now. ---
        push(`vfxQuality ${getVfxQualityLabel()}`, isLiteVfx() ? HIGHLIGHT_COLOR : DEFAULT_COLOR);
        const downgradeReason = getVfxAutoDowngradeReason();
        if (downgradeReason) {
            push(`  downgrade reason: ${downgradeReason}`, HIGHLIGHT_COLOR);
        }

        // --- Find the single biggest non-aggregate section (worst-case spike,
        // not average) so a heavy-ability frame drop can be traced to its exact
        // render/VFX source at a glance. ---
        let biggestLabel = null;
        let biggestMax = 0;
        for (const [label, s] of this.sections) {
            if (EXCLUDE_FROM_BIGGEST.has(label) || s.count === 0) continue;
            const m = s.maxValue();
            if (m > biggestMax) {
                biggestMax = m;
                biggestLabel = label;
            }
        }
        if (biggestLabel) {
            push(`» BIGGEST: ${biggestLabel}  (max ${biggestMax.toFixed(2)}ms)`, HIGHLIGHT_COLOR);
        }

        // --- render unaccounted = render total - sum(known render subsections),
        // all read from THIS frame's values (renderOverlay runs last inside
        // draw(), after every subsection above has already recorded its sample).
        // Surfaces anything NOT itemized below: vignette, fear screen flash,
        // game-over banner, stray ctx save/restore, etc. ---
        const renderSection = this.sections.get('render');
        if (renderSection && renderSection.count > 0) {
            let known = 0;
            for (const label of RENDER_SUBSECTIONS) {
                const s = this.sections.get(label);
                if (s && s.count > 0) known += s.lastValue();
            }
            const unaccounted = Math.max(0, renderSection.lastValue() - known);
            push(`render unaccounted   ${unaccounted.toFixed(2)}ms  (of ${renderSection.lastValue().toFixed(2)}ms total)`);
        }

        // --- Existing measured sections (avg / p95 / max over last 120 samples) ---
        for (const [label, s] of this.sections) {
            push(
                `${label.padEnd(28)} avg ${s.average().toFixed(2)}  p95 ${s.percentile95().toFixed(2)}  max ${s.maxValue().toFixed(2)}`,
                label === biggestLabel ? HIGHLIGHT_COLOR : DEFAULT_COLOR,
            );
        }

        if (lines.length === 0) {
            this._record('debug/perf overlay itself', performance.now() - overlayStart);
            return;
        }

        const padding = 8;
        const lineHeight = 14;
        const headerHeight = 18;
        const boxWidth = 420;
        const boxHeight = headerHeight + lineHeight * lines.length + padding;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(padding, padding, boxWidth, boxHeight);

        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.fillStyle = HEADER_COLOR;
        ctx.fillText('PERF  (ms, last 120 frames)', padding + 6, padding + 4);

        let y = padding + headerHeight;
        for (const line of lines) {
            ctx.fillStyle = line.color;
            ctx.fillText(line.text, padding + 6, y);
            y += lineHeight;
        }

        ctx.restore();

        this._record('debug/perf overlay itself', performance.now() - overlayStart);
    }
}

class NoopPerfMonitor {
    constructor() {
        this.enabled = false;
    }

    frameStart(_timestamp) {}
    frameEnd() {}
    start(_label) {}
    end(_label) {}
    renderOverlay(_ctx, _width, _height) {}
    shouldSkip(_label) { return false; }

    // VFX quality is a permanent system, so even the profiler-off Noop must drive
    // and report it — it delegates to the same module-level singletons.
    isLiteVfx() { return isLiteVfx(); }
    isPerfVfx() { return isPerfVfx(); }
    getVfxQuality() { return getVfxQuality(); }
    getVfxQualityLabel() { return getVfxQualityLabel(); }
    getVfxAutoDowngradeReason() { return getVfxAutoDowngradeReason(); }
    vfxAutoTick(timestamp, active) { vfxAutoTick(timestamp, active); }
}

export const PerfMonitor = PERF_ENABLED ? new LivePerfMonitor() : new NoopPerfMonitor();
