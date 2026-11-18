import contactSample from './recordings/contact.pcm?url&inline';
import wallSample from './recordings/wall.pcm?url&inline';
import settleSample from './recordings/settle.pcm?url&inline';
import singleRollSample from './recordings/single-roll.pcm?url&inline';
import dualRollSample from './recordings/dual-roll.pcm?url&inline';

const DICE_RECORDINGS = {
  contact: contactSample,
  wall: wallSample,
  settle: settleSample,
  single: singleRollSample,
  dual: dualRollSample,
};
const SILENCE = 0.0001;

export function createBG3Audio() {
  let context;
  let master;
  let round;
  let noise;
  let diceContacts;
  let motion;
  let muted = false;
  let volume = 1;
  let impactVolume = 1;

  function unlock() {
    if (muted) return;
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.65 * volume;
      master.connect(context.destination);
      round = context.createGain();
      round.connect(master);

      noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = 2 * Math.random() - 1;
      diceContacts = Object.fromEntries(Object.entries(DICE_RECORDINGS).map(
        ([name, source]) => [name, decodeRecording(source)]
      ));
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }

  function sound() {
    unlock();
    return !muted && context;
  }

  function envelope(level, start, attack, duration) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(SILENCE, start);
    gain.gain.exponentialRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(SILENCE, start + duration);
    gain.connect(round);
    return gain;
  }

  function tone(from, to, level, duration, { delay = 0, type = 'sine', attack = 0.006 } = {}) {
    const start = context.currentTime + delay;
    const voice = context.createOscillator();
    const gain = envelope(level, start, attack, duration);
    voice.type = type;
    voice.frequency.setValueAtTime(from, start);
    voice.frequency.exponentialRampToValueAtTime(to, start + duration);
    voice.connect(gain);
    voice.start(start);
    voice.stop(start + duration);
  }

  function texture(from, to, level, duration, { delay = 0, attack = 0.005, q = 0.8 } = {}) {
    const start = context.currentTime + delay;
    const voice = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = envelope(level, start, attack, duration);
    voice.buffer = noise;
    voice.loop = true;
    filter.type = 'bandpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + duration);
    voice.connect(filter).connect(gain);
    voice.start(start);
    voice.stop(start + duration);
  }

  // The bundled recordings are mono PCM16 at 24 kHz. Decode synchronously
  // so the first contact can play in the same frame that unlocks audio.
  function decodeRecording(source) {
    const pcm = atob(source.slice(source.indexOf(',') + 1));
    const buffer = context.createBuffer(1, pcm.length / 2, 24000);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      const value = pcm.charCodeAt(i * 2) | pcm.charCodeAt(i * 2 + 1) << 8;
      samples[i] = (value << 16 >> 16) / 32768;
    }
    return buffer;
  }

  function playRecording(kind, strength, rate = 1, duration = diceContacts[kind].duration) {
    strength *= impactVolume;
    const voice = context.createBufferSource();
    const gain = context.createGain();
    voice.buffer = diceContacts[kind];
    voice.playbackRate.value = rate;
    gain.gain.value = strength;
    voice.connect(gain).connect(round);
    const start = context.currentTime;
    gain.gain.setValueAtTime(strength, start);
    gain.gain.setValueAtTime(strength, start + (duration - 0.008) / rate);
    gain.gain.linearRampToValueAtTime(0, start + duration / rate);
    voice.start(start, 0, duration);
  }

  function playBounce(intensity = 1, wall = false) {
    if (!sound()) return;
    const strength = Math.max(0.1, Math.min(1.15, intensity));
    const rate = 0.96 + Math.random() * 0.08;
    playRecording(wall ? 'wall' : 'contact', strength, rate);
    if (wall && impactVolume > 0) {
      // Short, inharmonic metal ring at the tray edge.
      tone(2180 * rate, 2180 * rate, strength * impactVolume * 0.065, 0.11, { attack: 0.001 });
      tone(3510 * rate, 3510 * rate, strength * impactVolume * 0.044, 0.065, { attack: 0.001 });
    }
  }

  function playRoll(dual) {
    if (!sound()) return;
    playRecording(dual ? 'dual' : 'single', dual ? 0.81 : 0.51, dual ? 1.12 : 1.0);
  }

  function playDiceContact() {
    if (!sound() || impactVolume === 0) return;
    playRecording('dual', 0.78, 1.22, 0.082);
    tone(2900, 2790, impactVolume * 0.062, 0.075, { attack: 0.001 });
    tone(4230, 4230, impactVolume * 0.037, 0.043, { attack: 0.001 });
  }

  function playSettle() {
    if (!sound()) return;
    playRecording('settle', 0.36, 1.02);
  }

  function playOffer() {
    if (!sound()) return;
    texture(720, 1650, 0.09, 0.20, { attack: 0.03 });
    tone(490, 680, 0.045, 0.24, { delay: 0.055 });
  }

  function playGuidance() {
    if (!sound()) return;
    playRecording('single', 0.42, 1.30);
  }

  function playBonusHit(index) {
    if (!sound()) return;
    const root = index === 0 ? 520 : 640;
    tone(root / 2, root / 2, 0.10, 0.16, { type: 'triangle' });
    [1, 1.51, 2.04].forEach((ratio, i) => {
      tone(root * ratio, root * ratio, 0.10 / (i + 1), 0.46, { delay: i * 0.026 });
    });
    texture(2250, 1050, 0.13, 0.17);
  }

  function stopMotion() {
    if (!motion) return;
    const { voice, gain } = motion;
    const now = context.currentTime;
    gain.gain.setTargetAtTime(0, now, 0.01);
    voice.stop(now + 0.06);
    motion = null;
  }

  function updateMotion(kind, progress) {
    if (muted) return;
    if (kind !== motion?.kind) {
      stopMotion();
      if (!sound()) return;
      const voice = context.createBufferSource();
      voice.buffer = noise;
      voice.loop = true;
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      gain.gain.value = 0;
      filter.type = 'bandpass';
      filter.Q.value = 1.25;
      voice.connect(filter).connect(gain).connect(round);
      voice.start();
      motion = { kind, voice, filter, gain };
    }
    const now = context.currentTime;
    const lift = kind === 'verdict';
    const frequency = lift ? 260 + 570 * progress : 850 + 3400 * progress;
    const volume = lift ? 0.20 * progress : 0.29 * Math.sin(Math.PI * progress);
    motion.filter.frequency.setTargetAtTime(frequency, now, 0.014);
    motion.gain.gain.setTargetAtTime(volume, now, 0.014);
  }

  function playImpact() {
    stopMotion();
    if (!sound()) return;
    tone(110, 38, 0.32, 0.58);
    tone(190, 63, 0.15, 0.21, { type: 'triangle' });
    texture(2100, 420, 0.48, 0.32);
  }

  function playVerdict(success) {
    if (!sound()) return;
    texture(550, 1700, 0.16, 0.65, { attack: 0.13 });
    const notes = success ? [246.94, 369.99, 493.88, 622.25] : [185, 155.56, 123.47];
    notes.forEach((pitch, i) => {
      tone(pitch, pitch, 0.075, 0.8, { delay: i * 0.063, attack: 0.045, type: 'triangle' });
      tone(pitch * 2, pitch * 2, 0.035, 0.55, { delay: i * 0.063, attack: 0.02 });
    });
  }

  function reset() {
    stopMotion();
    if (!round) return;
    round.disconnect();
    round = context.createGain();
    round.connect(master);
  }

  return {
    unlock,
    reset,
    playBounce,
    playDiceContact,
    playRoll,
    playSettle,
    playOffer,
    playGuidance,
    playBonusHit,
    updateMotion,
    stopMotion,
    playImpact,
    playVerdict,
    setLevels(general, impacts) {
      volume = general;
      impactVolume = impacts;
      if (master) master.gain.setTargetAtTime(0.65 * volume, context.currentTime, 0.015);
    },
    setMuted(value) {
      muted = value;
      if (muted) reset();
      else unlock();
    },
    isMuted: () => muted,
  };
}
