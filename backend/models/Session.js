const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taskName: {
    type: String,
    required: true,
    trim: true,
    default: 'Unnamed task'
  },
  duration: {
    type: Number,
    required: true
  },
  mode: {
    type: String,
    enum: ['stopwatch', 'countdown'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
