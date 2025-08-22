const express = require('express');
const router = express.Router();
const taxiController = require('../controllers/taxiController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadTaxiDocument } = require('../config/cloudinary');
const { handleTaxiDocumentUpload } = require('../middleware/fileUpload');


// @route   POST /api/taxis/register
// @desc    Register a new taxi
// @access  Private
router.post(
  '/register',
  authMiddleware.protect,
  handleTaxiDocumentUpload,
  uploadTaxiDocument.single('documents'),
  authMiddleware.checkOnlineStatus,
  (req, res, next) => {
    // Add error handling for file upload
    uploadTaxiDocument(req, res, function(err) {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'Error uploading file',
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
      next();
    });
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
