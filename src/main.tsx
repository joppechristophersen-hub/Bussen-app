import { lazy, StrictMode, Suspense } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";

import "./index.css";
import "./App.css";

const App = lazy(() => import("./App"));
import ExperienceShell from "./ExperienceShell";
import "./gameEffects.css";
import CommerceShell from "./CommerceShell";
import { PublicPage } from "./PublicSite";
import { isPublicPath, normalizePublicPath, publicPages } from "./publicPages";
import WebJoinGate from "./WebJoinGate";
import GamePageAd from "./ads/GamePageAd";
import { initializeWebAdSense, isAnchorContentPath } from "./ads/WebAdSense";
import AnchorPreview from "./ads/AnchorPreview";

import "./public-site.css";
import "./app-branding.css";
import "./app-polish.css";
import "./mobile.css";
import "./ads/auto-anchors.css";
const root = document.getElementById("root")!;
const path = normalizePublicPath(window.location.pathname);
if (isAnchorContentPath(path)) initializeWebAdSense({ anchors: true });
if (!Capacitor.isNativePlatform() && isPublicPath(path)) {
  document.title = publicPages[path].title;
  const content = <StrictMode><PublicPage path={path} /><AnchorPreview /></StrictMode>;
  if (root.dataset.bbPrerender === path) hydrateRoot(root, content);
  else createRoot(root).render(content);
} else createRoot(root).render(
  <StrictMode>
    <CommerceShell>
      <WebJoinGate>
        <Suspense fallback={<main className="app" role="status">BusBende laden…</main>}>
          <ExperienceShell><App /></ExperienceShell>
        </Suspense>
      </WebJoinGate>
    </CommerceShell>
    <GamePageAd />
    <AnchorPreview />
  </StrictMode>
);
