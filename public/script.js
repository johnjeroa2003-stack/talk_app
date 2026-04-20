const socket = io();

let username = prompt("Enter your name");
let room = "";

const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");

/* =========================
   ROOMS
========================= */
socket.emit("getRooms");

socket.on("roomsList", (rooms) => {
  const container = document.getElementById("roomCards");
  container.innerHTML = "";

  for (let r in rooms) {
    const div = document.createElement("div");

    div.innerHTML = `
            <h3>${r}</h3>
            <p>${rooms[r]} people inside</p>
        `;

    div.style.margin = "20px";
    div.style.padding = "20px";
    div.style.background = "#111";
    div.style.borderRadius = "10px";
    div.style.display = "inline-block";
    div.style.cursor = "pointer";

    div.onclick = () => joinRoom(r);

    container.appendChild(div);
  }
});

/* =========================
   JOIN
========================= */
function joinRoom(r) {
  room = r;

  document.getElementById("lobby").style.display = "none";
  document.getElementById("chatApp").style.display = "flex";

  document.getElementById("roomName").innerText = r;

  socket.emit("joinRoom", { username, room });
}

/* RANDOM */
function joinRandom() {
  const rooms = document.querySelectorAll("#roomCards div");
  if (rooms.length) rooms[Math.floor(Math.random() * rooms.length)].click();
}

/* CREATE */
function createRoom() {
  const name = prompt("Room name?");
  if (name) joinRoom(name);
}

/* SEARCH */
function filterRooms() {
  const val = document.getElementById("searchRoom").value.toLowerCase();
  document.querySelectorAll("#roomCards div").forEach((c) => {
    c.style.display = c.innerText.toLowerCase().includes(val)
      ? "inline-block"
      : "none";
  });
}

/* =========================
   CHAT
========================= */
socket.on("message", (data) => {
  addMessage(data.text, "other");
});

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
  div.innerText = msg;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* =========================
   TYPING
========================= */
input.addEventListener("input", () => {
  socket.emit("typing", username);

  setTimeout(() => {
    socket.emit("stopTyping");
  }, 1000);
});

socket.on("typing", (user) => {
  document.getElementById("typingStatus").innerText = user + " is typing...";
});

socket.on("stopTyping", () => {
  document.getElementById("typingStatus").innerText = "";
});

/* =========================
   EXIT
========================= */
function leaveRoom() {
  location.reload();
}

/* ENTER KEY */
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
