import * as THREE from 'three';

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];

        // Reuse geometry
        this.geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([0, 0, 0]);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        // Base material
        this.baseMaterial = new THREE.PointsMaterial({
            color: 0xffaa00,
            size: 2,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }

    createExplosion(position, color = 0xffaa00, count = 15) {
        const material = this.baseMaterial.clone();
        material.color.setHex(color);

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Points(this.geometry, material);
            mesh.position.copy(position);

            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 15 + 5;
            const life = 0.5 + Math.random() * 0.5;

            this.scene.add(mesh);

            this.particles.push({
                mesh,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    (Math.random() - 0.5) * 10 // Add some Z spread
                ),
                life: life,
                maxLife: life,
                scale: 1.0
            });
        }
    }

    // Alias for backward compatibility
    explode(position, count, color) {
        this.createExplosion(position, color, count);
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.life -= dt;

            // Move
            p.mesh.position.addScaledVector(p.velocity, dt);

            // Drag/Gravity effect
            p.velocity.multiplyScalar(0.95);

            // Update visual
            const lifeRatio = p.life / p.maxLife;
            p.mesh.material.opacity = lifeRatio;
            p.mesh.material.size = 2 * lifeRatio; // Shrink over time

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    clear() {
        for (const p of this.particles) {
            this.scene.remove(p.mesh);
            p.mesh.material.dispose();
        }
        this.particles = [];
    }
}
