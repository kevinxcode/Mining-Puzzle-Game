/**
 * Generates small WAV sound effects for MINING FLOW (no dependencies needed).
 * Run: node scripts/generate-sounds.js
 */

const fs = require('fs');
const path = require('path');

const sampleRate = 22050;

function writeWav(name, samples) {
  const dir = path.join(__dirname, '..', 'assets', 'sounds');
  fs.mkdirSync(dir, { recursive: true });
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(dir, name), buffer);
  console.log('wrote', name, `(${samples.length} samples)`);
}

function tone(freq, duration, { fade = 0.02, volume = 0.5 } = {}) {
  const n = Math.floor(sampleRate * duration);
  const samples = new Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.min(1, i / (fade * sampleRate), (n - i) / (fade * sampleRate));
    samples[i] = Math.sin(2 * Math.PI * freq * t) * volume * envelope;
  }
  return samples;
}

function sequence(parts, gap = 0.02) {
  const gapSamples = Math.floor(gap * sampleRate);
  const total = parts.reduce((s, p) => s + p.length, 0) + gapSamples * (parts.length - 1);
  const out = new Array(total).fill(0);
  let offset = 0;
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) out[offset + i] += part[i];
    offset += part.length + gapSamples;
  }
  return out;
}

// Button tap: short high click.
writeWav('tap.wav', tone(1400, 0.06, { volume: 0.35 }));
// Mission complete: rising arpeggio.
writeWav('complete.wav', sequence([tone(523, 0.12), tone(659, 0.12), tone(784, 0.16), tone(1047, 0.22)], 0.01));
// Star reward: bright ding.
writeWav('star.wav', sequence([tone(1319, 0.1), tone(1760, 0.18)], 0.01));
// Failure: low descending tone.
writeWav('fail.wav', sequence([tone(330, 0.18), tone(233, 0.3)], 0.02));
// Ambient loop: soft chord pad with whole-cycle sines for a seamless loop.
writeWav(
  'ambient.wav',
  (() => {
    const duration = 4;
    const n = Math.floor(sampleRate * duration);
    const freqs = [130.81, 196.0, 261.63, 329.63];
    const samples = new Array(n);
    for (let i = 0; i < n; i += 1) {
      const t = i / sampleRate;
      let v = 0;
      for (const f of freqs) {
        const cycles = Math.round(f * duration);
        v += Math.sin((2 * Math.PI * cycles * t) / duration);
      }
      samples[i] = (v / freqs.length) * 0.12;
    }
    return samples;
  })(),
);