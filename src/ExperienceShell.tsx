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

type SoundEffectPayload = {
  type:
    | "card"
    | "card-result"
    | "bus-card-result"
    | "glass"
    | "bus-horn"
    | "finish";

  result?:
    | "correct"
    | "wrong";

  eventId?: string;
};

const SOUND_STORAGE_KEY =
  "busbaas-sound-enabled";

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
 * REAL AUDIO ENGINE
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

      player.volume =
        0;

      await player.play();

      player.pause();

      player.currentTime =
        0;
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

      player.currentTime =
        0;

      const promise =
        player.play();

      if (promise) {
        void promise.catch(
          () => {
            // Stil falen als het platform audio blokkeert.
          }
        );
      }
    } catch {
      // Audio mag de app nooit crashen.
    }
  }

  playCard() {
    const now =
      performance.now();

    if (
      now -
        this.lastCardTime <
      90
    ) {
      return;
    }

    this.lastCardTime =
      now;

    const source =
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
      source,
      volume,
      playbackRate
    );
  }

  playCardPlace() {
    const now =
      performance.now();

    if (
      now -
        this.lastCardTime <
      90
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
      400
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

  const transitionTimerRef =
    useRef<number | null>(
      null
    );

  const toastTimerRef =
    useRef<number | null>(
      null
    );

  const soundTimersRef =
    useRef<number[]>(
      []
    );

  const handledSoundIdsRef =
    useRef(
      new Set<string>()
    );

  /*
   * Eindscherm:
   * knoppen pas beschikbaar nadat de advertentie
   * één keer zichtbaar is geweest en weer sluit.
   */
  const finishVisibleRef =
    useRef(false);

  const adSeenRef =
    useRef(false);

  const endgameLockedRef =
    useRef(false);

  const endgameSafetyTimerRef =
    useRef<number | null>(
      null
    );

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
   * Mobiele browsers/WebViews willen eerst
   * een echte gebruikersactie zien.
   *
   * Joinen/starten/drukken op een gokknop is
   * voldoende om de audio daarna vrij te geven.
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
        passive:
          true,
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

  function queueSound(
    callback:
      () => void,
    delay:
      number
  ) {
    const timer =
      window.setTimeout(
        () => {
          soundTimersRef.current =
            soundTimersRef.current.filter(
              (item) =>
                item !==
                timer
            );

          callback();
        },
        delay
      );

    soundTimersRef.current.push(
      timer
    );
  }

  /*
   * =========================================================
   * SERVERGESTUURDE SOUNDS
   * =========================================================
   *
   * Er zit hier GEEN DOM-kaartdetectie meer in.
   * De server stuurt het moment naar iedere telefoon.
   */
  useEffect(() => {
    function handleSoundEvent(
      event:
        Event
    ) {
      const customEvent =
        event as
          CustomEvent<SoundEffectPayload>;

      const effect =
        customEvent.detail;

      if (
        !effect ||
        !soundIsOn()
      ) {
        return;
      }

      if (
        effect.eventId
      ) {
        if (
          handledSoundIdsRef.current.has(
            effect.eventId
          )
        ) {
          return;
        }

        handledSoundIdsRef.current.add(
          effect.eventId
        );

        /*
         * Voorkom dat deze set onbeperkt groeit.
         */
        if (
          handledSoundIdsRef.current.size >
          250
        ) {
          handledSoundIdsRef.current.clear();

          handledSoundIdsRef.current.add(
            effect.eventId
          );
        }
      }

      if (
        effect.type ===
        "card"
      ) {
        audioEngine.playCard();

        return;
      }

      if (
        effect.type ===
        "glass"
      ) {
        audioEngine.playGlass();

        return;
      }

      if (
        effect.type ===
        "bus-horn"
      ) {
        audioEngine.playBusHorn();

        return;
      }

      if (
        effect.type ===
        "finish"
      ) {
        audioEngine.playFinish();

        return;
      }

      if (
        effect.type ===
        "card-result"
      ) {
        /*
         * Voorronde:
         *
         * kaart wordt getoond
         * -> kaart schuift
         * -> daarna goed/fout.
         */
        audioEngine.playCard();

        queueSound(
          () => {
            if (
              !soundIsOn()
            ) {
              return;
            }

            if (
              effect.result ===
              "correct"
            ) {
              audioEngine.playCorrect();
            } else {
              audioEngine.playWrong();
            }
          },
          260
        );

        return;
      }

      if (
        effect.type ===
        "bus-card-result"
      ) {
        /*
         * Bus:
         *
         * GEEN geluid bij pakken.
         * GEEN geluid bij oude kaart weg.
         *
         * Alleen:
         * nieuwe kaart opleggen
         * -> card-place
         * -> daarna goed/fout.
         */
        audioEngine.playCardPlace();

        queueSound(
          () => {
            if (
              !soundIsOn()
            ) {
              return;
            }

            if (
              effect.result ===
              "correct"
            ) {
              audioEngine.playCorrect();
            } else {
              audioEngine.playWrong();
            }
          },
          300
        );
      }
    }

    window.addEventListener(
      "busbaas-sound-effect",
      handleSoundEvent
    );

    return () => {
      window.removeEventListener(
        "busbaas-sound-effect",
        handleSoundEvent
      );

      soundTimersRef.current.forEach(
        (timer) => {
          window.clearTimeout(
            timer
          );
        }
      );

      soundTimersRef.current =
        [];
    };
  }, []);

  /*
   * =========================================================
   * OVERGANGSANIMATIES
   * =========================================================
   *
   * Alleen de animaties blijven DOM-gestuurd.
   * Daar zit geen multiplayerkritische logica in.
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

  useEffect(() => {
    const root =
      document.getElementById(
        "root"
      );

    if (!root) {
      return;
    }

    function updatePhase() {
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

      if (
        previous ===
          "tree" &&
        phase ===
          "bus"
      ) {
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
    }

    const observer =
      new MutationObserver(
        updatePhase
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

    updatePhase();

    return () => {
      observer.disconnect();
    };
  }, []);

  /*
   * =========================================================
   * EINDSCHERM -> RECLAME -> KNOPPEN
   * =========================================================
   */

  function lockEndgameActions() {
    if (
      endgameLockedRef.current
    ) {
      return;
    }

    endgameLockedRef.current =
      true;

    document.body.classList.add(
      "busbaas-endgame-actions-locked"
    );

    if (
      endgameSafetyTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        endgameSafetyTimerRef.current
      );
    }

    /*
     * Veiligheidsnet:
     * als de fake advertentie ooit niet opent,
     * blijven spelers niet permanent vastzitten.
     */
    endgameSafetyTimerRef.current =
      window.setTimeout(
        () => {
          endgameLockedRef.current =
            false;

          document.body.classList.remove(
            "busbaas-endgame-actions-locked"
          );

          endgameSafetyTimerRef.current =
            null;
        },
        12000
      );
  }

  function unlockEndgameActions() {
    endgameLockedRef.current =
      false;

    document.body.classList.remove(
      "busbaas-endgame-actions-locked"
    );

    if (
      endgameSafetyTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        endgameSafetyTimerRef.current
      );

      endgameSafetyTimerRef.current =
        null;
    }
  }

  function resetEndgameGate() {
    finishVisibleRef.current =
      false;

    adSeenRef.current =
      false;

    unlockEndgameActions();
  }

  useEffect(() => {
    const root =
      document.getElementById(
        "root"
      );

    if (!root) {
      return;
    }

    function updateEndgameGate() {
      const finishVisible =
        Boolean(
          document.querySelector(
            ".bus-finished-panel"
          )
        );

      const adVisible =
        Boolean(
          document.querySelector(
            ".commerce-ad-layer"
          )
        );

      if (
        !finishVisible
      ) {
        if (
          finishVisibleRef.current
        ) {
          resetEndgameGate();
        }

        return;
      }

      if (
        !finishVisibleRef.current
      ) {
        finishVisibleRef.current =
          true;

        adSeenRef.current =
          false;

        lockEndgameActions();
      }

      if (
        adVisible
      ) {
        adSeenRef.current =
          true;

        return;
      }

      if (
        adSeenRef.current &&
        endgameLockedRef.current
      ) {
        unlockEndgameActions();
      }
    }

    const observer =
      new MutationObserver(
        updateEndgameGate
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

    updateEndgameGate();

    return () => {
      observer.disconnect();

      document.body.classList.remove(
        "busbaas-endgame-actions-locked"
      );

      if (
        endgameSafetyTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          endgameSafetyTimerRef.current
        );
      }
    };
  }, []);

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
      <style>
        {`
          body.busbaas-endgame-actions-locked
          .bus-finished-panel button,
          body.busbaas-endgame-actions-locked
          .bus-finished-panel .waiting-message {
            display: none !important;
          }
        `}
      </style>

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
