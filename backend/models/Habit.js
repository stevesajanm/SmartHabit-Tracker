const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    default: '🧘'
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  streak: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  dailyCompletions: {
    type: Map,
    of: Boolean,
    default: {}
  },
  skipReasons: {
    type: Map,
    of: String,
    default: {}
  },
  reminderTime: {
    type: String
  },
  notes: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Habit', habitSchema);
