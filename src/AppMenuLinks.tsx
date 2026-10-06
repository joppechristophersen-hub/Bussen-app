import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { showPrivacyOptions } from "./ads/AdManager";

export default function AppMenuLinks() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function openPrivacy() {
    if (busy) return;
    if (!Capacitor.isNativePlatform()) {
      window.open("https://busbende.nl/privacy/", "_blank", "noopener,noreferrer");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (!await showPrivacyOptions()) setMessage("Privacy-instellingen konden niet worden geopend. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="bb-menu-links-wrap">
      <nav className="bb-menu-links" aria-label="Website en privacy">
        <a href="https://busbende.nl/" target="_blank" rel="noopener noreferrer"
          aria-label="Website openen in de browser">🌐 Website</a>
        <span aria-hidden="true">·</span>
        <button type="button" className="bb-menu-privacy" disabled={busy} onClick={() => void openPrivacy()}>
          {busy ? "Privacy openen…" : "Privacy-instellingen"}
        </button>
      </nav>
      {message && <p className="bb-menu-link-status" role="status">{message}</p>}
    </div>
  );
}
