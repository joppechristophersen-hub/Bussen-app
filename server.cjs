const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

const RESULT_DELAY = 3000;
const TREE_NEXT_DELAY = 1800;
const TREE_START_DELAY = 1400;

const SERVER_VERSION = "TREE_V1";

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
    const j =
      Math.floor(
        Math.random() *
          (i + 1)
      );

    [
      shuffled[i],
      shuffled[j],
    ] = [
      shuffled[j],
      shuffled[i],
    ];
  }

  return shuffled;
}

function createDeck(
  numberOfDecks = 1
) {
  const deck = [];

  for (
    let deckNumber = 0;
    deckNumber <
    numberOfDecks;
    deckNumber++
  ) {
    for (
      const suit of SUITS
    ) {
      for (
        const cardValue of
        VALUES
      ) {
        deck.push({
          id:
            `${deckNumber}-${suit.name}-${cardValue.value}-` +
            Math.random()
              .toString(36)
              .substring(
                2,
                9
              ),

          suit:
            suit.name,

          symbol:
            suit.symbol,

          value:
            cardValue.value,

          name:
            cardValue.name,

          color:
            suit.color,
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

  for (
    let i = 0;
    i < 5;
    i++
  ) {
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
  let code =
    createRoomCode();

  while (rooms[code]) {
    code =
      createRoomCode();
  }

  return code;
}

function ensureDeck(room) {
  if (
    room.deck.length ===
    0
  ) {
    room.deck =
      createDeck(
        room.settings
          .decks
      );
  }
}

function takeCard(room) {
  ensureDeck(room);

  return (
    room.deck.pop() ||
    null
  );
}

function getCurrentPlayer(
  room
) {
  return room.players[
    room.game
      .currentPlayerIndex
  ];
}

function clearResultTimer(
  room
) {
  if (
    !room?.game
      ?.resultTimer
  ) {
    return;
  }

  clearTimeout(
    room.game
      .resultTimer
  );

  room.game.resultTimer =
    null;
}

function clearTreeTimer(
  room
) {
  if (
    !room?.game
      ?.tree?.timer
  ) {
    return;
  }

  clearTimeout(
    room.game.tree.timer
  );

  room.game.tree.timer =
    null;
}

/*
 * =========================
 * PUBLIC TREE STATE
 * =========================
 */

function publicTreeState(
  room
) {
  const tree =
    room.game.tree;

  if (!tree) {
    return null;
  }

  const currentResolverId =
    tree.status ===
      "resolving"
      ? tree.pendingResolvers[
          tree.currentResolverIndex
        ] || null
      : null;

  return {
    rows:
      tree.rows.map(
        (row) => ({
          rowNumber:
            row.rowNumber,

          drinks:
            row.rowNumber,

          cards:
            row.cards.map(
              (treeCard) => ({
                id:
                  treeCard.card
                    .id,

                revealed:
                  treeCard
                    .revealed,

                isDouble:
                  treeCard
                    .isDouble,

                card:
                  treeCard
                    .revealed
                    ? treeCard
                        .card
                    : null,
              })
            ),
        })
      ),

    status:
      tree.status,

    activeCard:
      tree.activeCard
        ? {
            rowIndex:
              tree.activeCard
                .rowIndex,

            cardIndex:
              tree.activeCard
                .cardIndex,

            rowNumber:
              tree.activeCard
                .rowNumber,

            isDouble:
              tree.activeCard
                .isDouble,

            card:
              tree.activeCard
                .card,
          }
        : null,

    pendingResolverIds:
      [...tree.pendingResolvers],

    currentResolverId,

    drinksToDistribute:
      tree.drinksToDistribute,

    revealedCount:
      tree.currentSequenceIndex +
      1,

    totalCards:
      tree.sequence.length,

    lastAction:
      tree.lastAction,

    busDriver:
      tree.busDriver,

    tieBreakRounds:
      tree.tieBreakRounds,
  };
}

/*
 * =========================
 * PUBLIC GAME STATE
 * =========================
 */

function publicGameState(
  room
) {
  return {
    serverVersion:
      SERVER_VERSION,

    phase:
      room.game.phase,

    players:
      room.players.map(
        (player) => ({
          id:
            player.id,

          name:
            player.name,

          isHost:
            player.isHost,

          cards:
            player.cards ||
            [],
        })
      ),

    currentPlayerIndex:
      room.game
        .currentPlayerIndex,

    currentStep:
      room.game
        .currentStep,

    currentCard:
      null,

    waitingForGuess:
      room.game
        .waitingForGuess,

    resultShowing:
      room.game
        .resultShowing,

    result:
      room.game.result,

    resultEndsAt:
      room.game
        .resultEndsAt,

    gameFinished:
      room.game.finished,

    tree:
      publicTreeState(
        room
      ),
  };
}

function sendGameState(
  roomCode
) {
  const room =
    rooms[roomCode];

  if (!room) {
    return;
  }

  io.to(
    roomCode
  ).emit(
    "game-state",
    publicGameState(
      room
    )
  );
}

/*
 * =========================
 * KAARTFASE
 * =========================
 */

function beginTurn(
  roomCode
) {
  const room =
    rooms[roomCode];

  if (!room) {
    return;
  }

  if (
    room.game.phase !==
      "cards" ||
    !room.game.started ||
    room.game.finished ||
    room.game
      .resultShowing ||
    room.game
      .waitingForGuess
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

  const card =
    takeCard(room);

  if (!card) {
    return;
  }

  room.game.currentCard =
    card;

  room.game.waitingForGuess =
    true;

  sendGameState(
    roomCode
  );

  io.to(
    currentPlayer.id
  ).emit(
    "card-drawn",
    {
      card,
    }
  );

  console.log(
    `[${roomCode}] Kaart gedeeld aan ${currentPlayer.name}`
  );
}

/*
 * =========================
 * DISCO
 * =========================
 */

function checkDisco(
  player,
  drawnCard
) {
  if (
    player.cards.length !==
    3
  ) {
    return false;
  }

  const suits =
    new Set([
      ...player.cards.map(
        (card) =>
          card.suit
      ),

      drawnCard.suit,
    ]);

  return (
    suits.size === 4
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
    room.game
      .currentStep;

  if (step === 0) {
    return (
      guess ===
      card.color
    );
  }

  if (step === 1) {
    const firstCard =
      player.cards[0];

    if (!firstCard) {
      return false;
    }

    if (
      guess === "hoger"
    ) {
      return (
        card.value >
        firstCard.value
      );
    }

    if (
      guess === "lager"
    ) {
      return (
        card.value <
        firstCard.value
      );
    }

    return false;
  }

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

    if (
      guess === "binnen"
    ) {
      return (
        card.value >
          lowest &&
        card.value <
          highest
      );
    }

    if (
      guess === "buiten"
    ) {
      return (
        card.value <
          lowest ||
        card.value >
          highest
      );
    }

    return false;
  }

  if (step === 3) {
    if (
      guess === "disco"
    ) {
      return checkDisco(
        player,
        card
      );
    }

    return (
      guess ===
      card.suit
    );
  }

  return false;
}

/*
 * =========================
 * BOOM MAKEN
 * =========================
 */

function drawTreeCard(
  room,
  usedValues,
  skippedCards
) {
  ensureDeck(room);

  const tries =
    room.deck.length;

  for (
    let i = 0;
    i < tries;
    i++
  ) {
    const card =
      room.deck.pop();

    if (!card) {
      break;
    }

    /*
     * Wanneer alle 13 waarden
     * al gebruikt zijn kunnen we
     * geen unieke waarde meer
     * garanderen.
     */

    if (
      usedValues.size >=
        13 ||
      !usedValues.has(
        card.value
      )
    ) {
      usedValues.add(
        card.value
      );

      return card;
    }

    skippedCards.push(
      card
    );
  }

  /*
   * Geen unieke waarde meer
   * beschikbaar in deze stap.
   * Dan pakken we alsnog een kaart.
   */

  if (
    skippedCards.length >
    0
  ) {
    const fallback =
      skippedCards.pop();

    if (fallback) {
      return fallback;
    }
  }

  return takeCard(room);
}

function buildTree(room) {
  const rowCount =
    Math.max(
      3,
      Math.min(
        5,
        Number(
          room.settings.rows
        ) || 4
      )
    );

  const rows = [];
  const sequence = [];

  const usedValues =
    new Set();

  const skippedCards =
    [];

  for (
    let rowNumber = 1;
    rowNumber <=
    rowCount;
    rowNumber++
  ) {
    const cards = [];

    const doubleIndex =
      Math.floor(
        Math.random() *
          rowNumber
      );

    for (
      let cardIndex = 0;
      cardIndex <
      rowNumber;
      cardIndex++
    ) {
      const card =
        drawTreeCard(
          room,
          usedValues,
          skippedCards
        );

      if (!card) {
        continue;
      }

      const treeCard = {
        card,

        revealed:
          false,

        isDouble:
          cardIndex ===
          doubleIndex,
      };

      cards.push(
        treeCard
      );

      sequence.push({
        rowIndex:
          rowNumber - 1,

        cardIndex,

        rowNumber,
      });
    }

    rows.push({
      rowNumber,
      cards,
    });
  }

  /*
   * Kaarten die tijdens het zoeken
   * naar unieke waardes zijn
   * overgeslagen gaan terug in de
   * stock.
   */

  room.deck =
    shuffle([
      ...room.deck,
      ...skippedCards,
    ]);

  return {
    rows,
    sequence,

    currentSequenceIndex:
      -1,

    activeCard:
      null,

    status:
      "waiting",

    pendingResolvers:
      [],

    currentResolverIndex:
      0,

    drinksToDistribute:
      0,

    lastAction:
      null,

    timer:
      null,

    busDriver:
      null,

    tieBreakRounds:
      [],
  };
}

/*
 * =========================
 * BUSCHAUFFEUR BEPALEN
 * =========================
 */

function determineBusDriver(
  roomCode
) {
  const room =
    rooms[roomCode];

  if (
    !room ||
    !room.game.tree
  ) {
    return;
  }

  const tree =
    room.game.tree;

  const highestCardCount =
    Math.max(
      ...room.players.map(
        (player) =>
          player.cards.length
      )
    );

  let candidates =
    room.players.filter(
      (player) =>
        player.cards.length ===
        highestCardCount
    );

  const tieBreakRounds =
    [];

  let roundNumber = 1;
  let safety = 0;

  while (
    candidates.length >
      1 &&
    safety < 20
  ) {
    safety++;

    const draws =
      candidates.map(
        (player) => {
          const card =
            takeCard(room);

          return {
            playerId:
              player.id,

            playerName:
              player.name,

            card,
          };
        }
      );

    const validDraws =
      draws.filter(
        (draw) =>
          draw.card
      );

    if (
      validDraws.length ===
      0
    ) {
      break;
    }

    const lowestValue =
      Math.min(
        ...validDraws.map(
          (draw) =>
            draw.card.value
        )
      );

    tieBreakRounds.push({
      round:
        roundNumber,

      draws:
        validDraws,
    });

    candidates =
      candidates.filter(
        (player) =>
          validDraws.some(
            (draw) =>
              draw.playerId ===
                player.id &&
              draw.card.value ===
                lowestValue
          )
      );

    roundNumber++;
  }

  const busDriver =
    candidates[0] ||
    room.players[0];

  tree.busDriver = {
    id:
      busDriver.id,

    name:
      busDriver.name,

    remainingCards:
      busDriver.cards
        .length,
  };

  tree.tieBreakRounds =
    tieBreakRounds;

  tree.status =
    "finished";

  room.game.phase =
    "tree-finished";

  room.game.finished =
    true;

  sendGameState(
    roomCode
  );

  console.log(
    `[${roomCode}] ${busDriver.name} gaat de bus in`
  );
}

/*
 * =========================
 * VOLGENDE BOOMKAART
 * =========================
 */

function queueNextTreeCard(
  roomCode,
  delay =
    TREE_NEXT_DELAY
) {
  const room =
    rooms[roomCode];

  if (
    !room ||
    !room.game.tree
  ) {
    return;
  }

  clearTreeTimer(room);

  room.game.tree.timer =
    setTimeout(
      () => {
        revealNextTreeCard(
          roomCode
        );
      },
      delay
    );
}

function revealNextTreeCard(
  roomCode
) {
  const room =
    rooms[roomCode];

  if (
    !room ||
    !room.game.tree ||
    room.game.phase !==
      "tree"
  ) {
    return;
  }

  const tree =
    room.game.tree;

  tree.currentSequenceIndex +=
    1;

  /*
   * Hele boom geweest.
   */

  if (
    tree.currentSequenceIndex >=
    tree.sequence.length
  ) {
    tree.activeCard =
      null;

    tree.status =
      "finished";

    sendGameState(
      roomCode
    );

    determineBusDriver(
      roomCode
    );

    return;
  }

  const location =
    tree.sequence[
      tree.currentSequenceIndex
    ];

  const row =
    tree.rows[
      location.rowIndex
    ];

  const treeCard =
    row.cards[
      location.cardIndex
    ];

  treeCard.revealed =
    true;

  const drinks =
    location.rowNumber *
    (treeCard.isDouble
      ? 2
      : 1);

  tree.activeCard = {
    rowIndex:
      location.rowIndex,

    cardIndex:
      location.cardIndex,

    rowNumber:
      location.rowNumber,

    isDouble:
      treeCard.isDouble,

    card:
      treeCard.card,
  };

  tree.drinksToDistribute =
    drinks;

  tree.lastAction =
    null;

  /*
   * Welke spelers hebben
   * dezelfde waarde?
   */

  tree.pendingResolvers =
    room.players
      .filter(
        (player) =>
          player.cards.some(
            (card) =>
              card.value ===
              treeCard.card
                .value
          )
      )
      .map(
        (player) =>
          player.id
      );

  tree.currentResolverIndex =
    0;

  if (
    tree.pendingResolvers
      .length === 0
  ) {
    tree.status =
      "no-match";

    sendGameState(
      roomCode
    );

    console.log(
      `[${roomCode}] Boom: ${treeCard.card.name} ${treeCard.card.symbol} - geen matches`
    );

    queueNextTreeCard(
      roomCode
    );

    return;
  }

  tree.status =
    "resolving";

  sendGameState(
    roomCode
  );

  console.log(
    `[${roomCode}] Boom: ${treeCard.card.name} ${treeCard.card.symbol} - ${tree.pendingResolvers.length} match(es)`
  );
}

/*
 * =========================
 * VOLGENDE MATCHENDE SPELER
 * =========================
 */

function advanceTreeResolver(
  roomCode
) {
  const room =
    rooms[roomCode];

  if (
    !room ||
    !room.game.tree
  ) {
    return;
  }

  const tree =
    room.game.tree;

  tree.currentResolverIndex +=
    1;

  if (
    tree.currentResolverIndex <
    tree.pendingResolvers
      .length
  ) {
    tree.status =
      "resolving";

    sendGameState(
      roomCode
    );

    return;
  }

  tree.status =
    "resolved";

  sendGameState(
    roomCode
  );

  queueNextTreeCard(
    roomCode
  );
}

/*
 * =========================
 * BOOM STARTEN
 * =========================
 */

function startTree(
  roomCode
) {
  const room =
    rooms[roomCode];

  if (!room) {
    return;
  }

  clearResultTimer(
    room
  );

  room.game.phase =
    "tree";

  room.game.currentCard =
    null;

  room.game.waitingForGuess =
    false;

  room.game.resultShowing =
    false;

  room.game.result =
    null;

  room.game.resultEndsAt =
    null;

  room.game.currentStep =
    4;

  room.game.tree =
    buildTree(room);

  sendGameState(
    roomCode
  );

  console.log(
    `[${roomCode}] Boom gestart`
  );

  queueNextTreeCard(
    roomCode,
    TREE_START_DELAY
  );
}

/*
 * =========================
 * VOLGENDE SPELER KAARTFASE
 * =========================
 */

function advanceTurn(
  roomCode
) {
  const room =
    rooms[roomCode];

  if (!room) {
    return;
  }

  clearResultTimer(
    room
  );

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

  if (
    room.game.currentPlayerIndex <
    room.players.length -
      1
  ) {
    room.game.currentPlayerIndex +=
      1;

    beginTurn(
      roomCode
    );

    return;
  }

  room.game.currentPlayerIndex =
    0;

  room.game.currentStep +=
    1;

  /*
   * Vier kaart-rondes gehad.
   *
   * Nu niet stoppen:
   * BOOM STARTEN.
   */

  if (
    room.game.currentStep >=
    4
  ) {
    startTree(
      roomCode
    );

    return;
  }

  beginTurn(
    roomCode
  );
}

/*
 * =========================
 * RESULTAAT TIMER KAARTFASE
 * =========================
 */

function startResultTimer(
  roomCode
) {
  const room =
    rooms[roomCode];

  if (!room) {
    return;
  }

  clearResultTimer(
    room
  );

  room.game.resultSequence +=
    1;

  const sequence =
    room.game.resultSequence;

  room.game.resultEndsAt =
    Date.now() +
    RESULT_DELAY;

  room.game.resultTimer =
    setTimeout(
      () => {
        const currentRoom =
          rooms[roomCode];

        if (!currentRoom) {
          return;
        }

        if (
          currentRoom.game
            .resultSequence !==
          sequence
        ) {
          return;
        }

        if (
          !currentRoom.game
            .resultShowing
        ) {
          return;
        }

        advanceTurn(
          roomCode
        );
      },
      RESULT_DELAY
    );
}

/*
 * =========================
 * SOCKET.IO
 * =========================
 */

io.on(
  "connection",
  (socket) => {
    console.log(
      "Speler verbonden:",
      socket.id
    );

    /*
     * KAMER MAKEN
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

        rooms[
          roomCode
        ] = {
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
                settings
                  ?.checkpoints
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

              cards:
                [],
            },
          ],

          deck:
            [],

          game: {
            started:
              false,

            phase:
              "cards",

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

            tree:
              null,
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
            rooms[
              roomCode
            ].players,
        });
      }
    );

    /*
     * JOINEN
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
            roomCode ||
              ""
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

          cards:
            [],
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
      }
    );

    /*
     * SPELER VERWIJDEREN
     */

    socket.on(
      "remove-player",
      (
        playerId
      ) => {
        const roomCode =
          socket.roomCode;

        const room =
          rooms[
            roomCode
          ];

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
     * SPEL STARTEN
     */

    socket.on(
      "start-game",
      () => {
        const roomCode =
          socket.roomCode;

        const room =
          rooms[
            roomCode
          ];

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

        clearResultTimer(
          room
        );

        clearTreeTimer(
          room
        );

        room.deck =
          createDeck(
            room.settings
              .decks
          );

        room.players.forEach(
          (player) => {
            player.cards =
              [];
          }
        );

        room.game = {
          started:
            true,

          phase:
            "cards",

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

          tree:
            null,
        };

        io.to(
          roomCode
        ).emit(
          "game-started"
        );

        beginTurn(
          roomCode
        );
      }
    );

    /*
     * KAART GOK
     */

    socket.on(
      "guess-card",
      ({
        guess,
      }) => {
        const roomCode =
          socket.roomCode;

        const room =
          rooms[
            roomCode
          ];

        if (!room) {
          return;
        }

        if (
          room.game.phase !==
            "cards" ||
          !room.game.started ||
          room.game.finished ||
          !room.game
            .waitingForGuess ||
          room.game
            .resultShowing
        ) {
          return;
        }

        const currentPlayer =
          getCurrentPlayer(
            room
          );

        if (
          !currentPlayer ||
          currentPlayer.id !==
            socket.id
        ) {
          return;
        }

        const card =
          room.game
            .currentCard;

        if (!card) {
          return;
        }

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

        const isDisco =
          room.game
            .currentStep ===
            3 &&
          normalizedGuess ===
            "disco";

        currentPlayer.cards.push(
          card
        );

        const result = {
          playerId:
            currentPlayer.id,

          playerName:
            currentPlayer.name,

          step:
            room.game
              .currentStep,

          card,

          guess:
            normalizedGuess,

          correct,

          drinks:
            correct
              ? 0
              : 1,

          isDisco,
        };

        room.game.currentCard =
          null;

        room.game.waitingForGuess =
          false;

        room.game.resultShowing =
          true;

        room.game.result =
          result;

        startResultTimer(
          roomCode
        );

        io.to(
          roomCode
        ).emit(
          "guess-result",
          result
        );

        sendGameState(
          roomCode
        );
      }
    );

    /*
     * =========================
     * BOOM: SLOKKEN VERDELEN
     * =========================
     */

    socket.on(
      "tree-distribute",
      (
        {
          distribution,
        },
        callback
      ) => {
        const done =
          typeof callback ===
          "function"
            ? callback
            : () => {};

        const roomCode =
          socket.roomCode;

        const room =
          rooms[
            roomCode
          ];

        if (
          !room ||
          !room.game.tree ||
          room.game.phase !==
            "tree"
        ) {
          done({
            success:
              false,

            message:
              "De boom is niet actief.",
          });

          return;
        }

        const tree =
          room.game.tree;

        if (
          tree.status !==
          "resolving"
        ) {
          done({
            success:
              false,

            message:
              "Er is nu geen match om af te handelen.",
          });

          return;
        }

        const resolverId =
          tree.pendingResolvers[
            tree.currentResolverIndex
          ];

        if (
          resolverId !==
          socket.id
        ) {
          done({
            success:
              false,

            message:
              "Een andere speler is nu aan de beurt.",
          });

          return;
        }

        const giver =
          room.players.find(
            (player) =>
              player.id ===
              socket.id
          );

        if (
          !giver ||
          !tree.activeCard
        ) {
          done({
            success:
              false,

            message:
              "Speler of boomkaart niet gevonden.",
          });

          return;
        }

        const safeDistribution =
          Array.isArray(
            distribution
          )
            ? distribution
            : [];

        let total = 0;
        const receivers =
          [];

        for (
          const item of
          safeDistribution
        ) {
          const count =
            Number(
              item?.count
            );

          const receiver =
            room.players.find(
              (player) =>
                player.id ===
                item?.playerId
            );

          if (
            !receiver ||
            receiver.id ===
              giver.id ||
            !Number.isInteger(
              count
            ) ||
            count <= 0
          ) {
            continue;
          }

          total +=
            count;

          receivers.push({
            playerId:
              receiver.id,

            playerName:
              receiver.name,

            count,
          });
        }

        if (
          total !==
          tree.drinksToDistribute
        ) {
          done({
            success:
              false,

            message:
              `Verdeel precies ${tree.drinksToDistribute} slokken.`,
          });

          return;
        }

        /*
         * Matchende kaart uit
         * de hand verwijderen.
         */

        const matchingCardIndex =
          giver.cards.findIndex(
            (card) =>
              card.value ===
              tree.activeCard
                .card.value
          );

        if (
          matchingCardIndex ===
          -1
        ) {
          done({
            success:
              false,

            message:
              "Je hebt geen matchende kaart meer.",
          });

          return;
        }

        giver.cards.splice(
          matchingCardIndex,
          1
        );

        tree.lastAction = {
          type:
            "distributed",

          giverId:
            giver.id,

          giverName:
            giver.name,

          total,

          receivers,
        };

        done({
          success:
            true,
        });

        sendGameState(
          roomCode
        );

        advanceTreeResolver(
          roomCode
        );
      }
    );

    /*
     * =========================
     * BOOM: MATCH OVERSLAAN
     * =========================
     */

    socket.on(
      "tree-skip-match",
      (
        callback
      ) => {
        const done =
          typeof callback ===
          "function"
            ? callback
            : () => {};

        const roomCode =
          socket.roomCode;

        const room =
          rooms[
            roomCode
          ];

        if (
          !room ||
          !room.game.tree ||
          room.game.phase !==
            "tree"
        ) {
          done({
            success:
              false,
          });

          return;
        }

        const tree =
          room.game.tree;

        const resolverId =
          tree.pendingResolvers[
            tree.currentResolverIndex
          ];

        if (
          tree.status !==
            "resolving" ||
          resolverId !==
            socket.id
        ) {
          done({
            success:
              false,
          });

          return;
        }

        const player =
          room.players.find(
            (item) =>
              item.id ===
              socket.id
          );

        tree.lastAction = {
          type:
            "skipped",

          giverId:
            socket.id,

          giverName:
            player?.name ||
            "Speler",

          total:
            0,

          receivers:
            [],
        };

        done({
          success:
            true,
        });

        sendGameState(
          roomCode
        );

        advanceTreeResolver(
          roomCode
        );
      }
    );

    /*
     * DISCONNECT
     */

    socket.on(
      "disconnect",
      () => {
        const roomCode =
          socket.roomCode;

        if (
          !roomCode ||
          !rooms[
            roomCode
          ]
        ) {
          return;
        }

        const room =
          rooms[
            roomCode
          ];

        if (
          room.hostId ===
          socket.id
        ) {
          clearResultTimer(
            room
          );

          clearTreeTimer(
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
          removedIndex ===
          -1
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

          clearTreeTimer(
            room
          );

          delete rooms[
            roomCode
          ];

          return;
        }

        if (
          removedIndex <
          room.game
            .currentPlayerIndex
        ) {
          room.game.currentPlayerIndex -=
            1;
        }

        if (
          room.game
            .currentPlayerIndex >=
          room.players.length
        ) {
          room.game.currentPlayerIndex =
            0;
        }

        /*
         * Als iemand tijdens de boom
         * verdwijnt, verwijderen we hem
         * ook uit de match-queue.
         */

        if (
          room.game.tree
        ) {
          room.game.tree
            .pendingResolvers =
            room.game.tree
              .pendingResolvers
              .filter(
                (id) =>
                  id !==
                  socket.id
              );

          if (
            room.game.tree
              .currentResolverIndex >=
            room.game.tree
              .pendingResolvers
              .length
          ) {
            room.game.tree
              .currentResolverIndex =
              Math.max(
                0,
                room.game.tree
                  .pendingResolvers
                  .length -
                  1
              );
          }
        }

        io.to(
          roomCode
        ).emit(
          "players-updated",
          room.players
        );

        sendGameState(
          roomCode
        );
      }
    );
  }
);

console.log(
  `Bussen server ${SERVER_VERSION} draait op poort ${PORT}`
);