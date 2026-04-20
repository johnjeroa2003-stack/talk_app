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
      <p>${rooms[r].users} / ${rooms[r].max} users</p>
    `;

    div.onclick = () => joinRoom(r);

    container.appendChild(div);
  }
});

/* JOIN */
function joinRoom(r) {
  room = r;
  socket.emit("joinRoom", { username, room });
}

/* ROOM FULL */
socket.on("roomFull", () => {
  alert("❌ Room is full");
});

/* MESSAGE (FIXED) */
socket.on("message", (data) => {
  if (data.user === "system") {
    addMessage(data.text, "other");
    return;
  }

  if (data.user === username) {
    addMessage("You: " + data.text, "you");
  } else {
    addMessage(data.user + ": " + data.text, "other");
  }
});

/* SEND MESSAGE (FIXED) */
function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("chatMessage", {
    text: msg,
    user: username,
  });

  input.value = "";
}

/* ADD MESSAGE (WHATSAPP STYLE + IMAGE SUPPORT) */
function addMessage(msg, type) {
  const div = document.createElement("div");
  div.className = "message " + type;

  if (msg.match(/\.(jpg|png|gif|jpeg)$/)) {
    div.innerHTML = `<img src="${msg}" width="150">`;
  } else {
    div.innerText = msg;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* FILE UPLOAD */
function openFile() {
  document.getElementById("fileInput").click();
}

document.getElementById("fileInput").onchange = () => {
  const file = fileInput.files[0];

  const formData = new FormData();
  formData.append("file", file);

  fetch("/upload", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      socket.emit("chatMessage", {
        text: data.file,
        user: username,
      });
    });
};

/* EXIT */
function leaveRoom() {
  location.reload();
}

/* ENTER KEY */
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
