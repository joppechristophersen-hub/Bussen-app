const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

const io = new Server(PORT, {
  cors: {
    origin: "*",
  },
});

const rooms = {};

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

io.on("connection", (socket) => {
  console.log(
    "Nieuwe speler verbonden:",
    socket.id
  );

  socket.on(
    "create-room",
    ({ playerName }, callback) => {
      const roomCode = getUniqueRoomCode();

      rooms[roomCode] = {
        hostId: socket.id,
        players: [
          {
            id: socket.id,
            name: playerName,
            isHost: true,
          },
        ],
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

      if (room.players.length >= 4) {
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

    io.to(roomCode).emit(
      "game-started"
    );

    console.log(
      `Spel gestart in kamer ${roomCode}`
    );
  });

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