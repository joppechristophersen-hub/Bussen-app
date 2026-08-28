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

function createRoomCode() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 5; i++) {
    code +=
      characters[
        Math.floor(
          Math.random() *
            characters.length
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

function publicGameState(room) {
  return {
    players: room.players.map(
      (player) => ({
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        cards: player.cards || [],
      })
    ),

    currentPlayerIndex:
      room.game.currentPlayerIndex,

    currentStep:
      room.game.currentStep,

    currentCard:
      room.game.currentCard,

    revealedCards:
      room.game.revealedCards,

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

  io.to(roomCode).emit(
    "game-state",
    publicGameState(room)
  );
}

function checkGuess(
  room,
  guess,
  drawnCard
) {
  const step =
    room.game.currentStep;

  /*
   * STAP 1
   * Kleur
   */
  if (step === 0) {
    return (
      guess === drawnCard.color
    );
  }

  /*
   * STAP 2
   * Hoger / lager
   */
  if (step === 1) {
    const previousCard =
      room.game.revealedCards[0];

    if (!previousCard) {
      return false;
    }

    if (guess === "hoger") {
      return (
        drawnCard.value >
        previousCard.value
      );
    }

    if (guess === "lager") {
      return (
        drawnCard.value <
        previousCard.value
      );
    }

    return false;
  }

  /*
   * STAP 3
   * Binnen / buiten
   *
   * Gelijk is geen normale keuze.
   * Als de kaart gelijk is aan één
   * van de eerdere kaarten, is de
   * gok dus fout.
   */
  if (step === 2) {
    const firstCard =
      room.game.revealedCards[0];

    const secondCard =
      room.game.revealedCards[1];

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

    if (guess === "binnen") {
      return (
        drawnCard.value > lowest &&
        drawnCard.value < highest
      );
    }

    if (guess === "buiten") {
      return (
        drawnCard.value < lowest ||
        drawnCard.value > highest
      );
    }

    return false;
  }

  /*
   * STAP 4
   * Figuur
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
      const name =
        String(playerName || "")
          .trim();

      if (!name) {
        callback({
          success: false,
          message:
            "Vul eerst je naam in.",
        });

        return;
      }

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

        settings: safeSettings,

        players: [
          {
            id: socket.id,
            name,
            isHost: true,
            cards: [],
          },
        ],

        deck: [],

        game: {
          started: false,

          /*
           * currentPlayerIndex:
           * welke speler is aan de beurt
           */
          currentPlayerIndex: 0,

          /*
           * currentStep:
           *
           * 0 = kleur
           * 1 = hoger/lager
           * 2 = binnen/buiten
           * 3 = figuur
           */
          currentStep: 0,

          currentCard: null,

          /*
           * Kaarten die binnen de
           * huidige stap al zijn
           * geopend.
           */
          revealedCards: [],

          waitingForGuess: false,

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
          rooms[roomCode]
            .players,
      });

      console.log(
        `Kamer ${roomCode} aangemaakt door ${name}`
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

      const name =
        String(playerName || "")
          .trim();

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

      if (!name) {
        callback({
          success: false,
          message:
            "Vul eerst je naam in.",
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
        name,
        isHost: false,
        cards: [],
      };

      room.players.push(player);

      socket.join(normalizedCode);

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
        `${name} is bij kamer ${normalizedCode} gekomen`
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
          (p) => p.id === playerId
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
         * We beginnen bij speler 1
         * en stap 1.
         */
        currentPlayerIndex: 0,

        currentStep: 0,

        currentCard: null,

        revealedCards: [],

        waitingForGuess: false,

        showingResult: false,
      };

      io.to(roomCode).emit(
        "game-started"
      );

      sendGameState(roomCode);

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

      if (!room.game.started) {
        return;
      }

      const currentPlayer =
        getCurrentPlayer(room);

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
        room.game.waitingForGuess
      ) {
        return;
      }

      if (
        room.game.showingResult
      ) {
        return;
      }

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

      sendGameState(roomCode);

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

      if (!room.game.started) {
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

      /*
       * Kaart bewaren zodat de
       * volgende stap ermee kan
       * rekenen.
       *
       * Bij stap 0:
       * eerste kaart.
       *
       * Bij stap 1:
       * tweede kaart.
       *
       * Bij stap 2:
       * derde kaart.
       *
       * Bij stap 3:
       * vierde kaart.
       */
      room.game.revealedCards.push(
        card
      );

      const finishedPlayer =
        currentPlayer;

      const finishedStep =
        room.game.currentStep;

      room.game.currentCard =
        null;

      room.game.waitingForGuess =
        false;

      room.game.showingResult =
        true;

      /*
       * Iedereen krijgt het
       * resultaat te zien.
       */
      io.to(roomCode).emit(
        "guess-result",
        {
          playerId:
            finishedPlayer.id,

          step:
            finishedStep,

          card,

          guess:
            normalizedGuess,

          correct,

          cards:
            finishedPlayer.cards,
        }
      );

      sendGameState(roomCode);

      console.log(
        `${finishedPlayer.name}: stap ${finishedStep + 1}, ${correct ? "goed" : "fout"}`
      );

      /*
       * RESULTAAT 3 SECONDEN TONEN
       */
      setTimeout(() => {
        const currentRoom =
          rooms[roomCode];

        if (!currentRoom) {
          return;
        }

        /*
         * Alleen doorgaan als dit
         * nog steeds hetzelfde
         * resultaat is.
         */
        if (
          !currentRoom.game
            .showingResult
        ) {
          return;
        }

        currentRoom.game
          .showingResult = false;

        /*
         * =====================
         * VOLGENDE SPELER
         * =====================
         *
         * Eerst alle spelers
         * dezelfde stap laten doen.
         */

        if (
          currentRoom.game
            .currentPlayerIndex <
          currentRoom.players.length - 1
        ) {
          /*
           * Er zijn nog spelers
           * over in deze stap.
           */
          currentRoom.game
            .currentPlayerIndex += 1;
        } else {
          /*
           * Iedereen heeft deze
           * stap gehad.
           */

          if (
            currentRoom.game
              .currentStep < 3
          ) {
            /*
             * Naar de volgende stap.
             */
            currentRoom.game
              .currentStep += 1;

            /*
             * We beginnen weer bij
             * de eerste speler.
             */
            currentRoom.game
              .currentPlayerIndex = 0;

            /*
             * De kaarten uit de
             * vorige stap blijven
             * beschikbaar.
             *
             * De volgorde is:
             *
             * stap 1 -> kaart 1
             * stap 2 -> kaart 2
             * stap 3 -> kaart 3
             * stap 4 -> kaart 4
             *
             * Daarom moeten we hier
             * NIET alles leegmaken.
             */
          } else {
            /*
             * Iedereen heeft alle
             * vier kaarten.
             *
             * Dit is het einde van
             * de eerste kaartfase.
             */
            currentRoom.game
              .currentPlayerIndex = 0;

            io.to(roomCode).emit(
              "four-cards-complete"
            );
          }
        }

        /*
         * Reset de tijdelijke kaarten
         * van de huidige gok.
         */
        currentRoom.game
          .currentCard = null;

        currentRoom.game
          .waitingForGuess = false;

        sendGameState(roomCode);
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
       * Host weg =
       * hele kamer sluiten.
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
       * Gewone speler weg.
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

      if (
        room.game
          .currentPlayerIndex >=
        room.players.length
      ) {
        room.game
          .currentPlayerIndex = 0;
      }

      io.to(roomCode).emit(
        "players-updated",
        room.players
      );

      if (room.game.started) {
        sendGameState(roomCode);
      }
    }
  );
});

console.log(
  `Bussen multiplayer server draait op poort ${PORT}`
);