const socket = io();

let username = prompt("Enter your name");
let room = "";

const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");

/* LOAD ROOMS */
socket.emit("getRooms");

socket.on("roomsList", (rooms) => {
  const container = document.getElementById("roomCards");
  container.innerHTML = "";

  for (let r in rooms) {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${r}</h3>
      <p>${rooms[r].users} / ${rooms[r].max}</p>
    `;

    div.onclick = () => {
      socket.emit("joinRoom", { username, room: r });
    };

    container.appendChild(div);
  }
});

/* JOIN SUCCESS */
socket.on("joinedRoom", (r) => {
  room = r;

  document.getElementById("lobby").style.display = "none";
  document.getElementById("chatApp").style.display = "flex";

  document.getElementById("roomName").innerText = r;
});

/* ROOM FULL */
socket.on("roomFull", () => {
  alert("Room is full");
});

/* MESSAGE */
socket.on("message", (data) => {
  if (data.user === username) {
    addMessage("You: " + data.text, "you");
  } else {
    addMessage(data.text, "other");
  }
});

/* SEND */
function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("chatMessage", {
    text: msg,
    user: username,
  });

  input.value = "";
}

/* UI MESSAGE */
function addMessage(msg, type) {
  const div = document.createElement("div");
  div.className = "message " + type;
  div.innerText = msg;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* CREATE ROOM */
function createRoom() {
  const name = prompt("Room name?");
  const max = prompt("Max users?");

  if (!name) return;

  socket.emit("createRoom", {
    room: name,
    max: parseInt(max) || 10,
  });

  socket.emit("joinRoom", { username, room: name });
}

/* EXIT */
function leaveRoom() {
  location.reload();
}

/* ENTER */
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
