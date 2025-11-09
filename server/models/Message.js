const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  sender: { type: String, required: true },
  senderId: { type: String, required: true },
  message: { type: String },
  timestamp: { type: Date, default: Date.now },
  file: {
    name: String,
    data: Buffer,
    type: String,
  },
  isPrivate: { type: Boolean, default: false },
  to: String, // for private messages
  read: { type: Boolean, default: false },
  reactions: { type: Map, of: Number, default: {} },
});

module.exports = mongoose.model('Message', messageSchema);
