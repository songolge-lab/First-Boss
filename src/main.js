import { Input } from './core/Input.js';
import { Camera } from './core/Camera.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { UIManager } from './ui/UIManager.js';
import { distance } from './utils/math.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    if (camera) camera.resize(width, height);
}

window.addEventListener('resize', resize);

let input, camera, player, enemy, uiManager;
let gameState = 'PLAYING';
let lastTime = 0;

function init() {
    resize();
    input = new Input();
    player = new Player(0, 0);
    camera = new Camera(0, 0, width, height);
    uiManager = new UIManager();

    spawnEnemy();
    requestAnimationFrame(gameLoop);
}

function spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = Math.max(width, height);
    enemy = new Enemy(
        player.x + Math.cos(angle) * spawnDist,
        player.y + Math.sin(angle) * spawnDist
    );
}

function drawGrid(ctx, cam) {
    const gridSize = 100;
    const startX = Math.floor(cam.x / gridSize) * gridSize;
    const startY = Math.floor(cam.y / gridSize) * gridSize;

    ctx.strokeStyle = '#2a2a35';
    ctx.lineWidth = 2;

    for (let x = startX; x < startX + width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, cam.y);
        ctx.lineTo(x, cam.y + height);
        ctx.stroke();
    }

    for (let y = startY; y < startY + height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(cam.x, y);
        ctx.lineTo(cam.x + width, y);
        ctx.stroke();
    }
}

function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

function update(dt) {
    if (gameState !== 'PLAYING') return;

    player.update(input.getAxis());
    camera.update(player.x, player.y);
    enemy.update(player.x, player.y);

    if (distance(player.x, player.y, enemy.x, enemy.y) < player.radius + enemy.radius) {
        handleCollision();
    }
}

function handleCollision() {
    gameState = 'RESPAWNING';

    const mockData = {
        oldHp: 100, newHp: 150,
        oldSpeed: 3.0, newSpeed: 3.0,
        newAbility: 'Dash'
    };

    uiManager.showEncounterOverlay(mockData, 3000);

    setTimeout(() => {
        uiManager.hideEncounterOverlay();
        spawnEnemy();
        gameState = 'PLAYING';
    }, 3000);
}

function draw() {
    ctx.fillStyle = '#111116';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    camera.apply(ctx);

    drawGrid(ctx, camera);
    enemy.draw(ctx);
    player.draw(ctx);

    ctx.restore();
}

init();
