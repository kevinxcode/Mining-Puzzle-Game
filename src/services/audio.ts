/**
 * MINING FLOW — audio service.
 * Wraps expo-audio with settings-driven enablement and safe no-ops so audio
 * never breaks gameplay. Subtle SFX plus a soft ambient loop.
 */

import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const soundAssets = {
  tap: require('../../assets/sounds/tap.wav'),
  complete: require('../../assets/sounds/complete.wav'),
  star: require('../../assets/sounds/star.wav'),
  fail: require('../../assets/sounds/fail.wav'),
  ambient: require('../../assets/sounds/ambient.wav'),
} as const;

type SoundName = keyof typeof soundAssets;

let sfxEnabled = true;
let musicEnabled = true;
const players = new Map<SoundName, AudioPlayer>();
let ambientPlayer: AudioPlayer | null = null;

function playerFor(name: SoundName): AudioPlayer | null {
  const existing = players.get(name);
  if (existing) return existing;
  try {
    const player = createAudioPlayer(soundAssets[name]);
    players.set(name, player);
    return player;
  } catch {
    return null;
  }
}

/** One-shot sound effect (tap, complete, star, fail). */
export function playSfx(name: Exclude<SoundName, 'ambient'>): void {
  if (!sfxEnabled) return;
  const player = playerFor(name);
  if (!player) return;
  try {
    void player.seekTo(0);
    player.volume = 0.6;
    player.play();
  } catch {
    // Playback is best-effort — never break gameplay for audio.
  }
}

/** Background ambience loop, driven by the music setting. */
export function updateMusicPlayback(): void {
  if (musicEnabled) {
    if (!ambientPlayer) {
      try {
        ambientPlayer = createAudioPlayer(soundAssets.ambient);
        ambientPlayer.loop = true;
        ambientPlayer.volume = 0.35;
      } catch {
        ambientPlayer = null;
      }
    }
    try {
      ambientPlayer?.play();
    } catch {
      // Ignore — ambient music is optional polish.
    }
  } else {
    try {
      ambientPlayer?.pause();
    } catch {
      // Ignore.
    }
  }
}

export function setSfxEnabled(value: boolean): void {
  sfxEnabled = value;
}

export function setMusicEnabled(value: boolean): void {
  musicEnabled = value;
  updateMusicPlayback();
}

export function disposeAudio(): void {
  for (const player of players.values()) {
    try {
      player.remove();
    } catch {
      // Ignore.
    }
  }
  players.clear();
  if (ambientPlayer) {
    try {
      ambientPlayer.remove();
    } catch {
      // Ignore.
    }
    ambientPlayer = null;
  }
}