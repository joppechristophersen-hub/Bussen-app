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

type GameState = {
  players: Player[];
  currentPlayerIndex: number;
  currentStep: number;
  currentCard: Card | null;
  waitingForGuess: boolean;
  resultShowing: boolean;
  gameFinished: boolean;
};

type GuessResult = {
  playerId: string;
  playerName: string;
  step: number;
  card: Card;
  guess: string;
  correct: boolean;
  drinks: number;
  cards: Card[];
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

  const [isDrawing, setIsDrawing] =
    useState(false);

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
      setJoinCode(roomFromUrl);
      setScreen("join");
    }
  }, []);

  /*
   * =========================
   * SOCKET EVENTS
   * =========================
   */

  useEffect(() => {
    socket.on(
      "players-updated",
      (
        updatedPlayers: Player[]
      ) => {
        setPlayerNames(
          updatedPlayers
        );
      }
    );

    socket.on(
      "game-started",
      () => {
        setDrawnCard(null);
        setGuessResult(null);
        setScreen("game");
      }
    );

    socket.on(
      "game-state",
      (state: GameState) => {
        setGameState(state);
        setPlayerNames(
          state.players
        );
      }
    );

    socket.on(
      "card-drawn",
      ({
        card,
      }: {
        playerId: string;
        step: number;
        card: Card;
      }) => {
        setDrawnCard(card);
        setIsDrawing(false);
        setGuessResult(null);
      }
    );

    socket.on(
      "guess-result",
      (
        result: GuessResult
      ) => {
        setGuessResult(result);
        setDrawnCard(null);
        setIsDrawing(false);
      }
    );

    socket.on(
      "four-cards-complete",
      () => {
        setGuessResult(null);
        setDrawnCard(null);
      }
    );

    socket.on(
      "room-closed",
      () => {
        alert(
          "De host heeft de kamer gesloten."
        );

        resetToHome();
      }
    );

    socket.on(
      "removed-from-room",
      () => {
        alert(
          "Je bent uit de kamer verwijderd."
        );

        resetToHome();
      }
    );

    return () => {
      socket.off(
        "players-updated"
      );

      socket.off(
        "game-started"
      );

      socket.off(
        "game-state"
      );

      socket.off(
        "card-drawn"
      );

      socket.off(
        "guess-result"
      );

      socket.off(
        "four-cards-complete"
      );

      socket.off(
        "room-closed"
      );

      socket.off(
        "removed-from-room"
      );
    };
  }, []);

  function resetToHome() {
    setRoomCode("");
    setPlayerNames([]);
    setIsHost(false);
    setGameState(null);
    setDrawnCard(null);
    setGuessResult(null);
    setScreen("home");
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

    if (!socket.connected) {
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
        },
      },
      (response: {
        success: boolean;
        roomCode?: string;
        players?: Player[];
        message?: string;
      }) => {
        if (!response.success) {
          alert(
            response.message ||
              "Er ging iets mis."
          );

          return;
        }

        setRoomCode(
          response.roomCode || ""
        );

        setPlayerNames(
          response.players || []
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

    if (code.length !== 5) {
      setJoinError(
        "Een kamercode bestaat uit 5 tekens."
      );

      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      "join-room",
      {
        roomCode: code,
        playerName: name,
      },
      (response: {
        success: boolean;
        roomCode?: string;
        players?: Player[];
        message?: string;
      }) => {
        if (!response.success) {
          setJoinError(
            response.message ||
              "Er ging iets mis."
          );

          return;
        }

        setRoomCode(
          response.roomCode || code
        );

        setPlayerNames(
          response.players || []
        );

        setIsHost(false);

        setScreen("lobby");
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
    if (!isHost) return;

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
    if (!isHost) return;

    socket.emit("start-game");
  }

  /*
   * =========================
   * KAART TREKKEN
   * =========================
   */

  function drawCard() {
    if (!gameState) return;

    if (
      gameState.gameFinished
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

    if (
      gameState.waitingForGuess
    ) {
      return;
    }

    if (
      gameState.resultShowing
    ) {
      return;
    }

    setIsDrawing(true);
    setGuessResult(null);

    socket.emit("draw-card");
  }

  /*
   * =========================
   * GOK DOEN
   * =========================
   */

  function makeGuess(
    guess: string
  ) {
    if (!gameState) return;

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

  /*
   * =========================
   * QR URL
   * =========================
   */

  function getJoinUrl() {
    return `${window.location.origin}/?room=${roomCode}`;
  }

  /*
   * =========================
   * HULPFUNCTIES
   * =========================
   */

  const stepNames = [
    "Kleur",
    "Hoger of lager",
    "Binnen of buiten",
    "Figuur",
  ];

  function getStepDescription() {
    if (!gameState) {
      return "";
    }

    if (
      gameState.currentStep === 0
    ) {
      return "Raad of de kaart rood of zwart is.";
    }

    if (
      gameState.currentStep === 1
    ) {
      const player =
        gameState.players[
          gameState.currentPlayerIndex
        ];

      const card =
        player?.cards?.[0];

      if (card) {
        return `Is de nieuwe kaart hoger of lager dan ${card.name} ${card.symbol}?`;
      }

      return "Raad of de kaart hoger of lager is dan je eerste kaart.";
    }

    if (
      gameState.currentStep === 2
    ) {
      const player =
        gameState.players[
          gameState.currentPlayerIndex
        ];

      const first =
        player?.cards?.[0];

      const second =
        player?.cards?.[1];

      if (first && second) {
        return `Ligt de nieuwe kaart binnen of buiten ${first.name} ${first.symbol} en ${second.name} ${second.symbol}?`;
      }

      return "Raad of de kaart binnen of buiten je eerste twee kaarten ligt.";
    }

    if (
      gameState.currentStep === 3
    ) {
      return "Raad welk figuur de kaart heeft.";
    }

    return "";
  }

  function renderSuitButtons() {
    return (
      <div className="guess-grid">
        <button
          onClick={() =>
            makeGuess("harten")
          }
        >
          ♥ Harten
        </button>

        <button
          onClick={() =>
            makeGuess("ruiten")
          }
        >
          ♦ Ruiten
        </button>

        <button
          onClick={() =>
            makeGuess("klaveren")
          }
        >
          ♣ Klaveren
        </button>

        <button
          onClick={() =>
            makeGuess("schoppen")
          }
        >
          ♠ Schoppen
        </button>
      </div>
    );
  }

  /*
   * =========================
   * GAME SCREEN
   * =========================
   */

  if (screen === "game") {
    const currentPlayer =
      gameState?.players[
        gameState.currentPlayerIndex
      ];

    const isMyTurn =
      currentPlayer?.id ===
      socket.id;

    const currentStep =
      gameState?.currentStep ?? 0;

    const myPlayer =
      gameState?.players.find(
        (player) =>
          player.id === socket.id
      );

    const myCards =
      myPlayer?.cards || [];

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
                    step === currentStep
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
                    {stepNames[step]}
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
                  🎉 De vier kaarten
                  zijn compleet!
                </strong>

                <p>
                  Iedereen heeft alle
                  vier de kaarten
                  gespeeld.
                </p>
              </>
            ) : isMyTurn ? (
              <>
                <strong>
                  Jij bent aan de beurt!
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
                    className={`playing-card ${card.color}`}
                    key={card.id}
                  >
                    <span className="card-value">
                      {card.name}
                    </span>

                    <span className="card-symbol">
                      {card.symbol}
                    </span>
                  </div>
                )
              )}

              {Array.from({
                length:
                  Math.max(
                    0,
                    4 - myCards.length
                  ),
              }).map(
                (_, index) => (
                  <div
                    className="empty-card"
                    key={index}
                  >
                    ?
                  </div>
                )
              )}
            </div>
          </div>

          {guessResult && (
            <div
              className={
                guessResult.correct
                  ? "result-area correct"
                  : "result-area wrong"
              }
            >
              <div className="result-icon">
                {guessResult.correct
                  ? "✓"
                  : "✕"}
              </div>

              <div className="result-content">
                <h2>
                  {guessResult.playerId ===
                  socket.id
                    ? guessResult.correct
                      ? "Goed!"
                      : "Fout!"
                    : `${
                        guessResult.playerName
                      } had het ${
                        guessResult.correct
                          ? "goed"
                          : "fout"
                      }!`}
                </h2>

                <div className="revealed-card">
                  <span>
                    {
                      guessResult
                        .card.name
                    }
                  </span>

                  <strong
                    className={
                      guessResult
                        .card
                        .color
                    }
                  >
                    {
                      guessResult
                        .card
                        .symbol
                    }
                  </strong>
                </div>

                <p>
                  {guessResult.playerName}{" "}
                  koos{" "}
                  <strong>
                    {guessResult.guess}
                  </strong>
                  .
                </p>

                <p>
                  De kaart was{" "}
                  <strong>
                    {
                      guessResult.card
                        .name
                    }{" "}
                    {
                      guessResult.card
                        .symbol
                    }
                  </strong>
                  .
                </p>

                {!guessResult.correct && (
                  <div className="drink-message">
                    🥃 Neem{" "}
                    <strong>
                      {guessResult.drinks} slok
                    </strong>
                    !
                  </div>
                )}

                {guessResult.correct && (
                  <div className="drink-message success">
                    Geen slok!
                  </div>
                )}

                <div className="next-countdown">
                  Volgende speler over 3
                  seconden...
                </div>
              </div>
            </div>
          )}

          {!guessResult &&
            !gameState?.gameFinished &&
            isMyTurn && (
              <>
                {!drawnCard ? (
                  <button
                    className="start-button big-button"
                    onClick={drawCard}
                    disabled={
                      isDrawing
                    }
                  >
                    {isDrawing
                      ? "Kaart pakken..."
                      : "Kaart spelen 🃏"}
                  </button>
                ) : (
                  <div className="guess-area">
                    <div className="hidden-card large">
                      ?
                    </div>

                    <h2>
                      Jouw gok
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
                )}
              </>
            )}

          {!guessResult &&
            !gameState?.gameFinished &&
            !isMyTurn && (
              <div className="waiting-message game-waiting">
                <div className="hidden-card">
                  ?
                </div>

                <p>
                  Wacht tot{" "}
                  <strong>
                    {
                      currentPlayer?.name
                    }
                  </strong>{" "}
                  zijn kaart speelt.
                </p>
              </div>
            )}

          {gameState?.gameFinished && (
            <div className="finished-message">
              <div>
                🃏
              </div>

              <h2>
                Alle vier kaarten
                zijn gespeeld!
              </h2>

              <p>
                De volgende stap wordt
                de boom.
              </p>
            </div>
          )}

          <div className="game-players">
            <div className="section-title">
              <h2>
                Spelers
              </h2>

              <span>
                {gameState?.players.length}
              </span>
            </div>

            {gameState?.players.map(
              (
                player,
                index
              ) => (
                <div
                  className={
                    index ===
                    gameState.currentPlayerIndex
                      ? "game-player active"
                      : "game-player"
                  }
                  key={player.id}
                >
                  <div className="player-avatar">
                    {player.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="player-info">
                    <span>
                      {player.name}
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
                      ?.length || 0}{" "}
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

  if (screen === "lobby") {
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
                value={getJoinUrl()}
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
                  className="player"
                  key={player.id}
                >
                  <div className="player-avatar">
                    {player.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <span>
                    {player.name}
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
                playerNames.length < 2
              }
              onClick={startGame}
            >
              {playerNames.length < 2
                ? "Wacht op spelers..."
                : "Spel starten 🚌"}
            </button>
          ) : (
            <div className="waiting-message">
              <p>
                Wachten tot de host
                het spel start...
              </p>
            </div>
          )}

          {isHost && (
            <button
              className="back-button lobby-back"
              onClick={() =>
                setScreen(
                  "settings"
                )
              }
            >
              ← Instellingen aanpassen
            </button>
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

  if (screen === "join") {
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
              value={playerName}
              onChange={(event) =>
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
              placeholder="Bijvoorbeeld X7K4P"
              value={joinCode}
              onChange={(event) =>
                setJoinCode(
                  event.target.value
                    .toUpperCase()
                    .replace(
                      /[^A-Z0-9]/g,
                      ""
                    )
                    .slice(0, 5)
                )
              }
              maxLength={5}
            />
          </div>

          {joinError && (
            <p className="join-error">
              {joinError}
            </p>
          )}

          <button
            className="start-button"
            onClick={joinRoom}
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

  if (screen === "settings") {
    return (
      <main className="app">
        <section className="card settings-card">
          <button
            className="back-button"
            onClick={() =>
              setScreen("home")
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
              value={hostName}
              onChange={(event) =>
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
                {players}
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
              Aantal rijen
            </label>

            <div className="options">
              {[3, 4, 5].map(
                (number) => (
                  <button
                    key={number}
                    className={
                      rows === number
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setRows(number)
                    }
                  >
                    {number}
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
                (number) => (
                  <button
                    key={number}
                    className={
                      decks === number
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setDecks(number)
                    }
                  >
                    {number} 🃏
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
            onClick={startLobby}
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