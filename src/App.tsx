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

type GameState = {
  serverVersion?: string;
  players: Player[];
  currentPlayerIndex: number;
  currentStep: number;
  currentCard: Card | null;
  waitingForGuess: boolean;
  resultShowing: boolean;
  result?: GuessResult | null;
  resultEndsAt?: number | null;
  gameFinished: boolean;
};

const socket = io(
  "https://bussen-server.onrender.com",
  {
    autoConnect: false,
  }
);

function App() {
  const [screen, setScreen] =
    useState<Screen>("home");

  const [players, setPlayers] =
    useState(4);

  const [rows, setRows] =
    useState(4);

  const [decks, setDecks] =
    useState(1);

  const [checkpoints, setCheckpoints] =
    useState(false);

  const [hostName, setHostName] =
    useState("");

  const [roomCode, setRoomCode] =
    useState("");

  const [playerNames, setPlayerNames] =
    useState<Player[]>([]);

  const [playerName, setPlayerName] =
    useState("");

  const [joinCode, setJoinCode] =
    useState("");

  const [joinError, setJoinError] =
    useState("");

  const [isHost, setIsHost] =
    useState(false);

  const [gameState, setGameState] =
    useState<GameState | null>(null);

  const [drawnCard, setDrawnCard] =
    useState<Card | null>(null);

  const [guessResult, setGuessResult] =
    useState<GuessResult | null>(null);

  const [countdown, setCountdown] =
    useState(0);

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

  /*
   * =========================
   * SOCKET EVENTS
   * =========================
   */

  useEffect(() => {
    function handlePlayersUpdated(
      updatedPlayers: Player[]
    ) {
      setPlayerNames(
        updatedPlayers
      );
    }

    function handleGameStarted() {
      setDrawnCard(null);
      setGuessResult(null);
      setCountdown(0);

      setScreen(
        "game"
      );
    }

    function handleGameState(
      state: GameState
    ) {
      setGameState(
        state
      );

      setPlayerNames(
        state.players
      );

      if (
        state.resultShowing &&
        state.result
      ) {
        setGuessResult(
          state.result
        );
      }

      if (
        !state.resultShowing
      ) {
        setGuessResult(
          null
        );

        setCountdown(
          0
        );
      }

      /*
       * Alleen kaart verwijderen
       * wanneer er geen actieve gok
       * én geen resultaat is.
       */

      if (
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
      result: GuessResult
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

    function handleFourCardsComplete() {
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
      "four-cards-complete",
      handleFourCardsComplete
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
        "four-cards-complete",
        handleFourCardsComplete
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
   * COUNTDOWN
   * =========================
   */

  useEffect(() => {
    if (!guessResult) {
      setCountdown(0);

      return;
    }

    if (
      gameState?.resultEndsAt
    ) {
      function updateCountdown() {
        const endTime =
          gameState?.resultEndsAt;

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

    setCountdown(3);

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
    gameState?.resultEndsAt,
  ]);

  function resetToHome() {
    setRoomCode("");
    setPlayerNames([]);
    setIsHost(false);
    setGameState(null);
    setDrawnCard(null);
    setGuessResult(null);
    setCountdown(0);
    setScreen("home");
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
        },
      },

      (response: {
        success: boolean;
        roomCode?: string;
        players?: Player[];
        message?: string;
      }) => {
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
        roomCode:
          code,

        playerName:
          name,
      },

      (response: {
        success: boolean;
        roomCode?: string;
        players?: Player[];
        message?: string;
      }) => {
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

  /*
   * =========================
   * GOK
   * =========================
   */

  function makeGuess(
    guess: string
  ) {
    if (!gameState) {
      return;
    }

    if (
      gameState.resultShowing
    ) {
      return;
    }

    const currentPlayer =
      gameState.players[
        gameState.currentPlayerIndex
      ];

    if (!currentPlayer) {
      return;
    }

    if (
      currentPlayer.id !==
      socket.id
    ) {
      return;
    }

    if (!drawnCard) {
      return;
    }

    socket.emit(
      "guess-card",
      {
        guess,
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

  function getStepDescription() {
    if (!gameState) {
      return "";
    }

    const player =
      gameState.players[
        gameState.currentPlayerIndex
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

      if (card) {
        return `Hoger of lager dan ${card.name} ${card.symbol}?`;
      }

      return "Hoger of lager?";
    }

    if (
      gameState.currentStep ===
      2
    ) {
      const first =
        player?.cards?.[0];

      const second =
        player?.cards?.[1];

      if (
        first &&
        second
      ) {
        return `Binnen of buiten ${first.name} ${first.symbol} en ${second.name} ${second.symbol}?`;
      }

      return "Binnen of buiten?";
    }

    if (
      gameState.currentStep ===
      3
    ) {
      return "Raad het figuur, of ga voor Disco als je denkt dat je alle vier compleet maakt.";
    }

    return "";
  }

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
   * GAME
   * =========================
   */

  if (
    screen === "game"
  ) {
    const currentPlayer =
      gameState?.players[
        gameState.currentPlayerIndex
      ];

    const isMyTurn =
      currentPlayer?.id ===
      socket.id;

    const currentStep =
      gameState?.currentStep ??
      0;

    const myPlayer =
      gameState?.players.find(
        (player) =>
          player.id ===
          socket.id
      );

    const myCards =
      myPlayer?.cards ||
      [];

    const result =
      gameState?.result ||
      guessResult;

    const isMyResult =
      result?.playerId ===
      socket.id;

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
                socket.id
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
              {Math.min(
                currentStep + 1,
                4
              )}{" "}
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
            {gameState?.gameFinished ? (
              <>
                <strong>
                  🎉 De vier kaarten zijn compleet!
                </strong>

                <p>
                  Iedereen heeft vier kaarten.
                </p>
              </>
            ) : result ? (
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
                  {currentPlayer?.name ||
                    "Speler"}
                </strong>

                <p>
                  is aan de beurt...
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
                    key={card.id}
                    className={`playing-card ${card.color}`}
                  >
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
                (_, index) => (
                  <div
                    key={index}
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

          {/*
           * =========================
           * RESULTAAT
           * =========================
           */}

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
                  {result.playerName} koos{" "}
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
                      🪩 Neem{" "}
                      <strong>
                        1 slok
                      </strong>
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
                      🥃 Neem{" "}
                      <strong>
                        1 slok
                      </strong>
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

          {/*
           * =========================
           * DIRECT GOKKEN
           * =========================
           */}

          {!result &&
            !gameState?.gameFinished &&
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
            !gameState?.gameFinished &&
            !isMyTurn && (
              <div className="waiting-message game-waiting">
                <div className="hidden-card">
                  ?
                </div>

                <p>
                  <strong>
                    {
                      currentPlayer?.name
                    }
                  </strong>{" "}
                  maakt een keuze...
                </p>
              </div>
            )}

          {gameState?.gameFinished && (
            <div className="finished-message">
              <div>
                🃏
              </div>

              <h2>
                Alle vier kaarten zijn gespeeld!
              </h2>

              <p>
                Iedereen heeft nu vier kaarten.
                Hierna bouwen we de boom.
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
                  gameState
                    ?.players
                    .length
                }
              </span>
            </div>

            {gameState?.players.map(
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
                    gameState.currentPlayerIndex
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
                      gameState.currentPlayerIndex &&
                      !gameState.gameFinished && (
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
              {roomCode}
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
              maxLength={15}
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
                {players}
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