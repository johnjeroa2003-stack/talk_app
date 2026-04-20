const socket = io();

let username = prompt("Enter your name");
let room = "";

const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");

/* ROOMS */
socket.emit("getRooms");

socket.on("roomsList", (rooms) => {
  const container = document.getElementById("roomCards");
  container.innerHTML = "";

  for (let r in rooms) {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${r}</h3>
      <p>${rooms[r].users} / ${rooms[r].max} users</p>
    `;

    div.onclick = () => joinRoom(r);

    container.appendChild(div);
  }
});

/* JOIN */
function joinRoom(r) {
  room = r;

  socket.emit("joinRoom", { username, room });
}

/* HANDLE FULL ROOM */
socket.on("roomFull", () => {
  alert("❌ Room is full");
});

/* WHEN JOIN SUCCESS */
socket.on("message", (data) => {
  if (data.text.includes("joined the room")) {
    document.getElementById("lobby").style.display = "none";
    document.getElementById("chatApp").style.display = "flex";
    document.getElementById("roomName").innerText = room;
  }

  addMessage(data.text, "other");
});

/* RANDOM */
function joinRandom() {
  const cards = document.querySelectorAll(".card");
  if (cards.length) cards[Math.floor(Math.random() * cards.length)].click();
}

/* CREATE ROOM WITH LIMIT */
function createRoom() {
  const name = prompt("Room name?");
  const max = prompt("Max users? (e.g. 5)");

  if (!name || !max) return;

  socket.emit("createRoom", {
    room: name,
    max: parseInt(max),
  });

  joinRoom(name);
}

/* SEARCH */
function filterRooms() {
  const val = document.getElementById("searchRoom").value.toLowerCase();

  document.querySelectorAll(".card").forEach((c) => {
    c.style.display = c.innerText.toLowerCase().includes(val)
      ? "block"
      : "none";
  });
}

/* CHAT */
function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("chatMessage", username + ": " + msg);
  addMessage("You: " + msg, "you");

  socket.emit("stopTyping");
  input.value = "";
}

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

/* TYPING */
input.addEventListener("input", () => {
  socket.emit("typing", username);

  setTimeout(() => {
    socket.emit("stopTyping");
  }, 1000);
});

/* EXIT */
function leaveRoom() {
  location.reload();
}

/* ENTER */
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
