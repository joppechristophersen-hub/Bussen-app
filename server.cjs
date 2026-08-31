const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

const RESULT_DELAY = 3000;
const TREE_NEXT_DELAY = 1800;
const TREE_START_DELAY = 1400;
const TIE_BREAK_DELAY = 3000;
const BUS_RESULT_DELAY = 2000;

const SERVER_VERSION = "BUS_V4_TIEBREAK_RESTART";

const io = new Server(PORT, {
  cors: {
    origin: "*",
  },
});

const rooms = {};

const SUITS = [
  { name: "harten", symbol: "♥", color: "rood" },
  { name: "ruiten", symbol: "♦", color: "rood" },
  { name: "klaveren", symbol: "♣", color: "zwart" },
  { name: "schoppen", symbol: "♠", color: "zwart" },
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
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [
      result[j],
      result[i],
    ];
  }

  return result;
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

/*
 * =========================
 * STOCK / AFLEGSTAPEL
 * =========================
 */

function addToDiscard(room, card) {
  if (!card) {
    return;
  }

  const alreadyInDiscard =
    room.discardPile.some(
      (item) => item.id === card.id
    );

  const stillInStock =
    room.deck.some(
      (item) => item.id === card.id
    );

  if (
    alreadyInDiscard ||
    stillInStock
  ) {
    return;
  }

  room.discardPile.push(card);
}

function refillStock(room) {
  if (room.deck.length > 0) {
    return;
  }

  if (room.discardPile.length === 0) {
    console.log(
      "WAARSCHUWING: stock en aflegstapel zijn leeg."
    );

    return;
  }

  console.log(
    `Stock leeg. ${room.discardPile.length} kaarten opnieuw geschud.`
  );

  room.deck = shuffle(
    room.discardPile
  );

  room.discardPile = [];
}

function takeCard(room) {
  refillStock(room);

  return room.deck.pop() || null;
}

/*
 * =========================
 * TIMERS
 * =========================
 */

function clearResultTimer(room) {
  if (room?.game?.resultTimer) {
    clearTimeout(
      room.game.resultTimer
    );

    room.game.resultTimer = null;
  }
}

function clearTreeTimer(room) {
  if (room?.game?.tree?.timer) {
    clearTimeout(
      room.game.tree.timer
    );

    room.game.tree.timer = null;
  }
}

function clearBusTimer(room) {
  if (room?.game?.bus?.timer) {
    clearTimeout(
      room.game.bus.timer
    );

    room.game.bus.timer = null;
  }
}

function clearAllTimers(room) {
  clearResultTimer(room);
  clearTreeTimer(room);
  clearBusTimer(room);
}

function getCurrentPlayer(room) {
  return room.players[
    room.game.currentPlayerIndex
  ];
}

/*
 * =========================
 * PUBLIC TREE
 * =========================
 */

function publicTreeState(room) {
  const tree = room.game.tree;

  if (!tree) {
    return null;
  }

  const currentResolverId =
    tree.status === "resolving"
      ? tree.pendingResolvers[
          tree.currentResolverIndex
        ] || null
      : null;

  return {
    rows: tree.rows.map((row) => ({
      rowNumber: row.rowNumber,
      drinks: row.rowNumber,

      cards: row.cards.map(
        (treeCard) => ({
          id: treeCard.card.id,
          revealed: treeCard.revealed,
          isDouble: treeCard.isDouble,

          card: treeCard.revealed
            ? treeCard.card
            : null,
        })
      ),
    })),

    status: tree.status,

    activeCard:
      tree.activeCard
        ? {
            rowIndex:
              tree.activeCard.rowIndex,

            cardIndex:
              tree.activeCard.cardIndex,

            rowNumber:
              tree.activeCard.rowNumber,

            isDouble:
              tree.activeCard.isDouble,

            card:
              tree.activeCard.card,
          }
        : null,

    pendingResolverIds: [
      ...tree.pendingResolvers,
    ],

    currentResolverId,

    drinksToDistribute:
      tree.drinksToDistribute,

    revealedCount:
      Math.min(
        tree.currentSequenceIndex + 1,
        tree.sequence.length
      ),

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
 * PUBLIC BUS
 * =========================
 */

function publicBusState(room) {
  const bus = room.game.bus;

  if (!bus) {
    return null;
  }

  return {
    status:
      bus.status,

    lengthCard:
      bus.lengthCard,

    openCountCard:
      bus.openCountCard,

    length:
      bus.length,

    initialOpenCount:
      bus.initialOpenCount,

    activeDriverId:
      bus.activeDriverId,

    riders: [
      ...bus.riders,
    ],

    doubleRule:
      bus.doubleRule,

    checkpoints: [
      ...bus.checkpoints,
    ],

    currentIndex:
      bus.currentIndex,

    piles:
      bus.piles.map(
        (pile, index) => ({
          index,

          revealed:
            pile.revealed,

          card:
            pile.revealed
              ? pile.card
              : null,

          isCheckpoint:
            bus.checkpoints.includes(
              index
            ),
        })
      ),

    result:
      bus.result,

    finished:
      bus.finished,
  };
}

/*
 * =========================
 * PUBLIC GAME STATE
 * =========================
 */

function publicGameState(room) {
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
            player.cards || [],
        })
      ),

    currentPlayerIndex:
      room.game.currentPlayerIndex,

    currentStep:
      room.game.currentStep,

    currentCard:
      null,

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

    tree:
      publicTreeState(room),

    bus:
      publicBusState(room),
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
 * NIEUW SPEL INITIALISEREN
 * =========================
 */

