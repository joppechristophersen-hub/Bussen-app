import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { io } from "socket.io-client";
import "./App.css";

type Screen =
  | "home"
  | "settings"
  | "join"
  | "lobby"
  | "game";

type GamePhase =
  | "cards"
  | "tree"
  | "tree-finished"
  | "bus-setup"
  | "bus"
  | "bus-finished";

type DoubleRule =
  | "pass"
  | "take-along";

type Card = {
  id: string;
  suit: string;
  symbol: string;
  value: number;
  name: string;
  color: "rood" | "zwart";
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
  type: "distributed" | "skipped";
  giverId: string;
  giverName: string;
  total: number;
  receivers: TreeReceiver[];
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

type TreeState = {
  rows: TreeRow[];

  status:
    | "waiting"
    | "no-match"
    | "resolving"
    | "resolved"
    | "finished";

  activeCard: TreeActiveCard | null;

  pendingResolverIds: string[];

  currentResolverId: string | null;

  drinksToDistribute: number;

  revealedCount: number;

  totalCards: number;

  lastAction: TreeLastAction | null;

  busDriver: BusDriver | null;

  tieBreakRounds: TieBreakRound[];
};

type BusResult = {
  type:
    | "correct"
    | "wrong"
    | "double";

  guess: string;

  fromCard: Card;

  targetCard: Card;

  targetIndex: number;

  drinks: number;

  correct: boolean;

  double: boolean;

  restartIndex?: number;
};

type BusCard = {
  id: string;
  revealed: boolean;
  card: Card | null;
  isCheckpoint: boolean;
};

type BusState = {
  lengthCard: Card;

  openCountCard: Card;

  length: number;

  initialOpenCount: number;

  cards: BusCard[];

  checkpoints: number[];

  status:
    | "setup"
    | "playing"
    | "result"
    | "double-choice"
    | "finished";

  currentIndex: number;

  targetIndex: number;

  activeDriverId: string;

  riders: string[];

  doubleRule: DoubleRule;

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

const socket = io(
  "https://bussen-server.onrender.com",
  {
    autoConnect: false,
  }
);

function App() {
  const socketId =
    socket.id ?? "";

  const [
    screen,
    setScreen,
  ] = useState<Screen>(
    "home"
  );

  const [
    players,
    setPlayers,
  ] = useState(4);

  const [
    rows,
    setRows,
  ] = useState(4);

  const [
    decks,
    setDecks,
  ] = useState(1);

  const [
    checkpoints,
    setCheckpoints,
  ] = useState(false);

  const [
    doubleRule,
    setDoubleRule,
  ] =
    useState<DoubleRule>(
      "pass"
    );

  const [
    hostName,
    setHostName,
  ] = useState("");

  const [
    roomCode,
    setRoomCode,
  ] = useState("");

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
  ] = useState("");

  const [
    joinCode,
    setJoinCode,
  ] = useState("");

  const [
    joinError,
    setJoinError,
  ] = useState("");

  const [
    isHost,
    setIsHost,
  ] = useState(false);

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
  ] = useState(0);

  const [
    distribution,
    setDistribution,
  ] = useState<
    Record<string, number>
  >({});

  const [
    treeSubmitting,
    setTreeSubmitting,
  ] = useState(false);

  const [
    selectedCheckpoints,
    setSelectedCheckpoints,
  ] = useState<number[]>(
    []
  );

  const [
    busSubmitting,
    setBusSubmitting,
  ] = useState(false);

  /*
   * =========================
   * QR CODE
   * =========================
   */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const room =
      params
        .get("room")
        ?.toUpperCase();

    if (
      room &&
      room.length === 5
    ) {
      setJoinCode(room);

      setScreen("join");
    }
  }, []);

  /*
   * =========================
   * SOCKET EVENTS
   * =========================
   */

  useEffect(() => {
    function handlePlayersUpdated(
      updated: Player[]
    ) {
      setPlayerNames(
        updated
      );
    }

    function handleGameStarted() {
      setDrawnCard(null);

      setGuessResult(null);

      setCountdown(0);

      setDistribution({});

      setScreen("game");
    }

    function handleGameState(
      state: GameState
    ) {
      console.log(
        "GAME STATE:",
        state
      );

      if (
        state.serverVersion
      ) {
        console.log(
          "SERVER VERSION:",
          state.serverVersion
        );
      }

      setGameState(state);

      setPlayerNames(
        state.players
      );

      /*
       * KAARTFASE
       */

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
        setGuessResult(null);

        setCountdown(0);
      }

      if (
        state.phase ===
          "cards" &&
        !state.waitingForGuess &&
        !state.resultShowing
      ) {
        setDrawnCard(null);
      }

      /*
       * Buiten de kaartfase
       */

      if (
        state.phase !==
        "cards"
      ) {
        setDrawnCard(null);

        setGuessResult(null);
      }

      /*
       * BUS
       */

      if (state.bus) {
        setSelectedCheckpoints(
          state.bus.checkpoints
        );
      }

      setBusSubmitting(
        false
      );
    }

    function handleCardDrawn({
      card,
    }: {
      card: Card;
    }) {
      setDrawnCard(card);

      setGuessResult(null);
    }

    function handleGuessResult(
      result: GuessResult
    ) {
      setGuessResult(
        result
      );

      setDrawnCard(null);

      setCountdown(3);
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
      "room-closed",
      handleRoomClosed
    );

    socket.on(
      "removed-from-room",
      handleRemovedFromRoom
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
        "room-closed",
        handleRoomClosed
      );

      socket.off(
        "removed-from-room",
        handleRemovedFromRoom
      );
    };
  }, []);

  /*
   * =========================
   * COUNTDOWN KAARTFASE
   * =========================
   */

  useEffect(() => {
    if (
      !guessResult ||
      gameState?.phase !==
        "cards"
    ) {
      setCountdown(0);

      return;
    }

    /*
     * Altijd een gewone number.
     * Hiermee voorkomen we de
     * TypeScript null/undefined fout.
     */

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

    function update() {
      const secondsLeft =
        Math.max(
          0,
          Math.ceil(
            (
              endTime -
              Date.now()
            ) /
              1000
          )
        );

      setCountdown(
        secondsLeft
      );
    }

    update();

    const interval =
      window.setInterval(
        update,
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

  /*
   * =========================
   * BOOM VERDELING RESET
   * =========================
   */

  useEffect(() => {
    setDistribution({});

    setTreeSubmitting(
      false
    );
  }, [
    gameState?.tree
      ?.currentResolverId,

    gameState?.tree
      ?.activeCard?.card.id,
  ]);

  /*
   * =========================
   * RESET
   * =========================
   */

  function resetToHome() {
    setRoomCode("");

    setPlayerNames([]);

    setIsHost(false);

    setGameState(null);

    setDrawnCard(null);

    setGuessResult(null);

    setCountdown(0);

    setDistribution({});

    setSelectedCheckpoints(
      []
    );

    setTreeSubmitting(
      false
    );

    setBusSubmitting(
      false
    );

    setScreen("home");
  }

  /*
   * =========================
   * KAART WEERGAVE
   * =========================
   */

  function getCardRank(
    card: Card
  ) {
    if (
      card.name === "Boer"
    ) {
      return "B";
    }

    if (
      card.name === "Vrouw"
    ) {
      return "V";
    }

    if (
      card.name === "Heer"
    ) {
      return "H";
    }

    if (
      card.name === "Aas"
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

  /*
   * =========================
   * LOBBY MAKEN
   * =========================
   */

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
        playerName: name,

        settings: {
          players,
          rows,
          decks,
          checkpoints,
          doubleRule,
        },
      },

      (
        response: {
          success: boolean;
          roomCode?: string;
          players?: Player[];
          message?: string;
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

        setIsHost(true);

        setScreen("lobby");
      }
    );
  }

  /*
   * =========================
   * JOINEN
   * =========================
   */

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
      code.length !== 5
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
        roomCode: code,
        playerName: name,
      },

      (
        response: {
          success: boolean;
          roomCode?: string;
          players?: Player[];
          message?: string;
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

        setIsHost(false);

        setScreen("lobby");
      }
    );
  }

  function removePlayer(
    playerId: string
  ) {
    socket.emit(
      "remove-player",
      playerId
    );
  }

  function startGame() {
    socket.emit(
      "start-game"
    );
  }

  function getJoinUrl() {
    return `${window.location.origin}/?room=${roomCode}`;
  }

  /*
   * =========================
   * KAARTFASE
   * =========================
   */

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
        "cards"
    ) {
      return;
    }

    if (
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

    return "Raad het figuur, of kies Disco als je denkt dat je alle vier de figuren compleet maakt.";
  }

  /*
   * =========================
   * BOOM VERDELEN
   * =========================
   */

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
              sum +
              value,
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

    const payload =
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
        );

    socket.emit(
      "tree-distribute",

      {
        distribution:
          payload,
      },

      (
        response: {
          success: boolean;
          message?: string;
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
          success: boolean;
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

  /*
   * =========================
   * BUS
   * =========================
   */

  function toggleCheckpoint(
    index: number
  ) {
    if (!isHost) {
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

  function startBus() {
    if (!isHost) {
      return;
    }

    setBusSubmitting(
      true
    );

    socket.emit(
      "bus-start",

      (
        response: {
          success: boolean;
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
          success: boolean;
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
          success: boolean;
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

    return (
      <main className="app">
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
                Stel eerst de checkpoints in
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

          <div className="bus-setup-draws">
            <div>
              <span>
                Lengte
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
                {bus.length}{" "}
                kaarten
              </b>
            </div>

            <div>
              <span>
                Open
              </span>

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
                }{" "}
                open
              </b>
            </div>
          </div>

          <div className="checkpoint-panel">
            <h2>
              Checkpoints
            </h2>

            <p>
              Bij een fout ga je terug naar het laatste behaalde checkpoint. Het aantal slokken blijft vanaf kaart 1 tellen.
            </p>

            <div className="checkpoint-grid">
              {bus.cards.map(
                (
                  _,
                  index
                ) => {
                  const disabled =
                    index === 0 ||
                    index ===
                      bus.length -
                        1;

                  return (
                    <button
                      key={
                        index
                      }
                      disabled={
                        disabled ||
                        !isHost
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
                      {index +
                        1}
                    </button>
                  );
                }
              )}
            </div>

            {!isHost && (
              <p className="waiting-message">
                De host kiest de checkpoints...
              </p>
            )}
          </div>

          {isHost && (
            <button
              className="start-button"
              onClick={
                startBus
              }
              disabled={
                busSubmitting
              }
            >
              Bus starten 🚌
            </button>
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

    const riderPlayers =
      gameState.players.filter(
        (player) =>
          bus.riders.includes(
            player.id
          )
      );

    const target =
      bus.cards[
        bus.targetIndex
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
                Positie
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

          {riderPlayers.length >
            1 && (
            <div className="bus-riders">
              <span>
                In de bus:{" "}
              </span>

              <strong>
                {riderPlayers
                  .map(
                    (player) =>
                      player.name
                  )
                  .join(", ")}
              </strong>
            </div>
          )}

          <div className="bus-track">
            {bus.cards.map(
              (
                busCard,
                index
              ) => (
                <div
                  key={
                    busCard.id
                  }
                  className={[
                    "bus-card-slot",

                    index ===
                    bus.currentIndex
                      ? "current"
                      : "",

                    index ===
                      bus.targetIndex &&
                    bus.status ===
                      "playing"
                      ? "target"
                      : "",

                    busCard.isCheckpoint
                      ? "checkpoint"
                      : "",
                  ]
                    .filter(
                      Boolean
                    )
                    .join(" ")}
                >
                  <span className="bus-card-number">
                    {index +
                      1}
                  </span>

                  {busCard.revealed &&
                  busCard.card ? (
                    <div
                      className={`bus-card-face ${busCard.card.color}`}
                    >
                      {renderPlayingCard(
                        busCard.card
                      )}
                    </div>
                  ) : (
                    <div className="bus-card-back">
                      🚌
                    </div>
                  )}

                  {busCard.isCheckpoint && (
                    <small>
                      ⚑
                    </small>
                  )}
                </div>
              )
            )}
          </div>

          {gameState.phase ===
            "bus-finished" && (
            <div className="bus-finished-panel">
              <div>
                🏁
              </div>

              <h2>
                Uit de bus!
              </h2>

              <p>
                De hele bus is goed geraden.
              </p>
            </div>
          )}

          {gameState.phase ===
            "bus" &&
            bus.status ===
              "playing" && (
              <>
                {isDriver ? (
                  <div className="bus-choice-panel">
                    <h2>
                      Hoger of lager?
                    </h2>

                    {target?.revealed ? (
                      <p>
                        De volgende kaart ligt al open.
                      </p>
                    ) : (
                      <p>
                        De volgende kaart ligt dicht.
                      </p>
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
                      {driver?.name}{" "}
                      zit in de bus
                    </strong>

                    <p>
                      Wachten op de volgende gok...
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
                  {bus.result
                    .correct
                    ? "✓"
                    : "✕"}
                </div>

                <h2>
                  {bus.result
                    .correct
                    ? "Goed!"
                    : "Fout!"}
                </h2>

                <div
                  className={`tree-active-card ${bus.result.targetCard.color}`}
                >
                  <strong>
                    {getCardRank(
                      bus.result
                        .targetCard
                    )}
                  </strong>

                  <span>
                    {
                      bus.result
                        .targetCard
                        .symbol
                    }
                  </span>
                </div>

                {!bus.result
                  .correct && (
                  <>
                    <p>
                      Fout op kaart{" "}
                      <strong>
                        {bus.result
                          .targetIndex +
                          1}
                      </strong>
                    </p>

                    <div className="bus-drinks">
                      🥃{" "}
                      <strong>
                        {
                          bus.result
                            .drinks
                        }{" "}
                        slokken
                      </strong>
                    </div>

                    {riderPlayers.length >
                      1 && (
                      <p>
                        {riderPlayers
                          .map(
                            (
                              player
                            ) =>
                              player.name
                          )
                          .join(
                            " en "
                          )}{" "}
                        drinken mee.
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
                  Dubbele kaart!
                </h2>

                <p>
                  {getCardRank(
                    bus.result
                      .fromCard
                  )}{" "}
                  {
                    bus.result
                      .fromCard
                      .symbol
                  }{" "}
                  →{" "}
                  {getCardRank(
                    bus.result
                      .targetCard
                  )}{" "}
                  {
                    bus.result
                      .targetCard
                      .symbol
                  }
                </p>

                {isDriver ? (
                  <>
                    <strong>
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
                    {driver?.name}{" "}
                    maakt een keuze...
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
   * BOOM SCHERM
   * =========================
   */

  if (
    screen === "game" &&
    gameState &&
    (
      gameState.phase ===
        "tree" ||
      gameState.phase ===
        "tree-finished"
    )
  ) {
    const tree =
      gameState.tree;

    if (!tree) {
      return (
        <main className="app">
          <section className="card">
            Boom wordt opgebouwd...
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

    const iAmWaitingForResolution =
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

    return (
      <main className="app">
        <section className="card game-card tree-screen">
          <div className="game-top">
            <div className="logo small-logo">
              🌲
            </div>

            <div>
              <h1>
                De boom
              </h1>

              <p className="subtitle">
                Speel je kaarten weg en deel slokken uit
              </p>
            </div>
          </div>

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
              (row) => (
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
                            .join(
                              " "
                            )}
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
                              🚌
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          {tree.activeCard && (
            <div className="tree-active-panel">
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
                {tree.drinksToDistribute ===
                1
                  ? "slok"
                  : "slokken"}
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
                Niemand heeft deze kaartwaarde.
              </p>
            </div>
          )}

          {tree.status ===
            "resolving" &&
            isMyResolution && (
              <div className="tree-distribute-panel">
                <h2>
                  Jij hebt een match!
                </h2>

                <p>
                  Verdeel{" "}
                  <strong>
                    {
                      tree.drinksToDistribute
                    }{" "}
                    {tree.drinksToDistribute ===
                    1
                      ? "slok"
                      : "slokken"}
                  </strong>
                  .
                </p>

                <div className="remaining-drinks">
                  Nog te verdelen

                  <strong>
                    {
                      remaining
                    }
                  </strong>
                </div>

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
                                ] || 0
                              ) === 0 ||
                              treeSubmitting
                            }
                          >
                            −
                          </button>

                          <strong>
                            {distribution[
                              player.id
                            ] || 0}
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
                  onClick={
                    skipTreeMatch
                  }
                  disabled={
                    treeSubmitting
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
                {iAmWaitingForResolution ? (
                  <>
                    <strong>
                      Jij hebt ook een match
                    </strong>

                    <p>
                      Eerst is{" "}
                      {
                        resolver?.name
                      }{" "}
                      aan de beurt.
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
                Match afgehandeld
              </strong>

              <p>
                De volgende boomkaart komt eraan...
              </p>
            </div>
          )}

          <div className="tree-hands">
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

                  <span>
                    {
                      player.name
                    }

                    {player.id ===
                      me?.id
                      ? " (jij)"
                      : ""}
                  </span>

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

    const discoSuccess =
      Boolean(
        result?.isDisco &&
          result.correct
      );

    const shouldDrink =
      Boolean(
        result &&
          (
            (
              discoSuccess &&
              result.playerId !==
                socketId
            ) ||
            (
              !discoSuccess &&
              isMyResult &&
              !result.correct
            )
          )
      );

    return (
      <main className="app">
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
                    {step +
                      1}
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

          <div className="turn-message">
            {result ? (
              <>
                <strong>
                  {discoSuccess
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
                    className={`playing-card ${card.color}`}
                    key={
                      card.id
                    }
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
                {discoSuccess
                  ? "🪩"
                  : result.correct
                    ? "✓"
                    : "✕"}
              </div>

              <h2>
                {discoSuccess
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

              {discoSuccess &&
                isMyResult && (
                  <div className="drink-message success">
                    🪩 Iedereen behalve jij neemt 1 slok!
                  </div>
                )}

              {discoSuccess &&
                !isMyResult && (
                  <div className="drink-message">
                    🪩 Neem 1 slok
                  </div>
                )}

              {!discoSuccess &&
                shouldDrink && (
                  <div className="drink-message">
                    🥃 Neem 1 slok
                  </div>
                )}

              {!result.isDisco &&
                isMyResult &&
                result.correct && (
                  <div className="drink-message success">
                    Geen slok
                  </div>
                )}

              <div className="next-countdown">
                Volgende speler over{" "}
                <strong>
                  {
                    countdown
                  }
                </strong>
                ...
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
                  className={
                    index ===
                    gameState
                      .currentPlayerIndex
                      ? "game-player active"
                      : "game-player"
                  }
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
   * LOBBY
   * =========================
   */

  if (
    screen === "lobby"
  ) {
    return (
      <main className="app">
        <section className="card">
          <div className="logo">
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

                  {player.isHost && (
                    <span className="host-label">
                      HOST
                    </span>
                  )}

                  {isHost &&
                    !player.isHost && (
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
                    )}
                </div>
              )
            )}
          </div>

          {isHost ? (
            <button
              className="start-button"
              onClick={
                startGame
              }
              disabled={
                playerNames.length <
                2
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

  /*
   * =========================
   * JOIN
   * =========================
   */

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
            Vul je naam en kamercode in
          </p>

          <div className="setting">
            <label>
              Jouw naam
            </label>

            <input
              value={
                playerName
              }
              placeholder="Bijvoorbeeld Dennis"
              onChange={(
                event
              ) =>
                setPlayerName(
                  event.target
                    .value
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

  /*
   * =========================
   * SETTINGS
   * =========================
   */

  if (
    screen ===
    "settings"
  ) {
    return (
      <main className="app">
        <section className="card">
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
            Stel jullie spel in
          </p>

          <div className="setting">
            <label>
              Jouw naam
            </label>

            <input
              value={
                hostName
              }
              placeholder="Bijvoorbeeld Joppe"
              onChange={(
                event
              ) =>
                setHostName(
                  event.target
                    .value
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
                      players -
                        1
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
                      players +
                        1
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
              Aantal rijen in de boom
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

          {/*
           * =========================
           * KAARTSPELLEN
           *
           * Hiermee wordt setDecks
           * weer daadwerkelijk gebruikt.
           * =========================
           */}

          <div className="setting">
            <label>
              Kaartspellen
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
                    {value}{" "}
                    {value === 1
                      ? "kaartspel"
                      : "kaartspellen"}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="setting">
            <label>
              Checkpoints in de bus
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

          <div className="setting">
            <label>
              Bij een dubbele kaart
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
                  Kies iemand die de bus overneemt
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
                  Kies iemand die vanaf dan mee drinkt
                </span>
              </button>
            </div>
          </div>

          <div className="game-summary">
            <strong>
              Jullie spel
            </strong>

            <p>
              {players} spelers ·{" "}
              {rows} rijen ·{" "}
              {decks}{" "}
              {decks === 1
                ? "kaartspel"
                : "kaartspellen"}{" "}
              · checkpoints{" "}
              {checkpoints
                ? "aan"
                : "uit"}
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

  /*
   * =========================
   * HOME
   * =========================
   */

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

        <button className="secondary">
          Spelregels
        </button>
      </section>
    </main>
  );
}

export default App;