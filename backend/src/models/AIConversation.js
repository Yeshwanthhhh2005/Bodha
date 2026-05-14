const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

// One AI-assistant conversation per student — keeps last ~50 messages.
const aiConversationSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  messages:     { type: [messageSchema], default: [] },
  lastActiveAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('AIConversation', aiConversationSchema);
