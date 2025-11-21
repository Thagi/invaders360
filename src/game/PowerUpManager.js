import * as THREE from 'three';
import { polarToCartesian } from '../utils/math.js';

export class PowerUpManager {
    constructor(scene) {
        this.scene = scene;
        this.powerUps = [];
        this.activePowerUps = new Map(); // type -> endTime

        // Power-up types configuration
        this.types = {
            RAPID_FIRE: {
                name: 'Rapid Fire',
                color: 0xffff00,
                duration: 10.0,
                icon: '⚡'
            },
            SPREAD_SHOT: {
                name: 'Spread Shot',
                color: 0x00ffff,
                duration: 10.0,
                icon: '◈'
            },
            SHIELD: {
                name: 'Shield',
                color: 0x00ff00,
                duration: Infinity, // One-time use
                icon: '🛡'
            },
            SPEED_BOOST: {
                name: 'Speed Boost',
                color: 0xff00ff,
                duration: 8.0,
                icon: '➤'
            },
            MULTIPLIER: {
                name: '2x Score',
                color: 0xffa500,
                duration: 15.0,
                icon: '×2'
            }
        };

        this.spawnChance = 0.2; // 20% chance on enemy death
        this.orbitSpeed = 0.3;
        this.approachSpeed = 0.5;

        // Reusable geometry
        this.geometry = new THREE.OctahedronGeometry(1, 0);
    }

    trySpawn(position) {
        if (Math.random() > this.spawnChance) return;

        // Random power-up type
        const typeKeys = Object.keys(this.types);
        const randomType = typeKeys[Math.floor(Math.random() * typeKeys.length)];

        this.spawn(position, randomType);
    }

    spawn(position, type) {
        const config = this.types[type];
        const material = new THREE.MeshBasicMaterial({
            color: config.color,
            wireframe: true
        });
        const mesh = new THREE.Mesh(this.geometry, material);

        // Convert cartesian to polar
        const angle = Math.atan2(position.y, position.x);
        const radius = Math.sqrt(position.x * position.x + position.y * position.y);

        mesh.position.copy(position);

        this.scene.add(mesh);

        this.powerUps.push({
            mesh,
            type,
            angle,
            radius,
            orbitDirection: Math.random() > 0.5 ? 1 : -1
        });
    }

    collect(type) {
        const config = this.types[type];
        const endTime = Date.now() + config.duration * 1000;

        if (type === 'SHIELD') {
            // Shield is one-time, just mark as active
            this.activePowerUps.set(type, endTime);
        } else {
            this.activePowerUps.set(type, endTime);
        }

        console.log(`Collected ${config.name}!`);
    }

    consumeShield() {
        if (this.hasShield()) {
            this.activePowerUps.delete('SHIELD');
            console.log('Shield absorbed damage!');
            return true;
        }
        return false;
    }

    update(dt, playerPos) {
        const now = Date.now();

        // Update active power-ups (remove expired)
        for (const [type, endTime] of this.activePowerUps.entries()) {
            if (endTime !== Infinity && now >= endTime) {
                this.activePowerUps.delete(type);
                console.log(`${this.types[type].name} expired`);
            }
        }

        // Update power-up positions
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];

            // Move inward slowly
            powerUp.radius -= this.approachSpeed * dt;

            // Orbit
            powerUp.angle += this.orbitSpeed * powerUp.orbitDirection * dt;

            // Update position
            const pos = polarToCartesian(powerUp.radius, powerUp.angle);
            powerUp.mesh.position.set(pos.x, pos.y, 0);

            // Rotate for visual effect
            powerUp.mesh.rotation.x += dt * 2;
            powerUp.mesh.rotation.y += dt * 3;

            // Check collection
            if (playerPos && powerUp.mesh.position.distanceTo(playerPos) < 2) {
                this.collect(powerUp.type);
                this.scene.remove(powerUp.mesh);
                this.powerUps.splice(i, 1);
                continue;
            }

            // Remove if too close to center
            if (powerUp.radius < 2) {
                this.scene.remove(powerUp.mesh);
                this.powerUps.splice(i, 1);
            }
        }
    }

    hasRapidFire() {
        return this.activePowerUps.has('RAPID_FIRE');
    }

    hasSpreadShot() {
        return this.activePowerUps.has('SPREAD_SHOT');
    }

    hasShield() {
        return this.activePowerUps.has('SHIELD');
    }

    hasSpeedBoost() {
        return this.activePowerUps.has('SPEED_BOOST');
    }

    hasMultiplier() {
        return this.activePowerUps.has('MULTIPLIER');
    }

    getActivePowerUps() {
        return Array.from(this.activePowerUps.entries()).map(([type, endTime]) => ({
            type,
            config: this.types[type],
            timeRemaining: endTime === Infinity ? Infinity : Math.max(0, (endTime - Date.now()) / 1000)
        }));
    }

    clear() {
        for (const powerUp of this.powerUps) {
            this.scene.remove(powerUp.mesh);
        }
        this.powerUps = [];
        this.activePowerUps.clear();
    }
}
