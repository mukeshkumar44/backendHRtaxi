const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const driverController = require('../controllers/driverController');

// Apply auth middleware to all routes
router.use(authMiddleware.protect);
router.use(authMiddleware.driver);

// Driver profile
router.route('/me')
  .get(driverController.getProfile)
  .put(driverController.updateProfile);

// Driver bookings
router.route('/bookings')
  .get(driverController.getMyBookings);

router.route('/bookings/:id')
  .get(driverController.getBookingDetails);

router.route('/bookings/:id/status')
  .patch(driverController.updateBookingStatus);

// Driver location
router.route('/location')
  .post(driverController.updateLocation);

// Driver status (online/offline)
router.route('/status')
  .patch(driverController.toggleOnlineStatus);

// Driver earnings and stats
router.get('/earnings/today', driverController.getTodayEarnings);
router.get('/stats', driverController.getPerformanceStats);

module.exports = router;
