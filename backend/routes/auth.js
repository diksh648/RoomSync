const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User       = require('../models/User');

// ── In-memory OTP store (avoids all DB upsert issues) ─────────────────────
// Structure: { email: { otp, expiry, verified } }
const otpStore = new Map();

// ── Gmail transporter ──────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(to, otp, subject) {
  return transporter.sendMail({
    from: `"RoomSync" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: `
    <div style="font-family:Arial,sans-serif;background:#0d0d1a;padding:40px;text-align:center;">
      <h1 style="font-size:36px;color:#FF6B35;margin-bottom:4px;">RoomSync</h1>
      <p style="color:#aaa;margin-bottom:30px;">Sync your room with your Buddy!</p>
      <div style="background:#1a1a2e;border-radius:16px;padding:30px;display:inline-block;">
        <p style="color:#ccc;margin-bottom:12px;">Your One-Time Password:</p>
        <h2 style="color:#FF6B35;font-size:48px;letter-spacing:12px;margin:0;">${otp}</h2>
        <p style="color:#888;margin-top:16px;font-size:13px;">
          Valid for <strong style="color:#FF4444;">10 minutes</strong>. Do not share with anyone.
        </p>
      </div>
    </div>`
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
// body: { email, type: 'signup' | 'forgot' }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email) return res.status(400).json({ message: 'Email is required.' });

    // For forgot password, user must already exist
    if (type === 'forgot') {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(404).json({ message: 'No account found with this email.' });
    }

    const otp    = generateOTP();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP in memory — no DB writes at all
    otpStore.set(email.toLowerCase(), { otp, expiry, verified: false });

    const subject = type === 'forgot'
      ? 'RoomSync — Password Reset OTP'
      : 'RoomSync — Email Verification OTP';

    await sendOTPEmail(email, otp, subject);

    res.json({ message: 'OTP sent to your email successfully.' });
  } catch (err) {
    console.error('send-otp error:', err.message);
    res.status(500).json({ message: 'Failed to send OTP. Check Gmail credentials in .env' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// body: { email, otp }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const key   = email?.toLowerCase();
  const entry = otpStore.get(key);

  if (!entry)               return res.status(400).json({ message: 'OTP not requested. Please request a new one.' });
  if (Date.now() > entry.expiry) return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
  if (entry.otp !== otp)    return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });

  // Mark as verified in memory
  otpStore.set(key, { ...entry, verified: true });

  res.json({ message: 'OTP verified successfully.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// body: { fullName, email, phone, profession, gender, password }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, phone, profession, gender, password } = req.body;
    const key = email?.toLowerCase();

    // Validate required fields
    if (!fullName || !email || !phone || !password)
      return res.status(400).json({ message: 'Full name, email, phone and password are required.' });

    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    // Check OTP was verified
    const entry = otpStore.get(key);
    if (!entry || !entry.verified)
      return res.status(400).json({ message: 'Please verify your email with OTP first.' });

    // Check if already registered
    const existing = await User.findOne({ email: key });
    if (existing && existing.isVerified)
      return res.status(400).json({ message: 'Email already registered. Please sign in.' });

    const hashedPassword = await bcrypt.hash(password, 12);

    if (existing) {
      // Update the incomplete user record
      existing.fullName   = fullName.trim();
      existing.phone      = phone;
      existing.profession = profession || '';
      existing.gender     = gender     || '';
      existing.password   = hashedPassword;
      existing.isVerified = true;
      await existing.save();
    } else {
      // Create fresh user
      await User.create({
        fullName:   fullName.trim(),
        email:      key,
        phone,
        profession: profession || '',
        gender:     gender     || '',
        password:   hashedPassword,
        isVerified: true
      });
    }

    // Remove OTP from memory after successful signup
    otpStore.delete(key);

    res.json({ message: 'Account created successfully!' });
  } catch (err) {
    console.error('signup error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signin
// body: { email, password }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(404).json({ message: 'No account found with this email.' });

    if (!user.isVerified)
      return res.status(400).json({ message: 'Please verify your email before signing in.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'roomsync_super_secret_key_2024',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id:       user._id,
        fullName: user.fullName,
        email:    user.email,
        role:     user.role,
        phone:    user.phone,
        gender:   user.gender
      }
    });
  } catch (err) {
    console.error('signin error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// body: { email, newPassword }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const key   = email?.toLowerCase();
    const entry = otpStore.get(key);

    if (!entry || !entry.verified)
      return res.status(400).json({ message: 'Please verify OTP first before resetting password.' });

    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const user = await User.findOne({ email: key });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Clear OTP after use
    otpStore.delete(key);

    res.json({ message: 'Password reset successfully. Please sign in.' });
  } catch (err) {
    console.error('reset-password error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/set-role
// body: { userId, role }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/set-role', async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!['customer', 'seller'].includes(role))
      return res.status(400).json({ message: 'Role must be customer or seller.' });

    await User.findByIdAndUpdate(userId, { role });
    res.json({ message: 'Role updated successfully.', role });
  } catch (err) {
    console.error('set-role error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;