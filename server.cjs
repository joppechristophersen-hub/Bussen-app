const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

const io = new Server(PORT, {
  cors: {
    origin: "*",
  },
});

const rooms = {};

/* =========================
   KAMERCODE
========================= */

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

/* =========================
   KAARTEN
========================= */

const suits = [
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

const cardNames = {
  1: "Aas",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "Boer",
  12: "Vrouw",
  13: "Koning",
};

function createDeck(numberOfDecks = 1) {
  const deck = [];

  for (
    let deckNumber = 0;
    deckNumber < numberOfDecks;
    deckNumber++
  ) {
    suits.forEach((suit) => {
      for (let value = 1; value <= 13; value++) {
        deck.push({
          id: `${deckNumber}-${suit.name}-${value}-${Math.random()}`,
          suit: suit.name,
          symbol: suit.symbol,
          value,
          name: cardNames[value],
          color: suit.color,
        });
      }
    });
  }

  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [deck[i], deck[j]] = [
      deck[j],
      deck[i],
    ];
  }

  return deck;
}

/* =========================
   GAME STATE
========================= */

function createGameState(room) {
  return {
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      cards: [],
    })),

    currentPlayerIndex: 0,

    currentStep: 0,

    currentCard: null,

    lastGuess: null,

    lastResult: null,

    phase: "cards",
  };
}

function sendGameState(roomCode) {
  const room = rooms[roomCode];

  if (!room || !room.game) return;

  io.to(roomCode).emit(
    "game-state",
    room.game
  );
}

/* =========================
   SOCKET.IO
========================= */

