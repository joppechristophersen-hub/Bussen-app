import {
  Capacitor,
} from "@capacitor/core";

import {
  AdMob,
  AdmobConsentStatus,
  InterstitialAdPluginEvents,
} from "@capacitor-community/admob";

import {
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
    "blocked" |
    "contextual" |
    "personalized";

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
 * GOOGLE TEST IDS
 * =========================
 */

const ANDROID_TEST_INTERSTITIAL =
  "ca-app-pub-3940256099942544/1033173712";

const IOS_TEST_INTERSTITIAL =
  "ca-app-pub-3940256099942544/4411468910";


let initialized =
  false;

let interstitialBusy =
  false;

let privacyFormBusy =
  false;


/*
 * =========================
 * AD RUNTIME
 * =========================
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
      isNative
        ? "admob"
        : "test",

    mode,

    canRequestAds,

    // Game, join and lobby never load web ads. Native endgame UI uses AdMob directly.
    bannerEnabled: false,
    interstitialEnabled: false,

    personalizedAds:
      mode ===
      "personalized",
  };
}


/*
 * =========================
 * ADMOB INITIALISEREN
 * =========================
 */

export async function initializeNativeAds() {
  if (
    !Capacitor.isNativePlatform()
  ) {
    return false;
  }

  if (
    initialized
  ) {
    return true;
  }

  try {
    await AdMob.initialize();

    initialized =
      true;

    return true;
  } catch (
    error
  ) {
    console.error(
      "AdMob initialiseren mislukt:",
      error
    );

    return false;
  }
}


/*
 * =========================
 * GOOGLE UMP CONSENT
 * =========================
 */

export async function requestNativeConsent() {
  if (
    !Capacitor.isNativePlatform()
  ) {
    return {
      canRequestAds:
        false,
    };
  }

  try {
    const ready =
      await initializeNativeAds();

    if (
      !ready
    ) {
      return {
        canRequestAds:
          false,
      };
    }

    let consentInfo =
      await AdMob
        .requestConsentInfo();

    /*
     * Google bepaalt zelf of het
     * formulier voor deze gebruiker
     * verplicht is.
     */
    if (
      consentInfo
        .isConsentFormAvailable &&
      consentInfo.status ===
        AdmobConsentStatus.REQUIRED
    ) {
      consentInfo =
        await AdMob
          .showConsentForm();
    }

    return consentInfo;
  } catch (
    error
  ) {
    console.error(
      "AdMob consent mislukt:",
      error
    );

    return {
      canRequestAds:
        false,
    };
  }
}


/*
 * =========================
 * GOOGLE PRIVACY OPTIONS
 * =========================
 *
 * Dit is het formulier waarmee een
 * gebruiker zijn eerdere privacykeuze
 * later opnieuw kan bekijken/wijzigen.
 */

export async function showPrivacyOptions() {
  if (
    !Capacitor.isNativePlatform() ||
    privacyFormBusy
  ) {
    return false;
  }

  privacyFormBusy =
    true;

  preparedAt = 0;
  preparationVersion += 1;

  try {
    const ready =
      await initializeNativeAds();

    if (
      !ready
    ) {
      return false;
    }

    /*
     * Eerst de huidige status bij Google
     * verversen.
     */
    await AdMob
      .requestConsentInfo();

    /*
     * Daarna Google's echte
     * privacy-options formulier openen.
     */
    await AdMob
      .showPrivacyOptionsForm();

    return true;
  } catch (
    error
  ) {
    console.error(
      "Google privacy-opties openen mislukt:",
      error
    );

    return false;
  } finally {
    privacyFormBusy =
      false;
  }
}


/*
 * =========================
 * NATIVE INTERSTITIAL
 * =========================
 */

let preparationVersion = 0;
let preparedAt = 0;
let preparedPersonalized = false;
let preparing: Promise<boolean> | null = null;

// Preload during the bus phase; never wait for network loading at the endgame deadline.
export function prepareNativeInterstitial(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || interstitialBusy) return Promise.resolve(false);
  if (preparedAt && Date.now() - preparedAt < 55 * 60 * 1000) return Promise.resolve(true);
  if (preparing) return preparing;
  const version = preparationVersion;
  preparing = (async () => {
    preparedAt = 0;
    try {
      const consent = await requestNativeConsent();
      if (!consent.canRequestAds) return false;
      // Conservative default: UMP still determines whether requests are permitted.
      preparedPersonalized = false;
      await AdMob.prepareInterstitial({
        adId: Capacitor.getPlatform() === "ios"
          ? IOS_TEST_INTERSTITIAL : ANDROID_TEST_INTERSTITIAL,
        isTesting: true,
        npa: true,
      });
      if (version !== preparationVersion) return false;
      preparedAt = Date.now();
      return true;
    } catch (error) {
      console.error("Interstitial laden mislukt:", error);
      return false;
    }
  })().finally(() => { preparing = null; });
  return preparing;
}

