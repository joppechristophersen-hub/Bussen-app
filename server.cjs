const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

const io = new Server(PORT, {
  cors: {
    origin: "*",
  },
});

const rooms = {};

// =========================
// KAARTEN
// =========================

const suits = [
  {
    name: "Harten",
    symbol: "♥",
    color: "rood",
  },
  {
    name: "Ruiten",
    symbol: "♦",
    color: "rood",
  },
  {
    name: "Klaveren",
    symbol: "♣",
    color: "zwart",
  },
  {
    name: "Schoppen",
    symbol: "♠",
    color: "zwart",
  },
];

const values = [
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

  for (let d = 0; d < numberOfDecks; d++) {
    for (const suit of suits) {
      for (const cardValue of values) {
        deck.push({
          id: `${d}-${suit.name}-${cardValue.value}-${Math.random()}`,
          suit: suit.name,
          symbol: suit.symbol,
          value: cardValue.value,
          name: cardValue.name,
          color: suit.color,
        });
      }
    }
  }

  return deck;
}

function shuffle(deck) {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i],
    ];
  }

  return shuffled;
}

// =========================
// KAMERCODES
// =========================

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

// =========================
// SPELSTATUS
// =========================

function createGame(room) {
  const deck = shuffle(
    createDeck(room.settings.decks)
  );

  return {
    deck,

    players: room.players.map((player) => ({
      ...player,
      cards: [],
    })),

    currentPlayerIndex: 0,

    currentStep: 0,

    currentCard: null,

    previousCards: [],

    gameStarted: true,
  };
}

function getPublicGameState(game) {
  return {
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      cards: player.cards,
    })),

    currentPlayerIndex:
      game.currentPlayerIndex,

    currentStep: game.currentStep,

    currentCard: game.currentCard,
  };
}

function drawFromDeck(game) {
  if (game.deck.length === 0) {
    game.deck = shuffle(
      createDeck(1)
    );
  }

  return game.deck.pop();
}

// =========================
// GOK CONTROLEREN
// =========================

