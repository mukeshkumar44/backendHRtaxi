const express = require('express');
const router = express.Router();
const tourPackageController = require('../controllers/tourPackageController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadTourImage } = require('../config/cloudinary');

// Public routes
router.get('/', tourPackageController.getTourPackages);
router.get('/:id', tourPackageController.getTourPackage);

// Protected routes (Admin only)
router.post(
  '/',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  uploadTourImage,
  tourPackageController.createTourPackage
);

router.put(
  '/:id',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  uploadTourImage,
  tourPackageController.updateTourPackage
);

router.delete(
  '/:id',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  tourPackageController.deleteTourPackage
);

module.exports = router;
