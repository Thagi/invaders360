export class UpgradeManager {
    constructor(player, game) {
        this.player = player;
        this.game = game;
        this.activeUpgrades = {
            fireRate: 0,
            moveSpeed: 0,
            bulletSize: 0,
            scoreMultiplier: 0,
            bombCap: 0
        };

        this.upgradeTypes = [
            {
                id: 'fireRate',
                name: 'Rapid Fire',
                description: 'Increases fire rate by 15%',
                icon: '⚡',
                color: '#ffff00',
                weight: 1.0,
                apply: () => {
                    this.activeUpgrades.fireRate++;
                    this.player.fireRateMultiplier = 1.0 + (this.activeUpgrades.fireRate * 0.15);
                }
            },
            {
                id: 'moveSpeed',
                name: 'Thrusters',
                description: 'Increases movement speed by 10%',
                icon: '🚀',
                color: '#00ffff',
                weight: 1.0,
                apply: () => {
                    this.activeUpgrades.moveSpeed++;
                    this.player.moveSpeedMultiplier = 1.0 + (this.activeUpgrades.moveSpeed * 0.10);
                }
            },
            {
                id: 'bulletSize',
                name: 'Power Shot',
                description: 'Increases bullet size and damage',
                icon: '💥',
                color: '#ff0000',
                weight: 0.8,
                apply: () => {
                    this.activeUpgrades.bulletSize++;
                    this.player.bulletSizeMultiplier = 1.0 + (this.activeUpgrades.bulletSize * 0.2);
                    this.player.damageMultiplier = 1.0 + (this.activeUpgrades.bulletSize * 0.2);
                }
            },
            {
                id: 'maxLives',
                name: 'Hull Repair',
                description: 'Restores 1 life and increases max lives',
                icon: '❤️',
                color: '#ff00ff',
                weight: 0.5,
                apply: () => {
                    this.game.maxLives++;
                    if (this.game.lives < this.game.maxLives) {
                        this.game.lives++;
                    }
                    this.game.updateLives();
                }
            },
            {
                id: 'bombCap',
                name: 'Extra Bomb',
                description: 'Increases max bomb capacity by 1',
                icon: '💣',
                color: '#ffaa00',
                weight: 0.6,
                apply: () => {
                    this.activeUpgrades.bombCap++;
                    this.game.specialAbility.maxCharges++;
                    this.game.specialAbility.addCharge();
                }
            },
            {
                id: 'score',
                name: 'Score Boost',
                description: 'Increases score multiplier by 0.5x',
                icon: '⭐',
                color: '#00ff00',
                weight: 0.7,
                apply: () => {
                    this.activeUpgrades.scoreMultiplier++;
                    // This needs to be handled in Game.js or ComboManager
                    if (this.game.comboManager) {
                        this.game.comboManager.baseMultiplier += 0.5;
                    }
                }
            }
        ];
    }

    getRandomUpgrades(count = 3) {
        // Weighted random selection
        const options = [];
        const available = [...this.upgradeTypes];

        for (let i = 0; i < count; i++) {
            if (available.length === 0) break;

            const totalWeight = available.reduce((sum, up) => sum + up.weight, 0);
            let random = Math.random() * totalWeight;

            for (let j = 0; j < available.length; j++) {
                random -= available[j].weight;
                if (random <= 0) {
                    options.push(available[j]);
                    available.splice(j, 1); // Prevent duplicate options in one selection
                    break;
                }
            }
        }
        return options;
    }

    applyUpgrade(upgradeId) {
        const upgrade = this.upgradeTypes.find(u => u.id === upgradeId);
        if (upgrade) {
            upgrade.apply();
            console.log(`Applied upgrade: ${upgrade.name}`);
            return true;
        }
        return false;
    }

    reset() {
        this.activeUpgrades = {
            fireRate: 0,
            moveSpeed: 0,
            bulletSize: 0,
            scoreMultiplier: 0,
            bombCap: 0
        };

        // Reset player stats
        if (this.player) {
            this.player.fireRateMultiplier = 1.0;
            this.player.moveSpeedMultiplier = 1.0;
            this.player.bulletSizeMultiplier = 1.0;
            this.player.damageMultiplier = 1.0;
        }
    }
}