function isGuessCorrect(
  game,
  guess
) {
  const step = game.currentStep;
  const drawnCard = game.currentCard;

  if (!drawnCard) {
    return false;
  }

  // =========================
  // STAP 1: KLEUR
  // =========================

  if (step === 0) {
    return (
      guess === drawnCard.color
    );
  }

  // =========================
  // STAP 2: HOGER / LAGER
  // =========================

  if (step === 1) {
    const firstCard =
      game.previousCards[0];

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

  // =========================
  // STAP 3: BINNEN / BUITEN
  // =========================

  if (step === 2) {
    const firstCard =
      game.previousCards[0];

    const secondCard =
      game.previousCards[1];

    if (!firstCard || !secondCard) {
      return false;
    }

    const low = Math.min(
      firstCard.value,
      secondCard.value
    );

    const high = Math.max(
      firstCard.value,
      secondCard.value
    );

    // Gelijk is GEEN geldige keuze
    if (
      drawnCard.value === low ||
      drawnCard.value === high
    ) {
      return false;
    }

    const inside =
      drawnCard.value > low &&
      drawnCard.value < high;

    if (guess === "binnen") {
      return inside;
    }

    if (guess === "buiten") {
      return !inside;
    }

    return false;
  }

  // =========================
  // STAP 4: FIGUUR
  // =========================

  if (step === 3) {
    return (
      guess === drawnCard.suit
    );
  }

  return false;
}

// =========================
// SOCKET.IO
// =========================

io.on("connection", (socket) => {
  console.log(
    "Nieuwe speler verbonden:",
    socket.id
  );

  // =========================
  // KAMER MAKEN
  // =========================

  socket.on(
    "create-room",
    (
      { playerName, settings },
      callback
    ) => {
      const roomCode =
        getUniqueRoomCode();

      rooms[roomCode] = {
        hostId: socket.id,

        settings: {
          players:
            settings?.players || 4,

          rows:
            settings?.rows || 4,

          decks:
            settings?.decks || 1,

          checkpoints:
            settings?.checkpoints ||
            false,
        },

        players: [
          {
            id: socket.id,
            name:
              playerName || "Speler",
            isHost: true,
            cards: [],
          },
        ],

        game: null,
      };

      socket.join(roomCode);
      socket.roomCode = roomCode;

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

  // =========================
  // JOIN ROOM
  // =========================

  socket.on(
    "join-room",
    (
      { roomCode, playerName },
      callback
    ) => {
      const code =
        roomCode
          ?.trim()
          .toUpperCase();

      const room = rooms[code];

      if (!room) {
        callback({
          success: false,
          message:
            "Kamer bestaat niet.",
        });

        return;
      }

      if (
        room.game &&
        room.game.gameStarted
      ) {
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
          playerName || "Speler",
        isHost: false,
        cards: [],
      };

      room.players.push(player);

      socket.join(code);
      socket.roomCode = code;

      callback({
        success: true,
        roomCode: code,
        players: room.players,
      });

      io.to(code).emit(
        "players-updated",
        room.players
      );

      console.log(
        `${player.name} is bij kamer ${code} gekomen`
      );
    }
  );

  // =========================
  // SPELER VERWIJDEREN
  // =========================

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

  // =========================
  // SPEL STARTEN
  // =========================

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

      room.game =
        createGame(room);

      io.to(roomCode).emit(
        "game-started"
      );

      io.to(roomCode).emit(
        "game-state",
        getPublicGameState(
          room.game
        )
      );

      console.log(
        `Spel gestart in kamer ${roomCode}`
      );
    }
  );

  // =========================
  // KAART TREKKEN
  // =========================

  socket.on(
    "draw-card",
    () => {
      const roomCode =
        socket.roomCode;

      const room =
        rooms[roomCode];

      if (!room || !room.game) {
        return;
      }

      const game =
        room.game;

      const currentPlayer =
        game.players[
          game.currentPlayerIndex
        ];

      if (!currentPlayer) {
        return;
      }

      // Alleen de speler aan de beurt
      // mag een kaart trekken.
      if (
        currentPlayer.id !==
        socket.id
      ) {
        return;
      }

      // Er mag niet nog een kaart
      // openstaan.
      if (game.currentCard) {
        return;
      }

      const card =
        drawFromDeck(game);

      game.currentCard = card;

      io.to(roomCode).emit(
        "card-drawn",
        {
          playerId: socket.id,
          step: game.currentStep,
          card,
        }
      );
    }
  );

  // =========================
  // GOK DOEN
  // =========================

  socket.on(
    "guess-card",
    ({ guess }) => {
      const roomCode =
        socket.roomCode;

      const room =
        rooms[roomCode];

      if (!room || !room.game) {
        return;
      }

      const game =
        room.game;

      const currentPlayer =
        game.players[
          game.currentPlayerIndex
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

      if (!game.currentCard) {
        return;
      }

      const card =
        game.currentCard;

      const correct =
        isGuessCorrect(
          game,
          guess
        );

      // Kaart wordt altijd
      // onderdeel van de hand.
      currentPlayer.cards.push(
        card
      );

      game.previousCards.push(
        card
      );

      const drinks =
        correct
          ? 0
          : 1;

      io.to(roomCode).emit(
        "guess-result",
        {
          playerId: socket.id,

          step: game.currentStep,

          card,

          guess,

          correct,

          drinks,

          cards:
            currentPlayer.cards,
        }
      );

      // Kaart terugzetten naar null
      game.currentCard = null;

      // Volgende stap of volgende speler
      if (game.currentStep < 3) {
        game.currentStep += 1;
      } else {
        game.currentStep = 0;

        game.previousCards = [];

        game.currentPlayerIndex += 1;

        if (
          game.currentPlayerIndex >=
          game.players.length
        ) {
          game.currentPlayerIndex = 0;
        }
      }

      setTimeout(() => {
        io.to(roomCode).emit(
          "game-state",
          getPublicGameState(
            game
          )
        );
      }, 1200);
    }
  );

  // =========================
  // DISCONNECT
  // =========================

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

      room.players =
        room.players.filter(
          (player) =>
            player.id !==
            socket.id
        );

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

      if (room.game) {
        room.game.players =
          room.game.players.filter(
            (player) =>
              player.id !==
              socket.id
          );

        if (
          room.game.currentPlayerIndex >=
          room.game.players.length
        ) {
          room.game.currentPlayerIndex = 0;
        }

        io.to(roomCode).emit(
          "game-state",
          getPublicGameState(
            room.game
          )
        );
      } else {
        io.to(roomCode).emit(
          "players-updated",
          room.players
        );
      }
    }
  );
});

console.log(
  `Bussen multiplayer server draait op poort ${PORT}`
);