document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  /* ELEMENTS */
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

  /* =========================
   ENTER KEY SEND (FIXED)
========================= */
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

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
   CREATE ROOM (MOBILE SAFE)
========================= */
  window.createRoom = function () {
    let room = prompt("Enter room name:");

    if (!room || room.trim() === "") return;

    socket.emit("createRoom", { room: room.trim(), max: 10 });

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

    if (!name || !gender) {
      alert("Fill all fields");
      return;
    }

    userProfile.name = name;
    userProfile.gender = gender;

    enterRoom();
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
      room: currentRoom,
    });

    document.getElementById("lobby").style.display = "none";
    document.getElementById("chatApp").style.display = "flex";

    document.getElementById("roomName").innerText = currentRoom;
  }

  /* =========================
   EXIT BUTTON (FIXED)
========================= */
  window.leaveRoom = function () {
    location.reload(); // simplest safe reset
  };

  /* =========================
   RANDOM ROOM
========================= */
  window.joinRandom = function () {
    const cards = document.querySelectorAll(".room-card");
    if (cards.length === 0) return;

    cards[Math.floor(Math.random() * cards.length)].click();
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

    input.value = "";
  };

  /* =========================
   RECEIVE MESSAGE
========================= */
  socket.on("message", (data) => {
    addMessage(
      data.user === username
        ? "You: " + data.text
        : data.user + ": " + data.text,
    );
  });

  /* =========================
   ADD MESSAGE
========================= */
  function addMessage(msg) {
    const div = document.createElement("div");
    div.className = "message";

    div.innerHTML = `<div>${msg}</div>`;

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
   MOBILE FIX (IMPORTANT)
========================= */
  window.addEventListener("resize", () => {
    chatBox.scrollTop = chatBox.scrollHeight;
  });
});
