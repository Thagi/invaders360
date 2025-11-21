import * as THREE from 'three';
import { polarToCartesian } from '../utils/math.js';

export class BulletManager {
    constructor(scene) {
        this.scene = scene;
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
