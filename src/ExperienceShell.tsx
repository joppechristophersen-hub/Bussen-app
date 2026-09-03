import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import "./gameEffects.css";

type ExperienceShellProps = {
  children: ReactNode;
};

type AppPhase =
  | "cards"
  | "tree"
  | "bus"
  | "bus-finished"
  | "other";

type TransitionType =
  | "tree"
  | "bus";

type TransitionState = {
  type: TransitionType;
  eyebrow: string;
  title: string;
  text: string;
  icon: string;
};

const SOUND_STORAGE_KEY =
  "busbaas-sound-enabled";

const CARD_SOUNDS = [
  "/sounds/card-take-1.mp3",
  "/sounds/card-take-2.mp3",
  "/sounds/card-take-3.mp3",
  "/sounds/card-place.mp3",
];

const GLASS_SOUND =
  "/sounds/glass-clink.mp3";

const FINISH_SOUND =
  "/sounds/finish-cheer.mp3";

/*
 * =========================================================
 * REAL AUDIO ENGINE
 * =========================================================
 */

class BusbaasAudioEngine {
  private templates =
    new Map<
      string,
      HTMLAudioElement
    >();

  private lastCardSoundTime =
    0;

  constructor() {
    [
      ...CARD_SOUNDS,
      GLASS_SOUND,
      FINISH_SOUND,
    ].forEach(
      (source) => {
        const audio =
          new Audio(
            source
          );

        audio.preload =
          "auto";

        this.templates.set(
          source,
          audio
        );
      }
    );
  }

  /*
   * Browser/mobile audio alvast activeren
   * na de eerste gebruikersinteractie.
   */

  async unlock() {
    try {
      const source =
        CARD_SOUNDS[0];

      const template =
        this.templates.get(
          source
        );

      if (!template) {
        return;
      }

      const player =
        template.cloneNode(
          true
        ) as HTMLAudioElement;

      player.volume =
        0;

      await player.play();

      player.pause();

      player.currentTime =
        0;
    } catch {
      /*
       * Sommige browsers laten dit niet toe.
       * Android/Capacitor kan daarna alsnog
       * gewoon geluid afspelen.
       */
    }
  }

  private playFile(
    source: string,
    options?: {
      volume?: number;
      playbackRate?: number;
    }
  ) {
    try {
      const template =
        this.templates.get(
          source
        );

      if (!template) {
        return;
      }

      const player =
        template.cloneNode(
          true
        ) as HTMLAudioElement;

      player.volume =
        Math.max(
          0,
          Math.min(
            1,
            options?.volume ??
              1
          )
        );

      player.playbackRate =
        options?.playbackRate ??
        1;

      player.currentTime =
        0;

      const promise =
        player.play();

      if (
        promise
      ) {
        void promise.catch(
          () => {
            // Audio mag gameplay nooit blokkeren.
          }
        );
      }
    } catch {
      // Audio mag nooit de app crashen.
    }
  }

  /*
   * =========================================================
   * CARD
   * =========================================================
   *
   * We kiezen iedere keer willekeurig één echte
   * kaartopname en variëren héél licht in snelheid.
   *
   * Daardoor klinkt niet iedere kaart exact hetzelfde.
   */

  playCard() {
    const now =
      performance.now();

    /*
     * Beschermt tegen meerdere DOM updates
     * binnen enkele milliseconden die bij
     * dezelfde kaart horen.
     */

    if (
      now -
        this.lastCardSoundTime <
      65
    ) {
      return;
    }

    this.lastCardSoundTime =
      now;

    const index =
      Math.floor(
        Math.random() *
          CARD_SOUNDS.length
      );

    const source =
      CARD_SOUNDS[
        index
      ];

    const playbackRate =
      0.97 +
      Math.random() *
        0.06;

    const volume =
      0.7 +
      Math.random() *
        0.08;

    this.playFile(
      source,
      {
        volume,
        playbackRate,
      }
    );
  }

