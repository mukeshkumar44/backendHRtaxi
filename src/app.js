// backend/app.js
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
app.set('io', io);

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000'], // frontend ka origin
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload
app.use(fileUpload({
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: './tmp/',
  limits: { fileSize: 10 * 1024 * 1024 }
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Routes
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

module.exports = { app, server };
