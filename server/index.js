import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import initializeSocket from './socket/index.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDB();

// ========== API Endpoints ==========

// Signup route
app.post('/api/signup', async (req, res) => {
  const { name, email, mobile, password } = req.body;
  try {
    const User = (await import('./models/User.js')).default;
    // Check if user exists by email or mobile
    let user = await User.findOne({ $or: [ { email }, { mobile } ] });
    if (user) {
      return res.status(400).json({ message: 'User already exists with that email or mobile' });
    }
    user = new User({ name, email, mobile, password });
    await user.save();
    res.status(201).json({ message: 'User created successfully', userId: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const User = (await import('./models/User.js')).default;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    res.json({ message: 'Login successful', userId: user._id, name: user.name, email: user.email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search route for DM (by email, mobile, or name)
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ message: 'Query parameter is required' });
  try {
    const User = (await import('./models/User.js')).default;
    const users = await User.find({
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { mobile: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    }).select('_id name email mobile');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user details route
app.get('/api/user/:id', async (req, res) => {
  try {
    const User = (await import('./models/User.js')).default;
    const userDetails = await User.findById(req.params.id).select('_id name email mobile');
    if (!userDetails) return res.status(404).json({ message: 'User not found' });
    res.json(userDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/messages?userId=...
// Returns all messages where the user is either the sender or receiver.
app.get('/api/messages', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: 'UserId is required' });
  try {
    const Message = (await import('./models/Message.js')).default;
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== Initialize Socket.IO ==========

initializeSocket(server);

// Start the server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
