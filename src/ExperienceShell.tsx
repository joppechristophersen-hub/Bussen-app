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

type SoundType =
  | "tap"
  | "card"
  | "correct"
  | "wrong"
  | "disco"
  | "tree"
  | "bus"
  | "double"
  | "clink"
  | "finish";

const SOUND_STORAGE_KEY =
  "busbaas-sound-enabled";

/*
 * =========================================================
 * AUDIO ENGINE
 * =========================================================
 */

class BusbaasAudioEngine {
  private context:
    AudioContext | null =
      null;

  private getContext() {
    if (
      !this.context
    ) {
      this.context =
        new AudioContext();
    }

    return this.context;
  }

  async unlock() {
    try {
      const context =
        this.getContext();

      if (
        context.state ===
        "suspended"
      ) {
        await context.resume();
      }
    } catch {
      // Geluid mag gameplay nooit blokkeren.
    }
  }

  /*
   * =========================================================
   * BASIC TONE
   * =========================================================
   */

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type:
      OscillatorType =
      "sine",
    delay = 0
  ) {
    try {
      const context =
        this.getContext();

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      const start =
        context.currentTime +
        delay;

      const end =
        start +
        duration;

      oscillator.type =
        type;

      oscillator.frequency.setValueAtTime(
        frequency,
        start
      );

      gain.gain.setValueAtTime(
        0.0001,
        start
      );

      gain.gain.exponentialRampToValueAtTime(
        Math.max(
          volume,
          0.0001
        ),
        start +
          0.008
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        end
      );

      oscillator.connect(
        gain
      );

      gain.connect(
        context.destination
      );

      oscillator.start(
        start
      );

      oscillator.stop(
        end +
          0.04
      );
    } catch {
      // Stil falen.
    }
  }

  /*
   * =========================================================
   * FREQUENCY SWEEP
   * =========================================================
   */

  private sweep(
    from: number,
    to: number,
    duration: number,
    volume: number,
    type:
      OscillatorType =
      "sine",
    delay = 0
  ) {
    try {
      const context =
        this.getContext();

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      const start =
        context.currentTime +
        delay;

      const end =
        start +
        duration;

      oscillator.type =
        type;

      oscillator.frequency.setValueAtTime(
        from,
        start
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(
          1,
          to
        ),
        end
      );

      gain.gain.setValueAtTime(
        0.0001,
        start
      );

      gain.gain.exponentialRampToValueAtTime(
        volume,
        start +
          0.008
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        end
      );

      oscillator.connect(
        gain
      );

      gain.connect(
        context.destination
      );

      oscillator.start(
        start
      );

      oscillator.stop(
        end +
          0.04
      );
    } catch {
      // Stil falen.
    }
  }

  /*
   * =========================================================
   * FILTERED NOISE
   * =========================================================
   *
   * Hiermee maken we:
   * - kaartgeschuif
   * - kaart over tafel
   * - klappen/applaus
   */

  private filteredNoise(
    duration: number,
    volume: number,
    filterType:
      BiquadFilterType,
    frequency: number,
    delay = 0,
    q = 0.7
  ) {
    try {
      const context =
        this.getContext();

      const frameCount =
        Math.max(
          1,
          Math.floor(
            context.sampleRate *
              duration
          )
        );

      const buffer =
        context.createBuffer(
          1,
          frameCount,
          context.sampleRate
        );

      const data =
        buffer.getChannelData(
          0
        );

      for (
        let index = 0;
        index <
        frameCount;
        index += 1
      ) {
        data[index] =
          (
            Math.random() *
            2
          ) -
          1;
      }

      const source =
        context.createBufferSource();

      const filter =
        context.createBiquadFilter();

      const gain =
        context.createGain();

      const start =
        context.currentTime +
        delay;

      const end =
        start +
        duration;

      source.buffer =
        buffer;

      filter.type =
        filterType;

      filter.frequency.setValueAtTime(
        frequency,
        start
      );

      filter.Q.value =
        q;

      gain.gain.setValueAtTime(
        0.0001,
        start
      );

      gain.gain.exponentialRampToValueAtTime(
        Math.max(
          volume,
          0.0001
        ),
        start +
          Math.min(
            0.012,
            duration /
              3
          )
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        end
      );

      source.connect(
        filter
      );

      filter.connect(
        gain
      );

      gain.connect(
        context.destination
      );

      source.start(
        start
      );

      source.stop(
        end +
          0.04
      );
    } catch {
      // Stil falen.
    }
  }

  /*
   * =========================================================
   * CARD SLIDE
   * =========================================================
   *
   * Bewust GEEN klik.
   *
   * Twee lagen papier/frictie met een
   * heel zacht laag tikje aan het einde.
   */

  private cardSlide() {
    this.filteredNoise(
      0.19,
      0.065,
      "bandpass",
      2100,
      0,
      0.55
    );

    this.filteredNoise(
      0.12,
      0.038,
      "highpass",
      3300,
      0.045,
      0.7
    );

    this.filteredNoise(
      0.08,
      0.025,
      "bandpass",
      1100,
      0.095,
      0.8
    );

    this.sweep(
      260,
      185,
      0.13,
      0.014,
      "triangle",
      0.03
    );

    this.tone(
      105,
      0.045,
      0.016,
      "sine",
      0.14
    );
  }

  /*
   * =========================================================
   * GLASSES CLINK
   * =========================================================
   */

  private glassesClink() {
    /*
     * Eerste glas.
     */

    this.tone(
      1470,
      0.15,
      0.038,
      "sine"
    );

    this.tone(
      2350,
      0.12,
      0.021,
      "sine",
      0.008
    );

    /*
     * Tweede glas net erachter.
     */

    this.tone(
      1760,
      0.18,
      0.038,
      "sine",
      0.055
    );

    this.tone(
      2840,
      0.12,
      0.018,
      "sine",
      0.064
    );

    /*
     * Kleine contacttik.
     */

    this.filteredNoise(
      0.035,
      0.022,
      "highpass",
      3800,
      0.045,
      0.9
    );
  }

  /*
   * =========================================================
   * APPLAUSE
   * =========================================================
   */

  private applause() {
    const clapTimes = [
      0,
      0.055,
      0.11,
      0.17,
      0.23,
      0.3,
      0.37,
      0.43,
      0.5,
      0.58,
      0.66,
      0.74,
      0.83,
      0.92,
      1.02,
      1.12,
    ];

    clapTimes.forEach(
      (
        delay,
        index
      ) => {
        this.filteredNoise(
          0.075 +
            (
              index %
              3
            ) *
              0.012,
          0.035 +
            (
              index %
              4
            ) *
              0.006,
          "bandpass",
          1350 +
            (
              index %
              5
            ) *
              180,
          delay,
          0.8
        );
      }
    );

    /*
     * Zachte "wooo!"-achtige stijgende toon
     * achter het applaus.
     */

    this.sweep(
      260,
      620,
      0.65,
      0.018,
      "sine",
      0.06
    );

    this.sweep(
      320,
      760,
      0.72,
      0.014,
      "triangle",
      0.28
    );

    /*
     * Eindbelletje.
     */

    this.tone(
      784,
      0.25,
      0.025,
      "sine",
      0.92
    );

    this.tone(
      1046,
      0.35,
      0.027,
      "sine",
      1.02
    );
  }

  /*
   * =========================================================
   * PLAY
   * =========================================================
   */

  play(
    type:
      SoundType
  ) {
    try {
      const context =
        this.getContext();

      if (
        context.state ===
        "suspended"
      ) {
        void context.resume();
      }

      switch (
        type
      ) {
        case "tap": {
          this.tone(
            520,
            0.055,
            0.03
          );

          break;
        }

        case "card": {
          this.cardSlide();

          break;
        }

        case "correct": {
          this.tone(
            620,
            0.1,
            0.045,
            "sine"
          );

          this.tone(
            830,
            0.14,
            0.05,
            "sine",
            0.085
          );

          break;
        }

        case "wrong": {
          this.sweep(
            260,
            145,
            0.24,
            0.065,
            "triangle"
          );

          this.tone(
            125,
            0.16,
            0.025,
            "sine",
            0.07
          );

          break;
        }

        case "disco": {
          this.tone(
            523,
            0.14,
            0.035,
            "square"
          );

          this.tone(
            659,
            0.14,
            0.035,
            "square",
            0.09
          );

          this.tone(
            784,
            0.16,
            0.04,
            "square",
            0.18
          );

          this.tone(
            1046,
            0.3,
            0.05,
            "sine",
            0.27
          );

          break;
        }

        case "tree": {
          this.tone(
            330,
            0.13,
            0.035,
            "triangle"
          );

          this.tone(
            440,
            0.15,
            0.04,
            "triangle",
            0.09
          );

          this.tone(
            550,
            0.23,
            0.045,
            "triangle",
            0.18
          );

          break;
        }

        case "bus": {
          this.tone(
            165,
            0.26,
            0.045,
            "sawtooth"
          );

          this.tone(
            220,
            0.26,
            0.027,
            "sawtooth"
          );

          this.tone(
            165,
            0.2,
            0.04,
            "sawtooth",
            0.32
          );

          this.tone(
            220,
            0.2,
            0.025,
            "sawtooth",
            0.32
          );

          break;
        }

        case "double": {
          this.tone(
            170,
            0.09,
            0.055,
            "square"
          );

          this.tone(
            170,
            0.09,
            0.055,
            "square",
            0.13
          );

          this.sweep(
            500,
            260,
            0.18,
            0.03,
            "triangle",
            0.24
          );

          break;
        }

        case "clink": {
          this.glassesClink();

          break;
        }

        case "finish": {
          this.applause();

          break;
        }
      }
    } catch {
      // Audio mag nooit de app crashen.
    }
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
      ) !==
      "false"
    );
  } catch {
    return true;
  }
}

