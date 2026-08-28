const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

const io = new Server(PORT, {
  cors: {
    origin: "*",
  },
});

const rooms = {};

function createDeck(numberOfDecks = 1) {
  const suits = [
    { name: "harten", symbol: "♥", color: "rood" },
    { name: "ruiten", symbol: "♦", color: "rood" },
    { name: "klaveren", symbol: "♣", color: "zwart" },
    { name: "schoppen", symbol: "♠", color: "zwart" },
  ];

  const cards = [];

  for (let deck = 0; deck < numberOfDecks; deck++) {
    for (const suit of suits) {
      for (let value = 2; value <= 14; value++) {
        let name;

        if (value === 11) name = "Boer";
        else if (value === 12) name = "Vrouw";
        else if (value === 13) name = "Heer";
        else if (value === 14) name = "Aas";
        else name = String(value);

        cards.push({
          id: `${deck}-${suit.name}-${value}-${Math.random()}`,
          suit: suit.name,
          suitSymbol: suit.symbol,
          value,
          name,
          color: suit.color,
        });
      }
    }
  }

  return cards;
}

function shuffle(cards) {
  const shuffled = [...cards];

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

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    isHost: player.isHost,
    cards: player.cards || [],
  };
}

function sendGameState(roomCode) {
  const room = rooms[roomCode];

  if (!room) return;

  const state = {
    players: room.players.map(publicPlayer),
    currentPlayerIndex: room.currentPlayerIndex,
    currentStep: room.currentStep,
    currentCard: room.currentCard,
  };

  io.to(roomCode).emit("game-state", state);
}

function getCurrentPlayer(room) {
  return room.players[room.currentPlayerIndex];
}

function nextPlayer(room) {
  if (room.players.length === 0) return;

  room.currentPlayerIndex =
    (room.currentPlayerIndex + 1) %
    room.players.length;

  room.currentStep = 0;
  room.currentCard = null;
}

function drawFromDeck(room) {
  if (room.deck.length === 0) {
    room.deck = shuffle(
      createDeck(room.settings.decks)
    );
  }

  return room.deck.pop();
}

function cardColorCorrect(card, guess) {
  return card.color === guess;
}

function higherLowerCorrect(previousCard, card, guess) {
  if (guess === "hoger") {
    return card.value > previousCard.value;
  }

  if (guess === "lager") {
    return card.value < previousCard.value;
  }

  return false;
}

function insideOutsideCorrect(
  firstCard,
  secondCard,
  card,
  guess
) {
  const low = Math.min(
    firstCard.value,
    secondCard.value
  );

  const high = Math.max(
    firstCard.value,
    secondCard.value
  );

  /*
   * Gelijk aan één van de kaarten is altijd fout.
   * Gelijk is dus GEEN geldige gok.
   */

  if (
    card.value === firstCard.value ||
    card.value === secondCard.value
  ) {
    return false;
  }

  if (guess === "binnen") {
    return (
      card.value > low &&
      card.value < high
    );
  }

  if (guess === "buiten") {
    return (
      card.value < low ||
      card.value > high
    );
  }

  return false;
}

