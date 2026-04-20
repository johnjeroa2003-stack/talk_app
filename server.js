const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/* =========================
   DEFAULT ROOMS (IMPORTANT)
========================= */
let rooms = {
  General: 0,
  Fun: 0,
  Study: 0,
};

/* =========================
   FILE STORAGE
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

    io.to(room).emit("message", {
      text: username + " joined",
      status: "✔✔",
    });

    io.emit("roomsList", rooms);

    io.to(room).emit("roomUsers", getUsers(room));
  });

  /* ROOM MESSAGE */
  socket.on("chatMessage", (msg) => {
    io.to(socket.room).emit("message", {
      text: msg,
      status: "✔✔",
    });
  });

  /* =========================
     PRIVATE MESSAGE (DM)
  ========================= */
  socket.on("privateMessage", ({ to, message }) => {
    io.to(to).emit("privateMessage", {
      username: socket.username,
      message,
      status: "✔✔",
    });
  });

  /* =========================
     FILE SHARE (ROOM)
  ========================= */
  socket.on("fileMessage", ({ file, name }) => {
    io.to(socket.room).emit("fileMessage", {
      username: socket.username,
      file,
      name,
    });
  });

  /* FILE SHARE (DM) */
  socket.on("privateFile", ({ to, file, name }) => {
    io.to(to).emit("privateFile", {
      username: socket.username,
      file,
      name,
    });
  });

  /* =========================
     TYPING (ROOM)
  ========================= */
  socket.on("typing", (user) => {
    socket.to(socket.room).emit("typing", user);
  });

  socket.on("stopTyping", () => {
    socket.to(socket.room).emit("stopTyping");
  });

  /* =========================
     TYPING (DM)
  ========================= */
  socket.on("typingDM", ({ to, user }) => {
    io.to(to).emit("typingDM", user);
  });

  socket.on("stopTypingDM", ({ to }) => {
    io.to(to).emit("stopTypingDM");
  });

  /* =========================
     DISCONNECT
  ========================= */
  socket.on("disconnect", () => {
    if (socket.room && rooms[socket.room]) {
      rooms[socket.room]--;
      if (rooms[socket.room] <= 0) rooms[socket.room] = 0;

      io.emit("roomsList", rooms);
      io.to(socket.room).emit("roomUsers", getUsers(socket.room));
    }
  });
});

/* =========================
   GET USERS
========================= */
function getUsers(room) {
  const clients = io.sockets.adapter.rooms.get(room);
  if (!clients) return [];

  return [...clients].map((id) => {
    const s = io.sockets.sockets.get(id);
    return { id, name: s?.username || "User" };
  });
}

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("🚀 Server running on " + PORT);
});
