import { type ReactNode, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { prepareNativeInterstitial, showNativeInterstitial } from "./AdManager";

// Every native participant gets one announced ad break after the result.
export default function NativeEndgameAd({ children }: { children: ReactNode }) {
  const native = Capacitor.isNativePlatform();
  const [complete, setComplete] = useState(!native);
  const [showing, setShowing] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!native) return;
    let active = true;
    // Fallback preload. If it finishes after the deadline, no delayed ad appears.
    void prepareNativeInterstitial();
    const timer = window.setTimeout(() => {
      if (started.current || !active) return;
      started.current = true;
      setShowing(true);
      void showNativeInterstitial({ personalized: false }).finally(() => {
        if (active) {
          setShowing(false);
          setComplete(true);
        }
      });
    }, 3000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [native]);

  if (complete) return <>{children}</>;
  return (
    <div className="bb-endgame-ad" role="status" aria-live="polite">
      <p>{showing ? "Advertentiepauze. Daarna kun je verder." :
        "Het potje is afgelopen. Over 3 seconden volgt een advertentiepauze; daarna verschijnen de eindknoppen."}</p>
    </div>
  );
}
