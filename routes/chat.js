const express = require('express');
const router  = express.Router();
const Chat    = require('../models/Chat');
const User    = require('../models/user');
const authMW  = require('../middleware/auth');

const FREE_MSG_LIMIT = 5;

// GET /api/chat/conversations
router.get('/conversations', authMW, async (req, res) => {
  try {
    const userId = req.user.userId;
    const messages = await Chat.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    })
      .populate('senderId',   'fullName')
      .populate('receiverId', 'fullName')
      .populate('pgId',       'pgName')
      .sort({ createdAt: -1 });

    const convMap = {};
    for (const msg of messages) {
      const isSender  = msg.senderId._id.toString() === userId;
      const partner   = isSender ? msg.receiverId : msg.senderId;
      const partnerId = partner._id.toString();
      if (!convMap[partnerId]) {
        convMap[partnerId] = {
          partnerId,
          partnerName:  partner.fullName,
          lastMessage:  msg.message,
          lastTime:     msg.createdAt,
          unread:       0
        };
      }
      if (!msg.read && !isSender) convMap[partnerId].unread++;
    }
    res.json(Object.values(convMap));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/chat/messages/:partnerId
router.get('/messages/:partnerId', authMW, async (req, res) => {
  try {
    const { userId } = req.user;
    const { partnerId } = req.params;
    const messages = await Chat.find({
      $or: [
        { senderId: userId,    receiverId: partnerId },
        { senderId: partnerId, receiverId: userId    }
      ]
    })
      .populate('senderId',   'fullName')
      .populate('receiverId', 'fullName')
      .sort({ createdAt: 1 });

    await Chat.updateMany(
      { senderId: partnerId, receiverId: userId, read: false },
      { read: true }
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/chat/send
router.post('/send', authMW, async (req, res) => {
  try {
    const { receiverId, message, pgId } = req.body;
    if (!receiverId || !message)
      return res.status(400).json({ message: 'receiverId and message required.' });

    const sender = await User.findById(req.user.userId);

    // ── Customer free message limit check ─────────────────────────────────
    if (sender.role === 'customer') {
      const isSubscribed = sender.isPaid &&
        sender.subscriptionExpiry && sender.subscriptionExpiry > new Date();

      if (!isSubscribed) {
        if (sender.messagesSentCount >= FREE_MSG_LIMIT) {
          return res.status(402).json({
            message:         'You have used your 5 free messages. Please subscribe to continue chatting.',
            requiresPayment: true,
            freeUsed:        sender.messagesSentCount
          });
        }
        // Increment free message count
        await User.findByIdAndUpdate(req.user.userId, { $inc: { messagesSentCount: 1 } });
      }
    }

    const chat = await Chat.create({
      senderId:   req.user.userId,
      receiverId,
      message,
      pgId: pgId || null
    });

    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;