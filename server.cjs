const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;
const RESULT_DELAY = 3000;
const SERVER_VERSION = "AUTO_TURN_V3";

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
            Math.random().toString(36).substring(2, 9),

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

function getCurrentPlayer(room) {
  return room.players[
    room.game.currentPlayerIndex
  ];
}

function clearResultTimer(room) {
  if (!room?.game?.resultTimer) {
    return;
  }

  clearTimeout(room.game.resultTimer);

  room.game.resultTimer = null;
}

/*
 * =========================
 * GAME STATE
 * =========================
 */

function publicGameState(room) {
  return {
    serverVersion: SERVER_VERSION,

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

    /*
     * De geheime kaart sturen we
     * nooit naar alle spelers.
     */
    currentCard: null,

    waitingForGuess:
      room.game.waitingForGuess,

    resultShowing:
      room.game.resultShowing,

    result:
      room.game.result,

    resultEndsAt:
      room.game.resultEndsAt,

    gameFinished:
      room.game.finished,
  };
}

function sendGameState(roomCode) {
  const room = rooms[roomCode];

  if (!room) {
    return;
  }

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
  card
) {
  const step =
    room.game.currentStep;

  /*
   * RONDE 1
   * ROOD / ZWART
   */

  if (step === 0) {
    return guess === card.color;
  }

  /*
   * RONDE 2
   * HOGER / LAGER
   */

  if (step === 1) {
    const firstCard =
      player.cards[0];

    if (!firstCard) {
      return false;
    }

    if (guess === "hoger") {
      return (
        card.value >
        firstCard.value
      );
    }

    if (guess === "lager") {
      return (
        card.value <
        firstCard.value
      );
    }

    return false;
  }

  /*
   * RONDE 3
   * BINNEN / BUITEN
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
        card.value > lowest &&
        card.value < highest
      );
    }

    if (guess === "buiten") {
      return (
        card.value < lowest ||
        card.value > highest
      );
    }

    return false;
  }

  /*
   * RONDE 4
   * FIGUUR
   */

  if (step === 3) {
    return (
      guess === card.suit
    );
  }

  return false;
}

/*
 * =========================
 * VOLGENDE BEURT
 * =========================
 *
 * DIT IS DE ENIGE FUNCTIE
 * DIE DE NORMALE BEURT VERANDERT.
 */

function advanceTurn(roomCode) {
  const room = rooms[roomCode];

  if (!room) {
    return;
  }

  clearResultTimer(room);

  /*
   * Resultaatscherm afsluiten.
   */

  room.game.resultShowing =
    false;

  room.game.result =
    null;

  room.game.resultEndsAt =
    null;

  room.game.currentCard =
    null;

  room.game.waitingForGuess =
    false;

  /*
   * =========================
   * VOLGENDE SPELER
   * =========================
   */

  if (
    room.game.currentPlayerIndex <
    room.players.length - 1
  ) {
    room.game.currentPlayerIndex += 1;

    console.log(
      `[${roomCode}] Volgende speler: ${
        room.players[
          room.game.currentPlayerIndex
        ].name
      }`
    );

    sendGameState(roomCode);

    return;
  }

  /*
   * =========================
   * LAATSTE SPELER VAN DE RONDE
   * =========================
   *
   * Terug naar speler 1.
   */

  room.game.currentPlayerIndex = 0;

  /*
   * Daarna volgende ronde.
   */

  room.game.currentStep += 1;

  /*
   * =========================
   * ALLE 4 RONDES KLAAR
   * =========================
   */

  if (
    room.game.currentStep >= 4
  ) {
    room.game.finished =
      true;

    console.log(
      `[${roomCode}] Vier kaarten compleet`
    );

    io.to(roomCode).emit(
      "four-cards-complete"
    );

    sendGameState(roomCode);

    return;
  }

  console.log(
    `[${roomCode}] Nieuwe ronde ${
      room.game.currentStep + 1
    }, speler 1: ${
      room.players[0].name
    }`
  );

  sendGameState(roomCode);
}

/*
 * =========================
 * RESULTAAT + 3 SECONDEN
 * =========================
 */

