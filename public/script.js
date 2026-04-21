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
      ${
        msg.startsWith("blob:")
          ? `<audio controls src="${msg}"></audio>`
          : `<span>${msg}</span>`
      }
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
   VOICE MESSAGE
========================= */
let mediaRecorder;
let audioChunks = [];

const recordBtn = document.getElementById("recordBtn");

recordBtn.addEventListener("mousedown", startRecording);
recordBtn.addEventListener("mouseup", stopRecording);

// Mobile support
recordBtn.addEventListener("touchstart", startRecording);
recordBtn.addEventListener("touchend", stopRecording);

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.start();

    recordBtn.innerText = "🔴 Recording...";
  } catch (err) {
    alert("Mic permission denied");
  }
}

function stopRecording() {
  if (!mediaRecorder) return;

  mediaRecorder.stop();

  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const audioURL = URL.createObjectURL(blob);

    // send as message
    socket.emit("chatMessage", {
      text: audioURL,
      user: username,
      audio: true,
    });

    recordBtn.innerText = "🎤";
  };
}

/* =========================
   WHATSAPP STYLE VOICE RECORD
========================= */

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let startX = 0;

const recordBtn = document.getElementById("recordBtn");

if (recordBtn) {

  // HOLD START
  recordBtn.addEventListener("mousedown", startRecording);
  recordBtn.addEventListener("touchstart", startRecording);

  // MOVE (SLIDE CANCEL)
  recordBtn.addEventListener("mousemove", handleMove);
  recordBtn.addEventListener("touchmove", handleMove);

  // RELEASE
  recordBtn.addEventListener("mouseup", stopRecording);
  recordBtn.addEventListener("touchend", stopRecording);
}

/* START RECORD */
async function startRecording(e) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    isRecording = true;

    startX = e.type.includes("mouse")
      ? e.clientX
      : e.touches[0].clientX;

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      if (!isRecording) return; // cancelled

      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);

      addVoiceMessage(url);
    };

    mediaRecorder.start();

    // UI feedback
    recordBtn.innerText = "🎙️ Slide to cancel";
    recordBtn.style.background = "#ff4d4d";

  } catch (err) {
    alert("Microphone permission denied");
  }
}

/* HANDLE SLIDE */
function handleMove(e) {
  if (!mediaRecorder || mediaRecorder.state !== "recording") return;

  const currentX = e.type.includes("mouse")
    ? e.clientX
    : e.touches[0].clientX;

  const diff = startX - currentX;

  // 👉 SLIDE LEFT TO CANCEL
  if (diff > 80) {
    cancelRecording();
  }
}

/* STOP (SEND) */
function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;

  mediaRecorder.stop();
  isRecording = true;

  resetButton();
}

/* CANCEL */
function cancelRecording() {
  if (!mediaRecorder) return;

  isRecording = false;
  mediaRecorder.stop();

  resetButton();

  // Optional feedback
  alert("Recording cancelled");
}

/* RESET BUTTON UI */
function resetButton() {
  recordBtn.innerText = "🎤";
  recordBtn.style.background = "";
}

/* SHOW VOICE MESSAGE */
function addVoiceMessage(audioURL) {
  const div = document.createElement("div");
  div.className = "message you";

  div.innerHTML = `
    <div>
      🎤 <audio controls src="${audioURL}"></audio>
    </div>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* =========================
   VOICE (SAFE ADD-ON)
========================= */

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let recordStartX = 0;

const recordBtn = document.getElementById("recordBtn");

if (recordBtn) {

  // HOLD START
  recordBtn.addEventListener("mousedown", startVoice);
  recordBtn.addEventListener("touchstart", startVoice);

  // MOVE (SLIDE CANCEL)
  recordBtn.addEventListener("mousemove", moveVoice);
  recordBtn.addEventListener("touchmove", moveVoice);

  // RELEASE
  recordBtn.addEventListener("mouseup", stopVoice);
  recordBtn.addEventListener("touchend", stopVoice);
}

/* START */
async function startVoice(e) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    isRecording = true;

    recordStartX = e.type.includes("mouse")
      ? e.clientX
      : e.touches[0].clientX;

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      if (!isRecording) return; // cancelled

      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);

      addVoiceBubble(url);
    };

    mediaRecorder.start();

    // UI feedback only (no layout change)
    recordBtn.innerText = "🔴";

  } catch {
    alert("Mic permission needed");
  }
}

/* MOVE (SLIDE LEFT TO CANCEL) */
function moveVoice(e) {
  if (!mediaRecorder || mediaRecorder.state !== "recording") return;

  const currentX = e.type.includes("mouse")
    ? e.clientX
    : e.touches[0].clientX;

  if (recordStartX - currentX > 80) {
    cancelVoice();
  }
}

/* STOP = SEND */
function stopVoice() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;

  isRecording = true;
  mediaRecorder.stop();

  recordBtn.innerText = "🎤";
}

/* CANCEL */
function cancelVoice() {
  if (!mediaRecorder) return;

  isRecording = false;
  mediaRecorder.stop();

  recordBtn.innerText = "🎤";
}

/* SHOW VOICE MESSAGE (uses your UI safely) */
function addVoiceBubble(url) {
  const div = document.createElement("div");
  div.className = "message you";

  div.innerHTML = `
    <div>
      <audio controls src="${url}"></audio>
    </div>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}