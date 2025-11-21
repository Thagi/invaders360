import * as THREE from 'three';
import { polarToCartesian } from '../utils/math.js';

export class ObstacleManager {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.spawnRadius = 40;
        this.orbitSpeed = 0.2;
        this.approachSpeed = 0.3;

        // Create reusable geometries
        this.geometries = [
            new THREE.IcosahedronGeometry(1, 0),
            new THREE.DodecahedronGeometry(1, 0),
            new THREE.OctahedronGeometry(1, 0)
        ];
    }

    spawnWave(count = 8) {
        // Spawn a wave of asteroids
        for (let i = 0; i < count; i++) {
            this.spawn();
        }
    }

    spawn() {
        // Random geometry
        const geometry = this.geometries[Math.floor(Math.random() * this.geometries.length)];

        // Random size (1-3)
        const size = 1 + Math.random() * 2;

        // Gray material
        const material = new THREE.MeshBasicMaterial({
            color: 0x888888,
            wireframe: true
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Random spawn position
        const angle = Math.random() * Math.PI * 2;
        const pos = polarToCartesian(this.spawnRadius, angle);
        mesh.position.set(pos.x, pos.y, 0);
        mesh.scale.set(size, size, size);

        this.scene.add(mesh);

        const obstacle = {
            mesh,
            angle,
            radius: this.spawnRadius,
            orbitDirection: Math.random() > 0.5 ? 1 : -1,
            size,
            hp: Math.ceil(size * 2), // Larger = more HP
            rotationSpeed: {
                x: (Math.random() - 0.5) * 0.5,
                y: (Math.random() - 0.5) * 0.5,
                z: (Math.random() - 0.5) * 0.5
            }
        };

        this.obstacles.push(obstacle);
    }

    update(dt) {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];

            // Move inward
            obstacle.radius -= this.approachSpeed * dt;

            // Orbit
            obstacle.angle += this.orbitSpeed * obstacle.orbitDirection * dt;

            // Update position
            const pos = polarToCartesian(obstacle.radius, obstacle.angle);
            obstacle.mesh.position.set(pos.x, pos.y, 0);

            // Rotate
            obstacle.mesh.rotation.x += obstacle.rotationSpeed.x * dt;
            obstacle.mesh.rotation.y += obstacle.rotationSpeed.y * dt;
            obstacle.mesh.rotation.z += obstacle.rotationSpeed.z * dt;

            // Remove if too close to center
            if (obstacle.radius < 2) {
                this.scene.remove(obstacle.mesh);
                obstacle.mesh.material.dispose();
                this.obstacles.splice(i, 1);
            }
        }
    }

    hit(obstacle, damage = 1) {
        obstacle.hp -= damage;

        if (obstacle.hp <= 0) {
            return this.destroy(obstacle);
        }

        // Flash effect
        obstacle.mesh.material.color.setHex(0xffffff);
        setTimeout(() => {
            if (obstacle.mesh.material) {
                obstacle.mesh.material.color.setHex(0x888888);
            }
        }, 50);

        return false;
    }

    destroy(obstacle) {
        // Create debris particles (smaller pieces)
        const debrisCount = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < debrisCount; i++) {
            const debrisGeometry = new THREE.TetrahedronGeometry(obstacle.size * 0.3);
            const debrisMaterial = new THREE.MeshBasicMaterial({
                color: 0x666666,
                wireframe: true
            });
            const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);

            debris.position.copy(obstacle.mesh.position);

            // Random velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            debris.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                0
            );
            debris.userData.lifetime = 0;
            debris.userData.maxLifetime = 1.0;
            debris.userData.rotationSpeed = {
                x: (Math.random() - 0.5) * 5,
                y: (Math.random() - 0.5) * 5,
                z: (Math.random() - 0.5) * 5
            };

            this.scene.add(debris);

            // Animate debris
            const animateDebris = () => {
                debris.userData.lifetime += 0.016;

                if (debris.userData.lifetime >= debris.userData.maxLifetime) {
                    this.scene.remove(debris);
                    debris.geometry.dispose();
                    debris.material.dispose();
                    return;
                }

                debris.position.add(debris.userData.velocity.clone().multiplyScalar(0.016));
                debris.rotation.x += debris.userData.rotationSpeed.x * 0.016;
                debris.rotation.y += debris.userData.rotationSpeed.y * 0.016;
                debris.rotation.z += debris.userData.rotationSpeed.z * 0.016;

                debris.material.opacity = 1.0 - (debris.userData.lifetime / debris.userData.maxLifetime);

                requestAnimationFrame(animateDebris);
            };
            animateDebris();
        }

        // Remove obstacle
        const index = this.obstacles.indexOf(obstacle);
        if (index > -1) {
            this.scene.remove(obstacle.mesh);
            obstacle.mesh.material.dispose();
            this.obstacles.splice(index, 1);
        }

        return true;
    }

    checkCollision(position, radius = 1) {
        // Check if position collides with any obstacle
        for (const obstacle of this.obstacles) {
            const dist = obstacle.mesh.position.distanceTo(position);
            if (dist < obstacle.size + radius) {
                return obstacle;
            }
        }
        return null;
    }

    clear() {
        for (const obstacle of this.obstacles) {
            this.scene.remove(obstacle.mesh);
            obstacle.mesh.material.dispose();
        }
        this.obstacles = [];
    }
}
