"use client";

import { getGameSoundEnabled } from "@/lib/game-sounds";

let audioCtx: AudioContext | null = null;
let ambientOsc: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

function tone(
  freq: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gain = 0.09,
  delayMs = 0,
) {
  if (!getGameSoundEnabled()) return;
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const now = c.currentTime + delayMs / 1000;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

function noiseBurst(durationMs: number, gain = 0.04) {
  if (!getGameSoundEnabled()) return;
  const c = ctx();
  if (!c) return;
  const bufferSize = c.sampleRate * (durationMs / 1000);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g);
  g.connect(c.destination);
  src.start();
}

export function playPokerDealSound() {
  noiseBurst(45, 0.03);
  tone(180, 40, "triangle", 0.05);
  tone(320, 55, "sine", 0.04, 30);
}

export function playPokerChipSound() {
  tone(920, 35, "square", 0.035);
  tone(1180, 28, "sine", 0.025, 18);
}

export function playPokerFoldSound() {
  tone(140, 90, "sawtooth", 0.05);
}

export function playPokerCheckSound() {
  tone(480, 40, "sine", 0.04);
}

export function playPokerBetSound() {
  playPokerChipSound();
  tone(640, 50, "triangle", 0.045, 40);
}

export function playPokerWinSound() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 120, "sine", 0.07, i * 90));
}

export function playPokerShuffleSound() {
  noiseBurst(120, 0.05);
}

export function playPokerTurnSound() {
  tone(660, 70, "sine", 0.06);
  tone(880, 90, "sine", 0.05, 75);
}

export function startPokerAmbient() {
  if (!getGameSoundEnabled()) return;
  const c = ctx();
  if (!c || ambientOsc) return;
  ambientOsc = c.createOscillator();
  ambientGain = c.createGain();
  ambientOsc.type = "sine";
  ambientOsc.frequency.value = 52;
  ambientGain.gain.value = 0.012;
  ambientOsc.connect(ambientGain);
  ambientGain.connect(c.destination);
  ambientOsc.start();
}

export function stopPokerAmbient() {
  if (ambientOsc) {
    try {
      ambientOsc.stop();
    } catch {
      // already stopped
    }
    ambientOsc.disconnect();
    ambientOsc = null;
  }
  if (ambientGain) {
    ambientGain.disconnect();
    ambientGain = null;
  }
}