function initializeGame(roomCode) {
  const room = rooms[roomCode];

  if (!room) {
    return;
  }

  clearAllTimers(room);

  room.deck =
    createDeck(
      room.settings.decks
    );

  room.discardPile = [];

  room.players.forEach(
    (player) => {
      player.cards = [];
    }
  );

  room.game = {
    started: true,

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

    bus:
      null,
  };

  io.to(roomCode).emit(
    "game-started"
  );

  beginTurn(roomCode);
}

/*
 * =========================
 * KAARTFASE
 * =========================
 */

function beginTurn(roomCode) {
  const room = rooms[roomCode];

  if (!room) {
    return;
  }

  if (
    room.game.phase !== "cards" ||
    !room.game.started ||
    room.game.finished ||
    room.game.resultShowing ||
    room.game.waitingForGuess
  ) {
    return;
  }

  const currentPlayer =
    getCurrentPlayer(room);

  if (!currentPlayer) {
    return;
  }

  const card = takeCard(room);

  if (!card) {
    return;
  }

  room.game.currentCard = card;
  room.game.waitingForGuess = true;

  sendGameState(roomCode);

  io.to(
    currentPlayer.id
  ).emit(
    "card-drawn",
    {
      card,
    }
  );
}

function checkDisco(
  player,
  drawnCard
) {
  if (
    player.cards.length !== 3
  ) {
    return false;
  }

  const suits =
    new Set([
      ...player.cards.map(
        (card) => card.suit
      ),

      drawnCard.suit,
    ]);

  return suits.size === 4;
}

