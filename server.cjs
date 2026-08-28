const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

const io = new Server(PORT, {
  cors: {
    origin: "*",
  },
});

const rooms = {};

const suits = ["♥", "♦", "♣", "♠"];

function createDeck(numberOfDecks = 1) {
  const deck = [];

  const values = [
    { name: "2", value: 2 },
    { name: "3", value: 3 },
    { name: "4", value: 4 },
    { name: "5", value: 5 },
    { name: "6", value: 6 },
    { name: "7", value: 7 },
    { name: "8", value: 8 },
    { name: "9", value: 9 },
    { name: "10", value: 10 },
    { name: "J", value: 11 },
    { name: "Q", value: 12 },
    { name: "K", value: 13 },
    { name: "A", value: 14 },
  ];

  for (let d = 0; d < numberOfDecks; d++) {
    for (const suit of suits) {
      for (const card of values) {
        deck.push({
          id: `${d}-${suit}-${card.name}-${Math.random()}`,
          suit,
          value: card.value,
          name: card.name,
          color:
            suit === "♥" || suit === "♦"
              ? "rood"
              : "zwart",
        });
      }
    }
  }

  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function createRoomCode() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 5; i++) {
    code +=
      characters[
        Math.floor(Math.random() * characters.length)
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

function broadcastGameState(roomCode) {
  const room = rooms[roomCode];

  if (!room) return;

  io.to(roomCode).emit("game-state", {
    players: room.players,
    currentPlayerIndex: room.currentPlayerIndex,
    currentStep: room.currentStep,
    currentCard: room.currentCard,
  });
}

io.on("connection", (socket) => {
  console.log(
    "Nieuwe speler verbonden:",
    socket.id
  );

  socket.on(
    "create-room",
    ({ playerName, settings }, callback) => {
      const roomCode = getUniqueRoomCode();

      rooms[roomCode] = {
        hostId: socket.id,

        settings: {
          players: settings?.players || 4,
          rows: settings?.rows || 4,
          decks: settings?.decks || 1,
          checkpoints:
            settings?.checkpoints || false,
        },

        players: [
          {
            id: socket.id,
            name: playerName,
            isHost: true,
            cards: [],
          },
        ],

        deck: [],
        currentPlayerIndex: 0,
        currentStep: 0,
        currentCard: null,
        gameStarted: false,
      };

      socket.join(roomCode);
      socket.roomCode = roomCode;

      callback({
        success: true,
        roomCode,
        players: rooms[roomCode].players,
      });

      console.log(
        `Kamer ${roomCode} aangemaakt door ${playerName}`
      );
    }
  );

  socket.on(
    "join-room",
    ({ roomCode, playerName }, callback) => {
      const room = rooms[roomCode];

      if (!room) {
        callback({
          success: false,
          message: "Kamer bestaat niet.",
        });

        return;
      }

      if (room.gameStarted) {
        callback({
          success: false,
          message: "Dit spel is al begonnen.",
        });

        return;
      }

      if (
        room.players.length >=
        room.settings.players
      ) {
        callback({
          success: false,
          message: "Deze kamer zit vol.",
        });

        return;
      }

      const player = {
        id: socket.id,
        name: playerName,
        isHost: false,
        cards: [],
      };

      room.players.push(player);

      socket.join(roomCode);
      socket.roomCode = roomCode;

      callback({
        success: true,
        roomCode,
        players: room.players,
      });

      io.to(roomCode).emit(
        "players-updated",
        room.players
      );

      console.log(
        `${playerName} is bij kamer ${roomCode} gekomen`
      );
    }
  );

  socket.on(
    "remove-player",
    (playerId) => {
      const roomCode = socket.roomCode;
      const room = rooms[roomCode];

      if (!room) return;

      if (room.hostId !== socket.id) return;

      const player = room.players.find(
        (p) => p.id === playerId
      );

      if (!player || player.isHost) return;

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

      console.log(
        `${player.name} verwijderd uit kamer ${roomCode}`
      );
    }
  );

  socket.on("start-game", () => {
    const roomCode = socket.roomCode;
    const room = rooms[roomCode];

    if (!room) return;

    if (room.hostId !== socket.id) return;

    if (room.players.length < 2) return;

    room.deck = shuffleDeck(
      createDeck(room.settings.decks)
    );

    room.currentPlayerIndex = 0;
    room.currentStep = 0;
    room.currentCard = null;
    room.gameStarted = true;

    room.players.forEach((player) => {
      player.cards = [];
    });

    io.to(roomCode).emit(
      "game-started"
    );

    broadcastGameState(roomCode);

    console.log(
      `Spel gestart in kamer ${roomCode}`
    );
  });

  socket.on(
    "draw-card",
    () => {
      const roomCode = socket.roomCode;
      const room = rooms[roomCode];

      if (!room) return;

      if (!room.gameStarted) return;

      const player =
        room.players[
          room.currentPlayerIndex
        ];

      if (!player) return;

      if (player.id !== socket.id) return;

      if (room.currentStep > 3) return;

      if (room.deck.length === 0) {
        room.deck = shuffleDeck(
          createDeck(room.settings.decks)
        );
      }

      const card = room.deck.pop();

      room.currentCard = card;

      io.to(roomCode).emit(
        "card-drawn",
        {
          playerId: player.id,
          step: room.currentStep,
          card,
        }
      );
    }
  );

  socket.on(
    "guess-card",
    ({ guess }) => {
      const roomCode = socket.roomCode;
      const room = rooms[roomCode];

      if (!room) return;

      if (!room.gameStarted) return;

      const player =
        room.players[
          room.currentPlayerIndex
        ];

      if (!player) return;

      if (player.id !== socket.id) return;

      const card = room.currentCard;

      if (!card) return;

      let correct = false;

      if (room.currentStep === 0) {
        correct =
          guess === card.color;
      }

      if (room.currentStep === 1) {
        const firstCard =
          player.cards[0];

        if (!firstCard) return;

        if (guess === "hoger") {
          correct =
            card.value >
            firstCard.value;
        }

        if (guess === "lager") {
          correct =
            card.value <
            firstCard.value;
        }
      }

      if (room.currentStep === 2) {
        const firstCard =
          player.cards[0];

        const secondCard =
          player.cards[1];

        if (!firstCard || !secondCard) {
          return;
        }

        const low = Math.min(
          firstCard.value,
          secondCard.value
        );

        const high = Math.max(
          firstCard.value,
          secondCard.value
        );

        if (guess === "binnen") {
          correct =
            card.value > low &&
            card.value < high;
        }

        if (guess === "buiten") {
          correct =
            card.value < low ||
            card.value > high;
        }
      }

      if (room.currentStep === 3) {
        correct =
          guess === card.suit;
      }

      if (correct) {
        player.cards.push(card);
      }

      io.to(roomCode).emit(
        "guess-result",
        {
          playerId: player.id,
          step: room.currentStep,
          card,
          guess,
          correct,
          cards: player.cards,
        }
      );

      room.currentCard = null;

      if (correct) {
        room.currentStep++;

        if (room.currentStep >= 4) {
          room.currentStep = 0;

          room.currentPlayerIndex++;

          if (
            room.currentPlayerIndex >=
            room.players.length
          ) {
            room.currentPlayerIndex = 0;
          }
        }
      }

      broadcastGameState(roomCode);
    }
  );

  socket.on("disconnect", () => {
    console.log(
      "Speler disconnected:",
      socket.id
    );

    const roomCode = socket.roomCode;

    if (
      !roomCode ||
      !rooms[roomCode]
    ) {
      return;
    }

    const room = rooms[roomCode];

    room.players =
      room.players.filter(
        (player) =>
          player.id !== socket.id
      );

    if (room.hostId === socket.id) {
      io.to(roomCode).emit(
        "room-closed"
      );

      delete rooms[roomCode];

      console.log(
        `Kamer ${roomCode} gesloten`
      );

      return;
    }

    io.to(roomCode).emit(
      "players-updated",
      room.players
    );
  });
});

console.log(
  `Bussen multiplayer server draait op poort ${PORT}`
);