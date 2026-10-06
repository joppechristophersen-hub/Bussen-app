// Keep the original recordings. Web Audio provides accurate server-event timing;
// HTML audio covers the first click while the short samples are still decoding.
export const SOUND_FILES = {
  click: "ui-click.mp3",
  card1: "card-take-1.mp3", card2: "card-take-2.mp3", card3: "card-take-3.mp3",
  place: "card-place.mp3", correct: "correct.mp3", wrong: "wrong.mp3",
  glass: "glass-clink.mp3", horn: "bus-horn.mp3", disco: "disco.mp3", finish: "finish-cheer.mp3",
} as const;
export type SoundName = keyof typeof SOUND_FILES;

export default class OriginalAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private loading = new Set<SoundName>();
  private abort = new AbortController();
  private sources = new Set<AudioBufferSourceNode>();
  private media = new Set<HTMLAudioElement>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private music: HTMLAudioElement;
  private disposed = false;
  private enabled = true;
  private menuActive = false;
  private serverOffsetMs: number | null = null;
  private musicSyncTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.music = new Audio("/sounds/background-music.mp3");
    this.music.preload = "auto";
    this.music.loop = true;
    this.music.volume = 0.2;
    this.music.onloadedmetadata = () => this.alignMusic(true);
    this.music.onplaying = () => this.alignMusic();
  }

  private getContext() {
    if (!this.context) {
      try { this.context = new AudioContext(); } catch { return null; }
    }
    return this.context;
  }

  preload() {
    if (this.disposed) return;
    const context = this.getContext();
    if (!context) return;
    for (const name of Object.keys(SOUND_FILES) as SoundName[]) {
      if (this.buffers.has(name) || this.loading.has(name)) continue;
      this.loading.add(name);
      void fetch(`/sounds/${SOUND_FILES[name]}`, { signal: this.abort.signal })
        .then(response => {
          if (!response.ok) throw new Error(`Sound unavailable: ${SOUND_FILES[name]}`);
          return response.arrayBuffer();
        })
        .then(bytes => context.decodeAudioData(bytes))
        .then(buffer => { if (!this.disposed) this.buffers.set(name, buffer); })
        .catch(() => { /* A direct recording playback remains available. */ })
        .finally(() => this.loading.delete(name));
    }
  }

  unlock() {
    if (!this.enabled || this.disposed || document.hidden) return;
    const context = this.getContext();
    if (context?.state === "suspended") void context.resume().catch(() => {});
    this.preload();
    this.syncMusic();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) this.unlock();
    else { this.stopEffects(); this.syncMusic(); }
  }

  setMenuActive(active: boolean) {
    this.menuActive = active;
    if (!active) {
      this.music.pause();
      this.music.currentTime = 0;
    }
    this.syncMusic();
  }

  setMusicClock(serverOffsetMs: number) {
    if (!Number.isFinite(serverOffsetMs) || this.disposed) return;
    const firstMeasurement = this.serverOffsetMs === null;
    this.serverOffsetMs = firstMeasurement ? serverOffsetMs :
      this.serverOffsetMs! * 0.8 + serverOffsetMs * 0.2;
    this.alignMusic(firstMeasurement);
  }

  private alignMusic(force = false) {
    const duration = this.music.duration;
    if (this.serverOffsetMs === null || !this.menuActive || !this.enabled ||
      document.hidden || this.disposed || !Number.isFinite(duration) || duration <= 0) return;
    // Same recording and server-clock timeline on every device, including late joiners.
    const position = ((Date.now() + this.serverOffsetMs) / 1000 % duration + duration) % duration;
    const delta = (position - this.music.currentTime + duration * 1.5) % duration - duration / 2;
    if (force || Math.abs(delta) > 0.75) {
      this.music.currentTime = position;
      this.music.playbackRate = 1;
    } else this.music.playbackRate = Math.abs(delta) < 0.04 ? 1 : delta > 0 ? 1.015 : 0.985;
  }

  private syncMusic() {
    if (this.enabled && this.menuActive && !document.hidden && !this.disposed) {
      if (this.music.paused) {
        this.alignMusic(true);
        void this.music.play().catch(() => {});
      }
      this.musicSyncTimer ??= setInterval(() => this.alignMusic(), 3000);
    } else {
      this.music.pause();
      this.music.playbackRate = 1;
      clearInterval(this.musicSyncTimer);
      this.musicSyncTimer = undefined;
    }
  }

  visibilityChanged() {
    if (document.hidden) {
      this.stopEffects();
      this.music.pause();
      this.syncMusic();
      void this.context?.suspend().catch(() => {});
    } else this.unlock();
  }

  play(name: SoundName, playAt = Date.now()) {
    if (!this.enabled || this.disposed || document.hidden) return;
    const delay = Math.max(0, playAt - Date.now());
    if (!Number.isFinite(delay) || delay > 5000 || playAt < Date.now() - 1500) return;
    const context = this.context;
    const buffer = this.buffers.get(name);
    if (buffer && context?.state === "running") {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = name === "click" ? 0.75 : 0.85;
      source.connect(gain);
      gain.connect(context.destination);
      source.onended = () => { this.sources.delete(source); source.disconnect(); gain.disconnect(); };
      if (this.sources.size >= 24) {
        const oldest = this.sources.values().next().value;
        try { oldest?.stop(); } catch { /* Already ended. */ }
        if (oldest) this.sources.delete(oldest);
      }
      this.sources.add(source);
      source.start(context.currentTime + delay / 1000);
      return;
    }
    const recording = new Audio(`/sounds/${SOUND_FILES[name]}`);
    recording.volume = name === "click" ? 0.75 : 0.85;
    if (this.media.size >= 24) {
      const oldest = this.media.values().next().value;
      if (oldest) {
        oldest.pause(); oldest.onended = null; oldest.onerror = null;
        this.media.delete(oldest);
      }
    }
    this.media.add(recording);
    const release = () => { this.media.delete(recording); recording.onended = null; recording.onerror = null; };
    recording.onended = release;
    recording.onerror = release;
    const start = () => {
      if (!this.media.has(recording) || !this.enabled || this.disposed || document.hidden) { release(); return; }
      void recording.play().catch(release);
    };
    if (!delay) start();
    else {
      const timer = setTimeout(() => { this.timers.delete(timer); start(); }, delay);
      this.timers.add(timer);
    }
  }

  private stopEffects() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const source of this.sources) { try { source.stop(); } catch { /* Already ended. */ } }
    this.sources.clear();
    for (const audio of this.media) { audio.pause(); audio.onended = null; audio.onerror = null; }
    this.media.clear();
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    this.stopEffects();
    this.music.pause();
    clearInterval(this.musicSyncTimer);
    this.music.onloadedmetadata = null;
    this.music.onplaying = null;
    this.music.removeAttribute("src");
    this.music.load();
    void this.context?.close().catch(() => {});
    this.context = null;
    this.buffers.clear();
  }
}

