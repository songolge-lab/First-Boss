export class UIManager {
    constructor() {
        this.overlay = document.getElementById('encounter-overlay');
        this.hpText = document.getElementById('stat-hp');
        this.speedText = document.getElementById('stat-speed');
        this.abilityText = document.getElementById('stat-ability');
        this.countdownText = document.getElementById('countdown');
    }

    showEncounterOverlay(heroStatsMock, durationMs) {
        // Set mock data
        this.hpText.innerText = `HP: ${heroStatsMock.oldHp} -> ${heroStatsMock.newHp} (+${heroStatsMock.newHp - heroStatsMock.oldHp})`;
        this.speedText.innerText = `SPEED: ${heroStatsMock.oldSpeed} -> ${heroStatsMock.newSpeed} (${heroStatsMock.newSpeed - heroStatsMock.oldSpeed})`;
        this.abilityText.innerText = `NEW ABILITY: ${heroStatsMock.newAbility}`;

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
