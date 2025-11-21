export class SpecialAbility {
    constructor() {
        this.maxCharges = 3;
        this.currentCharges = 2; // Start with 2 bombs
        this.cooldown = 15.0; // 15 seconds
        this.cooldownTimer = 0;
        this.isOnCooldown = false;
        this.lastActivationTime = 0;
    }

    canActivate() {
        return this.currentCharges > 0 && !this.isOnCooldown;
    }

    activate() {
        if (!this.canActivate()) return false;

        this.currentCharges--;
        this.isOnCooldown = true;
        this.cooldownTimer = 0;
        this.lastActivationTime = Date.now();

        console.log(`Bomb activated! Charges remaining: ${this.currentCharges}`);
        return true;
    }

    addCharge() {
        if (this.currentCharges < this.maxCharges) {
            this.currentCharges++;
            console.log(`Bomb charge gained! Total: ${this.currentCharges}`);
        }
    }

    update(dt) {
        if (this.isOnCooldown) {
            this.cooldownTimer += dt;
            if (this.cooldownTimer >= this.cooldown) {
                this.isOnCooldown = false;
                this.cooldownTimer = 0;
            }
        }
    }

    getCooldownProgress() {
        if (!this.isOnCooldown) return 1.0;
        return this.cooldownTimer / this.cooldown;
    }

    getCooldownRemaining() {
        if (!this.isOnCooldown) return 0;
        return Math.max(0, this.cooldown - this.cooldownTimer);
    }

    getCharges() {
        return this.currentCharges;
    }

    getMaxCharges() {
        return this.maxCharges;
    }

    reset() {
        this.currentCharges = 2;
        this.isOnCooldown = false;
        this.cooldownTimer = 0;
    }
}
