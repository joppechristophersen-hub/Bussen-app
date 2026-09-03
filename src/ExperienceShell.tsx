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
];

const CARD_PLACE_SOUND =
  "/sounds/card-place.mp3";

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
 * AUDIO ENGINE
 * =========================================================
 */

class BusbaasAudioEngine {
  private templates =
    new Map<
      string,
      HTMLAudioElement
    >();

  private lastCardTime =
    0;

  private lastGlassTime =
    0;

  constructor() {
    [
      ...CARD_SOUNDS,
      CARD_PLACE_SOUND,
      GLASS_SOUND,
      FINISH_SOUND,
      CORRECT_SOUND,
      WRONG_SOUND,
      BUS_HORN_SOUND,
    ].forEach(
      (source) => {
        const audio =
          new Audio(source);

        audio.preload =
          "auto";

        this.templates.set(
          source,
          audio
        );
      }
    );
  }

  async unlock() {
    try {
      const template =
        this.templates.get(
          CARD_PLACE_SOUND
        );

      if (!template) {
        return;
      }

      const player =
        template.cloneNode(
          true
        ) as HTMLAudioElement;

      player.volume = 0;

      await player.play();

      player.pause();

      player.currentTime = 0;
    } catch {
      // Audio mag gameplay nooit blokkeren.
    }
  }

  private playFile(
    source: string,
    volume = 1,
    playbackRate = 1
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
            volume
          )
        );

      player.playbackRate =
        playbackRate;

      player.currentTime = 0;

      const promise =
        player.play();

      if (promise) {
        void promise.catch(
          () => {
            // Geen foutmelding in de game.
          }
        );
      }
    } catch {
      // Audio mag de app niet crashen.
    }
  }

  /*
   * Algemene kaart:
   * bijvoorbeeld voorronde, boom en gelijkspel.
   */

  playCard() {
    const now =
      performance.now();

    if (
      now -
        this.lastCardTime <
      110
    ) {
      return;
    }

    this.lastCardTime =
      now;

    const sound =
      CARD_SOUNDS[
        Math.floor(
          Math.random() *
            CARD_SOUNDS.length
        )
      ];

    const playbackRate =
      0.98 +
      Math.random() *
        0.04;

    const volume =
      0.71 +
      Math.random() *
        0.06;

    this.playFile(
      sound,
      volume,
      playbackRate
    );
  }

  /*
   * Specifiek kaart NEERLEGGEN.
   *
   * Deze gebruiken we in de bus.
   */

  playCardPlace() {
    const now =
      performance.now();

    if (
      now -
        this.lastCardTime <
      110
    ) {
      return;
    }

    this.lastCardTime =
      now;

    this.playFile(
      CARD_PLACE_SOUND,
      0.76,
      1
    );
  }

  playCorrect() {
    this.playFile(
      CORRECT_SOUND,
      0.66,
      1
    );
  }

  playWrong() {
    this.playFile(
      WRONG_SOUND,
      0.64,
      1
    );
  }

  playGlass() {
    const now =
      performance.now();

    if (
      now -
        this.lastGlassTime <
      450
    ) {
      return;
    }

    this.lastGlassTime =
      now;

    this.playFile(
      GLASS_SOUND,
      0.82,
      1
    );
  }

  playBusHorn() {
    this.playFile(
      BUS_HORN_SOUND,
      0.74,
      1
    );
  }

  playFinish() {
    this.playFile(
      FINISH_SOUND,
      0.72,
      1
    );
  }
}

const audioEngine =
  new BusbaasAudioEngine();

