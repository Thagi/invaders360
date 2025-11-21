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
            shoot: false
        };

        this.setupInput();
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'ArrowLeft': this.keys.left = true; break;
                case 'ArrowRight': this.keys.right = true; break;
                case 'ArrowUp': this.keys.up = true; break;
                case 'ArrowDown': this.keys.down = true; break;
                case 'Space': this.keys.shoot = true; break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'ArrowLeft': this.keys.left = false; break;
                case 'ArrowRight': this.keys.right = false; break;
                case 'ArrowUp': this.keys.up = false; break;
                case 'ArrowDown': this.keys.down = false; break;
                case 'Space': this.keys.shoot = false; break;
            }
        });
    }

    update(dt) {
        // Rotation (left/right)
        if (this.keys.left) {
            this.angle += this.rotationSpeed * dt;
        }
        if (this.keys.right) {
            this.angle -= this.rotationSpeed * dt;
        }

        // Radial movement (forward/backward)
        if (this.keys.up) {
            this.radius += this.radialSpeed * dt;
        }
        if (this.keys.down) {
            this.radius -= this.radialSpeed * dt;
        }

        // Clamp radius to valid range
        this.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.radius));

        // Update mesh position based on current radius
        this.mesh.position.x = this.radius;

        // Shooting
        if (this.keys.shoot) {
            // Simple cooldown or just shoot every frame? 
            // Let's add a cooldown
            if (!this.lastShootTime || Date.now() - this.lastShootTime > 200) {
                this.bulletManager.shoot(this.angle, this.radius);
                this.lastShootTime = Date.now();
            }
        }

        // Update rotation
        this.pivot.rotation.z = this.angle;
    }
}
