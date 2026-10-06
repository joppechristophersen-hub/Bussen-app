import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import "./App.css";
import "./commerce.css";

const App = lazy(() => import("./App"));
import ExperienceShell from "./ExperienceShell";
import "./gameEffects.css";
import CommerceShell from "./CommerceShell";
import PublicSite from "./PublicSite";
import WebJoinGate from "./WebJoinGate";

import "./public-site.css";
import "./app-branding.css";
import "./app-polish.css";
import "./mobile.css";
import { initializeWebAdSense } from "./ads/WebAdSense";

initializeWebAdSense();

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <CommerceShell>
      <PublicSite>
        <WebJoinGate>
          <Suspense fallback={<main className="app" role="status">BusBende laden…</main>}>
            <ExperienceShell><App /></ExperienceShell>
          </Suspense>
        </WebJoinGate>
      </PublicSite>
    </CommerceShell>
  </StrictMode>
);
