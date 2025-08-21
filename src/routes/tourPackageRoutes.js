const express = require('express');
const router = express.Router();
const tourPackageController = require('../controllers/tourPackageController');
const { uploadTourImage } = require('../config/cloudinary');
const { protect, admin } = require('../middleware/auth');
const fileUpload = require('express-fileupload');
router.use(fileUpload({
  useTempFiles: true,
  tempFileDir: './tmp/',
  createParentPath: true
}));
// Public routes - No authentication required
router.get('/', tourPackageController.getTourPackages);
router.get('/:id', tourPackageController.getTourPackage);

// Protected routes - Admin only
router.post(
  '/',
  protect,
  admin,
  upload.single('image'),
  tourPackageController.createTourPackage
);


router.put(
  '/:id',
  protect,
  admin,
  uploadTourImage, // This handles the file upload
  tourPackageController.updateTourPackage
);

router.delete(
  '/:id',
  protect,
  admin,
  tourPackageController.deleteTourPackage
);

module.exports = router;
