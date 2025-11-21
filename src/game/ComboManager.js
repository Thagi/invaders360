import * as THREE from 'three';

export class ComboManager {
    constructor() {
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;
        this.comboTimeout = 2.0; // 2 seconds to maintain combo
        this.lastHitTime = 0;
    }

    onEnemyHit() {
        this.combo++;
        this.comboTimer = 0;

        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }

        this.lastHitTime = Date.now();
    }

    update(dt) {
        if (this.combo > 0) {
            this.comboTimer += dt;
            if (this.comboTimer >= this.comboTimeout) {
                this.reset();
            }
        }
    }

    reset() {
        this.combo = 0;
        this.comboTimer = 0;
    }

    getMultiplier() {
        if (this.combo >= 20) return 5.0;
        if (this.combo >= 10) return 3.0;
        if (this.combo >= 5) return 2.0;
        if (this.combo >= 3) return 1.5;
        return 1.0;
    }

    getCombo() {
        return this.combo;
    }

    getMaxCombo() {
        return this.maxCombo;
    }

    getTimeRemaining() {
        return Math.max(0, this.comboTimeout - this.comboTimer);
    }

    getProgressPercent() {
        if (this.combo === 0) return 0;
        return (1 - this.comboTimer / this.comboTimeout) * 100;
    }
}
