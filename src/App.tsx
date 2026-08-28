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

type Player = {
  id: string;
  name: string;
  isHost: boolean;
  cards?: Card[];
};

type Card = {
  id: string;
  suit: string;
  value: number;
  name: string;
  color: "rood" | "zwart";
};

type GameState = {
  players: Player[];
  currentPlayerIndex: number;
  currentStep: number;
  currentCard: Card | null;
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

  const [players, setPlayers] = useState(4);
  const [rows, setRows] = useState(4);
  const [decks, setDecks] = useState(1);
  const [checkpoints, setCheckpoints] =
    useState(false);

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
    useState<{
      correct: boolean;
      drinks: number;
    } | null>(null);

  const [isDrawing, setIsDrawing] =
    useState(false);

  /*
   * QR-code:
   * Als iemand de QR-code scant,
   * wordt automatisch het online adres
   * van de app gebruikt.
   */
  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const roomFromUrl =
      params.get("room")?.toUpperCase();

    if (
      roomFromUrl &&
      roomFromUrl.length === 5
    ) {
      setJoinCode(roomFromUrl);
      setScreen("join");
    }
  }, []);

  /*
   * Socket events
   */
  useEffect(() => {
    socket.on(
      "players-updated",
      (updatedPlayers: Player[]) => {
        setPlayerNames(
          updatedPlayers
        );
      }
    );

    socket.on(
      "game-started",
      () => {
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
      ({
        correct,
      }: {
        playerId: string;
        step: number;
        card: Card;
        guess: string;
        correct: boolean;
        cards: Card[];
      }) => {
        setGuessResult({
          correct,
          drinks: correct ? 0 : 1,
        });

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
   * Kamer maken
   */
  function startLobby() {
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      "create-room",
      {
        playerName: "Joppe",
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
   * Kamer joinen
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
   * Speler verwijderen
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
   * Spel starten
   */
  function startGame() {
    if (!isHost) return;

    socket.emit("start-game");
  }

  /*
   * Kaart trekken
   */
  function drawCard() {
    if (!gameState) return;

    const currentPlayer =
      gameState.players[
        gameState.currentPlayerIndex
      ];

    if (
      !currentPlayer ||
      currentPlayer.id !==
        socket.id
    ) {
      return;
    }

    setIsDrawing(true);
    setGuessResult(null);

    socket.emit("draw-card");
  }

  /*
   * Gok doen
   */
  function makeGuess(
    guess: string
  ) {
    if (!gameState) return;

    const currentPlayer =
      gameState.players[
        gameState.currentPlayerIndex
      ];

    if (
      !currentPlayer ||
      currentPlayer.id !==
        socket.id
    ) {
      return;
    }

    if (!drawnCard) return;

    socket.emit(
      "guess-card",
      {
        guess,
      }
    );
  }

  /*
   * URL voor QR-code.
   *
   * BELANGRIJK:
   * Dit is nu het online adres en
   * niet meer 192.168.1.63.
   */
  function getJoinUrl() {
    return `${window.location.origin}/?room=${roomCode}`;
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

    const stepNames = [
      "Kleur",
      "Hoger of lager",
      "Binnen of buiten",
      "Figuur",
    ];

    return (
      <main className="app">
        <section className="card game-card">
          <div className="logo small-logo">
            🚌
          </div>

          <h1>
            Tijd om te spelen!
          </h1>

          <p className="subtitle">
            De busrit gaat beginnen...
          </p>

          <div className="game-progress">
            <span>
              Stap {currentStep + 1} van 4
            </span>

            <strong>
              {stepNames[
                currentStep
              ]}
            </strong>
          </div>

          <div className="turn-message">
            {isMyTurn ? (
              <>
                <strong>
                  Jij bent aan de beurt!
                </strong>

                <p>
                  Maak je eerste gok.
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

          {!drawnCard &&
            !guessResult &&
            isMyTurn && (
              <button
                className="start-button"
                onClick={drawCard}
                disabled={isDrawing}
              >
                {isDrawing
                  ? "Kaart pakken..."
                  : "Kaart spelen 🃏"}
              </button>
            )}

          {!drawnCard &&
            !guessResult &&
            !isMyTurn && (
              <div className="waiting-message">
                <p>
                  Wacht tot{" "}
                  <strong>
                    {currentPlayer?.name}
                  </strong>{" "}
                  zijn kaart speelt.
                </p>
              </div>
            )}

          {drawnCard && isMyTurn && (
            <div className="guess-area">
              <div className="hidden-card">
                <span>?</span>
              </div>

              <h2>
                Welke kleur heeft
                deze kaart?
              </h2>

              <div className="guess-buttons">
                <button
                  className="guess-red"
                  onClick={() =>
                    makeGuess("rood")
                  }
                >
                  ♥ Rood
                </button>

                <button
                  className="guess-black"
                  onClick={() =>
                    makeGuess("zwart")
                  }
                >
                  ♠ Zwart
                </button>
              </div>
            </div>
          )}

          {drawnCard &&
            !isMyTurn && (
              <div className="waiting-message">
                <div className="hidden-card">
                  <span>?</span>
                </div>

                <p>
                  {currentPlayer?.name} maakt
                  een gok...
                </p>
              </div>
            )}

          {guessResult && (
            <div className="result-area">
              <div
                className={
                  guessResult.correct
                    ? "result-correct"
                    : "result-wrong"
                }
              >
                {guessResult.correct
                  ? "✅ Goed!"
                  : "❌ Fout!"}
              </div>

              {!guessResult.correct && (
                <p className="drink-message">
                  Neem{" "}
                  <strong>
                    {guessResult.drinks} slok
                  </strong>
                  !
                </p>
              )}

              {guessResult.correct && (
                <p>
                  Goed geraden. Geen
                  slok!
                </p>
              )}

              <p>
                De volgende speler
                is aan de beurt...
              </p>
            </div>
          )}

          <div className="game-players">
            <h2>Spelers</h2>

            {gameState?.players.map(
              (player, index) => (
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
                    {player.name.charAt(
                      0
                    )}
                  </div>

                  <span>
                    {player.name}
                  </span>

                  {index ===
                    gameState.currentPlayerIndex && (
                    <span className="turn-label">
                      AAN DE BEURT
                    </span>
                  )}

                  <span className="card-count">
                    {player.cards?.length ||
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
                size={170}
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
                    {player.name.charAt(
                      0
                    )}
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
                setScreen("settings")
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
                  setCheckpoints(false)
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
                  setCheckpoints(true)
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