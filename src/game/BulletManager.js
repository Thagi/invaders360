import * as THREE from 'three';
import { polarToCartesian } from '../utils/math.js';

export class BulletManager {
    constructor(scene, player = null) {
        this.scene = scene;
        this.player = player; // Store player reference for homing missiles
        this.bullets = [];
        this.speed = 20; // Units per second
        this.maxRadius = 60; // Despawn distance

        // Reusable geometry
        this.baseGeometry = new THREE.BoxGeometry(1, 2, 1); // Base size, scale later
        this.material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        this.enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Purple for enemy bullets
    }

    shootAt(startPos, targetPos) {
        const mesh = new THREE.Mesh(this.baseGeometry, this.enemyMaterial);
        mesh.scale.set(0.5, 0.5, 0.5); // Scale down to default size
        mesh.position.copy(startPos);

        // Calculate direction
        const direction = new THREE.Vector3().subVectors(targetPos, startPos).normalize();
        const velocity = direction.multiplyScalar(15); // Speed 15

        // Rotate to face direction
        const angle = Math.atan2(direction.y, direction.x);
        mesh.rotation.z = angle - Math.PI / 2;

        this.scene.add(mesh);

        this.bullets.push({
            mesh,
            velocity, // Vector3
            isEnemy: true,
            life: 5.0, // Seconds to live
            damage: 1
        });
    }

    fire(position, velocity, isEnemy = false, color = 0xffff00, damage = 1, size = 0.5) {
        const material = isEnemy ? this.enemyMaterial : new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(this.baseGeometry, material);
        mesh.scale.set(size, size, size);
        mesh.position.copy(position);

        // Rotate to face velocity direction
        const angle = Math.atan2(velocity.y, velocity.x);
        mesh.rotation.z = angle - Math.PI / 2;

        this.scene.add(mesh);

        this.bullets.push({
            mesh,
            velocity, // Vector3
            isEnemy,
            life: 3.0, // Seconds to live
            damage
        });
    }

    shootLaser(startPos, targetPos, color = 0xff00ff) {
        // Create elongated laser projectile geometry
        const laserGeometry = new THREE.BoxGeometry(0.5, 4, 0.5); // Thin and elongated
        const laserMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        const mesh = new THREE.Mesh(laserGeometry, laserMaterial);
        mesh.position.copy(startPos);

        // Calculate direction and velocity
        const direction = new THREE.Vector3().subVectors(targetPos, startPos).normalize();
        const velocity = direction.multiplyScalar(15); // Same speed as normal bullets

        // Rotate to face direction
        const angle = Math.atan2(direction.y, direction.x);
        mesh.rotation.z = angle - Math.PI / 2;

        this.scene.add(mesh);

        this.bullets.push({
            mesh,
            velocity,
            isEnemy: true,
            life: 5.0,
            damage: 1,
            isLaser: true // Mark as laser for special effects
        });
    }

    shootHomingMissile(startPos, targetPos) {
        // Create homing missile geometry (larger and more distinctive)
        const missileGeometry = new THREE.ConeGeometry(0.8, 2.5, 4);
        const missileMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600, // Orange color
            transparent: true,
            opacity: 0.95
        });
        const mesh = new THREE.Mesh(missileGeometry, missileMaterial);
        mesh.position.copy(startPos);

        // Initial direction toward target
        const direction = new THREE.Vector3().subVectors(targetPos, startPos).normalize();
        const velocity = direction.multiplyScalar(10); // Slower than normal bullets

        // Rotate to face direction
        const angle = Math.atan2(direction.y, direction.x);
        mesh.rotation.z = angle - Math.PI / 2;

        this.scene.add(mesh);

        this.bullets.push({
            mesh,
            velocity,
            isEnemy: true,
            life: 8.0, // Longer lifetime
            damage: 1,
            isHoming: true, // Mark as homing missile
            homingStrength: 3.0 // Turning speed (radians per second)
        });
    }

    shootSpread(angle, startRadius, weapon = null) {
        // Shoot 3 bullets in a spread pattern
        const spreadAngle = Math.PI / 12; // 15 degrees spread
        this.shoot(angle - spreadAngle, startRadius, false, weapon);
        this.shoot(angle, startRadius, false, weapon);
        this.shoot(angle + spreadAngle, startRadius, false, weapon);
    }

    shoot(angle, startRadius, isEnemy = false, weapon = null) {
        const weaponConfig = weapon || {
            bulletSpeed: this.speed,
            bulletSize: 0.5,
            damage: 1
        };

        const material = isEnemy ? this.enemyMaterial : this.material;
        const size = weaponConfig.bulletSize || 0.5;

        const mesh = new THREE.Mesh(this.baseGeometry, material);
        mesh.scale.set(size, size, size); // Scale based on config

        // Set initial position
        const pos = polarToCartesian(startRadius, angle);
        mesh.position.set(pos.x, pos.y, 0);

        // Rotate to face outward (or inward for enemy?)
        // For now, just visual rotation
        mesh.rotation.z = angle - Math.PI / 2;

        this.scene.add(mesh);

        this.bullets.push({
            mesh,
            angle,
            radius: startRadius,
            isEnemy,
            velocity: isEnemy ? -15 : (weaponConfig.bulletSpeed || this.speed),
            damage: weaponConfig.damage || 1
            // No geometry to dispose
        });
    }

    update(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];

            // Move bullet
            if (bullet.velocity && bullet.velocity instanceof THREE.Vector3) {
                // Homing missile logic
                if (bullet.isHoming && this.player) {
                    const playerPos = this.player.getPosition();
                    const bulletPos = bullet.mesh.position;

                    // Calculate direction to player
                    const toPlayer = new THREE.Vector3().subVectors(
                        new THREE.Vector3(playerPos.x, playerPos.y, 0),
                        bulletPos
                    ).normalize();

                    // Current velocity direction
                    const currentDir = bullet.velocity.clone().normalize();

                    // Smoothly interpolate toward player
                    const turnRate = bullet.homingStrength * dt;
                    const newDir = new THREE.Vector3().lerpVectors(currentDir, toPlayer, turnRate).normalize();

                    // Update velocity direction while maintaining speed
                    const speed = bullet.velocity.length();
                    bullet.velocity.copy(newDir.multiplyScalar(speed));

                    // Update rotation to face direction
                    const angle = Math.atan2(newDir.y, newDir.x);
                    bullet.mesh.rotation.z = angle - Math.PI / 2;
                }

                bullet.mesh.position.addScaledVector(bullet.velocity, dt);
                bullet.life -= dt;
                if (bullet.life <= 0) {
                    this.scene.remove(bullet.mesh);
                    // Geometry is shared, do not dispose
                    this.bullets.splice(i, 1);
                    continue;
                }
            } else {
                if (bullet.isEnemy) {
                    bullet.radius += bullet.velocity * dt; // Velocity is negative for inward
                } else {
                    bullet.radius += bullet.velocity * dt;
                }

                // Update position
                const pos = polarToCartesian(bullet.radius, bullet.angle);
                bullet.mesh.position.set(pos.x, pos.y, 0);

                // Remove if out of bounds or hit center
                if (bullet.radius > this.maxRadius || bullet.radius < 0) {
                    this.scene.remove(bullet.mesh);
                    // Geometry is shared, do not dispose
                    this.bullets.splice(i, 1);
                }
            }
        }
    }

    clear() {
        for (const bullet of this.bullets) {
            this.scene.remove(bullet.mesh);
            // Geometry is shared, do not dispose
        }
        this.bullets = [];
    }
}