  /*
   * =========================================================
   * GLASS
   * =========================================================
   */

  playGlass() {
    this.playFile(
      GLASS_SOUND,
      {
        volume: 0.78,
        playbackRate: 1,
      }
    );
  }

  /*
   * =========================================================
   * FINISH
   * =========================================================
   */

  playFinish() {
    this.playFile(
      FINISH_SOUND,
      {
        volume: 0.72,
        playbackRate: 1,
      }
    );
  }
}

const audioEngine =
  new BusbaasAudioEngine();

/*
 * =========================================================
 * STORAGE
 * =========================================================
 */

function readSoundEnabled() {
  try {
    return (
      localStorage.getItem(
        SOUND_STORAGE_KEY
      ) !== "false"
    );
  } catch {
    return true;
  }
}

/*
 * =========================================================
 * PHASE DETECTION
 * =========================================================
 */

function detectPhase():
  AppPhase {
  if (
    document.querySelector(
      ".bus-finished-panel"
    )
  ) {
    return "bus-finished";
  }

  if (
    document.querySelector(
      ".bus-screen"
    )
  ) {
    return "bus";
  }

  if (
    document.querySelector(
      ".tree-screen"
    )
  ) {
    return "tree";
  }

  if (
    document.querySelector(
      ".game-card"
    )
  ) {
    return "cards";
  }

  return "other";
}

/*
 * =========================================================
 * CARD SIGNATURE
 * =========================================================
 *
 * Alle plaatsen waar daadwerkelijk een kaart
 * zichtbaar kan worden of veranderen.
 *
 * Daardoor werkt hetzelfde kaartgeluid bij:
 *
 * - voorronde
 * - handkaarten
 * - boom
 * - Adtje
 * - gelijkspel
 * - bus bepalen
 * - bus
 */

function getCardSignature() {
  const selector = [
    ".playing-card",
    ".revealed-card",
    ".tree-card-face",
    ".tree-active-card",
    ".mini-playing-card",
    ".setup-card:not(.placeholder)",
    ".bus-card-face",
    ".bus-reference-card",
  ].join(
    ","
  );

  const cards =
    Array.from(
      document.querySelectorAll(
        selector
      )
    );

  return cards
    .map(
      (
        card,
        index
      ) => {
        const content =
          card.textContent
            ?.replace(
              /\s+/g,
              " "
            )
            .trim() ??
          "";

        return [
          index,
          card.className,
          content,
        ].join(
          ":"
        );
      }
    )
    .join(
      "|"
    );
}

/*
 * =========================================================
 * SPEAKER ICON
 * =========================================================
 *
 * Geen emoji meer voor de sound-knop.
 */

function SpeakerIcon({
  muted,
}: {
  muted: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6.5 8.5H3.5v7h3L11 19V5Z" />

      {!muted && (
        <>
          <path d="M15 9.2a4 4 0 0 1 0 5.6" />
          <path d="M17.8 6.8a7.3 7.3 0 0 1 0 10.4" />
        </>
      )}

      {muted && (
        <>
          <path d="m15.5 9 5 6" />
          <path d="m20.5 9-5 6" />
        </>
      )}
    </svg>
  );
}

/*
 * =========================================================
 * EXPERIENCE SHELL
 * =========================================================
 */

