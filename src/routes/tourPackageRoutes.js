const express = require('express');
const router = express.Router();
const tourPackageController = require('../controllers/tourPackageController');
const { uploadTourImage } = require('../config/cloudinary');
const { protect, authorize, admin } = require('../middleware/auth');

// Public routes
router.get('/', tourPackageController.getTourPackages);
router.get('/:id', tourPackageController.getTourPackage);

// Protected routes (Admin only)
router.post(
  '/',
  protect,
  admin,
  uploadTourImage,
  tourPackageController.createTourPackage
);

router.put(
  '/:id',
  protect,
  admin,
  uploadTourImage,
  tourPackageController.updateTourPackage
);

router.delete(
  '/:id',
  protect,
  admin,
  tourPackageController.deleteTourPackage
);

module.exports = router;
