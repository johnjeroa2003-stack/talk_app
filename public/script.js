const socket = io();

/* =========================
   ELEMENTS
========================= */
const roomCards = document.getElementById("roomCards");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");

let username = "User" + Math.floor(Math.random() * 1000);
let currentRoom = "";

let tempRoom = "";
let userProfile = {
  name: "",
  gender: "",
  avatar: "",
};

/* =========================
   LOAD ROOMS
========================= */
socket.emit("getRooms");

socket.on("roomsList", (rooms) => {
  roomCards.innerHTML = "";

  for (let room in rooms) {
    const div = document.createElement("div");
    div.className = "room-card";

    div.innerHTML = `
      <h3>${room}</h3>
      <p>${rooms[room].users}/${rooms[room].max}</p>
    `;

    div.onclick = () => joinRoom(room);

    roomCards.appendChild(div);
  }
});

/* =========================
   JOIN ROOM (UPDATED ONLY THIS)
========================= */
function joinRoom(room) {
  tempRoom = room;

  document.getElementById("userPopup").style.display = "flex";
}

/* =========================
   CONFIRM USER (NEW)
========================= */
function confirmUser() {
  const name = document.getElementById("nameInput").value.trim();
  const gender = document.getElementById("genderInput").value;
  const file = document.getElementById("avatarInput").files[0];

  if (!name || !gender) {
    alert("Fill all fields");
    return;
  }

  userProfile.name = name;
  userProfile.gender = gender;

  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      userProfile.avatar = e.target.result;
      enterRoom();
    };
    reader.readAsDataURL(file);
  } else {
    enterRoom();
  }
}

/* =========================
   ENTER ROOM (NEW)
========================= */
function enterRoom() {
  document.getElementById("userPopup").style.display = "none";

  username = userProfile.name;
  currentRoom = tempRoom;

  socket.emit("joinRoom", {
    username: userProfile.name,
    room: tempRoom,
  });

  document.getElementById("lobby").style.display = "none";
  document.getElementById("chatApp").style.display = "flex";

  document.getElementById("roomName").innerText = tempRoom;
}

/* =========================
   RANDOM ROOM
========================= */
function joinRandom() {
  const cards = document.querySelectorAll(".room-card");
  if (cards.length === 0) return;

  const random = cards[Math.floor(Math.random() * cards.length)];
  random.click();
}

/* =========================
   CREATE ROOM
========================= */
function createRoom() {
  const room = prompt("Enter room name:");
  if (!room) return;

  socket.emit("createRoom", { room, max: 10 });
}

/* =========================
   CHAT
========================= */
function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("chatMessage", {
    text: msg,
    user: username,
  });

  input.value = "";
}

socket.on("message", (data) => {
  if (data.user === username) {
    addMessage("You: " + data.text, "you");
  } else {
    addMessage(data.user + ": " + data.text, "other");
  }
});

/* =========================
   ADD MESSAGE UI
========================= */
function addMessage(msg, type) {
  const div = document.createElement("div");
  div.className = "message " + type;
  div.innerText = msg;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* =========================
   LEAVE ROOM
========================= */
function leaveRoom() {
  location.reload();
}

/* =========================
   SEARCH ROOMS
========================= */
function filterRooms() {
  const value = document.getElementById("searchRoom").value.toLowerCase();
  const cards = document.querySelectorAll(".room-card");

  cards.forEach((card) => {
    const text = card.innerText.toLowerCase();
    card.style.display = text.includes(value) ? "block" : "none";
  });
}
