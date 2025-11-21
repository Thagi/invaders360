import * as THREE from 'three';

export class BackgroundManager {
    constructor(scene) {
        this.scene = scene;
        this.stars = [];
        this.nebulae = [];
        this.meteors = [];

        this.bossMode = false;
        this.bossPulse = 0;

        this.createStarfield();
        this.createNebula();
    }

    createStarfield() {
        // Create 3 layers of stars with different speeds
        for (let layer = 0; layer < 3; layer++) {
            const starCount = 200 - layer * 50;
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];

            for (let i = 0; i < starCount; i++) {
                // Random position in a circle
                const angle = Math.random() * Math.PI * 2;
                const radius = 30 + Math.random() * 20;

                positions.push(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius,
                    -10 - layer * 5 // Different depths
                );

                // Slight color variation (white to blue-white)
                const brightness = 0.7 + Math.random() * 0.3;
                colors.push(brightness, brightness, 1.0);
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            const material = new THREE.PointsMaterial({
                size: 0.3 + layer * 0.1,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });

            const starField = new THREE.Points(geometry, material);
            starField.userData.layer = layer;
            starField.userData.rotationSpeed = 0.01 + layer * 0.005;

            this.scene.add(starField);
            this.stars.push(starField);
        }
    }

    createNebula() {
        // Create nebula clouds using sprite textures
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Create gradient
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(100, 50, 150, 0.3)');
        gradient.addColorStop(0.5, 'rgba(50, 100, 200, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);

        const texture = new THREE.CanvasTexture(canvas);

        // Create several nebula sprites
        for (let i = 0; i < 5; i++) {
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.3,
                blending: THREE.AdditiveBlending
            });

            const sprite = new THREE.Sprite(material);
            const angle = (i / 5) * Math.PI * 2;
            const radius = 25 + Math.random() * 15;

            sprite.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                -15
            );
            sprite.scale.set(20, 20, 1);
            sprite.userData.rotationSpeed = 0.001 + Math.random() * 0.002;
            sprite.userData.angle = angle;
            sprite.userData.radius = radius;

            this.scene.add(sprite);
            this.nebulae.push(sprite);
        }
    }

    spawnMeteor() {
        // Occasionally spawn a meteor that streaks across
        if (Math.random() > 0.99 && this.meteors.length < 3) {
            const geometry = new THREE.BufferGeometry();
            const positions = [];

            // Simple line for meteor trail
            for (let i = 0; i < 10; i++) {
                positions.push(0, 0, 0);
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

            const material = new THREE.LineBasicMaterial({
                color: 0xffffaa,
                transparent: true,
                opacity: 0.8,
                linewidth: 2
            });

            const meteor = new THREE.Line(geometry, material);

            // Random start position
            const angle = Math.random() * Math.PI * 2;
            const startRadius = 50;
            meteor.position.set(
                Math.cos(angle) * startRadius,
                Math.sin(angle) * startRadius,
                -5
            );

            // Direction towards opposite side (crossing the screen)
            const targetAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
            meteor.userData.velocity = new THREE.Vector3(
                Math.cos(targetAngle) * 0.5,
                Math.sin(targetAngle) * 0.5,
                0
            );
            meteor.userData.lifetime = 0;
            meteor.userData.maxLifetime = 3.0;

            this.scene.add(meteor);
            this.meteors.push(meteor);
        }
    }

    update(dt) {
        // Rotate star layers
        this.stars.forEach(starField => {
            starField.rotation.z += starField.userData.rotationSpeed * dt;
        });

        // Slowly rotate nebulae
        this.nebulae.forEach((nebula, index) => {
            nebula.userData.angle += nebula.userData.rotationSpeed * dt;
            nebula.position.x = Math.cos(nebula.userData.angle) * nebula.userData.radius;
            nebula.position.y = Math.sin(nebula.userData.angle) * nebula.userData.radius;
        });

        // Update meteors
        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const meteor = this.meteors[i];
            meteor.userData.lifetime += dt;

            // Move meteor
            meteor.position.add(meteor.userData.velocity);

            // Update trail
            const positions = meteor.geometry.attributes.position.array;
            for (let j = positions.length - 3; j >= 3; j -= 3) {
                positions[j] = positions[j - 3];
                positions[j + 1] = positions[j - 2];
                positions[j + 2] = positions[j - 1];
            }
            positions[0] = 0;
            positions[1] = 0;
            positions[2] = 0;
            meteor.geometry.attributes.position.needsUpdate = true;

            // Fade out and remove
            meteor.material.opacity = 1.0 - (meteor.userData.lifetime / meteor.userData.maxLifetime);

            if (meteor.userData.lifetime > meteor.userData.maxLifetime) {
                this.scene.remove(meteor);
                meteor.geometry.dispose();
                meteor.material.dispose();
                this.meteors.splice(i, 1);
            }
        }

        // Boss mode pulsing
        if (this.bossMode) {
            this.bossPulse += dt * 2;
            const intensity = (Math.sin(this.bossPulse) + 1) * 0.5;

            // Tint background red
            this.scene.fog = new THREE.Fog(0x330000, 30, 100);

            // Pulse nebula colors
            this.nebulae.forEach(nebula => {
                nebula.material.opacity = 0.2 + intensity * 0.2;
            });
        } else {
            this.scene.fog = null;
            this.nebulae.forEach(nebula => {
                nebula.material.opacity = 0.3;
            });
        }

        // Spawn meteors occasionally
        this.spawnMeteor();
    }

    setBossMode(active) {
        this.bossMode = active;
        if (active) {
            this.bossPulse = 0;
        }
    }

    createWarpEffect(callback) {
        // Wave transition effect
        const duration = 1.0;
        let elapsed = 0;

        const warpInterval = setInterval(() => {
            elapsed += 0.016; // ~60fps
            const progress = elapsed / duration;

            if (progress >= 1.0) {
                clearInterval(warpInterval);
                if (callback) callback();
                return;
            }

            // Speed up stars during warp
            this.stars.forEach(starField => {
                starField.rotation.z += 0.1 * (1.0 - progress);
            });

            // Distort nebulae
            this.nebulae.forEach(nebula => {
                nebula.scale.set(
                    20 * (1 + progress * 0.5),
                    20 * (1 + progress * 0.5),
                    1
                );
            });
        }, 16);

        // Reset after warp
        setTimeout(() => {
            this.nebulae.forEach(nebula => {
                nebula.scale.set(20, 20, 1);
            });
        }, duration * 1000);
    }

    destroy() {
        // Clean up all background elements
        this.stars.forEach(star => {
            this.scene.remove(star);
            star.geometry.dispose();
            star.material.dispose();
        });

        this.nebulae.forEach(nebula => {
            this.scene.remove(nebula);
            nebula.material.map.dispose();
            nebula.material.dispose();
        });

        this.meteors.forEach(meteor => {
            this.scene.remove(meteor);
            meteor.geometry.dispose();
            meteor.material.dispose();
        });

        this.stars = [];
        this.nebulae = [];
        this.meteors = [];
    }
}
