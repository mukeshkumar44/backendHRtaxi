const TourPackage = require('../models/TourPackage');
const { uploadTourImage, deleteImage, cloudinary } = require('../config/cloudinary');

// @desc    Get all tour packages
// @route   GET /api/tour-packages
// @access  Public
exports.getTourPackages = async (req, res) => {
  try {
    const packages = await TourPackage.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get single tour package
// @route   GET /api/tour-packages/:id
// @access  Public
exports.getTourPackage = async (req, res) => {
  try {
    const tourPackage = await TourPackage.findById(req.params.id);
    
    if (!tourPackage) {
      return res.status(404).json({
        success: false,
        message: 'Tour package not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: tourPackage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Create new tour package
// @route   POST /api/tour-packages
// @access  Private/Admin
exports.createTourPackage = async (req, res) => {
  try {
    // Handle file upload using Cloudinary
    await new Promise((resolve, reject) => {
      uploadTourImage(req, res, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const { title, description, price, duration, location, isPopular, features } = req.body;
    
    // Create tour package with Cloudinary image URL
    const tourPackage = await TourPackage.create({
      title,
      description,
      price,
      duration,
      location,
      isPopular: isPopular === 'true',
      features: features ? features.split(',').map(f => f.trim()) : [],
      image: req.file.path, // Cloudinary URL
      imagePublicId: req.file.filename // Cloudinary public ID for future deletion
    });

    res.status(201).json({
      success: true,
      data: tourPackage
    });
  } catch (error) {
    console.error('Error creating tour package:', error);
    
    // If there was an error and a file was uploaded, delete it from Cloudinary
    if (req.file?.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (err) {
        console.error('Error cleaning up image from Cloudinary:', err);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update tour package
// @route   PUT /api/tour-packages/:id
// @access  Private/Admin
exports.updateTourPackage = async (req, res) => {
  try {
    let tourPackage = await TourPackage.findById(req.params.id);
    
    if (!tourPackage) {
      return res.status(404).json({
        success: false,
        message: 'Tour package not found'
      });
    }
    
    // Handle file upload if a new image is provided
    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (tourPackage.imagePublicId) {
        try {
          await deleteImage(tourPackage.imagePublicId);
        } catch (err) {
          console.error('Error deleting old image from Cloudinary:', err);
        }
      }
      
      // Update image details with new Cloudinary URL and public ID
      req.body.image = req.file.path;
      req.body.imagePublicId = req.file.filename;
    }
    
    // Convert isPopular to boolean
    if (req.body.isPopular) {
      req.body.isPopular = req.body.isPopular === 'true';
    }
    
    // Convert features to array if it's a string
    if (req.body.features && typeof req.body.features === 'string') {
      req.body.features = req.body.features.split(',').map(f => f.trim());
    }
    
    // Update tour package
    tourPackage = await TourPackage.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: tourPackage
    });
  } catch (error) {
    console.error('Error updating tour package:', error);
    
    // If there was an error and a new file was uploaded, delete it from Cloudinary
    if (req.file?.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (err) {
        console.error('Error cleaning up image from Cloudinary:', err);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Delete tour package
// @route   DELETE /api/tour-packages/:id
// @access  Private/Admin
exports.deleteTourPackage = async (req, res) => {
  try {
    const tourPackage = await TourPackage.findById(req.params.id);
    
    if (!tourPackage) {
      return res.status(404).json({
        success: false,
        message: 'Tour package not found'
      });
    }
    
    // Delete image from Cloudinary if it exists
    if (tourPackage.imagePublicId) {
      try {
        await deleteImage(tourPackage.imagePublicId);
      } catch (err) {
        console.error('Error deleting image from Cloudinary:', err);
        // Continue with deletion even if image deletion fails
      }
    }
    
    await tourPackage.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting tour package:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
