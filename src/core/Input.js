export class Input {
    constructor() {
        // Platformer controls: horizontal movement, jump, and dash are player-driven.
        this.left = false;
        this.right = false;
        this.jumpHeld = false;   // true while a jump key is down (for variable jump height)
        this.jumpBuffer = false; // set once on a fresh press; consumed by the Player
        this.dashHeld = false;   // true while Shift is down (edge-detect a fresh dash)
        this.dashBuffer = false; // set once on a fresh Shift press; consumed by the Player

        window.addEventListener('keydown', (e) => this.onKey(e, true));
        window.addEventListener('keyup', (e) => this.onKey(e, false));
    }

    onKey(e, isDown) {
        const key = e.key.toLowerCase();
        let handled = true;

        switch (key) {
            case 'a':
            case 'arrowleft':
                this.left = isDown;
                break;
            case 'd':
            case 'arrowright':
                this.right = isDown;
                break;
            case 'w':
            case 'arrowup':
            case ' ': // Spacebar
                // Edge-detect the press so holding the key does not auto-bounce.
                if (isDown && !this.jumpHeld) this.jumpBuffer = true;
                this.jumpHeld = isDown;
                break;
            case 'shift':
                // Edge-detect the press so holding Shift does not spam dashes.
                if (isDown && !this.dashHeld) this.dashBuffer = true;
                this.dashHeld = isDown;
                break;
            default:
                handled = false;
        }

        // Stop the page from scrolling on Space / arrow keys.
        if (handled) e.preventDefault();
    }

    // Horizontal axis: -1 (left), 0 (idle), +1 (right).
    getHorizontal() {
        return (this.right ? 1 : 0) - (this.left ? 1 : 0);
    }

    // Returns true exactly once per jump press, then clears the buffer.
    consumeJump() {
        if (this.jumpBuffer) {
            this.jumpBuffer = false;
            return true;
        }
        return false;
    }

    // Returns true exactly once per Shift press, then clears the buffer.
    consumeDash() {
        if (this.dashBuffer) {
            this.dashBuffer = false;
            return true;
        }
        return false;
    }

    isJumpHeld() {
        return this.jumpHeld;
    }
}
