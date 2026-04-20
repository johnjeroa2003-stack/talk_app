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
      <p>${rooms[r]} people inside</p>
    `;

    div.onclick = () => joinRoom(r);

    container.appendChild(div);
  }
});

/* JOIN */
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

  socket.emit("stopTyping");
  input.value = "";
}

function addMessage(msg, type) {
  const div = document.createElement("div");
  div.className = "message " + type;

  /* IMAGE / GIF SUPPORT */
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
      socket.emit("chatMessage", data.file);
    });
};

/* TYPING */
input.addEventListener("input", () => {
  socket.emit("typing", username);

  setTimeout(() => {
    socket.emit("stopTyping");
  }, 1000);
});

socket.on("typing", (user) => {
  let el = document.getElementById("typingStatus");
  if (el) el.innerText = user + " is typing...";
});

socket.on("stopTyping", () => {
  let el = document.getElementById("typingStatus");
  if (el) el.innerText = "";
});

/* EXIT */
function leaveRoom() {
  location.reload();
}

/* ENTER */
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