function figureCorrect(card, guess) {
  return card.suit === guess;
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
      const roomCode = getUniqueRoomCode();

      const safeSettings = {
        players: Math.min(
          20,
          Math.max(2, settings?.players || 4)
        ),

        rows: [3, 4, 5].includes(
          settings?.rows
        )
          ? settings.rows
          : 4,

        decks:
          settings?.decks === 2 ? 2 : 1,

        checkpoints:
          settings?.checkpoints === true,
      };

      const host = {
        id: socket.id,
        name:
          playerName?.trim() || "Speler",
        isHost: true,
        cards: [],
      };

      rooms[roomCode] = {
        hostId: socket.id,

        settings: safeSettings,

        players: [host],

        deck: shuffle(
          createDeck(safeSettings.decks)
        ),

        currentPlayerIndex: 0,
        currentStep: 0,
        currentCard: null,

        started: false,
      };

      socket.join(roomCode);
      socket.roomCode = roomCode;

      callback({
        success: true,
        roomCode,
        players:
          rooms[roomCode].players.map(
            publicPlayer
          ),
      });

      console.log(
        `Kamer ${roomCode} aangemaakt door ${host.name}`
      );
    }
  );

  /*
   * KAMER JOINEN
   */

  socket.on(
    "join-room",
    ({ roomCode, playerName }, callback) => {
      const code = String(roomCode)
        .trim()
        .toUpperCase();

      const room = rooms[code];

      if (!room) {
        callback({
          success: false,
          message: "Kamer bestaat niet.",
        });

        return;
      }

      if (room.started) {
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
          playerName?.trim() || "Speler",
        isHost: false,
        cards: [],
      };

      room.players.push(player);

      socket.join(code);
      socket.roomCode = code;

      callback({
        success: true,
        roomCode: code,
        players:
          room.players.map(publicPlayer),
      });

      io.to(code).emit(
        "players-updated",
        room.players.map(publicPlayer)
      );

      console.log(
        `${player.name} is bij kamer ${code} gekomen`
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
        room.hostId !== socket.id
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
        room.players.map(
          publicPlayer
        )
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
        room.hostId !== socket.id
      ) {
        return;
      }

      if (
        room.players.length < 2
      ) {
        return;
      }

      room.started = true;

      /*
       * Iedereen begint met een
       * lege hand.
       *
       * De eerste vier kaarten
       * worden tijdens het spel
       * één voor één getrokken.
       */

      room.players.forEach(
        (player) => {
          player.cards = [];
        }
      );

      room.currentPlayerIndex = 0;
      room.currentStep = 0;
      room.currentCard = null;

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

      if (!room || !room.started)
        return;

      const player =
        getCurrentPlayer(room);

      if (!player) return;

      /*
       * Alleen de speler die
       * daadwerkelijk aan de beurt is
       * mag een kaart trekken.
       */

      if (
        player.id !== socket.id
      ) {
        return;
      }

      /*
       * Voorkom dat dezelfde speler
       * meerdere kaarten trekt voordat
       * hij een gok heeft gedaan.
       */

      if (room.currentCard) {
        return;
      }

      const card =
        drawFromDeck(room);

      room.currentCard = card;

      /*
       * De kaart wordt naar alle spelers
       * gestuurd zodat iedereen kan zien
       * wat er getrokken is.
       *
       * De daadwerkelijke beoordeling
       * gebeurt pas na de gok.
       */

      io.to(roomCode).emit(
        "card-drawn",
        {
          playerId: player.id,
          step: room.currentStep,
          card,
        }
      );

      sendGameState(roomCode);
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

      if (!room || !room.started)
        return;

      const player =
        getCurrentPlayer(room);

      if (!player) return;

      /*
       * Alleen de speler aan de beurt
       * mag een gok insturen.
       */

      if (
        player.id !== socket.id
      ) {
        return;
      }

      if (!room.currentCard) {
        return;
      }

      const card =
        room.currentCard;

      let correct = false;

      /*
       * STAP 1
       * ROOD / ZWART
       */

      if (room.currentStep === 0) {
        correct =
          cardColorCorrect(
            card,
            guess
          );
      }

      /*
       * STAP 2
       * HOGER / LAGER
       */

      else if (
        room.currentStep === 1
      ) {
        const previousCard =
          player.cards[0];

        if (!previousCard) {
          return;
        }

        correct =
          higherLowerCorrect(
            previousCard,
            card,
            guess
          );
      }

      /*
       * STAP 3
       * BINNEN / BUITEN
       */

      else if (
        room.currentStep === 2
      ) {
        const firstCard =
          player.cards[0];

        const secondCard =
          player.cards[1];

        if (
          !firstCard ||
          !secondCard
        ) {
          return;
        }

        correct =
          insideOutsideCorrect(
            firstCard,
            secondCard,
            card,
            guess
          );
      }

      /*
       * STAP 4
       * FIGUUR
       */

      else if (
        room.currentStep === 3
      ) {
        correct =
          figureCorrect(
            card,
            guess
          );
      }

      /*
       * KAART TOEVOEGEN AAN HAND
       */

      player.cards.push(card);

      const drinks =
        correct ? 0 : 1;

      /*
       * Resultaat naar alle spelers.
       */

      io.to(roomCode).emit(
        "guess-result",
        {
          playerId: player.id,
          step: room.currentStep,
          card,
          guess,
          correct,
          drinks,
          cards: player.cards,
        }
      );

      /*
       * Kaart is afgehandeld.
       */

      room.currentCard = null;

      /*
       * Als deze speler nog niet
       * alle vier kaarten heeft,
       * gaat hij naar de volgende stap.
       */

      if (
        room.currentStep < 3
      ) {
        room.currentStep++;
      } else {
        /*
         * Alle vier kaarten gehad.
         * Volgende speler.
         */

        nextPlayer(room);
      }

      sendGameState(roomCode);
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
       * Als de host weggaat,
       * wordt de hele kamer gesloten.
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

      room.players =
        room.players.filter(
          (player) =>
            player.id !== socket.id
        );

      /*
       * Zorg dat de beurtindex niet
       * buiten de spelerslijst valt.
       */

      if (
        room.currentPlayerIndex >=
        room.players.length
      ) {
        room.currentPlayerIndex = 0;
      }

      io.to(roomCode).emit(
        "players-updated",
        room.players.map(
          publicPlayer
        )
      );

      if (room.started) {
        sendGameState(roomCode);
      }
    }
  );
});

console.log(
  `Bussen multiplayer server draait op poort ${PORT}`
);