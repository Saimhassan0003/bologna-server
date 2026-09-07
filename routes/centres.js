const express        = require('express');
const router         = express.Router();
const Centre         = require('../models/Centre');
const authMiddleware = require('../middleware/authMiddleware');
const { logActivity }= require('../utils/logger');

// ─── GET all centres (protected) ─────────────────────────────────────────────

router.get('/', authMiddleware, async (req, res) => {
  try {
    const centres = await Centre.findAll('created_at', 'DESC');
    res.json(centres);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── GET all centres (public — for apply form dropdown) ───────────────────────

router.get('/public', async (req, res) => {
  try {
    const centres = await Centre.findAllPublic();
    res.json(centres);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── POST — create a new centre (protected) ───────────────────────────────────

router.post('/', authMiddleware, async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email) {
    return res.status(400).json({ message: 'Centre name and email are required.' });
  }
  try {
    const exists = await Centre.findByName(name.trim());
    if (exists) {
      return res.status(400).json({ message: 'A centre with this name already exists.' });
    }
    const centre = await Centre.create({
      name:  name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : ''
    });
    await logActivity(
      'Centre Created',
      `Approved Centre "${centre.name}" was added to the portal`,
      'centre',
      'Admin'
    );
    res.status(201).json(centre);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── PUT — update a centre (protected) ────────────────────────────────────────

router.put('/:id', authMiddleware, async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const centre = await Centre.findById(req.params.id);
    if (!centre) return res.status(404).json({ message: 'Centre not found' });

    const updates = {};
    if (name  !== undefined) updates.name  = name.trim();
    if (email !== undefined) updates.email = email.trim();
    if (phone !== undefined) updates.phone = phone.trim();

    const updated = await Centre.updateById(centre.id, updates);

    await logActivity(
      'Centre Updated',
      `Approved Centre "${updated.name}" details were updated`,
      'centre',
      'Admin'
    );
    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── DELETE — remove a centre (protected) ────────────────────────────────────

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const centre = await Centre.findById(req.params.id);
    if (!centre) return res.status(404).json({ message: 'Centre not found' });

    await Centre.deleteById(centre.id);

    await logActivity(
      'Centre Deleted',
      `Approved Centre "${centre.name}" was removed`,
      'centre',
      'Admin'
    );
    res.json({ message: 'Centre removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
