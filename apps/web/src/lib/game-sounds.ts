"use client";

const STORAGE_KEY = "suzi-games-sound-enabled";

export function getGameSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setGameSoundEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
}

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function beep(freq: number, durationMs: number, gain = 0.08) {
  const c = ctx();
  if (!c || c.state === "suspended") {
    void c?.resume();
  }
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.value = gain;
  const now = c.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

/** Soft tick when a move hits the board (any player). */
export function playMoveSound() {
  beep(520, 55, 0.06);
}

/** Short chime when it becomes your turn. */
export function playYourTurnSound() {
  beep(660, 70, 0.07);
  setTimeout(() => beep(880, 90, 0.06), 75);
}

export function playArcadeHitSound() {
  beep(260, 38, 0.08);
  setTimeout(() => beep(520, 34, 0.045), 34);
}

export function playArcadeGoalSound() {
  beep(180, 80, 0.09);
  setTimeout(() => beep(420, 110, 0.075), 70);
  setTimeout(() => beep(760, 140, 0.06), 145);
}

export function playArcadeLaserSound() {
  beep(920, 42, 0.055);
  setTimeout(() => beep(460, 52, 0.04), 34);
}

export function playArcadeExplosionSound() {
  beep(120, 90, 0.095);
  setTimeout(() => beep(90, 120, 0.07), 70);
}
