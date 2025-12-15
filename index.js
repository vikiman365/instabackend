// api/index.js
const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors'); // Make sure to install this package: npm install cors

require('dotenv').config();

const app = express();
const saltRounds = 10;

// CORS Configuration
app.use(cors({
  origin: 'https://insta1oginpage.blogspot.com', // Updated to your frontend URL
  credentials: true,
}));

// Catch-all OPTIONS route to handle preflight requests
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://insta1oginpage.blogspot.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  return res.status(200).end();
});

// Global middleware to set CORS headers on every response
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://insta1oginpage.blogspot.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Middleware
app.use(express.json());

// MongoDB Connection using the official driver
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;
async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db(process.env.DB_NAME || 'blogger_auth'); // Use your DB name
        console.log('Connected to MongoDB');
    }
    return db;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API is running' });
});

// SIGNUP Endpoint (based on your code)
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        
        // 1. Hash the password
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // 2. Create user object
        const newUser = {
            username: username.toLowerCase().trim(),
            password: hashedPassword,
            createdAt: new Date()
        };
        
        // 3. Connect to DB and save user
        const database = await connectDB();
        const usersCollection = database.collection('users');
        
        // Check if user exists
        const existingUser = await usersCollection.findOne({ username: newUser.username });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists' });
        }
        
        // Insert new user
        const result = await usersCollection.insertOne(newUser);
        
        res.status(201).json({ 
            message: 'User registered successfully',
            userId: result.insertedId 
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
});

// LOGIN Endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        
        const database = await connectDB();
        const usersCollection = database.collection('users');
        
        // Find user
        const user = await usersCollection.findOne({ 
            username: username.toLowerCase().trim() 
        });
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Login successful
        res.status(200).json({ 
            message: 'Login successful',
            username: user.username
            // In a real app, you would generate a JWT token here
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login', error: error.message });
    }
});

// Vercel requires this export for serverless functions
module.exports = app;
