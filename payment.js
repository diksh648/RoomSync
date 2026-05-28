const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const User     = require('../models/User');
const authMW   = require('../middleware/auth');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Plans (amount in paise — 100 paise = ₹1)
const PLANS = {
  seller_monthly:   { amount: 20000, months: 1, label: 'Seller Plan',          desc: '₹200/month — List unlimited PGs' },
  customer_monthly: { amount:  5000, months: 1, label: 'Customer Monthly',     desc: '₹50/month — Unlimited chats'     },
  customer_3month:  { amount: 13000, months: 3, label: 'Customer 3-Month',     desc: '₹130 for 3 months — Best Value'  }
};

// POST /api/payment/create-order
router.post('/create-order', authMW, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ message: 'Invalid plan.' });

    const order = await razorpay.orders.create({
      amount:   PLANS[plan].amount,
      currency: 'INR',
      receipt:  `rs_${Date.now()}`,
      notes:    { plan, userId: req.user.userId }
    });

    res.json({ order, key: process.env.RAZORPAY_KEY_ID, planInfo: PLANS[plan], planId: plan });
  } catch (err) {
    console.error('create-order:', err.message);
    res.status(500).json({ message: 'Could not create payment order: ' + err.message });
  }
});

// POST /api/payment/verify
router.post('/verify', authMW, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature)
      return res.status(400).json({ message: 'Payment verification failed.' });

    const months = PLANS[plan]?.months || 1;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);

    await User.findByIdAndUpdate(req.user.userId, {
      isPaid: true, subscriptionPlan: plan,
      subscriptionExpiry: expiry, messagesSentCount: 0
    });

    res.json({ message: 'Payment successful! Subscription activated.', expiry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/payment/status
router.get('/status', authMW, async (req, res) => {
  try {
    const u = await User.findById(req.user.userId)
      .select('isPaid subscriptionPlan subscriptionExpiry messagesSentCount role');
    const active = u.isPaid && u.subscriptionExpiry && u.subscriptionExpiry > new Date();
    res.json({
      isPaid: active,
      subscriptionPlan: u.subscriptionPlan,
      subscriptionExpiry: u.subscriptionExpiry,
      messagesSentCount: u.messagesSentCount,
      freeRemaining: Math.max(0, 5 - u.messagesSentCount)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;