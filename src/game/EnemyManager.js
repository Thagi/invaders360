import * as THREE from 'three';
import { polarToCartesian } from '../utils/math.js';

export class EnemyManager {
    constructor(scene, bulletManager, laserManager) {
        this.scene = scene;
        this.bulletManager = bulletManager;
        this.laserManager = laserManager;
        this.enemies = [];
        this.spawnRate = 4.0; // Seconds between spawns (was 2.0)
        this.lastSpawnTime = 0;
        this.spawnRadius = 40;
        this.approachSpeed = 1.0; // Units per second (was 2.0)
        this.orbitSpeed = 0.5; // Radians per second

        // Enemy type definitions
        this.enemyTypes = {
            normal: {
                geometry: new THREE.BoxGeometry(1.5, 1.5, 1.5),
                material: new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }),
                hp: 1,
                speed: 1.0,
                score: 100,
                size: 1
            },
            speed: {
                geometry: new THREE.ConeGeometry(0.8, 2, 3),
                material: new THREE.MeshBasicMaterial({ color: 0xff3333, wireframe: true }),
                hp: 1,
                speed: 3.0,
                score: 150,
                size: 0.8
            },
            tank: {
                geometry: new THREE.BoxGeometry(3, 3, 3),
                material: new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true }),
                hp: 5,
                speed: 0.5,
                score: 300,
                size: 3
            },
            shooter: {
                geometry: new THREE.CylinderGeometry(0, 1.5, 2, 5),
                material: new THREE.MeshBasicMaterial({ color: 0xaa00ff, wireframe: true }),
                hp: 2,
                speed: 0.8,
                score: 200,
                size: 1.2
            },
            splitter: {
                geometry: new THREE.OctahedronGeometry(1.2, 0),
                material: new THREE.MeshBasicMaterial({ color: 0xff8800, wireframe: true }),
                hp: 2,
                speed: 1.2,
                score: 250,
                size: 1.2
            },
            zigzag: {
                geometry: new THREE.CylinderGeometry(1, 1, 0.5, 6),
                material: new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true }),
                hp: 1,
                speed: 1.5,
                score: 175,
                size: 1
            },
            kamikaze: {
                geometry: new THREE.ConeGeometry(1, 2, 3),
                material: new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }),
                hp: 1,
                speed: 2.5,
                score: 200,
                size: 1
            },
            shield: {
                geometry: new THREE.SphereGeometry(1.2, 8, 8),
                material: new THREE.MeshBasicMaterial({ color: 0x0088ff, wireframe: true }),
                hp: 3,
                speed: 1.0,
                score: 350,
                size: 1.2
            },
            teleport: {
                geometry: new THREE.TetrahedronGeometry(1.2, 1),
                material: new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true, transparent: true, opacity: 0.7 }),
                hp: 2,
                speed: 0.8,
                score: 300,
                size: 1.2
            },
            laser: {
                geometry: new THREE.BoxGeometry(1, 3, 1),
                material: new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }), // Magenta
                hp: 3,
                speed: 0.5,
                score: 400,
                size: 1.5
            }
        };

        this.bossGeometry = new THREE.BoxGeometry(4, 4, 4);
        this.bossMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true });

        this.bossSpawnRate = 5.0; // Seconds
        this.lastBossSpawnTime = 0;
        this.gameMode = 'CLASSIC';
    }

    setMode(mode) {
        this.gameMode = mode;
    }

    spawn(type = null) {
        // Weighted random selection if no type specified
        if (!type) {
            const rand = Math.random();
            if (this.gameMode === 'TIME_ATTACK') {
                // More aggressive mix for Time Attack
                if (rand < 0.10) type = 'normal';          // 10%
                else if (rand < 0.25) type = 'speed';      // 15%
                else if (rand < 0.35) type = 'tank';       // 10%
                else if (rand < 0.60) type = 'shooter';    // 25%
                else if (rand < 0.65) type = 'splitter';   // 5%
                else if (rand < 0.75) type = 'zigzag';     // 10%
                else if (rand < 0.85) type = 'kamikaze';   // 10%
                else if (rand < 0.90) type = 'shield';     // 5%
                else if (rand < 0.95) type = 'teleport';   // 5%
                else type = 'laser';                       // 5%
            } else {
                // Standard mix
                if (rand < 0.15) type = 'normal';          // 15%
                else if (rand < 0.30) type = 'speed';      // 15%
                else if (rand < 0.40) type = 'tank';       // 10%
                else if (rand < 0.50) type = 'shooter';    // 10%
                else if (rand < 0.58) type = 'splitter';   // 8%
                else if (rand < 0.66) type = 'zigzag';     // 8%
                else if (rand < 0.74) type = 'kamikaze';   // 8%
                else if (rand < 0.82) type = 'shield';     // 8%
                else if (rand < 0.90) type = 'teleport';   // 8%
                else type = 'laser';                       // 10%
            }
        }

        const angle = Math.random() * Math.PI * 2;
        const enemyDef = this.enemyTypes[type];
        if (!enemyDef) {
            console.error(`Unknown enemy type: ${type}`);
            return;
        }

        const mesh = new THREE.Mesh(enemyDef.geometry, enemyDef.material);
        const pos = polarToCartesian(this.spawnRadius, angle);
        mesh.position.set(pos.x, pos.y, 0);

        this.scene.add(mesh);

        const enemy = {
            type,
            mesh,
            angle,
            radius: this.spawnRadius,
            orbitDirection: Math.random() > 0.5 ? 1 : -1,
            hp: enemyDef.hp,
            maxHp: enemyDef.hp,
            speed: enemyDef.speed,
            score: enemyDef.score,
            shootTimer: 0,
            shootInterval: (type === 'shooter' && this.gameMode === 'TIME_ATTACK') ? 0.8 : 2.0, // Much faster shooting in Time Attack
            zigzagPhase: Math.random() * Math.PI * 2
        };

        // Shooter-specific: stop radius
        if (type === 'shooter') {
            enemy.stopRadius = 25;
            enemy.stopped = false;
        }

        // Kamikaze-specific: acceleration towards player
        if (type === 'kamikaze') {
            enemy.accelerating = false;
            enemy.targetAngle = null;
        }

        // Shield-specific: create shield ring
        if (type === 'shield') {
            const ringGeometry = new THREE.RingGeometry(1.5, 2, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ddff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5
            });
            const shieldRing = new THREE.Mesh(ringGeometry, ringMaterial);
            shieldRing.position.z = 0.1;
            mesh.add(shieldRing);
            enemy.shieldRing = shieldRing;
            enemy.shieldAngle = 0; // Shield faces this direction
        }

        // Teleport-specific: teleport timer
        if (type === 'teleport') {
            enemy.teleportTimer = 5.0;
            enemy.teleportInterval = 5.0;
        }

        // Laser-specific: shooting interval
        if (type === 'laser') {
            enemy.stopRadius = 30; // Stops further away
            enemy.shootInterval = 2.0; // Shoot every 2 seconds
        }

        this.enemies.push(enemy);
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

    spawnMiniEnemy(position, type = 'speed') {
        // Spawn small enemy at specific position (for splitter)
        const enemyDef = this.enemyTypes[type];
        const mesh = new THREE.Mesh(enemyDef.geometry, enemyDef.material);

        mesh.position.copy(position);
        mesh.scale.set(0.6, 0.6, 0.6); // Smaller

        const angle = Math.atan2(position.y, position.x);
        const radius = Math.sqrt(position.x * position.x + position.y * position.y);

        this.scene.add(mesh);

        this.enemies.push({
            type: 'speed',
            mesh,
            angle,
            radius,
            orbitDirection: Math.random() > 0.5 ? 1 : -1,
            hp: 1,
            maxHp: 1,
            speed: 3.0,
            score: 50, // Mini enemies worth less
            isMini: true
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

        // Boss Spawning - Disabled, controlled by WaveManager/Game.js
        /*
        this.lastBossSpawnTime += dt;
        if (this.lastBossSpawnTime > this.bossSpawnRate) {
            this.spawnBoss();
            this.lastBossSpawnTime = 0;
        }
        */

        // Movement
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Type-specific behavior
            if (enemy.type === 'normal' || enemy.type === 'speed' || enemy.type === 'tank' || enemy.type === 'splitter') {
                enemy.radius -= this.approachSpeed * enemy.speed * dt;
            } else if (enemy.type === 'shooter') {
                // Shooter: stop at range and shoot
                if (!enemy.stopped && enemy.radius <= enemy.stopRadius) {
                    enemy.stopped = true;
                } else if (!enemy.stopped) {
                    enemy.radius -= this.approachSpeed * enemy.speed * dt;
                }

                // Shoot at player
                if (player) {
                    enemy.shootTimer += dt;
                    if (enemy.shootTimer >= enemy.shootInterval) {
                        const playerPos = player.getPosition();
                        this.bulletManager.shootAt(enemy.mesh.position, playerPos);
                        enemy.shootTimer = 0;
                    }
                }
            } else if (enemy.type === 'zigzag') {
                // Zigzag: sine wave movement
                enemy.radius -= this.approachSpeed * enemy.speed * dt;
                enemy.zigzagPhase += dt * 5; // Oscillation speed

                // Add perpendicular offset
                const zigzagAmount = Math.sin(enemy.zigzagPhase) * 3;
                enemy.angle += (zigzagAmount / enemy.radius) * dt;
            } else if (enemy.type === 'kamikaze') {
                // Kamikaze: accelerate towards player when close
                if (!enemy.accelerating && enemy.radius < 30 && player) {
                    enemy.accelerating = true;
                    const playerPos = player.getPosition();
                    enemy.targetAngle = Math.atan2(playerPos.y, playerPos.x);
                }

                if (enemy.accelerating) {
                    // Move straight towards target angle
                    const targetAngle = enemy.targetAngle;
                    const angleDiff = targetAngle - enemy.angle;
                    enemy.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), dt * 3);

                    // Accelerate inward
                    enemy.speed += dt * 2; // Accelerate
                    enemy.radius -= this.approachSpeed * enemy.speed * dt;

                    // Visual: rotate rapidly
                    enemy.mesh.rotation.z += dt * 10;
                } else {
                    enemy.radius -= this.approachSpeed * enemy.speed * dt;
                }
            } else if (enemy.type === 'shield') {
                // Shield: normal movement but rotate shield to face player
                enemy.radius -= this.approachSpeed * enemy.speed * dt;

                if (player) {
                    const playerPos = player.getPosition();
                    const toPlayer = new THREE.Vector2(
                        playerPos.x - enemy.mesh.position.x,
                        playerPos.y - enemy.mesh.position.y
                    );
                    enemy.shieldAngle = Math.atan2(toPlayer.y, toPlayer.x);

                    // Rotate shield ring to face player
                    if (enemy.shieldRing) {
                        enemy.shieldRing.rotation.z = enemy.shieldAngle - enemy.angle;
                    }
                }
            } else if (enemy.type === 'laser') {
                // Laser enemy behavior: moves to range and shoots laser projectiles
                if (enemy.radius > enemy.stopRadius) {
                    enemy.radius -= this.approachSpeed * enemy.speed * dt;
                }

                // Shoot laser projectiles at player
                if (player) {
                    enemy.shootTimer += dt;
                    if (enemy.shootTimer >= enemy.shootInterval) {
                        const playerPos = player.getPosition();
                        // Shoot elongated laser projectile
                        this.bulletManager.shootLaser(enemy.mesh.position, playerPos);
                        enemy.shootTimer = 0;
                    }
                }
            } else if (enemy.type === 'teleport') {
                // Teleport: normal movement but teleports randomly
                enemy.radius -= this.approachSpeed * enemy.speed * dt;

                enemy.teleportTimer -= dt;
                if (enemy.teleportTimer <= 0) {
                    // Teleport to random position
                    enemy.angle = Math.random() * Math.PI * 2;
                    enemy.radius = Math.max(enemy.radius, 25 + Math.random() * 10);
                    enemy.teleportTimer = enemy.teleportInterval;

                    // Visual: flash
                    enemy.mesh.material.opacity = 0.3;
                    setTimeout(() => {
                        if (enemy.mesh.material) {
                            enemy.mesh.material.opacity = 0.7;
                        }
                    }, 100);
                }
            }

            // Orbit (all types)
            enemy.angle += this.orbitSpeed * enemy.orbitDirection * dt;

            // Update position
            const pos = polarToCartesian(enemy.radius, enemy.angle);
            enemy.mesh.position.set(pos.x, pos.y, 0);
            enemy.mesh.rotation.z = enemy.angle; // Face center? Or just rotate. Let's just rotate.

            // Visual rotation
            if (enemy.type === 'speed') {
                enemy.mesh.rotation.x += dt * 8;
            } else if (enemy.type === 'tank') {
                enemy.mesh.rotation.x += dt * 1;
                enemy.mesh.rotation.y += dt * 1;
            }

            // Boss Shooting
            if (enemy.type === 'boss' && player) {
                enemy.shootTimer += dt;
                if (enemy.shootTimer > enemy.shootInterval) {
                    const playerPos = player.getPosition();
                    const targetPos = new THREE.Vector3(playerPos.x, playerPos.y, 0);

                    // 30% chance to fire homing missile, otherwise normal bullet
                    if (Math.random() < 0.3) {
                        this.bulletManager.shootHomingMissile(enemy.mesh.position, targetPos);
                    } else {
                        this.bulletManager.shootAt(enemy.mesh.position, targetPos);
                    }
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

    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.scene.remove(enemy.mesh);
            if (enemy.mesh.geometry) enemy.mesh.geometry.dispose();
            if (enemy.mesh.material) enemy.mesh.material.dispose();

            // Shield specific cleanup
            if (enemy.shieldRing) {
                this.scene.remove(enemy.shieldRing);
                if (enemy.shieldRing.geometry) enemy.shieldRing.geometry.dispose();
                if (enemy.shieldRing.material) enemy.shieldRing.material.dispose();
            }

            // Do NOT dispose shared geometries/materials from enemyTypes

            this.enemies.splice(index, 1);
        }
    }

    clear() {
        // Remove all enemies properly
        while (this.enemies.length > 0) {
            this.removeEnemy(this.enemies[0]);
        }
        this.enemies = [];
    }

    handleEnemyDeath(enemy, position) {
        // Splitter: spawn mini enemies
        if (enemy.type === 'splitter' && !enemy.isMini && position) {
            const miniCount = 2 + Math.floor(Math.random() * 2); // 2-3 mini enemies
            for (let i = 0; i < miniCount; i++) {
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4,
                    0
                );
                const spawnPos = new THREE.Vector3().addVectors(position, offset);
                this.spawnMiniEnemy(spawnPos, 'speed');
            }
        }
    }
}
