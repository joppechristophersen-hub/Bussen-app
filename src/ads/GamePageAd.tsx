import { useEffect, useSyncExternalStore } from "react";
import { initializeWebAdSense } from "./WebAdSense";

function subscribe(listener: () => void) {
  window.addEventListener("busbaas-screen", listener);
  window.addEventListener("busbaas-phase", listener);
  return () => { window.removeEventListener("busbaas-screen", listener); window.removeEventListener("busbaas-phase", listener); };
}
function isPlaying() {
  const { appScreen, gamePhase } = document.documentElement.dataset;
  return appScreen === "game" && Boolean(gamePhase) && gamePhase !== "bus-finished";
}
const serverSnapshot = () => false;
export default function GamePageAd() {
  const playing = useSyncExternalStore(subscribe, isPlaying, serverSnapshot);
  useEffect(() => {
    if (playing) initializeWebAdSense({ anchors: true });
  }, [playing]);
  // Google owns the anchor, including its dismissal and availability. Repeated
  // turns/phases neither inject another script nor refresh an ad unit.
  return null;
}
