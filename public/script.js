const socket = io();

let username = prompt("Enter your name");
let room = "";
let currentRooms = {};

const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");

/* LOAD ROOMS */
socket.emit("getRooms");

socket.on("roomsList", (rooms) => {
  currentRooms = rooms;

  const container = document.getElementById("roomCards");
  container.innerHTML = "";

  for (let r in rooms) {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${r}</h3>
      <p>${rooms[r].users} / ${rooms[r].max}</p>
    `;

    div.onclick = () => {
      socket.emit("joinRoom", { username, room: r });
    };

    container.appendChild(div);
  }
});

/* RANDOM ROOM */
function joinRandom() {
  const available = Object.keys(currentRooms).filter(
    (r) => currentRooms[r].users < currentRooms[r].max,
  );

  if (!available.length) return alert("No rooms available");

  const randomRoom = available[Math.floor(Math.random() * available.length)];

  socket.emit("joinRoom", { username, room: randomRoom });
}

/* JOIN SUCCESS */
socket.on("joinedRoom", (r) => {
  room = r;

  document.getElementById("lobby").style.display = "none";
  document.getElementById("chatApp").style.display = "flex";

  document.getElementById("roomName").innerText = r;
});

/* ROOM FULL */
socket.on("roomFull", () => alert("Room is full"));

/* ONLINE USERS */
socket.on("roomUsers", (users) => {
  const box = document.getElementById("usersList");
  if (!box) return;

  box.innerHTML = "";
  users.forEach((u) => {
    const div = document.createElement("div");
    div.innerText = u;
    box.appendChild(div);
  });
});

/* MESSAGE */
socket.on("message", (data) => {
  if (data.user === username) {
    addMessage("You: " + data.text, "you");
  } else {
    addMessage(data.text, "other");
  }
});

/* SEND */
function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("chatMessage", {
    text: msg,
    user: username,
  });

  input.value = "";
}

/* ADD MESSAGE */
function addMessage(msg, type) {
  const div = document.createElement("div");
  div.className = "message " + type;

  if (msg.match(/\.(jpg|png|gif|jpeg)$/)) {
    div.innerHTML = `<img src="${msg}" width="150">`;
  } else {
    div.innerText = msg;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* FILE UPLOAD */
function openFile() {
  document.getElementById("fileInput").click();
}

document.getElementById("fileInput").onchange = () => {
  const file = fileInput.files[0];

  const formData = new FormData();
  formData.append("file", file);

  fetch("/upload", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      socket.emit("chatMessage", {
        text: data.file,
        user: username,
      });
    });
};

/* CREATE ROOM */
function createRoom() {
  const name = prompt("Room name?");
  const max = prompt("Max users?");

  if (!name) return;

  socket.emit("createRoom", {
    room: name,
    max: parseInt(max) || 10,
  });

  socket.emit("joinRoom", { username, room: name });
}

/* EXIT */
function leaveRoom() {
  location.reload();
}

/* ENTER */
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