export async function showNativeInterstitial({ personalized }: { personalized: boolean }) {
  if (!Capacitor.isNativePlatform() || interstitialBusy || !preparedAt ||
      Date.now() - preparedAt > 55 * 60 * 1000 ||
      personalized !== preparedPersonalized || document.visibilityState !== "visible") return false;
  // Consume before showing: repeated taps cannot show a second ad.
  preparedAt = 0;
  interstitialBusy = true;
  const listeners: Array<{ remove: () => Promise<void> }> = [];
  let showTimeout: ReturnType<typeof setTimeout> | undefined;
  try {
    let finish!: (shown: boolean) => void;
    const dismissed = new Promise<boolean>((resolve) => { finish = resolve; });
    listeners.push(await AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
      clearTimeout(showTimeout);
    }));
    listeners.push(await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => finish(true)));
    listeners.push(await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => finish(false)));
    // The screen may have gone into the background while listeners were registered.
    if (document.visibilityState !== "visible") return false;
    showTimeout = setTimeout(() => finish(false), 10000);
    // Wait for the event outcome too: a plugin promise must not leave buttons locked.
    const showRequest = AdMob.showInterstitial().catch(error => {
      console.error("Interstitial tonen mislukt:", error);
      finish(false);
    });
    void showRequest;
    // showInterstitial() resolves when shown, not when the user closes the ad.
    return await dismissed;
  } catch (error) {
    console.error("Interstitial tonen mislukt:", error);
    return false;
  } finally {
    clearTimeout(showTimeout);
    await Promise.allSettled(listeners.map((listener) => listener.remove()));
    interstitialBusy = false;
  }
}

/*
 * =========================
 * PRIVACY BUTTON BRIDGE
 * =========================
 *
 * WEB:
 * De bestaande BusBende privacy-popup
 * blijft gewoon werken.
 *
 * ANDROID / iOS:
 * Dezelfde privacyknop opent Google's
 * echte UMP privacyformulier.
 */

function installNativePrivacyButtonBridge() {
  if (
    !Capacitor.isNativePlatform()
  ) {
    return;
  }

  const globalWindow =
    window as typeof window & {
      __busbendePrivacyBridgeInstalled?:
        boolean;
  };

  if (
    globalWindow
      .__busbendePrivacyBridgeInstalled
  ) {
    return;
  }

  globalWindow
    .__busbendePrivacyBridgeInstalled =
      true;


  function handlePrivacyButton(
    event:
      Event
  ) {
    const target =
      event.target;

    if (
      !(target instanceof Element)
    ) {
      return;
    }

    const privacyButton =
      target.closest(
        ".bb-privacy-launcher"
      );

    if (
      !privacyButton
    ) {
      return;
    }

    /*
     * Voorkomen dat React op native
     * óók de lokale test-popup opent.
     */
    event.preventDefault();

    event.stopPropagation();

    if (
      "stopImmediatePropagation" in
      event
    ) {
      event
        .stopImmediatePropagation();
    }

    void showPrivacyOptions();
  }


  /*
   * Capture = true is belangrijk.
   *
   * Hierdoor pakken we de klik vóór
   * React zijn onClick uitvoert.
   */
  document.addEventListener(
    "click",
    handlePrivacyButton,
    true
  );
}


// CommerceShell installs the native privacy bridge. Endgame ads are explicit React UI.
installNativePrivacyButtonBridge();

/*
 * =========================
 * HELPERS
 * =========================
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
