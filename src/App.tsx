import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  QRCodeSVG,
} from "qrcode.react";

import {
  io,
} from "socket.io-client";

import "./App.css";

type Screen =
  | "home"
  | "settings"
  | "rules"
  | "howto"
  | "join"
  | "lobby"
  | "game";

type GamePhase =
  | "cards"
  | "tree"
  | "tree-tiebreak"
  | "tree-finished"
  | "bus-setup"
  | "bus"
  | "bus-finished";

type DoubleRule =
  | "pass"
  | "take-along";

type CheckpointFailRule =
  | "retry"
  | "reset"
  | "safe";

type Card = {
  id: string;
  suit: string;
  symbol: string;
  value: number;
  name: string;
  color:
    | "rood"
    | "zwart";
};

type Player = {
  id: string;
  name: string;
  isHost: boolean;
  cards?: Card[];
};

type GuessResult = {
  playerId: string;
  playerName: string;
  step: number;
  card: Card;
  guess: string;
  correct: boolean;
  drinks: number;
  isDisco?: boolean;
};

type TreeCard = {
  id: string;
  revealed: boolean;
  isDouble: boolean;
  card: Card | null;
};

type TreeRow = {
  rowNumber: number;
  drinks: number;
  cards: TreeCard[];
};

type TreeActiveCard = {
  rowIndex: number;
  cardIndex: number;
  rowNumber: number;
  isDouble: boolean;
  card: Card;
};

type TreeReceiver = {
  playerId: string;
  playerName: string;
  count: number;
};

type TreeLastAction = {
  type:
    | "distributed"
    | "skipped";

  giverId: string;
  giverName: string;
  total: number;

  receivers:
    TreeReceiver[];
};

type TreeResolutionSummary = {
  receivers:
    TreeReceiver[];

  total: number;
};

type BusDriver = {
  id: string;
  name: string;
  remainingCards: number;
};

type TieBreakRound = {
  round: number;

  draws: {
    playerId: string;
    playerName: string;
    card: Card;
  }[];
};

type AdtCardState = {
  revealed: boolean;
  card: Card | null;
};

type AdtLastAction = {
  giverId: string;
  giverName: string;
  receiverId: string;
  receiverName: string;
};

type TreeState = {
  rows: TreeRow[];

  status:
    | "waiting"
    | "no-match"
    | "resolving"
    | "resolved"
    | "adt"
    | "tie-break"
    | "finished";

  activeCard:
    TreeActiveCard | null;

  pendingResolverIds:
    string[];

  currentResolverId:
    string | null;

  drinksToDistribute:
    number;

  revealedCount:
    number;

  totalCards:
    number;

  lastAction:
    TreeLastAction | null;

  resolutionSummary:
    TreeResolutionSummary | null;

  busDriver:
    BusDriver | null;

  tieBreakRounds:
    TieBreakRound[];

  tieBreakCandidateIds:
    string[];

  tieBreakPendingIds:
    string[];

  adtCard:
    AdtCardState | null;

  adtStatus:
    | "disabled"
    | "waiting"
    | "resolving"
    | "no-match"
    | "resolved"
    | "finished";

  adtPendingResolverIds:
    string[];

  adtCurrentResolverId:
    string | null;

  adtLastAction:
    AdtLastAction | null;
};

type BusPile = {
  index: number;
  revealed: boolean;
  card: Card | null;
  isCheckpoint: boolean;
  isActiveCheckpoint?: boolean;
};

type BusResult = {
  type:
    | "correct"
    | "wrong"
    | "double";

  guess: string;
  position: number;
  fromCard: Card;
  newCard: Card;
  correct: boolean;
  double: boolean;
  busFull?: boolean;
  drinks: number;
  restartIndex?: number;
  secondChance?: boolean;
  checkpointSafe?: boolean;
};

type BusState = {
  status:
    | "draw-length"
    | "draw-open"
    | "checkpoints"
    | "ready"
    | "playing"
    | "result"
    | "double-choice"
    | "finished";

  lengthCard:
    Card | null;

  openCountCard:
    Card | null;

  length: number;
  initialOpenCount: number;
  activeDriverId: string;
  riders: string[];
  doubleRule: DoubleRule;
  checkpointFailRule: CheckpointFailRule;
  checkpointRetryUsedIndex: number | null;
  activeCheckpointIndex: number | null;
  checkpoints: number[];
  currentIndex: number;
  piles: BusPile[];
  result: BusResult | null;
  finished: boolean;
};

type GameState = {
  serverVersion?: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  currentStep: number;
  currentCard: Card | null;
  waitingForGuess: boolean;
  resultShowing: boolean;
  result?: GuessResult | null;
  resultEndsAt?: number | null;
  gameFinished: boolean;
  tree: TreeState | null;
  bus: BusState | null;
};

type Announcement = {
  kind:
    | "driver"
    | "new-driver"
    | "passenger";

  name: string;
};

type StockShuffleNotice = {
  count: number;
};

const socket = io(
  "https://bussen-server.onrender.com",
  {
    autoConnect:
      false,
  }
);

