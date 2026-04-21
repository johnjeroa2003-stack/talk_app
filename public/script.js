const socket = io();

/* =========================
   ELEMENTS
========================= */
const roomCards = document.getElementById("roomCards");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");

let typingTimeout;

let username = "User" + Math.floor(Math.random() * 1000);
let currentRoom = "";

let tempRoom = "";
let userProfile = {
  name: "",
  gender: "",
  avatar: "",
};
let replyingTo = null;
/* =========================
   TYPING SEND
========================= */
input.addEventListener("input", () => {
  socket.emit("typing", username);

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping");
  }, 1000);
});

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
   JOIN ROOM
========================= */
function joinRoom(room) {
  tempRoom = room;
  document.getElementById("userPopup").style.display = "flex";
}

/* =========================
   CONFIRM USER
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
   ENTER ROOM
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
    reply: replyingTo,
  });

  replyingTo = null; // reset reply
  input.value = "";
}

socket.on("message", (data) => {
  if (data.user === "system") {
    addMessage(data.text, "other", "", null);
    return;
  }

  if (data.user === username) {
    addMessage("You: " + data.text, "you", data.avatar, data.reply);
  } else {
    addMessage(data.user + ": " + data.text, "other", data.avatar, data.reply);
  }
});
/* =========================
   ADD MESSAGE UI (FIXED)
========================= */
function addMessage(msg, type, avatar, reply = null) {
  const div = document.createElement("div");
  div.className = "message " + type;

  const img =
    avatar && avatar !== ""
      ? `<img src="${avatar}" class="avatar">`
      : `<img src="https://i.imgur.com/6VBx3io.png" class="avatar">`;

  const messageId = Date.now();
  div.dataset.id = messageId;

  let replyHTML = "";
  if (reply) {
    replyHTML = `<div style="font-size:12px; opacity:0.7;">↪ ${reply}</div>`;
  }

  div.innerHTML = `
    ${type === "other" ? img : ""}
    <div>
      ${replyHTML}
      <span>${msg}</span>
      <div class="reactions"></div>
    </div>
    ${type === "you" ? img : ""}
  `;

  // 👉 click = react
  div.onclick = () => {
    const emoji = prompt("React 👍 ❤️ 😂 😡");
    if (!emoji) return;

    socket.emit("reactMessage", {
      id: messageId,
      emoji,
    });
  };

  // 👉 RIGHT CLICK / HOLD = reply
  div.oncontextmenu = (e) => {
    e.preventDefault();
    replyingTo = msg;
    alert("Replying to: " + msg);
  };

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

/* =========================
   ONLINE USERS UI
========================= */
socket.on("onlineUsers", (users) => {
  const box = document.getElementById("onlineUsers");
  if (!box) return;

  box.innerHTML = "";

  users.forEach((user) => {
    const div = document.createElement("div");
    div.className = "online-user";

    div.innerHTML = `
      <div style="position:relative;">
        <img src="https://i.imgur.com/6VBx3io.png">
        <span class="online-dot"></span>
      </div>
      <span>${user}</span>
    `;

    div.onclick = () => openDM(user);

    box.appendChild(div);
  });
});

/* =========================
   PRIVATE CHAT (DM)
========================= */
let currentDMUser = "";

function openDM(user) {
  currentDMUser = user;
  document.getElementById("dmBox").style.display = "block";
  document.getElementById("dmUser").innerText = user;
  document.getElementById("dmMessages").innerHTML = "";
}

function closeDM() {
  document.getElementById("dmBox").style.display = "none";
}

function sendDM() {
  const input = document.getElementById("dmInput");
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("privateMessage", {
    to: currentDMUser,
    text: msg,
    from: username,
  });

  addDMMessage("You: " + msg);
  input.value = "";
}

function addDMMessage(msg) {
  const div = document.createElement("div");
  div.innerText = msg;
  document.getElementById("dmMessages").appendChild(div);
}

socket.on("privateMessage", ({ text, from }) => {
  openDM(from);
  addDMMessage(from + ": " + text);
});

/* =========================
   SHOW TYPING
========================= */
socket.on("typing", (user) => {
  const box = document.getElementById("typingStatus");
  if (!box) return;

  box.innerText = user + " is typing...";
});

socket.on("stopTyping", () => {
  const box = document.getElementById("typingStatus");
  if (!box) return;

  box.innerText = "";
});

/* =========================
   SHOW REACTIONS (FIXED - ONLY ONCE)
========================= */
socket.on("messageReaction", ({ id, emoji }) => {
  const msg = document.querySelector(`[data-id='${id}']`);
  if (!msg) return;

  const reactBox = msg.querySelector(".reactions");
  if (!reactBox) return;

  reactBox.innerText += " " + emoji;
});
