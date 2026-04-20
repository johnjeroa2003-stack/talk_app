const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {
  General: { users: 0, max: 10 },
  Fun: { users: 0, max: 10 },
  Study: { users: 0, max: 10 },
};

io.on("connection", (socket) => {
  socket.on("getRooms", () => {
    socket.emit("roomsList", rooms);
  });

  socket.on("createRoom", ({ room, max }) => {
    if (!rooms[room]) {
      rooms[room] = { users: 0, max: max || 10 };
      io.emit("roomsList", rooms);
    }
  });

  socket.on("joinRoom", ({ username, room }) => {
    if (!rooms[room]) {
      rooms[room] = { users: 0, max: 10 };
    }

    if (rooms[room].users >= rooms[room].max) {
      socket.emit("roomFull");
      return;
    }

    socket.join(room);
    socket.username = username;
    socket.room = room;

    rooms[room].users++;

    io.emit("roomsList", rooms);

    // ✅ IMPORTANT: send JOIN SUCCESS event
    socket.emit("joinedRoom", room);

    io.to(room).emit("message", {
      text: username + " joined",
      user: "system",
    });
  });

  socket.on("chatMessage", ({ text, user }) => {
    io.to(socket.room).emit("message", { text, user });
  });

  socket.on("disconnect", () => {
    if (socket.room && rooms[socket.room]) {
      rooms[socket.room].users--;
      if (rooms[socket.room].users < 0) rooms[socket.room].users = 0;

      io.emit("roomsList", rooms);
    }
  });
});

server.listen(3000, () => console.log("Server running"));
