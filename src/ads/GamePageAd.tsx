import { useSyncExternalStore } from "react";
import WebDisplayAd from "./WebDisplayAd";

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
  return playing ? <WebDisplayAd placement="game-footer" banner /> : null;
}
