import * as THREE from 'three';
import { Player } from './Player.js';

import { BulletManager } from './BulletManager.js';
import { EnemyManager } from './EnemyManager.js';
import { ParticleManager } from './ParticleManager.js';
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
        this.player = new Player(this.scene, this.bulletManager);

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
        this.updateScore();
        document.getElementById('game-over-screen').classList.add('hidden');

        // Clear enemies
        for (const enemy of this.enemyManager.enemies) {
            this.scene.remove(enemy.mesh);
        }
        this.enemyManager.enemies = [];

        // Clear bullets
        for (const bullet of this.bulletManager.bullets) {
            this.scene.remove(bullet.mesh);
        }
        this.bulletManager.bullets = [];

        this.start();
    }

    start() {
        this.isPlaying = true;
        console.log('Game started');
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
            this.player.update(delta);
        }
        if (this.bulletManager) {
            this.bulletManager.update(delta);
        }
        if (this.enemyManager) {
            this.enemyManager.update(delta, this.player);
        }
        if (this.particleManager) {
            this.particleManager.update(delta);
        }

        if (this.bulletManager && this.enemyManager) {
            this.checkCollisions();
        }

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
                        enemy.hp--;
                        this.particleManager.explode(enemyPos, 5, 0xffaa00);

                        // Remove bullet
                        this.scene.remove(bullet.mesh);
                        bullets.splice(i, 1);

                        if (enemy.hp <= 0) {
                            this.score += 500;
                            this.updateScore();
                            this.particleManager.explode(enemyPos, 30, 0xffaa00);
                            this.scene.remove(enemy.mesh);
                            enemies.splice(j, 1);
                        }
                        break;
                    } else {
                        this.score += 100;
                        this.updateScore();

                        // Explosion
                        this.particleManager.explode(enemyPos, 15, 0xff0000);

                        // Remove bullet
                        this.scene.remove(bullet.mesh);
                        bullets.splice(i, 1);

                        // Remove enemy
                        this.scene.remove(enemy.mesh);
                        enemies.splice(j, 1);

                        break; // Bullet hit something, stop checking this bullet
                    }
                }
            }
        }

        // Enemies vs Player
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (enemy.radius < this.player.radius) { // Enemy reached player's current radius
                this.gameOver();
            }
        }

        // Enemy Bullets vs Player
        // Player position is at (radius=8, angle=player.angle)
        // But player rotates. Player mesh position is handled by pivot.
        // Easier to check distance from bullet to player mesh world position.
        // Player mesh is at local (8, 0, 0) inside pivot.
        // Pivot rotation is player.angle.
        // So player world pos is polarToCartesian(8, player.angle).

        const playerPos = new THREE.Vector3(
            this.player.radius * Math.cos(this.player.angle),
            this.player.radius * Math.sin(this.player.angle),
            0
        );

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (bullet.isEnemy) {
                const bulletPos = bullet.mesh.position;
                if (bulletPos.distanceTo(playerPos) < 1.5) {
                    this.gameOver();
                }
            }
        }
    }

    updateScore() {
        document.getElementById('score').innerText = `Score: ${this.score}`;
    }

    gameOver() {
        this.isPlaying = false;
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('final-score').innerText = `Score: ${this.score}`;
    }
}
