const socket = io();

const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const roomListDiv = document.getElementById("roomList");
const usernameInput = document.getElementById("usernameInput");
const usersList = document.getElementById("usersList");

let username = "";
let room = "";
let currentDM = null;

/* LOGIN */
function enterApp() {
  username = usernameInput.value.trim();
  if (!username) return;

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("chatApp").style.display = "flex";

  socket.emit("getRooms");
}

/* ROOMS */
socket.on("roomsList", (rooms) => {
  roomListDiv.innerHTML = "";
  for (let r in rooms) {
    const div = document.createElement("div");
    div.className = "room";
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
}

/* USERS */
socket.on("roomUsers", (users) => {
  usersList.innerHTML = "";
  users.forEach((u) => {
    const div = document.createElement("div");
    div.innerText = "🟢 " + u.name;
    div.onclick = () => (currentDM = u.id);
    usersList.appendChild(div);
  });
});

/* CHAT */
socket.on("message", (data) => {
  if (!currentDM) addMessage(data.text, "other");
});

socket.on("privateMessage", ({ username, message }) => {
  addMessage("🔒 " + username + ": " + message, "other");
});

function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  if (currentDM) {
    socket.emit("privateMessage", { to: currentDM, message: msg });
    addMessage("🔒 You: " + msg, "you");
  } else {
    socket.emit("chatMessage", username + ": " + msg);
    addMessage("You: " + msg, "you");
  }

  input.value = "";
}

function addMessage(msg, type) {
  const div = document.createElement("div");
  div.className = "message " + type;
  div.innerText = msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* VOICE */
let localStream;
let peers = {};

async function startVoice() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  socket.emit("joinVoice", room);
}

socket.on("voiceUsers", (users) => {
  users.forEach((id) => {
    if (id !== socket.id) createPeer(id);
  });
});

function createPeer(id) {
  const peer = new RTCPeerConnection();

  localStream.getTracks().forEach((t) => peer.addTrack(t, localStream));

  peer.ontrack = (e) => {
    const audio = document.createElement("audio");
    audio.srcObject = e.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
  };

  peer.onicecandidate = (e) => {
    if (e.candidate) socket.emit("ice", { to: id, candidate: e.candidate });
  };

  peer.createOffer().then((o) => {
    peer.setLocalDescription(o);
    socket.emit("offer", { to: id, offer: o });
  });

  peers[id] = peer;
}

socket.on("offer", async ({ from, offer }) => {
  const peer = new RTCPeerConnection();

  localStream.getTracks().forEach((t) => peer.addTrack(t, localStream));

  await peer.setRemoteDescription(offer);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.emit("answer", { to: from, answer });

  peers[from] = peer;
});

socket.on("answer", ({ from, answer }) => {
  peers[from].setRemoteDescription(answer);
});

socket.on("ice", ({ from, candidate }) => {
  peers[from].addIceCandidate(candidate);
});

/* EXIT */
function leaveRoom() {
  location.reload();
}

/* ENTER */
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
