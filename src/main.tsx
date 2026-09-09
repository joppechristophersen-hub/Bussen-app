import {
  StrictMode,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import "./index.css";

import App from "./App.tsx";

import CommerceShell from "./CommerceShell.tsx";

import ExperienceShell from "./ExperienceShell.tsx";

import WebJoinGate from "./WebJoinGate.tsx";


/*
 * Visuele BusBende-polish
 * bewust als laatste laden.
 */
import "./homeLobbyPolish.css";


document.title =
  "BusBende";


createRoot(
  document.getElementById(
    "root"
  )!
).render(
  <StrictMode>

    <CommerceShell>

      <WebJoinGate>

        <ExperienceShell>

          <App />

        </ExperienceShell>

      </WebJoinGate>

    </CommerceShell>

  </StrictMode>
);