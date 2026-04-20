const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/* =========================
   ROOMS
========================= */
let rooms = {
  General: 0,
  Fun: 0,
  Study: 0,
};

/* =========================
   FILE UPLOAD
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
   SOCKET
========================= */
io.on("connection", (socket) => {
  /* GET ROOMS */
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
     TYPING FEATURE (ALREADY INCLUDED)
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
server.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
