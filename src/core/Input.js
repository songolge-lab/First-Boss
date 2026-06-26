export class Input {
    constructor() {
        this.keys = {
            w: false, a: false, s: false, d: false,
            ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
        };

        window.addEventListener('keydown', (e) => {
            if (e.key in this.keys) this.keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.key in this.keys) this.keys[e.key] = false;
        });
    }

    getAxis() {
        let x = 0;
        let y = 0;
        if (this.keys.w || this.keys.ArrowUp) y -= 1;
        if (this.keys.s || this.keys.ArrowDown) y += 1;
        if (this.keys.a || this.keys.ArrowLeft) x -= 1;
        if (this.keys.d || this.keys.ArrowRight) x += 1;

        if (x !== 0 && y !== 0) {
            const len = Math.SQRT1_2;
            x *= len;
            y *= len;
        }

        return { x, y };
    }
}
