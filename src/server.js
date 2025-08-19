const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const { app, server } = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
// Use MongoDB Atlas connection string
// MongoDB Atlas connection
const MONGODB_URI = "mongodb+srv://mk8701952:PlnKXynqQHZewAT7@cluster0.e6mpcfg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

console.log('Attempting to connect to MongoDB Atlas...');

// Connection events
mongoose.connection.on('connecting', () => {
  console.log('Connecting to MongoDB...');
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('ℹ️  MongoDB disconnected');
});

// Enable Mongoose debug mode
mongoose.set('debug', true);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// File upload middleware
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: './tmp/',
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  abortOnLimit: true
}));

// Create tmp directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('./tmp')) {
  fs.mkdirSync('./tmp');
}

// Import routes
const galleryRoutes = require('./routes/galleryRoutes');

// Routes
app.get('/', (req, res) => {
  res.send('Taxi Booking API is running');
});

// API Routes
app.use('/api/gallery', galleryRoutes);

// Booking API Route
app.post('/api/bookings', (req, res) => {
  console.log('Booking data received:', req.body);
  res.status(201).json({ 
    success: true, 
    message: 'Booking received successfully!',
    bookingId: 'BK' + Date.now(),
    data: req.body
  });
});

// Contact Form API Route
app.post('/api/contact', (req, res) => {
  console.log('Contact form data received:', req.body);
  res.status(201).json({ 
    success: true, 
    message: 'Message received successfully!',
    data: req.body
  });
});

// Connect to MongoDB with detailed logging
console.log('Attempting to connect to MongoDB...');
console.log('Connection string:', MONGODB_URI);

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // Increased timeout
  socketTimeoutMS: 30000, // Added socket timeout
  connectTimeoutMS: 10000, // Added connection timeout
  maxPoolSize: 10, // Maximum number of connections in the connection pool
  retryWrites: true,
  w: 'majority'
}).then(() => {
  console.log('✅ Connected to MongoDB');
  
  // Start server
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  });
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err);
  process.exit(1);
});

// Handle SIGTERM signal (for Heroku, etc.)
process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated!');
  });
});