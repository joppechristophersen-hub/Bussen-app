import { Capacitor } from "@capacitor/core";

// Loaded only when a real, visible web placement is ready to request an ad.
export function initializeWebAdSense() {
  if (Capacitor.isNativePlatform() ||
      !["busbende.nl", "www.busbende.nl"].includes(window.location.hostname)) return null;
  const existing = document.getElementById("busbende-adsense") as HTMLScriptElement | null;
  if (existing) return existing.dataset.failed ? null : existing;

  const script = document.createElement("script");
  script.id = "busbende-adsense";
  script.async = true;
  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4480846179004064";
  script.crossOrigin = "anonymous";
  script.addEventListener("error", () => { script.dataset.failed = "true"; }, { once: true });
  document.head.appendChild(script);
  return script;
}
