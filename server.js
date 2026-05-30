require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');

const authRoutes    = require('./routes/auth');
const pgRoutes      = require('./routes/pg');
const chatRoutes    = require('./routes/chat');
const paymentRoutes = require('./routes/payment');
const Chat          = require('../models/Chat');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅  MongoDB connected'))
  .catch(err => console.error('❌  MongoDB:', err));

app.use('/api/auth',    authRoutes);
app.use('/api/pg',      pgRoutes);
app.use('/api/chat',    chatRoutes);
app.use('/api/payment', paymentRoutes);
app.get('/api/health',  (req, res) => res.json({ status: 'ok' }));

// ── Socket.io ─────────────────────────────────────────────────────────────────
const userSockets = {};

io.on('connection', socket => {
  socket.on('join', userId => {
    userSockets[userId] = socket.id;
    socket.join(userId);
  });

  socket.on('send_message', async data => {
    try {
      const { senderId, receiverId, message, pgId } = data;
      const saved = await Chat.create({ senderId, receiverId, message, pgId: pgId || null });
      const populated = await saved.populate([
        { path: 'senderId',   select: 'fullName' },
        { path: 'receiverId', select: 'fullName' }
      ]);
      io.to(receiverId).emit('receive_message', populated);
      io.to(senderId).emit('receive_message',   populated);
    } catch (err) {
      console.error('Socket error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    Object.keys(userSockets).forEach(uid => {
      if (userSockets[uid] === socket.id) delete userSockets[uid];
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀  RoomSync → http://localhost:${PORT}`));