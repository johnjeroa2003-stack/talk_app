const socket = io();

let username = prompt("Enter your name");
let room = "";

const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const typingStatus = document.getElementById("typingStatus");

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
  document.getElementById("chatApp").style.display = "block";

  document.getElementById("roomName").innerText = r;

  socket.emit("joinRoom", { username, room });
}

/* RANDOM */
function joinRandom() {
  const rooms = document.querySelectorAll(".card");
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

  socket.emit("stopTyping");
  input.value = "";
}

function addMessage(msg, type) {
  const div = document.createElement("div");
  div.className = "message " + type;

  if (msg.match(/\.(jpg|png|gif)$/)) {
    div.innerHTML = `<img src="${msg}" width="150">`;
  } else {
    div.innerText = msg;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* FILE */
function openFile() {
  document.getElementById("fileInput").click();
}

document.getElementById("fileInput").onchange = () => {
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("file", file);

  fetch("/upload", { method: "POST", body: formData })
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
  typingStatus.innerText = user + " is typing...";
});

socket.on("stopTyping", () => {
  typingStatus.innerText = "";
});

/* VOICE (basic only) */
async function startVoice() {
  await navigator.mediaDevices.getUserMedia({ audio: true });
  alert("Voice enabled (basic)");
}

/* EXIT */
function leaveRoom() {
  location.reload();
}
