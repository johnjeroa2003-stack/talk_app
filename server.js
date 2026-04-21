const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/uploads", express.static("public/uploads"));

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

/* DATA */
let rooms = {
  General: { users: 0, max: 10 },
  Fun: { users: 0, max: 10 },
  Study: { users: 0, max: 10 },
};

let usersInRoom = {};
let userSockets = {};
let messageStatus = {}; // message tracking

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
    socket.join(room);
    socket.username = username;
    socket.room = room;

    userSockets[username] = socket.id;

    if (!usersInRoom[room]) usersInRoom[room] = [];
    usersInRoom[room].push(username);

    rooms[room].users++;

    io.emit("roomsList", rooms);
    io.to(room).emit("roomUsers", usersInRoom[room]);
  });

  /* CHAT WITH STATUS */
  socket.on("chatMessage", (data) => {
    const id = Date.now();

    messageStatus[id] = {
      seenBy: [],
    };

    io.to(socket.room).emit("message", {
      id,
      text: data.text,
      user: data.user,
      avatar: data.avatar || "",
    });
  });

  /* MESSAGE SEEN */
  socket.on("messageSeen", (id) => {
    if (messageStatus[id]) {
      messageStatus[id].seenBy.push(socket.username);

      io.to(socket.room).emit("messageStatus", {
        id,
        seen: messageStatus[id].seenBy.length,
      });
    }
  });

  /* DELETE MESSAGE */
  socket.on("deleteMessage", (id) => {
    io.to(socket.room).emit("deleteMessage", id);
  });

  socket.on("disconnect", () => {
    if (socket.room && rooms[socket.room]) {
      rooms[socket.room].users--;

      usersInRoom[socket.room] = (usersInRoom[socket.room] || []).filter(
        (u) => u !== socket.username,
      );

      io.emit("roomsList", rooms);
      io.to(socket.room).emit("roomUsers", usersInRoom[socket.room]);
    }
  });
});

server.listen(3000, () => console.log("🚀 Server running"));
