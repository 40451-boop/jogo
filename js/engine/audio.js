// Audio Engine using Web Audio API for sound effects and dynamic synth music
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.sfxVolume = 0.7;
        this.musicVolume = 0.35;
        this.musicPlaying = false;
        this.musicInterval = null;
        this.musicStep = 0;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
            this.startSynthMusic();
        } catch (e) {
            console.warn("Web Audio not supported or blocked", e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // --- SFX SYNTHESIZERS ---

    playJump() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);

        gain.gain.setValueAtTime(this.sfxVolume * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playDoubleJump() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.15);

        gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
    }

    playDash() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Filtered noise swoosh
        const bufferSize = this.ctx.sampleRate * 0.18;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(2200, now + 0.08);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.18);
        filter.Q.value = 2.5;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.sfxVolume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);

        // Low frequency sub-pulse
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(140, now);
        sub.frequency.exponentialRampToValueAtTime(45, now + 0.15);
        subGain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        sub.connect(subGain);
        subGain.connect(this.ctx.destination);
        sub.start(now);
        sub.stop(now + 0.17);
    }

    playWallJump() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.09);

        gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    playSlash(comboIndex = 0) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        const pitches = [550, 720, 950];
        const pitch = pitches[comboIndex % pitches.length];

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = comboIndex === 2 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(pitch, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);

        gain.gain.setValueAtTime(this.sfxVolume * 0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    playHitImpact(isCrit = false) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Snappy metallic click + low thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isCrit ? 'square' : 'sawtooth';
        osc.frequency.setValueAtTime(isCrit ? 380 : 220, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

        gain.gain.setValueAtTime(this.sfxVolume * (isCrit ? 0.8 : 0.6), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);

        if (isCrit) {
            // High resonant ring on crit
            const critOsc = this.ctx.createOscillator();
            const critGain = this.ctx.createGain();
            critOsc.type = 'sine';
            critOsc.frequency.setValueAtTime(1200, now);
            critOsc.frequency.exponentialRampToValueAtTime(700, now + 0.2);
            critGain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
            critGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            critOsc.connect(critGain);
            critGain.connect(this.ctx.destination);
            critOsc.start(now);
            critOsc.stop(now + 0.23);
        }
    }

    playDiveSlam() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Low explosive seismic boom
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

        gain.gain.setValueAtTime(this.sfxVolume * 0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    playEnemyDeath() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);

        gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
    }

    playExplosion() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.35);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.sfxVolume * 0.85, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
    }

    playLaserCharge() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.6);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.35, now + 0.55);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.66);
    }

    playLaserShoot() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);

        gain.gain.setValueAtTime(this.sfxVolume * 0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
    }

    playUpgradeSelect() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.06);

            gain.gain.setValueAtTime(this.sfxVolume * 0.45, now + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.26);
        });
    }

    playBossRoar() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(75, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.4);
        osc.frequency.exponentialRampToValueAtTime(35, now + 1.2);

        gain.gain.setValueAtTime(this.sfxVolume * 0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.3);
    }

    // --- PROCEDURAL SYNTHWAVE BGM LOOP ---
    startSynthMusic() {
        if (this.musicPlaying) return;
        this.musicPlaying = true;
        this.musicStep = 0;

        const bassNotes = [
            55, 55, 55, 55,  // A1
            49, 49, 49, 49,  // G1
            43.65, 43.65, 43.65, 43.65, // F1
            51.91, 51.91, 58.27, 58.27  // G#1 -> A#1
        ];

        const leadNotes = [
            220, 0, 261.6, 220, 329.6, 0, 293.7, 0,
            220, 392, 329.6, 0, 261.6, 293.7, 220, 0
        ];

        const stepTime = 135; // ~111 BPM 16th notes
        this.musicInterval = setInterval(() => {
            if (this.muted || !this.ctx || !this.musicPlaying) return;
            const now = this.ctx.currentTime;
            const step = this.musicStep % 16;
            this.musicStep++;

            // Bass synth pulse
            const bFreq = bassNotes[step];
            if (bFreq > 0) {
                const bOsc = this.ctx.createOscillator();
                const bGain = this.ctx.createGain();
                const bFilter = this.ctx.createBiquadFilter();

                bOsc.type = 'sawtooth';
                bOsc.frequency.setValueAtTime(bFreq, now);

                bFilter.type = 'lowpass';
                bFilter.frequency.setValueAtTime(280, now);
                bFilter.frequency.exponentialRampToValueAtTime(110, now + 0.12);

                bGain.gain.setValueAtTime(this.musicVolume * 0.35, now);
                bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

                bOsc.connect(bFilter);
                bFilter.connect(bGain);
                bGain.connect(this.ctx.destination);
                bOsc.start(now);
                bOsc.stop(now + 0.14);
            }

            // Hi-hat noise click every 2nd step
            if (step % 2 === 0) {
                const hatBuff = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.03, this.ctx.sampleRate);
                const data = hatBuff.getChannelData(0);
                for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
                const hatSrc = this.ctx.createBufferSource();
                hatSrc.buffer = hatBuff;

                const hatFilter = this.ctx.createBiquadFilter();
                hatFilter.type = 'highpass';
                hatFilter.frequency.setValueAtTime(7000, now);

                const hatGain = this.ctx.createGain();
                hatGain.gain.setValueAtTime(this.musicVolume * (step % 4 === 2 ? 0.35 : 0.18), now);
                hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

                hatSrc.connect(hatFilter);
                hatFilter.connect(hatGain);
                hatGain.connect(this.ctx.destination);
                hatSrc.start(now);
            }

            // Lead Synth Arp
            const lFreq = leadNotes[step];
            if (lFreq > 0) {
                const lOsc = this.ctx.createOscillator();
                const lGain = this.ctx.createGain();
                lOsc.type = 'sine';
                lOsc.frequency.setValueAtTime(lFreq, now);

                lGain.gain.setValueAtTime(this.musicVolume * 0.15, now);
                lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

                lOsc.connect(lGain);
                lGain.connect(this.ctx.destination);
                lOsc.start(now);
                lOsc.stop(now + 0.12);
            }

        }, stepTime);
    }
}

window.soundEngine = new SoundEngine();
