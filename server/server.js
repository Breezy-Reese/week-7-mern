// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users and messages
const users = {};
const messages = [];
const typingUsers = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', async (username) => {
    const user = new User({ username, socketId: socket.id });
    await user.save();
    users[socket.id] = { username, id: socket.id };
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { username, id: socket.id });
    console.log(`${username} joined the chat`);
  });

  // Handle chat messages
  socket.on('send_message', async (messageData) => {
    const message = new Message({
      ...messageData,
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date(),
    });
    await message.save();

    messages.push(message);

    // Limit stored messages to prevent memory issues
    if (messages.length > 100) {
      messages.shift();
    }

    io.emit('receive_message', message);
  });

 socket.on('send_file', async (fileData) => {
   const message = new Message({
     sender: users[socket.id]?.username || 'Anonymous',
     senderId: socket.id,
     timestamp: new Date(),
     file: fileData,
   });
   await message.save();
   io.emit('receive_message', message);
 });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    if (users[socket.id]) {
      const username = users[socket.id].username;
      
      if (isTyping) {
        typingUsers[socket.id] = username;
      } else {
        delete typingUsers[socket.id];
      }
      
      io.emit('typing_users', Object.values(typingUsers));
    }
  });

  // Handle private messages
  socket.on('private_message', async ({ to, message: msg }) => {
    const messageData = new Message({
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message: msg,
      timestamp: new Date(),
      isPrivate: true,
    });
    await messageData.save();

    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  // Handle read receipts
  socket.on('message_read', async (messageId) => {
    const message = await Message.findById(messageId);
    if (message) {
      message.read = true;
      await message.save();
      io.to(message.senderId).emit('message_read_receipt', messageId);
    }
  });

  // Handle message reactions
  socket.on('react_to_message', async ({ messageId, reaction }) => {
    const message = await Message.findById(messageId);
    if (message) {
      if (!message.reactions) {
        message.reactions = {};
      }
      if (message.reactions[reaction]) {
        message.reactions[reaction]++;
      } else {
        message.reactions[reaction] = 1;
      }
      await message.save();
      io.emit('message_reacted', { messageId, reactions: message.reactions });
    }
  });
 
   // Handle disconnection
   socket.on('disconnect', async () => {
     if (users[socket.id]) {
      const { username } = users[socket.id];
      await User.findOneAndDelete({ socketId: socket.id });
      io.emit('user_left', { username, id: socket.id });
      console.log(`${username} left the chat`);
    }

    delete users[socket.id];
    delete typingUsers[socket.id];

    io.emit('user_list', Object.values(users));
    io.emit('typing_users', Object.values(typingUsers));
  });
});

// API routes
app.get('/api/messages', async (req, res) => {
 const page = parseInt(req.query.page, 10) || 1;
 const limit = parseInt(req.query.limit, 10) || 20;
 const skip = (page - 1) * limit;

 const messages = await Message.find().sort({ timestamp: -1 }).skip(skip).limit(limit);
 const total = await Message.countDocuments();

 res.json({
   messages: messages.reverse(),
   totalPages: Math.ceil(total / limit),
   currentPage: page,
 });
});

app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Root route
app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io }; 