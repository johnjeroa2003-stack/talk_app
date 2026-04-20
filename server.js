const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/* FILE UPLOAD */
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

/* ROOMS */
let rooms = {
  General: { users: 0, max: 10 },
  Fun: { users: 0, max: 10 },
  Study: { users: 0, max: 10 },
};

/* SOCKET */
io.on("connection", (socket) => {
  /* SEND ROOMS */
  socket.on("getRooms", () => {
    socket.emit("roomsList", rooms);
  });

  /* 🔥 CREATE ROOM WITH LIMIT (ADDED) */
  socket.on("createRoom", ({ room, max }) => {
    if (!rooms[room]) {
      rooms[room] = { users: 0, max: max || 10 };
      io.emit("roomsList", rooms);
    }
  });

  /* JOIN ROOM */
  socket.on("joinRoom", ({ username, room }) => {
    if (!rooms[room]) {
      rooms[room] = { users: 0, max: 10 };
    }

    /* CHECK LIMIT */
    if (rooms[room].users >= rooms[room].max) {
      socket.emit("roomFull");
      return;
    }

    socket.join(room);
    socket.username = username;
    socket.room = room;

    rooms[room].users++;

    io.emit("roomsList", rooms);

    io.to(room).emit("message", {
      text: username + " joined the room",
    });
  });

  /* CHAT */
  socket.on("chatMessage", (msg) => {
    io.to(socket.room).emit("message", { text: msg });
  });

  /* TYPING */
  socket.on("typing", (user) => {
    socket.to(socket.room).emit("typing", user);
  });

  socket.on("stopTyping", () => {
    socket.to(socket.room).emit("stopTyping");
  });

  /* DISCONNECT */
  socket.on("disconnect", () => {
    if (socket.room && rooms[socket.room]) {
      rooms[socket.room].users--;

      if (rooms[socket.room].users < 0) rooms[socket.room].users = 0;

      io.emit("roomsList", rooms);
    }
  });
});

server.listen(3000, () => console.log("Server running"));
