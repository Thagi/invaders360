import * as THREE from 'three';

export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.music = null;
        this.musicSource = null;
        this.masterVolume = 0.7;
        this.sfxVolume = 0.5;
        this.musicVolume = 0.3;
        this.isMuted = false;

        // Initialize Audio Context on first user interaction
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('SoundManager initialized');

            // Create sound effects programmatically
            this.createSounds();
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    createSounds() {
        // These will be generated programmatically using oscillators
        this.sounds = {
            shoot: this.createShootSound.bind(this),
            explosion: this.createExplosionSound.bind(this),
            bigExplosion: this.createBigExplosionSound.bind(this),
            powerup: this.createPowerUpSound.bind(this),
            bomb: this.createBombSound.bind(this),
            damage: this.createDamageSound.bind(this),
            bossWarning: this.createBossWarningSound.bind(this),
            enemyShoot: this.createEnemyShootSound.bind(this)
        };
    }

    // Sound generation methods using Web Audio API

    createShootSound(weaponType = 'STANDARD') {
        if (!this.audioContext || this.isMuted) return;

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        if (weaponType === 'STANDARD') {
            oscillator.frequency.setValueAtTime(300, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        } else if (weaponType === 'MACHINE_GUN') {
            oscillator.frequency.setValueAtTime(400, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);
        } else if (weaponType === 'CANNON') {
            oscillator.frequency.setValueAtTime(200, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
        }

        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    }

    createExplosionSound() {
        if (!this.audioContext || this.isMuted) return;

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
    }

    createBigExplosionSound() {
        if (!this.audioContext || this.isMuted) return;

        const ctx = this.audioContext;

        // Multiple layers for bigger explosion
        for (let i = 0; i < 3; i++) {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = i === 0 ? 'sawtooth' : 'square';
            const baseFreq = 200 - i * 50;
            oscillator.frequency.setValueAtTime(baseFreq, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.5);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3000, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);

            const volume = this.sfxVolume * this.masterVolume * 0.6;
            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            oscillator.start(ctx.currentTime + i * 0.05);
            oscillator.stop(ctx.currentTime + 0.5 + i * 0.05);
        }
    }

    createPowerUpSound() {
        if (!this.audioContext || this.isMuted) return;

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
    }

    createBombSound() {
        if (!this.audioContext || this.isMuted) return;

        const ctx = this.audioContext;

        // Massive explosion sound with white noise
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // White noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const noise = ctx.createBufferSource();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        noise.buffer = buffer;
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(5000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.8, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + 0.5);
    }

    createDamageSound() {
        if (!this.audioContext || this.isMuted) return;

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.6, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
    }

    createBossWarningSound() {
        if (!this.audioContext || this.isMuted) return;

        const ctx = this.audioContext;

        // Alarm-like sound
        for (let i = 0; i < 3; i++) {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(600, ctx.currentTime + i * 0.3);

            gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.3);
            gainNode.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume * 0.4, ctx.currentTime + i * 0.3 + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.3 + 0.2);

            oscillator.start(ctx.currentTime + i * 0.3);
            oscillator.stop(ctx.currentTime + i * 0.3 + 0.2);
        }
    }

    createEnemyShootSound() {
        if (!this.audioContext || this.isMuted) return;

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(250, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.08);
    }

    // Play sound effects
    playSound(soundName, ...args) {
        if (!this.initialized) this.init();
        if (!this.audioContext || this.isMuted) return;

        const soundFunction = this.sounds[soundName];
        if (soundFunction) {
            soundFunction(...args);
        }
    }

    // BGM management
    startMusic(type = 'game') {
        if (!this.initialized) this.init();
        if (!this.audioContext || this.isMuted) return;

        // Stop current music if playing
        this.stopMusic();

        // Create simple background music using oscillators
        // This is a placeholder - in production you'd load audio files
        this.createBackgroundMusic(type);
    }

    createBackgroundMusic(type) {
        if (!this.audioContext) return;

        const ctx = this.audioContext;

        // Simple ambient drone
        const oscillator1 = ctx.createOscillator();
        const oscillator2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        oscillator1.connect(filter);
        oscillator2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        if (type === 'game') {
            oscillator1.frequency.value = 110; // A2
            oscillator2.frequency.value = 165; // E3
        } else if (type === 'boss') {
            oscillator1.frequency.value = 130; // C3
            oscillator2.frequency.value = 196; // G3
        }

        oscillator1.type = 'sine';
        oscillator2.type = 'sine';

        filter.type = 'lowpass';
        filter.frequency.value = 800;

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.musicVolume * this.masterVolume * 0.15, ctx.currentTime + 1.0);

        oscillator1.start();
        oscillator2.start();

        this.musicSource = { oscillator1, oscillator2, gainNode };
    }

    stopMusic() {
        if (this.musicSource) {
            const ctx = this.audioContext;
            if (this.musicSource.gainNode) {
                this.musicSource.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            }
            setTimeout(() => {
                if (this.musicSource) {
                    this.musicSource.oscillator1?.stop();
                    this.musicSource.oscillator2?.stop();
                    this.musicSource = null;
                }
            }, 600);
        }
    }

    // Volume controls
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicSource && this.musicSource.gainNode) {
            this.musicSource.gainNode.gain.value = this.musicVolume * this.masterVolume * 0.15;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopMusic();
        } else if (this.initialized) {
            this.startMusic('game');
        }
        return this.isMuted;
    }

    getMuteStatus() {
        return this.isMuted;
    }
}
