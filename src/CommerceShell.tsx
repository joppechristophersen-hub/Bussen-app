import { useEffect, useRef, useState, type ReactNode } from "react";
import "./ads/AdManager";
import "./appearance.css";

type Appearance = "system" | "light" | "dark";
const storageKey = "busbaas-appearance-mode";
const palettes = {
  light: { background: "#f6f0df", surface: "#fffaf0", "surface-soft": "#efe6c9", accent: "#f6c945", "accent-strong": "#d99d20", text: "#24251f", muted: "#6c6656", border: "#d6c99f" },
  dark: { background: "#080d0b", surface: "#111815", "surface-soft": "#1b201b", accent: "#f6c945", "accent-strong": "#d99d20", text: "#fff8df", muted: "#bdb6a1", border: "#30372f" },
};
function readAppearance(): Appearance {
  try { const stored = localStorage.getItem(storageKey); return stored === "light" || stored === "dark" ? stored : "system"; } catch { return "system"; }
}

// Keep the saved appearance preference without loading a shop or product catalog.
export default function CommerceShell({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(readAppearance);
  const appearanceDialog = useRef<HTMLDialogElement>(null);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const changed = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    const mode = appearance === "system" ? systemDark ? "dark" : "light" : appearance;
    const root = document.documentElement;
    for (const [name, value] of Object.entries(palettes[mode])) root.style.setProperty(`--bb-${name}`, value);
    root.style.colorScheme = mode;
    document.body.dataset.bbTheme = "theme-classic";
    document.body.dataset.bbColorMode = mode;
    document.body.dataset.bbAppearance = appearance;
    document.body.dataset.bbCardBack = "classic";
    document.body.dataset.bbAnimation = "classic";
    try { localStorage.setItem(storageKey, appearance); } catch { /* Appearance also works without storage. */ }
  }, [appearance, systemDark]);
  const modes: [Appearance, string, string][] = [["system", "Automatisch", "Volg de instelling van je toestel"], ["light", "Licht", "Lichte achtergrond met donkere tekst"], ["dark", "Donker", "Donkere achtergrond met lichte tekst"]];
  return <>{children}
    <button type="button" className="experience-sound-button bb-appearance-button"
      aria-label="Weergave aanpassen" title="Weergave aanpassen" aria-haspopup="dialog" aria-controls="bb-appearance-dialog"
      onClick={() => appearanceDialog.current?.showModal()}><span aria-hidden="true">◐</span></button>
    <dialog ref={appearanceDialog} id="bb-appearance-dialog" className="bb-appearance-dialog" aria-labelledby="bb-appearance-title"
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="bb-appearance-panel">
        <header><h2 id="bb-appearance-title">Weergave</h2><button type="button" aria-label="Weergave sluiten" onClick={() => appearanceDialog.current?.close()}>×</button></header>
        <fieldset><legend>Kies hoe BusBende eruitziet</legend>
          {modes.map(([mode, label, description]) => <label key={mode}>
            <input type="radio" name="bb-appearance" value={mode} checked={appearance === mode}
              onChange={() => { setAppearance(mode); appearanceDialog.current?.close(); }} />
            <span><strong>{label}</strong><small>{description}</small></span>
          </label>)}
        </fieldset>
      </div>
    </dialog>
  </>;
}
