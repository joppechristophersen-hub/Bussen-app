const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

const io = new Server(PORT, {
  cors: {
    origin: "*",
  },
});

const rooms = {};

const SUITS = [
  {
    name: "harten",
    symbol: "♥",
    color: "rood",
  },
  {
    name: "ruiten",
    symbol: "♦",
    color: "rood",
  },
  {
    name: "klaveren",
    symbol: "♣",
    color: "zwart",
  },
  {
    name: "schoppen",
    symbol: "♠",
    color: "zwart",
  },
];

const VALUES = [
  { value: 2, name: "2" },
  { value: 3, name: "3" },
  { value: 4, name: "4" },
  { value: 5, name: "5" },
  { value: 6, name: "6" },
  { value: 7, name: "7" },
  { value: 8, name: "8" },
  { value: 9, name: "9" },
  { value: 10, name: "10" },
  { value: 11, name: "Boer" },
  { value: 12, name: "Vrouw" },
  { value: 13, name: "Heer" },
  { value: 14, name: "Aas" },
];

function createDeck(numberOfDecks = 1) {
  const deck = [];

  for (
    let deckNumber = 0;
    deckNumber < numberOfDecks;
    deckNumber++
  ) {
    for (const suit of SUITS) {
      for (const cardValue of VALUES) {
        deck.push({
          id:
            `${deckNumber}-${suit.name}-${cardValue.value}-` +
            Math.random()
              .toString(36)
              .substring(2, 9),

          suit: suit.name,
          symbol: suit.symbol,
          value: cardValue.value,
          name: cardValue.name,
          color: suit.color,
        });
      }
    }
  }

  return shuffle(deck);
}

function shuffle(array) {
  const shuffled = [...array];

  for (
    let i = shuffled.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i],
    ];
  }

  return shuffled;
}

function createRoomCode() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 5; i++) {
    code +=
      characters[
        Math.floor(
          Math.random() * characters.length
        )
      ];
  }

  return code;
}

function getUniqueRoomCode() {
  let code = createRoomCode();

  while (rooms[code]) {
    code = createRoomCode();
  }

  return code;
}

function getCurrentPlayer(room) {
  return room.players[
    room.game.currentPlayerIndex
  ];
}

/*
 * Iedere speler krijgt alleen zijn eigen kaarten.
 * Van andere spelers zien we alleen het aantal kaarten.
 */
function createGameState(room, viewerId) {
  return {
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHost: player.isHost,

      cards:
        player.id === viewerId
          ? player.cards || []
          : undefined,

      cardCount:
        player.cards?.length || 0,
    })),

    currentPlayerIndex:
      room.game.currentPlayerIndex,

    currentStep:
      room.game.currentStep,

    currentCard:
      room.game.currentCard,

    gameStarted:
      room.game.started,

    waitingForGuess:
      room.game.waitingForGuess,

    showingResult:
      room.game.showingResult,
  };
}

function sendGameState(roomCode) {
  const room = rooms[roomCode];

  if (!room) return;

  for (const player of room.players) {
    io.to(player.id).emit(
      "game-state",
      createGameState(
        room,
        player.id
      )
    );
  }
}

/*
 * Controleert de gok van de speler.
 *
 * Stap 0 = kleur
 * Stap 1 = hoger/lager
 * Stap 2 = binnen/buiten
 * Stap 3 = figuur
 */
function checkGuess(
  room,
  player,
  guess,
  drawnCard
) {
  const step =
    room.game.currentStep;

  /*
   * STAP 1 - KLEUR
   */
  if (step === 0) {
    return (
      guess === drawnCard.color
    );
  }

  /*
   * STAP 2 - HOGER / LAGER
   */
  if (step === 1) {
    const firstCard =
      player.cards[0];

    if (!firstCard) {
      return false;
    }

    if (guess === "hoger") {
      return (
        drawnCard.value >
        firstCard.value
      );
    }

    if (guess === "lager") {
      return (
        drawnCard.value <
        firstCard.value
      );
    }

    return false;
  }

  /*
   * STAP 3 - BINNEN / BUITEN
   */
  if (step === 2) {
    const firstCard =
      player.cards[0];

    const secondCard =
      player.cards[1];

    if (
      !firstCard ||
      !secondCard
    ) {
      return false;
    }

    const lowest = Math.min(
      firstCard.value,
      secondCard.value
    );

    const highest = Math.max(
      firstCard.value,
      secondCard.value
    );

    /*
     * Binnen:
     * strikt tussen de twee kaarten.
     */
    if (guess === "binnen") {
      return (
        drawnCard.value >
          lowest &&
        drawnCard.value <
          highest
      );
    }

    /*
     * Buiten:
     * lager dan beide of hoger dan beide.
     */
    if (guess === "buiten") {
      return (
        drawnCard.value <
          lowest ||
        drawnCard.value >
          highest
      );
    }

    return false;
  }

  /*
   * STAP 4 - FIGUUR
   */
  if (step === 3) {
    return (
      guess === drawnCard.suit
    );
  }

  return false;
}

