// api/index.js
const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const serverless = require('serverless-http');
require('dotenv').config();

const app = express();
const saltRounds = 10;

// ========== CORS ==========
// Exact origin you expect from Blogger:
const ALLOWED_ORIGINS = [
  'https://insta1oginpage.blogspot.com'
];

// dynamic origin function (lets you add more origins later)
const corsOptions = {
  origin: function (origin, callback) {
    // Note: some requests (e.g. from mobile apps or tools) may send no origin.
    if (!origin) return callback(null, true); // allow non-browser tools (optional)
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight

// ========== MIDDLEWARE ==========
app.use(express.json());

// ========== MONGODB ==========
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;
async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME || 'blogger_auth');
    console.log('Connected to MongoDB');
  }
  return db;
}

// ========== ROUTES ==========
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = { username: username.toLowerCase().trim(), password: hashedPassword, createdAt: new Date() };

    const database = await connectDB();
    const users = database.collection('users');

    const existing = await users.findOne({ username: newUser.username });
    if (existing) return res.status(409).json({ message: 'Username already exists' });

    const result = await users.insertOne(newUser);
    res.status(201).json({ message: 'User registered', userId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error registering user', error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

    const database = await connectDB();
    const users = database.collection('users');
    const user = await users.findOne({ username: username.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    await users.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() }, $inc: { loginCount: 1 } });

    res.json({ message: 'Login successful', username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login error', error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ========== Vercel Export / Local server ==========
const handler = serverless(app);

// when running locally (not on Vercel), start an HTTP server
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

// export the serverless handler for Vercel
module.exports = handler;
