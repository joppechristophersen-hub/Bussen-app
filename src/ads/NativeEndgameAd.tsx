import { type ReactNode, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { prepareNativeInterstitial, showNativeInterstitial } from "./AdManager";

// Every native participant gets one announced ad break after the result.
export default function NativeEndgameAd({ children }: { children: ReactNode }) {
  const native = Capacitor.isNativePlatform();
  const [complete, setComplete] = useState(!native);
  const [showing, setShowing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!native) return;
    let active = true;
    let expired = false;
    let minimumTimer: ReturnType<typeof setTimeout>;
    // Give slow connections time to finish preloading instead of discarding the
    // ad at exactly three seconds. Never leave the end buttons blocked forever.
    const maximumTimer = setTimeout(() => {
      expired = true;
      if (active && !started.current) {
        setUnavailable(true);
        setComplete(true);
      }
    }, 12000);
    const minimumDelay = new Promise<void>(resolve => {
      minimumTimer = setTimeout(resolve, 3000);
    });
    const preparation = prepareNativeInterstitial().then(ready => {
      if (!ready && active && !expired) {
        clearTimeout(maximumTimer);
        setUnavailable(true);
        setComplete(true);
      }
      return ready;
    });
    void Promise.all([preparation, minimumDelay]).then(async ([ready]) => {
      if (!active || expired || started.current) return;
      clearTimeout(maximumTimer);
      if (!ready) {
        setUnavailable(true);
        setComplete(true);
        return;
      }
      started.current = true;
      setShowing(true);
      try {
        const shown = await showNativeInterstitial({ personalized: false });
        if (active) setUnavailable(!shown);
      } finally {
        if (active) {
          setShowing(false);
          setComplete(true);
        }
      }
    }).catch(() => {
      clearTimeout(maximumTimer);
      if (active) { setUnavailable(true); setComplete(true); }
    });
    return () => { active = false; clearTimeout(minimumTimer); clearTimeout(maximumTimer); };
  }, [native]);

  if (complete) return <>
    {unavailable && <p className="bb-endgame-ad" role="status">Er is nu geen advertentie beschikbaar. Je kunt verder spelen.</p>}
    {children}
  </>;
  return (
    <div className="bb-endgame-ad" role="status" aria-live="polite">
      <p>{showing ? "Advertentiepauze. Daarna kun je verder." :
        "Advertentie laden… Daarna kun je een nieuw potje starten."}</p>
    </div>
  );
}
