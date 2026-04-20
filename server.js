const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* =========================
   STATIC FILES
========================= */
app.use(express.static("public"));

/* =========================
   FILE UPLOAD (MULTER)
========================= */
const storage = multer.diskStorage({
  destination: "./public/uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ file: "/uploads/" + req.file.filename });
});

/* =========================
   ROOMS DATA
========================= */
let rooms = {
  General: 0,
  Fun: 0,
  Study: 0,
};

/* =========================
   SOCKET CONNECTION
========================= */
io.on("connection", (socket) => {
  /* SEND ROOMS */
  socket.on("getRooms", () => {
    socket.emit("roomsList", rooms);
  });

  /* JOIN ROOM */
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

  /* CHAT MESSAGE */
  socket.on("chatMessage", (msg) => {
    io.to(socket.room).emit("message", {
      text: msg,
    });
  });

  /* =========================
     TYPING FEATURE
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
      rooms[socket.room]--;

      if (rooms[socket.room] < 0) rooms[socket.room] = 0;

      io.emit("roomsList", rooms);

      io.to(socket.room).emit("message", {
        text: socket.username + " left the room",
      });
    }
  });
});

/* =========================
   START SERVER
========================= */
const PORT = 3000;
server.listen(PORT, () => {
  console.log("🚀 Server running on http://localhost:" + PORT);
});
