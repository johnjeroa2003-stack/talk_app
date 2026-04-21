document.addEventListener("DOMContentLoaded", () => {
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
   LOAD ROOMS
========================= */
  socket.on("connect", () => {
    socket.emit("getRooms");
  });

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
  window.createRoom = function () {
    const room = prompt("Enter room name:");
    if (!room) return;

    socket.emit("createRoom", { room, max: 10 });

    setTimeout(() => {
      socket.emit("getRooms");
    }, 200);
  };

  /* =========================
   CONFIRM USER
========================= */
  window.confirmUser = function () {
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
  };

  /* =========================
   ENTER ROOM
========================= */
  function enterRoom() {
    document.getElementById("userPopup").style.display = "none";

    username = userProfile.name;
    currentRoom = tempRoom;

    socket.emit("joinRoom", {
      username,
      room: tempRoom,
    });

    document.getElementById("lobby").style.display = "none";
    document.getElementById("chatApp").style.display = "flex";

    document.getElementById("roomName").innerText = tempRoom;
  }

  /* =========================
   RANDOM ROOM
========================= */
  window.joinRandom = function () {
    const cards = document.querySelectorAll(".room-card");
    if (cards.length === 0) return;

    const random = cards[Math.floor(Math.random() * cards.length)];
    random.click();
  };

  /* =========================
   SEND MESSAGE
========================= */
  window.sendMessage = function () {
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
  };

  /* =========================
   RECEIVE MESSAGE
========================= */
  socket.on("message", (data) => {
    if (data.user === username) {
      addMessage("You: " + data.text, "you", data.avatar, data.reply);
    } else {
      addMessage(
        data.user + ": " + data.text,
        "other",
        data.avatar,
        data.reply,
      );
    }
  });

  /* =========================
   MESSAGE UI
========================= */
  function addMessage(msg, type, avatar, reply = null) {
    const div = document.createElement("div");
    div.className = "message " + type;

    const img = avatar
      ? `<img src="${avatar}" class="avatar">`
      : `<img src="https://i.imgur.com/6VBx3io.png" class="avatar">`;

    div.innerHTML = `
    ${type === "other" ? img : ""}
    <div>
      ${reply ? `<div style="font-size:12px;">↪ ${reply}</div>` : ""}
      <span>${msg}</span>
    </div>
    ${type === "you" ? img : ""}
  `;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  /* =========================
   TYPING
========================= */
  input.addEventListener("input", () => {
    socket.emit("typing");

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("stopTyping");
    }, 1000);
  });

  socket.on("typing", () => {
    document.getElementById("typingStatus").innerHTML =
      `<div class="typing"><span></span><span></span><span></span></div>`;
  });

  socket.on("stopTyping", () => {
    document.getElementById("typingStatus").innerHTML = "";
  });

  /* =========================
   VOICE (CLEAN VERSION)
========================= */
  let mediaRecorder;
  let audioChunks = [];
  let isRecording = false;
  let startX = 0;

  if (recordBtn) {
    recordBtn.addEventListener("mousedown", startRecording);
    recordBtn.addEventListener("mouseup", stopRecording);
    recordBtn.addEventListener("mousemove", handleMove);

    recordBtn.addEventListener("touchstart", startRecording);
    recordBtn.addEventListener("touchend", stopRecording);
    recordBtn.addEventListener("touchmove", handleMove);
  }

  async function startRecording(e) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      isRecording = true;

      startX = e.touches ? e.touches[0].clientX : e.clientX;

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
        });
      };

      mediaRecorder.start();
      recordBtn.innerText = "🎙️";
    } catch {
      alert("Mic permission denied");
    }
  }

  function handleMove(e) {
    if (!mediaRecorder || mediaRecorder.state !== "recording") return;

    const currentX = e.touches ? e.touches[0].clientX : e.clientX;

    if (startX - currentX > 80) {
      cancelRecording();
    }
  }

  function stopRecording() {
    if (!mediaRecorder) return;

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
});
