import {
  Capacitor,
} from "@capacitor/core";

import {
  AdMob,
  AdmobConsentStatus,
} from "@capacitor-community/admob";

import {
  type PrivacyConsent,
  getAdConsentMode,
  readPrivacyConsent,
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

    /*
     * Alleen web krijgt de
     * vaste advertentiebanner.
     */
    bannerEnabled:
      !isNative,

    /*
     * Web gebruikt de bestaande
     * BusBende eindadvertentie.
     *
     * Native wordt hieronder
     * door de AdMob watcher geregeld.
     */
    interstitialEnabled:
      !isNative,

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

export async function showNativeInterstitial({
  personalized,
}: {
  personalized:
    boolean;
}) {
  if (
    !Capacitor.isNativePlatform() ||
    interstitialBusy
  ) {
    return false;
  }

  interstitialBusy =
    true;

  try {
    const consentInfo =
      await requestNativeConsent();

    /*
     * Google UMP is uiteindelijk
     * beslissend of een advertentie
     * geladen mag worden.
     */
    if (
      !consentInfo.canRequestAds
    ) {
      return false;
    }

    const platform =
      Capacitor.getPlatform();

    const adId =
      platform ===
        "ios"
        ? IOS_TEST_INTERSTITIAL
        : ANDROID_TEST_INTERSTITIAL;

    await AdMob
      .prepareInterstitial({
        adId,

        /*
         * Tijdens ontwikkeling ALTIJD
         * Google's testadvertenties.
         */
        isTesting:
          true,

        /*
         * npa:
         *
         * true
         * = non-personalized
         *
         * false
         * = personalized toegestaan
         */
        npa:
          !personalized,
      });

    await AdMob
      .showInterstitial();

    return true;
  } catch (
    error
  ) {
    console.error(
      "Interstitial tonen mislukt:",
      error
    );

    return false;
  } finally {
    interstitialBusy =
      false;
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


/*
 * =========================
 * NATIVE ENDGAME WATCHER
 * =========================
 *
 * Bus klaar:
 *
 * 1. normaal BusBende eindscherm
 * 2. drie seconden wachten
 * 3. Google AdMob test-interstitial
 */

function installNativeEndgameWatcher() {
  if (
    !Capacitor.isNativePlatform()
  ) {
    return;
  }

  const globalWindow =
    window as typeof window & {
      __busbendeAdWatcherInstalled?:
        boolean;
  };

  if (
    globalWindow
      .__busbendeAdWatcherInstalled
  ) {
    return;
  }

  globalWindow
    .__busbendeAdWatcherInstalled =
      true;


  let gameWasFinished =
    false;

  let finishTimer:
    number | null =
      null;


  function checkFinishedGame() {
    const gameFinished =
      Boolean(
        document.querySelector(
          ".bus-finished-panel"
        )
      );


    /*
     * Nieuwe game-finish gevonden.
     */
    if (
      gameFinished &&
      !gameWasFinished
    ) {
      if (
        finishTimer !==
        null
      ) {
        window.clearTimeout(
          finishTimer
        );
      }


      finishTimer =
        window.setTimeout(
          () => {
            const privacy =
              readPrivacyConsent();

            const mode =
              getAdConsentMode(
                privacy
              );


            /*
             * BusBende zelf heeft nog
             * geen keuze opgeslagen.
             *
             * Dan laden we hier nog niets.
             */
            if (
              mode ===
                "blocked"
            ) {
              finishTimer =
                null;

              return;
            }


            void showNativeInterstitial({
              personalized:
                mode ===
                  "personalized",
            });


            finishTimer =
              null;
          },
          3000
        );
    }


    /*
     * Eindscherm is verdwenen voordat
     * de advertentietimer klaar was.
     */
    if (
      !gameFinished &&
      finishTimer !==
        null
    ) {
      window.clearTimeout(
        finishTimer
      );

      finishTimer =
        null;
    }


    gameWasFinished =
      gameFinished;
  }


  function startObserver() {
    const root =
      document.getElementById(
        "root"
      );

    if (
      !root
    ) {
      window.setTimeout(
        startObserver,
        250
      );

      return;
    }


    const observer =
      new MutationObserver(
        checkFinishedGame
      );


    observer.observe(
      root,
      {
        childList:
          true,

        subtree:
          true,
      }
    );


    checkFinishedGame();
  }


  startObserver();
}


/*
 * =========================
 * START NATIVE BRIDGES
 * =========================
 */

installNativePrivacyButtonBridge();

installNativeEndgameWatcher();


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