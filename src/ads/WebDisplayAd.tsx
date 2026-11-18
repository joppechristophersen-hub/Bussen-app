import { useEffect, useRef, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { initializeWebAdSense } from "./WebAdSense";
import "./web-display-ad.css";

const requestedSlots = new WeakSet<HTMLElement>();
const subscribe = () => () => {};
const serverEligible = () => false;
function browserEligible() {
  return !Capacitor.isNativePlatform() && ["busbende.nl", "www.busbende.nl"].includes(window.location.hostname);
}

export default function WebDisplayAd({ placement, banner = false }: { placement: string; banner?: boolean }) {
  const eligible = useSyncExternalStore(subscribe, browserEligible, serverEligible);
  const containerRef = useRef<HTMLElement>(null);
  const slotRef = useRef<HTMLModElement>(null);
  useEffect(() => {
    const slot = slotRef.current;
    const container = containerRef.current;
    if (!eligible || !slot || !container) return;
    let disposed = false;
    let nearby = false;
    let script: HTMLScriptElement | null = null;
    const hide = () => { container.hidden = true; };
    // React StrictMode can replay the effect after the initial request.
    if (requestedSlots.has(slot)) {
      script = document.getElementById("busbende-adsense") as HTMLScriptElement | null;
      if (script?.dataset.failed) hide();
      script?.addEventListener("error", hide, { once: true });
    }
    function request() {
      if (disposed || !nearby || document.hidden || requestedSlots.has(slot!)) return;
      const width = slot!.getBoundingClientRect().width;
      const containerWidth = container!.getBoundingClientRect().width;
      if (width < (banner ? 300 : 250) || containerWidth < width) return;
      requestedSlots.add(slot!);
      script = initializeWebAdSense();
      if (!script) { hide(); return; }
      script.addEventListener("error", hide, { once: true });
      try {
        const adsWindow = window as Window & { adsbygoogle?: Array<Record<string, never>> };
        (adsWindow.adsbygoogle ??= []).push({});
      } catch { hide(); }
    }
    const intersection = new IntersectionObserver(entries => {
      nearby = entries.some(entry => entry.isIntersecting);
      request();
    }, { rootMargin: "200px 0px" });
    intersection.observe(container);
    const resize = new ResizeObserver(request);
    resize.observe(container);
    const status = new MutationObserver(() => { if (slot.getAttribute("data-ad-status") === "unfilled") hide(); });
    status.observe(slot, { attributes: true, attributeFilter: ["data-ad-status"] });
    document.addEventListener("visibilitychange", request);
    return () => { disposed = true; intersection.disconnect(); resize.disconnect(); status.disconnect(); script?.removeEventListener("error", hide); document.removeEventListener("visibilitychange", request); };
  }, [eligible, banner]);
  if (!eligible) return null;
  return <aside ref={containerRef} className={`bb-display-ad${banner ? " bb-display-ad-banner" : ""}`} aria-label="Advertentie" data-placement={placement}>
    <small>Advertentie</small>
    <ins ref={slotRef} className="adsbygoogle" style={{ display: banner ? "inline-block" : "block" }}
      data-ad-client="ca-pub-4480846179004064" data-ad-slot="7878147054"
      data-ad-format={banner ? undefined : "auto"} data-full-width-responsive="false" />
  </aside>;
}
