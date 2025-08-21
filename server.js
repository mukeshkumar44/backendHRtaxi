// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads', 'tours');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory at:', uploadsDir);
}

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'https://yourfrontenddomain.com', // Add your production frontend URL
  'https://backendhrtaxi.onrender.com' // Your backend URL
];

const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const fs = require('fs');

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  preflightContinue: true,
  optionsSuccessStatus: 204
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload middleware with better error handling
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 1 // Limit to 1 file per request
  },
  abortOnLimit: true,
  responseOnLimit: 'File size is too large. Max 5MB allowed.',
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'tmp'),
  debug: process.env.NODE_ENV === 'development',
  safeFileNames: true,
  preserveExtension: 4, // Keep .jpeg, .png, etc.
  uploadTimeout: 30000 // 30 seconds
}));

// Log file upload errors
app.use((err, req, res, next) => {
  if (err) {
    console.error('File upload error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File size is too large. Max 5MB allowed.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Error processing file upload',
      error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
  }
  next();
});

// Make uploads directory accessible
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  if (req.files) {
    console.log('Files in request:', Object.keys(req.files));
  }
  next();
});

// Routes
app.use('/api/tour-packages', require('./src/routes/tourPackageRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Upload directory: ${uploadsDir}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});