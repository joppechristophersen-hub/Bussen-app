import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import "./App.css";
import "./commerce.css";

import App from "./App";
import CommerceShell from "./CommerceShell";
import PublicSite from "./PublicSite";
import WebJoinGate from "./WebJoinGate";

import "./public-site.css";
import "./app-branding.css";
import "./app-polish.css";

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <CommerceShell>
      <PublicSite>
        <WebJoinGate>
          <App />
        </WebJoinGate>
      </PublicSite>
    </CommerceShell>
  </StrictMode>
);
