import { useEffect, useState, type ReactNode } from "react";
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
  return <>{children}<div className="bb-appearance-control">
    <label htmlFor="bb-appearance">Weergave</label>
    <select id="bb-appearance" value={appearance} onChange={event => setAppearance(event.target.value as Appearance)}>
      <option value="system">Automatisch</option><option value="light">Licht</option><option value="dark">Donker</option>
    </select>
  </div></>;
}
