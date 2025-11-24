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

        // Create background music based on type
        this.createBackgroundMusic(type);
    }

    createBackgroundMusic(type) {
        if (!this.audioContext) return;

        const ctx = this.audioContext;

        if (type === 'menu') {
            // Menu music: Calm and ambient
            this.createMenuMusic(ctx);
        } else if (type === 'game') {
            // Game music: Energetic and driving
            this.createGameMusic(ctx);
        } else if (type === 'boss') {
            // Boss music: Intense and dramatic
            this.createBossMusic(ctx);
        }
    }

    createMenuMusic(ctx) {
        // Simple arpeggio pattern - Cmaj7 (C-E-G-B)
        const notes = [261.63, 329.63, 392.00, 493.88]; // C4, E4, G4, B4
        const noteIndex = { value: 0 };

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.value = 1500;
        gain.gain.value = this.musicVolume * this.masterVolume * 0.1;

        // Play arpeggio
        const playNote = () => {
            if (!this.musicSource) return;
            osc.frequency.setValueAtTime(notes[noteIndex.value], ctx.currentTime);
            noteIndex.value = (noteIndex.value + 1) % notes.length;
            setTimeout(playNote, 400); // BPM 60
        };

        osc.start();
        playNote();

        this.musicSource = { osc, gain };
    }

    createGameMusic(ctx) {
        // Game music: Bass line + lead melody
        const bassNotes = [130.81, 146.83, 164.81, 146.83]; // C3, D3, E3, D3
        const leadNotes = [523.25, 587.33, 659.25, 587.33]; // C5, D5, E5, D5
        const noteIndex = { value: 0 };

        // Bass oscillator
        const bass = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bass.connect(bassGain);
        bassGain.connect(ctx.destination);
        bass.type = 'sawtooth';
        bassGain.gain.value = this.musicVolume * this.masterVolume * 0.12;

        // Lead oscillator
        const lead = ctx.createOscillator();
        const leadGain = ctx.createGain();
        const leadFilter = ctx.createBiquadFilter();
        lead.connect(leadFilter);
        leadFilter.connect(leadGain);
        leadGain.connect(ctx.destination);
        lead.type = 'square';
        leadFilter.type = 'lowpass';
        leadFilter.frequency.value = 2000;
        leadGain.gain.value = this.musicVolume * this.masterVolume * 0.08;

        // Play pattern
        const playPattern = () => {
            if (!this.musicSource) return;
            const idx = noteIndex.value;
            bass.frequency.setValueAtTime(bassNotes[idx], ctx.currentTime);
            lead.frequency.setValueAtTime(leadNotes[idx], ctx.currentTime);
            noteIndex.value = (noteIndex.value + 1) % bassNotes.length;
            setTimeout(playPattern, 300); // BPM 120
        };

        bass.start();
        lead.start();
        playPattern();

        this.musicSource = { bass, lead, bassGain, leadGain };
    }

    createBossMusic(ctx) {
        // Boss music: Aggressive with drums (noise)
        const drumNotes = [65.41, 73.42, 82.41]; // C2, D2, E2
        const leadNotes = [261.63, 293.66, 329.63]; // C4, D4, E4
        const noteIndex = { value: 0 };

        // Bass/drum noise
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const playDrum = () => {
            if (!this.musicSource) return;
            const noise = ctx.createBufferSource();
            const noiseGain = ctx.createGain();
            const noiseFilter = ctx.createBiquadFilter();

            noise.buffer = buffer;
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.value = 200;
            noiseGain.gain.setValueAtTime(this.musicVolume * this.masterVolume * 0.15, ctx.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

            noise.start();
            noise.stop(ctx.currentTime + 0.05);

            setTimeout(playDrum, 250); // Fast drums
        };

        // Lead melody
        const lead = ctx.createOscillator();
        const leadGain = ctx.createGain();
        lead.connect(leadGain);
        leadGain.connect(ctx.destination);
        lead.type = 'sawtooth';
        leadGain.gain.value = this.musicVolume * this.masterVolume * 0.1;

        const playLead = () => {
            if (!this.musicSource) return;
            const idx = noteIndex.value;
            lead.frequency.setValueAtTime(leadNotes[idx], ctx.currentTime);
            noteIndex.value = (noteIndex.value + 1) % leadNotes.length;
            setTimeout(playLead, 250);
        };

        lead.start();
        playDrum();
        playLead();

        this.musicSource = { lead, leadGain, drumTimer: true };
    }

    stopMusic() {
        if (this.musicSource) {
            const ctx = this.audioContext;

            // Fade out
            if (this.musicSource.gainNode) {
                this.musicSource.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            }
            if (this.musicSource.bassGain) {
                this.musicSource.bassGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            }
            if (this.musicSource.leadGain) {
                this.musicSource.leadGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            }
            if (this.musicSource.gain) {
                this.musicSource.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            }

            setTimeout(() => {
                if (this.musicSource) {
                    // Stop all oscillators
                    this.musicSource.oscillator1?.stop();
                    this.musicSource.oscillator2?.stop();
                    this.musicSource.osc?.stop();
                    this.musicSource.bass?.stop();
                    this.musicSource.lead?.stop();
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
