const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const fileUpload = require('express-fileupload');
require('dotenv').config();
const { initSocket } = require('./services/socketService');

// Import routes
const bookingRoutes = require('./routes/bookingRoutes');
const contactRoutes = require('./routes/contactRoutes');
const userRoutes = require('./routes/userRoutes');
const taxiRoutes = require('./routes/taxiRoutes');
const tourPackageRoutes = require('./routes/tourPackageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminBookingRoutes = require('./routes/adminBookingRoutes');
const adminTaxiRoutes = require('./routes/adminTaxiRoutes');
const galleryRoutes = require('./routes/galleryRoutes');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
const io = initSocket(server);

// Set io instance to be available in all routes
app.set('io', io);

// Middleware
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload configuration - must be before express.json()
app.use(fileUpload({
  createParentPath: true,
  useTempFiles: true, // Use temporary files instead of memory
  tempFileDir: './tmp/', // Temporary directory for file uploads
  safeFileNames: true,
  preserveExtension: true,
  abortOnLimit: true,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  useTempFiles: true,
  tempFileDir: './tmp/',
  debug: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Log requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  console.log('Headers:', {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length']
  });
  console.log('Body:', req.body);
  console.log('Files:', req.files || 'No files');
  next();
});

// Serve static files from uploads directory
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const fs = require('fs');

// Create uploads directory structure if it doesn't exist
const createUploadsDirs = () => {
  const dirs = ['documents', 'tours', 'taxis'];
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  dirs.forEach(dir => {
    const dirPath = path.join(uploadsDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

// Create upload directories
createUploadsDirs();

// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    // Set appropriate cache headers for uploaded files
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (filePath.match(/\.(jpg|jpeg|png|gif)$/)) {
      res.setHeader('Content-Type', `image/${filePath.split('.').pop()}`);
    }
    // Cache static assets for 1 day
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

console.log('Serving static files from:', uploadsDir);

// Routes
app.get('/', (req, res) => {
  res.send('HR Taxi Booking API is running');
});

// API Routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/users', userRoutes);
app.use('/api/taxis', taxiRoutes);
app.use('/api/tour-packages', tourPackageRoutes);
app.use('/api/gallery', galleryRoutes);

// Admin Routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin/bookings', adminBookingRoutes);
app.use('/api/admin/taxis', adminTaxiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Export both app and server for testing
module.exports = { app, server };