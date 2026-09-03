const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

const RESULT_DELAY = 3000;
const TREE_NEXT_DELAY = 1800;
const TREE_RESOLUTION_DELAY = 2600;
const TREE_START_DELAY = 1400;
const TIE_BREAK_RESULT_DELAY = 2500;
const BUS_RESULT_DELAY = 2000;
const SOUND_SYNC_LEAD_MS = 450;

const SERVER_VERSION = "BUS_V14_SYNCED_AUDIO";

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

  for (let deckNumber = 0; deckNumber < numberOfDecks; deckNumber++) {
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
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 5; i++) {
    code += characters[
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

/*
 * =========================
 * STOCK + AFLEGSTAPEL
 * =========================
 */

/*
 * Een kaart die gebruikt is, wordt echt VERPLAATST
 * naar de aflegstapel.
 *
 * Mocht dezelfde kaart door oude state toch nog
 * in room.deck staan, dan verwijderen we hem daar
 * eerst uit. Zo kan iedere fysieke kaart maar één
 * keer in de stock/aflegstapel zitten.
 */
function addToDiscard(room, card) {
  if (!card) {
    return;
  }

  room.deck = room.deck.filter(
    (deckCard) => deckCard.id !== card.id
  );

  const alreadyInDiscard =
    room.discardPile.some(
      (discardCard) => discardCard.id === card.id
    );

  if (alreadyInDiscard) {
    return;
  }

  room.discardPile.push(card);
}

/*
 * Deze functie mag onbeperkt vaak uitgevoerd worden.
 *
 * Iedere keer wanneer:
 * room.deck.length === 0
 *
 * wordt ALLES van de aflegstapel:
 * 1. gekopieerd
 * 2. aflegstapel geleegd
 * 3. geschud
 * 4. nieuwe stock
 */
function refillStock(room) {
  if (room.deck.length > 0) {
    return false;
  }

  if (room.discardPile.length === 0) {
    console.log(
      "WAARSCHUWING: trekstapel en aflegstapel zijn beide leeg."
    );

    return false;
  }

  const cardsToRecycle = [
    ...room.discardPile,
  ];

  room.discardPile = [];

  room.deck = shuffle(
    cardsToRecycle
  );

  room.stockCycle =
    (room.stockCycle || 0) + 1;

  console.log(
    `Stock opnieuw gevuld - ronde ${room.stockCycle}: ${room.deck.length} kaarten geschud.`
  );

  if (
    room.roomCode &&
    (
      room.game?.phase === "bus" ||
      room.game?.phase === "bus-setup"
    )
  ) {
    io.to(room.roomCode).emit(
      "stock-reshuffled",
      {
        count: room.deck.length,
        cycle: room.stockCycle,
      }
    );
  }

  return true;
}

/*
 * Iedere trekactie controleert opnieuw of de stock
 * leeg is. Hierdoor werkt recyclen niet alleen één
 * keer, maar iedere volgende keer opnieuw.
 */
function takeCard(room) {
  if (room.deck.length === 0) {
    refillStock(room);
  }

  if (room.deck.length === 0) {
    return null;
  }

  return room.deck.pop() || null;
}

/*
 * =========================
 * TIMERS
 * =========================
 */

function clearResultTimer(room) {
  if (room?.game?.resultTimer) {
    clearTimeout(room.game.resultTimer);
    room.game.resultTimer = null;
  }
}

function clearTreeTimer(room) {
  if (room?.game?.tree?.timer) {
    clearTimeout(room.game.tree.timer);
    room.game.tree.timer = null;
  }
}

function clearBusTimer(room) {
  if (room?.game?.bus?.timer) {
    clearTimeout(room.game.bus.timer);
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
 * BOOM RESULTAAT
 * =========================
 */

function createTreeResolutionSummary(tree) {
  const totals = new Map();

  for (const action of tree.currentCardActions) {
    for (const receiver of action.receivers) {
      const existing =
        totals.get(receiver.playerId);

      if (existing) {
        existing.count += receiver.count;
      } else {
        totals.set(
          receiver.playerId,
          {
            playerId: receiver.playerId,
            playerName: receiver.playerName,
            count: receiver.count,
          }
        );
      }
    }
  }

  const receivers =
    Array.from(totals.values());

  const total =
    receivers.reduce(
      (sum, receiver) =>
        sum + receiver.count,
      0
    );

  if (receivers.length === 0) {
    return null;
  }

  return {
    receivers,
    total,
  };
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

  const adtCurrentResolverId =
    tree.status === "adt" &&
    tree.adtStatus === "resolving"
      ? tree.adtPendingResolvers[
          tree.adtCurrentResolverIndex
        ] || null
      : null;

  return {
    rows: tree.rows.map(
      (row) => ({
        rowNumber: row.rowNumber,
        drinks: row.rowNumber,

        cards: row.cards.map(
          (treeCard) => ({
            id: treeCard.card.id,
            revealed: treeCard.revealed,
            isDouble: treeCard.isDouble,

            card:
              treeCard.revealed
                ? treeCard.card
                : null,
          })
        ),
      })
    ),

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

    resolutionSummary:
      tree.resolutionSummary,

    busDriver:
      tree.busDriver,

    tieBreakRounds:
      tree.tieBreakRounds,

    tieBreakCandidateIds: [
      ...tree.tieBreakCandidateIds,
    ],

    tieBreakPendingIds: [
      ...tree.tieBreakPendingIds,
    ],

    adtCard:
      tree.adtCard
        ? {
            revealed:
              tree.adtCard.revealed,

            card:
              tree.adtCard.revealed
                ? tree.adtCard.card
                : null,
          }
        : null,

    adtStatus:
      tree.adtStatus,

    adtPendingResolverIds: [
      ...tree.adtPendingResolvers,
    ],

    adtCurrentResolverId,

    adtLastAction:
      tree.adtLastAction,
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

    checkpointFailRule:
      bus.checkpointFailRule,

    checkpointRetryUsedIndex:
      bus.checkpointRetryUsedIndex,

    activeCheckpointIndex:
      bus.activeCheckpointIndex,

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
            bus.checkpoints.includes(index),

          isActiveCheckpoint:
            bus.activeCheckpointIndex ===
            index,
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
 * PUBLIC GAME
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
  const room =
    rooms[roomCode];

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
 * GESYNCHRONISEERDE SOUNDS
 * =========================
 *
 * De server bepaalt het echte spelmoment.
 * Iedere telefoon in dezelfde kamer krijgt
 * daardoor exact hetzelfde sound-event.
 */
function emitSoundEffect(
  roomCode,
  effect,
  leadMs = SOUND_SYNC_LEAD_MS
) {
  if (
    !roomCode ||
    !effect
  ) {
    return;
  }

  const serverNow =
    Date.now();

  const normalizedEffect = {
    ...effect,
  };

  if (
    (
      normalizedEffect.type === "card" ||
      normalizedEffect.type === "card-result"
    ) &&
    !Number.isInteger(
      normalizedEffect.variant
    )
  ) {
    normalizedEffect.variant =
      Math.floor(
        Math.random() * 3
      );
  }

  io.to(roomCode).emit(
    "sound-effect",
    {
      ...normalizedEffect,

      eventId:
        `${serverNow}-${Math.random()
          .toString(36)
          .substring(2, 9)}`,

      playAt:
        serverNow +
        Math.max(
          0,
          Number(leadMs) || 0
        ),
    }
  );
}

/*
 * =========================
 * NIEUW SPEL
 * =========================
 */

function initializeGame(roomCode) {
  const room =
    rooms[roomCode];

  if (!room) {
    return;
  }

  clearAllTimers(room);

  room.deck =
    createDeck(
      room.settings.decks
    );

  room.discardPile = [];

  /*
   * Houdt alleen bij hoeveel keer tijdens deze
   * speelronde de aflegstapel opnieuw geschud is.
   */
  room.stockCycle = 0;

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
  const room =
    rooms[roomCode];

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

  const card =
    takeCard(room);

  if (!card) {
    return;
  }

  room.game.currentCard =
    card;

  room.game.waitingForGuess =
    true;

  sendGameState(roomCode);

  io.to(currentPlayer.id).emit(
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

    if (guess === "hoger") {
      return card.value > first.value;
    }

    if (guess === "lager") {
      return card.value < first.value;
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

  if (step === 3) {
    if (guess === "disco") {
      return checkDisco(
        player,
        card
      );
    }

    return guess === card.suit;
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
      !usedValues.has(card.value)
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
    return skippedCards.pop() || null;
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
      room.settings.treeDouble
        ? Math.floor(
            Math.random() *
              rowNumber
          )
        : -1;

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
          room.settings.treeDouble &&
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

  const adtCard =
    room.settings.adtCard
      ? takeCard(room)
      : null;

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

    currentCardActions:
      [],

    resolutionSummary:
      null,

    timer:
      null,

    busDriver:
      null,

    tieBreakRounds:
      [],

    tieBreakCandidateIds:
      [],

    tieBreakPendingIds:
      [],

    adtCard:
      adtCard
        ? {
            card: adtCard,
            revealed: false,
          }
        : null,

    adtStatus:
      adtCard
        ? "waiting"
        : "disabled",

    adtPendingResolvers:
      [],

    adtCurrentResolverIndex:
      0,

    adtLastAction:
      null,
  };
}

function queueNextTreeCard(
  roomCode,
  delay = TREE_NEXT_DELAY
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

  tree.resolutionSummary =
    createTreeResolutionSummary(
      tree
    );

  tree.status =
    "resolved";

  sendGameState(
    roomCode
  );

  queueNextTreeCard(
    roomCode,
    tree.resolutionSummary
      ? TREE_RESOLUTION_DELAY
      : TREE_NEXT_DELAY
  );
}

function finishTreeAndChooseBusDriver(
  roomCode,
  delay = 0
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

  const finish =
    () => {
      const currentRoom =
        rooms[roomCode];

      if (
        !currentRoom ||
        !currentRoom.game.tree
      ) {
        return;
      }

      currentRoom.game.tree.status =
        "finished";

      if (
        currentRoom.game.tree.adtCard
      ) {
        currentRoom.game.tree.adtStatus =
          "finished";
      }

      sendGameState(roomCode);

      determineBusDriver(
        roomCode
      );
    };

  if (delay > 0) {
    room.game.tree.timer =
      setTimeout(
        finish,
        delay
      );
  } else {
    finish();
  }
}

/*
 * =========================
 * ADTJE
 * =========================
 */

function revealAdtCard(
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

  if (!tree.adtCard) {
    finishTreeAndChooseBusDriver(
      roomCode
    );

    return;
  }

  tree.activeCard =
    null;

  tree.status =
    "adt";

  tree.adtCard.revealed =
    true;

  emitSoundEffect(
    roomCode,
    {
      type: "card",
    }
  );

  tree.adtLastAction =
    null;

  tree.adtPendingResolvers =
    room.players
      .filter(
        (player) =>
          player.cards.some(
            (card) =>
              card.value ===
              tree.adtCard.card.value
          )
      )
      .map(
        (player) =>
          player.id
      );

  tree.adtCurrentResolverIndex =
    0;

  if (
    tree.adtPendingResolvers.length ===
    0
  ) {
    tree.adtStatus =
      "no-match";

    sendGameState(
      roomCode
    );

    finishTreeAndChooseBusDriver(
      roomCode,
      TREE_NEXT_DELAY
    );

    return;
  }

  tree.adtStatus =
    "resolving";

  sendGameState(
    roomCode
  );
}

function advanceAdtResolver(
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

  tree.adtCurrentResolverIndex += 1;

  if (
    tree.adtCurrentResolverIndex <
    tree.adtPendingResolvers.length
  ) {
    tree.adtStatus =
      "resolving";

    sendGameState(
      roomCode
    );

    return;
  }

  tree.adtStatus =
    "resolved";

  sendGameState(
    roomCode
  );

  finishTreeAndChooseBusDriver(
    roomCode,
    TREE_NEXT_DELAY
  );
}

/*
 * =========================
 * KAARTEN NAAR BUS
 * =========================
 */

function prepareUsedCardsForBus(
  room
) {
  const seen =
    new Set();

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
    const player of
    room.players
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

    if (
      room.game.tree.adtCard
    ) {
      collect(
        room.game.tree
          .adtCard.card
      );
    }

    for (
      const round of
      room.game.tree
        .tieBreakRounds || []
    ) {
      for (
        const draw of
        round.draws || []
      ) {
        collect(draw.card);
      }
    }
  }
}

/*
 * =========================
 * BUS DRIVER
 * =========================
 */

function finishBusDriverSelection(
  roomCode,
  busDriver
) {
  const room =
    rooms[roomCode];

  if (
    !room ||
    !room.game.tree ||
    !busDriver
  ) {
    return;
  }

  const tree =
    room.game.tree;

  clearTreeTimer(room);

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

  tree.tieBreakCandidateIds =
    [];

  tree.tieBreakPendingIds =
    [];

  prepareUsedCardsForBus(
    room
  );

  startBusSetup(
    roomCode,
    busDriver
  );
}

function startTieBreakRound(
  roomCode,
  candidateIds,
  roundNumber = 1
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

  clearTreeTimer(room);

  const validCandidates =
    room.players.filter(
      (player) =>
        candidateIds.includes(
          player.id
        )
    );

  if (
    validCandidates.length === 1
  ) {
    finishBusDriverSelection(
      roomCode,
      validCandidates[0]
    );

    return;
  }

  tree.status =
    "tie-break";

  tree.activeCard =
    null;

  tree.pendingResolvers =
    [];

  tree.tieBreakCandidateIds =
    validCandidates.map(
      (player) =>
        player.id
    );

  tree.tieBreakPendingIds =
    validCandidates.map(
      (player) =>
        player.id
    );

  tree.tieBreakRounds.push({
    round:
      roundNumber,

    draws:
      [],
  });

  room.game.phase =
    "tree-tiebreak";

  sendGameState(roomCode);
}

function resolveTieBreakRound(
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

  const round =
    tree.tieBreakRounds[
      tree.tieBreakRounds.length - 1
    ];

  if (
    !round ||
    round.draws.length === 0
  ) {
    return;
  }

  for (
    const draw of
    round.draws
  ) {
    addToDiscard(
      room,
      draw.card
    );
  }

  const lowestValue =
    Math.min(
      ...round.draws.map(
        (draw) =>
          draw.card.value
      )
    );

  const lowestIds =
    round.draws
      .filter(
        (draw) =>
          draw.card.value ===
          lowestValue
      )
      .map(
        (draw) =>
          draw.playerId
      );

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

  startTieBreakRound(
    roomCode,
    lowestIds,
    round.round + 1
  );
}

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

  if (
    candidates.length === 1
  ) {
    finishBusDriverSelection(
      roomCode,
      candidates[0]
    );

    return;
  }

  tree.tieBreakRounds =
    [];

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
 * BOOM ONTHULLEN
 * =========================
 */

function revealNextTreeCard(
  roomCode
) {
  const room =
    rooms[roomCode];

  if (
    !room ||
    !room.game.tree ||
    room.game.phase !== "tree"
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
    tree.activeCard =
      null;

    tree.resolutionSummary =
      null;

    tree.currentCardActions =
      [];

    if (
      tree.adtCard &&
      !tree.adtCard.revealed
    ) {
      revealAdtCard(
        roomCode
      );

      return;
    }

    finishTreeAndChooseBusDriver(
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

  tree.currentCardActions =
    [];

  tree.resolutionSummary =
    null;

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

  emitSoundEffect(
    roomCode,
    {
      type: "card",
    }
  );

  tree.drinksToDistribute =
    location.rowNumber *
    (
      treeCard.isDouble
        ? 2
        : 1
    );

  tree.lastAction =
    null;

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

  tree.currentResolverIndex =
    0;

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

function startTree(
  roomCode
) {
  const room =
    rooms[roomCode];

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
 * VOLGENDE SPELER
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

  room.game.currentPlayerIndex =
    0;

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
  const room =
    rooms[roomCode];

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
  const room =
    rooms[roomCode];

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

    activeCheckpointIndex:
      null,

    activeDriverId:
      busDriver.id,

    riders: [
      busDriver.id,
    ],

    doubleRule:
      room.settings.doubleRule,

    checkpointFailRule:
      room.settings.checkpointFailRule,

    checkpointRetryUsedIndex:
      null,

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

  bus.piles =
    piles;

  bus.currentIndex =
    0;

  bus.activeCheckpointIndex =
    null;

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
 * CHECKPOINTS
 * =========================
 */

function activateCheckpointIfNeeded(
  bus
) {
  if (
    bus.checkpointFailRule !==
    "safe"
  ) {
    return;
  }

  if (
    bus.checkpoints.includes(
      bus.currentIndex
    )
  ) {
    bus.activeCheckpointIndex =
      bus.currentIndex;
  }
}

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

function getSafeRestartIndex(
  bus
) {
  if (
    bus.checkpointFailRule ===
      "safe" &&
    bus.activeCheckpointIndex !==
      null
  ) {
    return bus.activeCheckpointIndex;
  }

  return 0;
}

/*
 * =========================
 * BUS VERDER
 * =========================
 */

function finishBus(
  roomCode
) {
  const room =
    rooms[roomCode];

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

  emitSoundEffect(
    roomCode,
    {
      type: "finish",
    }
  );
}

function continueBusAfterResult(
  roomCode,
  correct,
  restartIndex
) {
  const room =
    rooms[roomCode];

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

        currentBus.result =
          null;

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

          activateCheckpointIfNeeded(
            currentBus
          );
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
  const room =
    rooms[roomCode];

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

        currentBus.currentIndex =
          currentBus.checkpointFailRule ===
            "safe"
            ? getSafeRestartIndex(
                currentBus
              )
            : 0;

        currentBus.checkpointRetryUsedIndex =
          null;

        currentBus.result =
          null;

        currentBus.status =
          "playing";

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
     * =========================
     * AUDIO KLOK SYNCHRONISEREN
     * =========================
     *
     * De client meet meerdere keren de round-trip.
     * Met het snelste antwoord kan hij de klok van
     * deze server zeer nauwkeurig benaderen.
     */
    socket.on(
      "sound-sync",
      (callback) => {
        if (
          typeof callback !==
          "function"
        ) {
          return;
        }

        callback({
          serverNow:
            Date.now(),
        });
      }
    );

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

        let checkpointFailRule =
          "retry";

        if (
          settings?.checkpointFailRule ===
          "reset"
        ) {
          checkpointFailRule =
            "reset";
        }

        if (
          settings?.checkpointFailRule ===
          "safe"
        ) {
          checkpointFailRule =
            "safe";
        }

        rooms[roomCode] = {
          roomCode,

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
              settings?.doubleRule ===
              "take-along"
                ? "take-along"
                : "pass",

            checkpointFailRule,

            treeDouble:
              settings?.treeDouble !==
              false,

            adtCard:
              Boolean(
                settings?.adtCard
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

          discardPile:
            [],

          stockCycle:
            0,

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

            bus:
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
          code
        );

        socket.roomCode =
          code;

        callback({
          success:
            true,

          roomCode:
            code,

          players:
            room.players,
        });

        io.to(code).emit(
          "players-updated",
          room.players
        );
      }
    );

    socket.on(
      "remove-player",
      (playerId) => {
        const roomCode =
          socket.roomCode;

        const room =
          rooms[roomCode];

        if (
          !room ||
          room.hostId !== socket.id
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

        io.to(playerId).emit(
          "removed-from-room"
        );

        io.to(roomCode).emit(
          "players-updated",
          room.players
        );
      }
    );

    socket.on(
      "start-game",
      () => {
        const roomCode =
          socket.roomCode;

        const room =
          rooms[roomCode];

        if (
          !room ||
          room.hostId !== socket.id ||
          room.players.length < 2
        ) {
          return;
        }

        initializeGame(
          roomCode
        );
      }
    );

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
          room.hostId !== socket.id ||
          room.game.phase !==
            "bus-finished"
        ) {
          done({
            success: false,
          });

          return;
        }

        if (
          room.players.length < 2
        ) {
          done({
            success:
              false,

            message:
              "Er zijn minimaal 2 spelers nodig voor een nieuw spel.",
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
          room.hostId !== socket.id
        ) {
          done({
            success: false,
          });

          return;
        }

        clearAllTimers(room);

        io.to(roomCode).emit(
          "return-home"
        );

        io.in(roomCode).socketsLeave(
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

    socket.on(
      "leave-after-game",
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
          room.game.phase !==
            "bus-finished"
        ) {
          done({
            success:
              false,

            message:
              "Je kunt het spel nu niet verlaten.",
          });

          return;
        }

        const player =
          room.players.find(
            (item) =>
              item.id ===
              socket.id
          );

        if (!player) {
          done({
            success: false,
          });

          return;
        }

        const wasHost =
          room.hostId === socket.id;

        room.players =
          room.players.filter(
            (item) =>
              item.id !==
              socket.id
          );

        socket.leave(
          roomCode
        );

        socket.roomCode =
          null;

        if (
          room.players.length === 0
        ) {
          clearAllTimers(room);

          delete rooms[
            roomCode
          ];

          done({
            success: true,
          });

          return;
        }

        if (wasHost) {
          room.hostId =
            room.players[0].id;

          room.players.forEach(
            (remainingPlayer) => {
              remainingPlayer.isHost =
                remainingPlayer.id ===
                room.hostId;
            }
          );
        }

        io.to(roomCode).emit(
          "players-updated",
          room.players
        );

        sendGameState(
          roomCode
        );

        done({
          success: true,
        });
      }
    );

    /*
     * =========================
     * KAART GOK
     * =========================
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
          room.game.phase !== "cards" ||
          !room.game.waitingForGuess ||
          room.game.resultShowing
        ) {
          return;
        }

        const player =
          getCurrentPlayer(room);

        if (
          !player ||
          player.id !== socket.id
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
          room.game.currentStep === 3 &&
          normalizedGuess === "disco";

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

        io.to(roomCode).emit(
          "guess-result",
          result
        );

        sendGameState(
          roomCode
        );

        emitSoundEffect(
          roomCode,
          {
            type:
              "card-result",

            result:
              isDisco &&
              correct
                ? "disco"
                : correct
                  ? "correct"
                  : "wrong",
          }
        );
      }
    );

    /*
     * =========================
     * BOOM UITDELEN
     * =========================
     */

    socket.on(
      "tree-distribute",
      (
        { distribution },
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
          room.game.phase !== "tree"
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
          tree.status !== "resolving" ||
          resolverId !== socket.id
        ) {
          done({
            success:
              false,

            message:
              "Een andere speler is aan de beurt.",
          });

          return;
        }

        const giver =
          room.players.find(
            (player) =>
              player.id === socket.id
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
          Array.isArray(distribution)
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
            receiver.id === giver.id ||
            !Number.isInteger(count) ||
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
            success:
              false,

            message:
              `Verdeel precies ${tree.drinksToDistribute} slokken.`,
          });

          return;
        }

        const cardIndex =
          giver.cards.findIndex(
            (card) =>
              card.value ===
              tree.activeCard.card.value
          );

        if (
          cardIndex === -1
        ) {
          done({
            success:
              false,

            message:
              "Geen matchende kaart meer.",
          });

          return;
        }

        const removed =
          giver.cards.splice(
            cardIndex,
            1
          );

        if (removed[0]) {
          addToDiscard(
            room,
            removed[0]
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

        tree.currentCardActions.push(
          {
            giverId:
              giver.id,

            giverName:
              giver.name,

            receivers:
              receivers.map(
                (receiver) => ({
                  ...receiver,
                })
              ),
          }
        );

        done({
          success: true,
        });

        sendGameState(
          roomCode
        );

        emitSoundEffect(
          roomCode,
          {
            type: "glass",
          }
        );

        advanceTreeResolver(
          roomCode
        );
      }
    );

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
          room.game.phase !== "tree"
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
          tree.status !== "resolving" ||
          resolverId !== socket.id
        ) {
          done({
            success: false,
          });

          return;
        }

        const player =
          room.players.find(
            (item) =>
              item.id === socket.id
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
     * =========================
     * ADTJE
     * =========================
     */

    socket.on(
      "tree-adt-give",
      (
        { playerId },
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
          room.game.phase !== "tree"
        ) {
          done({
            success: false,
          });

          return;
        }

        const tree =
          room.game.tree;

        if (
          tree.status !== "adt" ||
          tree.adtStatus !== "resolving" ||
          !tree.adtCard
        ) {
          done({
            success: false,
          });

          return;
        }

        const resolverId =
          tree.adtPendingResolvers[
            tree.adtCurrentResolverIndex
          ];

        if (
          resolverId !== socket.id
        ) {
          done({
            success:
              false,

            message:
              "Een andere speler mag eerst zijn Adtje uitdelen.",
          });

          return;
        }

        const giver =
          room.players.find(
            (player) =>
              player.id === socket.id
          );

        const receiver =
          room.players.find(
            (player) =>
              player.id === playerId
          );

        if (
          !giver ||
          !receiver ||
          giver.id === receiver.id
        ) {
          done({
            success:
              false,

            message:
              "Kies een andere speler.",
          });

          return;
        }

        const cardIndex =
          giver.cards.findIndex(
            (card) =>
              card.value ===
              tree.adtCard.card.value
          );

        if (
          cardIndex === -1
        ) {
          done({
            success:
              false,

            message:
              "Je hebt geen matchende kaart meer.",
          });

          return;
        }

        const removed =
          giver.cards.splice(
            cardIndex,
            1
          );

        if (removed[0]) {
          addToDiscard(
            room,
            removed[0]
          );
        }

        tree.adtLastAction = {
          giverId:
            giver.id,

          giverName:
            giver.name,

          receiverId:
            receiver.id,

          receiverName:
            receiver.name,
        };

        done({
          success: true,
        });

        sendGameState(
          roomCode
        );

        advanceAdtResolver(
          roomCode
        );
      }
    );

    /*
     * =========================
     * GELIJKSTAND
     * =========================
     */

    socket.on(
      "tree-tiebreak-draw",
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
            "tree-tiebreak"
        ) {
          done({
            success: false,
          });

          return;
        }

        const tree =
          room.game.tree;

        if (
          tree.status !== "tie-break"
        ) {
          done({
            success: false,
          });

          return;
        }

        if (
          !tree.tieBreakCandidateIds.includes(
            socket.id
          )
        ) {
          done({
            success:
              false,

            message:
              "Je zit niet in deze gelijkstand.",
          });

          return;
        }

        if (
          !tree.tieBreakPendingIds.includes(
            socket.id
          )
        ) {
          done({
            success:
              false,

            message:
              "Je hebt al een kaart getrokken.",
          });

          return;
        }

        const player =
          room.players.find(
            (item) =>
              item.id === socket.id
          );

        if (!player) {
          done({
            success: false,
          });

          return;
        }

        const card =
          takeCard(room);

        if (!card) {
          done({
            success:
              false,

            message:
              "Geen kaart beschikbaar.",
          });

          return;
        }

        const round =
          tree.tieBreakRounds[
            tree.tieBreakRounds.length - 1
          ];

        if (!round) {
          done({
            success: false,
          });

          return;
        }

        round.draws.push({
          playerId:
            player.id,

          playerName:
            player.name,

          card,
        });

        tree.tieBreakPendingIds =
          tree.tieBreakPendingIds.filter(
            (id) =>
              id !== socket.id
          );

        sendGameState(
          roomCode
        );

        emitSoundEffect(
          roomCode,
          {
            type: "card",
          }
        );

        done({
          success: true,
        });

        if (
          tree.tieBreakPendingIds.length ===
          0
        ) {
          clearTreeTimer(room);

          tree.timer =
            setTimeout(
              () => {
                resolveTieBreakRound(
                  roomCode
                );
              },
              TIE_BREAK_RESULT_DELAY
            );
        }
      }
    );

    /*
     * =========================
     * BUS SETUP
     * =========================
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

        if (
          socket.id !==
            bus.activeDriverId ||
          bus.status !==
            "draw-length"
        ) {
          done({
            success:
              false,

            message:
              "Alleen de speler in de bus kan deze kaart trekken.",
          });

          return;
        }

        const card =
          takeCard(room);

        if (!card) {
          done({
            success:
              false,

            message:
              "Geen kaart beschikbaar.",
          });

          return;
        }

        bus.lengthCard =
          card;

        bus.length =
          card.value;

        addToDiscard(
          room,
          card
        );

        bus.status =
          "draw-open";

        sendGameState(
          roomCode
        );

        emitSoundEffect(
          roomCode,
          {
            type: "card",
          }
        );

        done({
          success: true,
        });
      }
    );

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

        if (
          socket.id !==
            bus.activeDriverId ||
          bus.status !==
            "draw-open" ||
          !bus.lengthCard
        ) {
          done({
            success:
              false,

            message:
              "Alleen de speler in de bus kan deze kaart trekken.",
          });

          return;
        }

        const card =
          takeCard(room);

        if (!card) {
          done({
            success:
              false,

            message:
              "Geen kaart beschikbaar.",
          });

          return;
        }

        bus.openCountCard =
          card;

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
            success:
              false,

            message:
              "Bus kon niet worden gelegd.",
          });

          return;
        }

        sendGameState(
          roomCode
        );

        emitSoundEffect(
          roomCode,
          {
            type: "card",
          }
        );

        done({
          success: true,
        });
      }
    );

    socket.on(
      "bus-set-checkpoints",
      (
        { checkpoints },
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
            "bus-setup"
        ) {
          done({
            success: false,
          });

          return;
        }

        const bus =
          room.game.bus;

        if (
          socket.id !==
            bus.activeDriverId ||
          bus.status !==
            "checkpoints"
        ) {
          done({
            success:
              false,

            message:
              "Alleen de speler in de bus kan de checkpoints instellen.",
          });

          return;
        }

        const safe =
          Array.isArray(checkpoints)
            ? checkpoints
            : [];

        bus.checkpoints =
          [
            ...new Set(
              safe
                .map(Number)
                .filter(
                  (index) =>
                    Number.isInteger(index) &&
                    index > 0 &&
                    index < bus.length
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

        if (
          socket.id !==
            bus.activeDriverId ||
          bus.status !==
            "checkpoints"
        ) {
          done({
            success: false,
          });

          return;
        }

        bus.status =
          "ready";

        sendGameState(
          roomCode
        );

        done({
          success: true,
        });
      }
    );

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

        if (
          socket.id !==
            bus.activeDriverId ||
          bus.status !==
            "ready"
        ) {
          done({
            success:
              false,

            message:
              "Alleen de speler in de bus kan de bus starten.",
          });

          return;
        }

        room.game.phase =
          "bus";

        bus.status =
          "playing";

        bus.currentIndex =
          0;

        bus.activeCheckpointIndex =
          null;

        bus.checkpointRetryUsedIndex =
          null;

        sendGameState(
          roomCode
        );

        emitSoundEffect(
          roomCode,
          {
            type: "bus-horn",
          }
        );

        done({
          success: true,
        });
      }
    );

    /*
     * =========================
     * BUS GOK
     * =========================
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
          room.game.phase !== "bus"
        ) {
          done({
            success: false,
          });

          return;
        }

        const bus =
          room.game.bus;

        if (
          bus.status !== "playing" ||
          bus.activeDriverId !== socket.id
        ) {
          done({
            success: false,
          });

          return;
        }

        activateCheckpointIfNeeded(
          bus
        );

        const normalizedGuess =
          String(
            guess || ""
          )
            .trim()
            .toLowerCase();

        if (
          normalizedGuess !== "hoger" &&
          normalizedGuess !== "lager"
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

        pile.revealed =
          true;

        const referenceCard =
          pile.card;

        /*
         * BELANGRIJK:
         *
         * takeCard() controleert bij IEDERE gok opnieuw:
         *
         * stock leeg?
         * -> aflegstapel volledig schudden
         * -> nieuwe stock
         *
         * Dat kan ronde 1, 2, 3, 4, 5... onbeperkt.
         */
        const newCard =
          takeCard(room);

        if (!newCard) {
          done({
            success:
              false,

            message:
              "Geen kaart beschikbaar.",
          });

          return;
        }

        /*
         * De oude bovenste kaart is nu gebruikt.
         * Die verhuist naar de aflegstapel.
         */
        addToDiscard(
          room,
          referenceCard
        );

        /*
         * De nieuwe kaart blijft bovenop
         * de buspositie liggen.
         */
        pile.card =
          newCard;

        pile.revealed =
          true;

        if (
          newCard.value ===
          referenceCard.value
        ) {
          const drinks =
            position + 1;

          const doubleRestartIndex =
            bus.checkpointFailRule ===
              "safe"
              ? getSafeRestartIndex(bus)
              : 0;

          bus.checkpointRetryUsedIndex =
            null;

          const busIsFull =
            bus.doubleRule ===
              "take-along" &&
            room.players.every(
              (player) =>
                bus.riders.includes(
                  player.id
                )
            );

          if (busIsFull) {
            bus.result = {
              type:
                "wrong",

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

              busFull:
                true,

              drinks,

              restartIndex:
                doubleRestartIndex,

              secondChance:
                false,

              checkpointSafe:
                bus.checkpointFailRule ===
                  "safe" &&
                bus.activeCheckpointIndex !==
                  null,
            };

            bus.status =
              "result";

            sendGameState(
              roomCode
            );

            emitSoundEffect(
              roomCode,
              {
                type:
                  "bus-card-result",

                result:
                  "wrong",
              }
            );

            continueBusAfterResult(
              roomCode,
              false,
              doubleRestartIndex
            );

            done({
              success: true,
            });

            return;
          }

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

            busFull:
              false,

            drinks,

            restartIndex:
              doubleRestartIndex,

            secondChance:
              false,

            checkpointSafe:
              false,
          };

          bus.status =
            "double-choice";

          sendGameState(
            roomCode
          );

          emitSoundEffect(
            roomCode,
            {
              type:
                "bus-card-result",

              result:
                "wrong",
            }
          );

          done({
            success: true,
          });

          return;
        }

        const correct =
          normalizedGuess === "hoger"
            ? newCard.value >
              referenceCard.value
            : newCard.value <
              referenceCard.value;

        const drinks =
          position + 1;

        if (correct) {
          bus.checkpointRetryUsedIndex =
            null;

          bus.result = {
            type:
              "correct",

            guess:
              normalizedGuess,

            position,

            fromCard:
              referenceCard,

            newCard,

            correct:
              true,

            double:
              false,

            busFull:
              false,

            drinks:
              0,

            restartIndex:
              position,

            secondChance:
              false,

            checkpointSafe:
              false,
          };

          bus.status =
            "result";

          sendGameState(
            roomCode
          );

          emitSoundEffect(
            roomCode,
            {
              type:
                "bus-card-result",

              result:
                "correct",
            }
          );

          continueBusAfterResult(
            roomCode,
            true,
            position
          );

          done({
            success: true,
          });

          return;
        }

        const isCheckpoint =
          bus.checkpoints.includes(
            position
          );

        let restartIndex = 0;
        let secondChance = false;
        let checkpointSafe = false;

        if (
          bus.checkpointFailRule ===
          "safe"
        ) {
          restartIndex =
            getSafeRestartIndex(
              bus
            );

          checkpointSafe =
            bus.activeCheckpointIndex !==
            null;

          secondChance =
            false;

          bus.checkpointRetryUsedIndex =
            null;
        } else if (
          isCheckpoint &&
          bus.checkpointFailRule ===
            "retry"
        ) {
          if (
            bus.checkpointRetryUsedIndex !==
            position
          ) {
            restartIndex =
              position;

            secondChance =
              true;

            bus.checkpointRetryUsedIndex =
              position;
          } else {
            restartIndex =
              0;

            secondChance =
              false;

            bus.checkpointRetryUsedIndex =
              null;
          }
        } else if (
          isCheckpoint &&
          bus.checkpointFailRule ===
            "reset"
        ) {
          restartIndex =
            0;

          bus.checkpointRetryUsedIndex =
            null;
        } else {
          restartIndex =
            getRestartIndex(
              bus
            );

          bus.checkpointRetryUsedIndex =
            null;
        }

        bus.result = {
          type:
            "wrong",

          guess:
            normalizedGuess,

          position,

          fromCard:
            referenceCard,

          newCard,

          correct:
            false,

          double:
            false,

          busFull:
            false,

          drinks,

          restartIndex,

          secondChance,

          checkpointSafe,
        };

        bus.status =
          "result";

        sendGameState(
          roomCode
        );

        emitSoundEffect(
          roomCode,
          {
            type:
              "bus-card-result",

            result:
              "wrong",
          }
        );

        continueBusAfterResult(
          roomCode,
          false,
          restartIndex
        );

        done({
          success: true,
        });
      }
    );

    socket.on(
      "bus-double-choice",
      (
        { playerId },
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
          room.game.phase !== "bus"
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

        if (
          bus.doubleRule ===
            "take-along" &&
          bus.riders.includes(
            selectedPlayer.id
          )
        ) {
          done({
            success:
              false,

            message:
              "Deze speler zit al in de bus.",
          });

          return;
        }

        const doubleRestartIndex =
          bus.checkpointFailRule ===
            "safe"
            ? getSafeRestartIndex(
                bus
              )
            : 0;

        bus.checkpointRetryUsedIndex =
          null;

        bus.result = {
          ...bus.result,

          type:
            "wrong",

          correct:
            false,

          double:
            true,

          busFull:
            false,

          restartIndex:
            doubleRestartIndex,

          secondChance:
            false,

          checkpointSafe:
            bus.checkpointFailRule ===
              "safe" &&
            bus.activeCheckpointIndex !==
              null,
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

        if (
          room.hostId === socket.id
        ) {
          clearAllTimers(room);

          io.to(roomCode).emit(
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

        if (room.game.tree) {
          room.game.tree.tieBreakCandidateIds =
            room.game.tree.tieBreakCandidateIds.filter(
              (id) =>
                id !== socket.id
            );

          room.game.tree.tieBreakPendingIds =
            room.game.tree.tieBreakPendingIds.filter(
              (id) =>
                id !== socket.id
            );

          room.game.tree.adtPendingResolvers =
            room.game.tree.adtPendingResolvers.filter(
              (id) =>
                id !== socket.id
            );
        }

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