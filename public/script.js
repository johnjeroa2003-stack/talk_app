const socket = io();

/* SOUND */
const sendSound = new Audio("/sounds/send.mp3");
const receiveSound = new Audio("/sounds/receive.mp3");

/* ELEMENTS */
const roomListDiv = document.getElementById("roomList");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");

const usernameInput = document.getElementById("usernameInput");

let username = "";
let room = "";
let userData = null;

/* AUTO LOGIN */
window.onload = () => {
  const saved = localStorage.getItem("user");

  if (saved) {
    userData = JSON.parse(saved);
    username = userData.name;

    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("chatApp").style.display = "flex";

    socket.emit("userData", userData);
  }

  socket.emit("getRooms");
};

/* LOGIN */
function enterApp() {
  const name = usernameInput.value.trim();
  const age = document.getElementById("ageInput").value.trim();
  const gender = document.getElementById("genderInput").value;

  if (!name || !age || !gender) {
    alert("Fill all fields");
    return;
  }

  userData = { name, age, gender };
  localStorage.setItem("user", JSON.stringify(userData));

  username = name;

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("chatApp").style.display = "flex";

  socket.emit("userData", userData);
}

/* ROOMS */
socket.on("roomsList", (rooms) => {
  roomListDiv.innerHTML = "";

  for (let r in rooms) {
    const li = document.createElement("li");

    li.innerText = `${r} (${rooms[r]})`;
    li.onclick = () => joinRoom(r);

    if (r === room) li.classList.add("active");

    roomListDiv.appendChild(li);
  }
});

function joinRoom(selectedRoom) {
  if (!username) return alert("Login first");

  room = selectedRoom;

  socket.emit("joinRoom", { username, room });

  document.getElementById("roomName").innerText = room;

  setTimeout(() => input.focus(), 200);
}

function leaveRoom() {
  localStorage.removeItem("user");
  location.reload();
}

/* CHAT */
socket.on("message", (msg) => {
  addMessage(msg, "other");
  receiveSound.play();
});

function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("chatMessage", username + ": " + msg);

  addMessage("You: " + msg, "you");

  sendSound.play();

  input.value = "";
}

/* MESSAGE UI */
function addMessage(msg, type) {
  const div = document.createElement("div");

  div.classList.add("message", type);
  div.innerText = msg;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* ENTER KEY */
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

usernameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") enterApp();
});
