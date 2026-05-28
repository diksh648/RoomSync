const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName:           { type: String, required: true, trim: true },
  email:              { type: String, required: true, unique: true, lowercase: true },
  phone:              { type: String, required: true },
  profession:         { type: String, default: '' },
  gender:             { type: String, default: '' },
  password:           { type: String, required: true },
  role:               { type: String, default: '' },
  isVerified:         { type: Boolean, default: false },
  isPaid:             { type: Boolean, default: false },
  subscriptionPlan:   { type: String, default: '' },
  subscriptionExpiry: { type: Date, default: null },
  messagesSentCount:  { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);