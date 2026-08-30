import {
  useEffect,
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
  | "join"
  | "lobby"
  | "game";

type GamePhase =
  | "cards"
  | "tree"
  | "tree-finished";

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

type BusDriver = {
  id: string;
  name: string;
  remainingCards: number;
};

type TieBreakDraw = {
  playerId: string;
  playerName: string;
  card: Card;
};

type TieBreakRound = {
  round: number;
  draws: TieBreakDraw[];
};

type TreeState = {
  rows: TreeRow[];

  status:
    | "waiting"
    | "no-match"
    | "resolving"
    | "resolved"
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

  busDriver:
    BusDriver | null;

  tieBreakRounds:
    TieBreakRound[];
};

type GameState = {
  serverVersion?: string;

  phase:
    GamePhase;

  players:
    Player[];

  currentPlayerIndex:
    number;

  currentStep:
    number;

  currentCard:
    Card | null;

  waitingForGuess:
    boolean;

  resultShowing:
    boolean;

  result?:
    GuessResult | null;

  resultEndsAt?:
    number | null;

  gameFinished:
    boolean;

  tree:
    TreeState | null;
};

const socket = io(
  "https://bussen-server.onrender.com",
  {
    autoConnect:
      false,
  }
);

function App() {
  /*
   * Socket.IO geeft socket.id
   * het type string | undefined.
   *
   * Voor vergelijkingen en .includes()
   * gebruiken we altijd deze veilige string.
   */

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

  /*
   * =========================
   * QR URL
   * =========================
   */

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
      roomFromUrl.length ===
        5
    ) {
      setJoinCode(
        roomFromUrl
      );

      setScreen(
        "join"
      );
    }
  }, []);

  /*
   * =========================
   * SOCKET EVENTS
   * =========================
   */

  useEffect(() => {
    function handlePlayersUpdated(
      updatedPlayers:
        Player[]
    ) {
      setPlayerNames(
        updatedPlayers
      );
    }

    function handleGameStarted() {
      setDrawnCard(
        null
      );

      setGuessResult(
        null
      );

      setCountdown(
        0
      );

      setDistribution(
        {}
      );

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

        setCountdown(
          0
        );
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
   * KAARTFASE COUNTDOWN
   * =========================
   */

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

    if (
      gameState
        ?.resultEndsAt
    ) {
      function updateCountdown() {
        const endTime =
          gameState
            ?.resultEndsAt;

        if (!endTime) {
          return;
        }

        const millisecondsLeft =
          endTime -
          Date.now();

        const secondsLeft =
          Math.max(
            0,
            Math.ceil(
              millisecondsLeft /
                1000
            )
          );

        setCountdown(
          secondsLeft
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
    }

    setCountdown(
      3
    );

    const startedAt =
      Date.now();

    const interval =
      window.setInterval(
        () => {
          const elapsed =
            Date.now() -
            startedAt;

          const secondsLeft =
            Math.max(
              0,
              3 -
                Math.floor(
                  elapsed /
                    1000
                )
            );

          setCountdown(
            secondsLeft
          );
        },
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
   * VERDELING RESETTEN
   * =========================
   */

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
      ?.activeCard?.card
      .id,
  ]);

  /*
   * =========================
   * RESET
   * =========================
   */

  function resetToHome() {
    setRoomCode(
      ""
    );

    setPlayerNames(
      []
    );

    setIsHost(
      false
    );

    setGameState(
      null
    );

    setDrawnCard(
      null
    );

    setGuessResult(
      null
    );

    setCountdown(
      0
    );

    setDistribution(
      {}
    );

    setTreeSubmitting(
      false
    );

    setScreen(
      "home"
    );
  }

  /*
   * =========================
   * KAMER MAKEN
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
        playerName:
          name,

        settings: {
          players,
          rows,
          decks,
          checkpoints,
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

    setJoinError(
      ""
    );

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

  /*
   * =========================
   * SPELER VERWIJDEREN
   * =========================
   */

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

  /*
   * =========================
   * SPEL STARTEN
   * =========================
   */

  function startGame() {
    if (!isHost) {
      return;
    }

    socket.emit(
      "start-game"
    );
  }

  /*
   * =========================
   * KAART GOK
   * =========================
   */

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
      gameState
        .resultShowing
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

  /*
   * =========================
   * JOIN URL
   * =========================
   */

  function getJoinUrl() {
    return `${window.location.origin}/?room=${roomCode}`;
  }

  /*
   * =========================
   * KAARTWAARDES
   * =========================
   */

  const stepNames = [
    "Kleur",
    "Hoger of lager",
    "Binnen of buiten",
    "Figuur",
  ];

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
      gameState
        .currentStep ===
      0
    ) {
      return "Raad of de kaart rood of zwart is.";
    }

    if (
      gameState
        .currentStep ===
      1
    ) {
      const card =
        player
          ?.cards?.[0];

      if (card) {
        return `Hoger of lager dan ${card.name} ${card.symbol}?`;
      }

      return "Hoger of lager?";
    }

    if (
      gameState
        .currentStep ===
      2
    ) {
      const first =
        player
          ?.cards?.[0];

      const second =
        player
          ?.cards?.[1];

      if (
        first &&
        second
      ) {
        return `Binnen of buiten ${first.name} ${first.symbol} en ${second.name} ${second.symbol}?`;
      }

      return "Binnen of buiten?";
    }

    return "Raad het figuur, of kies Disco als je denkt dat je alle vier compleet maakt.";
  }

  /*
   * =========================
   * FIGUUR + DISCO
   * =========================
   */

  function renderSuitButtons() {
    return (
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
    );
  }

  /*
   * =========================
   * BOOM VERDELING
   * =========================
   */

  function changeDistribution(
    playerId: string,
    difference: number
  ) {
    const totalAvailable =
      gameState?.tree
        ?.drinksToDistribute ||
      0;

    setDistribution(
      (previous) => {
        const current =
          previous[
            playerId
          ] || 0;

        const currentTotal =
          Object.values(
            previous
          ).reduce(
            (
              total,
              value
            ) =>
              total +
              value,
            0
          );

        if (
          difference >
            0 &&
          currentTotal >=
            totalAvailable
        ) {
          return previous;
        }

        const nextValue =
          Math.max(
            0,
            current +
              difference
          );

        return {
          ...previous,

          [playerId]:
            nextValue,
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
          sum +
          value,
        0
      );

    if (
      total !==
      tree.drinksToDistribute
    ) {
      return;
    }

    const payload =
      Object.entries(
        distribution
      )
        .filter(
          ([
            ,
            count,
          ]) =>
            count >
            0
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

    setTreeSubmitting(
      true
    );

    socket.emit(
      "tree-distribute",

      {
        distribution:
          payload,
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

  /*
   * =========================
   * SPEELKAART
   * =========================
   */

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
   * BOOM SCHERM
   * =========================
   */

  if (
    screen ===
      "game" &&
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

    /*
     * HIER ZAT DE TYPESCRIPT-FOUT.
     *
     * We gebruiken nu socketId,
     * wat altijd een string is.
     */

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

    const distributedTotal =
      Object.values(
        distribution
      ).reduce(
        (
          sum,
          value
        ) =>
          sum +
          value,
        0
      );

    const remaining =
      Math.max(
        0,
        tree.drinksToDistribute -
          distributedTotal
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

                            treeCard.revealed
                              ? "revealed"
                              : "hidden",
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
          </div>

          {gameState.phase ===
            "tree" &&
            tree.activeCard && (
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
                    tree.activeCard
                      .rowNumber
                  }{" "}
                  {tree.activeCard
                    .rowNumber ===
                  1
                    ? "slok"
                    : "slokken"}

                  {tree.activeCard
                    .isDouble &&
                    " × 2"}
                </h2>

                <p>
                  Deze kaart is{" "}
                  <strong>
                    {
                      tree.drinksToDistribute
                    }{" "}
                    {tree.drinksToDistribute ===
                    1
                      ? "slok"
                      : "slokken"}
                  </strong>{" "}
                  waard.
                </p>
              </div>
            )}

          {gameState.phase ===
            "tree" &&
            tree.status ===
              "no-match" && (
              <div className="tree-message">
                <strong>
                  Geen match
                </strong>

                <p>
                  Niemand heeft deze waarde. De volgende kaart wordt automatisch omgedraaid.
                </p>
              </div>
            )}

          {gameState.phase ===
            "tree" &&
            tree.status ===
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

          {gameState.phase ===
            "tree" &&
            tree.status ===
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
                      Leg je matchende kaart weg en verdeel{" "}
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
                  </div>
                </div>

                <div className="remaining-drinks">
                  Nog te verdelen

                  <strong>
                    {remaining}
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
                      (player) => {
                        const amount =
                          distribution[
                            player.id
                          ] ||
                          0;

                        return (
                          <div
                            className="drink-player"
                            key={
                              player.id
                            }
                          >
                            <div className="player-avatar">
                              {player.name
                                .charAt(
                                  0
                                )
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
                                  amount ===
                                    0 ||
                                  treeSubmitting
                                }
                              >
                                −
                              </button>

                              <strong>
                                {
                                  amount
                                }
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
                        );
                      }
                    )}
                </div>

                <button
                  className="tree-confirm-button"
                  onClick={
                    submitTreeDistribution
                  }
                  disabled={
                    remaining !==
                      0 ||
                    treeSubmitting
                  }
                >
                  {treeSubmitting
                    ? "Bevestigen..."
                    : "Kaart wegleggen & uitdelen"}
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

          {gameState.phase ===
            "tree" &&
            tree.status ===
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
                      <strong>
                        {
                          resolver?.name
                        }
                      </strong>{" "}
                      aan de beurt. Daarna mag jij uitdelen.
                    </p>
                  </>
                ) : (
                  <>
                    <strong>
                      {
                        resolver?.name ||
                        "Een speler"
                      }{" "}
                      heeft een match
                    </strong>

                    <p>
                      Wachten tot de slokken zijn verdeeld...
                    </p>
                  </>
                )}
              </div>
            )}

          {gameState.phase ===
            "tree" &&
            tree.status ===
              "resolved" && (
              <div className="tree-message">
                <strong>
                  Match afgehandeld
                </strong>

                {tree.lastAction?.type ===
                "distributed" ? (
                  <p>
                    {
                      tree.lastAction
                        .giverName
                    }{" "}
                    heeft{" "}
                    {
                      tree.lastAction
                        .total
                    }{" "}
                    slokken uitgedeeld.
                  </p>
                ) : (
                  <p>
                    De volgende boomkaart komt eraan...
                  </p>
                )}
              </div>
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
              (player) => (
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

          {gameState.phase ===
            "tree-finished" &&
            tree.busDriver && (
              <div className="bus-driver-result">
                <div className="bus-driver-icon">
                  🚌
                </div>

                <span>
                  DE BUS IN
                </span>

                <h2>
                  {
                    tree.busDriver
                      .name
                  }
                </h2>

                <p>
                  {
                    tree.busDriver
                      .remainingCards
                  }{" "}
                  {tree.busDriver
                    .remainingCards ===
                  1
                    ? "kaart"
                    : "kaarten"}{" "}
                  over
                </p>

                {tree.tieBreakRounds.length >
                  0 && (
                  <div className="tie-break">
                    <strong>
                      Gelijkstand beslist met kaarten
                    </strong>

                    {tree.tieBreakRounds.map(
                      (
                        round
                      ) => (
                        <div
                          className="tie-round"
                          key={
                            round.round
                          }
                        >
                          <span>
                            Trekking{" "}
                            {
                              round.round
                            }
                          </span>

                          {round.draws.map(
                            (
                              draw
                            ) => (
                              <div
                                className="tie-draw"
                                key={`${round.round}-${draw.playerId}`}
                              >
                                <span>
                                  {
                                    draw.playerName
                                  }
                                </span>

                                <strong
                                  className={
                                    draw.card
                                      .color
                                  }
                                >
                                  {getCardRank(
                                    draw.card
                                  )}{" "}
                                  {
                                    draw.card
                                      .symbol
                                  }
                                </strong>
                              </div>
                            )
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

                <p className="bus-next-text">
                  Hierna bouwen we de echte bus.
                </p>
              </div>
            )}
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
    screen ===
      "game" &&
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
              (step) => (
                <div
                  key={step}
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
              {currentStep +
                1}{" "}
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
                (card) => (
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
                      3 &&
                      renderSuitButtons()}
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

  /*
   * =========================
   * LOBBY
   * =========================
   */

  if (
    screen ===
    "lobby"
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
            {roomCode ? (
              <QRCodeSVG
                value={
                  getJoinUrl()
                }
                size={190}
                level="M"
              />
            ) : (
              <p>
                QR-code laden...
              </p>
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
              (player) => (
                <div
                  key={
                    player.id
                  }
                  className="player"
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

  /*
   * =========================
   * JOIN
   * =========================
   */

  if (
    screen ===
    "join"
  ) {
    return (
      <main className="app">
        <section className="card">
          <button
            className="back-button"
            onClick={() => {
              setJoinError(
                ""
              );

              setScreen(
                "home"
              );
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
              placeholder="Bijvoorbeeld Dennis"
              value={
                playerName
              }
              onChange={(
                event
              ) =>
                setPlayerName(
                  event.target
                    .value
                )
              }
              maxLength={
                15
              }
            />
          </div>

          <div className="setting">
            <label>
              Kamercode
            </label>

            <input
              type="text"
              placeholder="Bijvoorbeeld X7K4P"
              value={
                joinCode
              }
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
              maxLength={
                5
              }
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
            Stel jullie spel in
          </p>

          <div className="setting">
            <label>
              Jouw naam
            </label>

            <input
              type="text"
              placeholder="Bijvoorbeeld Joppe"
              value={
                hostName
              }
              onChange={(
                event
              ) =>
                setHostName(
                  event.target
                    .value
                )
              }
              maxLength={
                15
              }
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
              Aantal rijen
            </label>

            <div className="options">
              {[3, 4, 5].map(
                (
                  number
                ) => (
                  <button
                    key={
                      number
                    }
                    className={
                      rows ===
                      number
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setRows(
                        number
                      )
                    }
                  >
                    {
                      number
                    }
                  </button>
                )
              )}
            </div>
          </div>

          <div className="setting">
            <label>
              Kaartspellen
            </label>

            <div className="options">
              {[1, 2].map(
                (
                  number
                ) => (
                  <button
                    key={
                      number
                    }
                    className={
                      decks ===
                      number
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setDecks(
                        number
                      )
                    }
                  >
                    {
                      number
                    }{" "}
                    🃏
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

          <div className="game-summary">
            <strong>
              Jullie spel
            </strong>

            <p>
              {players} spelers ·{" "}
              {rows} rijen ·{" "}
              {decks} kaartspel
              {decks ===
              1
                ? ""
                : "len"}{" "}
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
            setJoinError(
              ""
            );

            setPlayerName(
              ""
            );

            setJoinCode(
              ""
            );

            setScreen(
              "join"
            );
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