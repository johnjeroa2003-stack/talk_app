const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {
  General: 0,
  Fun: 0,
  Study: 0,
};

io.on("connection", (socket) => {
  socket.on("getRooms", () => {
    socket.emit("roomsList", rooms);
  });

  socket.on("joinRoom", ({ username, room }) => {
    socket.join(room);
    socket.username = username;
    socket.room = room;

    if (!rooms[room]) rooms[room] = 0;
    rooms[room]++;

    io.emit("roomsList", rooms);

    io.to(room).emit("message", {
      text: username + " joined the room",
    });
  });

  socket.on("chatMessage", (msg) => {
    io.to(socket.room).emit("message", {
      text: msg,
    });
  });

  /* TYPING */
  socket.on("typing", (user) => {
    socket.to(socket.room).emit("typing", user);
  });

  socket.on("stopTyping", () => {
    socket.to(socket.room).emit("stopTyping");
  });

  socket.on("disconnect", () => {
    if (socket.room && rooms[socket.room]) {
      rooms[socket.room]--;

      if (rooms[socket.room] < 0) rooms[socket.room] = 0;

      io.emit("roomsList", rooms);
    }
  });
});

server.listen(3000, () => console.log("Server running"));
