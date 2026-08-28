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

  for (let deckNumber = 0; deckNumber < numberOfDecks; deckNumber++) {
    for (const suit of SUITS) {
      for (const cardValue of VALUES) {
        deck.push({
          id: `${deckNumber}-${suit.name}-${cardValue.value}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
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

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

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

function publicGameState(room) {
  return {
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      cards: player.cards || [],
    })),

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

function getCurrentPlayer(room) {
  return room.players[
    room.game.currentPlayerIndex
  ];
}

function getCardName(card) {
  return `${card.name} ${card.suit}`;
}

/*
 * Controleert de gok van de speler.
 *
 * Stap 0 = kleur
 * Stap 1 = hoger/lager
 * Stap 2 = binnen/buiten
 * Stap 3 = figuur
 */
function checkGuess(room, guess, drawnCard) {
  const step = room.game.currentStep;

  if (step === 0) {
    return (
      guess === drawnCard.color
    );
  }

  if (step === 1) {
    const previousCard =
      room.game.revealedCards[0];

    if (!previousCard) return false;

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

  if (step === 2) {
    const firstCard =
      room.game.revealedCards[0];

    const secondCard =
      room.game.revealedCards[1];

    if (!firstCard || !secondCard) {
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
   * KAMER MAKEN
   */
  socket.on(
    "create-room",
    ({ playerName, settings }, callback) => {
      const roomCode =
        getUniqueRoomCode();

      const safeSettings = {
        players:
          Number(settings?.players) || 4,

        rows:
          Number(settings?.rows) || 4,

        decks:
          Number(settings?.decks) || 1,

        checkpoints:
          Boolean(settings?.checkpoints),
      };

      rooms[roomCode] = {
        hostId: socket.id,

        settings: safeSettings,

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
          currentPlayerIndex: 0,
          currentStep: 0,
          currentCard: null,
          revealedCards: [],
          waitingForGuess: false,
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
        `Kamer ${roomCode} aangemaakt`
      );
    }
  );

  /*
   * KAMER JOINEN
   */
  socket.on(
    "join-room",
    ({ roomCode, playerName }, callback) => {
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

      io.to(normalizedCode).emit(
        "players-updated",
        room.players
      );

      console.log(
        `${player.name} is bij kamer ${normalizedCode} gekomen`
      );
    }
  );

  /*
   * SPELER VERWIJDEREN
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
          (p) => p.id !== playerId
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
   * SPEL STARTEN
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

      /*
       * Nieuwe stock maken.
       */
      room.deck =
        createDeck(
          room.settings.decks
        );

      /*
       * Iedereen begint met
       * een lege hand.
       */
      room.players.forEach(
        (player) => {
          player.cards = [];
        }
      );

      room.game = {
        started: true,
        currentPlayerIndex: 0,
        currentStep: 0,
        currentCard: null,
        revealedCards: [],
        waitingForGuess: false,
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
   * KAART TREKKEN
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

      /*
       * Alleen de speler die aan
       * de beurt is mag trekken.
       */
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

      if (room.deck.length === 0) {
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
       * De kaart wordt tijdelijk
       * alleen aan de client gestuurd
       * die aan de beurt is.
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

      console.log(
        `${currentPlayer.name} heeft een kaart getrokken: ${getCardName(card)}`
      );
    }
  );

  /*
   * GOK DOEN
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

      const currentPlayer =
        getCurrentPlayer(room);

      if (!currentPlayer) {
        return;
      }

      /*
       * Alleen de speler aan de
       * beurt mag een gok doen.
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
          normalizedGuess,
          card
        );

      /*
       * Kaart wordt onderdeel
       * van de hand van de speler.
       */
      currentPlayer.cards.push(
        card
      );

      /*
       * Kaart bewaren voor de
       * volgende stappen.
       */
      room.game.revealedCards.push(
        card
      );

      room.game.currentCard =
        null;

      room.game.waitingForGuess =
        false;

      const finishedPlayer =
        currentPlayer;

      const finishedStep =
        room.game.currentStep;

      /*
       * Resultaat naar iedereen.
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

      /*
       * Na iedere kaart gaat de
       * speler naar de volgende stap.
       */
      if (
        room.game.currentStep <
        3
      ) {
        room.game.currentStep += 1;
      } else {
        /*
         * Alle vier kaarten
         * zijn gespeeld.
         *
         * Volgende speler.
         */
        room.game.currentStep = 0;

        room.game.revealedCards = [];

        room.game.currentPlayerIndex += 1;

        /*
         * Als iedereen vier kaarten
         * heeft gehad, is deze ronde
         * afgelopen.
         */
        if (
          room.game.currentPlayerIndex >=
          room.players.length
        ) {
          room.game.currentPlayerIndex = 0;

          io.to(roomCode).emit(
            "four-cards-complete"
          );
        }
      }

      sendGameState(roomCode);

      console.log(
        `${finishedPlayer.name}: stap ${finishedStep + 1}, gok ${normalizedGuess}, ${correct ? "goed" : "fout"}`
      );
    }
  );

  /*
   * DISCONNECT
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
       * Host weg = kamer weg.
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

      /*
       * Zorg dat de index niet
       * buiten de array valt.
       */
      if (
        room.players.length === 0
      ) {
        delete rooms[roomCode];
        return;
      }

      if (
        room.game.currentPlayerIndex >=
        room.players.length
      ) {
        room.game.currentPlayerIndex = 0;
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