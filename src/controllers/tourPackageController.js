const TourPackage = require('../models/TourPackage');
const { uploadTourImage, deleteImage, cloudinary } = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');

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
    console.log('=== REQUEST BODY ===');
    console.log(req.body);
    console.log('=== FILES ===');
    console.log(req.files);
    console.log('=== HEADERS ===');
    console.log(req.headers);

    const { title, description, price, duration, location, isPopular, features } = req.body;
    
    // Validate required fields
    if (!title || !description || !price || !duration || !location) {
      console.log('Validation failed - Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
        required: ['title', 'description', 'price', 'duration', 'location'],
        received: { title, description, price, duration, location }
      });
    }

    // Initialize tour package data
    const tourPackageData = {
      title,
      description,
      price: Number(price),
      duration,
      location,
      isPopular: isPopular === 'true',
      features: features ? features.split(',').map(f => f.trim()) : []
    };

    // Handle file upload if exists
    if (req.files && req.files.image) {
      const image = req.files.image;
      console.log('Processing image upload:', image.name);
      
      // Check if file is an image
      if (!image.mimetype.startsWith('image')) {
        console.log('Invalid file type:', image.mimetype);
        return res.status(400).json({
          success: false,
          message: 'Please upload an image file'
        });
      }

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = image.name.split('.').pop();
      const filename = `tour-${uniqueSuffix}.${ext}`;
      const uploadPath = path.join(__dirname, '../../public/uploads/tours', filename);
      
      // Create directory if it doesn't exist
      const dir = path.dirname(uploadPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Move the file
      await image.mv(uploadPath);
      console.log('File saved to:', uploadPath);
      
      // Set image path in database
      tourPackageData.image = `/uploads/tours/${filename}`;
    } else {
      console.log('No image file found in request');
    }

    console.log('Creating tour package with data:', tourPackageData);
    const tourPackage = await TourPackage.create(tourPackageData);
    console.log('Tour package created successfully:', tourPackage._id);

    res.status(201).json({
      success: true,
      data: tourPackage
    });
    
  } catch (error) {
    console.error('Error in createTourPackage:', error);
    
    // If there was an error and a file was uploaded, delete it
    if (req.files?.image?.tempFilePath) {
      try {
        fs.unlinkSync(req.files.image.tempFilePath);
        console.log('Cleaned up temp file');
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating tour package',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
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
    
    const { title, description, price, duration, location, isPopular, features } = req.body;
    
    // Update fields
    tourPackage.title = title || tourPackage.title;
    tourPackage.description = description || tourPackage.description;
    tourPackage.price = price || tourPackage.price;
    tourPackage.duration = duration || tourPackage.duration;
    tourPackage.location = location || tourPackage.location;
    tourPackage.isPopular = isPopular ? isPopular === 'true' : tourPackage.isPopular;
    tourPackage.features = features ? features.split(',').map(f => f.trim()) : tourPackage.features;

    // If there's a new image
    if (req.file) {
      // Delete old image if exists
      if (tourPackage.imagePublicId) {
        await deleteImage(tourPackage.imagePublicId);
      }
      
      tourPackage.image = req.file.path;
      tourPackage.imagePublicId = req.file.filename;
    }

    await tourPackage.save();

    res.status(200).json({
      success: true,
      data: tourPackage
    });
  } catch (error) {
    console.error('Error updating tour package:', error);
    
    // If there was an error and a new file was uploaded, delete it
    if (req.file?.filename) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating tour package',
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
    
    // Delete image from Cloudinary if exists
    if (tourPackage.imagePublicId) {
      await deleteImage(tourPackage.imagePublicId);
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
      message: 'Error deleting tour package',
      error: error.message
    });
  }
};