io.on("connection", (socket) => {
  console.log(
    "Nieuwe speler verbonden:",
    socket.id
  );

  /* =========================
     KAMER MAKEN
  ========================= */

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
            name: playerName,
            isHost: true,
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
        `Kamer ${roomCode} aangemaakt door ${playerName}`
      );
    }
  );

  /* =========================
     KAMER JOINEN
  ========================= */

  socket.on(
    "join-room",
    (
      { roomCode, playerName },
      callback
    ) => {
      const room =
        rooms[roomCode];

      if (!room) {
        callback({
          success: false,
          message:
            "Kamer bestaat niet.",
        });

        return;
      }

      if (
        room.game
      ) {
        callback({
          success: false,
          message:
            "Het spel is al gestart.",
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
        name: playerName,
        isHost: false,
      };

      room.players.push(player);

      socket.join(roomCode);

      socket.roomCode = roomCode;

      callback({
        success: true,
        roomCode,
        players:
          room.players,
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

  /* =========================
     SPELER VERWIJDEREN
  ========================= */

  socket.on(
    "remove-player",
    (playerId) => {
      const roomCode =
        socket.roomCode;

      const room =
        rooms[roomCode];

      if (!room) return;

      if (
        room.hostId !== socket.id
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

      console.log(
        `${player.name} verwijderd uit kamer ${roomCode}`
      );
    }
  );

  /* =========================
     SPEL STARTEN
  ========================= */

  socket.on(
    "start-game",
    () => {
      const roomCode =
        socket.roomCode;

      const room =
        rooms[roomCode];

      if (!room) return;

      if (
        room.hostId !== socket.id
      ) {
        return;
      }

      if (
        room.players.length < 2
      ) {
        return;
      }

      /*
       * Nieuwe kaartstapel
       */

      const deck = shuffle(
        createDeck(
          room.settings.decks
        )
      );

      room.deck = deck;

      /*
       * Game state maken
       */

      room.game =
        createGameState(room);

      /*
       * Stuur spel gestart
       */

      io.to(roomCode).emit(
        "game-started"
      );

      sendGameState(roomCode);

      console.log(
        `Spel gestart in kamer ${roomCode}`
      );
    }
  );

  /* =========================
     KAART TREKKEN
  ========================= */

  socket.on(
    "draw-card",
    () => {
      const roomCode =
        socket.roomCode;

      const room =
        rooms[roomCode];

      if (
        !room ||
        !room.game
      ) {
        return;
      }

      const game =
        room.game;

      const currentPlayer =
        game.players[
          game.currentPlayerIndex
        ];

      /*
       * Alleen speler die aan de beurt
       * is mag trekken.
       */

      if (
        !currentPlayer ||
        currentPlayer.id !==
          socket.id
      ) {
        return;
      }

      /*
       * Er mag maar één kaart
       * tegelijk open zijn.
       */

      if (game.currentCard) {
        return;
      }

      const card =
        room.deck.pop();

      if (!card) {
        io.to(roomCode).emit(
          "game-error",
          "De kaarten zijn op."
        );

        return;
      }

      game.currentCard = card;

      io.to(roomCode).emit(
        "card-drawn",
        {
          playerId:
            currentPlayer.id,

          step:
            game.currentStep,

          card,
        }
      );

      sendGameState(roomCode);
    }
  );

  /* =========================
     GOK CONTROLEREN
  ========================= */

  socket.on(
    "guess-card",
    ({ guess }) => {
      const roomCode =
        socket.roomCode;

      const room =
        rooms[roomCode];

      if (
        !room ||
        !room.game
      ) {
        return;
      }

      const game =
        room.game;

      const currentPlayer =
        game.players[
          game.currentPlayerIndex
        ];

      if (
        !currentPlayer ||
        currentPlayer.id !==
          socket.id
      ) {
        return;
      }

      const card =
        game.currentCard;

      if (!card) return;

      let correct = false;

      /* =====================
         STAP 1
         KLEUR
      ===================== */

      if (
        game.currentStep === 0
      ) {
        correct =
          guess === card.color;
      }

      /* =====================
         STAP 2
         HOGER / LAGER
      ===================== */

      if (
        game.currentStep === 1
      ) {
        const firstCard =
          currentPlayer.cards[0];

        if (!firstCard) return;

        if (
          guess === "hoger"
        ) {
          correct =
            card.value >
            firstCard.value;
        }

        if (
          guess === "lager"
        ) {
          correct =
            card.value <
            firstCard.value;
        }

        /*
         * Gelijke waarde =
         * automatisch fout.
         */
      }

      /* =====================
         STAP 3
         BINNEN / BUITEN
      ===================== */

      if (
        game.currentStep === 2
      ) {
        const firstCard =
          currentPlayer.cards[0];

        const secondCard =
          currentPlayer.cards[1];

        if (
          !firstCard ||
          !secondCard
        ) {
          return;
        }

        const lowest =
          Math.min(
            firstCard.value,
            secondCard.value
          );

        const highest =
          Math.max(
            firstCard.value,
            secondCard.value
          );

        const inside =
          card.value >
            lowest &&
          card.value <
            highest;

        if (
          guess === "binnen"
        ) {
          correct = inside;
        }

        if (
          guess === "buiten"
        ) {
          correct = !inside;
        }
      }

      /* =====================
         STAP 4
         FIGUUR
      ===================== */

      if (
        game.currentStep === 3
      ) {
        correct =
          guess === card.suit;
      }

      /*
       * Kaart toevoegen aan speler
       */

      currentPlayer.cards.push(
        card
      );

      /*
       * Resultaat bewaren
       */

      game.lastGuess =
        guess;

      game.lastResult = {
        correct,
        drinks: correct ? 0 : 1,
        playerId:
          currentPlayer.id,
        card,
      };

      /*
       * Kaart niet langer
       * actief als huidige kaart
       */

      game.currentCard =
        null;

      /*
       * Resultaat naar alle spelers
       */

      io.to(roomCode).emit(
        "guess-result",
        {
          playerId:
            currentPlayer.id,

          step:
            game.currentStep,

          card,

          guess,

          correct,

          cards:
            currentPlayer.cards,

          drinks:
            correct ? 0 : 1,
        }
      );

      /*
       * Vierde kaart klaar?
       */

      if (
        game.currentStep >= 3
      ) {
        /*
         * Volgende speler
         */

        game.currentStep = 0;

        game.currentPlayerIndex =
          (game.currentPlayerIndex +
            1) %
          game.players.length;
      } else {
        /*
         * Volgende stap voor
         * dezelfde speler
         */

        game.currentStep++;
      }

      sendGameState(roomCode);
    }
  );

  /* =========================
     DISCONNECT
  ========================= */

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
            player.id !== socket.id
        );

      /*
       * Host weg =
       * hele kamer sluiten
       */

      if (
        room.hostId === socket.id
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
       * Speler weg
       */

      if (room.game) {
        room.game.players =
          room.game.players.filter(
            (player) =>
              player.id !==
              socket.id
          );

        if (
          room.game
            .currentPlayerIndex >=
          room.game.players.length
        ) {
          room.game.currentPlayerIndex = 0;
        }

        sendGameState(
          roomCode
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

/* =========================
   SERVER
========================= */

console.log(
  `Bussen multiplayer server draait op poort ${PORT}`
);