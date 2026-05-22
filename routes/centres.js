const express = require('express');
const router = express.Router();
const Centre = require('../models/Centre');
const authMiddleware = require('../middleware/authMiddleware');

// GET all centres (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const centres = await Centre.find().sort({ createdAt: -1 });
    res.json(centres);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// GET all centres (public - for apply form dropdown)
router.get('/public', async (req, res) => {
  try {
    const centres = await Centre.find().sort({ name: 1 }).select('name email phone');
    res.json(centres);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// POST - create a new centre (protected)
router.post('/', authMiddleware, async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email) {
    return res.status(400).json({ message: 'Centre name and email are required.' });
  }
  try {
    const exists = await Centre.findOne({ name: name.trim() });
    if (exists) {
      return res.status(400).json({ message: 'A centre with this name already exists.' });
    }
    const centre = new Centre({
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : ''
    });
    await centre.save();
    res.status(201).json(centre);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// PUT - update a centre (protected)
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const centre = await Centre.findById(req.params.id);
    if (!centre) return res.status(404).json({ message: 'Centre not found' });
    if (name) centre.name = name.trim();
    if (email) centre.email = email.trim();
    if (phone !== undefined) centre.phone = phone.trim();
    await centre.save();
    res.json(centre);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// DELETE - remove a centre (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const centre = await Centre.findById(req.params.id);
    if (!centre) return res.status(404).json({ message: 'Centre not found' });
    await centre.deleteOne();
    res.json({ message: 'Centre removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
