const express = require('express');
const router = express.Router();
const taxiController = require('../controllers/taxiController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadTaxiDocument } = require('../config/cloudinary');

// @route   POST /api/taxis/register
// @desc    Register a new taxi
// @access  Private
// Register a new taxi with document upload to Cloudinary
router.post(
  '/register',
  authMiddleware.protect,
  (req, res, next) => {
    console.log('Request headers:', req.headers);
    console.log('Request files:', req.files);
    console.log('Request body:', req.body);
    next();
  },
  uploadTaxiDocument,
  (req, res, next) => {
    console.log('After upload middleware - File:', req.file);
    next();
  },
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
