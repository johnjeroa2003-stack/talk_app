const socket = io();

let username = prompt("Enter your name");
let room = "";

const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");

/* LOAD ROOMS */
socket.emit("getRooms");

socket.on("roomsList", (rooms) => {
  const container = document.getElementById("roomCards");
  container.innerHTML = "";

  for (let r in rooms) {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${r}</h3>
      <p>${rooms[r]} people inside</p>
    `;

    div.onclick = () => joinRoom(r);

    container.appendChild(div);
  }
});

/* JOIN ROOM */
function joinRoom(r) {
  room = r;

  document.getElementById("lobby").style.display = "none";
  document.getElementById("chatApp").style.display = "flex";

  document.getElementById("roomName").innerText = r;

  socket.emit("joinRoom", { username, room });
}

/* RANDOM */
function joinRandom() {
  const cards = document.querySelectorAll(".card");
  if (cards.length) cards[Math.floor(Math.random() * cards.length)].click();
}

/* CREATE */
function createRoom() {
  const name = prompt("Room name?");
  if (name) joinRoom(name);
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
socket.on("message", (data) => {
  addMessage(data.text, "other");
});

function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("chatMessage", username + ": " + msg);
  addMessage("You: " + msg, "you");

  input.value = "";
}

function addMessage(msg, type) {
  const div = document.createElement("div");
  div.className = "message " + type;
  div.innerText = msg;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* EXIT */
function leaveRoom() {
  location.reload();
}

/* ENTER KEY */
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
