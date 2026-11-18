import { Capacitor } from "@capacitor/core";

export function isAnchorContentPath(path: string) {
  return ["/", "/spelregels", "/veelgestelde-vragen"].includes(path.replace(/\/+$/, "") || "/");
}

export function leaveWebAnchorPage() {
  if (Capacitor.isNativePlatform() || !["busbende.nl", "www.busbende.nl"].includes(window.location.hostname) || document.documentElement.dataset.bbAutoAnchors !== "true") return false;
  // Google's anchor has no publisher hide API. A completed/closed room returns
  // to a clean menu document; we never remove or modify Google's iframe.
  window.location.replace("/spelen/");
  return true;
}

// Use Google's supported anchor format; never pin a display unit ourselves.
export function initializeWebAdSense({ anchors = false } = {}) {
  if (Capacitor.isNativePlatform() ||
      !["busbende.nl", "www.busbende.nl"].includes(window.location.hostname)) return null;
  const existing = document.getElementById("busbende-adsense") as HTMLScriptElement | null;
  if (existing) return existing.dataset.failed ? null : existing;

  const script = document.createElement("script");
  script.id = "busbende-adsense";
  script.async = true;
  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4480846179004064";
  script.crossOrigin = "anonymous";
  if (anchors) {
    // Official modification: ordinary, dismissible anchors at the bottom only.
    // https://support.google.com/adsense/answer/7478225
    script.dataset.overlays = "collapsed-bottom";
    document.documentElement.dataset.bbAutoAnchors = "true";
  }
  script.addEventListener("error", () => {
    script.dataset.failed = "true";
    delete document.documentElement.dataset.bbAutoAnchors;
  }, { once: true });
  document.head.appendChild(script);
  return script;
}