/*
 * =========================================================
 * HELPERS
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

function cleanText(
  element:
    Element | null
) {
  if (!element) {
    return "";
  }

  return (
    element.textContent
      ?.replace(
        /\s+/g,
        " "
      )
      .trim() ??
    ""
  );
}

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

  /*
   * Voorronde.
   */

  const previousPreRoundCardRef =
    useRef("");

  /*
   * Boom.
   */

  const previousTreeCardRef =
    useRef("");

  /*
   * Gelijkspel.
   */

  const previousTieCardsRef =
    useRef("");

  /*
   * Bus setup.
   */

  const previousSetupCardsRef =
    useRef("");

  /*
   * Bus resultaat.
   *
   * Dit is bewust ALLEEN de nieuw
   * neergelegde kaart.
   */

  const previousBusResultCardRef =
    useRef("");

  const previousBusResultRef =
    useRef("");

  const previousPreRoundResultRef =
    useRef("");

  const transitionTimerRef =
    useRef<number | null>(
      null
    );

  const toastTimerRef =
    useRef<number | null>(
      null
    );

  const seenFinishedRef =
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
   * UNLOCK AUDIO
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
   * MAIN GAME OBSERVER
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

      const previous =
        previousPhaseRef.current;

      if (
        previous === null
      ) {
        previousPhaseRef.current =
          phase;

        return;
      }

      if (
        phase ===
        previous
      ) {
        return;
      }

      /*
       * Voorronde -> Boom
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
       * Boom -> Bus
       */

      if (
        previous ===
          "tree" &&
        phase ===
          "bus"
      ) {
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
       * Signatures van de oude fase wissen.
       */

      if (
        phase !==
        "cards"
      ) {
        previousPreRoundCardRef.current =
          "";

        previousPreRoundResultRef.current =
          "";
      }

      if (
        phase !==
        "tree"
      ) {
        previousTreeCardRef.current =
          "";
      }

      if (
        phase !==
        "bus"
      ) {
        previousBusResultCardRef.current =
          "";

        previousBusResultRef.current =
          "";

        previousSetupCardsRef.current =
          "";
      }
    }

    /*
     * =====================================================
     * 1. VOORRONDE
     * =====================================================
     *
     * Dit is de fase waarin iedere speler
     * zijn vier kaarten krijgt.
     *
     * We luisteren DIRECT naar .revealed-card.
     *
     * Ook wanneer dit de ALLEREERSTE kaart
     * van het hele spel is.
     */

    function handlePreRound() {
      if (
        detectPhase() !==
        "cards"
      ) {
        return;
      }

      const result =
        document.querySelector(
          ".result-area"
        );

      const card =
        result?.querySelector(
          ".revealed-card"
        ) ??
        document.querySelector(
          ".revealed-card"
        );

      if (
        !result ||
        !card
      ) {
        /*
         * Resultaat is verdwenen.
         *
         * Hierdoor kan ook exact dezelfde kaart
         * bij een volgende speler opnieuw geluid geven.
         */

        previousPreRoundCardRef.current =
          "";

        previousPreRoundResultRef.current =
          "";

        return;
      }

      const cardText =
        cleanText(
          card
        );

      if (!cardText) {
        return;
      }

      /*
       * NIEUWE KAART.
       */

      if (
        cardText !==
        previousPreRoundCardRef.current
      ) {
        previousPreRoundCardRef.current =
          cardText;

        if (
          soundIsOn()
        ) {
          audioEngine.playCard();
        }
      }

      /*
       * GOED / FOUT
       */

      const resultSignature =
        [
          cardText,
          result.className,
          cleanText(
            result
          ),
        ].join(
          "|"
        );

      if (
        resultSignature ===
        previousPreRoundResultRef.current
      ) {
        return;
      }

      previousPreRoundResultRef.current =
        resultSignature;

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
        260
      );
    }

    /*
     * =====================================================
     * 2. BOOMKAART
     * =====================================================
     */

    function handleTreeCard() {
      if (
        detectPhase() !==
        "tree"
      ) {
        return;
      }

      const card =
        document.querySelector(
          ".tree-active-card"
        );

      if (!card) {
        previousTreeCardRef.current =
          "";

        return;
      }

      const signature =
        cleanText(
          card
        );

      if (!signature) {
        return;
      }

      if (
        signature ===
        previousTreeCardRef.current
      ) {
        return;
      }

      previousTreeCardRef.current =
        signature;

      if (
        soundIsOn()
      ) {
        audioEngine.playCard();
      }
    }

    /*
     * =====================================================
     * 3. GELIJKSPEL
     * =====================================================
     */

    function handleTieCards() {
      const tieCards =
        Array.from(
          document.querySelectorAll(
            [
              ".tiebreak-panel .mini-playing-card",
              ".tie-break-panel .mini-playing-card",
              '[class*="tiebreak"] .mini-playing-card',
              '[class*="tie-break"] .mini-playing-card',
            ].join(
              ","
            )
          )
        );

      if (
        tieCards.length ===
        0
      ) {
        previousTieCardsRef.current =
          "";

        return;
      }

      const signature =
        tieCards
          .map(
            (
              card,
              index
            ) =>
              `${index}:${cleanText(
                card
              )}`
          )
          .join(
            "|"
          );

      if (
        signature ===
        previousTieCardsRef.current
      ) {
        return;
      }

      previousTieCardsRef.current =
        signature;

      if (
        soundIsOn()
      ) {
        audioEngine.playCard();
      }
    }

    /*
     * =====================================================
     * 4. BUS OPBOUW
     * =====================================================
     *
     * Lengtekaart / open kaarten bepalen.
     */

    function handleBusSetupCards() {
      if (
        detectPhase() !==
        "bus"
      ) {
        return;
      }

      const cards =
        Array.from(
          document.querySelectorAll(
            ".setup-card:not(.placeholder)"
          )
        );

      if (
        cards.length ===
        0
      ) {
        previousSetupCardsRef.current =
          "";

        return;
      }

      const signature =
        cards
          .map(
            (
              card,
              index
            ) =>
              `${index}:${cleanText(
                card
              )}`
          )
          .join(
            "|"
          );

      if (
        signature ===
        previousSetupCardsRef.current
      ) {
        return;
      }

      /*
       * Eerste render niet als tien losse kaarten
       * laten klinken.
       *
       * Eén wijziging = één fysieke kaartactie.
       */

      previousSetupCardsRef.current =
        signature;

      if (
        soundIsOn()
      ) {
        audioEngine.playCard();
      }
    }

    /*
     * =====================================================
     * 5. BUS
     * =====================================================
     *
     * ZEER BELANGRIJK:
     *
     * We luisteren NIET meer naar:
     *
     * .bus-reference-card
     *
     * Dus:
     *
     * kaart pakken          -> GEEN geluid
     * oude kaart weg        -> GEEN geluid
     * nieuwe kaart opleggen -> KAARTGELUID
     * daarna                -> GOED/FOUT
     */

    function handleBusResult() {
      if (
        detectPhase() !==
        "bus"
      ) {
        return;
      }

      const result =
        document.querySelector(
          ".bus-result"
        );

      if (!result) {
        previousBusResultCardRef.current =
          "";

        previousBusResultRef.current =
          "";

        return;
      }

      /*
       * Zoek alleen naar kaarten BINNEN
       * het resultaatpaneel.
       */

      const resultCards =
        Array.from(
          result.querySelectorAll(
            [
              ".mini-playing-card",
              ".revealed-card",
              ".playing-card",
              ".bus-result-card",
            ].join(
              ","
            )
          )
        );

      let cardSignature =
        resultCards
          .map(
            (
              card,
              index
            ) =>
              `${index}:${cleanText(
                card
              )}`
          )
          .join(
            "|"
          );

      /*
       * Sommige versies van App.tsx plaatsen
       * de kaartinhoud rechtstreeks in .bus-result.
       */

      if (
        !cardSignature
      ) {
        cardSignature =
          cleanText(
            result
          );
      }

      if (
        !cardSignature
      ) {
        return;
      }

      /*
       * =========================
       * KAART OPLEGGEN
       * =========================
       */

      if (
        cardSignature !==
        previousBusResultCardRef.current
      ) {
        previousBusResultCardRef.current =
          cardSignature;

        if (
          soundIsOn()
        ) {
          /*
           * Hier gebruiken we bewust de
           * echte "placing card"-opname.
           */

          audioEngine.playCardPlace();
        }
      }

      /*
       * =========================
       * DAARNA GOED / FOUT
       * =========================
       */

      const resultSignature =
        [
          cardSignature,
          result.className,
          cleanText(
            result
          ),
        ].join(
          "|"
        );

      if (
        resultSignature ===
        previousBusResultRef.current
      ) {
        return;
      }

      previousBusResultRef.current =
        resultSignature;

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
        300
      );
    }

    /*
     * =====================================================
     * EINDE
     * =====================================================
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
     * =====================================================
     * UPDATE
     * =====================================================
     */

    function update() {
      handlePhase();

      handlePreRound();

      handleTreeCard();

      handleTieCards();

      handleBusSetupCards();

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
   *
   * We gebruiken hier bewust geen vaste class meer.
   *
   * We bepalen of de gebruiker daadwerkelijk
   * het VERDELEN van slokken bevestigt.
   */

  useEffect(() => {
    function handleTreeButton(
      event:
        PointerEvent
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
          "button"
        );

      if (
        !(
          button instanceof
          HTMLButtonElement
        )
      ) {
        return;
      }

      if (
        button.disabled
      ) {
        return;
      }

      /*
       * Alleen in de boom.
       */

      const treeScreen =
        button.closest(
          ".tree-screen"
        );

      if (!treeScreen) {
        return;
      }

      const buttonText =
        cleanText(
          button
        ).toLowerCase();

      /*
       * NOOIT bij plus/min.
       */

      if (
        buttonText ===
          "+" ||
        buttonText ===
          "-" ||
        buttonText ===
          "−"
      ) {
        return;
      }

      /*
       * NOOIT bij overslaan.
       */

      if (
        buttonText.includes(
          "overslaan"
        ) ||
        buttonText.includes(
          "skip"
        )
      ) {
        return;
      }

      /*
       * Kijk of de knop in een element zit
       * dat duidelijk over uitdelen gaat.
       */

      const distributionContainer =
        button.closest(
          [
            ".tree-distribute-panel",
            ".tree-distribution",
            ".distribution-panel",
            '[class*="distribut"]',
            '[class*="drink"]',
            '[class*="slok"]',
            '[class*="assign"]',
          ].join(
            ","
          )
        );

      /*
       * Fallback:
       *
       * Tijdens het verdelen staan er meestal
       * +/- knoppen op het scherm.
       */

      const allButtons =
        Array.from(
          treeScreen.querySelectorAll(
            "button"
          )
        );

      const hasMinus =
        allButtons.some(
          (item) => {
            const text =
              cleanText(
                item
              );

            return (
              text ===
                "-" ||
              text ===
                "−"
            );
          }
        );

      const hasPlus =
        allButtons.some(
          (item) =>
            cleanText(
              item
            ) ===
            "+"
        );

      const hasDistributionControls =
        hasMinus &&
        hasPlus;

      /*
       * Logische tekst van bevestigingsknoppen.
       */

      const textLooksLikeConfirm =
        buttonText.includes(
          "bevestig"
        ) ||
        buttonText.includes(
          "uitdelen"
        ) ||
        buttonText.includes(
          "verdeel"
        ) ||
        buttonText.includes(
          "verdelen"
        ) ||
        buttonText.includes(
          "slokken"
        ) ||
        buttonText.includes(
          "klaar"
        ) ||
        buttonText.includes(
          "deel uit"
        ) ||
        buttonText.includes(
          "doorgaan"
        );

      const isDistributionConfirmation =
        Boolean(
          distributionContainer
        ) ||
        (
          hasDistributionControls &&
          textLooksLikeConfirm
        );

      if (
        !isDistributionConfirmation
      ) {
        return;
      }

      /*
       * Klink ná het bevestigen.
       */

      window.setTimeout(
        () => {
          if (
            soundIsOn()
          ) {
            audioEngine.playGlass();
          }
        },
        160
      );
    }

    document.addEventListener(
      "pointerup",
      handleTreeButton
    );

    return () => {
      document.removeEventListener(
        "pointerup",
        handleTreeButton
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
              <span>🂠</span>
              <span>🂠</span>
              <span>🂠</span>
              <span>🂠</span>
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