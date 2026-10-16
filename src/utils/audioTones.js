/**
 * audioTones.js
 * 
 * 100% Copyright-Free Synthesized Audio Tones for Ridingo Mobile Apps
 * Synthesized mathematically in real-time via Web Audio API:
 * - 0 External Audio Files to download (guaranteed 100% offline functionality)
 * - Zero network latency, instant playback on iOS & Android
 * - Minimal, elegant, non-intrusive sound design
 */

export const AVAILABLE_TUNES = [
  {
    id: 'toom_toom',
    name: 'Toom Toom (Default)',
    description: 'Subtle minimal 2-beat acoustic bass pulse (1.2s)'
  },
  {
    id: 'soft_chime',
    name: 'Soft Marimba Chime',
    description: 'Gentle 2-note warm marimba chime (1.0s)'
  },
  {
    id: 'subtle_pulse',
    name: 'Subtle Sine Pulse',
    description: 'Smooth low ambient sine pulse (1.1s)'
  },
  {
    id: 'gentle_bell',
    name: 'Gentle Harmonic Bell',
    description: 'Pure acoustic bell with soft harmonic decay (1.3s)'
  },
  {
    id: 'modern_radar',
    name: 'Modern Radar',
    description: 'Crisp dual tech blip alert (1.0s)'
  },
  {
    id: 'minimal_ping',
    name: 'Minimal Ping',
    description: 'Single high-clarity crystal drop (0.8s)'
  }
];

const TUNE_STORAGE_KEY = 'ridingo_custom_tune';

export function getSelectedCustomTune() {
  if (typeof window === 'undefined') return 'toom_toom';
  try {
    return localStorage.getItem(TUNE_STORAGE_KEY) || 'toom_toom';
  } catch (e) {
    return 'toom_toom';
  }
}

export function setSelectedCustomTune(tuneId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TUNE_STORAGE_KEY, tuneId);
  } catch (e) {}
}

let activeAudioCtx = null;
let activeNodes = [];

export function stopActiveTone() {
  try {
    if (activeNodes.length > 0) {
      activeNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (e) {}
      });
      activeNodes = [];
    }
    if (activeAudioCtx && activeAudioCtx.state !== 'closed') {
      try {
        activeAudioCtx.close();
      } catch (e) {}
      activeAudioCtx = null;
    }
  } catch (e) {}
}

/**
 * Plays the chosen synthesized tune
 * @param {string} [tuneId] - Tone identifier; falls back to saved preference or 'toom_toom'
 */
export function playCustomTone(tuneId) {
  try {
    stopActiveTone();

    const selected = tuneId || getSelectedCustomTune();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    activeAudioCtx = ctx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    switch (selected) {
      case 'soft_chime': {
        // Note 1: C5 (523.25 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.linearRampToValueAtTime(0.25, now + 0.04);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.5);
        activeNodes.push(osc1, gain1);

        // Note 2: E5 (659.25 Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.18);
        gain2.gain.setValueAtTime(0.001, now + 0.18);
        gain2.gain.linearRampToValueAtTime(0.28, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.95);
        activeNodes.push(osc2, gain2);
        break;
      }

      case 'subtle_pulse': {
        // Smooth sine wave pulse (220 Hz -> 330 Hz -> 220 Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.35);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.85);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.1);
        activeNodes.push(osc, gain);
        break;
      }

      case 'gentle_bell': {
        // Harmonic bell chime (880 Hz fundamental + 1760 Hz soft octave)
        const oscFundamental = ctx.createOscillator();
        const oscHarmonic = ctx.createOscillator();
        const gain = ctx.createGain();

        oscFundamental.type = 'sine';
        oscFundamental.frequency.setValueAtTime(880, now);

        oscHarmonic.type = 'sine';
        oscHarmonic.frequency.setValueAtTime(1760, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

        oscFundamental.connect(gain);
        oscHarmonic.connect(gain);
        gain.connect(ctx.destination);

        oscFundamental.start(now);
        oscHarmonic.start(now);
        oscFundamental.stop(now + 1.3);
        oscHarmonic.stop(now + 1.3);
        activeNodes.push(oscFundamental, oscHarmonic, gain);
        break;
      }

      case 'modern_radar': {
        // Dual tech radar blips (740 Hz then 980 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(740, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.22);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(980, now + 0.22);
        gain2.gain.setValueAtTime(0.22, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.22);
        osc2.stop(now + 0.85);

        activeNodes.push(osc1, gain1, osc2, gain2);
        break;
      }

      case 'minimal_ping': {
        // Clean single crystalline drop (1046.5 Hz - C6)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.75);
        activeNodes.push(osc, gain);
        break;
      }

      case 'toom_toom':
      default: {
        // MINIMAL 'TOOM TOOM' SOUND (1 to 1.2 seconds)
        // Two warm, soft low-frequency acoustic thuds:
        // Beat 1: 140 Hz -> 75 Hz (0.0s to 0.45s)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(140, now);
        osc1.frequency.exponentialRampToValueAtTime(75, now + 0.38);

        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.linearRampToValueAtTime(0.35, now + 0.03);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.45);

        // Beat 2: 155 Hz -> 80 Hz (0.42s to 1.15s)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(155, now + 0.42);
        osc2.frequency.exponentialRampToValueAtTime(80, now + 0.85);

        gain2.gain.setValueAtTime(0.001, now + 0.42);
        gain2.gain.linearRampToValueAtTime(0.38, now + 0.45);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.42);
        osc2.stop(now + 1.15);

        activeNodes.push(osc1, gain1, osc2, gain2);
        break;
      }
    }
  } catch (err) {
    console.warn('[AudioTones] Playback notice:', err);
  }
}
