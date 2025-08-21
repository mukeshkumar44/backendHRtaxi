const TourPackage = require('../models/TourPackage');
const { uploadTourImage, deleteImage, cloudinary } = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const upload = promisify(cloudinary.uploader.upload);

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
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    const { title, description, price, duration, location, isPopular, features, highlights, included, notIncluded } = req.body;
    
    // Validate required fields
    if (!title || !description || !price || !duration || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
        required: ['title', 'description', 'price', 'duration', 'location']
      });
    }

    // Check if image was uploaded
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image for the tour package'
      });
    }
    const image = req.files.image;
    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(image.tempFilePath, {
      folder: 'tour-packages',
      width: 1200,
      height: 800,
      crop: 'limit'
    });
    // Parse array fields
    const parseArray = (value) => {
      if (!value) return [];
      try {
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch (e) {
        return value.split(',').map(item => item.trim()).filter(Boolean);
      }
    };

    // Create tour package
    const tourPackage = await TourPackage.create({
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      duration: duration.trim(),
      location: location.trim(),
      isPopular: isPopular === 'true',
      features: parseArray(features),
      highlights: parseArray(highlights),
      included: parseArray(included),
      notIncluded: parseArray(notIncluded),
      image: {
        url: result.secure_url,
        public_id: result.public_id
      }
    });

    console.log('Tour package created successfully:', tourPackage._id);

    res.status(201).json({
      success: true,
      data: tourPackage
    });
    
  } catch (error) {
    console.error('Error in createTourPackage:', error);
    
    // Clean up uploaded file if there was an error
    if (result?.public_id) {
      await cloudinary.uploader.destroy(result.public_id);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating tour package',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
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

    // Check if a new image was uploaded
    if (req.file) {
      // Delete the old image from Cloudinary if it exists
      if (tourPackage.image && tourPackage.image.public_id) {
        await deleteImage(tourPackage.image.public_id);
      }

      // Upload new image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'tour-packages',
        width: 1200,
        height: 800,
        crop: 'limit'
      });

      tourPackage.image = {
        url: result.secure_url,
        public_id: result.public_id
      };
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
    
    // Delete image from Cloudinary if it exists
    if (tourPackage.image && tourPackage.image.public_id) {
      await deleteImage(tourPackage.image.public_id);
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