io.on("connection", (socket) => {
  console.log(
    "Nieuwe speler verbonden:",
    socket.id
  );

  /*
   * =========================
   * KAMER MAKEN
   * =========================
   */

  socket.on(
    "create-room",
    (
      {
        playerName,
        settings,
      },
      callback
    ) => {
      const roomCode =
        getUniqueRoomCode();

      const safeSettings = {
        players:
          Number(
            settings?.players
          ) || 4,

        rows:
          Number(
            settings?.rows
          ) || 4,

        decks:
          Number(
            settings?.decks
          ) || 1,

        checkpoints:
          Boolean(
            settings?.checkpoints
          ),
      };

      rooms[roomCode] = {
        hostId: socket.id,

        settings:
          safeSettings,

        players: [
          {
            id: socket.id,
            name:
              playerName ||
              "Host",
            isHost: true,
            cards: [],
          },
        ],

        deck: [],

        game: {
          started: false,

          /*
           * Dit is de speler binnen
           * de huidige stap.
           */
          currentPlayerIndex: 0,

          /*
           * 0 = kleur
           * 1 = hoger/lager
           * 2 = binnen/buiten
           * 3 = figuur
           */
          currentStep: 0,

          currentCard: null,

          waitingForGuess: false,

          /*
           * Tijdens deze 3 seconden
           * kan niemand de volgende
           * kaart trekken.
           */
          showingResult: false,
        },
      };

      socket.join(roomCode);

      socket.roomCode =
        roomCode;

      callback({
        success: true,
        roomCode,
        players:
          rooms[roomCode].players,
      });

      console.log(
        `Kamer ${roomCode} aangemaakt door ${playerName}`
      );
    }
  );

  /*
   * =========================
   * KAMER JOINEN
   * =========================
   */

  socket.on(
    "join-room",
    (
      {
        roomCode,
        playerName,
      },
      callback
    ) => {
      const normalizedCode =
        String(roomCode || "")
          .trim()
          .toUpperCase();

      const room =
        rooms[normalizedCode];

      if (!room) {
        callback({
          success: false,
          message:
            "Kamer bestaat niet.",
        });

        return;
      }

      if (room.game.started) {
        callback({
          success: false,
          message:
            "Het spel is al begonnen.",
        });

        return;
      }

      if (
        room.players.length >=
        room.settings.players
      ) {
        callback({
          success: false,
          message:
            "Deze kamer zit vol.",
        });

        return;
      }

      const player = {
        id: socket.id,

        name:
          playerName ||
          "Speler",

        isHost: false,

        cards: [],
      };

      room.players.push(player);

      socket.join(
        normalizedCode
      );

      socket.roomCode =
        normalizedCode;

      callback({
        success: true,

        roomCode:
          normalizedCode,

        players:
          room.players,
      });

      io.to(
        normalizedCode
      ).emit(
        "players-updated",
        room.players
      );

      console.log(
        `${player.name} is bij kamer ${normalizedCode} gekomen`
      );
    }
  );

  /*
   * =========================
   * SPELER VERWIJDEREN
   * =========================
   */

  socket.on(
    "remove-player",
    (playerId) => {
      const roomCode =
        socket.roomCode;

      const room =
        rooms[roomCode];

      if (!room) return;

      if (
        room.hostId !==
        socket.id
      ) {
        return;
      }

      const player =
        room.players.find(
          (p) =>
            p.id === playerId
        );

      if (
        !player ||
        player.isHost
      ) {
        return;
      }

      room.players =
        room.players.filter(
          (p) =>
            p.id !== playerId
        );

      io.to(playerId).emit(
        "removed-from-room"
      );

      io.to(roomCode).emit(
        "players-updated",
        room.players
      );
    }
  );

  /*
   * =========================
   * SPEL STARTEN
   * =========================
   */

  socket.on(
    "start-game",
    () => {
      const roomCode =
        socket.roomCode;

      const room =
        rooms[roomCode];

      if (!room) return;

      if (
        room.hostId !==
        socket.id
      ) {
        return;
      }

      if (
        room.players.length < 2
      ) {
        return;
      }

      room.deck =
        createDeck(
          room.settings.decks
        );

      room.players.forEach(
        (player) => {
          player.cards = [];
        }
      );

      room.game = {
        started: true,

        /*
         * We beginnen bij speler 1.
         */
        currentPlayerIndex: 0,

        /*
         * Iedereen begint bij
         * stap 1 = kleur.
         */
        currentStep: 0,

        currentCard: null,

        waitingForGuess: false,

        showingResult: false,
      };

      io.to(roomCode).emit(
        "game-started"
      );

      sendGameState(
        roomCode
      );

      console.log(
        `Spel gestart in kamer ${roomCode}`
      );
    }
  );

  /*
   * =========================
   * KAART TREKKEN
   * =========================
   */

  socket.on(
    "draw-card",
    () => {
      const roomCode =
        socket.roomCode;

      const room =
        rooms[roomCode];

      if (!room) return;

      if (
        !room.game.started
      ) {
        return;
      }

      if (
        room.game.waitingForGuess
      ) {
        return;
      }

      if (
        room.game.showingResult
      ) {
        return;
      }

      const currentPlayer =
        getCurrentPlayer(room);

      if (!currentPlayer) {
        return;
      }

      /*
       * Alleen de speler die nu
       * aan de beurt is mag trekken.
       */
      if (
        currentPlayer.id !==
        socket.id
      ) {
        return;
      }

      /*
       * Wanneer de stock leeg is,
       * maken we een nieuwe.
       */
      if (
        room.deck.length === 0
      ) {
        room.deck =
          createDeck(
            room.settings.decks
          );
      }

      const card =
        room.deck.pop();

      if (!card) return;

      room.game.currentCard =
        card;

      room.game.waitingForGuess =
        true;

      /*
       * Alleen de speler die aan
       * de beurt is krijgt de kaart.
       */
      io.to(socket.id).emit(
        "card-drawn",
        {
          playerId:
            socket.id,

          step:
            room.game.currentStep,

          card,
        }
      );

      /*
       * Andere spelers weten alleen
       * dat er een gok gemaakt wordt.
       */
      io.to(roomCode).emit(
        "player-drawing",
        {
          playerId:
            socket.id,

          step:
            room.game.currentStep,
        }
      );

      console.log(
        `${currentPlayer.name} heeft een kaart getrokken`
      );
    }
  );

  /*
   * =========================
   * GOK DOEN
   * =========================
   */

  socket.on(
    "guess-card",
    ({ guess }) => {
      const roomCode =
        socket.roomCode;

      const room =
        rooms[roomCode];

      if (!room) return;

      if (
        !room.game.started
      ) {
        return;
      }

      if (
        !room.game.waitingForGuess
      ) {
        return;
      }

      if (
        room.game.showingResult
      ) {
        return;
      }

      const currentPlayer =
        getCurrentPlayer(room);

      if (!currentPlayer) {
        return;
      }

      /*
       * Alleen de speler aan de
       * beurt mag gokken.
       */
      if (
        currentPlayer.id !==
        socket.id
      ) {
        return;
      }

      const card =
        room.game.currentCard;

      if (!card) return;

      const normalizedGuess =
        String(guess || "")
          .trim()
          .toLowerCase();

      const correct =
        checkGuess(
          room,
          currentPlayer,
          normalizedGuess,
          card
        );

      /*
       * Kaart toevoegen aan
       * de hand van de speler.
       */
      currentPlayer.cards.push(
        card
      );

      const finishedStep =
        room.game.currentStep;

      /*
       * Kaart en gok opruimen.
       */
      room.game.currentCard =
        null;

      room.game.waitingForGuess =
        false;

      /*
       * Resultaatmodus aan.
       */
      room.game.showingResult =
        true;

      /*
       * Resultaat naar iedereen.
       */
      io.to(roomCode).emit(
        "guess-result",
        {
          playerId:
            currentPlayer.id,

          playerName:
            currentPlayer.name,

          step:
            finishedStep,

          card,

          guess:
            normalizedGuess,

          correct,

          cards:
            currentPlayer.cards,

          drinks:
            correct ? 0 : 1,
        }
      );

      /*
       * Meteen de nieuwe kaarten
       * naar de betreffende speler sturen.
       */
      sendGameState(
        roomCode
      );

      console.log(
        `${currentPlayer.name}: stap ${finishedStep + 1}, gok ${normalizedGuess}, ${
          correct
            ? "goed"
            : "fout"
        }`
      );

      /*
       * =========================
       * 3 SECONDEN WACHTEN
       * =========================
       *
       * Niemand gaat verder voordat
       * deze 3 seconden voorbij zijn.
       */
      setTimeout(() => {
        const activeRoom =
          rooms[roomCode];

        if (!activeRoom) return;

        /*
         * Controleer opnieuw of het
         * spel nog actief is.
         */
        if (
          !activeRoom.game.started
        ) {
          return;
        }

        /*
         * Resultaatvenster sluiten.
         */
        activeRoom.game.showingResult =
          false;

        /*
         * =========================
         * VOLGENDE SPELER
         * =========================
         */

        activeRoom.game.currentPlayerIndex += 1;

        /*
         * Als niet iedereen deze stap
         * heeft gedaan, blijft dezelfde
         * stap actief.
         */
        if (
          activeRoom.game.currentPlayerIndex <
          activeRoom.players.length
        ) {
          sendGameState(
            roomCode
          );

          io.to(roomCode).emit(
            "turn-advanced"
          );

          return;
        }

        /*
         * =========================
         * IEDEREEN HEEFT DEZE STAP GEDAAN
         * =========================
         */

        activeRoom.game.currentPlayerIndex =
          0;

        activeRoom.game.currentStep +=
          1;

        /*
         * Alle 4 stappen klaar.
         *
         * Dan hebben alle spelers
         * hun vier kaarten.
         */
        if (
          activeRoom.game.currentStep >=
          4
        ) {
          activeRoom.game.currentStep =
            0;

          io.to(roomCode).emit(
            "four-cards-complete"
          );

          /*
           * Voorlopig begint daarna
           * weer een nieuwe ronde.
           */
          sendGameState(
            roomCode
          );

          io.to(roomCode).emit(
            "turn-advanced"
          );

          console.log(
            `Iedere speler heeft 4 kaarten in kamer ${roomCode}`
          );

          return;
        }

        /*
         * Nieuwe stap voor iedereen.
         */
        sendGameState(
          roomCode
        );

        io.to(roomCode).emit(
          "step-advanced",
          {
            step:
              activeRoom.game.currentStep,
          }
        );

        console.log(
          `Nieuwe stap ${activeRoom.game.currentStep + 1} in kamer ${roomCode}`
        );
      }, 3000);
    }
  );

  /*
   * =========================
   * DISCONNECT
   * =========================
   */

  socket.on(
    "disconnect",
    () => {
      console.log(
        "Speler disconnected:",
        socket.id
      );

      const roomCode =
        socket.roomCode;

      if (
        !roomCode ||
        !rooms[roomCode]
      ) {
        return;
      }

      const room =
        rooms[roomCode];

      /*
       * Host weg = kamer sluiten.
       */
      if (
        room.hostId ===
        socket.id
      ) {
        io.to(roomCode).emit(
          "room-closed"
        );

        delete rooms[roomCode];

        console.log(
          `Kamer ${roomCode} gesloten`
        );

        return;
      }

      /*
       * Gewone speler verwijderen.
       */
      room.players =
        room.players.filter(
          (player) =>
            player.id !==
            socket.id
        );

      if (
        room.players.length === 0
      ) {
        delete rooms[roomCode];
        return;
      }

      /*
       * Index veilig houden.
       */
      if (
        room.game.currentPlayerIndex >=
        room.players.length
      ) {
        room.game.currentPlayerIndex =
          0;
      }

      io.to(roomCode).emit(
        "players-updated",
        room.players
      );

      if (
        room.game.started
      ) {
        sendGameState(
          roomCode
        );
      }
    }
  );
});

console.log(
  `Bussen multiplayer server draait op poort ${PORT}`
);