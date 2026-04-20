const socket = io();

let username = prompt("Enter your name");
let room = "";
let currentRooms = {};
let replyTo = null;

const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");

/* ROOMS */
socket.emit("getRooms");

socket.on("roomsList", (rooms) => {
  currentRooms = rooms;

  const container = document.getElementById("roomCards");
  container.innerHTML = "";

  for (let r in rooms) {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `<h3>${r}</h3><p>${rooms[r].users}/${rooms[r].max}</p>`;

    div.onclick = () => socket.emit("joinRoom", { username, room: r });

    container.appendChild(div);
  }
});

/* RANDOM */
function joinRandom() {
  const available = Object.keys(currentRooms).filter(
    (r) => currentRooms[r].users < currentRooms[r].max,
  );

  if (!available.length) return alert("No rooms");

  const r = available[Math.floor(Math.random() * available.length)];
  socket.emit("joinRoom", { username, room: r });
}

/* JOIN */
socket.on("joinedRoom", (r) => {
  room = r;
  document.getElementById("lobby").style.display = "none";
  document.getElementById("chatApp").style.display = "flex";
  document.getElementById("roomName").innerText = r;
});

/* USERS + ONLINE */
socket.on("roomUsers", (users) => {
  const box = document.getElementById("usersList");
  if (!box) return;

  box.innerHTML = "";

  users.forEach((u) => {
    const div = document.createElement("div");

    div.innerHTML = `
      <span style="color:lime">●</span> ${u}
    `;

    /* DM click */
    div.onclick = () => {
      const msg = prompt("Send private message to " + u);
      if (msg) {
        socket.emit("privateMessage", {
          to: u,
          text: msg,
          from: username,
        });
      }
    };

    box.appendChild(div);
  });
});

/* RECEIVE DM */
socket.on("privateMessage", (data) => {
  alert("DM from " + data.from + ": " + data.text);
});

/* CHAT */
socket.on("message", (data) => {
  let text = data.text;

  if (data.reply) {
    text = `↪ ${data.reply}\n${text}`;
  }

  if (data.user === username) {
    addMessage("You: " + text, "you");
  } else {
    addMessage(data.user + ": " + text, "other");
  }
});

/* SEND */
function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("chatMessage", {
    text: msg,
    user: username,
    reply: replyTo,
  });

  replyTo = null;
  input.value = "";
}

/* ADD MESSAGE + AVATAR + REPLY CLICK */
function addMessage(msg, type) {
  const div = document.createElement("div");
  div.className = "message " + type;

  const avatar = document.createElement("span");
  avatar.innerText = msg[0];
  avatar.style.marginRight = "8px";
  avatar.style.background = "#555";
  avatar.style.padding = "6px";
  avatar.style.borderRadius = "50%";

  div.appendChild(avatar);

  const text = document.createElement("span");
  text.innerText = msg;

  div.appendChild(text);

  /* reply click */
  div.onclick = () => {
    replyTo = msg;
    input.placeholder = "Replying...";
  };

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* EXIT */
function leaveRoom() {
  location.reload();
}

/* ENTER */
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
