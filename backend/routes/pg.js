const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const PG      = require('../models/pg');
const User    = require('../models/User');
const authMW  = require('../middleware/auth');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `pg_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/pg/upload — seller subscription required
router.post('/upload', authMW, upload.array('photos', 10), async (req, res) => {
  try {
    const seller = await User.findById(req.user.userId);
    const isSubscribed = seller.isPaid && seller.subscriptionExpiry && seller.subscriptionExpiry > new Date();
    if (!isSubscribed) {
      return res.status(402).json({
        message: 'Active subscription required to list a PG.',
        requiresPayment: true
      });
    }
    const { pgName, location, lat, lng, genderAllowed, roomSize, rules } = req.body;
    if (!pgName || !location || !genderAllowed || !roomSize)
      return res.status(400).json({ message: 'Required fields missing.' });

    const photos = (req.files || []).map(f => f.filename);
    const pg = await PG.create({
      sellerId: req.user.userId, pgName, location,
      coordinates: { lat: lat || null, lng: lng || null },
      genderAllowed, roomSize, rules: rules || '', photos
    });
    res.json({ message: 'PG listed successfully!', pg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/pg/my-listings
router.get('/my-listings', authMW, async (req, res) => {
  try {
    const pgs = await PG.find({ sellerId: req.user.userId }).sort({ createdAt: -1 });
    res.json(pgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/pg/all
router.get('/all', async (req, res) => {
  try {
    const { location, roomSize, gender } = req.query;
    const filter = {};
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (roomSize)  filter.roomSize = roomSize;
    if (gender && gender !== 'Any') filter.genderAllowed = { $in: [gender, 'Any'] };
    // Only show fullName — no phone/email exposed
    const pgs = await PG.find(filter)
      .populate('sellerId', 'fullName')
      .sort({ createdAt: -1 });
    res.json(pgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/pg/:id
router.get('/:id', async (req, res) => {
  try {
    const pg = await PG.findById(req.params.id).populate('sellerId', 'fullName');
    if (!pg) return res.status(404).json({ message: 'PG not found.' });
    res.json(pg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/pg/:id/view
router.post('/:id/view', async (req, res) => {
  try {
    const pg = await PG.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
    res.json({ views: pg.views });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/pg/:id
router.delete('/:id', authMW, async (req, res) => {
  try {
    const pg = await PG.findOne({ _id: req.params.id, sellerId: req.user.userId });
    if (!pg) return res.status(404).json({ message: 'Not found or unauthorized.' });
    pg.photos.forEach(p => {
      const f = path.join(uploadsDir, p);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
    await PG.deleteOne({ _id: req.params.id });
    res.json({ message: 'PG deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;