/*
 * =========================================================
 * APP PHASE
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
 * Dit is de belangrijkste verandering.
 *
 * We kijken niet langer alleen naar één specifieke
 * kaart in de boom.
 *
 * We volgen ALLE zichtbare kaartvlakken.
 *
 * Zodra die lijst verandert:
 *
 * 🃏 kaart schuift
 *
 * Daardoor werkt het automatisch bij:
 *
 * - voorronde
 * - eigen kaarten
 * - onthulde kaart
 * - boom
 * - Adtje
 * - gelijkspel
 * - buslengte
 * - aantal open kaarten
 * - bus
 * - hoger/lager
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
        const text =
          card.textContent
            ?.replace(
              /\s+/g,
              " "
            )
            .trim() ||
          "";

        return [
          index,
          card.className,
          text,
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

  const seenElementsRef =
    useRef(
      new WeakSet<Element>()
    );

  const previousCardSignatureRef =
    useRef("");

  /*
   * =========================================================
   * SOUND STORAGE
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
    function unlock() {
      if (
        soundEnabledRef.current
      ) {
        void audioEngine.unlock();
      }
    }

    window.addEventListener(
      "pointerdown",
      unlock,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        unlock
      );
    };
  }, []);

  function play(
    sound:
      SoundType
  ) {
    if (
      !soundEnabledRef.current
    ) {
      return;
    }

    audioEngine.play(
      sound
    );
  }

  function playDelayed(
    sound:
      SoundType,
    delay:
      number
  ) {
    window.setTimeout(
      () => {
        play(
          sound
        );
      },
      delay
    );
  }

  /*
   * =========================================================
   * TRANSITION
   * =========================================================
   */

  function showTransition(
    nextTransition:
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
      nextTransition
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
        1200
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

    if (
      !root
    ) {
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

        previousCardSignatureRef.current =
          getCardSignature();

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
       * VOORRONDE -> BOOM
       */

      if (
        previous ===
          "cards" &&
        phase ===
          "tree"
      ) {
        play(
          "tree"
        );

        showTransition(
          {
            type:
              "tree",

            eyebrow:
              "RONDE KLAAR",

            title:
              "Tijd voor de boom",

            text:
              "Kaarten op tafel. Speel je hand leeg en deel slokken uit.",

            icon:
              "🌲",
          },
          1450
        );
      }

      /*
       * BOOM -> BUS
       */

      if (
        previous ===
          "tree" &&
        phase ===
          "bus"
      ) {
        play(
          "bus"
        );

        showTransition(
          {
            type:
              "bus",

            eyebrow:
              "DE BOOM IS KLAAR",

            title:
              "Iedereen instappen",

            text:
              "Tijd voor de laatste rit van het spel.",

            icon:
              "🚌",
          },
          1200
        );
      }

      previousPhaseRef.current =
        phase;

      return true;
    }

    /*
     * =========================
     * ALLE KAARTBEWEGINGEN
     * =========================
     */

    function handleCardMovement(
      phaseChanged:
        boolean
    ) {
      const signature =
        getCardSignature();

      const previous =
        previousCardSignatureRef.current;

      if (
        previous ===
        ""
      ) {
        previousCardSignatureRef.current =
          signature;

        return;
      }

      if (
        signature ===
        previous
      ) {
        return;
      }

      previousCardSignatureRef.current =
        signature;

      /*
       * Bij een volledige schermovergang
       * spelen we geen extra kaartgeluid.
       *
       * De eerste echte kaart daarna
       * krijgt hem uiteraard wel.
       */

      if (
        phaseChanged
      ) {
        return;
      }

      play(
        "card"
      );
    }

    /*
     * =========================
     * RESULTATEN / EFFECTEN
     * =========================
     */

    function handleEffects() {
      /*
       * VOORRONDE
       */

      const resultAreas =
        document.querySelectorAll(
          ".result-area"
        );

      resultAreas.forEach(
        (
          result
        ) => {
          if (
            seenElementsRef.current.has(
              result
            )
          ) {
            return;
          }

          seenElementsRef.current.add(
            result
          );

          const text =
            result.textContent
              ?.toLowerCase() ||
            "";

          if (
            text.includes(
              "disco"
            )
          ) {
            playDelayed(
              "disco",
              130
            );

            return;
          }

          if (
            result.classList.contains(
              "correct"
            )
          ) {
            playDelayed(
              "correct",
              130
            );
          } else {
            playDelayed(
              "wrong",
              130
            );
          }
        }
      );

      /*
       * BUS RESULTAAT
       */

      const busResults =
        document.querySelectorAll(
          ".bus-result"
        );

      busResults.forEach(
        (
          result
        ) => {
          if (
            seenElementsRef.current.has(
              result
            )
          ) {
            return;
          }

          seenElementsRef.current.add(
            result
          );

          if (
            result.classList.contains(
              "correct"
            )
          ) {
            playDelayed(
              "correct",
              130
            );
          } else {
            playDelayed(
              "wrong",
              130
            );
          }
        }
      );

      /*
       * DUBBEL IN DE BUS
       */

      const doublePanels =
        document.querySelectorAll(
          ".double-panel"
        );

      doublePanels.forEach(
        (
          panel
        ) => {
          if (
            seenElementsRef.current.has(
              panel
            )
          ) {
            return;
          }

          seenElementsRef.current.add(
            panel
          );

          playDelayed(
            "double",
            130
          );
        }
      );

      /*
       * BOOM:
       * SLOKKEN UITGEDEELD
       */

      const announcements =
        document.querySelectorAll(
          ".game-announcement"
        );

      announcements.forEach(
        (
          announcement
        ) => {
          if (
            seenElementsRef.current.has(
              announcement
            )
          ) {
            return;
          }

          const text =
            announcement.textContent
              ?.toLowerCase() ||
            "";

          if (
            text.includes(
              "slokken uitgedeeld"
            ) ||
            text.includes(
              "drinken maar"
            )
          ) {
            seenElementsRef.current.add(
              announcement
            );

            play(
              "clink"
            );
          }
        }
      );

      /*
       * EINDE
       */

      const finishedPanels =
        document.querySelectorAll(
          ".bus-finished-panel"
        );

      finishedPanels.forEach(
        (
          panel
        ) => {
          if (
            seenElementsRef.current.has(
              panel
            )
          ) {
            return;
          }

          seenElementsRef.current.add(
            panel
          );

          play(
            "finish"
          );
        }
      );
    }

    /*
     * =========================
     * UPDATE
     * =========================
     */

    function update() {
      const phaseChanged =
        handlePhase();

      handleCardMovement(
        phaseChanged
      );

      handleEffects();
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
   * SOUND TOGGLE
   * =========================================================
   */

  async function toggleSound() {
    const next =
      !soundEnabled;

    /*
     * Ref direct aanpassen zodat geluid
     * onmiddellijk reageert.
     */

    soundEnabledRef.current =
      next;

    setSoundEnabled(
      next
    );

    if (
      next
    ) {
      await audioEngine.unlock();

      audioEngine.play(
        "tap"
      );

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
        {soundEnabled
          ? "🔊"
          : "🔇"}
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