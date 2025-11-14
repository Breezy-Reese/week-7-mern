const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  socketId: { type: String, required: true },
  connectedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
