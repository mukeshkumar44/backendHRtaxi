const express = require('express');
const router = express.Router();
const taxiController = require('../controllers/taxiController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// @route   POST /api/taxis/register
// @desc    Register a new taxi
// @access  Private
router.post(
  '/register',
  authMiddleware.protect,
  uploadMiddleware,
  taxiController.registerTaxi
);

// @route   POST /api/admin/notify-taxi-registration
// @desc    Notify admin about new taxi registration
// @access  Private/Admin
router.post(
  '/admin/notify-taxi-registration',
  authMiddleware.protect,
  authMiddleware.admin,
  taxiController.notifyTaxiRegistration
);

// @route   GET /api/taxis
// @desc    Get all taxis (for admin)
// @access  Private/Admin
router.get(
  '/',
  authMiddleware.protect,
  authMiddleware.admin,
  taxiController.getAllTaxis
);

// @route   GET /api/taxis/my-taxi
// @desc    Get current user's taxi
// @access  Private
router.get(
  '/my-taxi',
  authMiddleware.protect,
  taxiController.getMyTaxi
);

module.exports = router;
