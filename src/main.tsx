import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App.tsx";
import CommerceShell from "./CommerceShell.tsx";

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <CommerceShell>
      <App />
    </CommerceShell>
  </StrictMode>
);