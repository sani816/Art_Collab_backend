require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// ✅ Import upload routes
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// =====================
// SOCKET.IO SETUP
// =====================
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const projectUsers = {};
const projectCanvas = {};
const projectMessages = {};
const projectTyping = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // JOIN PROJECT
  socket.on("joinProject", ({ projectId, userName }) => {
    if (!projectId || !userName) return;

    socket.join(projectId);
    socket.projectId = projectId;
    socket.userName = userName;

    projectUsers[projectId] ||= {};
    projectCanvas[projectId] ||= [];
    projectMessages[projectId] ||= [];
    projectTyping[projectId] ||= new Set();

    projectUsers[projectId][socket.id] = userName;

    io.to(projectId).emit("updateUsers", Object.values(projectUsers[projectId]));
    socket.emit("loadCanvas", projectCanvas[projectId]);
    socket.emit("loadMessages", projectMessages[projectId]);
  });

  // DRAW STROKE
  socket.on("draw", ({ projectId, x0, y0, x1, y1, color, brushSize }) => {
    if (!projectId) return;
    const stroke = { x0, y0, x1, y1, color, brushSize };
    projectCanvas[projectId].push({ type: "stroke", ...stroke });
    socket.to(projectId).emit("draw", stroke);
  });

  // ADD TEXT
  socket.on("addText", ({ projectId, ...textData }) => {
    if (!projectId) return;
    projectCanvas[projectId].push({ type: "text", ...textData });
    socket.to(projectId).emit("addText", textData);
  });

  // CLEAR CANVAS
  socket.on("clearCanvas", ({ projectId }) => {
    if (!projectId) return;
    projectCanvas[projectId] = [];
    io.to(projectId).emit("clearCanvas");
  });

  // CHAT MESSAGES
  socket.on("sendMessage", ({ projectId, message }) => {
    if (!projectId || !message) return;
    const msgData = { sender: socket.userName, message, time: Date.now() };
    projectMessages[projectId].push(msgData);
    io.to(projectId).emit("receiveMessage", msgData);
  });

  // TYPING INDICATOR
  socket.on("typing", ({ projectId, isTyping }) => {
    if (!projectId) return;
    projectTyping[projectId] ||= new Set();
    if (isTyping) projectTyping[projectId].add(socket.userName);
    else projectTyping[projectId].delete(socket.userName);
    socket.to(projectId).emit("userTyping", Array.from(projectTyping[projectId]));
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    const { projectId, userName } = socket;
    if (!projectId || !projectUsers[projectId]) return;

    delete projectUsers[projectId][socket.id];
    projectTyping[projectId]?.delete(userName);

    io.to(projectId).emit("updateUsers", Object.values(projectUsers[projectId]));
    io.to(projectId).emit("userTyping", Array.from(projectTyping[projectId] || []));
  });
});

// HEALTH CHECK
app.get("api/https://art-collab-frontend-l9q2klntr-saniakhatun622-4253s-projects.vercel.app", (req, res) => res.send("ArtCollab Workspace Server Running"));

// UPLOAD ROUTE
app.use("/api/upload", uploadRoutes);

// START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));