function checkGuess(
  room,
  player,
  guess,
  card
) {
  const step =
    room.game.currentStep;

  if (step === 0) {
    return guess === card.color;
  }

  if (step === 1) {
    const first =
      player.cards[0];

    if (!first) {
      return false;
    }

    if (
      guess === "hoger"
    ) {
      return (
        card.value >
        first.value
      );
    }

    if (
      guess === "lager"
    ) {
      return (
        card.value <
        first.value
      );
    }

    return false;
  }

  if (step === 2) {
    const first =
      player.cards[0];

    const second =
      player.cards[1];

    if (
      !first ||
      !second
    ) {
      return false;
    }

    const low =
      Math.min(
        first.value,
        second.value
      );

    const high =
      Math.max(
        first.value,
        second.value
      );

    if (
      guess === "binnen"
    ) {
      return (
        card.value > low &&
        card.value < high
      );
    }

    if (
      guess === "buiten"
    ) {
      return (
        card.value < low ||
        card.value > high
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
      guess === card.suit
    );
  }

  return false;
}

/*
 * =========================
 * BOOM BOUWEN
 * =========================
 */

function drawTreeCard(
  room,
  usedValues,
  skippedCards
) {
  const attempts =
    room.deck.length;

  for (
    let i = 0;
    i < attempts;
    i++
  ) {
    const card =
      takeCard(room);

    if (!card) {
      break;
    }

    if (
      usedValues.size >= 13 ||
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

  if (
    skippedCards.length > 0
  ) {
    return (
      skippedCards.pop() ||
      null
    );
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

  const skippedCards = [];

  for (
    let rowNumber = 1;
    rowNumber <= rowCount;
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
      cardIndex < rowNumber;
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

      cards.push({
        card,

        revealed:
          false,

        isDouble:
          cardIndex ===
          doubleIndex,
      });

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

function queueNextTreeCard(
  roomCode,
  delay =
    TREE_NEXT_DELAY
) {
  const room = rooms[roomCode];

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

function advanceTreeResolver(
  roomCode
) {
  const room = rooms[roomCode];

  if (
    !room ||
    !room.game.tree
  ) {
    return;
  }

  const tree =
    room.game.tree;

  tree.currentResolverIndex += 1;

  if (
    tree.currentResolverIndex <
    tree.pendingResolvers.length
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

  sendGameState(roomCode);

  queueNextTreeCard(
    roomCode
  );
}

/*
 * =========================
 * KAARTEN NAAR AFLEGSTAPEL
 * =========================
 */

function prepareUsedCardsForBus(room) {
  const seen = new Set();

  function collect(card) {
    if (
      !card ||
      seen.has(card.id)
    ) {
      return;
    }

    seen.add(card.id);

    addToDiscard(
      room,
      card
    );
  }

  for (
    const player of room.players
  ) {
    for (
      const card of
      player.cards || []
    ) {
      collect(card);
    }
  }

  if (room.game.tree) {
    for (
      const row of
      room.game.tree.rows
    ) {
      for (
        const treeCard of
        row.cards
      ) {
        collect(
          treeCard.card
        );
      }
    }

    for (
      const round of
      room.game.tree
        .tieBreakRounds ||
      []
    ) {
      for (
        const draw of
        round.draws || []
      ) {
        collect(
          draw.card
        );
      }
    }
  }
}

/*
 * =========================
 * BUSCHAUFFEUR GELIJKSTAND
 * =========================
 */

function finishBusDriverSelection(
  roomCode,
  busDriver
) {
  const room = rooms[roomCode];

  if (
    !room ||
    !room.game.tree ||
    !busDriver
  ) {
    return;
  }

  const tree =
    room.game.tree;

  tree.busDriver = {
    id:
      busDriver.id,

    name:
      busDriver.name,

    remainingCards:
      busDriver.cards.length,
  };

  tree.status =
    "finished";

  /*
   * Alle kaarten uit de eerdere
   * fases kunnen nu naar de
   * aflegstapel.
   */

  prepareUsedCardsForBus(
    room
  );

  startBusSetup(
    roomCode,
    busDriver
  );
}

function resolveTieBreakRound(
  roomCode,
  candidateIds,
  roundNumber
) {
  const room = rooms[roomCode];

  if (
    !room ||
    !room.game.tree
  ) {
    return;
  }

  const tree =
    room.game.tree;

  const round =
    tree.tieBreakRounds.find(
      (item) =>
        item.round ===
        roundNumber
    );

  if (!round) {
    return;
  }

  const validDraws =
    round.draws.filter(
      (draw) =>
        draw.card
    );

  if (
    validDraws.length === 0
  ) {
    const fallback =
      room.players.find(
        (player) =>
          candidateIds.includes(
            player.id
          )
      );

    if (fallback) {
      finishBusDriverSelection(
        roomCode,
        fallback
      );
    }

    return;
  }

  /*
   * Laagste kaart gaat de bus in.
   */

  const lowestValue =
    Math.min(
      ...validDraws.map(
        (draw) =>
          draw.card.value
      )
    );

  const lowestIds =
    validDraws
      .filter(
        (draw) =>
          draw.card.value ===
          lowestValue
      )
      .map(
        (draw) =>
          draw.playerId
      );

  /*
   * Eén laagste speler:
   * winnaar van de gelijkstand.
   */

  if (
    lowestIds.length === 1
  ) {
    const busDriver =
      room.players.find(
        (player) =>
          player.id ===
          lowestIds[0]
      );

    if (busDriver) {
      finishBusDriverSelection(
        roomCode,
        busDriver
      );
    }

    return;
  }

  /*
   * Opnieuw gelijk.
   * Alleen de opnieuw gelijkstaande
   * spelers trekken nogmaals.
   */

  startTieBreakRound(
    roomCode,
    lowestIds,
    roundNumber + 1
  );
}

function startTieBreakRound(
  roomCode,
  candidateIds,
  roundNumber = 1
) {
  const room = rooms[roomCode];

  if (
    !room ||
    !room.game.tree
  ) {
    return;
  }

  const tree =
    room.game.tree;

  clearTreeTimer(room);

  const candidates =
    room.players.filter(
      (player) =>
        candidateIds.includes(
          player.id
        )
    );

  if (
    candidates.length === 1
  ) {
    finishBusDriverSelection(
      roomCode,
      candidates[0]
    );

    return;
  }

  const draws = [];

  for (
    const player of candidates
  ) {
    const card =
      takeCard(room);

    if (!card) {
      continue;
    }

    draws.push({
      playerId:
        player.id,

      playerName:
        player.name,

      card,
    });
  }

  tree.tieBreakRounds.push({
    round:
      roundNumber,

    draws,
  });

  tree.status =
    "tie-break";

  tree.activeCard =
    null;

  tree.pendingResolvers =
    [];

  room.game.phase =
    "tree-tiebreak";

  sendGameState(
    roomCode
  );

  /*
   * Iedereen krijgt 3 seconden
   * om de getrokken kaarten te zien.
   */

  tree.timer =
    setTimeout(
      () => {
        resolveTieBreakRound(
          roomCode,
          candidateIds,
          roundNumber
        );
      },
      TIE_BREAK_DELAY
    );
}

function determineBusDriver(
  roomCode
) {
  const room = rooms[roomCode];

  if (
    !room ||
    !room.game.tree
  ) {
    return;
  }

  const tree =
    room.game.tree;

  const highest =
    Math.max(
      ...room.players.map(
        (player) =>
          player.cards.length
      )
    );

  const candidates =
    room.players.filter(
      (player) =>
        player.cards.length ===
        highest
    );

  /*
   * Geen gelijkstand.
   */

  if (
    candidates.length === 1
  ) {
    finishBusDriverSelection(
      roomCode,
      candidates[0]
    );

    return;
  }

  /*
   * Wel gelijkstand.
   */

  tree.tieBreakRounds = [];

  startTieBreakRound(
    roomCode,
    candidates.map(
      (player) =>
        player.id
    ),
    1
  );
}

/*
 * =========================
 * BOOM KAART ONTHULLEN
 * =========================
 */

function revealNextTreeCard(
  roomCode
) {
  const room = rooms[roomCode];

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

  tree.currentSequenceIndex += 1;

  if (
    tree.currentSequenceIndex >=
    tree.sequence.length
  ) {
    tree.activeCard = null;
    tree.status = "finished";

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

  treeCard.revealed = true;

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
    location.rowNumber *
    (
      treeCard.isDouble
        ? 2
        : 1
    );

  tree.lastAction = null;

  tree.pendingResolvers =
    room.players
      .filter(
        (player) =>
          player.cards.some(
            (card) =>
              card.value ===
              treeCard.card.value
          )
      )
      .map(
        (player) =>
          player.id
      );

  tree.currentResolverIndex = 0;

  if (
    tree.pendingResolvers.length ===
    0
  ) {
    tree.status =
      "no-match";

    sendGameState(
      roomCode
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
}

function startTree(roomCode) {
  const room = rooms[roomCode];

  if (!room) {
    return;
  }

  clearResultTimer(room);

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

  queueNextTreeCard(
    roomCode,
    TREE_START_DELAY
  );
}

/*
 * =========================
 * VOLGENDE BEURT
 * =========================
 */

function advanceTurn(roomCode) {
  const room = rooms[roomCode];

  if (!room) {
    return;
  }

  clearResultTimer(room);

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
    room.players.length - 1
  ) {
    room.game.currentPlayerIndex += 1;

    beginTurn(
      roomCode
    );

    return;
  }

  room.game.currentPlayerIndex = 0;
  room.game.currentStep += 1;

  if (
    room.game.currentStep >= 4
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

function startResultTimer(
  roomCode
) {
  const room = rooms[roomCode];

  if (!room) {
    return;
  }

  clearResultTimer(room);

  room.game.resultSequence += 1;

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
 * BUS SETUP
 * =========================
 */

function startBusSetup(
  roomCode,
  busDriver
) {
  const room = rooms[roomCode];

  if (!room) {
    return;
  }

  room.game.phase =
    "bus-setup";

  room.game.finished =
    false;

  room.game.bus = {
    status:
      "draw-length",

    lengthCard:
      null,

    openCountCard:
      null,

    length:
      0,

    initialOpenCount:
      0,

    piles:
      [],

    checkpoints:
      [],

    currentIndex:
      0,

    activeDriverId:
      busDriver.id,

    riders: [
      busDriver.id,
    ],

    doubleRule:
      room.settings.doubleRule,

    result:
      null,

    timer:
      null,

    finished:
      false,
  };

  sendGameState(
    roomCode
  );
}

function dealBusCards(room) {
  const bus =
    room.game.bus;

  if (!bus) {
    return false;
  }

  const piles = [];

  for (
    let index = 0;
    index < bus.length;
    index++
  ) {
    const card =
      takeCard(room);

    if (!card) {
      return false;
    }

    piles.push({
      card,

      revealed:
        index <
        bus.initialOpenCount,
    });
  }

  bus.piles = piles;
  bus.currentIndex = 0;

  if (
    room.settings.checkpoints
  ) {
    bus.status =
      "checkpoints";
  } else {
    bus.status =
      "ready";
  }

  return true;
}

/*
 * =========================
 * BUS HELPERS
 * =========================
 */

function getRestartIndex(bus) {
  const achieved =
    bus.checkpoints.filter(
      (checkpoint) =>
        checkpoint <
        bus.currentIndex
    );

  if (
    achieved.length === 0
  ) {
    return 0;
  }

  return Math.max(
    ...achieved
  );
}

function finishBus(roomCode) {
  const room = rooms[roomCode];

  if (
    !room ||
    !room.game.bus
  ) {
    return;
  }

  clearBusTimer(room);

  room.game.bus.status =
    "finished";

  room.game.bus.finished =
    true;

  room.game.bus.result =
    null;

  room.game.phase =
    "bus-finished";

  room.game.finished =
    true;

  sendGameState(
    roomCode
  );
}

function continueBusAfterResult(
  roomCode,
  correct,
  restartIndex
) {
  const room = rooms[roomCode];

  if (
    !room ||
    !room.game.bus
  ) {
    return;
  }

  const bus =
    room.game.bus;

  clearBusTimer(room);

  bus.timer =
    setTimeout(
      () => {
        const currentRoom =
          rooms[roomCode];

        if (
          !currentRoom ||
          !currentRoom.game.bus
        ) {
          return;
        }

        const currentBus =
          currentRoom.game.bus;

        currentBus.result = null;

        if (correct) {
          currentBus.currentIndex += 1;

          if (
            currentBus.currentIndex >=
            currentBus.length
          ) {
            finishBus(
              roomCode
            );

            return;
          }
        } else {
          currentBus.currentIndex =
            restartIndex;
        }

        currentBus.status =
          "playing";

        sendGameState(
          roomCode
        );
      },
      BUS_RESULT_DELAY
    );
}

function continueBusAfterDouble(
  roomCode,
  selectedPlayerId
) {
  const room = rooms[roomCode];

  if (
    !room ||
    !room.game.bus
  ) {
    return;
  }

  const bus =
    room.game.bus;

  clearBusTimer(room);

  bus.timer =
    setTimeout(
      () => {
        const currentRoom =
          rooms[roomCode];

        if (
          !currentRoom ||
          !currentRoom.game.bus
        ) {
          return;
        }

        const currentBus =
          currentRoom.game.bus;

        const selectedPlayer =
          currentRoom.players.find(
            (player) =>
              player.id ===
              selectedPlayerId
          );

        if (selectedPlayer) {
          if (
            currentBus.doubleRule ===
            "pass"
          ) {
            currentBus.activeDriverId =
              selectedPlayer.id;

            currentBus.riders = [
              selectedPlayer.id,
            ];
          }

          if (
            currentBus.doubleRule ===
            "take-along"
          ) {
            if (
              !currentBus.riders.includes(
                selectedPlayer.id
              )
            ) {
              currentBus.riders.push(
                selectedPlayer.id
              );
            }
          }
        }

        /*
         * Dubbel = fout =
         * altijd terug naar kaart 1.
         */

        currentBus.currentIndex = 0;
        currentBus.result = null;
        currentBus.status = "playing";

        sendGameState(
          roomCode
        );
      },
      BUS_RESULT_DELAY
    );
}

/*
 * =========================
 * SOCKETS
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
     * ROOM MAKEN
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

            doubleRule:
              settings
                ?.doubleRule ===
              "take-along"
                ? "take-along"
                : "pass",
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

          deck: [],
          discardPile: [],

          game: {
            started: false,
            phase: "cards",
            currentPlayerIndex: 0,
            currentStep: 0,
            currentCard: null,
            waitingForGuess: false,
            resultShowing: false,
            result: null,
            resultEndsAt: null,
            resultTimer: null,
            resultSequence: 0,
            finished: false,
            tree: null,
            bus: null,
          },
        };

        socket.join(
          roomCode
        );

        socket.roomCode =
          roomCode;

        callback({
          success: true,
          roomCode,
          players:
            rooms[roomCode].players,
        });
      }
    );

    /*
     * JOIN
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
        const code =
          String(
            roomCode || ""
          )
            .trim()
            .toUpperCase();

        const room =
          rooms[code];

        if (!room) {
          callback({
            success: false,
            message:
              "Kamer bestaat niet.",
          });

          return;
        }

        if (
          room.game.started
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
      }
    );

    /*
     * REMOVE PLAYER
     */

    socket.on(
      "remove-player",
      (playerId) => {
        const roomCode =
          socket.roomCode;

        const room =
          rooms[roomCode];

        if (
          !room ||
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
     * START GAME
     */

    socket.on(
      "start-game",
      () => {
        const roomCode =
          socket.roomCode;

        const room =
          rooms[roomCode];

        if (
          !room ||
          room.hostId !==
            socket.id ||
          room.players.length <
            2
        ) {
          return;
        }

        initializeGame(
          roomCode
        );
      }
    );

    /*
     * NIEUW SPEL NA DE BUS
     */

    socket.on(
      "restart-game",
      (callback) => {
        const done =
          typeof callback ===
          "function"
            ? callback
            : () => {};

        const roomCode =
          socket.roomCode;

        const room =
          rooms[roomCode];

        if (
          !room ||
          room.hostId !==
            socket.id ||
          room.game.phase !==
            "bus-finished"
        ) {
          done({
            success: false,
          });

          return;
        }

        initializeGame(
          roomCode
        );

        done({
          success: true,
        });
      }
    );

    /*
     * TERUG NAAR HOME
     */

    socket.on(
      "return-home",
      (callback) => {
        const done =
          typeof callback ===
          "function"
            ? callback
            : () => {};

        const roomCode =
          socket.roomCode;

        const room =
          rooms[roomCode];

        if (
          !room ||
          room.hostId !==
            socket.id
        ) {
          done({
            success: false,
          });

          return;
        }

        clearAllTimers(room);

        io.to(
          roomCode
        ).emit(
          "return-home"
        );

        io.in(
          roomCode
        ).socketsLeave(
          roomCode
        );

        delete rooms[
          roomCode
        ];

        done({
          success: true,
        });
      }
    );

    /*
     * KAART GOK
     */

    socket.on(
      "guess-card",
      ({ guess }) => {
        const roomCode =
          socket.roomCode;

        const room =
          rooms[roomCode];

        if (
          !room ||
          room.game.phase !==
            "cards" ||
          !room.game.waitingForGuess ||
          room.game.resultShowing
        ) {
          return;
        }

        const player =
          getCurrentPlayer(room);

        if (
          !player ||
          player.id !==
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

        const correct =
          checkGuess(
            room,
            player,
            normalizedGuess,
            card
          );

        const isDisco =
          room.game.currentStep ===
            3 &&
          normalizedGuess ===
            "disco";

        player.cards.push(card);

        const result = {
          playerId:
            player.id,

          playerName:
            player.name,

          step:
            room.game.currentStep,

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

        room.game.currentCard = null;
        room.game.waitingForGuess = false;
        room.game.resultShowing = true;
        room.game.result = result;

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
     * BOOM VERDELEN
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
          rooms[roomCode];

        if (
          !room ||
          !room.game.tree ||
          room.game.phase !==
            "tree"
        ) {
          done({
            success: false,
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
            success: false,

            message:
              "Een andere speler is aan de beurt.",
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
            success: false,
          });

          return;
        }

        const safe =
          Array.isArray(
            distribution
          )
            ? distribution
            : [];

        let total = 0;

        const receivers = [];

        for (
          const item of safe
        ) {
          const receiver =
            room.players.find(
              (player) =>
                player.id ===
                item?.playerId
            );

          const count =
            Number(
              item?.count
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

          total += count;

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
            success: false,

            message:
              `Verdeel precies ${tree.drinksToDistribute} slokken.`,
          });

          return;
        }

        const cardIndex =
          giver.cards.findIndex(
            (card) =>
              card.value ===
              tree.activeCard.card
                .value
          );

        if (
          cardIndex === -1
        ) {
          done({
            success: false,
            message:
              "Geen matchende kaart meer.",
          });

          return;
        }

        /*
         * Weggelegde kaart gaat nu
         * echt naar de aflegstapel.
         */

        const removedCards =
          giver.cards.splice(
            cardIndex,
            1
          );

        if (
          removedCards[0]
        ) {
          addToDiscard(
            room,
            removedCards[0]
          );
        }

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
          success: true,
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
     * BOOM OVERSLAAN
     */

    socket.on(
      "tree-skip-match",
      (callback) => {
        const done =
          typeof callback ===
          "function"
            ? callback
            : () => {};

        const roomCode =
          socket.roomCode;

        const room =
          rooms[roomCode];

        if (
          !room ||
          !room.game.tree ||
          room.game.phase !==
            "tree"
        ) {
          done({
            success: false,
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
            success: false,
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

          total: 0,
          receivers: [],
        };

        done({
          success: true,
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
     * BUS LENGTE
     */

    socket.on(
      "bus-draw-length",
      (callback) => {
        const done =
          typeof callback ===
          "function"
            ? callback
            : () => {};

        const roomCode =
          socket.roomCode;

        const room =
          rooms[roomCode];

        if (
          !room ||
          !room.game.bus ||
          room.game.phase !==
            "bus-setup"
        ) {
          done({
            success: false,
          });

          return;
        }

        const bus =
          room.game.bus;

        const canControl =
          socket.id ===
            bus.activeDriverId ||
          socket.id ===
            room.hostId;

        if (
          !canControl ||
          bus.status !==
            "draw-length"
        ) {
          done({
            success: false,
          });

          return;
        }

        const card =
          takeCard(room);

        if (!card) {
          done({
            success: false,
            message:
              "Geen kaart beschikbaar.",
          });

          return;
        }

        bus.lengthCard = card;
        bus.length = card.value;

        addToDiscard(
          room,
          card
        );

        bus.status =
          "draw-open";

        sendGameState(
          roomCode
        );

        done({
          success: true,
        });
      }
    );

    /*
     * BUS OPEN KAARTEN
     */

    socket.on(
      "bus-draw-open",
      (callback) => {
        const done =
          typeof callback ===
          "function"
            ? callback
            : () => {};

        const roomCode =
          socket.roomCode;

        const room =
          rooms[roomCode];

        if (
          !room ||
          !room.game.bus ||
          room.game.phase !==
            "bus-setup"
        ) {
          done({
            success: false,
          });

          return;
        }

        const bus =
          room.game.bus;

        const canControl =
          socket.id ===
            bus.activeDriverId ||
          socket.id ===
            room.hostId;

        if (
          !canControl ||
          bus.status !==
            "draw-open" ||
          !bus.lengthCard
        ) {
          done({
            success: false,
          });

          return;
        }

        const card =
          takeCard(room);

        if (!card) {
          done({
            success: false,
            message:
              "Geen kaart beschikbaar.",
          });

          return;
        }

        bus.openCountCard = card;

        bus.initialOpenCount =
          Math.min(
            bus.length,
            card.value
          );

        addToDiscard(
          room,
          card
        );

        const success =
          dealBusCards(room);

        if (!success) {
          done({
            success: false,
            message:
              "Bus kon niet worden gelegd.",
          });

          return;
        }

        sendGameState(
          roomCode
        );

        done({
          success: true,
        });
      }
    );

    /*
     * CHECKPOINTS
     */

    socket.on(
      "bus-set-checkpoints",
      (
        {
          checkpoints,
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
          rooms[roomCode];

        if (
          !room ||
          !room.game.bus ||
          room.game.phase !==
            "bus-setup" ||
          room.hostId !==
            socket.id
        ) {
          done({
            success: false,
          });

          return;
        }

        const bus =
          room.game.bus;

        if (
          bus.status !==
          "checkpoints"
        ) {
          done({
            success: false,
          });

          return;
        }

        const safe =
          Array.isArray(
            checkpoints
          )
            ? checkpoints
            : [];

        bus.checkpoints =
          [
            ...new Set(
              safe
                .map(Number)
                .filter(
                  (index) =>
                    Number.isInteger(
                      index
                    ) &&
                    index > 0 &&
                    index <
                      bus.length
                )
            ),
          ].sort(
            (a, b) => a - b
          );

        sendGameState(
          roomCode
        );

        done({
          success: true,
        });
      }
    );

    socket.on(
      "bus-checkpoints-ready",
      (callback) => {
        const done =
          typeof callback ===
          "function"
            ? callback
            : () => {};

        const roomCode =
          socket.roomCode;

        const room =
          rooms[roomCode];

        if (
          !room ||
          !room.game.bus ||
          room.hostId !==
            socket.id ||
          room.game.phase !==
            "bus-setup"
        ) {
          done({
            success: false,
          });

          return;
        }

        if (
          room.game.bus.status !==
          "checkpoints"
        ) {
          done({
            success: false,
          });

          return;
        }

        room.game.bus.status =
          "ready";

        sendGameState(
          roomCode
        );

        done({
          success: true,
        });
      }
    );

    /*
     * BUS START
     */

    socket.on(
      "bus-start",
      (callback) => {
        const done =
          typeof callback ===
          "function"
            ? callback
            : () => {};

        const roomCode =
          socket.roomCode;

        const room =
          rooms[roomCode];

        if (
          !room ||
          !room.game.bus ||
          room.game.phase !==
            "bus-setup"
        ) {
          done({
            success: false,
          });

          return;
        }

        const bus =
          room.game.bus;

        const canControl =
          socket.id ===
            bus.activeDriverId ||
          socket.id ===
            room.hostId;

        if (
          !canControl ||
          bus.status !==
            "ready"
        ) {
          done({
            success: false,
          });

          return;
        }

        room.game.phase =
          "bus";

        bus.status =
          "playing";

        bus.currentIndex = 0;

        sendGameState(
          roomCode
        );

        done({
          success: true,
        });
      }
    );

    /*
     * BUS GOK
     */

    socket.on(
      "bus-guess",
      (
        { guess },
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
          rooms[roomCode];

        if (
          !room ||
          !room.game.bus ||
          room.game.phase !==
            "bus"
        ) {
          done({
            success: false,
          });

          return;
        }

        const bus =
          room.game.bus;

        if (
          bus.status !==
            "playing" ||
          bus.activeDriverId !==
            socket.id
        ) {
          done({
            success: false,
          });

          return;
        }

        const normalizedGuess =
          String(
            guess || ""
          )
            .trim()
            .toLowerCase();

        if (
          normalizedGuess !==
            "hoger" &&
          normalizedGuess !==
            "lager"
        ) {
          done({
            success: false,
          });

          return;
        }

        const position =
          bus.currentIndex;

        const pile =
          bus.piles[position];

        if (!pile) {
          done({
            success: false,
          });

          return;
        }

        pile.revealed = true;

        const referenceCard =
          pile.card;

        const newCard =
          takeCard(room);

        if (!newCard) {
          done({
            success: false,
            message:
              "Geen kaart beschikbaar.",
          });

          return;
        }

        addToDiscard(
          room,
          referenceCard
        );

        pile.card = newCard;
        pile.revealed = true;

        /*
         * DUBBEL
         */

        if (
          newCard.value ===
          referenceCard.value
        ) {
          const drinks =
            position + 1;

          bus.result = {
            type:
              "double",

            guess:
              normalizedGuess,

            position,

            fromCard:
              referenceCard,

            newCard,

            correct:
              false,

            double:
              true,

            drinks,

            restartIndex:
              0,
          };

          bus.status =
            "double-choice";

          sendGameState(
            roomCode
          );

          done({
            success: true,
          });

          return;
        }

        const correct =
          normalizedGuess ===
          "hoger"
            ? newCard.value >
              referenceCard.value
            : newCard.value <
              referenceCard.value;

        const drinks =
          position + 1;

        const restartIndex =
          getRestartIndex(
            bus
          );

        bus.result = {
          type:
            correct
              ? "correct"
              : "wrong",

          guess:
            normalizedGuess,

          position,

          fromCard:
            referenceCard,

          newCard,

          correct,

          double:
            false,

          drinks:
            correct
              ? 0
              : drinks,

          restartIndex,
        };

        bus.status =
          "result";

        sendGameState(
          roomCode
        );

        continueBusAfterResult(
          roomCode,
          correct,
          restartIndex
        );

        done({
          success: true,
        });
      }
    );

    /*
     * DUBBEL KEUZE
     */

    socket.on(
      "bus-double-choice",
      (
        {
          playerId,
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
          rooms[roomCode];

        if (
          !room ||
          !room.game.bus ||
          room.game.phase !==
            "bus"
        ) {
          done({
            success: false,
          });

          return;
        }

        const bus =
          room.game.bus;

        if (
          bus.status !==
            "double-choice" ||
          bus.activeDriverId !==
            socket.id ||
          !bus.result
        ) {
          done({
            success: false,
          });

          return;
        }

        const selectedPlayer =
          room.players.find(
            (player) =>
              player.id ===
              playerId
          );

        if (
          !selectedPlayer ||
          selectedPlayer.id ===
            socket.id
        ) {
          done({
            success: false,
          });

          return;
        }

        bus.result = {
          ...bus.result,

          type:
            "wrong",

          correct:
            false,

          double:
            true,

          restartIndex:
            0,
        };

        bus.status =
          "result";

        sendGameState(
          roomCode
        );

        continueBusAfterDouble(
          roomCode,
          selectedPlayer.id
        );

        done({
          success: true,
        });
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
          !rooms[roomCode]
        ) {
          return;
        }

        const room =
          rooms[roomCode];

        if (
          room.hostId ===
          socket.id
        ) {
          clearAllTimers(room);

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

        room.players =
          room.players.filter(
            (player) =>
              player.id !==
              socket.id
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