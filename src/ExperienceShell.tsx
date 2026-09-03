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
  | "finish";

const SOUND_STORAGE_KEY =
  "busbaas-sound-enabled";

class BusbaasAudioEngine {
  private context:
    AudioContext | null =
      null;

  private getContext() {
    if (!this.context) {
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
      // Audio mag de game nooit blokkeren.
    }
  }

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
          0.0001,
          volume
        ),
        start + 0.012
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
        end + 0.03
      );
    } catch {
      // Geen fout voor de speler.
    }
  }

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
        start + 0.01
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
        end + 0.03
      );
    } catch {
      // Stil falen.
    }
  }

  private noise(
    duration: number,
    volume: number,
    delay = 0
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
          Math.random() *
            2 -
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

      source.buffer =
        buffer;

      filter.type =
        "highpass";

      filter.frequency.value =
        1300;

      gain.gain.setValueAtTime(
        volume,
        start
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start +
          duration
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
        start +
          duration +
          0.03
      );
    } catch {
      // Stil falen.
    }
  }

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

      switch (type) {
        case "tap":
          this.tone(
            520,
            0.055,
            0.035
          );
          break;

        case "card":
          this.noise(
            0.055,
            0.055
          );

          this.sweep(
            330,
            220,
            0.07,
            0.025,
            "triangle"
          );
          break;

        case "correct":
          this.tone(
            620,
            0.11,
            0.055
          );

          this.tone(
            830,
            0.15,
            0.06,
            "sine",
            0.085
          );
          break;

        case "wrong":
          this.sweep(
            260,
            145,
            0.26,
            0.075,
            "triangle"
          );

          this.tone(
            125,
            0.18,
            0.03,
            "sine",
            0.08
          );
          break;

        case "disco":
          this.tone(
            523,
            0.16,
            0.04,
            "square"
          );

          this.tone(
            659,
            0.16,
            0.04,
            "square",
            0.1
          );

          this.tone(
            784,
            0.18,
            0.045,
            "square",
            0.2
          );

          this.tone(
            1046,
            0.32,
            0.055,
            "sine",
            0.3
          );
          break;

        case "tree":
          this.tone(
            330,
            0.13,
            0.04,
            "triangle"
          );

          this.tone(
            440,
            0.15,
            0.045,
            "triangle",
            0.09
          );

          this.tone(
            550,
            0.25,
            0.05,
            "triangle",
            0.18
          );
          break;

        case "bus":
          this.tone(
            165,
            0.28,
            0.055,
            "sawtooth"
          );

          this.tone(
            220,
            0.28,
            0.035,
            "sawtooth"
          );

          this.tone(
            165,
            0.22,
            0.05,
            "sawtooth",
            0.34
          );

          this.tone(
            220,
            0.22,
            0.03,
            "sawtooth",
            0.34
          );
          break;

        case "double":
          this.tone(
            170,
            0.1,
            0.07,
            "square"
          );

          this.tone(
            170,
            0.1,
            0.07,
            "square",
            0.14
          );

          this.sweep(
            500,
            260,
            0.2,
            0.035,
            "triangle",
            0.26
          );
          break;

        case "finish":
          this.tone(
            392,
            0.14,
            0.045
          );

          this.tone(
            523,
            0.14,
            0.05,
            "sine",
            0.1
          );

          this.tone(
            659,
            0.14,
            0.055,
            "sine",
            0.2
          );

          this.tone(
            784,
            0.36,
            0.065,
            "sine",
            0.3
          );
          break;
      }
    } catch {
      // Audio mag nooit de app crashen.
    }
  }
}

const audioEngine =
  new BusbaasAudioEngine();

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

  const previousTreeCardRef =
    useRef("");

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

        return;
      }

      const previous =
        previousPhaseRef.current;

      if (
        phase === previous
      ) {
        return;
      }

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
    }

    function handleSounds() {
      const cardResult =
        document.querySelector(
          ".result-area"
        );

      if (
        cardResult &&
        !seenElementsRef.current.has(
          cardResult
        )
      ) {
        seenElementsRef.current.add(
          cardResult
        );

        const text =
          cardResult
            .textContent
            ?.toLowerCase() ||
          "";

        if (
          text.includes(
            "disco"
          )
        ) {
          play(
            "disco"
          );
        } else if (
          cardResult.classList.contains(
            "correct"
          )
        ) {
          play(
            "correct"
          );
        } else {
          play(
            "wrong"
          );
        }
      }

      const treeCard =
        document.querySelector(
          ".tree-active-card"
        );

      const treeCardText =
        treeCard
          ?.textContent
          ?.trim() ||
        "";

      if (
        treeCardText &&
        treeCardText !==
          previousTreeCardRef.current
      ) {
        previousTreeCardRef.current =
          treeCardText;

        play(
          "card"
        );
      }

      if (
        !treeCard
      ) {
        previousTreeCardRef.current =
          "";
      }

      const busResult =
        document.querySelector(
          ".bus-result"
        );

      if (
        busResult &&
        !seenElementsRef.current.has(
          busResult
        )
      ) {
        seenElementsRef.current.add(
          busResult
        );

        if (
          busResult.classList.contains(
            "correct"
          )
        ) {
          play(
            "correct"
          );
        } else {
          play(
            "wrong"
          );
        }
      }

      const doublePanel =
        document.querySelector(
          ".double-panel"
        );

      if (
        doublePanel &&
        !seenElementsRef.current.has(
          doublePanel
        )
      ) {
        seenElementsRef.current.add(
          doublePanel
        );

        play(
          "double"
        );
      }

      const finishedPanel =
        document.querySelector(
          ".bus-finished-panel"
        );

      if (
        finishedPanel &&
        !seenElementsRef.current.has(
          finishedPanel
        )
      ) {
        seenElementsRef.current.add(
          finishedPanel
        );

        play(
          "finish"
        );
      }
    }

    function update() {
      handlePhase();
      handleSounds();
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

  async function toggleSound() {
    const next =
      !soundEnabled;

    setSoundEnabled(
      next
    );

    if (next) {
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
          {soundToast}
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
              {transition.eyebrow}
            </span>

            <div className="experience-transition-icon">
              {transition.icon}
            </div>

            <h2>
              {transition.title}
            </h2>

            <p>
              {transition.text}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default ExperienceShell;