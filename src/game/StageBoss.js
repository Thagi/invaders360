import * as THREE from 'three';
import { polarToCartesian } from '../utils/math.js';

export class StageBoss {
    constructor(scene, bulletManager, waveNumber) {
        this.scene = scene;
        this.bulletManager = bulletManager;
        this.waveNumber = waveNumber;

        // Stats scale with wave number
        this.maxHp = 30 + (waveNumber * 5);
        this.hp = this.maxHp;
        this.score = 2000 + (waveNumber * 500);

        // Position and movement
        this.angle = Math.random() * Math.PI * 2;
        this.radius = 30;
        this.orbitSpeed = 0.8;
        this.orbitDirection = 1;

        // Phase system
        this.phase = 1;
        this.phaseThresholds = [0.66, 0.33]; // Phase 2 at 66%, Phase 3 at 33%

        // Attack timers
        this.shootTimer = 0;
        this.spawnTimer = 0;

        // Create mesh
        const geometry = new THREE.BoxGeometry(8, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffd700, // Gold
            wireframe: true
        });
        this.mesh = new THREE.Mesh(geometry, material);

        const pos = polarToCartesian(this.radius, this.angle);
        this.mesh.position.set(pos.x, pos.y, 0);
        this.scene.add(this.mesh);

        console.log(`Stage Boss spawned! HP: ${this.maxHp}, Wave: ${waveNumber}`);
    }

    update(dt, player) {
        // Update phase based on HP
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent <= this.phaseThresholds[1] && this.phase < 3) {
            this.enterPhase(3);
        } else if (hpPercent <= this.phaseThresholds[0] && this.phase < 2) {
            this.enterPhase(2);
        }

        // Phase-specific behavior
        this.updatePhase(dt, player);

        // Visual rotation
        this.mesh.rotation.x += dt * 2;
        this.mesh.rotation.y += dt * 1.5;

        // Flash in phase 3
        if (this.phase === 3) {
            const flashSpeed = 5;
            const flash = Math.sin(Date.now() / 100 * flashSpeed) * 0.5 + 0.5;
            this.mesh.material.color.setHex(0xff0000 + Math.floor(flash * 0xd700));
        }
    }

    enterPhase(newPhase) {
        this.phase = newPhase;
        console.log(`Boss entered Phase ${newPhase}!`);

        // Update stats based on phase
        if (newPhase === 2) {
            this.radius = 25;
            this.orbitSpeed = 1.2;
        } else if (newPhase === 3) {
            this.radius = 20;
            this.orbitSpeed = 1.8;
            this.mesh.material.color.setHex(0xff0000);
        }
    }

    updatePhase(dt, player) {
        // Movement - orbit
        this.angle += this.orbitSpeed * this.orbitDirection * dt;
        const pos = polarToCartesian(this.radius, this.angle);
        this.mesh.position.set(pos.x, pos.y, 0);

        if (!player) return;

        // Shooting attack
        this.shootTimer += dt;
        const shootInterval = this.getShootInterval();

        if (this.shootTimer >= shootInterval) {
            this.shootAttack(player);
            this.shootTimer = 0;
        }

        // Enemy spawning (Phase 2 and 3)
        if (this.phase >= 2) {
            this.spawnTimer += dt;
            const spawnInterval = this.phase === 2 ? 5.0 : 4.0;

            if (this.spawnTimer >= spawnInterval) {
                this.spawnEnemies();
                this.spawnTimer = 0;
            }
        }
    }

    getShootInterval() {
        if (this.phase === 1) return 2.0;
        if (this.phase === 2) return 1.5;
        return 1.0; // Phase 3
    }

    shootAttack(player) {
        const playerPos = player.getPosition();

        if (this.phase === 1) {
            // 3-bullet spread
            this.shootSpread(playerPos, 3, Math.PI / 8);
        } else if (this.phase === 2) {
            // 5-bullet spread
            this.shootSpread(playerPos, 5, Math.PI / 6);
        } else {
            // Phase 3: 8-bullet circular pattern
            this.shootCircular(8);
        }
    }

    shootSpread(targetPos, count, spreadAngle) {
        const centerAngle = Math.atan2(
            targetPos.y - this.mesh.position.y,
            targetPos.x - this.mesh.position.x
        );

        const startAngle = centerAngle - (spreadAngle * (count - 1) / 2);

        for (let i = 0; i < count; i++) {
            const angle = startAngle + (spreadAngle * i);
            const direction = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
            const targetPos = new THREE.Vector3().addVectors(
                this.mesh.position,
                direction.multiplyScalar(100)
            );

            this.bulletManager.shootAt(this.mesh.position, targetPos);
        }
    }

    shootCircular(count) {
        const angleStep = (Math.PI * 2) / count;

        for (let i = 0; i < count; i++) {
            const angle = angleStep * i;
            const direction = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
            const targetPos = new THREE.Vector3().addVectors(
                this.mesh.position,
                direction.multiplyScalar(100)
            );

            this.bulletManager.shootAt(this.mesh.position, targetPos);
        }
    }

    spawnEnemies() {
        // Return spawn request for enemy manager to handle
        const count = this.phase === 2 ? 2 : 3;
        const type = this.phase === 3 ? 'speed' : 'normal';

        return { count, type, position: this.mesh.position };
    }

    takeDamage(damage) {
        this.hp -= damage;
        return this.hp <= 0;
    }

    getHPPercent() {
        return this.hp / this.maxHp;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}
