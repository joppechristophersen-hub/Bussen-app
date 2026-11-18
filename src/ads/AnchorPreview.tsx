import { useEffect, useState, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

const subscribe = () => () => {};
const serverSnapshot = () => false;
function previewEnabled() {
  return !Capacitor.isNativePlatform() && ["localhost", "127.0.0.1"].includes(window.location.hostname) && new URLSearchParams(window.location.search).get("previewAds") === "1";
}

// Local layout preview only. No Google markup, advertiser or ad requests.
export default function AnchorPreview() {
  const enabled = useSyncExternalStore(subscribe, previewEnabled, serverSnapshot);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!enabled || closed) return;
    document.documentElement.dataset.bbAutoAnchors = "true";
    return () => { delete document.documentElement.dataset.bbAutoAnchors; };
  }, [enabled, closed]);
  if (!enabled || closed) return null;
  return <aside className="bb-anchor-preview" aria-label="Voorbeeld van de advertentiepositie">
    <div><strong>Voorbeeld advertentiepositie</strong><small>Lokale test · geen echte advertentie</small></div>
    <button type="button" aria-label="Voorbeeld sluiten" onClick={() => setClosed(true)}>×</button>
  </aside>;
}
