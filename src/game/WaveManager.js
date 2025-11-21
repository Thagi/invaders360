import * as THREE from 'three';

export class WaveManager {
    constructor(enemyManager) {
        this.enemyManager = enemyManager;
        this.currentWave = 0;
        this.enemiesKilled = 0;
        this.enemiesPerWave = 10; // Base number
        this.waveActive = false;
        this.waveTransitionTime = 0;
        this.transitionDuration = 3.0; // 3 seconds between waves
        this.inTransition = false;
        this.isBossWave = false;

        // Wave configuration
        this.baseSpawnRate = 4.0;
        this.baseApproachSpeed = 1.0;
        this.baseBossInterval = 15.0;

        this.justCompleted = false;
    }

    startNextWave() {
        this.currentWave++;
        this.enemiesKilled = 0;
        this.waveActive = true;
        this.inTransition = false;

        // Check if this is a boss wave (every 5 waves)
        this.isBossWave = (this.currentWave % 5 === 0);

        if (this.isBossWave) {
            // Boss wave: 1 boss enemy
            this.enemiesPerWave = 1;
            console.log(`*** BOSS WAVE ${this.currentWave}! ***`);
        } else {
            // Calculate wave difficulty
            const waveMultiplier = 1 + (this.currentWave - 1) * 0.2;
            this.enemiesPerWave = Math.floor(10 + this.currentWave * 2);

            // Update enemy manager settings
            this.enemyManager.spawnRate = Math.max(0.5, this.baseSpawnRate - this.currentWave * 0.2);
            this.enemyManager.approachSpeed = this.baseApproachSpeed + this.currentWave * 0.1;
            this.enemyManager.bossSpawnRate = Math.max(8.0, this.baseBossInterval - this.currentWave * 0.5);

            console.log(`Wave ${this.currentWave} started! Enemies: ${this.enemiesPerWave}`);
        }
    }

    onEnemyKilled() {
        if (!this.waveActive) return;

        this.enemiesKilled++;

        // Check if wave is complete
        if (this.enemiesKilled >= this.enemiesPerWave) {
            this.completeWave();
        }
    }

    completeWave() {
        this.waveActive = false;
        this.inTransition = true;
        this.waveTransitionTime = 0;
        this.justCompleted = true;

        if (this.isBossWave) {
            console.log(`*** BOSS WAVE ${this.currentWave} DEFEATED! ***`);
        } else {
            console.log(`Wave ${this.currentWave} completed!`);
        }
    }

    update(dt) {
        if (this.inTransition) {
            this.waveTransitionTime += dt;
            if (this.waveTransitionTime >= this.transitionDuration) {
                this.startNextWave();
            }
        }
    }

    getWaveBonus() {
        const baseBonus = this.currentWave * 500;
        return this.isBossWave ? baseBonus * 2 : baseBonus;
    }

    isInTransition() {
        return this.inTransition;
    }

    getTransitionProgress() {
        return this.waveTransitionTime / this.transitionDuration;
    }

    isBossWaveActive() {
        return this.isBossWave && this.waveActive;
    }

    reset() {
        this.currentWave = 0;
        this.enemiesKilled = 0;
        this.waveActive = false;
        this.inTransition = false;
        this.waveTransitionTime = 0;
        this.isBossWave = false;
        this.justCompleted = false;
    }
}
