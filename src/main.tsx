import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App.tsx";
import CommerceShell from "./CommerceShell.tsx";
import ExperienceShell from "./ExperienceShell.tsx";

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <CommerceShell>
      <ExperienceShell>
        <App />
      </ExperienceShell>
    </CommerceShell>
  </StrictMode>
);