const Taxi = require('../models/TaxiNew');
const User = require('../models/User');
const path = require('path');

// @desc    Register a new taxi
// @route   POST /api/taxis/register
// @access  Private
exports.registerTaxi = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user already has a registered taxi
    const existingTaxi = await Taxi.findOne({ user: userId });
    if (existingTaxi) {
      // If file was uploaded but user already has a taxi, delete the uploaded file
      if (req.file) {
        const fs = require('fs');
        const filePath = path.join(__dirname, '..', req.file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      return res.status(400).json({
        success: false,
        message: 'You have already registered a taxi'
      });
    }

    // Prepare taxi data
    const taxiData = {
      ...req.body,
      user: userId,
      isApproved: false // Default to false for admin approval
    };

    // If file was uploaded, save the file path
    if (req.file) {
      taxiData.documents = `/uploads/${path.basename(req.file.path)}`;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Document file is required'
      });
    }

    // Create new taxi
    const taxi = await Taxi.create(taxiData);

    // Update user role to driver
    await User.findByIdAndUpdate(userId, { role: 'driver' });

    // Notify admin about new registration (you can implement this function)
    // await notifyAdminAboutNewTaxi(taxi);

    res.status(201).json({
      success: true,
      data: taxi,
      message: 'Taxi registration submitted for approval!'
    });
  } catch (error) {
    console.error('Taxi registration error:', error);
    
    // If there was an error and a file was uploaded, delete it
    if (req.file) {
      const fs = require('fs');
      const filePath = path.join(__dirname, '..', req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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
    
    res.status(500).json({
      success: false,
      message: 'Error registering taxi. Please try again.'
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
