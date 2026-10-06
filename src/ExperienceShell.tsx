import { useEffect, useRef, useState, type ReactNode } from "react";
import OriginalAudio, { type SoundName } from "./OriginalAudio";

type Effect = { type: string; result?: string; eventId?: string; variant?: number; localPlayAt?: number };
const storageKey = "busbaas-sound-enabled";
const transitions: Record<string, [string, string, string]> = {
  "cards-0": ["♥️", "Kies je kleur!", "Rood of zwart? Tijd voor de eerste gok."],
  "cards-1": ["↕️", "Hoger of lager!", "Komt de volgende kaart boven of onder de vorige?"],
  "cards-2": ["🃏", "Binnen of buiten!", "Valt jouw kaart tussen de twee waarden?"],
  "cards-3": ["♠️", "Kies je figuur!", "Harten, ruiten, klaveren of schoppen?"],
  tree: ["🌳", "De boom", "Verdeel de kaarten en speel samen verder."],
  "bus-setup": ["🚌", "Instappen!", "Maak de bus klaar voor de volgende ronde."],
  bus: ["🚌", "Daar gaan we!", "De chauffeur neemt het stuur over."],
};

export default function ExperienceShell({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(storageKey) !== "false"; } catch { return true; }
  });
  const [phase, setPhase] = useState<string | null>(null);
  const enabledRef = useRef(enabled);
  const audioRef = useRef<OriginalAudio | null>(null);

  useEffect(() => {
    enabledRef.current = enabled;
    try { localStorage.setItem(storageKey, String(enabled)); } catch { /* Optional storage. */ }
    audioRef.current?.setEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    const audio = new OriginalAudio();
    audioRef.current = audio;
    audio.setEnabled(enabledRef.current);
    audio.setMenuActive(document.documentElement.dataset.appScreen !== "game");
    audio.preload();
    const seen = new Set<string>();
    const lastPlayed = new Map<SoundName, number>();
    const fallbackTimers = new Set<ReturnType<typeof setTimeout>>();
    let phaseTimer: ReturnType<typeof setTimeout> | undefined;
    let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
    let lastTap = 0;

    function unlock() { audio.unlock(); }
    function playName(name: SoundName, playAt?: number) {
      // A state fallback and a server event can refer to the same celebration.
      if ((name === "disco" || name === "finish") && Date.now() - (lastPlayed.get(name) ?? 0) < 1200) return;
      lastPlayed.set(name, Date.now());
      audio.play(name, playAt);
    }
    function fallback(name: "disco" | "finish") {
      const startedAt = Date.now();
      const timer = setTimeout(() => {
        fallbackTimers.delete(timer);
        if ((lastPlayed.get(name) ?? 0) < startedAt - 1200) playName(name);
      }, 700);
      fallbackTimers.add(timer);
    }
    function play(effect: Effect) {
      if (!effect || document.hidden) return;
      if (effect.eventId) {
        if (seen.has(effect.eventId)) return;
        seen.add(effect.eventId);
        if (seen.size > 128) seen.delete(seen.values().next().value!);
      }
      const playAt = effect.localPlayAt ?? Date.now();
      if (!Number.isFinite(playAt) || playAt > Date.now() + 5000 || playAt < Date.now() - 1500) return;
      const variant = Number.isInteger(effect.variant) ? (effect.variant! % 3 + 3) % 3 : 0;
      if (effect.type === "card") playName((["card1", "card2", "card3"] as const)[variant], playAt);
      else if (effect.type === "glass") playName("glass", playAt);
      else if (effect.type === "bus-horn") playName("horn", playAt);
      else if (effect.type === "finish") playName("finish", playAt);
      else if (effect.type === "disco" || effect.result === "disco") playName("disco", playAt);
      else if (effect.result === "correct" || effect.result === "wrong") {
        playName("place", playAt);
        playName(effect.result, playAt + 70);
      }
      clearTimeout(feedbackTimer);
      document.documentElement.dataset.gameFeedback = effect.result ?? effect.type;
      feedbackTimer = setTimeout(() => delete document.documentElement.dataset.gameFeedback, 650);
    }
    function handleSound(event: Event) { play((event as CustomEvent<Effect>).detail); }
    function handlePhase(event: Event) {
      const next = (event as CustomEvent<string>).detail;
      if (next === "bus-finished") fallback("finish");
      clearTimeout(phaseTimer);
      if (!transitions[next] || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setPhase(null); return; }
      setPhase(next);
      phaseTimer = setTimeout(() => setPhase(null), next.startsWith("cards-") ? 4200 : 4800);
    }
    function handleDisco() { fallback("disco"); }
    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLElement>("button, a[href], [role='button'], input[type='button'], input[type='submit']");
      if (!button || button.matches(":disabled, [aria-disabled='true']") || button.classList.contains("experience-sound-button")) return;
      unlock();
      if (Date.now() - lastTap < 75) return;
      lastTap = Date.now();
      playName("click");
    }
    function handleScreen(event: Event) {
      const menu = (event as CustomEvent<string>).detail !== "game";
      audio.setMenuActive(menu);
      if (menu) { clearTimeout(phaseTimer); setPhase(null); }
    }
    function handlePreference() { audio.setEnabled(enabledRef.current); }
    function handleMusicClock(event: Event) { audio.setMusicClock((event as CustomEvent<number>).detail); }
    function handleVisibility() {
      clearTimeout(phaseTimer);
      setPhase(null);
      for (const timer of fallbackTimers) clearTimeout(timer);
      fallbackTimers.clear();
      audio.visibilityChanged();
    }
    document.addEventListener("pointerdown", unlock, { passive: true });
    document.addEventListener("keydown", unlock);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("busbaas-sound-effect", handleSound);
    window.addEventListener("busbaas-phase", handlePhase);
    window.addEventListener("busbaas-disco", handleDisco);
    window.addEventListener("busbaas-screen", handleScreen);
    window.addEventListener("busbaas-audio-preference", handlePreference);
    window.addEventListener("busbaas-music-clock", handleMusicClock);
    return () => {
      clearTimeout(phaseTimer);
      clearTimeout(feedbackTimer);
      for (const timer of fallbackTimers) clearTimeout(timer);
      delete document.documentElement.dataset.gameFeedback;
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("busbaas-sound-effect", handleSound);
      window.removeEventListener("busbaas-phase", handlePhase);
      window.removeEventListener("busbaas-disco", handleDisco);
      window.removeEventListener("busbaas-screen", handleScreen);
      window.removeEventListener("busbaas-audio-preference", handlePreference);
      window.removeEventListener("busbaas-music-clock", handleMusicClock);
      audio.dispose();
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, []);

  return <>
    {children}
    <button className={`experience-sound-button${enabled ? "" : " disabled"}`} type="button"
      aria-label={enabled ? "Geluid uitschakelen" : "Geluid inschakelen"} aria-pressed={enabled}
      title={enabled ? "Geluid uitschakelen" : "Geluid inschakelen"}
      onClick={() => {
        enabledRef.current = !enabled;
        window.dispatchEvent(new Event("busbaas-audio-preference"));
        setEnabled(!enabled);
      }}>{enabled ? "🔊" : "🔇"}</button>
    {phase && <div key={phase} role="status" aria-live="polite" className={`experience-transition-layer experience-transition-${phase === "tree" ? "tree" : phase.startsWith("cards-") ? "cards" : "bus"}`}>
      <div className="experience-transition-background" />
      {phase === "tree" || phase.startsWith("cards-") ? <div className="experience-tree-cards" aria-hidden="true">
        {["♠", "♥", "♦", "♣"].map(suit => <span key={suit}>{suit}</span>)}
      </div> : <div aria-hidden="true">
        <span className="experience-road-line experience-road-line-one" />
        <span className="experience-road-line experience-road-line-two" />
        <span className="experience-road-line experience-road-line-three" />
      </div>}
      <div className="experience-transition-content">
        <div className="experience-transition-icon">{transitions[phase][0]}</div>
        <h2>{transitions[phase][1]}</h2><p>{transitions[phase][2]}</p>
        <button className="experience-transition-skip" type="button" onClick={() => setPhase(null)}>Verder →</button>
      </div>
    </div>}
  </>;
}

