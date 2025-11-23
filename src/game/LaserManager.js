import * as THREE from 'three';

export class LaserManager {
    constructor(scene) {
        this.scene = scene;
        this.lasers = [];

        // Materials (reusable)
        this.telegraphMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.fireMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff, // Laser color
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
    }

    createLaser(sourcePosition, angle, duration = 1.0, telegraphDuration = 1.0) {
        // Calculate laser length - from source to center plus some extra
        const sourceRadius = Math.sqrt(sourcePosition.x ** 2 + sourcePosition.y ** 2);
        const laserLength = sourceRadius + 10; // Extend beyond center

        // Create geometry for this specific laser
        const beamGeometry = new THREE.BoxGeometry(1, laserLength, 1);
        beamGeometry.translate(0, laserLength / 2, 0); // Pivot at start (base of laser)

        // Visual mesh
        const mesh = new THREE.Mesh(beamGeometry, this.telegraphMaterial.clone());
        mesh.position.copy(sourcePosition);
        // Rotate to point from enemy toward center
        // angle represents the direction from center to enemy, so we need to reverse it
        mesh.rotation.z = angle + Math.PI - Math.PI / 2; // +PI to reverse, -PI/2 for geometry orientation

        mesh.scale.set(0.2, 1, 1); // Thin telegraph line
        this.scene.add(mesh);

        const laser = {
            mesh,
            sourcePosition: sourcePosition.clone(),
            angle,
            length: laserLength,
            state: 'telegraph', // telegraph -> firing -> dying
            timer: 0,
            telegraphDuration,
            duration,
            width: 2.0 // Width of damaging beam
        };

        this.lasers.push(laser);
        return laser;
    }

    update(dt, player) {
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.timer += dt;

            if (laser.state === 'telegraph') {
                // Telegraph phase: warning line
                // Flash opacity
                laser.mesh.material.opacity = 0.2 + Math.sin(laser.timer * 20) * 0.1;

                // Track source if it's moving? 
                // For now assume static source or updated externally. 
                // If we want it to track player during telegraph, we'd need to update angle.
                // Let's keep it simple: locks on at creation (or updated by enemy).

                if (laser.timer >= laser.telegraphDuration) {
                    // Switch to firing
                    laser.state = 'firing';
                    laser.timer = 0;
                    laser.mesh.material = this.fireMaterial.clone();
                    laser.mesh.scale.set(laser.width, 1, 1); // Widen beam

                    // Sound effect could go here
                }
            } else if (laser.state === 'firing') {
                // Firing phase: dealing damage
                laser.mesh.material.opacity = 0.8 + Math.random() * 0.2; // Flicker

                // Collision detection with player
                if (player && !player.isInvulnerable) {
                    if (this.checkCollision(laser, player)) {
                        player.takeDamage(1);
                    }
                }

                if (laser.timer >= laser.duration) {
                    // End laser
                    this.removeLaser(i);
                }
            }
        }
    }

    checkCollision(laser, player) {
        // Simple line-circle collision
        // Laser is a line from source extending laser.length units toward center

        const playerPos = player.getPosition();
        const laserStart = laser.sourcePosition;

        // Laser direction: from enemy toward center (reverse of angle)
        const laserDirX = -Math.cos(laser.angle);
        const laserDirY = -Math.sin(laser.angle);

        // Vector from laser start to player
        const dx = playerPos.x - laserStart.x;
        const dy = playerPos.y - laserStart.y;

        // Project player vector onto laser direction
        const t = dx * laserDirX + dy * laserDirY;

        // Closest point on line segment (0 to laser.length)
        if (t < 0 || t > laser.length) return false; // Beyond ends

        // Nearest point on laser
        const nearestX = laserStart.x + laserDirX * t;
        const nearestY = laserStart.y + laserDirY * t;

        const distSq = (playerPos.x - nearestX) ** 2 + (playerPos.y - nearestY) ** 2;
        const hitRadius = laser.width / 2 + 1.0; // Beam half-width + player radius

        return distSq < hitRadius * hitRadius;
    }

    removeLaser(index) {
        const laser = this.lasers[index];
        this.scene.remove(laser.mesh);
        // Each laser has its own geometry now, so dispose it
        if (laser.mesh.geometry) laser.mesh.geometry.dispose();
        // We cloned material, so dispose it
        if (laser.mesh.material) laser.mesh.material.dispose();

        this.lasers.splice(index, 1);
    }

    clear() {
        while (this.lasers.length > 0) {
            this.removeLaser(0);
        }
    }
}
