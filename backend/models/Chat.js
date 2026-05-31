const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:    { type: String, required: true },
  pgId:       { type: mongoose.Schema.Types.ObjectId, ref: 'PG', default: null },
  read:       { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.Chat || mongoose.model('Chat', messageSchema);