function ExperienceShell({
  children,
}: ExperienceShellProps) {
  const [
    soundEnabled,
    setSoundEnabled,
  ] =
    useState(
      readSoundEnabled
    );

  const [
    transition,
    setTransition,
  ] =
    useState<TransitionState | null>(
      null
    );

  const [
    soundToast,
    setSoundToast,
  ] =
    useState<string | null>(
      null
    );

  const soundEnabledRef =
    useRef(
      soundEnabled
    );

  const previousPhaseRef =
    useRef<AppPhase | null>(
      null
    );

  const initializedRef =
    useRef(false);

  const transitionTimerRef =
    useRef<number | null>(
      null
    );

  const toastTimerRef =
    useRef<number | null>(
      null
    );

  const previousCardSignatureRef =
    useRef("");

  const seenFinishedPanelsRef =
    useRef(
      new WeakSet<Element>()
    );

  /*
   * =========================================================
   * SOUND SETTING
   * =========================================================
   */

  useEffect(() => {
    soundEnabledRef.current =
      soundEnabled;

    localStorage.setItem(
      SOUND_STORAGE_KEY,
      String(
        soundEnabled
      )
    );
  }, [
    soundEnabled,
  ]);

  /*
   * =========================================================
   * AUDIO UNLOCK
   * =========================================================
   */

  useEffect(() => {
    function unlockAudio() {
      if (
        soundEnabledRef.current
      ) {
        void audioEngine.unlock();
      }
    }

    window.addEventListener(
      "pointerdown",
      unlockAudio,
      {
        passive: true,
        once: true,
      }
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        unlockAudio
      );
    };
  }, []);

  function playCard() {
    if (
      soundEnabledRef.current
    ) {
      audioEngine.playCard();
    }
  }

  function playGlass() {
    if (
      soundEnabledRef.current
    ) {
      audioEngine.playGlass();
    }
  }

  function playFinish() {
    if (
      soundEnabledRef.current
    ) {
      audioEngine.playFinish();
    }
  }

  /*
   * =========================================================
   * TRANSITIONS
   * =========================================================
   */

  function showTransition(
    next:
      TransitionState,
    duration:
      number
  ) {
    if (
      transitionTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        transitionTimerRef.current
      );
    }

    setTransition(
      next
    );

    transitionTimerRef.current =
      window.setTimeout(
        () => {
          setTransition(
            null
          );

          transitionTimerRef.current =
            null;
        },
        duration
      );
  }

  function showSoundToast(
    text:
      string
  ) {
    if (
      toastTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        toastTimerRef.current
      );
    }

    setSoundToast(
      text
    );

    toastTimerRef.current =
      window.setTimeout(
        () => {
          setSoundToast(
            null
          );

          toastTimerRef.current =
            null;
        },
        1100
      );
  }

  /*
   * =========================================================
   * CARD / PHASE OBSERVER
   * =========================================================
   */

  useEffect(() => {
    const root =
      document.getElementById(
        "root"
      );

    if (!root) {
      return;
    }

    function handlePhase() {
      const phase =
        detectPhase();

      if (
        !initializedRef.current
      ) {
        initializedRef.current =
          true;

        previousPhaseRef.current =
          phase;

        previousCardSignatureRef.current =
          getCardSignature();

        return;
      }

      const previous =
        previousPhaseRef.current;

      if (
        phase ===
        previous
      ) {
        return;
      }

      /*
       * Voorronde -> boom
       */

      if (
        previous ===
          "cards" &&
        phase ===
          "tree"
      ) {
        showTransition(
          {
            type: "tree",

            eyebrow:
              "RONDE KLAAR",

            title:
              "Tijd voor de boom",

            text:
              "Speel je hand leeg en deel slokken uit.",

            icon:
              "🌲",
          },
          1450
        );
      }

      /*
       * Boom -> bus
       */

      if (
        previous ===
          "tree" &&
        phase ===
          "bus"
      ) {
        showTransition(
          {
            type: "bus",

            eyebrow:
              "DE BOOM IS KLAAR",

            title:
              "Iedereen instappen",

            text:
              "Tijd voor de laatste rit.",

            icon:
              "🚌",
          },
          1200
        );
      }

      previousPhaseRef.current =
        phase;

      /*
       * Nieuwe pagina heeft een compleet
       * nieuwe verzameling kaart-elementen.
       *
       * Die slaan we eerst op zodat de overgang
       * zelf niet klinkt alsof er ineens twintig
       * kaarten worden neergelegd.
       */

      previousCardSignatureRef.current =
        getCardSignature();
    }

    function handleCards() {
      const signature =
        getCardSignature();

      if (
        previousCardSignatureRef.current ===
        ""
      ) {
        previousCardSignatureRef.current =
          signature;

        return;
      }

      if (
        signature ===
        previousCardSignatureRef.current
      ) {
        return;
      }

      previousCardSignatureRef.current =
        signature;

      playCard();
    }

    function handleFinish() {
      const finishedPanel =
        document.querySelector(
          ".bus-finished-panel"
        );

      if (
        !finishedPanel
      ) {
        return;
      }

      if (
        seenFinishedPanelsRef.current.has(
          finishedPanel
        )
      ) {
        return;
      }

      seenFinishedPanelsRef.current.add(
        finishedPanel
      );

      playFinish();
    }

    function update() {
      handlePhase();
      handleCards();
      handleFinish();
    }

    const observer =
      new MutationObserver(
        update
      );

    observer.observe(
      root,
      {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
          "class",
        ],
      }
    );

    update();

    return () => {
      observer.disconnect();

      if (
        transitionTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          transitionTimerRef.current
        );
      }

      if (
        toastTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          toastTimerRef.current
        );
      }
    };
  }, []);

  /*
   * =========================================================
   * GLASS SOUND
   * =========================================================
   *
   * We koppelen het geluid direct aan het moment
   * waarop de verdeling wordt bevestigd.
   */

  useEffect(() => {
    function handleClick(
      event:
        MouseEvent
    ) {
      const target =
        event.target;

      if (
        !(
          target instanceof
          Element
        )
      ) {
        return;
      }

      const button =
        target.closest(
          [
            ".tree-confirm-button",
            ".adtje-confirm-button",
          ].join(
            ","
          )
        );

      if (
        !button
      ) {
        return;
      }

      if (
        button instanceof
          HTMLButtonElement &&
        button.disabled
      ) {
        return;
      }

      window.setTimeout(
        () => {
          playGlass();
        },
        90
      );
    }

    document.addEventListener(
      "click",
      handleClick
    );

    return () => {
      document.removeEventListener(
        "click",
        handleClick
      );
    };
  }, []);

  /*
   * =========================================================
   * SOUND TOGGLE
   * =========================================================
   */

  async function toggleSound() {
    const next =
      !soundEnabled;

    soundEnabledRef.current =
      next;

    setSoundEnabled(
      next
    );

    if (next) {
      await audioEngine.unlock();

      showSoundToast(
        "Geluid aan"
      );
    } else {
      showSoundToast(
        "Geluid uit"
      );
    }
  }

  return (
    <>
      {children}

      <button
        type="button"
        className={[
          "experience-sound-button",

          soundEnabled
            ? "enabled"
            : "disabled",
        ].join(
          " "
        )}
        onClick={
          toggleSound
        }
        aria-label={
          soundEnabled
            ? "Geluid uitschakelen"
            : "Geluid inschakelen"
        }
      >
        <SpeakerIcon
          muted={
            !soundEnabled
          }
        />
      </button>

      {soundToast && (
        <div className="experience-sound-toast">
          {
            soundToast
          }
        </div>
      )}

      {transition && (
        <div
          className={`experience-transition-layer experience-transition-${transition.type}`}
        >
          <div className="experience-transition-background" />

          {transition.type ===
            "tree" && (
            <div className="experience-tree-cards">
              <span>
                🂠
              </span>

              <span>
                🂠
              </span>

              <span>
                🂠
              </span>

              <span>
                🂠
              </span>
            </div>
          )}

          {transition.type ===
            "bus" && (
            <>
              <div className="experience-road-line experience-road-line-one" />

              <div className="experience-road-line experience-road-line-two" />

              <div className="experience-road-line experience-road-line-three" />
            </>
          )}

          <div className="experience-transition-content">
            <span className="experience-transition-eyebrow">
              {
                transition.eyebrow
              }
            </span>

            <div className="experience-transition-icon">
              {
                transition.icon
              }
            </div>

            <h2>
              {
                transition.title
              }
            </h2>

            <p>
              {
                transition.text
              }
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default ExperienceShell;