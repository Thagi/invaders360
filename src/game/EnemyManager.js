import * as THREE from 'three';
import { polarToCartesian } from '../utils/math.js';

export class EnemyManager {
    constructor(scene, bulletManager) {
        this.scene = scene;
        this.bulletManager = bulletManager;
        this.enemies = [];
        this.spawnRate = 4.0; // Seconds between spawns (was 2.0)
        this.lastSpawnTime = 0;
        this.spawnRadius = 40;
        this.approachSpeed = 1.0; // Units per second (was 2.0)
        this.orbitSpeed = 0.5; // Radians per second

        // Reuse geometry and material
        this.geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        this.material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });

        this.bossGeometry = new THREE.BoxGeometry(4, 4, 4);
        this.bossMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true });

        this.bossSpawnRate = 5.0; // Seconds
        this.lastBossSpawnTime = 0;
    }

    spawn() {
        const angle = Math.random() * Math.PI * 2;
        const mesh = new THREE.Mesh(this.geometry, this.material);

        const pos = polarToCartesian(this.spawnRadius, angle);
        mesh.position.set(pos.x, pos.y, 0);

        this.scene.add(mesh);

        this.enemies.push({
            type: 'normal',
            mesh,
            angle,
            radius: this.spawnRadius,
            orbitDirection: Math.random() > 0.5 ? 1 : -1,
            hp: 1
        });
    }

    spawnBoss() {
        const angle = Math.random() * Math.PI * 2;
        const mesh = new THREE.Mesh(this.bossGeometry, this.bossMaterial);

        // Random radius between 20 and 35
        const radius = 20 + Math.random() * 15;
        const pos = polarToCartesian(radius, angle);
        mesh.position.set(pos.x, pos.y, 0);

        this.scene.add(mesh);

        this.enemies.push({
            type: 'boss',
            mesh,
            angle,
            radius: radius,
            orbitDirection: Math.random() > 0.5 ? 1 : -1,
            hp: 5, // Takes 5 hits
            shootTimer: 0,
            shootInterval: 2.0
        });
    }

    update(dt, player) {
        // Spawning
        this.lastSpawnTime += dt;
        if (this.lastSpawnTime > this.spawnRate) {
            this.spawn();
            this.lastSpawnTime = 0;
            // Increase difficulty slightly
            if (this.spawnRate > 0.5) this.spawnRate -= 0.05;
        }

        // Boss Spawning
        this.lastBossSpawnTime += dt;
        if (this.lastBossSpawnTime > this.bossSpawnRate) {
            this.spawnBoss();
            this.lastBossSpawnTime = 0;
        }

        // Movement
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Move inwards (only normal enemies)
            if (enemy.type === 'normal') {
                enemy.radius -= this.approachSpeed * dt;
            }

            // Orbit
            enemy.angle += this.orbitSpeed * enemy.orbitDirection * dt;

            // Update position
            const pos = polarToCartesian(enemy.radius, enemy.angle);
            enemy.mesh.position.set(pos.x, pos.y, 0);
            enemy.mesh.rotation.z = enemy.angle; // Face center? Or just rotate. Let's just rotate.

            // Boss Shooting
            if (enemy.type === 'boss' && player) {
                enemy.shootTimer += dt;
                if (enemy.shootTimer > enemy.shootInterval) {
                    // Calculate player position (approximate based on radius and angle)
                    // Player is at radius 8, angle player.angle
                    const playerPos = polarToCartesian(player.radius, player.angle);
                    const targetPos = new THREE.Vector3(playerPos.x, playerPos.y, 0);

                    this.bulletManager.shootAt(enemy.mesh.position, targetPos);
                    enemy.shootTimer = 0;
                }
            }

            // Remove if too close (Game Over condition usually, but just remove for now)
            if (enemy.radius < 2) {
                // TODO: Trigger Game Over
                this.scene.remove(enemy.mesh);
                this.enemies.splice(i, 1);
            }
        }
    }
}
