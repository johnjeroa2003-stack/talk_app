const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/* FILE STORAGE */
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

let rooms = {};

io.on("connection", (socket) => {
  socket.on("getRooms", () => {
    io.emit("roomsList", rooms);
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

  /* PRIVATE MESSAGE */
  socket.on("privateMessage", ({ to, message }) => {
    io.to(to).emit("privateMessage", {
      username: socket.username,
      message,
      status: "✔✔",
    });
  });

  /* FILE SHARE */
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

  socket.on("typingDM", ({ to, user }) => {
    io.to(to).emit("typingDM", user);
  });

  socket.on("stopTypingDM", ({ to }) => {
    io.to(to).emit("stopTypingDM");
  });

  socket.on("disconnect", () => {
    if (socket.room && rooms[socket.room]) {
      rooms[socket.room]--;
      if (rooms[socket.room] <= 0) delete rooms[socket.room];
      io.emit("roomsList", rooms);
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

server.listen(3000, () => console.log("🚀 Server running on 3000"));
