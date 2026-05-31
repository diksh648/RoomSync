const mongoose = require('mongoose');

const pgSchema = new mongoose.Schema({
  sellerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pgName:        { type: String, required: true, trim: true },
  location:      { type: String, required: true },
  coordinates:   { lat: { type: Number }, lng: { type: Number } },
  genderAllowed: { type: String, enum: ['Male', 'Female', 'Any'], required: true },
  roomSize:      { type: String, enum: ['Single', 'Double', 'Triple', 'Dormitory'], required: true },
  rules:         { type: String, default: '' },
  photos:        [{ type: String }],
  views:         { type: Number, default: 0 },
  likes:         { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('PG', pgSchema);