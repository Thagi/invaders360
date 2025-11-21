import * as THREE from 'three';
import { TunnelBackground } from './TunnelBackground.js';
import { UpgradeManager } from './UpgradeManager.js';
import { Player } from './Player.js';

import { BulletManager } from './BulletManager.js';
import { EnemyManager } from './EnemyManager.js';
import { ParticleManager } from './ParticleManager.js';
import { WaveManager } from './WaveManager.js';
import { PowerUpManager } from './PowerUpManager.js';
import { ComboManager } from './ComboManager.js';
import { SpecialAbility } from './SpecialAbility.js';
import { StageBoss } from './StageBoss.js';
import { SoundManager } from './SoundManager.js';
import { BackgroundManager } from './BackgroundManager.js';
import { ObstacleManager } from './ObstacleManager.js';
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

        // Player boundary visualization - gradient ring
        // Player boundary visualization - Simple Ring
        const boundaryRadius = 8;
        const segments = 64;

        const geometry = new THREE.BufferGeometry();
        const positions = [];

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * boundaryRadius;
            const y = Math.sin(angle) * boundaryRadius;
            positions.push(x, y, 0);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0x00ffff, // Cyan
            transparent: true,
            opacity: 0.3
        });

        this.boundaryMesh = new THREE.LineLoop(geometry, material);
        this.scene.add(this.boundaryMesh);
        this.boundaryMesh = this.boundaryMesh;

        this.bulletManager = new BulletManager(this.scene);
        this.enemyManager = new EnemyManager(this.scene, this.bulletManager);
        this.particleManager = new ParticleManager(this.scene);
        this.powerUpManager = new PowerUpManager(this.scene);
        this.comboManager = new ComboManager();
        this.specialAbility = new SpecialAbility(this.scene, () => this.activateBomb());
        this.soundManager = new SoundManager();
        this.backgroundManager = new BackgroundManager(this.scene);
        this.tunnelBackground = new TunnelBackground(this.scene);
        this.obstacleManager = new ObstacleManager(this.scene);
        this.player = new Player(this.scene, this.bulletManager);
        this.upgradeManager = new UpgradeManager(this.player, this);
        this.waveManager = new WaveManager(this.enemyManager);
        this.stageBoss = null; // Current stage boss

        // Game state
        this.isPaused = false;

        // Post-processing
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0;
        bloomPass.strength = 2.5; // High intensity for neon look
        bloomPass.radius = 0;
        this.composer.addPass(bloomPass);

        // Bind wave completion to upgrade screen
        this.waveManager.onWaveComplete = this.showUpgradeScreen.bind(this);

        this.clock = new THREE.Clock();
        this.isPlaying = false;
        this.score = 0;
        this.lives = 3;
        this.maxLives = 3;
        this.screenFlashAlpha = 0; // For bomb flash effect
        this.cameraShake = { x: 0, y: 0, intensity: 0, duration: 0 }; // Screen shake
        this.useTunnel = true; // Toggle tunnel background

        this.inputCooldown = 0;
        this.isDying = false; // Flag for death animation

        window.addEventListener('resize', this.onWindowResize.bind(this));

        // UI Event Listeners
        window.addEventListener('keydown', (e) => {
            // Block input during cooldown (e.g. immediately after game over)
            if (this.inputCooldown > 0) return;

            console.log('Key pressed:', e.code);
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent page scroll
                if (!this.isPlaying && document.getElementById('game-over-screen').classList.contains('hidden')) {
                    // Start Game
                    document.getElementById('start-screen').classList.add('hidden');
                    this.start();
                } else if (!this.isPlaying && !document.getElementById('game-over-screen').classList.contains('hidden')) {
                    // Restart Game
                    this.restart();
                }
            }
            if (e.code === 'KeyB') {
                this.checkBombActivation();
            }
            if (e.code === 'KeyP' || e.code === 'Escape') {
                this.togglePause();
            }
        });
    }

    setupUIEventListeners() {
        // Pause Button (HUD)
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePause();
                pauseBtn.blur();
            });
        }

        // Resume Button (Pause Menu)
        const resumeBtn = document.getElementById('resume-btn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePause();
            });
        }

        // Home Button (Pause Menu)
        const homeBtnPause = document.getElementById('home-btn-pause');
        if (homeBtnPause) {
            homeBtnPause.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resetToHome();
            });
        }

        // Home Button (Game Over)
        const homeBtnOver = document.getElementById('home-btn-over');
        if (homeBtnOver) {
            homeBtnOver.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resetToHome();
            });
        }

        // Restart Button (Game Over)
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.restart();
            });
        }
    }

    restart() {
        // Reset game state
        this.score = 0;
        this.lives = 3;
        this.updateScore();
        this.updateLives();
        document.getElementById('game-over-screen').classList.add('hidden');

        // Reset upgrades
        if (this.upgradeManager) this.upgradeManager.reset();

        // Clear enemies
        // Clear enemies
        this.enemyManager.clear();

        // Clear bullets
        this.bulletManager.clear();

        // Clear power-ups
        this.powerUpManager.clear();

        // Clear particles
        if (this.particleManager) this.particleManager.clear();

        // Reset combo

        // Reset combo
        this.comboManager.reset();

        // Reset special ability
        this.specialAbility.reset();

        // Clear obstacles
        this.obstacleManager.clear();

        // Clear stage boss if exists
        if (this.stageBoss) {
            this.stageBoss.destroy();
            this.stageBoss = null;
        }

        // Reset wave manager
        this.waveManager.currentWave = 0;
        this.waveManager.enemiesKilled = 0;

        // Reset player
        if (this.player) this.player.reset();

        // Reset death and shake states
        this.isDying = false;
        this.cameraShake = { x: 0, y: 0, intensity: 0, duration: 0 };

        this.start();
    }

    start() {
        this.clock.start();
        this.isPlaying = true;

        // Initialize sound on first user interaction
        this.soundManager.init();
        this.soundManager.startMusic('game');

        // Start first wave
        this.waveManager.startNextWave();

        this.updateUI();

        // Show HUD and pause button
        const hud = document.getElementById('hud');
        if (hud) hud.style.display = 'block';

        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) pauseBtn.style.display = 'block';

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
        if (this.isPaused) {
            requestAnimationFrame(this.animate.bind(this));
            return;
        }
        // Continue animation during death for particles and shake effects
        if (!this.isPlaying && !this.isDying) return;

        requestAnimationFrame(this.animate.bind(this));

        let delta = this.clock.getDelta();
        // Cap delta to prevent death spiral on lag spikes (max 0.1s)
        delta = Math.min(delta, 0.1);

        // Update input cooldown
        if (this.inputCooldown > 0) {
            this.inputCooldown -= delta;
        }

        const time = this.clock.getElapsedTime();

        // Update game logic here
        // Calculate effective delta for time slow
        const timeSlowActive = this.powerUpManager.hasTimeSlow();
        const effectiveDelta = timeSlowActive ? delta * 0.5 : delta;

        // Only update game objects if actually playing (not dying)
        if (this.isPlaying) {
            if (this.player) {
                this.player.update(effectiveDelta, this.powerUpManager);
            }
            if (this.bulletManager) {
                this.bulletManager.update(delta);
            }
            if (this.enemyManager && !this.waveManager.isInTransition() && !this.waveManager.isBossWaveActive()) {
                this.enemyManager.update(effectiveDelta, this.player); // Time slow affects enemies
            }
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

            // Check for wave completion
            if (this.waveManager.justCompleted) {
                this.waveManager.justCompleted = false;

                // Don't auto-clear if boss wave (boss should be alive still in transition)
                // Only clear enemies/bullets on non-boss wave completion
                if (!this.stageBoss) {
                    // Wave clear effects
                    // Destroy all remaining enemies with particles
                    for (const enemy of [...this.enemyManager.enemies]) {
                        this.particleManager.createExplosion(
                            enemy.mesh.position,
                            0x00ff00, // Green particles for wave clear
                            15
                        );
                        this.enemyManager.removeEnemy(enemy);
                    }

                    // Clear all bullets (enemy and player)
                    this.bulletManager.clear();

                    // Clear obstacles
                    if (this.obstacleManager) this.obstacleManager.clear();
                }

                // Recover life
                if (this.lives < this.maxLives) {
                    this.lives++;
                    this.updateLives();
                    this.soundManager.playSound('powerup'); // Use powerup sound for life gain
                }

                // Show wave message
                const waveMsg = document.getElementById('wave-message');
                if (waveMsg) {
                    waveMsg.innerText = `WAVE ${this.waveManager.currentWave} COMPLETE!`;
                    waveMsg.style.display = 'block';
                    setTimeout(() => {
                        if (waveMsg) waveMsg.style.display = 'none';
                    }, 3000);
                }
            }

            // Grant bomb charge every 5 waves
            if (this.waveManager.currentWave % 5 === 0 && this.waveManager.currentWave > 0) {
                const lastWave = this.lastBombWave || 0;
                if (this.waveManager.currentWave !== lastWave && !this.waveManager.isInTransition()) {
                    this.specialAbility.addCharge();
                    this.lastBombWave = this.waveManager.currentWave;
                }
            }

            // Spawn obstacles for wave 3+
            if (this.waveManager.currentWave >= 3 && !this.waveManager.isInTransition()) {
                if (!this.obstacleSpawned || this.obstacleSpawned !== this.waveManager.currentWave) {
                    const obstacleCount = 5 + this.waveManager.currentWave;
                    this.obstacleManager.spawnWave(Math.min(obstacleCount, 15));
                    this.obstacleSpawned = this.waveManager.currentWave;
                }
            }
        }
        if (this.specialAbility) {
            this.specialAbility.update(delta);
        }
        if (this.backgroundManager) {
            this.backgroundManager.update(delta);
            // Boss mode background effect
            this.backgroundManager.setBossMode(this.stageBoss !== null);
        }
        if (this.useTunnel && this.tunnelBackground) {
            this.tunnelBackground.update(delta);
        }
        if (this.obstacleManager) {
            this.obstacleManager.update(effectiveDelta); // Time slow affects obstacles too
        }

        // Check for bomb activation
        this.checkBombActivation();

        // Handle boss wave
        this.handleBossWave();

        // Update stage boss
        this.updateBoss(delta);

        if (this.bulletManager && this.enemyManager) {
            this.checkCollisions();
        }

        // Screen flash fade out
        if (this.screenFlashAlpha > 0) {
            this.screenFlashAlpha -= delta * 2;
            if (this.screenFlashAlpha < 0) this.screenFlashAlpha = 0;
        }

        // Camera shake
        if (this.cameraShake.duration > 0) {
            this.cameraShake.duration -= delta;
            const shakeAmount = this.cameraShake.intensity * (this.cameraShake.duration / 0.5);
            this.camera.position.x = (Math.random() - 0.5) * shakeAmount;
            this.camera.position.y = (Math.random() - 0.5) * shakeAmount;
        } else {
            // Reset camera position
            this.camera.position.x = 0;
            this.camera.position.y = 0;
        }

        this.updateUI();

        // this.renderer.render(this.scene, this.camera);
        this.composer.render();
    }

    resetToHome() {
        this.isPlaying = false;
        this.isPaused = false;
        this.clock.stop();

        // Clear game state
        this.enemyManager.clear();
        this.bulletManager.clear();
        this.powerUpManager.clear();
        if (this.particleManager) this.particleManager.clear();
        if (this.obstacleManager) this.obstacleManager.clear();
        this.comboManager.reset();
        this.specialAbility.reset();

        // Remove boss if active
        if (this.stageBoss) {
            this.scene.remove(this.stageBoss.mesh);
            this.stageBoss = null;
        }

        // Reset stats
        this.score = 0;
        this.lives = 3;
        this.waveManager.reset();

        // UI - Hide all game elements, show start screen
        const hud = document.getElementById('hud');
        if (hud) hud.style.display = 'none';

        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('pause-menu').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');

        const bossHp = document.getElementById('boss-hp-bar');
        if (bossHp) bossHp.style.display = 'none';

        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) pauseBtn.style.display = 'none';

        const waveMsg = document.getElementById('wave-message');
        if (waveMsg) waveMsg.style.display = 'none';

        // Reset player
        if (this.player) this.player.reset();

        // Reset input cooldown to allow immediate input
        this.inputCooldown = 0;

        // Reset death and shake states
        this.isDying = false;
        this.cameraShake = { x: 0, y: 0, intensity: 0, duration: 0 };

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Reset background
        this.backgroundManager.setBossMode(false);
        this.soundManager.stopMusic();
    }

    checkCollisions() {
        const bullets = this.bulletManager.bullets;
        const enemies = this.enemyManager.enemies;

        // Bullets vs Obstacles
        if (this.obstacleManager) {
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                const hitObstacle = this.obstacleManager.checkCollision(bullet.mesh.position, bullet.size || 0.5);

                if (hitObstacle) {
                    // Hit obstacle
                    this.soundManager.playSound('damage'); // Use damage sound for impact
                    if (this.obstacleManager.hit(hitObstacle, bullet.damage || 1)) {
                        // Obstacle destroyed
                        this.soundManager.playSound('explosion');
                        this.score += 50;
                        this.updateScore();
                    }

                    // Remove bullet
                    this.scene.remove(bullet.mesh);
                    // Geometry is shared, do not dispose
                    bullets.splice(i, 1);
                }
            }
        }

        // Bullets vs Stage Boss
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];

            // Skip enemy bullets
            if (bullet.isEnemy) continue;

            // Check stage boss hit
            if (this.bossHit(bullet)) {
                bullets.splice(i, 1);
                continue;
            }
        }

        // Bullets vs Enemies
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            const bulletPos = bullet.mesh.position;

            // Skip enemy bullets for enemy collisions (Friendly Fire)
            if (bullet.isEnemy) continue;

            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                const enemyPos = enemy.mesh.position;

                // Check shield enemy directional defense
                if (enemy.type === 'shield') {
                    // Calculate angle of bullet approach relative to enemy
                    const dx = bulletPos.x - enemyPos.x;
                    const dy = bulletPos.y - enemyPos.y;
                    const attackAngle = Math.atan2(dy, dx);

                    // Normalize angles
                    let angleDiff = attackAngle - enemy.shieldAngle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                    // If hitting front (shield), block it
                    if (Math.abs(angleDiff) > Math.PI * 0.5) {
                        // Blocked by shield
                        this.particleManager.createExplosion(bulletPos, 0x00ddff, 5);
                        this.soundManager.playSound('damage');

                        // Remove bullet
                        this.scene.remove(bullet.mesh);
                        // Geometry is shared, do not dispose
                        bullets.splice(i, 1);
                        continue; // Skip to next bullet
                    }
                }

                // Simple distance check
                const dist = bulletPos.distanceTo(enemyPos);
                if (dist < (enemy.size || 1) + 0.5) { // Dynamic size check
                    // Hit!
                    enemy.hp -= (bullet.damage || 1);
                    this.particleManager.createExplosion(enemyPos, enemy.type === 'boss' ? 0xffaa00 : 0xff0000, 5);
                    this.soundManager.playSound('damage');

                    // Remove bullet
                    this.scene.remove(bullet.mesh);
                    // Geometry is shared, do not dispose
                    bullets.splice(i, 1);

                    if (enemy.hp <= 0) {
                        // Enemy destroyed
                        this.soundManager.playSound('explosion');
                        this.comboManager.onEnemyHit();
                        const multiplier = this.comboManager.getMultiplier();
                        const scoreMultiplier = this.powerUpManager.hasMultiplier() ? 2 : 1;
                        const baseScore = enemy.score || 100;
                        const finalScore = Math.floor(baseScore * multiplier * scoreMultiplier);

                        this.score += finalScore;
                        this.updateScore();
                        this.particleManager.createExplosion(enemyPos, enemy.type === 'boss' ? 0xffaa00 : 0xff0000, enemy.type === 'boss' ? 30 : 15);

                        // Spawn power-up
                        this.powerUpManager.trySpawn(enemyPos);

                        // Handle splitter death (spawn mini enemies)
                        if (enemy.type === 'splitter') {
                            this.enemyManager.handleEnemyDeath(enemy, enemyPos);
                        }

                        // Handle kamikaze explosion
                        if (enemy.type === 'kamikaze') {
                            this.particleManager.createExplosion(enemyPos, 0xff0000, 30);
                            this.triggerShake(0.5, 0.3);
                            // Could damage player if close?
                            if (this.player && enemyPos.distanceTo(this.player.getPosition()) < 5) {
                                this.takeDamage();
                            }
                        }

                        // Remove enemy
                        this.enemyManager.removeEnemy(enemy);

                        // Only count kills for wave progression if NOT in boss wave
                        // Boss kill is counted separately in onBossDefeated()
                        if (!this.waveManager.isBossWaveActive()) {
                            this.waveManager.onEnemyKilled();
                        }
                    }

                    break; // Bullet hit something, stop checking this bullet
                }
            }
        }

        // Enemies vs Player
        const playerPos = this.player.getPosition();
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (enemy.radius < this.player.radius + 1) { // Enemy reached player
                this.takeDamage();
                // Remove the enemy that caused damage
                this.enemyManager.removeEnemy(enemy);
            }
        }

        // Obstacles vs Player
        if (this.obstacleManager) {
            const hitObstacle = this.obstacleManager.checkCollision(playerPos, 1.0);
            if (hitObstacle) {
                this.takeDamage();
                this.obstacleManager.destroy(hitObstacle);
            }
        }

        // Enemy Bullets vs Player
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (bullet.isEnemy) {
                const bulletPos = bullet.mesh.position;
                if (bulletPos.distanceTo(playerPos) < 1.5) {
                    this.takeDamage();
                    // Remove the bullet
                    this.scene.remove(bullet.mesh);
                    // Geometry is shared, do not dispose
                    bullets.splice(i, 1);
                }
            }
        }

        // Magnet Power-up Logic
        if (this.powerUpManager && this.powerUpManager.hasMagnet()) {
            for (const powerUp of this.powerUpManager.powerUps) {
                const dist = powerUp.mesh.position.distanceTo(playerPos);
                if (dist < 15) { // Magnet range
                    // Move towards player
                    const direction = new THREE.Vector3().subVectors(playerPos, powerUp.mesh.position).normalize();
                    powerUp.mesh.position.add(direction.multiplyScalar(0.5)); // Fast attraction

                    // Update polar coords for consistency (though we're overriding position)
                    powerUp.radius = powerUp.mesh.position.length();
                    powerUp.angle = Math.atan2(powerUp.mesh.position.y, powerUp.mesh.position.x);
                }
            }
        }
    }

    takeDamage() {
        if (this.player.isInvulnerable() || this.powerUpManager.hasInvincibility()) return;

        // Check for shield
        if (this.powerUpManager.consumeShield()) {
            this.particleManager.createExplosion(this.player.getPosition(), 0x00ff00, 20);
            this.soundManager.playSound('damage');
            return;
        }

        this.lives--;
        this.updateLives();
        this.comboManager.reset(); // Reset combo on damage
        this.particleManager.createExplosion(this.player.getPosition(), 0xff0000, 25);
        this.soundManager.playSound('damage');
        this.triggerShake(0.5, 0.4); // Shake screen

        if (this.lives <= 0) {
            // Player death - show explosion and delay game over
            this.isPlaying = false; // Stop gameplay
            this.isDying = true; // Keep animate loop running for effects

            // Large explosion at player position (same as enemy death)
            const playerPos = this.player.getPosition();
            this.particleManager.createExplosion(playerPos, 0xff0000, 30);

            // Hide player
            this.player.mesh.visible = false;

            // Play explosion sound
            this.soundManager.playSound('explosion');
            this.triggerShake(1.0, 0.8);

            // Delay game over screen
            setTimeout(() => {
                this.isDying = false;
                this.gameOver();
            }, 1500); // 1.5 second delay
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
                    const colorHex = p.config.color.toString(16).padStart(6, '0');
                    return `<div style="color: #${colorHex}">${p.config.icon} ${p.config.name} (${time}s)</div>`;
                }).join('');
                powerupsEl.style.display = 'block';
            } else {
                powerupsEl.style.display = 'none';
            }
        }

        // Update bomb counter
        const bombEl = document.getElementById('bombs');
        if (bombEl) {
            const charges = this.specialAbility.getCharges();
            const maxCharges = this.specialAbility.getMaxCharges();
            const isOnCooldown = this.specialAbility.isOnCooldown;

            let bombDisplay = '💣 '.repeat(charges) + '⚫'.repeat(maxCharges - charges);
            if (isOnCooldown) {
                const cooldownRemaining = this.specialAbility.getCooldownRemaining();
                bombDisplay += ` (${cooldownRemaining.toFixed(1)}s)`;
            }
            bombEl.innerText = bombDisplay;
        }
    }

    gameOver() {
        this.isPlaying = false;
        this.inputCooldown = 2.0; // 2 seconds cooldown before restart allowed
        document.getElementById('game-over-screen').classList.remove('hidden');

        // Update game over stats
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('final-wave').innerText = this.waveManager.currentWave;
        document.getElementById('final-combo').innerText = this.comboManager.getMaxCombo();
    }

    activateBomb() {
        if (this.specialAbility.activate()) {
            console.log('Bomb activated!');

            // Visual effects
            this.screenFlashAlpha = 1.0;
            this.particleManager.createExplosion(new THREE.Vector3(0, 0, 0), 0xffff00, 50); // Yellow massive explosion

            // Sound and Shake
            this.soundManager.playSound('bomb');
            this.triggerShake(1.0, 0.8); // Intense shake

            // Damage Stage Boss
            if (this.stageBoss && this.stageBoss.active) {
                const damage = Math.ceil(this.stageBoss.maxHp * 0.5);
                this.stageBoss.takeDamage(damage);
                this.particleManager.createExplosion(this.stageBoss.mesh.position, 0xffaa00, 20);
            }

            // Damage all enemies
            const enemiesToRemove = [];

            for (const enemy of this.enemyManager.enemies) {
                if (enemy.type === 'boss') {
                    // Handle EnemyManager managed bosses (if any)
                    enemy.hp -= Math.ceil(enemy.maxHp * 0.5);
                    if (enemy.hp <= 0) {
                        enemiesToRemove.push(enemy);
                        this.score += enemy.score;
                        this.comboManager.addHit();
                    }
                } else if (enemy.type === 'tank') {
                    // Tank takes 50% max HP damage
                    enemy.hp -= Math.ceil(enemy.maxHp * 0.5);
                    if (enemy.hp <= 0) {
                        enemiesToRemove.push(enemy);
                        this.score += enemy.score;
                        this.comboManager.addHit();
                    } else {
                        // Flash effect for survivor
                        enemy.mesh.material.color.setHex(0xffffff);
                        setTimeout(() => {
                            if (enemy.mesh) enemy.mesh.material.color.setHex(0x00ffff);
                        }, 100);
                    }
                } else {
                    // All other enemies die instantly
                    enemiesToRemove.push(enemy);
                    this.score += enemy.score;
                    this.comboManager.addHit();
                }
            }

            // Process removals
            for (const enemy of enemiesToRemove) {
                this.particleManager.createExplosion(enemy.mesh.position, enemy.mesh.material.color.getHex(), 10);

                // Handle splitter
                if (enemy.type === 'splitter') {
                    this.enemyManager.handleEnemyDeath(enemy, enemy.mesh.position);
                }

                this.enemyManager.removeEnemy(enemy);
            }

            // Destroy all bullets
            this.bulletManager.clear();

            // Destroy all obstacles
            if (this.obstacleManager) {
                for (const obstacle of this.obstacleManager.obstacles) {
                    this.obstacleManager.destroy(obstacle);
                }
            }

            this.updateScore();
        }
    }

    triggerShake(intensity, duration) {
        this.cameraShake.intensity = intensity;
        this.cameraShake.duration = duration;
    }

    checkBombActivation() {
        if (this.player.keys.bomb) {
            this.activateBomb();
            this.player.keys.bomb = false; // Prevent holding
        }
    }

    togglePause() {
        // Prevent pause if not playing (e.g. start screen or game over)
        // Allow unpausing if currently paused
        if (!this.isPlaying && !this.isPaused) return;

        // Extra check: if start screen is visible, do not pause
        if (!document.getElementById('start-screen').classList.contains('hidden')) return;

        this.isPaused = !this.isPaused;
        const pauseMenu = document.getElementById('pause-menu');
        if (this.isPaused) {
            if (pauseMenu) pauseMenu.classList.remove('hidden');
            this.clock.stop(); // Stop clock to prevent large delta on resume
        } else {
            if (pauseMenu) pauseMenu.classList.add('hidden');
            this.clock.start();
        }
    }

    handleBossWave() {
        if (this.waveManager.isBossWaveActive() && !this.stageBoss) {
            // Spawn Boss
            this.stageBoss = new StageBoss(this.scene, this.bulletManager, this.waveManager.currentWave);
            this.soundManager.playSound('bossWarning');
            this.soundManager.startMusic('boss');
            this.backgroundManager.setBossMode(true);

            // Show boss warning
            const warningEl = document.getElementById('boss-warning');
            if (warningEl) {
                warningEl.classList.remove('hidden');
                setTimeout(() => {
                    warningEl.classList.add('hidden');
                }, 3000);
            }
        }
    }

    updateBoss(dt) {
        if (this.stageBoss) {
            this.stageBoss.update(dt, this.player);

            // Update boss health bar
            const bossHpBar = document.getElementById('boss-hp-bar');
            const bossHpFill = document.getElementById('boss-hp-fill');
            const bossName = document.getElementById('boss-name');

            if (bossHpBar) {
                bossHpBar.style.display = 'block';
                if (bossHpFill) {
                    const hpPercent = this.stageBoss.getHPPercent() * 100;
                    bossHpFill.style.width = `${hpPercent}%`;

                    // Color based on phase
                    if (this.stageBoss.phase === 3) {
                        bossHpFill.style.background = 'linear-gradient(90deg, #ff0000, #ff6666)';
                    } else if (this.stageBoss.phase === 2) {
                        bossHpFill.style.background = 'linear-gradient(90deg, #ffaa00, #ffdd66)';
                    }
                }
                if (bossName) {
                    bossName.innerText = `STAGE BOSS - WAVE ${this.waveManager.currentWave} [PHASE ${this.stageBoss.phase}]`;
                }
            }

            // Check for enemy spawning from boss
            const spawnRequest = this.stageBoss.spawnEnemies();
            if (spawnRequest) {
                for (let i = 0; i < spawnRequest.count; i++) {
                    this.enemyManager.spawn(spawnRequest.type);
                }
            }
        } else {
            // Hide boss health bar
            const bossHpBar = document.getElementById('boss-hp-bar');
            if (bossHpBar) {
                bossHpBar.style.display = 'none';
            }
        }
    }

    bossHit(bullet) {
        if (!this.stageBoss) return false;

        const dist = bullet.mesh.position.distanceTo(this.stageBoss.mesh.position);
        if (dist < 5) { // Boss is large
            const damage = bullet.damage || 1;
            const destroyed = this.stageBoss.takeDamage(damage);

            // Remove bullet
            this.scene.remove(bullet.mesh);
            if (bullet.geometry) bullet.geometry.dispose();

            // Particle effect
            this.particleManager.explode(this.stageBoss.mesh.position, 10, 0xffd700);

            if (destroyed) {
                this.onBossDefeated();
            }

            return true;
        }

        return false;
    }

    onBossDefeated() {
        console.log('*** STAGE BOSS DEFEATED! ***');

        // Award score
        this.comboManager.onEnemyHit();
        const multiplier = this.comboManager.getMultiplier();
        const scoreMultiplier = this.powerUpManager.hasMultiplier() ? 2 : 1;
        const finalScore = Math.floor(this.stageBoss.score * multiplier * scoreMultiplier);

        this.score += finalScore;
        this.updateScore();

        // Massive explosion
        this.particleManager.explode(this.stageBoss.mesh.position, 50, 0xffd700);

        // Spawn power-up
        this.powerUpManager.trySpawn(this.stageBoss.mesh.position);

        // Destroy boss
        this.stageBoss.destroy();
        this.stageBoss = null;

        // Complete wave
        this.waveManager.onEnemyKilled();

        // Grant bomb charge
        this.specialAbility.addCharge();
    }

    showUpgradeScreen() {
        // Pause game
        this.isPlaying = false;
        this.clock.stop();

        const upgradeScreen = document.getElementById('upgrade-screen');
        const optionsContainer = upgradeScreen.querySelector('.upgrade-options');
        optionsContainer.innerHTML = ''; // Clear previous options

        // Get random upgrades
        const upgrades = this.upgradeManager.getRandomUpgrades(3);

        upgrades.forEach(upgrade => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `
                <div class="upgrade-icon" style="color: ${upgrade.color}">${upgrade.icon}</div>
                <h3>${upgrade.name}</h3>
                <p>${upgrade.description}</p>
            `;

            card.addEventListener('click', () => {
                this.upgradeManager.applyUpgrade(upgrade.id);
                this.closeUpgradeScreen();
            });

            optionsContainer.appendChild(card);
        });

        upgradeScreen.classList.remove('hidden');
    }

    closeUpgradeScreen() {
        const upgradeScreen = document.getElementById('upgrade-screen');
        upgradeScreen.classList.add('hidden');

        // Resume game
        this.isPlaying = true;
        this.clock.start();
        this.waveManager.startNextWave();
    }
}
