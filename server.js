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

io.on("connection", (socket) => {
  /* =========================
     GET ROOMS
  ========================= */
  socket.on("getRooms", () => {
    socket.emit("roomsList", rooms);
  });

  /* =========================
     CREATE ROOM (FIXED)
  ========================= */
  socket.on("createRoom", ({ room, max }) => {
    if (!room) return;

    if (!rooms[room]) {
      rooms[room] = { users: 0, max: max || 10 };

      // send updated rooms to ALL users
      io.emit("roomsList", rooms);

      // confirm to creator
      socket.emit("message", {
        user: "system",
        text: `Room "${room}" created successfully`,
      });
    } else {
      socket.emit("message", {
        user: "system",
        text: "Room already exists",
      });
    }
  });

  /* =========================
     JOIN ROOM (FIXED)
  ========================= */
  socket.on("joinRoom", ({ username, room }) => {
    if (!room || !username) return;

    if (!rooms[room]) {
      socket.emit("message", {
        user: "system",
        text: "Room does not exist",
      });
      return;
    }

    // prevent duplicate join
    if (socket.room === room) return;

    socket.join(room);
    socket.username = username;
    socket.room = room;

    userSockets[username] = socket.id;

    rooms[room].users++;

    if (!usersInRoom[room]) usersInRoom[room] = [];

    if (!usersInRoom[room].includes(username)) {
      usersInRoom[room].push(username);
    }

    // update rooms everywhere
    io.emit("roomsList", rooms);

    // send updated users
    io.to(room).emit("onlineUsers", usersInRoom[room]);

    // system message
    io.to(room).emit("message", {
      text: username + " joined",
      user: "system",
    });
  });

  /* =========================
     CHAT
  ========================= */
  socket.on("chatMessage", (data) => {
    if (!socket.room) return;

    io.to(socket.room).emit("message", {
      text: data.text,
      user: data.user,
      avatar: data.avatar || "",
      reply: data.reply || null,
    });
  });

  /* =========================
     REACTIONS
  ========================= */
  socket.on("reactMessage", ({ id, emoji }) => {
    if (!socket.room) return;
    io.to(socket.room).emit("messageReaction", { id, emoji });
  });

  /* =========================
     TYPING
  ========================= */
  socket.on("typing", (user) => {
    if (!socket.room) return;
    socket.to(socket.room).emit("typing", user);
  });

  socket.on("stopTyping", () => {
    if (!socket.room) return;
    socket.to(socket.room).emit("stopTyping");
  });

  /* =========================
     PRIVATE CHAT
  ========================= */
  socket.on("privateMessage", ({ to, text, from }) => {
    const target = userSockets[to];
    if (target) {
      io.to(target).emit("privateMessage", { text, from });
    }
  });

  /* =========================
     DISCONNECT (FIXED)
  ========================= */
  socket.on("disconnect", () => {
    if (socket.room && rooms[socket.room]) {
      rooms[socket.room].users = Math.max(0, rooms[socket.room].users - 1);

      usersInRoom[socket.room] = (usersInRoom[socket.room] || []).filter(
        (u) => u !== socket.username,
      );

      // remove empty room users list
      if (usersInRoom[socket.room].length === 0) {
        delete usersInRoom[socket.room];
      }

      // update UI everywhere
      io.emit("roomsList", rooms);
      io.to(socket.room).emit("onlineUsers", usersInRoom[socket.room] || []);
    }
  });
});

server.listen(3000, () => console.log("🚀 Server running on port 3000"));
