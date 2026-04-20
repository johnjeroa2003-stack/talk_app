const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/* ROOMS */
let rooms = {
  General: 0,
  Fun: 0,
  Study: 0,
};

/* VOICE ROOMS */
let voiceRooms = {};

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

/* SOCKET */
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

    io.to(room).emit("message", {
      text: username + " joined",
      status: "✔✔",
    });

    io.emit("roomsList", rooms);
    io.to(room).emit("roomUsers", getUsers(room));
  });

  socket.on("chatMessage", (msg) => {
    io.to(socket.room).emit("message", {
      text: msg,
      status: "✔✔",
    });
  });

  socket.on("privateMessage", ({ to, message }) => {
    io.to(to).emit("privateMessage", {
      username: socket.username,
      message,
      status: "✔✔",
    });
  });

  socket.on("fileMessage", ({ file, name }) => {
    io.to(socket.room).emit("fileMessage", {
      username: socket.username,
      file,
      name,
    });
  });

  socket.on("privateFile", ({ to, file, name }) => {
    io.to(to).emit("privateFile", {
      username: socket.username,
      file,
      name,
    });
  });

  /* TYPING */
  socket.on("typing", (user) => {
    socket.to(socket.room).emit("typing", user);
  });

  socket.on("stopTyping", () => {
    socket.to(socket.room).emit("stopTyping");
  });

  /* VOICE */
  socket.on("joinVoice", (room) => {
    socket.join("voice_" + room);

    if (!voiceRooms[room]) voiceRooms[room] = [];
    voiceRooms[room].push(socket.id);

    io.to("voice_" + room).emit("voiceUsers", voiceRooms[room]);
  });

  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  socket.on("ice", ({ to, candidate }) => {
    io.to(to).emit("ice", { from: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    if (socket.room && rooms[socket.room]) {
      rooms[socket.room]--;
      if (rooms[socket.room] < 0) rooms[socket.room] = 0;

      io.emit("roomsList", rooms);
      io.to(socket.room).emit("roomUsers", getUsers(socket.room));
    }

    for (let r in voiceRooms) {
      voiceRooms[r] = voiceRooms[r].filter((id) => id !== socket.id);
    }
  });
});

function getUsers(room) {
  const clients = io.sockets.adapter.rooms.get(room);
  if (!clients) return [];

  return [...clients].map((id) => {
    const s = io.sockets.sockets.get(id);
    return { id, name: s?.username || "User" };
  });
}

server.listen(3000, () => console.log("🚀 Server running"));
