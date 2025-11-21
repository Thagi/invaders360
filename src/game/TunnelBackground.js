import * as THREE from 'three';

export class TunnelBackground {
    constructor(scene) {
        this.scene = scene;
        this.rings = [];
        this.shapes = []; // For the radiating shapes

        // Ring settings
        this.baseSpeed = 0.3; // Multiplier for exponential growth
        this.spawnInterval = 0.8; // Spawn new ring every 0.8 seconds
        this.spawnTimer = 0;
        this.maxScale = 60; // Increased max scale
        this.fadeOutStart = 50;

        // Shape settings (Restored from previous version)
        this.shapeSpeed = 15;
        this.maxShapeDistance = 100;

        // Create shared geometry for rings
        this.ringGeometry = this.createRingGeometry();

        // Initialize the radiating shapes system
        this.createRadiatingShapes();
    }

    createRingGeometry() {
        const innerRadius = 0.95;
        const outerRadius = 1.0;
        const segments = 64;
        return new THREE.RingGeometry(innerRadius, outerRadius, segments);
    }

    createRadiatingShapes() {
        // Restoring the "high density" but subtle look from previous version
        const shapeCount = 22; // Reduced to 1/3 of 66

        const geometries = [
            new THREE.TetrahedronGeometry(1),
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.OctahedronGeometry(1),
            new THREE.IcosahedronGeometry(1)
        ];

        const material = new THREE.MeshBasicMaterial({
            color: 0x4444ff, // Soft Blue to avoid clashing with Cyan/Yellow/Red
            transparent: true,
            opacity: 0.05, // Very subtle
            wireframe: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        for (let i = 0; i < shapeCount; i++) {
            const geom = geometries[Math.floor(Math.random() * geometries.length)];
            const mesh = new THREE.Mesh(geom, material.clone());

            // Random initial position in a sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = Math.random() * this.maxShapeDistance;

            mesh.position.setFromSphericalCoords(radius, phi, theta);

            // Store direction vector for movement (radiating outward)
            mesh.userData.direction = mesh.position.clone().normalize();

            // Random rotation
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            mesh.userData.rotSpeed = {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2
            };

            this.scene.add(mesh);
            this.shapes.push(mesh);
        }
    }

    spawnRing() {
        const material = new THREE.MeshBasicMaterial({
            color: 0x4444ff, // Soft Blue
            transparent: true,
            opacity: 0.04,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(this.ringGeometry, material);
        // Start slightly larger than player boundary (radius 8)
        // Ring geometry is radius 1, so scale 9 means radius 9
        mesh.scale.set(9, 9, 9);
        mesh.userData.scale = 9;

        this.scene.add(mesh);
        this.rings.push(mesh);
    }

    update(dt) {
        // --- Update Rings ---
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnRing();
            this.spawnTimer = 0;
        }

        for (let i = this.rings.length - 1; i >= 0; i--) {
            const ring = this.rings[i];

            // Exponential expansion for tunnel perspective
            // Speed increases as scale increases
            // Formula: speed = k * scale
            // This creates the effect of objects accelerating as they get closer/larger
            const expansionSpeed = this.baseSpeed * ring.userData.scale;

            ring.userData.scale += expansionSpeed * dt;
            ring.scale.set(ring.userData.scale, ring.userData.scale, ring.userData.scale);

            // Opacity logic
            let opacity = 0.04; // Base opacity

            // Fade in at start (scale 9 to 15)
            if (ring.userData.scale < 15) {
                opacity = 0.04 * ((ring.userData.scale - 9) / 6);
            }
            // Fade out when approaching max scale
            else if (ring.userData.scale > this.fadeOutStart) {
                const fadeProgress = (ring.userData.scale - this.fadeOutStart) / (this.maxScale - this.fadeOutStart);
                opacity = 0.04 * (1 - fadeProgress);
            }

            ring.material.opacity = Math.max(0, opacity);

            if (ring.userData.scale > this.maxScale) {
                this.scene.remove(ring);
                ring.material.dispose();
                this.rings.splice(i, 1);
            }
        }

        // --- Update Shapes ---
        this.shapes.forEach(shape => {
            // Move outward
            shape.position.addScaledVector(shape.userData.direction, this.shapeSpeed * dt);

            // Rotate
            shape.rotation.x += shape.userData.rotSpeed.x * dt;
            shape.rotation.y += shape.userData.rotSpeed.y * dt;

            // Calculate distance from center
            const distance = shape.position.length();

            // Scale based on distance (larger as it gets further)
            const scale = 0.5 + (distance / this.maxShapeDistance) * 3.0;
            shape.scale.set(scale, scale, scale);

            // Opacity fade
            let opacity = 0.1; // Very subtle
            if (distance < 20) {
                opacity = 0.1 * (distance / 20);
            } else if (distance > 80) {
                opacity = 0.1 * (1 - (distance - 80) / 20);
            }
            shape.material.opacity = opacity;

            // Reset if too far
            if (distance > this.maxShapeDistance) {
                // Reset to center with random direction
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const startRadius = Math.random() * 10;

                shape.position.setFromSphericalCoords(startRadius, phi, theta);
                shape.userData.direction = shape.position.clone().normalize();
                shape.scale.set(0.5, 0.5, 0.5);
            }
        });
    }

    setSpeed(speed) {
        this.baseSpeed = speed;
    }

    destroy() {
        this.rings.forEach(ring => {
            this.scene.remove(ring);
            ring.material.dispose();
        });
        this.shapes.forEach(shape => {
            this.scene.remove(shape);
            shape.geometry.dispose();
            shape.material.dispose();
        });
        this.rings = [];
        this.shapes = [];
        this.ringGeometry.dispose();
    }
}
