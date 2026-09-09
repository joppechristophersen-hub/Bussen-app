export type PrivacyConsentStatus =
  | "unknown"
  | "contextual"
  | "personalized";

export type PrivacyConsent = {
  version: 1;
  status: PrivacyConsentStatus;
  updatedAt: string | null;
};

export type AdConsentMode =
  | "blocked"
  | "contextual"
  | "personalized";

const STORAGE_KEY =
  "busbende-privacy-consent-v1";

const CONSENT_EVENT =
  "busbende-privacy-consent-changed";

const DEFAULT_CONSENT: PrivacyConsent = {
  version: 1,
  status: "unknown",
  updatedAt: null,
};

export function readPrivacyConsent():
  PrivacyConsent {
  try {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return DEFAULT_CONSENT;
    }

    const parsed =
      JSON.parse(
        raw
      ) as Partial<PrivacyConsent>;

    if (
      parsed.version !== 1 ||
      (
        parsed.status !==
          "unknown" &&
        parsed.status !==
          "contextual" &&
        parsed.status !==
          "personalized"
      )
    ) {
      return DEFAULT_CONSENT;
    }

    return {
      version: 1,
      status: parsed.status,
      updatedAt:
        typeof parsed.updatedAt ===
        "string"
          ? parsed.updatedAt
          : null,
    };
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function savePrivacyConsent({
  status,
}: {
  status:
    Exclude<
      PrivacyConsentStatus,
      "unknown"
    >;
}): PrivacyConsent {
  const consent: PrivacyConsent = {
    version: 1,
    status,
    updatedAt:
      new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        consent
      )
    );
  } catch {
    // De app blijft bruikbaar als lokale opslag niet beschikbaar is.
  }

  window.dispatchEvent(
    new CustomEvent(
      CONSENT_EVENT,
      {
        detail:
          consent,
      }
    )
  );

  return consent;
}

export function resetPrivacyConsent():
  PrivacyConsent {
  try {
    window.localStorage.removeItem(
      STORAGE_KEY
    );
  } catch {
    // Geen verdere actie nodig.
  }

  window.dispatchEvent(
    new CustomEvent(
      CONSENT_EVENT,
      {
        detail:
          DEFAULT_CONSENT,
      }
    )
  );

  return DEFAULT_CONSENT;
}

export function getAdConsentMode(
  consent:
    PrivacyConsent
): AdConsentMode {
  if (
    consent.status ===
    "personalized"
  ) {
    return "personalized";
  }

  if (
    consent.status ===
    "contextual"
  ) {
    return "contextual";
  }

  return "blocked";
}

export function canRequestAds(
  consent:
    PrivacyConsent
) {
  return (
    getAdConsentMode(
      consent
    ) !==
    "blocked"
  );
}

export function canUsePersonalizedAds(
  consent:
    PrivacyConsent
) {
  return (
    getAdConsentMode(
      consent
    ) ===
    "personalized"
  );
}

export const privacyConsentChangedEvent =
  CONSENT_EVENT;
