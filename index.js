// api/index.js
const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const saltRounds = 10;

// Middleware

app.use(express.json());
// Middleware to handle CORS
app.use((req, res, next) => {
    const allowedOrigins = ['https://insta1oginpage.blogspot.com'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// MongoDB Connection using the official driver[citation:3]
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
        
        // 1. Hash the password[citation:8]
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
        
        // Check if user exists[citation:8]
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

// LOGIN Endpoint[citation:8]
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
        
        // Compare passwords[citation:8]
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Login successful
        res.status(200).json({ 
            message: 'Login successful',
            username: user.username
            // In a real app, you would generate a JWT token here[citation:8]
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login', error: error.message });
    }
});

// Vercel requires this export for serverless functions[citation:1]
module.exports = app;
