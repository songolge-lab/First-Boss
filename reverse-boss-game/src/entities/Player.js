export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.color = '#ff3366';
        
        this.vx = 0;
        this.vy = 0;
        this.acceleration = 1.5;
        this.maxSpeed = 8;
        this.friction = 0.8; // Air friction / drag
    }

    update(inputAxis) {
        // Apply acceleration based on input
        this.vx += inputAxis.x * this.acceleration;
        this.vy += inputAxis.y * this.acceleration;

        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Cap at max speed
        const speed = Math.hypot(this.vx, this.vy);
        if (speed > this.maxSpeed) {
            const ratio = this.maxSpeed / speed;
            this.vx *= ratio;
            this.vy *= ratio;
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
        
        // Draw a visual "front" to see direction if we want, or just a glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
