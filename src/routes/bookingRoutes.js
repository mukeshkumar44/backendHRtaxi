const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/auth');

// Public route - Create a new booking
router.post('/', bookingController.createBooking);

// Protected routes - Require authentication
router.get('/', authMiddleware.protect, bookingController.getUserBookings);
router.get('/all', authMiddleware.protect, authMiddleware.admin, bookingController.getAllBookings);
router.get('/:id', authMiddleware.protect, bookingController.getBooking);
router.patch('/:id/status', authMiddleware.protect, authMiddleware.admin, bookingController.updateBookingStatus);
router.delete('/:id', authMiddleware.protect, authMiddleware.admin, bookingController.deleteBooking);

module.exports = router;