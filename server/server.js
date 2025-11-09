// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const Message = require('./models/Message');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const mongoURI = 'mongodb+srv://basil59mutuku_db_user:08YUxkMvjTzjko1Y@plp.ycdlukc.mongodb.net/chat?appName=PLP';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
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
  socket.on('user_join', (username) => {
    users[socket.id] = { username, id: socket.id };
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { username, id: socket.id });
    console.log(`${username} joined the chat`);
  });

  // Handle chat messages
  socket.on('send_message', async (messageData) => {
    const message = {
      ...messageData,
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date().toISOString(),
    };

    try {
      // Save message to MongoDB
      const newMessage = new Message(message);
      await newMessage.save();

      messages.push(message);

      // Limit stored messages to prevent memory issues
      if (messages.length > 100) {
        messages.shift();
      }

      io.emit('receive_message', message);
    } catch (error) {
      console.error('Error saving message to database:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

 socket.on('send_file', async (fileData) => {
   const message = {
     id: Date.now(),
     sender: users[socket.id]?.username || 'Anonymous',
     senderId: socket.id,
     timestamp: new Date().toISOString(),
     file: fileData,
   };

   try {
     // Save file message to MongoDB
     const newMessage = new Message(message);
     await newMessage.save();

     io.emit('receive_message', message);
   } catch (error) {
     console.error('Error saving file message to database:', error);
     socket.emit('error', 'Failed to send file');
   }
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
  socket.on('private_message', async ({ to, message }) => {
    const messageData = {
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      to,
    };

    try {
      // Save private message to MongoDB
      const newMessage = new Message(messageData);
      await newMessage.save();

      socket.to(to).emit('private_message', messageData);
      socket.emit('private_message', messageData);
    } catch (error) {
      console.error('Error saving private message to database:', error);
      socket.emit('error', 'Failed to send private message');
    }
  });

  // Handle read receipts
  socket.on('message_read', (messageId) => {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      message.read = true;
      io.to(message.senderId).emit('message_read_receipt', messageId);
    }
  });

  // Handle message reactions
  socket.on('react_to_message', ({ messageId, reaction }) => {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      if (!message.reactions) {
        message.reactions = {};
      }
      if (message.reactions[reaction]) {
        message.reactions[reaction]++;
      } else {
        message.reactions[reaction] = 1;
      }
      io.emit('message_reacted', { messageId, reactions: message.reactions });
    }
  });
 
   // Handle disconnection
   socket.on('disconnect', () => {
     if (users[socket.id]) {
      const { username } = users[socket.id];
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
 try {
   const page = parseInt(req.query.page, 10) || 1;
   const limit = parseInt(req.query.limit, 10) || 20;
   const skip = (page - 1) * limit;

   const totalMessages = await Message.countDocuments();
   const messagesFromDB = await Message.find()
     .sort({ timestamp: -1 })
     .skip(skip)
     .limit(limit);

   res.json({
     messages: messagesFromDB.reverse(),
     totalPages: Math.ceil(totalMessages / limit),
     currentPage: page,
   });
 } catch (error) {
   console.error('Error fetching messages:', error);
   res.status(500).json({ error: 'Failed to fetch messages' });
 }
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
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






