type CallSoundName = "ringback" | "ringtone" | "busy" | "ended";

const CALL_SOUND_SOURCES: Record<CallSoundName, string[]> = {
  ringback: ["/sounds/calls/ringback.mp3", "/sounds/calls/ringback.ogg"],
  ringtone: ["/sounds/calls/ringtone.mp3", "/sounds/calls/ringtone.ogg"],
  busy: ["/sounds/calls/busy.mp3", "/sounds/calls/busy.ogg"],
  ended: ["/sounds/calls/ended.mp3", "/sounds/calls/ended.ogg"],
};

type ManagedSound = {
  audio: HTMLAudioElement;
  sourceIndex: number;
};

export class CallSoundManager {
  private sounds = new Map<CallSoundName, ManagedSound>();

  play(name: CallSoundName, options: { loop?: boolean; volume?: number } = {}) {
    if (typeof window === "undefined") return;
    const managed = this.getSound(name);
    if (!managed) return;
    const { audio } = managed;
    audio.loop = Boolean(options.loop);
    audio.volume = options.volume ?? 0.7;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Browsers can block audio until a user gesture; call UI still works.
    });
  }

  stop(name: CallSoundName) {
    const managed = this.sounds.get(name);
    if (!managed) return;
    managed.audio.pause();
    managed.audio.currentTime = 0;
  }

  stopAll() {
    for (const name of this.sounds.keys()) {
      this.stop(name);
    }
  }

  private getSound(name: CallSoundName) {
    const existing = this.sounds.get(name);
    if (existing) return existing;
    const sources = CALL_SOUND_SOURCES[name];
    const audio = new Audio(sources[0]);
    const managed: ManagedSound = { audio, sourceIndex: 0 };
    audio.preload = "auto";
    audio.addEventListener("error", () => {
      if (managed.sourceIndex >= sources.length - 1) return;
      managed.sourceIndex += 1;
      audio.src = sources[managed.sourceIndex];
      audio.load();
    });
    this.sounds.set(name, managed);
    return managed;
  }
}
