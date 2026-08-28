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

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

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

function getCardText(card) {
  return `${card.name} ${card.symbol}`;
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

    waitingForGuess:
      room.game.waitingForGuess,

    resultShowing:
      room.game.resultShowing,

    gameFinished:
      room.game.finished,
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

/*
 * =========================
 * GOK CONTROLEREN
 * =========================
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
   * STAP 4 - FIGUUR
   */
  if (step === 3) {
    return (
      guess === drawnCard.suit
    );
  }

  return false;
}

/*
 * =========================
 * VOLGENDE BEURT
 * =========================
 *
 * Deze functie wordt NIET meer
 * automatisch aangeroepen.
 *
 * De huidige speler moet zelf
 * op "Volgende speler" drukken.
 */

function advanceTurn(roomCode) {
  const room = rooms[roomCode];

  if (!room) return;

  /*
   * Het resultaat van de vorige
   * kaart is voorbij.
   */
  room.game.resultShowing = false;

  room.game.currentCard = null;

  room.game.waitingForGuess = false;

  /*
   * Er zijn nog spelers in deze stap.
   */
  if (
    room.game.currentPlayerIndex <
    room.players.length - 1
  ) {
    room.game.currentPlayerIndex += 1;

    sendGameState(roomCode);

    console.log(
      `Kamer ${roomCode}: beurt naar ${
        room.players[
          room.game.currentPlayerIndex
        ].name
      }`
    );

    return;
  }

  /*
   * Iedereen heeft deze stap gespeeld.
   *
   * Terug naar speler 1 en
   * naar de volgende stap.
   */
  room.game.currentPlayerIndex = 0;

  room.game.currentStep += 1;

  /*
   * Alle vier stappen zijn klaar.
   */
  if (
    room.game.currentStep >= 4
  ) {
    room.game.finished = true;

    io.to(roomCode).emit(
      "four-cards-complete"
    );

    sendGameState(roomCode);

    console.log(
      `De eerste vier kaarten zijn compleet in kamer ${roomCode}`
    );

    return;
  }

  sendGameState(roomCode);

  console.log(
    `Kamer ${roomCode}: stap ${
      room.game.currentStep + 1
    } begint bij ${
      room.players[0].name
    }`
  );
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
              String(
                playerName ||
                  "Host"
              ).trim(),

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

          waitingForGuess: false,

          resultShowing: false,

          finished: false,
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
        `Kamer ${roomCode} aangemaakt door ${
          playerName ||
          "Host"
        }`
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
        String(
          roomCode || ""
        )
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
          String(
            playerName ||
              "Speler"
          ).trim(),

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
            p.id ===
            playerId
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
            p.id !==
            playerId
        );

      io.to(
        playerId
      ).emit(
        "removed-from-room"
      );

      io.to(
        roomCode
      ).emit(
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
        room.players.length <
        2
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

        currentPlayerIndex: 0,

        currentStep: 0,

        currentCard: null,

        waitingForGuess: false,

        resultShowing: false,

        finished: false,
      };

      io.to(
        roomCode
      ).emit(
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
        room.game.finished
      ) {
        return;
      }

      if (
        room.game.waitingForGuess
      ) {
        return;
      }

      if (
        room.game.resultShowing
      ) {
        return;
      }

      const currentPlayer =
        getCurrentPlayer(
          room
        );

      if (!currentPlayer) {
        return;
      }

      /*
       * Alleen de speler die
       * aan de beurt is mag trekken.
       */
      if (
        currentPlayer.id !==
        socket.id
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

      io.to(
        socket.id
      ).emit(
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
        `${currentPlayer.name} heeft een kaart getrokken: ${getCardText(
          card
        )}`
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
        room.game.finished
      ) {
        return;
      }

      if (
        !room.game.waitingForGuess
      ) {
        return;
      }

      const currentPlayer =
        getCurrentPlayer(
          room
        );

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
        String(
          guess || ""
        )
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
       * Kaart wordt toegevoegd
       * aan de speler.
       */
      currentPlayer.cards.push(
        card
      );

      /*
       * Gok is klaar.
       *
       * De speler moet nu zelf
       * op "Volgende speler"
       * drukken.
       */
      room.game.waitingForGuess =
        false;

      room.game.resultShowing =
        true;

      room.game.currentCard =
        null;

      /*
       * Resultaat naar iedereen.
       */
      io.to(
        roomCode
      ).emit(
        "guess-result",
        {
          playerId:
            currentPlayer.id,

          playerName:
            currentPlayer.name,

          step:
            room.game.currentStep,

          card,

          guess:
            normalizedGuess,

          correct,

          drinks:
            correct ? 0 : 1,

          cards:
            currentPlayer.cards,
        }
      );

      /*
       * Ook de nieuwe kaartverdeling
       * direct naar iedereen sturen.
       */
      sendGameState(roomCode);

      console.log(
        `${currentPlayer.name}: stap ${
          room.game.currentStep + 1
        }, gok ${normalizedGuess}, ${
          correct
            ? "goed"
            : "fout"
        }`
      );
    }
  );

  /*
   * =========================
   * VOLGENDE SPELER
   * =========================
   *
   * De huidige speler drukt
   * handmatig op de knop.
   */

  socket.on(
    "next-player",
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
        room.game.finished
      ) {
        return;
      }

      /*
       * Er moet eerst een resultaat
       * zijn voordat je verder kunt.
       */
      if (
        !room.game.resultShowing
      ) {
        return;
      }

      const currentPlayer =
        getCurrentPlayer(
          room
        );

      if (!currentPlayer) {
        return;
      }

      /*
       * Alleen de speler die zojuist
       * heeft gespeeld mag de beurt
       * doorgeven.
       */
      if (
        currentPlayer.id !==
        socket.id
      ) {
        return;
      }

      console.log(
        `${currentPlayer.name} geeft de beurt door`
      );

      advanceTurn(roomCode);
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
        io.to(
          roomCode
        ).emit(
          "room-closed"
        );

        delete rooms[
          roomCode
        ];

        console.log(
          `Kamer ${roomCode} gesloten`
        );

        return;
      }

      /*
       * Onthoud waar de speler
       * stond voordat hij verwijderd
       * wordt.
       */
      const removedIndex =
        room.players.findIndex(
          (player) =>
            player.id ===
            socket.id
        );

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
        room.players.length ===
        0
      ) {
        delete rooms[
          roomCode
        ];

        return;
      }

      /*
       * Als een speler vóór de
       * huidige speler verwijderd
       * werd, moet de index één
       * terug.
       */
      if (
        removedIndex !== -1 &&
        removedIndex <
          room.game.currentPlayerIndex
      ) {
        room.game.currentPlayerIndex -= 1;
      }

      /*
       * Index veilig houden.
       */
      if (
        room.game.currentPlayerIndex >=
        room.players.length
      ) {
        room.game.currentPlayerIndex =
          room.players.length - 1;
      }

      io.to(
        roomCode
      ).emit(
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