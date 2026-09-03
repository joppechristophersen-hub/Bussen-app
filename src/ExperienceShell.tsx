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

/*
 * =========================================================
 * AUDIO FILES
 * =========================================================
 */

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

const CORRECT_SOUND =
  "/sounds/correct.mp3";

const WRONG_SOUND =
  "/sounds/wrong.mp3";

const BUS_HORN_SOUND =
  "/sounds/bus-horn.mp3";

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
      CORRECT_SOUND,
      WRONG_SOUND,
      BUS_HORN_SOUND,
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
   * =========================================================
   * UNLOCK
   * =========================================================
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
       * Audio mag nooit voorkomen dat
       * het spel verder werkt.
       */
    }
  }

  /*
   * =========================================================
   * PLAY FILE
   * =========================================================
   */

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

      if (promise) {
        void promise.catch(
          () => {
            /*
             * Geen foutmelding in de game
             * wanneer audio geblokkeerd wordt.
             */
          }
        );
      }
    } catch {
      // Stil falen.
    }
  }

  /*
   * =========================================================
   * CARD
   * =========================================================
   */

  playCard() {
    const now =
      performance.now();

    /*
     * Bescherming tegen twee React DOM-updates
     * die bij exact dezelfde onthulling horen.
     */

    if (
      now -
        this.lastCardSoundTime <
      120
    ) {
      return;
    }

    this.lastCardSoundTime =
      now;

    const source =
      CARD_SOUNDS[
        Math.floor(
          Math.random() *
            CARD_SOUNDS.length
        )
      ];

    /*
     * Heel subtiele variatie zodat iedere
     * kaart niet exact hetzelfde klinkt.
     */

    const playbackRate =
      0.98 +
      Math.random() *
        0.04;

    const volume =
      0.71 +
      Math.random() *
        0.06;

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
   * CORRECT
   * =========================================================
   */

  playCorrect() {
    this.playFile(
      CORRECT_SOUND,
      {
        volume: 0.66,
        playbackRate: 1,
      }
    );
  }

  /*
   * =========================================================
   * WRONG
   * =========================================================
   */

  playWrong() {
    this.playFile(
      WRONG_SOUND,
      {
        volume: 0.64,
        playbackRate: 1,
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
   * BUS HORN
   * =========================================================
   */

  playBusHorn() {
    this.playFile(
      BUS_HORN_SOUND,
      {
        volume: 0.72,
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
 * SOUND STORAGE
 * =========================================================
 */

function readSoundEnabled() {
  try {
    return (
      localStorage.getItem(
        SOUND_STORAGE_KEY
      ) !==
      "false"
    );
  } catch {
    return true;
  }
}

/*
 * =========================================================
 * PHASE
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
 * CARD REVEAL SIGNATURE
 * =========================================================
 *
 * BELANGRIJK:
 *
 * We kijken NIET meer naar:
 *
 * .playing-card
 *
 * Daarmee voorkom je:
 * - geluid bij spelers toevoegen
 * - geluid bij handkaart update
 * - dubbele kaartgeluiden
 *
 * We luisteren alleen naar kaarten die op dat
 * moment echt centraal / actief worden getoond.
 */

function getRevealSignature() {
  const parts:
    string[] =
    [];

  /*
   * =========================
   * VOORRONDE
   * =========================
   */

  const revealedCard =
    document.querySelector(
      ".result-area .revealed-card"
    );

  if (revealedCard) {
    parts.push(
      `cards:${
        revealedCard.textContent
          ?.replace(
            /\s+/g,
            " "
          )
          .trim() ??
        ""
      }`
    );
  }

  /*
   * =========================
   * BOOM
   * =========================
   */

  const treeCard =
    document.querySelector(
      ".tree-active-panel .tree-active-card"
    );

  if (treeCard) {
    parts.push(
      `tree:${
        treeCard.textContent
          ?.replace(
            /\s+/g,
            " "
          )
          .trim() ??
        ""
      }`
    );
  }

  /*
   * =========================
   * BUS SETUP
   * =========================
   *
   * Bijvoorbeeld:
   * - lengte bepalen
   * - aantal open kaarten bepalen
   */

  const setupCards =
    Array.from(
      document.querySelectorAll(
        ".bus-setup-draws .setup-card:not(.placeholder)"
      )
    );

  if (
    setupCards.length >
    0
  ) {
    parts.push(
      `setup:${setupCards
        .map(
          (
            card
          ) =>
            card.textContent
              ?.replace(
                /\s+/g,
                " "
              )
              .trim() ??
            ""
        )
        .join(
          ","
        )}`
    );
  }

  /*
   * =========================
   * GELIJKSPEL / MINI DRAW
   * =========================
   */

  const visibleMiniCards =
    Array.from(
      document.querySelectorAll(
        ".mini-playing-card"
      )
    );

  if (
    visibleMiniCards.length >
    0
  ) {
    parts.push(
      `mini:${visibleMiniCards
        .map(
          (
            card
          ) =>
            card.textContent
              ?.replace(
                /\s+/g,
                " "
              )
              .trim() ??
            ""
        )
        .join(
          ","
        )}`
    );
  }

  /*
   * =========================
   * BUS HUIDIGE KAART
   * =========================
   */

  const busReference =
    document.querySelector(
      ".bus-choice-panel .bus-reference-card"
    );

  if (busReference) {
    parts.push(
      `bus-reference:${
        busReference.textContent
          ?.replace(
            /\s+/g,
            " "
          )
          .trim() ??
        ""
      }`
    );
  }

  /*
   * =========================
   * BUS RESULTAAT
   * =========================
   *
   * Als het resultaat twee kaarten laat zien,
   * maken we daar één gezamenlijke signature van.
   *
   * Resultaat = dus één kaart-sound,
   * niet één sound per DOM-kaart.
   */

  const busResultCards =
    Array.from(
      document.querySelectorAll(
        ".bus-result .mini-playing-card"
      )
    );

  if (
    busResultCards.length >
    0
  ) {
    parts.push(
      `bus-result:${busResultCards
        .map(
          (
            card
          ) =>
            card.textContent
              ?.replace(
                /\s+/g,
                " "
              )
              .trim() ??
            ""
        )
        .join(
          ","
        )}`
    );
  }

  return parts.join(
    "|"
  );
}

/*
 * =========================================================
 * SPEAKER ICON
 * =========================================================
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

  const previousRevealSignatureRef =
    useRef("");

  const transitionTimerRef =
    useRef<number | null>(
      null
    );

  const toastTimerRef =
    useRef<number | null>(
      null
    );

  const seenResultRef =
    useRef(
      new WeakSet<Element>()
    );

  const seenBusResultRef =
    useRef(
      new WeakSet<Element>()
    );

  const seenFinishedRef =
    useRef(
      new WeakSet<Element>()
    );

  /*
   * =========================================================
   * SOUND ENABLED
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
   * UNLOCK MOBILE AUDIO
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

  function soundIsOn() {
    return (
      soundEnabledRef.current
    );
  }

  /*
   * =========================================================
   * TRANSITION
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

  /*
   * =========================================================
   * TOAST
   * =========================================================
   */

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
   * GAME OBSERVER
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

    /*
     * =========================
     * PHASE
     * =========================
     */

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

        previousRevealSignatureRef.current =
          getRevealSignature();

        return false;
      }

      const previous =
        previousPhaseRef.current;

      if (
        phase ===
        previous
      ) {
        return false;
      }

      /*
       * =========================
       * VOORRONDE -> BOOM
       * =========================
       */

      if (
        previous ===
          "cards" &&
        phase ===
          "tree"
      ) {
        showTransition(
          {
            type:
              "tree",

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
       * =========================
       * BOOM -> BUS
       * =========================
       */

      if (
        previous ===
          "tree" &&
        phase ===
          "bus"
      ) {
        /*
         * Echte busclaxon.
         */

        if (
          soundIsOn()
        ) {
          audioEngine.playBusHorn();
        }

        showTransition(
          {
            type:
              "bus",

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
       * Voorkomt dat het openen van een compleet
       * nieuw scherm meteen als kaartactie telt.
       */

      previousRevealSignatureRef.current =
        getRevealSignature();

      return true;
    }

    /*
     * =========================
     * KAART ONTHULD
     * =========================
     */

    function handleCardReveal(
      phaseChanged:
        boolean
    ) {
      const signature =
        getRevealSignature();

      /*
       * Nieuwe fase zelf krijgt geen kaartgeluid.
       */

      if (
        phaseChanged
      ) {
        previousRevealSignatureRef.current =
          signature;

        return;
      }

      if (
        previousRevealSignatureRef.current ===
        ""
      ) {
        previousRevealSignatureRef.current =
          signature;

        return;
      }

      if (
        signature ===
        previousRevealSignatureRef.current
      ) {
        return;
      }

      /*
       * Alleen geluid als er daadwerkelijk
       * een kaart zichtbaar is.
       *
       * Dus NIET bij verdwijnen van een kaart.
       */

      if (
        signature !==
        ""
      ) {
        if (
          soundIsOn()
        ) {
          audioEngine.playCard();
        }
      }

      previousRevealSignatureRef.current =
        signature;
    }

    /*
     * =========================
     * GOED / FOUT
     * =========================
     */

    function handleCardResult() {
      const result =
        document.querySelector(
          ".result-area"
        );

      if (
        !result ||
        seenResultRef.current.has(
          result
        )
      ) {
        return;
      }

      seenResultRef.current.add(
        result
      );

      /*
       * Eerst hoor je de fysieke kaart.
       * Heel even daarna goed of fout.
       */

      window.setTimeout(
        () => {
          if (
            !soundIsOn()
          ) {
            return;
          }

          if (
            result.classList.contains(
              "correct"
            )
          ) {
            audioEngine.playCorrect();
          } else {
            audioEngine.playWrong();
          }
        },
        180
      );
    }

    /*
     * =========================
     * BUS GOED / FOUT
     * =========================
     */

    function handleBusResult() {
      const result =
        document.querySelector(
          ".bus-result"
        );

      if (
        !result ||
        seenBusResultRef.current.has(
          result
        )
      ) {
        return;
      }

      seenBusResultRef.current.add(
        result
      );

      window.setTimeout(
        () => {
          if (
            !soundIsOn()
          ) {
            return;
          }

          if (
            result.classList.contains(
              "correct"
            )
          ) {
            audioEngine.playCorrect();
          } else {
            audioEngine.playWrong();
          }
        },
        180
      );
    }

    /*
     * =========================
     * EINDE
     * =========================
     */

    function handleFinish() {
      const finished =
        document.querySelector(
          ".bus-finished-panel"
        );

      if (
        !finished ||
        seenFinishedRef.current.has(
          finished
        )
      ) {
        return;
      }

      seenFinishedRef.current.add(
        finished
      );

      if (
        soundIsOn()
      ) {
        audioEngine.playFinish();
      }
    }

    /*
     * =========================
     * UPDATE
     * =========================
     */

    function update() {
      const phaseChanged =
        handlePhase();

      handleCardReveal(
        phaseChanged
      );

      handleCardResult();

      handleBusResult();

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
   * GLASS CLINK
   * =========================================================
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

      /*
       * Alleen slokken uitdelen in de boom.
       */

      const button =
        target.closest(
          ".tree-confirm-button"
        );

      if (!button) {
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
          if (
            soundIsOn()
          ) {
            audioEngine.playGlass();
          }
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