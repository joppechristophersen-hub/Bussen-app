import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { initializeWebAdSense } from "./WebAdSense";

const requestedSlots = new WeakSet<HTMLElement>();
const publisher = "ca-pub-4480846179004064";

export default function WebEndgameAd() {
  const slotRef = useRef<HTMLModElement>(null);
  const eligible = !Capacitor.isNativePlatform() &&
    ["busbende.nl", "www.busbende.nl"].includes(window.location.hostname);

  useEffect(() => {
    const slot = slotRef.current;
    if (!eligible || !slot) return;
    initializeWebAdSense();
    function request() {
      if (!slot || slot.getBoundingClientRect().width < 1 || requestedSlots.has(slot)) return;
      requestedSlots.add(slot);
      try {
        const adsWindow = window as Window & { adsbygoogle?: Array<Record<string, never>> };
        (adsWindow.adsbygoogle ??= []).push({});
      } catch {
        // Ad blockers or an unavailable provider must never block the next game.
        slot.closest<HTMLElement>(".bb-web-endgame-ad")?.setAttribute("hidden", "");
      }
    }
    const frame = requestAnimationFrame(request);
    const observer = new ResizeObserver(request);
    observer.observe(slot);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [eligible]);

  if (!eligible) return null;
  return <aside className="bb-web-endgame-ad" aria-label="Advertentie">
    <small>Advertentie</small>
    <ins ref={slotRef} className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client={publisher} data-ad-slot="7878147054"
      data-ad-format="auto" data-full-width-responsive="true" />
  </aside>;
}
