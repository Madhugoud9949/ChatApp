// server.js

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const socket = require("socket.io");
require("dotenv").config();

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.error("DB Connection Error:", err.message);
    process.exit(1); // Exit process with failure
  });

// Simple test route
app.get("/", (_req, res) => {
  return res.json({ msg: "Server successfully initiated" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Start the server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

// Socket.IO setup
const io = socket(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

// Global variable to store online users
global.onlineUsers = new Map();

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New client connected");

  // Add user to online users map
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} connected`);
  });

  // Handle message sending
  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", data.msg);
      console.log(`Message sent from ${data.from} to ${data.to}`);
    } else {
      console.log(`User ${data.to} is not online`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    // Remove user from online users map
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Error handling for Socket.IO connection
io.on("error", (err) => {
  console.error("Socket.IO Error:", err);
});

// Error handling for server
app.on("error", (err) => {
  console.error("Server Error:", err);
});
