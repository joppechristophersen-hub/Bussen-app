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
    | "wrong"
    | "disco";

  eventId?: string;

  variant?: number;

  playAt?: number;

  localPlayAt?: number;
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
 * Optioneel nieuw bestand.
 *
 * Als disco.mp3 nog niet aanwezig is,
 * gebruiken we automatisch een kort stukje
 * van finish-cheer.mp3 als fallback.
 */
const DISCO_SOUND =
  "/sounds/disco.mp3";

/*
 * =========================================================
 * REAL AUDIO ENGINE - WEB AUDIO
 * =========================================================
 *
 * Waarom geen losse HTMLAudioElement's meer?
 *
 * - Android/WebView mist daar soms snelle remote sounds.
 * - ieder toestel start een .play() net iets anders.
 * - AudioBufferSourceNode kan een exact toekomstig
 *   startmoment plannen.
 *
 * Daardoor spelen alle toestellen veel strakker gelijk.
 */
class BusbaasAudioEngine {
  private context:
    AudioContext;

  private bufferPromises =
    new Map<
      string,
      Promise<AudioBuffer>
    >();


  constructor() {
    this.context =
      new AudioContext();

    /*
     * Bestanden alvast laden/decode-en.
     * Dit mag ook wanneer de AudioContext nog suspended is.
     */
    void this.preloadAll();
  }

  private async loadBuffer(
    source:
      string
  ) {
    const existing =
      this.bufferPromises.get(
        source
      );

    if (existing) {
      return existing;
    }

    const promise =
      fetch(source)
        .then(
          async (
            response
          ) => {
            if (
              !response.ok
            ) {
              throw new Error(
                `Audio niet gevonden: ${source}`
              );
            }

            const data =
              await response.arrayBuffer();

            return this.context.decodeAudioData(
              data
            );
          }
        );

    this.bufferPromises.set(
      source,
      promise
    );

    try {
      return await promise;
    } catch (
      error
    ) {
      /*
       * Bij een tijdelijk probleem mag een volgende
       * poging opnieuw proberen te laden.
       */
      this.bufferPromises.delete(
        source
      );

      throw error;
    }
  }

  private async preloadAll() {
    const required = [
      ...CARD_SOUNDS,
      CARD_PLACE_SOUND,
      GLASS_SOUND,
      FINISH_SOUND,
      CORRECT_SOUND,
      WRONG_SOUND,
      BUS_HORN_SOUND,
    ];

    await Promise.allSettled(
      required.map(
        (
          source
        ) =>
          this.loadBuffer(
            source
          )
      )
    );

    /*
     * Disco is optioneel zodat een ontbrekend
     * disco.mp3 de rest nooit kan blokkeren.
     */
    void this.loadBuffer(
      DISCO_SOUND
    ).catch(
      () => {
        // Fallback wordt later gebruikt.
      }
    );
  }

  async unlock() {
    try {
      if (
        this.context.state ===
        "suspended"
      ) {
        await this.context.resume();
      }

      /*
       * Een bijna-stille buffer tijdens een echte
       * pointeractie helpt mobiele WebViews om
       * remote audio daarna betrouwbaar toe te laten.
       */
      const buffer =
        this.context.createBuffer(
          1,
          1,
          this.context.sampleRate
        );

      const source =
        this.context.createBufferSource();

      source.buffer =
        buffer;

      source.connect(
        this.context.destination
      );

      source.start();

    } catch {
      // Audio mag gameplay nooit blokkeren.
    }
  }

  private async ensureRunning() {
    try {
      if (
        this.context.state ===
        "suspended"
      ) {
        await this.context.resume();
      }
    } catch {
      // Als het OS blokkeert, proberen we bij de volgende actie opnieuw.
    }
  }

  private async scheduleFile(
    source:
      string,

    localPlayAt:
      number,

    options?: {
      volume?: number;
      playbackRate?: number;
      stopAfterMs?: number;
      fallbackSource?: string;
    }
  ) {
    let buffer:
      AudioBuffer;

    try {
      buffer =
        await this.loadBuffer(
          source
        );
    } catch {
      if (
        !options?.fallbackSource
      ) {
        return;
      }

      try {
        buffer =
          await this.loadBuffer(
            options.fallbackSource
          );
      } catch {
        return;
      }
    }

    await this.ensureRunning();

    if (
      this.context.state !==
      "running"
    ) {
      return;
    }

    const node =
      this.context.createBufferSource();

    const gain =
      this.context.createGain();

    node.buffer =
      buffer;

    node.playbackRate.value =
      options?.playbackRate ??
      1;

    gain.gain.value =
      Math.max(
        0,
        Math.min(
          1,
          options?.volume ??
            1
        )
      );

    node.connect(
      gain
    );

    gain.connect(
      this.context.destination
    );

    /*
     * localPlayAt is een epoch timestamp op DIT toestel.
     * De App heeft hem vooraf gecorrigeerd voor
     * het klokverschil met de server.
     */
    const delayMs =
      Math.max(
        0,
        localPlayAt -
          Date.now()
      );

    const startAt =
      this.context.currentTime +
      delayMs /
        1000;

    node.start(
      startAt
    );

    const stopAfterMs =
      Number(
        options?.stopAfterMs ??
        0
      );

    if (
      stopAfterMs >
      0
    ) {
      node.stop(
        startAt +
          stopAfterMs /
            1000
      );
    }
  }

