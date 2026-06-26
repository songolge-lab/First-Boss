export class UIManager {
    constructor() {
        this.overlay = document.getElementById('encounter-overlay');
        this.title = document.getElementById('encounter-title');
        this.legendaryBanner = document.getElementById('legendary-banner');
        this.hpText = document.getElementById('stat-hp');
        this.speedText = document.getElementById('stat-speed');
        this.attackText = document.getElementById('stat-attack');
        this.abilityText = document.getElementById('stat-ability');
        this.countdownText = document.getElementById('countdown');

        this._countdownInterval = null;
    }

    /**
     * Render the respawn overlay straight from a matrix encounter object.
     * Driven by current_encounter_stats + stat_delta / stat_delta_pct per the UI contract.
     * stat_delta / stat_delta_pct are null on encounter 1 (first spawn -> no diff).
     */
    showEncounterOverlay(encounter, durationMs) {
        const stats = encounter.current_encounter_stats;
        const delta = encounter.stat_delta;       // null on encounter 1
        const pct = encounter.stat_delta_pct;     // null on encounter 1

        this.title.innerText = `Nemesis — Encounter ${encounter.encounter_id}`;

        this.hpText.innerHTML = this._statRow('HP', stats.hp, delta?.hp, pct?.hp);
        this.speedText.innerHTML = this._statRow('Speed', stats.move_speed, delta?.move_speed, pct?.move_speed);
        this.attackText.innerHTML = this._statRow('Attack', stats.attack_damage, delta?.attack_damage, pct?.attack_damage);

        this._renderAbility(encounter.unlocked_mechanic);
        this._renderLegendary(encounter.is_legendary_drop, encounter.legendary_item);

        this.overlay.classList.remove('hidden');
        this.overlay.classList.add('visible');

        // Countdown
        if (this._countdownInterval) clearInterval(this._countdownInterval);
        let remaining = Math.round(durationMs / 1000);
        this.countdownText.innerText = `The Hero resurrects in ${remaining}...`;
        this._countdownInterval = setInterval(() => {
            remaining -= 1;
            if (remaining > 0) {
                this.countdownText.innerText = `The Hero resurrects in ${remaining}...`;
            } else {
                this.countdownText.innerText = 'The Hero resurrects...';
                clearInterval(this._countdownInterval);
                this._countdownInterval = null;
            }
        }, 1000);
    }

    hideEncounterOverlay() {
        this.overlay.classList.remove('visible');
        this.overlay.classList.add('hidden');
    }

    // --- private helpers -------------------------------------------------

    // Build the "LABEL  value  (+delta, +pct%)" markup for one stat row.
    _statRow(label, value, delta, pct) {
        const valueHtml = `<span class="stat-value">${this._fmt(value)}</span>`;
        return `<span class="stat-label">${label}</span>${valueHtml}${this._deltaHtml(delta, pct)}`;
    }

    // Signed, color-coded delta chip. Returns '' when there is no diff to show
    // (encounter 1, where stat_delta is null).
    _deltaHtml(delta, pct) {
        if (delta === null || delta === undefined) return '';

        let cls = 'flat';
        if (delta > 0) cls = 'up';
        else if (delta < 0) cls = 'down';

        const sign = delta > 0 ? '+' : '';
        let text = `${sign}${this._fmt(delta)}`;
        if (pct !== null && pct !== undefined) {
            text += `, ${sign}${this._fmt(pct)}%`;
        }
        return `<span class="stat-delta ${cls}">${text}</span>`;
    }

    // Show the unlocked mechanic name, or hide the row when nothing unlocks.
    _renderAbility(mechanic) {
        if (mechanic && mechanic.name) {
            this.abilityText.innerText = `NEW ABILITY: ${mechanic.name}`;
            this.abilityText.classList.remove('hidden');
        } else {
            this.abilityText.classList.add('hidden');
        }
    }

    // Highlight the legendary drop banner, or hide it on non-drop encounters.
    _renderLegendary(isDrop, item) {
        if (isDrop && item) {
            this.legendaryBanner.innerHTML =
                `<span class="legendary-title">★ Legendary Drop ★</span>` +
                `<span class="legendary-name">${item.name}</span>` +
                `<span class="legendary-effects">${item.effects}</span>`;
            this.legendaryBanner.classList.remove('hidden');
            this.overlay.classList.add('legendary');
        } else {
            this.legendaryBanner.classList.add('hidden');
            this.overlay.classList.remove('legendary');
        }
    }

    // Whole integers print clean; fractions keep at most one decimal (matches the JSON).
    _fmt(n) {
        if (typeof n !== 'number') return n;
        return Number.isInteger(n) ? `${n}` : `${Math.round(n * 10) / 10}`;
    }
}
