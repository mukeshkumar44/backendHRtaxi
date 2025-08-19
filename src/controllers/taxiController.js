const Taxi = require('../models/TaxiNew');
const User = require('../models/User');
const path = require('path');
const { uploadTaxiDocument, cloudinary } = require('../config/cloudinary');

// @desc    Register a new taxi
// @route   POST /api/taxis/register
// @access  Private
exports.registerTaxi = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Document file is required'
      });
    }
    
    // Check for upload errors (handled by multer)
    if (req.fileError) {
      return res.status(400).json({
        success: false,
        message: req.fileError.message || 'Error uploading document'
      });
    }
    
    // Check if user already has a registered taxi
    const existingTaxi = await Taxi.findOne({ user: userId });
    if (existingTaxi) {
      // If file was uploaded but user already has a taxi, delete from Cloudinary
      if (req.file && req.file.path) {
        try {
          await cloudinary.uploader.destroy(req.file.filename);
        } catch (cloudinaryErr) {
          console.error('Error deleting uploaded file from Cloudinary:', cloudinaryErr);
        }
      }
      
      return res.status(400).json({
        success: false,
        message: 'You have already registered a taxi'
      });
    }

    // Prepare taxi data with Cloudinary URL
    const taxiData = {
      ...req.body,
      user: userId,
      isApproved: false, // Default to false for admin approval
      documents: {
        url: req.file.path,
        public_id: req.file.filename
      }
    };

      // Create new taxi
    const taxi = await Taxi.create(taxiData);

    // Update user role to driver
    await User.findByIdAndUpdate(userId, { role: 'driver' });

    res.status(201).json({
      success: true,
      data: taxi,
      message: 'Taxi registration submitted for approval!'
    });
  } catch (error) {
    console.error('Taxi registration error:', error);
    
    // If there was an error and a file was uploaded, delete it from Cloudinary
    if (req.file && req.file.path) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (cloudinaryErr) {
        console.error('Error cleaning up uploaded file from Cloudinary:', cloudinaryErr);
      }
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate field value entered. Please check your input.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Notify admin about new taxi registration
// @route   POST /api/admin/notify-taxi-registration
// @access  Private/Admin
exports.notifyTaxiRegistration = async (req, res) => {
  try {
    const { driverName, vehicleNumber, vehicleModel, vehicleType } = req.body;
    
    // Here you would typically send an email to admin
    // For now, we'll just log it
    console.log('New taxi registration:');
    console.log('Driver:', driverName);
    console.log('Vehicle:', `${vehicleModel} (${vehicleType})`);
    console.log('Number:', vehicleNumber);
    
    res.status(200).json({
      success: true,
      message: 'Admin notified about new taxi registration'
    });
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error notifying admin'
    });
  }
};

// @desc    Get all taxis (for admin)
// @route   GET /api/taxis
// @access  Private/Admin
exports.getAllTaxis = async (req, res) => {
  try {
    const taxis = await Taxi.find().populate('user', 'name email');
    
    res.status(200).json({
      success: true,
      count: taxis.length,
      data: taxis
    });
  } catch (error) {
    console.error('Get all taxis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving taxis'
    });
  }
};

// @desc    Get current user's taxi
// @route   GET /api/taxis/my-taxi
// @access  Private
exports.getMyTaxi = async (req, res) => {
  try {
    const taxi = await Taxi.findOne({ user: req.user.id });
    
    if (!taxi) {
      return res.status(404).json({
        success: false,
        message: 'Taxi not found for this user'
      });
    }
    
    res.status(200).json({
      success: true,
      data: taxi
    });
  } catch (error) {
    console.error('Get my taxi error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving taxi'
    });
  }
};
