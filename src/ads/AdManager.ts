import {
  type AdConsentMode,
  type PrivacyConsent,
  getAdConsentMode,
} from "../privacy/ConsentManager";

export type AdPlatform =
  | "web"
  | "native";

export type AdProvider =
  | "test"
  | "web-provider"
  | "admob";

export type AdRuntime = {
  platform:
    AdPlatform;

  provider:
    AdProvider;

  mode:
    AdConsentMode;

  canRequestAds:
    boolean;

  bannerEnabled:
    boolean;

  interstitialEnabled:
    boolean;

  personalizedAds:
    boolean;
};

/*
 * =========================
 * BUSBENDE AD MANAGER
 * =========================
 *
 * Dit bestand wordt de centrale plek voor advertenties.
 *
 * Nu:
 * - provider = test
 * - geen externe advertentie-SDK
 * - geen netwerkrequest naar een advertentieplatform
 *
 * Later:
 * - web -> web-provider
 * - Android/iOS -> AdMob
 *
 * De rest van de app hoeft dan niet te weten
 * welke advertentieprovider erachter zit.
 */

export function createAdRuntime({
  consent,
  isNative,
}: {
  consent:
    PrivacyConsent;

  isNative:
    boolean;
}): AdRuntime {
  const mode =
    getAdConsentMode(
      consent
    );

  const canRequestAds =
    mode !==
    "blocked";

  return {
    platform:
      isNative
        ? "native"
        : "web",

    provider:
      "test",

    mode,

    canRequestAds,

    /*
     * Strategie BusBende:
     *
     * Web:
     * vaste banner onderin.
     *
     * Native:
     * geen vaste banner.
     */
    bannerEnabled:
      !isNative,

    /*
     * Zowel web als native mogen later
     * een eindadvertentie tonen na een
     * volledig potje.
     */
    interstitialEnabled:
      true,

    personalizedAds:
      mode ===
      "personalized",
  };
}

/*
 * Deze helpers zijn alvast bedoeld voor
 * de echte provider-integratie.
 */

export function shouldLoadWebBanner(
  runtime:
    AdRuntime
) {
  return (
    runtime.platform ===
      "web" &&
    runtime.bannerEnabled &&
    runtime.canRequestAds
  );
}

export function shouldLoadInterstitial(
  runtime:
    AdRuntime
) {
  return (
    runtime.interstitialEnabled &&
    runtime.canRequestAds
  );
}
