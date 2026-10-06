import { Capacitor } from "@capacitor/core";

// The supplied site-verification/AdSense loader. Placement remains configured
// separately: loading this does not create an endgame ad unit.
export function initializeWebAdSense() {
  if (Capacitor.isNativePlatform() ||
      !["busbende.nl", "www.busbende.nl"].includes(window.location.hostname) ||
      document.getElementById("busbende-adsense")) return;

  const script = document.createElement("script");
  script.id = "busbende-adsense";
  script.async = true;
  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4480846179004064";
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}
