const socket = io();

/* =========================
   SOUND
========================= */
const sendSound = new Audio("/sounds/send.mp3");
const receiveSound = new Audio("/sounds/receive.mp3");

/* =========================
   ELEMENTS
========================= */
const roomListDiv = document.getElementById("roomList");
const chatBox = document.getElementById("chatBox");
const usersList = document.getElementById("usersList");
const status = document.getElementById("status");
const input = document.getElementById("messageInput");

const usernameInput = document.getElementById("usernameInput");
const newRoomInput = document.getElementById("newRoomInput");

let username = "";
let room = "";
let userData = null;

/* =========================
   AUTO LOGIN
========================= */
window.onload = () => {
  const saved = localStorage.getItem("user");

  if (saved) {
    userData = JSON.parse(saved);

    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("chatApp").style.display = "flex";

    username = userData.name;
    socket.emit("userData", userData);
  }

  socket.emit("getRooms");
};

/* =========================
   LOGIN
========================= */
function enterApp() {
  const name = usernameInput.value.trim();
  const age = document.getElementById("ageInput").value.trim();
  const gender = document.getElementById("genderInput").value;

  if (!name || !age || !gender) {
    alert("Fill all fields");
    return;
  }

  userData = { name, age, gender };

  localStorage.setItem("user", JSON.stringify(userData));

  username = name;

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("chatApp").style.display = "flex";

  socket.emit("userData", userData);
}

/* =========================
   ROOMS
========================= */
socket.on("roomsList", (rooms) => {
  roomListDiv.innerHTML = "";

  for (let r in rooms) {
    const div = document.createElement("div");
    div.classList.add("room");

    div.innerHTML = `<span>${r}</span><span>${rooms[r]}</span>`;
    div.onclick = () => joinRoom(r);

    roomListDiv.appendChild(div);
  }
});

function joinRoom(selectedRoom) {
  if (!username) return alert("Login first");

  room = selectedRoom;

  socket.emit("joinRoom", { username, room });

  document.querySelector(".lobby").style.display = "none";
  document.querySelector(".chat-container").style.display = "flex";

  document.getElementById("roomName").innerText = room;

  setTimeout(() => input.focus(), 300);
}

function createRoom() {
  const r = newRoomInput.value.trim();
  if (!r) return;

  joinRoom(r);
}

function leaveRoom() {
  location.reload();
}

/* =========================
   CHAT
========================= */
socket.on("message", (msg) => {
  addMessage(msg, "other");
  receiveSound.play(); // 🔊 receive sound
});

socket.on("roomUsers", (users) => {
  usersList.innerHTML = "";

  users.forEach((u) => {
    const div = document.createElement("div");
    div.innerText = u;
    usersList.appendChild(div);
  });

  status.innerText = users.length + " users";
});

function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("chatMessage", username + ": " + msg);

  addMessage("You: " + msg, "you");

  sendSound.play(); // 🔊 send sound

  if (navigator.vibrate) navigator.vibrate(50);

  input.value = "";
}

/* =========================
   MESSAGE UI + ANIMATION
========================= */
function addMessage(msg, type) {
  const div = document.createElement("div");
  div.classList.add("message", type);

  div.innerText = msg;

  div.style.opacity = "0";
  div.style.transform = "translateY(10px)";

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  setTimeout(() => {
    div.style.transition = "0.2s ease";
    div.style.opacity = "1";
    div.style.transform = "translateY(0)";
  }, 10);
}

/* =========================
   ENTER KEY
========================= */
if (input) {
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
}

if (usernameInput) {
  usernameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") enterApp();
  });
}

if (newRoomInput) {
  newRoomInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") createRoom();
  });
}
