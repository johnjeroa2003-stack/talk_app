const socket = io();

const roomCards = document.getElementById("roomCards");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");

let username = "";
let currentRoom = "";
let userProfile = {};
let messages = {};

/* ROOMS */
socket.emit("getRooms");

socket.on("roomsList", (rooms) => {
  roomCards.innerHTML = "";

  for (let room in rooms) {
    const div = document.createElement("div");
    div.className = "room-card";
    div.innerHTML = `<h3>${room}</h3><p>${rooms[room].users}</p>`;
    div.onclick = () => joinRoom(room);
    roomCards.appendChild(div);
  }
});

/* JOIN */
function joinRoom(room) {
  const name = prompt("Enter name:");
  if (!name) return;

  username = name;
  currentRoom = room;

  socket.emit("joinRoom", { username, room });

  document.getElementById("lobby").style.display = "none";
  document.getElementById("chatApp").style.display = "flex";
  document.getElementById("roomName").innerText = room;
}

/* SEND */
function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("chatMessage", {
    text: msg,
    user: username,
    avatar: userProfile.avatar || "",
  });

  input.value = "";
}

/* RECEIVE */
socket.on("message", (data) => {
  messages[data.id] = data;

  if (data.user === username) {
    addMessage(data, "you");
  } else {
    addMessage(data, "other");
    socket.emit("messageSeen", data.id);
  }
});

/* STATUS */
socket.on("messageStatus", ({ id, seen }) => {
  const el = document.getElementById("status-" + id);
  if (el) el.innerText = seen > 1 ? "✔✔ Seen" : "✔ Delivered";
});

/* DELETE */
socket.on("deleteMessage", (id) => {
  const el = document.getElementById("msg-" + id);
  if (el) el.remove();
});

/* UI */
function addMessage(data, type) {
  const div = document.createElement("div");
  div.className = "message " + type;
  div.id = "msg-" + data.id;

  const avatar = data.avatar || "https://i.imgur.com/6VBx3io.png";

  div.innerHTML = `
    ${type === "other" ? `<img src="${avatar}" class="avatar">` : ""}
    <div>
      <span>${data.user}: ${data.text}</span>
      <div id="status-${data.id}" class="status">✔</div>
    </div>
    ${type === "you" ? `<img src="${avatar}" class="avatar">` : ""}
  `;

  div.ondblclick = () => {
    if (type === "you") {
      socket.emit("deleteMessage", data.id);
    }
  };

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* LEAVE */
function leaveRoom() {
  location.reload();
}
