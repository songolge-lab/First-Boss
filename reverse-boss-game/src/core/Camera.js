import { lerp } from '../utils/math.js';

export class Camera {
    constructor(x, y, viewportWidth, viewportHeight) {
        this.x = x;
        this.y = y;
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.lerpSpeed = 0.1;
    }

    update(targetX, targetY) {
        const desiredX = targetX - this.viewportWidth / 2;
        const desiredY = targetY - this.viewportHeight / 2;

        this.x = lerp(this.x, desiredX, this.lerpSpeed);
        this.y = lerp(this.y, desiredY, this.lerpSpeed);
    }

    resize(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
    }

    apply(ctx) {
        ctx.translate(-this.x, -this.y);
    }
}
