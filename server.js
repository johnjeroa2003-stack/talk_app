const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // your HTML/CSS/JS here

let rooms = {};

io.on("connection", (socket) => {
  console.log("User connected");

  /* =========================
     GET ROOMS
  ========================= */
  socket.on("getRooms", () => {
    socket.emit("roomsList", rooms);
  });

  /* =========================
     CREATE ROOM
  ========================= */
  socket.on("createRoom", ({ room, max }) => {
    if (!rooms[room]) {
      rooms[room] = {
        users: 0,
        max: max || 10,
      };
    }

    io.emit("roomsList", rooms);
  });

  /* =========================
     JOIN ROOM
  ========================= */
  socket.on("joinRoom", ({ username, room }) => {
    if (!rooms[room]) return;

    if (rooms[room].users >= rooms[room].max) {
      socket.emit("message", {
        user: "system",
        text: "Room is full",
      });
      return;
    }

    socket.join(room);
    socket.room = room;
    socket.username = username;

    rooms[room].users++;

    io.to(room).emit("message", {
      user: "system",
      text: username + " joined the room",
    });

    io.emit("roomsList", rooms);
  });

  /* =========================
     CHAT MESSAGE
  ========================= */
  socket.on("chatMessage", (data) => {
    if (!socket.room) return;

    io.to(socket.room).emit("message", data);
  });

  /* =========================
     TYPING
  ========================= */
  socket.on("typing", (user) => {
    socket.to(socket.room).emit("typing", user);
  });

  socket.on("stopTyping", () => {
    socket.to(socket.room).emit("stopTyping");
  });

  /* =========================
     DISCONNECT
  ========================= */
  socket.on("disconnect", () => {
    if (socket.room && rooms[socket.room]) {
      rooms[socket.room].users--;

      io.emit("roomsList", rooms);
    }

    console.log("User disconnected");
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
