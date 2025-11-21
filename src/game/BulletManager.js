import * as THREE from 'three';
import { polarToCartesian } from '../utils/math.js';

export class BulletManager {
    constructor(scene) {
        this.scene = scene;
        this.bullets = [];
        this.speed = 20; // Units per second
        this.maxRadius = 60; // Despawn distance

        // Reuse geometry and material
        this.geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
        this.material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        this.enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Purple for enemy bullets
    }

    shootAt(startPos, targetPos) {
        const mesh = new THREE.Mesh(this.geometry, this.enemyMaterial);
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
            life: 5.0 // Seconds to live
        });
    }

    shoot(angle, startRadius, isEnemy = false) {
        const material = isEnemy ? this.enemyMaterial : this.material;
        const mesh = new THREE.Mesh(this.geometry, material);

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
            velocity: isEnemy ? -15 : this.speed // Enemy bullets move inward
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
                    this.bullets.splice(i, 1);
                    continue;
                }
            } else {
                if (bullet.isEnemy) {
                    bullet.radius += bullet.velocity * dt; // Velocity is negative for inward
                } else {
                    bullet.radius += this.speed * dt;
                }

                // Update position
                const pos = polarToCartesian(bullet.radius, bullet.angle);
                bullet.mesh.position.set(pos.x, pos.y, 0);

                // Remove if out of bounds or hit center
                if (bullet.radius > this.maxRadius || bullet.radius < 0) {
                    this.scene.remove(bullet.mesh);
                    this.bullets.splice(i, 1);
                }
            }
        }
    }
}
