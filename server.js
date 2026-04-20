const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* =========================
   FIX: Serve frontend properly
========================= */

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

/* =========================
   ROOMS DATA
========================= */

let rooms = {};

/* =========================
   SOCKET CONNECTION
========================= */

io.on("connection", (socket) => {
  /* Get rooms */
  socket.on("getRooms", () => {
    let summary = {};
    for (let r in rooms) summary[r] = rooms[r].length;
    socket.emit("roomsList", summary);
  });

  /* Join room */
  socket.on("joinRoom", ({ username, room }) => {
    socket.join(room);
    socket.username = username;
    socket.room = room;

    if (!rooms[room]) rooms[room] = [];
    rooms[room].push(socket);

    updateUsers(room);
    updateRooms();

    socket.to(room).emit("message", username + " joined");
  });

  /* Chat messages */
  socket.on("chatMessage", (msg) => {
    io.to(socket.room).emit("message", msg);
  });

  /* =========================
     🎙 VOICE SIGNALING
  ========================= */

  socket.on("voice-ready", () => {
    socket.to(socket.room).emit("voice-user-joined", socket.id);
  });

  socket.on("voice-offer", ({ to, offer }) => {
    io.to(to).emit("voice-offer", { from: socket.id, offer });
  });

  socket.on("voice-answer", ({ to, answer }) => {
    io.to(to).emit("voice-answer", { from: socket.id, answer });
  });

  socket.on("voice-ice", ({ to, candidate }) => {
    io.to(to).emit("voice-ice", { from: socket.id, candidate });
  });

  /* 🟢 Speaking indicator */
  socket.on("speaking", (status) => {
    socket.to(socket.room).emit("user-speaking", {
      user: socket.username,
      speaking: status,
    });
  });

  /* =========================
     DISCONNECT
  ========================= */

  socket.on("disconnect", () => {
    const room = socket.room;
    if (!room || !rooms[room]) return;

    rooms[room] = rooms[room].filter((s) => s.id !== socket.id);

    if (rooms[room].length === 0) delete rooms[room];

    updateUsers(room);
    updateRooms();

    socket.to(room).emit("message", socket.username + " left");
  });

  /* =========================
     HELPERS
  ========================= */

  function updateUsers(room) {
    const users = rooms[room]?.map((s) => s.username) || [];
    io.to(room).emit("roomUsers", users);
  }

  function updateRooms() {
    let summary = {};
    for (let r in rooms) summary[r] = rooms[r].length;
    io.emit("roomsList", summary);
  }
});

/* =========================
   START SERVER (DEPLOY SAFE)
========================= */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
