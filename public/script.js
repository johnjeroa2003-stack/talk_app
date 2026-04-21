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
let touchStartX = 0;
let touchEndX = 0;

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

  replyingTo = null;
  document.getElementById("replyBox").style.display = "none";
  input.value = "";
}

/* RECEIVE MESSAGE */
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
   ADD MESSAGE UI
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

  div.onclick = () => {
    const emoji = prompt("React 👍 ❤️ 😂 😡");
    if (!emoji) return;

    socket.emit("reactMessage", {
      id: messageId,
      emoji,
    });
  };

  div.oncontextmenu = (e) => {
    e.preventDefault();
    replyingTo = msg;

    document.getElementById("replyBox").style.display = "block";
    document.getElementById("replyText").innerText = msg;
  };

  div.style.transition = "transform 0.2s";

  div.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  div.addEventListener("touchmove", (e) => {
    let moveX = e.changedTouches[0].screenX - touchStartX;

    if (moveX > 0 && moveX < 100) {
      div.style.transform = `translateX(${moveX}px)`;
    }
  });

  div.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;

    if (touchEndX - touchStartX > 80) {
      replyingTo = msg;

      const replyBox = document.getElementById("replyBox");
      const replyText = document.getElementById("replyText");

      if (replyBox && replyText) {
        replyBox.style.display = "block";
        replyText.innerText = msg;
      }
    }

    div.style.transform = "translateX(0px)";
  });

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* =========================
   CANCEL REPLY
========================= */
function cancelReply() {
  replyingTo = null;
  document.getElementById("replyBox").style.display = "none";
}

/* =========================
   ONLINE USERS
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
   ✅ TYPING DOTS UI (ADDED HERE)
========================= */
socket.on("typing", (user) => {
  const box = document.getElementById("typingStatus");
  if (!box) return;

  box.innerHTML = `
    <div class="typing">
      <span></span><span></span><span></span>
    </div>
  `;
});

socket.on("stopTyping", () => {
  const box = document.getElementById("typingStatus");
  if (!box) return;

  box.innerHTML = "";
});

/* =========================
   LOGIN SYSTEM (SIMPLE)
========================= */

function loginUser() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value.trim();

  if (!email || !pass) {
    alert("Enter email & password");
    return;
  }

  // Fake login (store locally)
  localStorage.setItem("chatUser", email);

  document.getElementById("loginScreen").style.display = "none";
}

/* AUTO LOGIN */
window.onload = () => {
  const user = localStorage.getItem("chatUser");

  if (user) {
    document.getElementById("loginScreen").style.display = "none";
  }
};

/* =========================
   LOGIN SYSTEM (SAFE ADD)
========================= */

function loginUser() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value.trim();

  if (!email || !pass) {
    alert("Enter email & password");
    return;
  }

  // Save login
  localStorage.setItem("chatUser", email);

  // Hide login screen
  document.getElementById("loginScreen").style.display = "none";
}

/* AUTO LOGIN */
window.addEventListener("load", () => {
  const user = localStorage.getItem("chatUser");

  if (user) {
    const login = document.getElementById("loginScreen");
    if (login) login.style.display = "none";
  }
});