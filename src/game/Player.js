import * as THREE from 'three';

export class Player {
    constructor(scene, bulletManager) {
        this.scene = scene;
        this.bulletManager = bulletManager;
        this.angle = 0; // Radians, 0 is right
        this.rotationSpeed = 3.5; // Radians per second
        this.radius = 8; // Distance from center (now dynamic)
        this.radialSpeed = 8; // Units per second for forward/backward movement
        this.minRadius = 3; // Minimum distance from center
        this.maxRadius = 8; // Maximum distance from center (game over boundary)

        // Weapon system
        this.currentWeapon = 'STANDARD';
        this.weapons = {
            STANDARD: {
                name: 'Standard',
                cooldown: 200,
                damage: 1,
                bulletSpeed: 20,
                bulletSize: 0.5
            },
            MACHINE_GUN: {
                name: 'Machine Gun',
                cooldown: 100,
                damage: 0.7,
                bulletSpeed: 25,
                bulletSize: 0.3
            },
            CANNON: {
                name: 'Cannon',
                cooldown: 500,
                damage: 3,
                bulletSpeed: 15,
                bulletSize: 1.2
            }
        };

        // Invulnerability
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        this.invulnerabilityDuration = 2.0; // 2 seconds
        this.flashInterval = 0.1;
        this.flashTimer = 0;

        // Create Player Mesh
        // Simple triangle/arrow shape
        const geometry = new THREE.ConeGeometry(1, 3, 3);
        geometry.rotateX(Math.PI / 2); // Point along Z initially? No, point along X.
        // Cone points up (Y) by default. Rotate Z to point right (X).
        geometry.rotateZ(-Math.PI / 2);

        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        this.mesh = new THREE.Mesh(geometry, material);

        // Add a pivot group to handle rotation easily
        this.pivot = new THREE.Group();
        this.pivot.add(this.mesh);
        this.mesh.position.x = this.radius; // Offset from center

        this.scene.add(this.pivot);

        // Input state
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            shoot: false,
            bomb: false
        };

        this.setupInput();
        this.lastShootTime = 0;
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'ArrowLeft': this.keys.left = true; break;
                case 'ArrowRight': this.keys.right = true; break;
                case 'ArrowUp': this.keys.up = true; break;
                case 'ArrowDown': this.keys.down = true; break;
                case 'Space': this.keys.shoot = true; break;
                case 'Digit1': this.currentWeapon = 'STANDARD'; break;
                case 'Digit2': this.currentWeapon = 'MACHINE_GUN'; break;
                case 'Digit3': this.currentWeapon = 'CANNON'; break;
                case 'KeyB': this.keys.bomb = true; break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'ArrowLeft': this.keys.left = false; break;
                case 'ArrowRight': this.keys.right = false; break;
                case 'ArrowUp': this.keys.up = false; break;
                case 'ArrowDown': this.keys.down = false; break;
                case 'Space': this.keys.shoot = false; break;
                case 'KeyB': this.keys.bomb = false; break;
            }
        });
    }

    update(dt, powerUpManager) {
        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerabilityTime += dt;
            this.flashTimer += dt;

            if (this.flashTimer >= this.flashInterval) {
                this.mesh.visible = !this.mesh.visible;
                this.flashTimer = 0;
            }

            if (this.invulnerabilityTime >= this.invulnerabilityDuration) {
                this.invulnerable = false;
                this.mesh.visible = true;
            }
        }

        // Apply speed boost if active
        const speedMultiplier = powerUpManager && powerUpManager.hasSpeedBoost() ? 1.5 : 1.0;

        // Rotation (left/right)
        if (this.keys.left) {
            this.angle += this.rotationSpeed * speedMultiplier * dt;
        }
        if (this.keys.right) {
            this.angle -= this.rotationSpeed * speedMultiplier * dt;
        }

        // Radial movement (forward/backward)
        if (this.keys.up) {
            this.radius += this.radialSpeed * speedMultiplier * dt;
        }
        if (this.keys.down) {
            this.radius -= this.radialSpeed * speedMultiplier * dt;
        }

        // Clamp radius to valid range
        this.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.radius));

        // Update mesh position based on current radius
        this.mesh.position.x = this.radius;

        // Shooting
        if (this.keys.shoot) {
            const weapon = this.weapons[this.currentWeapon];
            let cooldown = weapon.cooldown;

            // Apply rapid fire power-up
            if (powerUpManager && powerUpManager.hasRapidFire()) {
                cooldown *= 0.5; // 2x fire rate
            }

            if (!this.lastShootTime || Date.now() - this.lastShootTime > cooldown) {
                // Check for spread shot
                if (powerUpManager && powerUpManager.hasSpreadShot()) {
                    this.bulletManager.shootSpread(this.angle, this.radius, weapon);
                } else {
                    this.bulletManager.shoot(this.angle, this.radius, false, weapon);
                }
                this.lastShootTime = Date.now();
            }
        }

        // Update rotation
        this.pivot.rotation.z = this.angle;
    }

    makeInvulnerable() {
        this.invulnerable = true;
        this.invulnerabilityTime = 0;
        this.flashTimer = 0;
    }

    isInvulnerable() {
        return this.invulnerable;
    }

    getPosition() {
        return new THREE.Vector3(
            this.radius * Math.cos(this.angle),
            this.radius * Math.sin(this.angle),
            0
        );
    }

    reset() {
        // Reset position and rotation
        this.angle = 0;
        this.radius = 8;
        this.mesh.position.x = this.radius;
        this.pivot.rotation.z = 0;

        // Reset invulnerability
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        this.mesh.visible = true;

        // Reset weapon
        this.currentWeapon = 'STANDARD';
    }
}
