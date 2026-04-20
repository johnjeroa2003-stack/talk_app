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

/* ROOMS */
let rooms = {
  General: { users: 0, max: 10 },
  Fun: { users: 0, max: 10 },
  Study: { users: 0, max: 10 },
};

let usersInRoom = {};

/* SOCKET */
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
    if (!rooms[room]) {
      rooms[room] = { users: 0, max: 10 };
    }

    if (rooms[room].users >= rooms[room].max) {
      socket.emit("roomFull");
      return;
    }

    socket.join(room);
    socket.username = username;
    socket.room = room;

    rooms[room].users++;

    if (!usersInRoom[room]) usersInRoom[room] = [];
    usersInRoom[room].push(username);

    io.emit("roomsList", rooms);

    socket.emit("joinedRoom", room);

    io.to(room).emit("roomUsers", usersInRoom[room]);

    io.to(room).emit("message", {
      text: username + " joined",
      user: "system",
    });
  });

  socket.on("chatMessage", ({ text, user }) => {
    io.to(socket.room).emit("message", { text, user });
  });

  socket.on("disconnect", () => {
    if (socket.room && rooms[socket.room]) {
      rooms[socket.room].users--;
      if (rooms[socket.room].users < 0) rooms[socket.room].users = 0;

      usersInRoom[socket.room] = (usersInRoom[socket.room] || []).filter(
        (u) => u !== socket.username,
      );

      io.emit("roomsList", rooms);
      io.to(socket.room).emit("roomUsers", usersInRoom[socket.room]);

      io.to(socket.room).emit("message", {
        text: socket.username + " left",
        user: "system",
      });
    }
  });
});

server.listen(3000, () => console.log("🚀 Server running"));
