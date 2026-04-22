const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const auth = require('../middleware/auth');

// GET /api/habits — get all habits for the logged-in user
router.get('/habits', auth, async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.userId });
    res.json(habits);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/habits — create a new habit
router.post('/habits', auth, async (req, res) => {
  try {
    const { name, icon, difficulty, reminderTime, notes } = req.body;
    
    const habit = new Habit({
      userId: req.userId,
      name,
      icon,
      difficulty: difficulty || 'Medium',
      reminderTime,
      notes,
      dailyCompletions: new Map(),
      skipReasons: new Map(),
      streak: 0,
      completed: false
    });
    
    await habit.save();
    res.status(201).json(habit);
  } catch (error) {
    res.status(400).json({ message: 'Error creating habit', error: error.message });
  }
});

// PUT /api/habits/:id — update a habit
router.put('/habits/:id', auth, async (req, res) => {
  try {
    const { name, icon, difficulty, reminderTime, notes } = req.body;
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { name, icon, difficulty, reminderTime, notes },
      { new: true }
    );
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    res.json(habit);
  } catch (error) {
    res.status(400).json({ message: 'Error updating habit', error: error.message });
  }
});

// DELETE /api/habits/:id — delete a habit
router.delete('/habits/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    res.json({ message: 'Habit deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH /api/habits/:id/toggle — toggle completion for a specific date
router.patch('/habits/:id/toggle', auth, async (req, res) => {
  try {
    const { date } = req.body; // format: YYYY-MM-DD
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.userId });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    const currentStatus = habit.dailyCompletions.get(date) || false;
    habit.dailyCompletions.set(date, !currentStatus);
    
    // Legacy support for today's completed field
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (date === today) {
      habit.completed = !currentStatus;
    }

    await habit.save();
    res.json(habit);
  } catch (error) {
    res.status(400).json({ message: 'Error toggling habit', error: error.message });
  }
});

// PATCH /api/habits/:id/skip-reason — save skip reason
router.patch('/habits/:id/skip-reason', auth, async (req, res) => {
  try {
    const { date, reason } = req.body;
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.userId });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    habit.skipReasons.set(date, reason);
    await habit.save();
    res.json(habit);
  } catch (error) {
    res.status(400).json({ message: 'Error saving skip reason', error: error.message });
  }
});

// DELETE /api/habits — delete all habits for the logged-in user
router.delete('/habits', auth, async (req, res) => {
  try {
    const result = await Habit.deleteMany({ userId: req.userId });
    res.json({ message: 'All habits deleted', count: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
