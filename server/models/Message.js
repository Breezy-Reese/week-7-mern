const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  senderId: { type: String, required: true },
  message: { type: String },
  file: { type: Object },
  timestamp: { type: Date, default: Date.now },
  isPrivate: { type: Boolean, default: false },
  read: { type: Boolean, default: false },
  reactions: { type: Object, default: {} },
});

module.exports = mongoose.model('Message', messageSchema);