function startResultTimer(
  roomCode
) {
  const room = rooms[roomCode];

  if (!room) {
    return;
  }

  clearResultTimer(room);

  /*
   * Elke uitslag krijgt een uniek nummer.
   *
   * Hierdoor kan een oude timer nooit
   * later alsnog een verkeerde beurt
   * veranderen.
   */

  room.game.resultSequence += 1;

  const thisResultSequence =
    room.game.resultSequence;

  room.game.resultEndsAt =
    Date.now() +
    RESULT_DELAY;

  room.game.resultTimer =
    setTimeout(() => {
      const currentRoom =
        rooms[roomCode];

      if (!currentRoom) {
        return;
      }

      /*
       * Alleen doorgaan als dit nog
       * steeds hetzelfde resultaat is.
       */

      if (
        currentRoom.game.resultSequence !==
        thisResultSequence
      ) {
        return;
      }

      if (
        !currentRoom.game.resultShowing
      ) {
        return;
      }

      console.log(
        `[${roomCode}] 3 seconden voorbij`
      );

      advanceTurn(roomCode);
    }, RESULT_DELAY);
}

/*
 * =========================
 * SOCKET CONNECTION
 * =========================
 */

io.on("connection", (socket) => {
  console.log(
    "Speler verbonden:",
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

      rooms[roomCode] = {
        hostId:
          socket.id,

        settings: {
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
        },

        players: [
          {
            id:
              socket.id,

            name:
              String(
                playerName ||
                  "Host"
              ).trim(),

            isHost:
              true,

            cards: [],
          },
        ],

        deck: [],

        game: {
          started:
            false,

          currentPlayerIndex:
            0,

          currentStep:
            0,

          currentCard:
            null,

          waitingForGuess:
            false,

          resultShowing:
            false,

          result:
            null,

          resultEndsAt:
            null,

          resultTimer:
            null,

          resultSequence:
            0,

          finished:
            false,
        },
      };

      socket.join(
        roomCode
      );

      socket.roomCode =
        roomCode;

      callback({
        success:
          true,

        roomCode,

        players:
          rooms[roomCode]
            .players,
      });

      console.log(
        `[${roomCode}] Kamer aangemaakt`
      );
    }
  );

  /*
   * =========================
   * JOINEN
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
        rooms[
          normalizedCode
        ];

      if (!room) {
        callback({
          success:
            false,

          message:
            "Kamer bestaat niet.",
        });

        return;
      }

      if (
        room.game.started
      ) {
        callback({
          success:
            false,

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
          success:
            false,

          message:
            "Deze kamer zit vol.",
        });

        return;
      }

      const player = {
        id:
          socket.id,

        name:
          String(
            playerName ||
              "Speler"
          ).trim(),

        isHost:
          false,

        cards: [],
      };

      room.players.push(
        player
      );

      socket.join(
        normalizedCode
      );

      socket.roomCode =
        normalizedCode;

      callback({
        success:
          true,

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
        `[${normalizedCode}] ${player.name} joined`
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

      if (!room) {
        return;
      }

      if (
        room.hostId !==
        socket.id
      ) {
        return;
      }

      const player =
        room.players.find(
          (item) =>
            item.id ===
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
          (item) =>
            item.id !==
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

      if (!room) {
        return;
      }

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

      clearResultTimer(room);

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
        started:
          true,

        currentPlayerIndex:
          0,

        currentStep:
          0,

        currentCard:
          null,

        waitingForGuess:
          false,

        resultShowing:
          false,

        result:
          null,

        resultEndsAt:
          null,

        resultTimer:
          null,

        resultSequence:
          0,

        finished:
          false,
      };

      io.to(
        roomCode
      ).emit(
        "game-started"
      );

      console.log(
        `[${roomCode}] Spel gestart`
      );

      sendGameState(
        roomCode
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

      if (!room) {
        return;
      }

      if (
        !room.game.started ||
        room.game.finished ||
        room.game.waitingForGuess ||
        room.game.resultShowing
      ) {
        return;
      }

      const currentPlayer =
        getCurrentPlayer(room);

      if (!currentPlayer) {
        return;
      }

      /*
       * Alleen de huidige speler
       * mag trekken.
       */

      if (
        currentPlayer.id !==
        socket.id
      ) {
        return;
      }

      if (
        room.deck.length ===
        0
      ) {
        room.deck =
          createDeck(
            room.settings.decks
          );
      }

      const card =
        room.deck.pop();

      if (!card) {
        return;
      }

      room.game.currentCard =
        card;

      room.game.waitingForGuess =
        true;

      /*
       * Alleen de speler zelf krijgt
       * de geheime kaart.
       */

      io.to(
        socket.id
      ).emit(
        "card-drawn",
        {
          card,
        }
      );

      /*
       * Iedereen krijgt wel de status
       * dat er nu een gok bezig is.
       */

      sendGameState(
        roomCode
      );

      console.log(
        `[${roomCode}] ${currentPlayer.name} trekt een kaart`
      );
    }
  );

  /*
   * =========================
   * GOK
   * =========================
   */

  socket.on(
    "guess-card",
    ({ guess }) => {
      const roomCode =
        socket.roomCode;

      const room =
        rooms[roomCode];

      if (!room) {
        return;
      }

      if (
        !room.game.started ||
        room.game.finished
      ) {
        return;
      }

      if (
        !room.game.waitingForGuess ||
        room.game.resultShowing
      ) {
        return;
      }

      const currentPlayer =
        getCurrentPlayer(room);

      if (!currentPlayer) {
        return;
      }

      /*
       * SERVER IS SCHEIDSRECHTER.
       */

      if (
        currentPlayer.id !==
        socket.id
      ) {
        return;
      }

      const card =
        room.game.currentCard;

      if (!card) {
        return;
      }

      const normalizedGuess =
        String(
          guess || ""
        )
          .trim()
          .toLowerCase();

      /*
       * Goed/fout wordt ALLEEN
       * op de server berekend.
       */

      const correct =
        checkGuess(
          room,
          currentPlayer,
          normalizedGuess,
          card
        );

      /*
       * Kaart toevoegen.
       */

      currentPlayer.cards.push(
        card
      );

      /*
       * Resultaat maken.
       */

      const result = {
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
      };

      room.game.currentCard =
        null;

      room.game.waitingForGuess =
        false;

      room.game.resultShowing =
        true;

      room.game.result =
        result;

      /*
       * Timer aanzetten.
       */

      startResultTimer(
        roomCode
      );

      /*
       * COMPATIBILITEIT:
       *
       * Resultaat ook als apart event
       * versturen.
       *
       * Daardoor ziet de frontend het
       * resultaat zelfs als een game-state
       * event vertraagd aankomt.
       */

      io.to(
        roomCode
      ).emit(
        "guess-result",
        result
      );

      /*
       * Daarna ook de complete
       * server state sturen.
       */

      sendGameState(
        roomCode
      );

      console.log(
        `[${roomCode}] ${currentPlayer.name}: ${normalizedGuess} → ${
          correct
            ? "GOED"
            : "FOUT"
        }`
      );
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
        clearResultTimer(
          room
        );

        io.to(
          roomCode
        ).emit(
          "room-closed"
        );

        delete rooms[
          roomCode
        ];

        return;
      }

      const removedIndex =
        room.players.findIndex(
          (player) =>
            player.id ===
            socket.id
        );

      if (
        removedIndex === -1
      ) {
        return;
      }

      room.players.splice(
        removedIndex,
        1
      );

      if (
        room.players.length ===
        0
      ) {
        clearResultTimer(
          room
        );

        delete rooms[
          roomCode
        ];

        return;
      }

      /*
       * Beurtindex corrigeren.
       */

      if (
        removedIndex <
        room.game.currentPlayerIndex
      ) {
        room.game.currentPlayerIndex -=
          1;
      }

      if (
        room.game.currentPlayerIndex >=
        room.players.length
      ) {
        room.game.currentPlayerIndex =
          0;
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
  `Bussen server ${SERVER_VERSION} draait op poort ${PORT}`
);