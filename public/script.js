const socket = io();

const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const roomListDiv = document.getElementById("roomList");
const usernameInput = document.getElementById("usernameInput");
const usersList = document.getElementById("usersList");

let username = "";
let room = "";
let currentDM = null;

const notify = new Audio("/sounds/receive.mp3");

/* =========================
   LOGIN
========================= */
function enterApp() {
  username = usernameInput.value.trim();
  if (!username) return;

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("chatApp").style.display = "flex";

  socket.emit("getRooms");
}

/* =========================
   ROOMS
========================= */
socket.on("roomsList", (rooms) => {
  roomListDiv.innerHTML = "";

  for (let r in rooms) {
    const div = document.createElement("div");
    div.innerText = `${r} (${rooms[r]})`;
    div.onclick = () => joinRoom(r);
    roomListDiv.appendChild(div);
  }
});

function joinRoom(r) {
  room = r;
  currentDM = null;

  socket.emit("joinRoom", { username, room });
  document.getElementById("roomName").innerText = r;

  loadChat("room_" + room);
}

/* =========================
   USERS (DM)
========================= */
socket.on("roomUsers", (users) => {
  usersList.innerHTML = "";

  users.forEach((u) => {
    const div = document.createElement("div");
    div.innerText = u.name;

    div.onclick = () => {
      currentDM = u.id;
      loadChat("dm_" + u.id);
      addSystem("🔒 Chat with " + u.name);
    };

    usersList.appendChild(div);
  });
});

/* =========================
   RECEIVE
========================= */
socket.on("message", (data) => {
  if (!currentDM) addMessage(data.text, data.status);
});

socket.on("privateMessage", ({ username, message, status }) => {
  notify.play();
  addMessage("🔒 " + username + ": " + message, status);
});

/* =========================
   FILE RECEIVE
========================= */
socket.on("fileMessage", ({ username, file, name }) => {
  addFile(username, file, name);
});

socket.on("privateFile", ({ username, file, name }) => {
  addFile("🔒 " + username, file, name);
});

/* =========================
   SEND MESSAGE
========================= */
function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  if (currentDM) {
    socket.emit("privateMessage", { to: currentDM, message: msg });
    addMessage("🔒 You: " + msg, "✔");
    saveChat("dm_" + currentDM);
  } else {
    socket.emit("chatMessage", username + ": " + msg);
    addMessage("You: " + msg, "✔");
    saveChat("room_" + room);
  }

  input.value = "";
}

/* =========================
   FILE SEND
========================= */
function sendFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  fetch("/upload", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      if (currentDM) {
        socket.emit("privateFile", {
          to: currentDM,
          file: data.file,
          name: file.name,
        });
      } else {
        socket.emit("fileMessage", {
          file: data.file,
          name: file.name,
        });
      }
    });
}

/* =========================
   UI
========================= */
function addMessage(msg, status = "") {
  const div = document.createElement("div");
  div.className = "message";
  div.innerText = msg + " " + status;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addFile(user, file, name) {
  const div = document.createElement("div");
  div.className = "message";

  if (file.match(/\.(jpg|png|gif)$/)) {
    div.innerHTML = `${user}: <br><img src="${file}" width="150">`;
  } else {
    div.innerHTML = `${user}: <a href="${file}" target="_blank">${name}</a>`;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addSystem(msg) {
  const div = document.createElement("div");
  div.className = "message";
  div.style.opacity = "0.6";
  div.innerText = msg;

  chatBox.appendChild(div);
}

/* =========================
   MEMORY
========================= */
function saveChat(key) {
  localStorage.setItem(key, chatBox.innerHTML);
}

function loadChat(key) {
  chatBox.innerHTML = localStorage.getItem(key) || "";
}

/* =========================
   TYPING
========================= */
let typingTimeout;

input.addEventListener("input", () => {
  if (currentDM) {
    socket.emit("typingDM", { to: currentDM, user: username });
  } else {
    socket.emit("typing", username);
  }

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    if (currentDM) {
      socket.emit("stopTypingDM", { to: currentDM });
    } else {
      socket.emit("stopTyping");
    }
  }, 1000);
});

/* =========================
   FILE PICKER
========================= */
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.style.display = "none";
document.body.appendChild(fileInput);

fileInput.onchange = () => {
  if (fileInput.files[0]) sendFile(fileInput.files[0]);
};

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "u") fileInput.click();
});

/* =========================
   EXIT BUTTON FIX
========================= */
function leaveRoom() {
  room = "";
  currentDM = null;

  socket.disconnect();

  setTimeout(() => {
    socket.connect();
  }, 300);

  chatBox.innerHTML = "";

  document.getElementById("chatApp").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";

  input.value = "";

  console.log("🚪 Exited room");
}

/* =========================
   ENTER KEY
========================= */
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
