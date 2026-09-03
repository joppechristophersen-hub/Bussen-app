import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App.tsx";
import CommerceShell from "./CommerceShell.tsx";
import ExperienceShell from "./ExperienceShell.tsx";

/*
 * Visuele Busbaas-polish bewust als laatste laden.
 * Deze stylesheet is alleen gescoped op home + lobby.
 */
import "./homeLobbyPolish.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CommerceShell>
      <ExperienceShell>
        <App />
      </ExperienceShell>
    </CommerceShell>
  </StrictMode>
);
