import * as THREE from 'three';
import { Player } from './Player.js';

import { BulletManager } from './BulletManager.js';
import { EnemyManager } from './EnemyManager.js';
import { ParticleManager } from './ParticleManager.js';
import { WaveManager } from './WaveManager.js';
import { PowerUpManager } from './PowerUpManager.js';
import { ComboManager } from './ComboManager.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class Game {
    constructor() {
        console.log('Game constructor called');
        this.container = document.getElementById('app');
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });

        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Camera positioning (Top-down view)
        this.camera.position.set(0, 0, 50);
        this.camera.lookAt(0, 0, 0);

        // Basic Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(10, 10, 10);
        this.scene.add(pointLight);

        // Grid Helper for reference (remove later)
        // const gridHelper = new THREE.GridHelper(100, 100);
        // this.scene.add(gridHelper);

        // Game Over Boundary Visualization
        const boundaryGeometry = new THREE.CircleGeometry(8, 64);
        const boundaryMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.05 }); // Cyan filled circle (subtle)
        const boundaryMesh = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
        this.scene.add(boundaryMesh);

        this.bulletManager = new BulletManager(this.scene);
        this.enemyManager = new EnemyManager(this.scene, this.bulletManager);
        this.particleManager = new ParticleManager(this.scene);
        this.powerUpManager = new PowerUpManager(this.scene);
        this.comboManager = new ComboManager();
        this.player = new Player(this.scene, this.bulletManager);
        this.waveManager = new WaveManager(this.enemyManager);

        // Post-processing
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0;
        bloomPass.strength = 2.5; // High intensity for neon look
        bloomPass.radius = 0;
        this.composer.addPass(bloomPass);

        this.clock = new THREE.Clock();
        this.isPlaying = false;
        this.score = 0;
        this.lives = 3;
        this.maxLives = 3;

        window.addEventListener('resize', this.onWindowResize.bind(this));

        // UI Event Listeners
        window.addEventListener('keydown', (e) => {
            console.log('Key pressed:', e.code);
            if (e.code === 'Space') {
                if (!this.isPlaying && document.getElementById('game-over-screen').classList.contains('hidden')) {
                    // Start Game
                    document.getElementById('start-screen').classList.add('hidden');
                    this.start();
                } else if (!this.isPlaying && !document.getElementById('game-over-screen').classList.contains('hidden')) {
                    // Restart Game
                    this.restart();
                }
            }
        });
    }

    restart() {
        // Reset game state
        this.score = 0;
        this.lives = 3;
        this.updateScore();
        this.updateLives();
        document.getElementById('game-over-screen').classList.add('hidden');

        // Clear enemies
        for (const enemy of this.enemyManager.enemies) {
            this.scene.remove(enemy.mesh);
        }
        this.enemyManager.enemies = [];

        // Clear bullets
        this.bulletManager.clear();

        // Clear power-ups
        this.powerUpManager.clear();

        // Reset combo
        this.comboManager.reset();

        // Reset wave manager
        this.waveManager.currentWave = 0;
        this.waveManager.enemiesKilled = 0;

        this.start();
    }

    start() {
        this.isPlaying = true;
        console.log('Game started');
        this.waveManager.startNextWave(); // Start wave 1
        this.updateUI();
        this.animate();
    }

    onWindowResize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        if (this.composer) {
            this.composer.setSize(this.width, this.height);
        }
    }

    animate() {
        if (!this.isPlaying) return;

        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // Update game logic here
        if (this.player) {
            this.player.update(delta, this.powerUpManager);
        }
        if (this.bulletManager) {
            this.bulletManager.update(delta);
        }
        if (this.enemyManager && !this.waveManager.isInTransition()) {
            this.enemyManager.update(delta, this.player);
        }
        if (this.particleManager) {
            this.particleManager.update(delta);
        }
        if (this.powerUpManager) {
            const playerPos = this.player ? this.player.getPosition() : null;
            this.powerUpManager.update(delta, playerPos);
        }
        if (this.comboManager) {
            this.comboManager.update(delta);
        }
        if (this.waveManager) {
            this.waveManager.update(delta);
        }

        if (this.bulletManager && this.enemyManager) {
            this.checkCollisions();
        }

        this.updateUI();

        // this.renderer.render(this.scene, this.camera);
        this.composer.render();
    }

    checkCollisions() {
        const bullets = this.bulletManager.bullets;
        const enemies = this.enemyManager.enemies;

        // Bullets vs Enemies
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            const bulletPos = bullet.mesh.position;

            // Skip enemy bullets for enemy collisions (Friendly Fire)
            if (bullet.isEnemy) continue;

            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                const enemyPos = enemy.mesh.position;

                // Simple distance check
                const dist = bulletPos.distanceTo(enemyPos);
                if (dist < 1.5) { // Approximate radius sum
                    // Hit!
                    if (enemy.type === 'boss') {
                        enemy.hp -= (bullet.damage || 1);
                        this.particleManager.explode(enemyPos, 5, 0xffaa00);

                        // Remove bullet
                        this.scene.remove(bullet.mesh);
                        if (bullet.geometry) bullet.geometry.dispose();
                        bullets.splice(i, 1);

                        if (enemy.hp <= 0) {
                            // Boss destroyed
                            this.comboManager.onEnemyHit();
                            const multiplier = this.comboManager.getMultiplier();
                            const scoreMultiplier = this.powerUpManager.hasMultiplier() ? 2 : 1;
                            const baseScore = 500;
                            const finalScore = Math.floor(baseScore * multiplier * scoreMultiplier);

                            this.score += finalScore;
                            this.updateScore();
                            this.particleManager.explode(enemyPos, 30, 0xffaa00);

                            // Spawn power-up
                            this.powerUpManager.trySpawn(enemyPos);

                            this.scene.remove(enemy.mesh);
                            enemies.splice(j, 1);
                            this.waveManager.onEnemyKilled();
                        }
                        break;
                    } else {
                        // Normal enemy destroyed
                        this.comboManager.onEnemyHit();
                        const multiplier = this.comboManager.getMultiplier();
                        const scoreMultiplier = this.powerUpManager.hasMultiplier() ? 2 : 1;
                        const baseScore = 100;
                        const finalScore = Math.floor(baseScore * multiplier * scoreMultiplier);

                        this.score += finalScore;
                        this.updateScore();

                        // Explosion
                        this.particleManager.explode(enemyPos, 15, 0xff0000);

                        // Spawn power-up
                        this.powerUpManager.trySpawn(enemyPos);

                        // Remove bullet
                        this.scene.remove(bullet.mesh);
                        if (bullet.geometry) bullet.geometry.dispose();
                        bullets.splice(i, 1);

                        // Remove enemy
                        this.scene.remove(enemy.mesh);
                        enemies.splice(j, 1);
                        this.waveManager.onEnemyKilled();

                        break; // Bullet hit something, stop checking this bullet
                    }
                }
            }
        }

        // Enemies vs Player
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (enemy.radius < this.player.radius) { // Enemy reached player's current radius
                this.takeDamage();
                // Remove the enemy that caused damage
                this.scene.remove(enemy.mesh);
                enemies.splice(i, 1);
            }
        }

        // Enemy Bullets vs Player
        const playerPos = this.player.getPosition();

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (bullet.isEnemy) {
                const bulletPos = bullet.mesh.position;
                if (bulletPos.distanceTo(playerPos) < 1.5) {
                    this.takeDamage();
                    // Remove the bullet
                    this.scene.remove(bullet.mesh);
                    if (bullet.geometry) bullet.geometry.dispose();
                    bullets.splice(i, 1);
                }
            }
        }
    }

    takeDamage() {
        if (this.player.isInvulnerable()) return;

        // Check for shield
        if (this.powerUpManager.consumeShield()) {
            this.particleManager.explode(this.player.getPosition(), 20, 0x00ff00);
            return;
        }

        this.lives--;
        this.updateLives();
        this.comboManager.reset(); // Reset combo on damage
        this.particleManager.explode(this.player.getPosition(), 25, 0xff0000);

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Make player invulnerable temporarily
            this.player.makeInvulnerable();
        }
    }

    updateScore() {
        document.getElementById('score').innerText = `Score: ${this.score}`;
    }

    updateLives() {
        const livesEl = document.getElementById('lives');
        if (livesEl) {
            livesEl.innerText = `Lives: ${'❤️'.repeat(this.lives)}${'🖤'.repeat(this.maxLives - this.lives)}`;
        }
    }

    updateUI() {
        // Update score
        this.updateScore();

        // Update lives
        this.updateLives();

        // Update wave
        const waveEl = document.getElementById('wave');
        if (waveEl) {
            if (this.waveManager.isInTransition()) {
                waveEl.innerText = `Wave ${this.waveManager.currentWave} Complete!`;
                waveEl.style.color = '#00ff00';
            } else {
                waveEl.innerText = `Wave: ${this.waveManager.currentWave}`;
                waveEl.style.color = '#ffffff';
            }
        }

        // Update combo
        const comboEl = document.getElementById('combo');
        if (comboEl) {
            const combo = this.comboManager.getCombo();
            const multiplier = this.comboManager.getMultiplier();
            if (combo > 0) {
                comboEl.innerText = `Combo: ${combo}x (${multiplier.toFixed(1)}x score)`;
                comboEl.style.display = 'block';

                // Color based on multiplier
                if (multiplier >= 5) comboEl.style.color = '#ff0080';
                else if (multiplier >= 3) comboEl.style.color = '#ff00ff';
                else if (multiplier >= 2) comboEl.style.color = '#ffaa00';
                else comboEl.style.color = '#ffff00';
            } else {
                comboEl.style.display = 'none';
            }
        }

        // Update weapon
        const weaponEl = document.getElementById('weapon');
        if (weaponEl) {
            weaponEl.innerText = `Weapon: ${this.player.weapons[this.player.currentWeapon].name}`;
        }

        // Update power-ups
        const powerupsEl = document.getElementById('powerups');
        if (powerupsEl) {
            const active = this.powerUpManager.getActivePowerUps();
            if (active.length > 0) {
                powerupsEl.innerHTML = active.map(p => {
                    const time = p.timeRemaining === Infinity ? '∞' : p.timeRemaining.toFixed(1);
                    return `<div style="color: #${p.config.color.toString(16)}">${p.config.icon} ${p.config.name} (${time}s)</div>`;
                }).join('');
                powerupsEl.style.display = 'block';
            } else {
                powerupsEl.style.display = 'none';
            }
        }
    }

    gameOver() {
        this.isPlaying = false;
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('final-score').innerText = `Score: ${this.score}`;

        const statsEl = document.getElementById('game-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                Wave Reached: ${this.waveManager.currentWave}<br>
                Max Combo: ${this.comboManager.getMaxCombo()}x
            `;
        }
    }
}
