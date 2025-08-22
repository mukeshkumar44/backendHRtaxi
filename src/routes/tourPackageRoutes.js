const express = require('express');
const router = express.Router();
const tourPackageController = require('../controllers/tourPackageController');
const { uploadTourImage } = require('../config/cloudinary');
const { protect, admin } = require('../middleware/auth');

// Public routes - No authentication required
router.get('/', tourPackageController.getTourPackages);
router.get('/:id', tourPackageController.getTourPackage);

// Protected routes - Admin only
router.post(
  '/',
  protect,
  admin,
  (req, res, next) => {
    uploadTourImage(req, res, (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'Error uploading file',
          error: process.env.NODE_ENV === 'development' ? err : undefined
        });
      }
      next();
    });
  },
  tourPackageController.createTourPackage
);

router.put(
  '/:id',
  protect,
  admin,
  (req, res, next) => {
    uploadTourImage(req, res, (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'Error uploading file',
          error: process.env.NODE_ENV === 'development' ? err : undefined
        });
      }
      next();
    });
  },
  tourPackageController.updateTourPackage
);

router.delete(
  '/:id',
  protect,
  admin,
  tourPackageController.deleteTourPackage
);

module.exports = router;
