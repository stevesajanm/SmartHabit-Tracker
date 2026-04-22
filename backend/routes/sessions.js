const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const auth = require('../middleware/auth');

// GET /api/sessions — get sessions for user
router.get('/sessions', auth, async (req, res) => {
  try {
    console.log(`GET /api/sessions called for user: ${req.userId}`);
    const sessions = await Session.find({ userId: req.userId })
      .sort({ timestamp: -1 })
      .limit(30);
    res.json(sessions);
  } catch (error) {
    console.error('GET /api/sessions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/sessions — save a new session
router.post('/sessions', auth, async (req, res) => {
  try {
    console.log(`POST /api/sessions called for user: ${req.userId}`, req.body);
    const { taskName, duration, mode, timestamp } = req.body;
    
    const session = new Session({
      userId: req.userId,
      taskName: taskName || 'Unnamed task',
      duration,
      mode,
      timestamp: timestamp || new Date()
    });
    
    await session.save();
    console.log('Session saved successfully:', session._id);
    res.status(201).json(session);
  } catch (error) {
    console.error('POST /api/sessions error:', error);
    res.status(400).json({ message: 'Error saving session', error: error.message });
  }
});

// DELETE /api/sessions — clear history
router.delete('/sessions', auth, async (req, res) => {
  try {
    await Session.deleteMany({ userId: req.userId });
    res.json({ message: 'History cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
