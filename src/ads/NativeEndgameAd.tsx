import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { prepareNativeInterstitial, showNativeInterstitial } from "./AdManager";

// An announced, optional break after the score screen, never a pre-game ad.
export default function NativeEndgameAd() {
  const [ready, setReady] = useState(false);
  const [used, setUsed] = useState(false);
  const consumed = useRef(false);
  useEffect(() => {
    let active = true;
    if (Capacitor.isNativePlatform()) {
      void prepareNativeInterstitial().then((loaded) => {
        if (active) setReady(loaded);
      });
    }
    return () => { active = false; };
  }, []);

  if (!Capacitor.isNativePlatform() || !ready || used) return null;
  return (
    <div className="bb-endgame-ad">
      <p>Het potje is afgelopen. Je kunt nu een advertentie bekijken of direct verdergaan.</p>
      <button type="button" className="start-button secondary" onClick={() => {
        if (consumed.current) return;
        consumed.current = true;
        setUsed(true);
        void showNativeInterstitial({ personalized: false });
      }}>Advertentie bekijken</button>
    </div>
  );
}
