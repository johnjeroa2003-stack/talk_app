const socket = io();

/* =========================
   ELEMENTS
========================= */
const roomCards = document.getElementById("roomCards");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const recordBtn = document.getElementById("recordBtn");

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
   CREATE ROOM (FIXED)
========================= */
function createRoom() {
  document.getElementById("createRoomModal").style.display = "flex";
}

function closeCreateRoom() {
  document.getElementById("createRoomModal").style.display = "none";
}

function confirmCreateRoom() {
  const room = document.getElementById("newRoomName").value.trim();

  if (!room) {
    alert("Enter room name");
    return;
  }

  socket.emit("createRoom", { room, max: 10 });

  closeCreateRoom();

  function closeCreateRoom() {
    document.getElementById("createRoomModal").style.display = "none";
  }

  function confirmCreateRoom() {
    const room = document.getElementById("newRoomName").value.trim();

    if (!room) {
      alert("Enter room name");
      return;
    }

    socket.emit("createRoom", { room, max: 10 });

    closeCreateRoom();

    // refresh rooms after creation
    setTimeout(() => {
      socket.emit("getRooms");
    }, 300);
  }
  // refresh rooms
  setTimeout(() => {
    socket.emit("getRooms");
  }, 300);
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

    socket.emit("reactMessage", { id: messageId, emoji });
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
      document.getElementById("replyBox").style.display = "block";
      document.getElementById("replyText").innerText = msg;
    }

    div.style.transform = "translateX(0px)";
  });

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* =========================
   TYPING DOTS
========================= */
socket.on("typing", () => {
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
   VOICE RECORD
========================= */
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let startX = 0;

if (recordBtn) {
  recordBtn.addEventListener("mousedown", startRecording);
  recordBtn.addEventListener("touchstart", startRecording);

  recordBtn.addEventListener("mousemove", handleMove);
  recordBtn.addEventListener("touchmove", handleMove);

  recordBtn.addEventListener("mouseup", stopRecording);
  recordBtn.addEventListener("touchend", stopRecording);
}

async function startRecording(e) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    isRecording = true;

    startX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      if (!isRecording) return;

      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);

      socket.emit("chatMessage", {
        text: url,
        user: username,
        reply: null,
      });
    };

    mediaRecorder.start();
    recordBtn.innerText = "🎙️ Slide to cancel";
  } catch {
    alert("Mic permission denied");
  }
}

function handleMove(e) {
  if (!mediaRecorder || mediaRecorder.state !== "recording") return;

  const currentX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;

  if (startX - currentX > 80) {
    cancelRecording();
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;

  isRecording = true;
  mediaRecorder.stop();
  recordBtn.innerText = "🎤";
}

function cancelRecording() {
  if (!mediaRecorder) return;

  isRecording = false;
  mediaRecorder.stop();
  recordBtn.innerText = "🎤";
}