function App() {
  const socketId =
    socket.id ?? "";

  const [
    screen,
    setScreen,
  ] =
    useState<Screen>(
      "home"
    );

  const [
    players,
    setPlayers,
  ] =
    useState(4);

  const [
    rows,
    setRows,
  ] =
    useState(4);

  const [
    decks,
    setDecks,
  ] =
    useState(1);

  const [
    checkpoints,
    setCheckpoints,
  ] =
    useState(false);

  const [
    treeDouble,
    setTreeDouble,
  ] =
    useState(true);

  const [
    adtCard,
    setAdtCard,
  ] =
    useState(false);

  const [
    doubleRule,
    setDoubleRule,
  ] =
    useState<DoubleRule>(
      "pass"
    );

  const [
    checkpointFailRule,
    setCheckpointFailRule,
  ] =
    useState<CheckpointFailRule>(
      "retry"
    );

  const [
    hostName,
    setHostName,
  ] =
    useState("");

  const [
    roomCode,
    setRoomCode,
  ] =
    useState("");

  const [
    playerNames,
    setPlayerNames,
  ] =
    useState<Player[]>(
      []
    );

  const [
    playerName,
    setPlayerName,
  ] =
    useState("");

  const [
    joinCode,
    setJoinCode,
  ] =
    useState("");

  const [
    joinError,
    setJoinError,
  ] =
    useState("");

  const [
    isHost,
    setIsHost,
  ] =
    useState(false);

  const [
    gameState,
    setGameState,
  ] =
    useState<GameState | null>(
      null
    );

  const [
    drawnCard,
    setDrawnCard,
  ] =
    useState<Card | null>(
      null
    );

  const [
    guessResult,
    setGuessResult,
  ] =
    useState<GuessResult | null>(
      null
    );

  const [
    countdown,
    setCountdown,
  ] =
    useState(0);

  const [
    distribution,
    setDistribution,
  ] =
    useState<
      Record<
        string,
        number
      >
    >({});

  const [
    treeSubmitting,
    setTreeSubmitting,
  ] =
    useState(false);

  const [
    selectedCheckpoints,
    setSelectedCheckpoints,
  ] =
    useState<number[]>(
      []
    );

  const [
    busSubmitting,
    setBusSubmitting,
  ] =
    useState(false);

  const [
    announcement,
    setAnnouncement,
  ] =
    useState<Announcement | null>(
      null
    );

  const [
    discoCelebration,
    setDiscoCelebration,
  ] =
    useState<string | null>(
      null
    );

  const [
    stockShuffleNotice,
    setStockShuffleNotice,
  ] =
    useState<StockShuffleNotice | null>(
      null
    );

  const previousBusRef =
    useRef<{
      exists: boolean;
      activeDriverId:
        string | null;
      riders: string[];
    }>({
      exists:
        false,

      activeDriverId:
        null,

      riders:
        [],
    });

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const roomFromUrl =
      params
        .get("room")
        ?.toUpperCase();

    if (
      roomFromUrl &&
      roomFromUrl.length === 5
    ) {
      setJoinCode(
        roomFromUrl
      );

      setScreen(
        "join"
      );
    }
  }, []);

  useEffect(() => {
    if (!announcement) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setAnnouncement(
            null
          );
        },
        2600
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    announcement,
  ]);

  useEffect(() => {
    if (!discoCelebration) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setDiscoCelebration(
            null
          );
        },
        2400
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    discoCelebration,
  ]);

  useEffect(() => {
    if (!stockShuffleNotice) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setStockShuffleNotice(
            null
          );
        },
        1600
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    stockShuffleNotice,
  ]);

  useEffect(() => {
    function syncHost(
      updatedPlayers:
        Player[]
    ) {
      const me =
        updatedPlayers.find(
          (player) =>
            player.id ===
            socket.id
        );

      setIsHost(
        Boolean(
          me?.isHost
        )
      );
    }

    function handlePlayersUpdated(
      updatedPlayers:
        Player[]
    ) {
      setPlayerNames(
        updatedPlayers
      );

      syncHost(
        updatedPlayers
      );
    }

    function handleGameStarted() {
      setDrawnCard(null);
      setGuessResult(null);
      setCountdown(0);
      setDistribution({});
      setSelectedCheckpoints([]);
      setTreeSubmitting(false);
      setBusSubmitting(false);
      setAnnouncement(null);
      setDiscoCelebration(null);
      setStockShuffleNotice(null);

      previousBusRef.current = {
        exists:
          false,

        activeDriverId:
          null,

        riders:
          [],
      };

      setScreen(
        "game"
      );
    }

    function handleGameState(
      state:
        GameState
    ) {
      setGameState(
        state
      );

      setPlayerNames(
        state.players
      );

      syncHost(
        state.players
      );

      const previousBus =
        previousBusRef.current;

      if (state.bus) {
        if (
          !previousBus.exists &&
          state.phase ===
            "bus-setup"
        ) {
          const driver =
            state.players.find(
              (player) =>
                player.id ===
                state.bus
                  ?.activeDriverId
            );

          if (driver) {
            setAnnouncement({
              kind:
                "driver",

              name:
                driver.name,
            });
          }
        } else if (
          previousBus.activeDriverId &&
          previousBus.activeDriverId !==
            state.bus
              .activeDriverId
        ) {
          const newDriver =
            state.players.find(
              (player) =>
                player.id ===
                state.bus
                  ?.activeDriverId
            );

          if (newDriver) {
            setAnnouncement({
              kind:
                "new-driver",

              name:
                newDriver.name,
            });
          }
        } else if (
          state.bus.riders.length >
          previousBus.riders.length
        ) {
          const newRiderId =
            state.bus.riders.find(
              (id) =>
                !previousBus.riders.includes(
                  id
                )
            );

          const newRider =
            state.players.find(
              (player) =>
                player.id ===
                newRiderId
            );

          if (newRider) {
            setAnnouncement({
              kind:
                "passenger",

              name:
                newRider.name,
            });
          }
        }

        previousBusRef.current = {
          exists:
            true,

          activeDriverId:
            state.bus
              .activeDriverId,

          riders: [
            ...state.bus
              .riders,
          ],
        };
      } else {
        previousBusRef.current = {
          exists:
            false,

          activeDriverId:
            null,

          riders:
            [],
        };
      }

      if (
        state.phase ===
          "cards" &&
        state.resultShowing &&
        state.result
      ) {
        setGuessResult(
          state.result
        );
      }

      if (
        state.phase ===
          "cards" &&
        !state.resultShowing
      ) {
        setGuessResult(
          null
        );

        setCountdown(
          0
        );
      }

      if (
        state.phase ===
          "cards" &&
        !state.waitingForGuess &&
        !state.resultShowing
      ) {
        setDrawnCard(
          null
        );
      }

      if (
        state.phase !==
        "cards"
      ) {
        setDrawnCard(
          null
        );

        setGuessResult(
          null
        );
      }

      if (
        state.bus
      ) {
        setSelectedCheckpoints(
          state.bus
            .checkpoints
        );
      }

      setBusSubmitting(
        false
      );

      setTreeSubmitting(
        false
      );
    }

    function handleCardDrawn({
      card,
    }: {
      card: Card;
    }) {
      setDrawnCard(
        card
      );

      setGuessResult(
        null
      );
    }

    function handleGuessResult(
      result:
        GuessResult
    ) {
      setGuessResult(
        result
      );

      setDrawnCard(
        null
      );

      setCountdown(
        3
      );

      if (
        result.isDisco &&
        result.correct
      ) {
        setDiscoCelebration(
          result.playerName
        );
      }
    }

    function handleStockReshuffled(
      notice:
        StockShuffleNotice
    ) {
      setStockShuffleNotice({
        count:
          Number(
            notice?.count
          ) || 0,
      });
    }

    function handleRoomClosed() {
      alert(
        "De host heeft de kamer gesloten."
      );

      resetToHome();
    }

    function handleRemovedFromRoom() {
      alert(
        "Je bent uit de kamer verwijderd."
      );

      resetToHome();
    }

    function handleReturnHome() {
      resetToHome();
    }

    socket.on(
      "players-updated",
      handlePlayersUpdated
    );

    socket.on(
      "game-started",
      handleGameStarted
    );

    socket.on(
      "game-state",
      handleGameState
    );

    socket.on(
      "card-drawn",
      handleCardDrawn
    );

    socket.on(
      "guess-result",
      handleGuessResult
    );

    socket.on(
      "stock-reshuffled",
      handleStockReshuffled
    );

    socket.on(
      "room-closed",
      handleRoomClosed
    );

    socket.on(
      "removed-from-room",
      handleRemovedFromRoom
    );

    socket.on(
      "return-home",
      handleReturnHome
    );

    return () => {
      socket.off(
        "players-updated",
        handlePlayersUpdated
      );

      socket.off(
        "game-started",
        handleGameStarted
      );

      socket.off(
        "game-state",
        handleGameState
      );

      socket.off(
        "card-drawn",
        handleCardDrawn
      );

      socket.off(
        "guess-result",
        handleGuessResult
      );

      socket.off(
        "stock-reshuffled",
        handleStockReshuffled
      );

      socket.off(
        "room-closed",
        handleRoomClosed
      );

      socket.off(
        "removed-from-room",
        handleRemovedFromRoom
      );

      socket.off(
        "return-home",
        handleReturnHome
      );
    };
  }, []);

  useEffect(() => {
    if (
      !guessResult ||
      gameState?.phase !==
        "cards"
    ) {
      setCountdown(
        0
      );

      return;
    }

    const endTime =
      Number(
        gameState.resultEndsAt ??
          0
      );

    if (
      endTime <= 0
    ) {
      return;
    }

    function updateCountdown() {
      setCountdown(
        Math.max(
          0,
          Math.ceil(
            (
              endTime -
              Date.now()
            ) /
              1000
          )
        )
      );
    }

    updateCountdown();

    const interval =
      window.setInterval(
        updateCountdown,
        100
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    guessResult,
    gameState?.phase,
    gameState?.resultEndsAt,
  ]);

  useEffect(() => {
    setDistribution(
      {}
    );

    setTreeSubmitting(
      false
    );
  }, [
    gameState?.tree
      ?.currentResolverId,

    gameState?.tree
      ?.activeCard?.card.id,

    gameState?.tree
      ?.adtCurrentResolverId,
  ]);

  function resetToHome() {
    setRoomCode("");
    setPlayerNames([]);
    setIsHost(false);
    setGameState(null);
    setDrawnCard(null);
    setGuessResult(null);
    setCountdown(0);
    setDistribution({});
    setSelectedCheckpoints([]);
    setTreeSubmitting(false);
    setBusSubmitting(false);
    setAnnouncement(null);
    setDiscoCelebration(null);
    setStockShuffleNotice(null);

    previousBusRef.current = {
      exists:
        false,

      activeDriverId:
        null,

      riders:
        [],
    };

    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );

    setScreen(
      "home"
    );
  }

  function getCardRank(
    card: Card
  ) {
    if (
      card.name ===
      "Boer"
    ) {
      return "B";
    }

    if (
      card.name ===
      "Vrouw"
    ) {
      return "V";
    }

    if (
      card.name ===
      "Heer"
    ) {
      return "H";
    }

    if (
      card.name ===
      "Aas"
    ) {
      return "A";
    }

    return card.name;
  }

  function renderPlayingCard(
    card: Card
  ) {
    return (
      <>
        <div className="card-corner card-corner-top">
          <strong>
            {getCardRank(
              card
            )}
          </strong>

          <span>
            {card.symbol}
          </span>
        </div>

        <div className="card-center-symbol">
          {card.symbol}
        </div>

        <div className="card-corner card-corner-bottom">
          <strong>
            {getCardRank(
              card
            )}
          </strong>

          <span>
            {card.symbol}
          </span>
        </div>
      </>
    );
  }

  function renderAnnouncement() {
    if (
      !announcement
    ) {
      return null;
    }

    let icon =
      "🚌";

    let label =
      "DE BUS";

    let title =
      "We hebben een chauffeur!";

    let text =
      `${announcement.name} moet de bus in.`;

    if (
      announcement.kind ===
      "new-driver"
    ) {
      icon =
        "🔄";

      label =
        "BUS DOORGEGEVEN";

      title =
        "Nieuwe chauffeur!";

      text =
        `${announcement.name} neemt de bus over.`;
    }

    if (
      announcement.kind ===
      "passenger"
    ) {
      icon =
        "🙋";

      label =
        "NIEUWE PASSAGIER";

      title =
        "Er stapt iemand in!";

      text =
        `${announcement.name} gaat mee de bus in.`;
    }

    return (
      <div className="announcement-layer">
        <div className="game-announcement">
          <div className="announcement-icon">
            {icon}
          </div>

          <span className="announcement-label">
            {label}
          </span>

          <h2>
            {title}
          </h2>

          <strong className="announcement-name">
            {announcement.name}
          </strong>

          <p>
            {text}
          </p>
        </div>
      </div>
    );
  }

  function renderStockShufflePopup() {
    if (
      !stockShuffleNotice
    ) {
      return null;
    }

    return (
      <div className="announcement-layer">
        <div className="game-announcement">
          <div className="announcement-icon">
            🔀
          </div>

          <span className="announcement-label">
            TREKSTAPEL LEEG
          </span>

          <h2>
            Opnieuw schudden!
          </h2>

          <strong className="announcement-name">
            🃏 Nieuwe trekstapel
          </strong>

          <p>
            {stockShuffleNotice.count >
            0
              ? `${stockShuffleNotice.count} kaarten van de aflegstapel zijn opnieuw geschud.`
              : "De aflegstapel is opnieuw geschud."}
          </p>
        </div>
      </div>
    );
  }

  function renderTreeResolutionPopup(
    tree:
      TreeState
  ) {
    if (
      tree.status !==
        "resolved" ||
      !tree.resolutionSummary ||
      tree.resolutionSummary
        .receivers.length ===
        0
    ) {
      return null;
    }

    return (
      <div className="announcement-layer">
        <div className="game-announcement">
          <div className="announcement-icon">
            🥃
          </div>

          <span className="announcement-label">
            SLOKKEN UITGEDEELD
          </span>

          <h2>
            Drinken maar!
          </h2>

          <div
            style={{
              width:
                "100%",

              display:
                "grid",

              gap:
                "8px",

              marginTop:
                "6px",
            }}
          >
            {tree.resolutionSummary.receivers.map(
              (
                receiver
              ) => (
                <div
                  key={
                    receiver.playerId
                  }
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "space-between",

                    alignItems:
                      "center",

                    gap:
                      "20px",

                    padding:
                      "10px 14px",

                    borderRadius:
                      "14px",

                    background:
                      "rgba(255,255,255,.08)",
                  }}
                >
                  <strong>
                    {
                      receiver.playerName
                    }
                  </strong>

                  <span>
                    🥃{" "}
                    {
                      receiver.count
                    }{" "}
                    {receiver.count ===
                    1
                      ? "slok"
                      : "slokken"}
                  </span>
                </div>
              )
            )}
          </div>

          <p>
            Volgende kaart komt eraan...
          </p>
        </div>
      </div>
    );
  }

  function renderBusFullPopup(
    bus:
      BusState
  ) {
    if (
      !bus.result?.busFull
    ) {
      return null;
    }

    return (
      <div className="announcement-layer">
        <div className="game-announcement">
          <div className="announcement-icon">
            🚌
          </div>

          <span className="announcement-label">
            IEDEREEN AAN BOORD
          </span>

          <h2>
            De bus zit vol!
          </h2>

          <strong className="announcement-name">
            Geen plek meer
          </strong>

          <p>
            Iedereen zit al in de bus. We gaan automatisch verder.
          </p>
        </div>
      </div>
    );
  }

  function renderConfetti() {
    return (
      <div className="confetti-layer">
        {Array.from({
          length:
            42,
        }).map(
          (
            _,
            index
          ) => (
            <span
              key={
                index
              }
              className={`confetti-piece confetti-${index % 6}`}
              style={{
                left:
                  `${(index * 37) % 100}%`,

                animationDelay:
                  `${(index % 10) * 0.11}s`,

                animationDuration:
                  `${2.5 + (index % 6) * 0.18}s`,
              }}
            />
          )
        )}
      </div>
    );
  }

  function renderDiscoCelebration() {
    if (
      !discoCelebration
    ) {
      return null;
    }

    return (
      <>
        <style>
          {`
            @keyframes discoOverlayIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            @keyframes discoBallSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            @keyframes discoBallPulse {
              from {
                box-shadow:
                  0 0 25px rgba(255,255,255,.7),
                  0 0 60px rgba(180,100,255,.45);
              }

              to {
                box-shadow:
                  0 0 45px rgba(255,255,255,1),
                  0 0 100px rgba(70,220,255,.75);
              }
            }

            @keyframes discoBeamOne {
              from { transform: rotate(-32deg); }
              to { transform: rotate(32deg); }
            }

            @keyframes discoBeamTwo {
              from { transform: rotate(35deg); }
              to { transform: rotate(-35deg); }
            }

            @keyframes discoTextPop {
              0% {
                opacity: 0;
                transform: translateY(25px) scale(.75);
              }

              70% {
                transform: translateY(-4px) scale(1.08);
              }

              100% {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            @keyframes discoSparkle {
              0%, 100% {
                opacity: .25;
                transform: scale(.7);
              }

              50% {
                opacity: 1;
                transform: scale(1.25);
              }
            }
          `}
        </style>

        <div
          style={{
            position:
              "fixed",

            inset:
              0,

            zIndex:
              1500,

            overflow:
              "hidden",

            pointerEvents:
              "none",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            background:
              "radial-gradient(circle at center, rgba(74,25,110,.72), rgba(4,5,12,.94))",

            backdropFilter:
              "blur(5px)",

            animation:
              "discoOverlayIn .2s ease-out",
          }}
        >
          <div
            style={{
              position:
                "absolute",

              width:
                "150vw",

              height:
                "90px",

              left:
                "50%",

              top:
                "35%",

              transformOrigin:
                "0 50%",

              background:
                "linear-gradient(90deg, rgba(255,58,150,.7), rgba(255,58,150,0))",

              filter:
                "blur(10px)",

              animation:
                "discoBeamOne .65s ease-in-out infinite alternate",
            }}
          />

          <div
            style={{
              position:
                "absolute",

              width:
                "150vw",

              height:
                "90px",

              left:
                "50%",

              top:
                "36%",

              transformOrigin:
                "0 50%",

              background:
                "linear-gradient(90deg, rgba(50,220,255,.65), rgba(50,220,255,0))",

              filter:
                "blur(10px)",

              animation:
                "discoBeamTwo .8s ease-in-out infinite alternate",
            }}
          />

          <div
            style={{
              position:
                "absolute",

              width:
                "120vw",

              height:
                "70px",

              right:
                "50%",

              top:
                "30%",

              transformOrigin:
                "100% 50%",

              background:
                "linear-gradient(270deg, rgba(255,210,40,.55), rgba(255,210,40,0))",

              filter:
                "blur(12px)",

              animation:
                "discoBeamTwo .7s ease-in-out infinite alternate",
            }}
          />

          {[
            ["12%", "18%", "✦", "0s"],
            ["80%", "18%", "✧", ".2s"],
            ["18%", "68%", "✦", ".4s"],
            ["85%", "72%", "✧", ".1s"],
            ["7%", "45%", "✦", ".3s"],
            ["92%", "46%", "✦", ".5s"],
          ].map(
            (
              item,
              index
            ) => (
              <span
                key={
                  index
                }
                style={{
                  position:
                    "absolute",

                  left:
                    item[0],

                  top:
                    item[1],

                  color:
                    "#fff",

                  fontSize:
                    "2rem",

                  animation:
                    `discoSparkle .75s ${item[3]} ease-in-out infinite`,
                }}
              >
                {item[2]}
              </span>
            )
          )}

          <div
            style={{
              position:
                "relative",

              zIndex:
                2,

              width:
                "min(90vw, 420px)",

              textAlign:
                "center",

              color:
                "#ffffff",

              animation:
                "discoTextPop .45s cubic-bezier(.2,.9,.25,1.2)",
            }}
          >
            <div
              style={{
                width:
                  "14px",

                height:
                  "120px",

                margin:
                  "-70px auto 0",

                background:
                  "linear-gradient(#555, #ddd)",

                borderRadius:
                  "10px",
              }}
            />

            <div
              style={{
                position:
                  "relative",

                width:
                  "120px",

                height:
                  "120px",

                margin:
                  "0 auto 22px",

                borderRadius:
                  "50%",

                border:
                  "3px solid rgba(255,255,255,.85)",

                background:
                  `
                    repeating-conic-gradient(
                      from 0deg,
                      #ffffff 0deg 10deg,
                      #9fe8ff 10deg 20deg,
                      #d39cff 20deg 30deg,
                      #ffffff 30deg 40deg
                    )
                  `,

                animation:
                  "discoBallSpin 2s linear infinite, discoBallPulse .5s ease-in-out infinite alternate",
              }}
            >
              <div
                style={{
                  position:
                    "absolute",

                  inset:
                    "12px",

                  borderRadius:
                    "50%",

                  border:
                    "1px solid rgba(255,255,255,.65)",
                }}
              />

              <div
                style={{
                  position:
                    "absolute",

                  inset:
                    "36px 0",

                  borderTop:
                    "1px solid rgba(255,255,255,.65)",

                  borderBottom:
                    "1px solid rgba(255,255,255,.65)",
                }}
              />

              <div
                style={{
                  position:
                    "absolute",

                  inset:
                    "0 36px",

                  borderLeft:
                    "1px solid rgba(255,255,255,.65)",

                  borderRight:
                    "1px solid rgba(255,255,255,.65)",
                }}
              />
            </div>

            <div
              style={{
                fontSize:
                  "clamp(2.7rem, 15vw, 4.7rem)",

                fontWeight:
                  950,

                lineHeight:
                  .9,

                letterSpacing:
                  "-0.06em",

                textShadow:
                  "0 0 30px rgba(255,255,255,.55)",
              }}
            >
              DISCO!
            </div>

            <div
              style={{
                marginTop:
                  "14px",

                fontSize:
                  "1.2rem",

                fontWeight:
                  800,

                color:
                  "#f5e8ff",
              }}
            >
              🪩 {discoCelebration} heeft Disco!
            </div>

            <div
              style={{
                marginTop:
                  "8px",

                color:
                  "rgba(255,255,255,.8)",

                fontSize:
                  ".9rem",
              }}
            >
              Iedereen behalve {discoCelebration} neemt 1 slok
            </div>
          </div>
        </div>
      </>
    );
  }

  function startLobby() {
    const name =
      hostName.trim();

    if (!name) {
      alert(
        "Vul eerst je naam in."
      );

      return;
    }

    if (
      !socket.connected
    ) {
      socket.connect();
    }

    socket.emit(
      "create-room",

      {
        playerName:
          name,

        settings: {
          players,
          rows,
          decks,
          checkpoints,
          doubleRule,
          checkpointFailRule,
          treeDouble,
          adtCard,
        },
      },

      (
        response: {
          success:
            boolean;

          roomCode?:
            string;

          players?:
            Player[];

          message?:
            string;
        }
      ) => {
        if (
          !response.success
        ) {
          alert(
            response.message ||
              "Er ging iets mis."
          );

          return;
        }

        setRoomCode(
          response.roomCode ||
            ""
        );

        setPlayerNames(
          response.players ||
            []
        );

        setIsHost(
          true
        );

        setScreen(
          "lobby"
        );
      }
    );
  }

  function joinRoom() {
    const name =
      playerName.trim();

    const code =
      joinCode
        .trim()
        .toUpperCase();

    setJoinError("");

    if (!name) {
      setJoinError(
        "Vul eerst je naam in."
      );

      return;
    }

    if (
      code.length !==
      5
    ) {
      setJoinError(
        "Een kamercode bestaat uit 5 tekens."
      );

      return;
    }

    if (
      !socket.connected
    ) {
      socket.connect();
    }

    socket.emit(
      "join-room",

      {
        roomCode:
          code,

        playerName:
          name,
      },

      (
        response: {
          success:
            boolean;

          roomCode?:
            string;

          players?:
            Player[];

          message?:
            string;
        }
      ) => {
        if (
          !response.success
        ) {
          setJoinError(
            response.message ||
              "Er ging iets mis."
          );

          return;
        }

        setRoomCode(
          response.roomCode ||
            code
        );

        setPlayerNames(
          response.players ||
            []
        );

        setIsHost(
          false
        );

        setScreen(
          "lobby"
        );
      }
    );
  }

  function removePlayer(
    playerId: string
  ) {
    if (!isHost) {
      return;
    }

    socket.emit(
      "remove-player",
      playerId
    );
  }

  function startGame() {
    if (!isHost) {
      return;
    }

    socket.emit(
      "start-game"
    );
  }

  function restartGame() {
    if (!isHost) {
      return;
    }

    setBusSubmitting(
      true
    );

    socket.emit(
      "restart-game",

      (
        response: {
          success:
            boolean;

          message?:
            string;
        }
      ) => {
        if (
          !response.success
        ) {
          setBusSubmitting(
            false
          );

          if (
            response.message
          ) {
            alert(
              response.message
            );
          }
        }
      }
    );
  }

  function returnToHome() {
    if (!isHost) {
      return;
    }

    setBusSubmitting(
      true
    );

    socket.emit(
      "return-home",

      (
        response: {
          success:
            boolean;
        }
      ) => {
        if (
          !response.success
        ) {
          setBusSubmitting(
            false
          );
        }
      }
    );
  }

  function leaveFinishedGame() {
    if (
      gameState?.phase !==
      "bus-finished"
    ) {
      return;
    }

    setBusSubmitting(
      true
    );

    socket.emit(
      "leave-after-game",

      (
        response: {
          success:
            boolean;

          message?:
            string;
        }
      ) => {
        if (
          !response.success
        ) {
          setBusSubmitting(
            false
          );

          alert(
            response.message ||
              "Verlaten is niet gelukt."
          );

          return;
        }

        resetToHome();
      }
    );
  }

  function getJoinUrl() {
    return `${window.location.origin}/?room=${roomCode}`;
  }

  const stepNames = [
    "Kleur",
    "Hoger of lager",
    "Binnen of buiten",
    "Figuur",
  ];

  function makeGuess(
    guess: string
  ) {
    if (
      !gameState ||
      gameState.phase !==
        "cards" ||
      gameState.resultShowing
    ) {
      return;
    }

    const currentPlayer =
      gameState.players[
        gameState
          .currentPlayerIndex
      ];

    if (
      !currentPlayer ||
      currentPlayer.id !==
        socketId ||
      !drawnCard
    ) {
      return;
    }

    socket.emit(
      "guess-card",
      {
        guess,
      }
    );
  }

  function getStepDescription() {
    if (!gameState) {
      return "";
    }

    const player =
      gameState.players[
        gameState
          .currentPlayerIndex
      ];

    if (
      gameState.currentStep ===
      0
    ) {
      return "Raad of de kaart rood of zwart is.";
    }

    if (
      gameState.currentStep ===
      1
    ) {
      const card =
        player?.cards?.[0];

      return card
        ? `Hoger of lager dan ${card.name} ${card.symbol}?`
        : "Hoger of lager?";
    }

    if (
      gameState.currentStep ===
      2
    ) {
      const first =
        player?.cards?.[0];

      const second =
        player?.cards?.[1];

      return first &&
        second
        ? `Binnen of buiten ${first.name} ${first.symbol} en ${second.name} ${second.symbol}?`
        : "Binnen of buiten?";
    }

    return "Raad het figuur, of ga voor Disco.";
  }

  function changeDistribution(
    playerId: string,
    difference: number
  ) {
    const available =
      gameState?.tree
        ?.drinksToDistribute ||
      0;

    setDistribution(
      (previous) => {
        const total =
          Object.values(
            previous
          ).reduce(
            (
              sum,
              value
            ) =>
              sum + value,
            0
          );

        if (
          difference > 0 &&
          total >= available
        ) {
          return previous;
        }

        return {
          ...previous,

          [playerId]:
            Math.max(
              0,
              (
                previous[
                  playerId
                ] || 0
              ) +
                difference
            ),
        };
      }
    );
  }

  function submitTreeDistribution() {
    const tree =
      gameState?.tree;

    if (!tree) {
      return;
    }

    const total =
      Object.values(
        distribution
      ).reduce(
        (
          sum,
          value
        ) =>
          sum + value,
        0
      );

    if (
      total !==
      tree.drinksToDistribute
    ) {
      return;
    }

    setTreeSubmitting(
      true
    );

    socket.emit(
      "tree-distribute",

      {
        distribution:
          Object.entries(
            distribution
          )
            .filter(
              ([
                ,
                value,
              ]) =>
                value > 0
            )
            .map(
              ([
                playerId,
                count,
              ]) => ({
                playerId,
                count,
              })
            ),
      },

      (
        response: {
          success:
            boolean;

          message?:
            string;
        }
      ) => {
        if (
          !response.success
        ) {
          setTreeSubmitting(
            false
          );

          alert(
            response.message ||
              "Verdelen is niet gelukt."
          );
        }
      }
    );
  }

  function skipTreeMatch() {
    setTreeSubmitting(
      true
    );

    socket.emit(
      "tree-skip-match",

      (
        response: {
          success:
            boolean;
        }
      ) => {
        if (
          !response.success
        ) {
          setTreeSubmitting(
            false
          );
        }
      }
    );
  }

  function giveAdt(
    playerId: string
  ) {
    setTreeSubmitting(
      true
    );

    socket.emit(
      "tree-adt-give",

      {
        playerId,
      },

      (
        response: {
          success:
            boolean;

          message?:
            string;
        }
      ) => {
        if (
          !response.success
        ) {
          setTreeSubmitting(
            false
          );

          if (
            response.message
          ) {
            alert(
              response.message
            );
          }
        }
      }
    );
  }

  function drawTieBreakCard() {
    setTreeSubmitting(
      true
    );

    socket.emit(
      "tree-tiebreak-draw",

      (
        response: {
          success:
            boolean;

          message?:
            string;
        }
      ) => {
        if (
          !response.success
        ) {
          setTreeSubmitting(
            false
          );

          if (
            response.message
          ) {
            alert(
              response.message
            );
          }
        }
      }
    );
  }

  function drawBusLength() {
    setBusSubmitting(
      true
    );

    socket.emit(
      "bus-draw-length",

      (
        response: {
          success:
            boolean;

          message?:
            string;
        }
      ) => {
        if (
          !response.success
        ) {
          setBusSubmitting(
            false
          );

          if (
            response.message
          ) {
            alert(
              response.message
            );
          }
        }
      }
    );
  }

  function drawBusOpenCount() {
    setBusSubmitting(
      true
    );

    socket.emit(
      "bus-draw-open",

      (
        response: {
          success:
            boolean;

          message?:
            string;
        }
      ) => {
        if (
          !response.success
        ) {
          setBusSubmitting(
            false
          );

          if (
            response.message
          ) {
            alert(
              response.message
            );
          }
        }
      }
    );
  }

  function toggleCheckpoint(
    index: number
  ) {
    if (
      gameState?.bus
        ?.activeDriverId !==
      socketId
    ) {
      return;
    }

    const next =
      selectedCheckpoints.includes(
        index
      )
        ? selectedCheckpoints.filter(
            (item) =>
              item !== index
          )
        : [
            ...selectedCheckpoints,
            index,
          ];

    setSelectedCheckpoints(
      next
    );

    socket.emit(
      "bus-set-checkpoints",

      {
        checkpoints:
          next,
      }
    );
  }

  function confirmCheckpoints() {
    if (
      gameState?.bus
        ?.activeDriverId !==
      socketId
    ) {
      return;
    }

    setBusSubmitting(
      true
    );

    socket.emit(
      "bus-checkpoints-ready"
    );
  }

  function startBus() {
    if (
      gameState?.bus
        ?.activeDriverId !==
      socketId
    ) {
      return;
    }

    setBusSubmitting(
      true
    );

    socket.emit(
      "bus-start",

      (
        response: {
          success:
            boolean;

          message?:
            string;
        }
      ) => {
        if (
          !response.success
        ) {
          setBusSubmitting(
            false
          );

          if (
            response.message
          ) {
            alert(
              response.message
            );
          }
        }
      }
    );
  }

  function makeBusGuess(
    guess:
      | "hoger"
      | "lager"
  ) {
    setBusSubmitting(
      true
    );

    socket.emit(
      "bus-guess",

      {
        guess,
      },

      (
        response: {
          success:
            boolean;

          message?:
            string;
        }
      ) => {
        if (
          !response.success
        ) {
          setBusSubmitting(
            false
          );

          if (
            response.message
          ) {
            alert(
              response.message
            );
          }
        }
      }
    );
  }

  function chooseDoublePlayer(
    playerId: string
  ) {
    setBusSubmitting(
      true
    );

    socket.emit(
      "bus-double-choice",

      {
        playerId,
      },

      (
        response: {
          success:
            boolean;

          message?:
            string;
        }
      ) => {
        if (
          !response.success
        ) {
          setBusSubmitting(
            false
          );

          if (
            response.message
          ) {
            alert(
              response.message
            );
          }
        }
      }
    );
  }

  /*
   * =========================
   * BUS SETUP
   * =========================
   */

  if (
    screen === "game" &&
    gameState?.phase ===
      "bus-setup" &&
    gameState.bus
  ) {
    const bus =
      gameState.bus;

    const driver =
      gameState.players.find(
        (player) =>
          player.id ===
          bus.activeDriverId
      );

    const canControl =
      bus.activeDriverId ===
      socketId;

    return (
      <main className="app">
        {renderAnnouncement()}
        {renderStockShufflePopup()}

        <section className="card game-card bus-screen">
          <div className="game-top">
            <div className="logo small-logo">
              🚌
            </div>

            <div>
              <h1>
                De bus
              </h1>

              <p className="subtitle">
                Eerst bepalen we hoe groot de bus wordt
              </p>
            </div>
          </div>

          <div className="bus-driver-banner">
            <span>
              DE BUS IN
            </span>

            <strong>
              {driver?.name}
            </strong>
          </div>

          <div className="bus-setup-steps">
            <div
              className={
                bus.lengthCard
                  ? "bus-setup-step completed"
                  : "bus-setup-step active"
              }
            >
              <span>
                1
              </span>

              <div>
                <strong>
                  Buslengte
                </strong>

                <p>
                  Trek een kaart uit de stock.
                </p>
              </div>
            </div>

            <div
              className={
                bus.openCountCard
                  ? "bus-setup-step completed"
                  : bus.lengthCard
                    ? "bus-setup-step active"
                    : "bus-setup-step"
              }
            >
              <span>
                2
              </span>

              <div>
                <strong>
                  Open kaarten
                </strong>

                <p>
                  Trek hoeveel kaarten open liggen.
                </p>
              </div>
            </div>
          </div>

          {bus.status ===
            "draw-length" && (
            <div className="bus-draw-panel">
              <h2>
                Hoe lang wordt de bus?
              </h2>

              <p>
                2 t/m 10 zijn hun eigen waarde, Boer = 11, Vrouw = 12, Heer = 13 en Aas = 14.
              </p>

              {canControl ? (
                <button
                  className="start-button"
                  disabled={
                    busSubmitting
                  }
                  onClick={
                    drawBusLength
                  }
                >
                  🃏 Trek lengtekaart
                </button>
              ) : (
                <div className="waiting-message">
                  {driver?.name} trekt de lengtekaart...
                </div>
              )}
            </div>
          )}

          {bus.lengthCard && (
            <div className="bus-setup-draws">
              <div>
                <span>
                  Lengtekaart
                </span>

                <div
                  className={`setup-card ${bus.lengthCard.color}`}
                >
                  <strong>
                    {getCardRank(
                      bus.lengthCard
                    )}
                  </strong>

                  <span>
                    {
                      bus.lengthCard
                        .symbol
                    }
                  </span>
                </div>

                <b>
                  {bus.length} kaarten
                </b>
              </div>

              <div>
                <span>
                  Open kaarten
                </span>

                {bus.openCountCard ? (
                  <>
                    <div
                      className={`setup-card ${bus.openCountCard.color}`}
                    >
                      <strong>
                        {getCardRank(
                          bus.openCountCard
                        )}
                      </strong>

                      <span>
                        {
                          bus.openCountCard
                            .symbol
                        }
                      </span>
                    </div>

                    <b>
                      {
                        bus.initialOpenCount
                      } open
                    </b>
                  </>
                ) : (
                  <div className="setup-card placeholder">
                    ?
                  </div>
                )}
              </div>
            </div>
          )}

          {bus.status ===
            "draw-open" && (
            <div className="bus-draw-panel">
              <h2>
                Hoeveel kaarten liggen open?
              </h2>

              <p>
                De waarde bepaalt hoeveel kaarten vanaf links zichtbaar zijn.
              </p>

              {canControl ? (
                <button
                  className="start-button"
                  disabled={
                    busSubmitting
                  }
                  onClick={
                    drawBusOpenCount
                  }
                >
                  🃏 Trek kaart voor open kaarten
                </button>
              ) : (
                <div className="waiting-message">
                  {driver?.name} trekt de kaart...
                </div>
              )}
            </div>
          )}

          {(bus.status ===
            "checkpoints" ||
            bus.status ===
              "ready") &&
            bus.piles.length >
              0 && (
              <>
                <div className="bus-preview-title">
                  <h2>
                    De bus
                  </h2>

                  <span>
                    {bus.length} kaarten · {bus.initialOpenCount} open
                  </span>
                </div>

                <div className="bus-track">
                  {bus.piles.map(
                    (
                      pile,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                        className={[
                          "bus-card-slot",

                          pile.isCheckpoint
                            ? "checkpoint"
                            : "",
                        ]
                          .filter(
                            Boolean
                          )
                          .join(" ")}
                        style={{
                          position:
                            "relative",
                        }}
                      >
                        <span className="bus-card-number">
                          {index + 1}
                        </span>

                        {pile.revealed &&
                        pile.card ? (
                          <div
                            className={`bus-card-face ${pile.card.color}`}
                          >
                            {renderPlayingCard(
                              pile.card
                            )}
                          </div>
                        ) : (
                          <div className="bus-card-back">
                            🚌
                          </div>
                        )}

                        {pile.isCheckpoint && (
                          <small
                            style={{
                              position:
                                "absolute",

                              left:
                                "50%",

                              top:
                                "calc(100% + 4px)",

                              transform:
                                "translateX(-50%)",

                              whiteSpace:
                                "nowrap",

                              zIndex:
                                2,
                            }}
                          >
                            ⚑
                          </small>
                        )}
                      </div>
                    )
                  )}
                </div>
              </>
            )}

          {bus.status ===
            "checkpoints" && (
            <div className="checkpoint-panel">
              <h2>
                Checkpoints kiezen
              </h2>

              {bus.checkpointFailRule ===
                "retry" && (
                <p>
                  Eerste fout op een checkpoint: één tweede kans. Nogmaals fout: terug naar kaart 1.
                </p>
              )}

              {bus.checkpointFailRule ===
                "reset" && (
                <p>
                  Fout op een checkpoint: direct terug naar kaart 1.
                </p>
              )}

              {bus.checkpointFailRule ===
                "safe" && (
                <p>
                  Zodra je op een checkpoint aankomt, is dit direct je nieuwe beginpunt.
                </p>
              )}

              <div className="checkpoint-grid">
                {bus.piles.map(
                  (
                    _,
                    index
                  ) => (
                    <button
                      key={
                        index
                      }
                      disabled={
                        index === 0 ||
                        !canControl
                      }
                      className={
                        selectedCheckpoints.includes(
                          index
                        )
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        toggleCheckpoint(
                          index
                        )
                      }
                    >
                      {index + 1}
                    </button>
                  )
                )}
              </div>

              {canControl ? (
                <button
                  className="start-button"
                  disabled={
                    busSubmitting
                  }
                  onClick={
                    confirmCheckpoints
                  }
                >
                  Checkpoints bevestigen
                </button>
              ) : (
                <div className="waiting-message">
                  {driver?.name} kiest de checkpoints...
                </div>
              )}
            </div>
          )}

          {bus.status ===
            "ready" && (
            <div className="bus-ready-panel">
              <h2>
                Klaar om te bussen
              </h2>

              <p>
                We beginnen bij kaart 1.
              </p>

              {canControl ? (
                <button
                  className="start-button"
                  disabled={
                    busSubmitting
                  }
                  onClick={
                    startBus
                  }
                >
                  Bus starten 🚌
                </button>
              ) : (
                <div className="waiting-message">
                  Wachten tot {driver?.name} de bus start...
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    );
  }

  /*
   * =========================
   * BUS SPELEN
   * =========================
   */

  if (
    screen === "game" &&
    (
      gameState?.phase ===
        "bus" ||
      gameState?.phase ===
        "bus-finished"
    ) &&
    gameState.bus
  ) {
    const bus =
      gameState.bus;

    const driver =
      gameState.players.find(
        (player) =>
          player.id ===
          bus.activeDriverId
      );

    const isDriver =
      bus.activeDriverId ===
      socketId;

    const riders =
      gameState.players.filter(
        (player) =>
          bus.riders.includes(
            player.id
          )
      );

    const currentPile =
      bus.piles[
        bus.currentIndex
      ];

    const doubleCandidates =
      gameState.players.filter(
        (player) =>
          player.id !==
            bus.activeDriverId &&
          (
            bus.doubleRule ===
              "pass" ||
            !bus.riders.includes(
              player.id
            )
          )
      );

    return (
      <main className="app">
        {renderAnnouncement()}
        {renderStockShufflePopup()}
        {renderBusFullPopup(
          bus
        )}

        {gameState.phase ===
          "bus-finished" &&
          renderConfetti()}

        <section className="card game-card bus-screen">
          <div className="game-top">
            <div className="logo small-logo">
              🚌
            </div>

            <div>
              <h1>
                De bus
              </h1>

              <p className="subtitle">
                Hoger of lager tot het einde
              </p>
            </div>
          </div>

          <div className="bus-status-row">
            <div>
              <span>
                Bestuurder
              </span>

              <strong>
                {driver?.name}
              </strong>
            </div>

            <div>
              <span>
                Huidige plek
              </span>

              <strong>
                {Math.min(
                  bus.currentIndex +
                    1,
                  bus.length
                )}{" "}
                /{" "}
                {bus.length}
              </strong>
            </div>
          </div>

          {bus.checkpointFailRule ===
            "safe" &&
            bus.activeCheckpointIndex !==
              null && (
              <div className="bus-riders">
                <span>
                  ⚑ Actief checkpoint
                </span>

                <strong>
                  Kaart{" "}
                  {bus.activeCheckpointIndex +
                    1}
                </strong>
              </div>
            )}

          {riders.length >
            1 && (
            <div className="bus-riders">
              <span>
                In de bus
              </span>

              <strong>
                {riders
                  .map(
                    (player) =>
                      player.name
                  )
                  .join(", ")}
              </strong>
            </div>
          )}

          <div className="bus-track">
            {bus.piles.map(
              (
                pile,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className={[
                    "bus-card-slot",

                    index ===
                      bus.currentIndex &&
                    gameState.phase ===
                      "bus"
                      ? "current"
                      : "",

                    pile.isCheckpoint
                      ? "checkpoint"
                      : "",

                    index <
                    bus.currentIndex
                      ? "passed"
                      : "",
                  ]
                    .filter(
                      Boolean
                    )
                    .join(" ")}
                  style={{
                    position:
                      "relative",
                  }}
                >
                  <span className="bus-card-number">
                    {index + 1}
                  </span>

                  {pile.revealed &&
                  pile.card ? (
                    <div
                      className={`bus-card-face ${pile.card.color}`}
                    >
                      {renderPlayingCard(
                        pile.card
                      )}
                    </div>
                  ) : (
                    <div className="bus-card-back">
                      🚌
                    </div>
                  )}

                  {pile.isActiveCheckpoint ? (
                    <small
                      style={{
                        position:
                          "absolute",

                        left:
                          "50%",

                        top:
                          "calc(100% + 4px)",

                        transform:
                          "translateX(-50%)",

                        whiteSpace:
                          "nowrap",

                        zIndex:
                          2,
                      }}
                    >
                      ⚑ ACTIEF
                    </small>
                  ) : pile.isCheckpoint ? (
                    <small
                      style={{
                        position:
                          "absolute",

                        left:
                          "50%",

                        top:
                          "calc(100% + 4px)",

                        transform:
                          "translateX(-50%)",

                        whiteSpace:
                          "nowrap",

                        zIndex:
                          2,
                      }}
                    >
                      ⚑
                    </small>
                  ) : null}
                </div>
              )
            )}
          </div>

          {gameState.phase ===
            "bus-finished" && (
            <div className="bus-finished-panel">
              <div className="finish-trophy">
                🏆
              </div>

              <span className="finish-label">
                EINDE VAN DE RIT
              </span>

              <h2>
                Uit de bus!
              </h2>

              <p>
                De hele bus is goed gespeeld.
              </p>

              {isHost ? (
                <>
                  <button
                    className="start-button"
                    onClick={
                      restartGame
                    }
                    disabled={
                      busSubmitting
                    }
                  >
                    🔄 Nieuw spel starten
                  </button>

                  <button
                    className="start-button secondary"
                    onClick={
                      returnToHome
                    }
                    disabled={
                      busSubmitting
                    }
                  >
                    🏠 Terug naar home
                  </button>

                  <button
                    className="start-button secondary"
                    onClick={
                      leaveFinishedGame
                    }
                    disabled={
                      busSubmitting
                    }
                  >
                    🚪 Spel verlaten
                  </button>
                </>
              ) : (
                <>
                  <div className="waiting-message">
                    De host kiest wat we hierna doen...
                  </div>

                  <button
                    className="start-button secondary"
                    onClick={
                      leaveFinishedGame
                    }
                    disabled={
                      busSubmitting
                    }
                  >
                    🚪 Spel verlaten
                  </button>
                </>
              )}
            </div>
          )}

          {gameState.phase ===
            "bus" &&
            bus.status ===
              "playing" && (
              <>
                {isDriver ? (
                  <div className="bus-choice-panel">
                    <span className="bus-position-label">
                      KAART{" "}
                      {bus.currentIndex +
                        1}
                    </span>

                    {currentPile?.isCheckpoint && (
                      <>
                        {bus.checkpointFailRule ===
                          "retry" && (
                          <p>
                            ⚑ Checkpoint — je kunt hier één tweede kans krijgen.
                          </p>
                        )}

                        {bus.checkpointFailRule ===
                          "reset" && (
                          <p>
                            ⚑ Checkpoint — fout betekent terug naar kaart 1.
                          </p>
                        )}

                        {bus.checkpointFailRule ===
                          "safe" && (
                          <p>
                            ⚑ Checkpoint actief — dit is nu je nieuwe beginpunt.
                          </p>
                        )}
                      </>
                    )}

                    {currentPile?.revealed &&
                    currentPile.card ? (
                      <>
                        <div
                          className={`bus-reference-card ${currentPile.card.color}`}
                        >
                          <strong>
                            {getCardRank(
                              currentPile.card
                            )}
                          </strong>

                          <span>
                            {
                              currentPile.card
                                .symbol
                            }
                          </span>
                        </div>

                        <h2>
                          Hoger of lager?
                        </h2>

                        <p>
                          Er wordt daarna een nieuwe kaart uit de stock getrokken.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="bus-hidden-reference">
                          ?
                        </div>

                        <h2>
                          Blinde gok
                        </h2>

                        <p>
                          Kies eerst hoger of lager. Daarna wordt de kaart omgedraaid.
                        </p>
                      </>
                    )}

                    <div className="guess-grid two">
                      <button
                        onClick={() =>
                          makeBusGuess(
                            "hoger"
                          )
                        }
                        disabled={
                          busSubmitting
                        }
                      >
                        ↑ Hoger
                      </button>

                      <button
                        onClick={() =>
                          makeBusGuess(
                            "lager"
                          )
                        }
                        disabled={
                          busSubmitting
                        }
                      >
                        ↓ Lager
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="tree-message">
                    <strong>
                      {driver?.name} zit in de bus
                    </strong>

                    <p>
                      Wachten op de gok voor kaart{" "}
                      {bus.currentIndex +
                        1}
                      ...
                    </p>
                  </div>
                )}
              </>
            )}

          {gameState.phase ===
            "bus" &&
            bus.status ===
              "result" &&
            bus.result && (
              <div
                className={
                  bus.result.correct
                    ? "bus-result correct"
                    : "bus-result wrong"
                }
              >
                <div className="result-icon">
                  {bus.result.correct
                    ? "✓"
                    : bus.result.busFull
                      ? "🚌"
                      : "✕"}
                </div>

                <h2>
                  {bus.result.correct
                    ? "Goed!"
                    : bus.result.busFull
                      ? "De bus zit vol!"
                      : bus.result.double
                        ? "Dubbel = fout!"
                        : bus.result.secondChance
                          ? "Fout — tweede kans!"
                          : bus.result.checkpointSafe
                            ? "Fout — terug naar checkpoint!"
                            : "Fout!"}
                </h2>

                <div className="bus-comparison">
                  <div>
                    <span>
                      Was
                    </span>

                    <div
                      className={`mini-playing-card ${bus.result.fromCard.color}`}
                    >
                      <strong>
                        {getCardRank(
                          bus.result
                            .fromCard
                        )}
                      </strong>

                      <span>
                        {
                          bus.result
                            .fromCard
                            .symbol
                        }
                      </span>
                    </div>
                  </div>

                  <strong className="comparison-arrow">
                    →
                  </strong>

                  <div>
                    <span>
                      Getrokken
                    </span>

                    <div
                      className={`mini-playing-card ${bus.result.newCard.color}`}
                    >
                      <strong>
                        {getCardRank(
                          bus.result
                            .newCard
                        )}
                      </strong>

                      <span>
                        {
                          bus.result
                            .newCard
                            .symbol
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {!bus.result.correct && (
                  <>
                    <div className="bus-drinks">
                      🥃 Neem{" "}
                      <strong>
                        {
                          bus.result
                            .drinks
                        }{" "}
                        {bus.result.drinks ===
                        1
                          ? "slok"
                          : "slokken"}
                      </strong>
                    </div>

                    {bus.result.busFull && (
                      <p>
                        🚌 Iedereen zit al in de bus. Er hoeft niemand meer gekozen te worden.
                      </p>
                    )}

                    {bus.result.secondChance ? (
                      <p>
                        ⚑ Je krijgt één tweede kans en blijft op{" "}
                        <strong>
                          kaart{" "}
                          {bus.result.position +
                            1}
                        </strong>
                        .
                      </p>
                    ) : (
                      <p>
                        Terug naar{" "}
                        <strong>
                          kaart{" "}
                          {(
                            bus.result
                              .restartIndex ??
                            0
                          ) + 1}
                        </strong>
                        .
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

          {gameState.phase ===
            "bus" &&
            bus.status ===
              "double-choice" &&
            bus.result && (
              <div className="double-panel">
                <div className="double-icon">
                  ⚡
                </div>

                <h2>
                  Dubbel!
                </h2>

                <div className="bus-comparison">
                  <div
                    className={`mini-playing-card ${bus.result.fromCard.color}`}
                  >
                    <strong>
                      {getCardRank(
                        bus.result
                          .fromCard
                      )}
                    </strong>

                    <span>
                      {
                        bus.result
                          .fromCard
                          .symbol
                      }
                    </span>
                  </div>

                  <strong>
                    =
                  </strong>

                  <div
                    className={`mini-playing-card ${bus.result.newCard.color}`}
                  >
                    <strong>
                      {getCardRank(
                        bus.result
                          .newCard
                      )}
                    </strong>

                    <span>
                      {
                        bus.result
                          .newCard
                          .symbol
                      }
                    </span>
                  </div>
                </div>

                <p>
                  Dubbel telt als fout:{" "}
                  <strong>
                    {
                      bus.result
                        .drinks
                    }{" "}
                    slokken
                  </strong>
                  .
                </p>

                {bus.checkpointFailRule ===
                  "safe" &&
                bus.activeCheckpointIndex !==
                  null ? (
                  <p>
                    Het actieve checkpoint op kaart{" "}
                    <strong>
                      {bus.activeCheckpointIndex +
                        1}
                    </strong>{" "}
                    blijft gelden.
                  </p>
                ) : (
                  <p>
                    Terug naar kaart 1.
                  </p>
                )}

                {isDriver ? (
                  <>
                    <strong className="double-question">
                      {bus.doubleRule ===
                      "pass"
                        ? "Aan wie geef je de bus door?"
                        : "Wie neem je mee de bus in?"}
                    </strong>

                    <div className="double-player-list">
                      {doubleCandidates.map(
                        (
                          player
                        ) => (
                          <button
                            key={
                              player.id
                            }
                            onClick={() =>
                              chooseDoublePlayer(
                                player.id
                              )
                            }
                            disabled={
                              busSubmitting
                            }
                          >
                            <span className="player-avatar">
                              {player.name
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </span>

                            {
                              player.name
                            }
                          </button>
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <p>
                    {driver?.name} maakt een keuze...
                  </p>
                )}
              </div>
            )}
        </section>
      </main>
    );
  }

  /*
   * =========================
   * BOOM
   * =========================
   */

  if (
    screen === "game" &&
    gameState &&
    (
      gameState.phase ===
        "tree" ||
      gameState.phase ===
        "tree-tiebreak" ||
      gameState.phase ===
        "tree-finished"
    )
  ) {
    const tree =
      gameState.tree;

    if (!tree) {
      return (
        <main className="app">
          <section className="card game-card">
            <div className="waiting-message">
              Boom wordt opgebouwd...
            </div>
          </section>
        </main>
      );
    }

    const me =
      gameState.players.find(
        (player) =>
          player.id ===
          socketId
      );

    const isMyResolution =
      tree.currentResolverId ===
      socketId;

    const iAmWaiting =
      !isMyResolution &&
      tree.pendingResolverIds.includes(
        socketId
      );

    const resolver =
      gameState.players.find(
        (player) =>
          player.id ===
          tree.currentResolverId
      );

    const isMyAdtResolution =
      tree.adtCurrentResolverId ===
      socketId;

    const adtResolver =
      gameState.players.find(
        (player) =>
          player.id ===
          tree.adtCurrentResolverId
      );

    const distributed =
      Object.values(
        distribution
      ).reduce(
        (
          sum,
          value
        ) =>
          sum + value,
        0
      );

    const remaining =
      Math.max(
        0,
        tree.drinksToDistribute -
          distributed
      );

    const latestTieBreak =
      tree.tieBreakRounds.length >
      0
        ? tree.tieBreakRounds[
            tree.tieBreakRounds.length -
              1
          ]
        : null;

    const tieBreakPlayers =
      gameState.players.filter(
        (player) =>
          tree.tieBreakCandidateIds.includes(
            player.id
          )
      );

    const iAmTieBreakCandidate =
      tree.tieBreakCandidateIds.includes(
        socketId
      );

    const iStillNeedToDraw =
      tree.tieBreakPendingIds.includes(
        socketId
      );

    return (
      <main className="app">
        {renderTreeResolutionPopup(
          tree
        )}

        <section className="card game-card tree-screen">
          <div className="game-top">
            <div className="logo small-logo">
              🌲
            </div>

            <div>
              <h1>
                {gameState.phase ===
                "tree-tiebreak"
                  ? "Gelijkstand!"
                  : "De boom"}
              </h1>

              <p className="subtitle">
                {gameState.phase ===
                "tree-tiebreak"
                  ? "Iedere speler trekt zelf een kaart"
                  : "Speel je kaarten weg en deel slokken uit"}
              </p>
            </div>
          </div>

          {gameState.phase ===
            "tree-tiebreak" &&
            latestTieBreak && (
              <div className="tree-distribute-panel">
                <div className="tree-match-heading">
                  <span>
                    🃏
                  </span>

                  <div>
                    <h2>
                      Trekking{" "}
                      {
                        latestTieBreak.round
                      }
                    </h2>

                    <p>
                      Iedereen in de gelijkstand trekt zelf één kaart. De laagste gaat de bus in.
                    </p>
                  </div>
                </div>

                <div className="drink-player-list">
                  {tieBreakPlayers.map(
                    (
                      player
                    ) => {
                      const draw =
                        latestTieBreak.draws.find(
                          (item) =>
                            item.playerId ===
                            player.id
                        );

                      return (
                        <div
                          className="drink-player"
                          key={
                            player.id
                          }
                        >
                          <div className="player-avatar">
                            {player.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <span>
                            {
                              player.name
                            }
                          </span>

                          {draw ? (
                            <div
                              className={`mini-playing-card ${draw.card.color}`}
                            >
                              <strong>
                                {getCardRank(
                                  draw.card
                                )}
                              </strong>

                              <span>
                                {
                                  draw.card
                                    .symbol
                                }
                              </span>
                            </div>
                          ) : (
                            <div className="mini-playing-card">
                              <strong>
                                ?
                              </strong>
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>

                {iAmTieBreakCandidate &&
                  iStillNeedToDraw && (
                    <button
                      className="start-button"
                      onClick={
                        drawTieBreakCard
                      }
                      disabled={
                        treeSubmitting
                      }
                    >
                      🃏 Trek mijn kaart
                    </button>
                  )}

                {iAmTieBreakCandidate &&
                  !iStillNeedToDraw &&
                  tree.tieBreakPendingIds.length >
                    0 && (
                    <div className="waiting-message">
                      Jij hebt getrokken. Wachten op de andere spelers...
                    </div>
                  )}

                {!iAmTieBreakCandidate &&
                  tree.tieBreakPendingIds.length >
                    0 && (
                    <div className="waiting-message">
                      Wachten tot de spelers hun kaart trekken...
                    </div>
                  )}

                {tree.tieBreakPendingIds.length ===
                  0 && (
                  <div className="waiting-message">
                    Alle kaarten zijn getrokken. De laagste kaart wordt bepaald...
                  </div>
                )}
              </div>
            )}

          {gameState.phase !==
            "tree-tiebreak" && (
            <>
              <div className="tree-progress">
                <span>
                  Boomkaart
                </span>

                <strong>
                  {Math.min(
                    tree.revealedCount,
                    tree.totalCards
                  )}{" "}
                  /{" "}
                  {tree.totalCards}
                </strong>
              </div>

              <div className="tree-board">
                {tree.rows.map(
                  (
                    row
                  ) => (
                    <div
                      className="tree-row"
                      key={
                        row.rowNumber
                      }
                    >
                      <div className="tree-row-info">
                        <strong>
                          Rij{" "}
                          {
                            row.rowNumber
                          }
                        </strong>

                        <span>
                          {
                            row.drinks
                          }{" "}
                          {row.drinks ===
                          1
                            ? "slok"
                            : "slokken"}
                        </span>
                      </div>

                      <div className="tree-row-cards">
                        {row.cards.map(
                          (
                            treeCard
                          ) => (
                            <div
                              key={
                                treeCard.id
                              }
                              className={[
                                "tree-playing-card",

                                treeCard.isDouble
                                  ? "double"
                                  : "",
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(" ")}
                            >
                              {treeCard.revealed &&
                              treeCard.card ? (
                                <div
                                  className={`tree-card-face ${treeCard.card.color}`}
                                >
                                  {renderPlayingCard(
                                    treeCard.card
                                  )}

                                  {treeCard.isDouble && (
                                    <span className="double-badge">
                                      2×
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="tree-card-back">
                                  <span>
                                    🚌
                                  </span>

                                  {treeCard.isDouble && (
                                    <strong>
                                      2×
                                    </strong>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}

                {tree.adtCard && (
                  <div className="tree-row">
                    <div className="tree-row-info">
                      <strong>
                        🍺 Adtje
                      </strong>

                      <span>
                        Hele drankje
                      </span>
                    </div>

                    <div className="tree-row-cards">
                      <div className="tree-playing-card">
                        {tree.adtCard.revealed &&
                        tree.adtCard.card ? (
                          <div
                            className={`tree-card-face ${tree.adtCard.card.color}`}
                          >
                            {renderPlayingCard(
                              tree.adtCard.card
                            )}
                          </div>
                        ) : (
                          <div className="tree-card-back">
                            <span>
                              🍺
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {tree.activeCard && (
                <div className="tree-active-panel">
                  <span className="tree-active-label">
                    Huidige kaart
                  </span>

                  <div
                    className={`tree-active-card ${tree.activeCard.card.color}`}
                  >
                    <strong>
                      {getCardRank(
                        tree.activeCard
                          .card
                      )}
                    </strong>

                    <span>
                      {
                        tree.activeCard
                          .card
                          .symbol
                      }
                    </span>
                  </div>

                  <h2>
                    {
                      tree.drinksToDistribute
                    }{" "}
                    slokken
                  </h2>
                </div>
              )}

              {tree.status ===
                "adt" &&
                tree.adtCard
                  ?.revealed &&
                tree.adtCard
                  .card && (
                  <div className="tree-active-panel">
                    <span className="tree-active-label">
                      ADTJE
                    </span>

                    <div
                      className={`tree-active-card ${tree.adtCard.card.color}`}
                    >
                      <strong>
                        {getCardRank(
                          tree.adtCard
                            .card
                        )}
                      </strong>

                      <span>
                        {
                          tree.adtCard
                            .card
                            .symbol
                        }
                      </span>
                    </div>

                    <h2>
                      🍺 Adtje!
                    </h2>
                  </div>
                )}

              {tree.status ===
                "waiting" && (
                <div className="tree-message">
                  <strong>
                    De boom staat klaar
                  </strong>

                  <p>
                    De eerste kaart wordt automatisch omgedraaid...
                  </p>
                </div>
              )}

              {tree.status ===
                "no-match" && (
                <div className="tree-message">
                  <strong>
                    Geen match
                  </strong>

                  <p>
                    Niemand heeft deze waarde.
                  </p>
                </div>
              )}

              {tree.status ===
                "resolving" &&
                isMyResolution && (
                  <div className="tree-distribute-panel">
                    <div className="tree-match-heading">
                      <span>
                        🎯
                      </span>

                      <div>
                        <h2>
                          Jij hebt een match!
                        </h2>

                        <p>
                          Verdeel{" "}
                          {
                            tree.drinksToDistribute
                          }{" "}
                          slokken.
                        </p>
                      </div>
                    </div>

                    <div className="remaining-drinks">
                      Nog te verdelen

                      <strong>
                        {
                          remaining
                        }
                      </strong>
                    </div>

                    <div className="drink-player-list">
                      {gameState.players
                        .filter(
                          (player) =>
                            player.id !==
                            socketId
                        )
                        .map(
                          (
                            player
                          ) => (
                            <div
                              className="drink-player"
                              key={
                                player.id
                              }
                            >
                              <div className="player-avatar">
                                {player.name
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <span>
                                {
                                  player.name
                                }
                              </span>

                              <div className="drink-counter">
                                <button
                                  onClick={() =>
                                    changeDistribution(
                                      player.id,
                                      -1
                                    )
                                  }
                                  disabled={
                                    (
                                      distribution[
                                        player.id
                                      ] ||
                                      0
                                    ) ===
                                      0 ||
                                    treeSubmitting
                                  }
                                >
                                  −
                                </button>

                                <strong>
                                  {distribution[
                                    player.id
                                  ] ||
                                    0}
                                </strong>

                                <button
                                  onClick={() =>
                                    changeDistribution(
                                      player.id,
                                      1
                                    )
                                  }
                                  disabled={
                                    remaining ===
                                      0 ||
                                    treeSubmitting
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )
                        )}
                    </div>

                    <button
                      className="tree-confirm-button"
                      disabled={
                        remaining !==
                          0 ||
                        treeSubmitting
                      }
                      onClick={
                        submitTreeDistribution
                      }
                    >
                      Kaart wegleggen & uitdelen
                    </button>

                    <button
                      className="tree-skip-button"
                      disabled={
                        treeSubmitting
                      }
                      onClick={
                        skipTreeMatch
                      }
                    >
                      Match bewaren / overslaan
                    </button>
                  </div>
                )}

              {tree.status ===
                "resolving" &&
                !isMyResolution && (
                  <div className="tree-message">
                    {iAmWaiting ? (
                      <>
                        <strong>
                          Jij hebt ook een match
                        </strong>

                        <p>
                          Eerst is{" "}
                          {resolver?.name} aan de beurt.
                        </p>
                      </>
                    ) : (
                      <>
                        <strong>
                          {resolver?.name ||
                            "Een speler"}{" "}
                          heeft een match
                        </strong>

                        <p>
                          Wachten tot de slokken zijn verdeeld...
                        </p>
                      </>
                    )}
                  </div>
                )}

              {tree.status ===
                "resolved" && (
                <div className="tree-message">
                  <strong>
                    Slokken uitgedeeld
                  </strong>

                  <p>
                    De volgende boomkaart komt eraan...
                  </p>
                </div>
              )}

              {tree.status ===
                "adt" &&
                tree.adtStatus ===
                  "no-match" && (
                  <div className="tree-message">
                    <strong>
                      Geen Adtje
                    </strong>

                    <p>
                      Niemand heeft dezelfde kaartwaarde.
                    </p>
                  </div>
                )}

              {tree.status ===
                "adt" &&
                tree.adtStatus ===
                  "resolving" &&
                isMyAdtResolution && (
                  <div className="tree-distribute-panel">
                    <div className="tree-match-heading">
                      <span>
                        🍺
                      </span>

                      <div>
                        <h2>
                          ADTJEEE!
                        </h2>

                        <p>
                          Jij kunt de Adtje-kaart wegleggen. Kies wie zijn hele drankje moet opdrinken.
                        </p>
                      </div>
                    </div>

                    <div className="double-player-list">
                      {gameState.players
                        .filter(
                          (player) =>
                            player.id !==
                            socketId
                        )
                        .map(
                          (
                            player
                          ) => (
                            <button
                              key={
                                player.id
                              }
                              disabled={
                                treeSubmitting
                              }
                              onClick={() =>
                                giveAdt(
                                  player.id
                                )
                              }
                            >
                              <span className="player-avatar">
                                {player.name
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </span>

                              <span>
                                🍺 Adtje aan{" "}
                                {
                                  player.name
                                }
                              </span>
                            </button>
                          )
                        )}
                    </div>
                  </div>
                )}

              {tree.status ===
                "adt" &&
                tree.adtStatus ===
                  "resolving" &&
                !isMyAdtResolution && (
                  <div className="tree-message">
                    <strong>
                      {adtResolver?.name ||
                        "Een speler"}{" "}
                      heeft een Adtje!
                    </strong>

                    <p>
                      Wachten tot er iemand wordt gekozen...
                    </p>
                  </div>
                )}

              {tree.status ===
                "adt" &&
                tree.adtStatus ===
                  "resolved" && (
                  <div className="tree-message">
                    <strong>
                      🍺 Adtje uitgedeeld
                    </strong>

                    {tree.adtLastAction ? (
                      <p>
                        {
                          tree.adtLastAction
                            .receiverName
                        }{" "}
                        moet zijn/haar hele drankje opdrinken.
                      </p>
                    ) : (
                      <p>
                        De boom is klaar.
                      </p>
                    )}
                  </div>
                )}
            </>
          )}

          <div className="tree-hands">
            <div className="section-title">
              <h2>
                Kaarten over
              </h2>

              <span>
                Boom
              </span>
            </div>

            {gameState.players.map(
              (
                player
              ) => (
                <div
                  className="game-player"
                  key={
                    player.id
                  }
                >
                  <div className="player-avatar">
                    {player.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="player-info">
                    <span>
                      {
                        player.name
                      }
                    </span>

                    {player.id ===
                      me?.id && (
                      <small>
                        JIJ
                      </small>
                    )}
                  </div>

                  <span className="card-count">
                    {player.cards
                      ?.length ||
                      0}{" "}
                    🃏
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      </main>
    );
  }

  /*
   * =========================
   * KAARTFASE
   * =========================
   */

  if (
    screen === "game" &&
    gameState
  ) {
    const currentPlayer =
      gameState.players[
        gameState
          .currentPlayerIndex
      ];

    const isMyTurn =
      currentPlayer?.id ===
      socketId;

    const currentStep =
      gameState.currentStep;

    const myPlayer =
      gameState.players.find(
        (player) =>
          player.id ===
          socketId
      );

    const myCards =
      myPlayer?.cards ||
      [];

    const result =
      gameState.result ||
      guessResult;

    const isMyResult =
      result?.playerId ===
      socketId;

    const isDiscoSuccess =
      Boolean(
        result?.isDisco &&
          result.correct
      );

    const shouldDrink =
      Boolean(
        result &&
          (
            (
              isDiscoSuccess &&
              result.playerId !==
                socketId
            ) ||
            (
              !isDiscoSuccess &&
              isMyResult &&
              !result.correct
            )
          )
      );

    return (
      <main className="app">
        {renderDiscoCelebration()}

        <section className="card game-card">
          <div className="game-top">
            <div className="logo small-logo">
              🚌
            </div>

            <div>
              <h1>
                Tijd om te spelen!
              </h1>

              <p className="subtitle">
                De busrit gaat beginnen...
              </p>
            </div>
          </div>

          <div className="step-progress">
            {[0, 1, 2, 3].map(
              (
                step
              ) => (
                <div
                  key={
                    step
                  }
                  className={
                    step ===
                    currentStep
                      ? "step active"
                      : step <
                          currentStep
                        ? "step completed"
                        : "step"
                  }
                >
                  <span>
                    {step + 1}
                  </span>

                  <small>
                    {
                      stepNames[
                        step
                      ]
                    }
                  </small>
                </div>
              )
            )}
          </div>

          <div className="game-info">
            <span>
              Stap{" "}
              {currentStep + 1}{" "}
              van 4
            </span>

            <strong>
              {
                stepNames[
                  currentStep
                ]
              }
            </strong>
          </div>

          <div className="turn-message">
            {result ? (
              <>
                <strong>
                  {isDiscoSuccess
                    ? "🪩 DISCO!"
                    : result.correct
                      ? "Goed!"
                      : "Fout!"}
                </strong>

                <p>
                  Volgende speler begint automatisch.
                </p>
              </>
            ) : isMyTurn ? (
              <>
                <strong>
                  Jij bent aan de beurt
                </strong>

                <p>
                  {getStepDescription()}
                </p>
              </>
            ) : (
              <>
                <strong>
                  {
                    currentPlayer
                      ?.name
                  }
                </strong>

                <p>
                  maakt een keuze...
                </p>
              </>
            )}
          </div>

          <div className="my-cards">
            <div className="section-title">
              <h2>
                Jouw kaarten
              </h2>

              <span>
                {myCards.length} / 4
              </span>
            </div>

            <div className="cards-row">
              {myCards.map(
                (
                  card
                ) => (
                  <div
                    key={
                      card.id
                    }
                    className={`playing-card ${card.color}`}
                  >
                    {renderPlayingCard(
                      card
                    )}
                  </div>
                )
              )}

              {Array.from({
                length:
                  Math.max(
                    0,
                    4 -
                      myCards.length
                  ),
              }).map(
                (
                  _,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                    className="empty-card"
                  >
                    <span>
                      🂠
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {result && (
            <div
              className={
                result.correct
                  ? "result-area correct"
                  : "result-area wrong"
              }
            >
              <div className="result-icon">
                {isDiscoSuccess
                  ? "🪩"
                  : result.correct
                    ? "✓"
                    : "✕"}
              </div>

              <div className="result-content">
                <h2>
                  {isDiscoSuccess
                    ? "DISCO!"
                    : result.correct
                      ? "Goed!"
                      : "Fout!"}
                </h2>

                <div
                  className={`revealed-card ${result.card.color}`}
                >
                  <span>
                    {getCardRank(
                      result.card
                    )}
                  </span>

                  <strong>
                    {
                      result.card
                        .symbol
                    }
                  </strong>
                </div>

                <p>
                  {
                    result.playerName
                  }{" "}
                  koos{" "}
                  <strong>
                    {result.isDisco
                      ? "Disco 🪩"
                      : result.guess}
                  </strong>
                </p>

                {isDiscoSuccess &&
                  isMyResult && (
                    <div className="drink-message success">
                      🪩 Iedereen behalve jij neemt 1 slok!
                    </div>
                  )}

                {isDiscoSuccess &&
                  shouldDrink && (
                    <div className="drink-message">
                      🪩 Neem 1 slok
                    </div>
                  )}

                {!result.isDisco &&
                  isMyResult &&
                  result.correct && (
                    <div className="drink-message success">
                      Geen slok
                    </div>
                  )}

                {!isDiscoSuccess &&
                  shouldDrink && (
                    <div className="drink-message">
                      🥃 Neem 1 slok
                    </div>
                  )}

                <div className="next-countdown">
                  Volgende speler over{" "}
                  <strong>
                    {countdown}
                  </strong>
                  ...
                </div>
              </div>
            </div>
          )}

          {!result &&
            isMyTurn && (
              <>
                {drawnCard ? (
                  <div className="guess-area">
                    <h2>
                      Maak je keuze
                    </h2>

                    {currentStep ===
                      0 && (
                      <div className="guess-grid two">
                        <button
                          onClick={() =>
                            makeGuess(
                              "rood"
                            )
                          }
                        >
                          ♥ Rood
                        </button>

                        <button
                          onClick={() =>
                            makeGuess(
                              "zwart"
                            )
                          }
                        >
                          ♠ Zwart
                        </button>
                      </div>
                    )}

                    {currentStep ===
                      1 && (
                      <div className="guess-grid two">
                        <button
                          onClick={() =>
                            makeGuess(
                              "hoger"
                            )
                          }
                        >
                          ↑ Hoger
                        </button>

                        <button
                          onClick={() =>
                            makeGuess(
                              "lager"
                            )
                          }
                        >
                          ↓ Lager
                        </button>
                      </div>
                    )}

                    {currentStep ===
                      2 && (
                      <div className="guess-grid two">
                        <button
                          onClick={() =>
                            makeGuess(
                              "binnen"
                            )
                          }
                        >
                          ↔ Binnen
                        </button>

                        <button
                          onClick={() =>
                            makeGuess(
                              "buiten"
                            )
                          }
                        >
                          ↕ Buiten
                        </button>
                      </div>
                    )}

                    {currentStep ===
                      3 && (
                      <>
                        <div className="guess-grid">
                          <button
                            onClick={() =>
                              makeGuess(
                                "harten"
                              )
                            }
                          >
                            ♥ Harten
                          </button>

                          <button
                            onClick={() =>
                              makeGuess(
                                "ruiten"
                              )
                            }
                          >
                            ♦ Ruiten
                          </button>

                          <button
                            onClick={() =>
                              makeGuess(
                                "klaveren"
                              )
                            }
                          >
                            ♣ Klaveren
                          </button>

                          <button
                            onClick={() =>
                              makeGuess(
                                "schoppen"
                              )
                            }
                          >
                            ♠ Schoppen
                          </button>
                        </div>

                        <button
                          className="disco-button"
                          onClick={() =>
                            makeGuess(
                              "disco"
                            )
                          }
                        >
                          🪩 Disco
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="dealing-message">
                    🃏 Kaart wordt gedeeld...
                  </div>
                )}
              </>
            )}

          {!result &&
            !isMyTurn && (
              <div className="waiting-message game-waiting">
                <div className="hidden-card">
                  ?
                </div>

                <p>
                  <strong>
                    {
                      currentPlayer
                        ?.name
                    }
                  </strong>{" "}
                  maakt een keuze...
                </p>
              </div>
            )}

          <div className="game-players">
            <div className="section-title">
              <h2>
                Spelers
              </h2>

              <span>
                {
                  gameState.players
                    .length
                }
              </span>
            </div>

            {gameState.players.map(
              (
                player,
                index
              ) => (
                <div
                  key={
                    player.id
                  }
                  className={
                    index ===
                    gameState
                      .currentPlayerIndex
                      ? "game-player active"
                      : "game-player"
                  }
                >
                  <div className="player-avatar">
                    {player.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="player-info">
                    <span>
                      {
                        player.name
                      }
                    </span>

                    {index ===
                      gameState
                        .currentPlayerIndex && (
                        <small>
                          AAN DE BEURT
                        </small>
                      )}
                  </div>

                  <span className="card-count">
                    {player.cards
                      ?.length ||
                      0}{" "}
                    🃏
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      </main>
    );
  }

  if (
    screen === "lobby"
  ) {
    return (
      <main className="app">
        <section className="card lobby-card">
          <div className="logo small-logo">
            🚌
          </div>

          <h1>
            Jullie zijn erbij!
          </h1>

          <p className="subtitle">
            Scan de QR-code om mee te doen
          </p>

          <div className="qr-placeholder">
            {roomCode && (
              <QRCodeSVG
                value={
                  getJoinUrl()
                }
                size={190}
                level="M"
              />
            )}

            <p>
              SCAN OM MEE TE DOEN
            </p>
          </div>

          <div className="room-code">
            <span>
              Kamercode
            </span>

            <strong>
              {
                roomCode
              }
            </strong>
          </div>

          <div className="players-header">
            <h2>
              Spelers (
              {playerNames.length}/
              {players})
            </h2>
          </div>

          <div className="player-list">
            {playerNames.map(
              (
                player
              ) => (
                <div
                  className="player"
                  key={
                    player.id
                  }
                >
                  <div className="player-avatar">
                    {player.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <span>
                    {
                      player.name
                    }
                  </span>

                  {player.isHost ? (
                    <span className="host-label">
                      HOST
                    </span>
                  ) : (
                    isHost && (
                      <button
                        className="remove-player"
                        onClick={() =>
                          removePlayer(
                            player.id
                          )
                        }
                      >
                        ×
                      </button>
                    )
                  )}
                </div>
              )
            )}
          </div>

          {isHost ? (
            <button
              className="start-button"
              disabled={
                playerNames.length <
                2
              }
              onClick={
                startGame
              }
            >
              {playerNames.length <
              2
                ? "Wacht op spelers..."
                : "Spel starten 🚌"}
            </button>
          ) : (
            <div className="waiting-message">
              Wachten tot de host het spel start...
            </div>
          )}
        </section>
      </main>
    );
  }

  if (
    screen === "join"
  ) {
    return (
      <main className="app">
        <section className="card">
          <button
            className="back-button"
            onClick={() => {
              setJoinError("");
              setScreen("home");
            }}
          >
            ← Terug
          </button>

          <div className="logo small-logo">
            🚌
          </div>

          <h1>
            Meedoen
          </h1>

          <p className="subtitle">
            Vul je naam in
          </p>

          <div className="setting">
            <label>
              Jouw naam
            </label>

            <input
              type="text"
              value={
                playerName
              }
              placeholder="Bijvoorbeeld Dennis"
              onChange={(
                event
              ) =>
                setPlayerName(
                  event.target.value
                )
              }
              maxLength={15}
            />
          </div>

          <div className="setting">
            <label>
              Kamercode
            </label>

            <input
              type="text"
              value={
                joinCode
              }
              placeholder="Bijvoorbeeld X7K4P"
              onChange={(
                event
              ) =>
                setJoinCode(
                  event.target.value
                    .toUpperCase()
                    .replace(
                      /[^A-Z0-9]/g,
                      ""
                    )
                    .slice(
                      0,
                      5
                    )
                )
              }
              maxLength={5}
            />
          </div>

          {joinError && (
            <p className="join-error">
              {
                joinError
              }
            </p>
          )}

          <button
            className="start-button"
            onClick={
              joinRoom
            }
          >
            Meedoen 🚌
          </button>
        </section>
      </main>
    );
  }

  if (
    screen === "howto"
  ) {
    return (
      <main className="app">
        <section className="card rules-guide-card">
          <button
            className="back-button"
            onClick={() =>
              setScreen(
                "home"
              )
            }
          >
            ← Terug
          </button>

          <div className="logo small-logo">
            📖
          </div>

          <h1>
            Spelregels
          </h1>

          <p className="subtitle">
            Zo speel je Bussen
          </p>

          <div className="rules-guide">
            <div className="rule-guide-item">
              <div className="rule-number">
                1
              </div>

              <div>
                <h2>
                  Vier kaarten verzamelen
                </h2>

                <p>
                  Iedere speler krijgt vier kaarten door rood/zwart, hoger/lager, binnen/buiten en het figuur te voorspellen.
                </p>

                <p>
                  Een verkeerde voorspelling betekent één slok. Bij de vierde kaart kun je ook voor Disco kiezen.
                </p>
              </div>
            </div>

            <div className="rule-guide-item">
              <div className="rule-number">
                2
              </div>

              <div>
                <h2>
                  De boom
                </h2>

                <p>
                  De boomkaarten worden één voor één omgedraaid. Heb jij dezelfde kaartwaarde, dan kun je die kaart wegleggen en slokken uitdelen.
                </p>

                <p>
                  De groep kan vooraf kiezen of er horizontale 2×-kaarten worden gebruikt.
                </p>

                <p>
                  Optioneel kan er ook een Adtje-kaart onder de boom liggen.
                </p>
              </div>
            </div>

            <div className="rule-guide-item">
              <div className="rule-number">
                3
              </div>

              <div>
                <h2>
                  Wie moet de bus in?
                </h2>

                <p>
                  De speler met de meeste kaarten over gaat de bus in. Bij gelijkstand trekken de betrokken spelers zelf een kaart; de laagste verliest.
                </p>
              </div>
            </div>

            <div className="rule-guide-item">
              <div className="rule-number">
                4
              </div>

              <div>
                <h2>
                  De bus
                </h2>

                <p>
                  De chauffeur trekt eerst de lengte van de bus en daarna hoeveel kaarten open liggen. Vervolgens wordt steeds hoger of lager gespeeld.
                </p>

                <p>
                  Gebruikte kaarten gaan op de aflegstapel. Pas wanneer de trekstapel leeg is, wordt de aflegstapel opnieuw geschud.
                </p>
              </div>
            </div>

            <div className="rule-guide-item final-rule">
              <div className="rule-number">
                🏁
              </div>

              <div>
                <h2>
                  Uit de bus
                </h2>

                <p>
                  Het spel eindigt wanneer de hele bus succesvol is uitgespeeld.
                </p>
              </div>
            </div>
          </div>

          <button
            className="start-button"
            onClick={() =>
              setScreen(
                "home"
              )
            }
          >
            Begrepen ✓
          </button>
        </section>
      </main>
    );
  }

  if (
    screen === "rules"
  ) {
    return (
      <main className="app">
        <section className="card settings-card">
          <button
            className="back-button"
            onClick={() =>
              setScreen(
                "settings"
              )
            }
          >
            ← Terug
          </button>

          <div className="logo small-logo">
            ⚙️
          </div>

          <h1>
            Spelregels
          </h1>

          <p className="subtitle">
            Pas het spel aan zoals jullie het spelen
          </p>

          <div className="setting">
            <label>
              🌲 Aantal rijen in de boom
            </label>

            <div className="options">
              {[3, 4, 5].map(
                (
                  value
                ) => (
                  <button
                    key={
                      value
                    }
                    className={
                      rows ===
                      value
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setRows(
                        value
                      )
                    }
                  >
                    {
                      value
                    }
                  </button>
                )
              )}
            </div>
          </div>

          <div className="setting">
            <label>
              ✨ 2×-kaart in de boom
            </label>

            <div className="options">
              <button
                className={
                  !treeDouble
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setTreeDouble(
                    false
                  )
                }
              >
                Uit
              </button>

              <button
                className={
                  treeDouble
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setTreeDouble(
                    true
                  )
                }
              >
                Aan
              </button>
            </div>

            <p>
              Met 2× aan ligt er in iedere rij één horizontale kaart die dubbel zoveel slokken waard is.
            </p>
          </div>

          <div className="setting">
            <label>
              🍺 Adtje-kaart
            </label>

            <div className="options">
              <button
                className={
                  !adtCard
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setAdtCard(
                    false
                  )
                }
              >
                Uit
              </button>

              <button
                className={
                  adtCard
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setAdtCard(
                    true
                  )
                }
              >
                Aan
              </button>
            </div>

            <p>
              Met Adtje aan ligt er onder de boom een extra kaart.
            </p>
          </div>

          <div className="setting">
            <label>
              🃏 Aantal kaartspellen
            </label>

            <div className="options">
              {[1, 2].map(
                (
                  value
                ) => (
                  <button
                    key={
                      value
                    }
                    className={
                      decks ===
                      value
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setDecks(
                        value
                      )
                    }
                  >
                    {value} 🃏
                  </button>
                )
              )}
            </div>
          </div>

          <div className="setting">
            <label>
              ⚑ Checkpoints in de bus
            </label>

            <div className="options">
              <button
                className={
                  !checkpoints
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setCheckpoints(
                    false
                  )
                }
              >
                Uit
              </button>

              <button
                className={
                  checkpoints
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setCheckpoints(
                    true
                  )
                }
              >
                Aan
              </button>
            </div>
          </div>

          {checkpoints && (
            <div className="setting">
              <label>
                Wat gebeurt er bij een checkpoint?
              </label>

              <div className="double-rule-options">
                <button
                  className={
                    checkpointFailRule ===
                    "safe"
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setCheckpointFailRule(
                      "safe"
                    )
                  }
                >
                  <strong>
                    ⚑ Nieuw beginpunt
                  </strong>

                  <span>
                    Zodra je op het checkpoint aankomt, wordt dit direct je nieuwe kaart 1.
                  </span>
                </button>

                <button
                  className={
                    checkpointFailRule ===
                    "retry"
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setCheckpointFailRule(
                      "retry"
                    )
                  }
                >
                  <strong>
                    🔁 Tweede kans
                  </strong>

                  <span>
                    Eerste fout: blijf staan. Tweede fout: terug naar kaart 1.
                  </span>
                </button>

                <button
                  className={
                    checkpointFailRule ===
                    "reset"
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setCheckpointFailRule(
                      "reset"
                    )
                  }
                >
                  <strong>
                    ↩ Terug naar 1
                  </strong>

                  <span>
                    Een fout op de checkpointkaart betekent direct terug naar kaart 1.
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="setting">
            <label>
              ⚡ Dubbele kaart in de bus
            </label>

            <div className="double-rule-options">
              <button
                className={
                  doubleRule ===
                  "pass"
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setDoubleRule(
                    "pass"
                  )
                }
              >
                <strong>
                  Bus doorgeven
                </strong>

                <span>
                  Bij dubbel kiest de speler iemand anders die de bus overneemt.
                </span>
              </button>

              <button
                className={
                  doubleRule ===
                  "take-along"
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setDoubleRule(
                    "take-along"
                  )
                }
              >
                <strong>
                  Iemand meenemen
                </strong>

                <span>
                  Bij dubbel kiest de speler iemand die mee de bus in gaat.
                </span>
              </button>
            </div>
          </div>

          <div className="game-summary">
            <strong>
              Ingestelde regels
            </strong>

            <p>
              Boom: {rows} rijen
            </p>

            <p>
              2×-kaart:{" "}
              {treeDouble
                ? "Aan"
                : "Uit"}
            </p>

            <p>
              Adtje-kaart:{" "}
              {adtCard
                ? "Aan"
                : "Uit"}
            </p>

            <p>
              {decks} kaartspel
              {decks === 1
                ? ""
                : "len"}
            </p>

            <p>
              Checkpoints:{" "}
              {checkpoints
                ? "Aan"
                : "Uit"}
            </p>

            <p>
              Dubbel in bus:{" "}
              {doubleRule ===
              "pass"
                ? "Bus doorgeven"
                : "Iemand meenemen"}
            </p>
          </div>

          <button
            className="start-button"
            onClick={() =>
              setScreen(
                "settings"
              )
            }
          >
            Regels opslaan ✓
          </button>
        </section>
      </main>
    );
  }

  if (
    screen ===
    "settings"
  ) {
    return (
      <main className="app">
        <section className="card settings-card">
          <button
            className="back-button"
            onClick={() =>
              setScreen(
                "home"
              )
            }
          >
            ← Terug
          </button>

          <div className="logo small-logo">
            🚌
          </div>

          <h1>
            Nieuw spel
          </h1>

          <p className="subtitle">
            Maak een kamer en stel jullie spel in
          </p>

          <div className="setting">
            <label>
              Jouw naam
            </label>

            <input
              type="text"
              value={
                hostName
              }
              placeholder="Bijvoorbeeld Joppe"
              onChange={(
                event
              ) =>
                setHostName(
                  event.target.value
                )
              }
              maxLength={15}
            />
          </div>

          <div className="setting">
            <label>
              Aantal spelers
            </label>

            <div className="counter">
              <button
                onClick={() =>
                  setPlayers(
                    Math.max(
                      2,
                      players - 1
                    )
                  )
                }
              >
                −
              </button>

              <span>
                {
                  players
                }
              </span>

              <button
                onClick={() =>
                  setPlayers(
                    Math.min(
                      20,
                      players + 1
                    )
                  )
                }
              >
                +
              </button>
            </div>
          </div>

          <div className="setting">
            <label>
              Spelregels
            </label>

            <button
              className="secondary"
              onClick={() =>
                setScreen(
                  "rules"
                )
              }
            >
              ⚙️ Spelregels instellen
            </button>
          </div>

          <div className="game-summary">
            <strong>
              Jullie spel
            </strong>

            <p>
              {players} spelers
              {" · "}
              {rows} rijen
              {" · "}
              {decks} kaartspel
              {decks === 1
                ? ""
                : "len"}
            </p>

            <p>
              2× boom:{" "}
              {treeDouble
                ? "aan"
                : "uit"}
              {" · "}
              Adtje:{" "}
              {adtCard
                ? "aan"
                : "uit"}
            </p>

            <p>
              Checkpoints:{" "}
              {checkpoints
                ? checkpointFailRule ===
                    "safe"
                  ? "Nieuw beginpunt"
                  : checkpointFailRule ===
                      "retry"
                    ? "Tweede kans"
                    : "Terug naar 1"
                : "Uit"}
            </p>

            <p>
              Dubbel:{" "}
              {doubleRule ===
              "pass"
                ? "Bus doorgeven"
                : "Iemand meenemen"}
            </p>
          </div>

          <button
            className="start-button"
            onClick={
              startLobby
            }
          >
            Spel starten 🚌
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <section className="card">
        <div className="logo">
          🚌
        </div>

        <h1>
          Bussen
        </h1>

        <p className="subtitle">
          Het drankspelletje,
          altijd bij de hand.
        </p>

        <button
          onClick={() =>
            setScreen(
              "settings"
            )
          }
        >
          Nieuw spel
        </button>

        <button
          className="secondary"
          onClick={() => {
            setJoinError("");
            setPlayerName("");
            setJoinCode("");
            setScreen("join");
          }}
        >
          Meedoen met spel
        </button>

        <button
          className="secondary"
          onClick={() =>
            setScreen(
              "howto"
            )
          }
        >
          📖 Spelregels
        </button>
      </section>
    </main>
  );
}

export default App;