  playCard(
    localPlayAt:
      number,
    variant =
      0
  ) {
    const safeIndex =
      Math.abs(
        Number(
          variant
        ) || 0
      ) %
      CARD_SOUNDS.length;

    void this.scheduleFile(
      CARD_SOUNDS[
        safeIndex
      ],
      localPlayAt,
      {
        volume:
          0.75,
        playbackRate:
          1,
      }
    );
  }

  playCardPlace(
    localPlayAt:
      number
  ) {
    void this.scheduleFile(
      CARD_PLACE_SOUND,
      localPlayAt,
      {
        volume:
          0.78,
      }
    );
  }

  playCorrect(
    localPlayAt:
      number
  ) {
    void this.scheduleFile(
      CORRECT_SOUND,
      localPlayAt,
      {
        volume:
          0.68,
      }
    );
  }

  playWrong(
    localPlayAt:
      number
  ) {
    void this.scheduleFile(
      WRONG_SOUND,
      localPlayAt,
      {
        volume:
          0.66,
      }
    );
  }

  playGlass(
    localPlayAt:
      number
  ) {
    void this.scheduleFile(
      GLASS_SOUND,
      localPlayAt,
      {
        volume:
          0.84,
      }
    );
  }

  playBusHorn(
    localPlayAt:
      number
  ) {
    void this.scheduleFile(
      BUS_HORN_SOUND,
      localPlayAt,
      {
        volume:
          0.82,
      }
    );
  }

  playDisco(
    localPlayAt:
      number
  ) {
    void this.scheduleFile(
      DISCO_SOUND,
      localPlayAt,
      {
        volume:
          0.82,

        /*
         * Zonder disco.mp3 wordt een kort stukje
         * van het bestaande juichgeluid gebruikt.
         */
        fallbackSource:
          FINISH_SOUND,

        stopAfterMs:
          1500,
      }
    );
  }

  playFinish(
    localPlayAt:
      number
  ) {
    void this.scheduleFile(
      FINISH_SOUND,
      localPlayAt,
      {
        volume:
          0.74,
      }
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


  /*
   * =========================================================
   * SERVERGESTUURDE SOUNDS
   * =========================================================
   *
   * Alle geluiden krijgen van de server één toekomstig
   * afspeelmoment. AudioContext plant ze op dat moment.
   *
   * Daardoor:
   * - host en telefoon horen hetzelfde fragment;
   * - kaartvarianten zijn gelijk;
   * - verschil door netwerk/HTMLAudio is veel kleiner;
   * - card -> correct/wrong blijft exact op volgorde.
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

        if (
          handledSoundIdsRef.current.size >
          300
        ) {
          handledSoundIdsRef.current.clear();

          handledSoundIdsRef.current.add(
            effect.eventId
          );
        }
      }

      const playAt =
        Number.isFinite(
          Number(
            effect.localPlayAt
          )
        )
          ? Number(
              effect.localPlayAt
            )
          : Date.now() +
            60;

      if (
        effect.type ===
        "card"
      ) {
        audioEngine.playCard(
          playAt,
          effect.variant
        );

        return;
      }

      if (
        effect.type ===
        "glass"
      ) {
        audioEngine.playGlass(
          playAt
        );

        return;
      }

      if (
        effect.type ===
        "bus-horn"
      ) {
        audioEngine.playBusHorn(
          playAt
        );

        return;
      }

      if (
        effect.type ===
        "finish"
      ) {
        audioEngine.playFinish(
          playAt
        );

        return;
      }

      if (
        effect.type ===
        "card-result"
      ) {
        /*
         * Voorronde:
         *
         * kaart wordt zichtbaar
         * -> kaartgeluid
         * -> 260 ms later resultaat
         */
        audioEngine.playCard(
          playAt,
          effect.variant
        );

        const resultAt =
          playAt +
          260;

        if (
          effect.result ===
          "disco"
        ) {
          audioEngine.playDisco(
            resultAt
          );

          return;
        }

        if (
          effect.result ===
          "correct"
        ) {
          audioEngine.playCorrect(
            resultAt
          );
        } else {
          audioEngine.playWrong(
            resultAt
          );
        }

        return;
      }

      if (
        effect.type ===
        "bus-card-result"
      ) {
        /*
         * Tijdens de bus:
         *
         * alleen nieuwe kaart OPLEGGEN
         * -> card-place
         * -> 300 ms later goed/fout.
         */
        audioEngine.playCardPlace(
          playAt
        );

        const resultAt =
          playAt +
          300;

        if (
          effect.result ===
          "correct"
        ) {
          audioEngine.playCorrect(
            resultAt
          );
        } else {
          audioEngine.playWrong(
            resultAt
          );
        }
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
