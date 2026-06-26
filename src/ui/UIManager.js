export class UIManager {
    constructor() {
        this.overlay = document.getElementById('encounter-overlay');
        this.hpText = document.getElementById('stat-hp');
        this.speedText = document.getElementById('stat-speed');
        this.abilityText = document.getElementById('stat-ability');
        this.countdownText = document.getElementById('countdown');
    }

    showEncounterOverlay(heroStats, durationMs) {
        this.hpText.innerText = `HP: ${heroStats.oldHp} → ${heroStats.newHp} (+${heroStats.newHp - heroStats.oldHp})`;
        this.speedText.innerText = `SPEED: ${heroStats.oldSpeed} → ${heroStats.newSpeed}`;
        this.abilityText.innerText = `NEW ABILITY: ${heroStats.newAbility}`;

        this.overlay.classList.remove('hidden');
        this.overlay.classList.add('visible');

        let remaining = durationMs / 1000;
        this.countdownText.innerText = `Respawning in ${remaining}...`;

        const interval = setInterval(() => {
            remaining -= 1;
            if (remaining > 0) {
                this.countdownText.innerText = `Respawning in ${remaining}...`;
            } else {
                clearInterval(interval);
            }
        }, 1000);
    }

    hideEncounterOverlay() {
        this.overlay.classList.remove('visible');
        this.overlay.classList.add('hidden');
    }
}
