import * as THREE from 'three';

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];

        // Reuse geometry and material
        this.geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([0, 0, 0]);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        this.material = new THREE.PointsMaterial({
            color: 0xffaa00,
            size: 2,
            transparent: true,
            opacity: 1
        });
    }

    explode(position, count = 10, color = 0xffaa00) {
        const material = this.material.clone();
        material.color.setHex(color);

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Points(this.geometry, material);
            mesh.position.copy(position);

            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 10 + 5;

            this.scene.add(mesh);

            this.particles.push({
                mesh,
                velocity: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0),
                life: 1.0 // Seconds
            });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.life -= dt;
            p.mesh.position.addScaledVector(p.velocity, dt);
            p.mesh.material.opacity = p.life;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.material.dispose(); // Dispose cloned material
                this.particles.splice(i, 1);
            }
        }
    }
}
