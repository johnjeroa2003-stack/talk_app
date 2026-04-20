const socket = io();

const roomCards = document.getElementById("roomCards");
const chatApp = document.getElementById("chatApp");
const lobby = document.getElementById("lobby");

const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");

let username = prompt("Enter your name");
let room = "";

/* GET ROOMS */
socket.emit("getRooms");

socket.on("roomsList", (rooms) => {
  roomCards.innerHTML = "";

  for (let r in rooms) {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${r}</h3>
      <p>Public chat room</p>
      <p class="people">${rooms[r]} people inside</p>
    `;

    div.onclick = () => joinRoom(r);

    roomCards.appendChild(div);
  }
});

/* JOIN */
function joinRoom(r) {
  room = r;

  lobby.style.display = "none";
  chatApp.style.display = "block";

  document.getElementById("roomName").innerText = r;

  socket.emit("joinRoom", { username, room });
}

/* RANDOM */
function joinRandom() {
  const cards = document.querySelectorAll(".card");
  if (cards.length > 0) cards[0].click();
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
  const msg = input.value;
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
