const Taxi = require('../models/TaxiNew');
const User = require('../models/User');
const path = require('path');
const { uploadTaxiDocument, cloudinary } = require('../config/cloudinary');

// @desc    Register a new taxi
// @route   POST /api/taxis/register
// @access  Private
exports.registerTaxi = async (req, res, next) => {
  console.log('=== TAXI REGISTRATION REQUEST ===');
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Uploaded file:', req.file);
  console.log('Request body:', req.body);
  console.log('Authenticated user:', req.user);
  
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      console.error('No user ID found in request');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Validate required fields
    const { driverName, vehicleNumber, vehicleModel, vehicleType, licenseNumber, phoneNumber, address } = req.body;
    
    const requiredFields = { driverName, vehicleNumber, vehicleModel, vehicleType, licenseNumber, phoneNumber, address };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      console.error('No file was uploaded');
      return res.status(400).json({
        success: false,
        message: 'Please upload a document file (PDF, JPG, or PNG)'
      });
    }
    
    // Check for upload errors (handled by multer)
    if (req.fileError) {
      console.error('File upload error:', req.fileError);
      return res.status(400).json({
        success: false,
        message: req.fileError.message || 'Error uploading document',
        error: process.env.NODE_ENV === 'development' ? req.fileError.stack : undefined
      });
    }
    
    // Check if taxi with same vehicle number already exists
    const existingTaxi = await Taxi.findOne({ 
      $or: [
        { user: userId },
        { vehicleNumber: vehicleNumber.trim().toUpperCase() }
      ]
    });
    
    if (existingTaxi) {
      console.log('Taxi already exists:', existingTaxi);
      
      // Clean up uploaded file if it exists
      if (req.file && req.file.path) {
        try {
          console.log('Cleaning up uploaded file due to duplicate taxi');
          await cloudinary.uploader.destroy(req.file.filename);
        } catch (cloudinaryErr) {
          console.error('Error cleaning up uploaded file:', cloudinaryErr);
        }
      }
      
      const message = existingTaxi.user.toString() === userId 
        ? 'You have already registered a taxi' 
        : 'A taxi with this vehicle number is already registered';
      
      return res.status(400).json({
        success: false,
        message
      });
    }

    try {
      // Upload document to Cloudinary if file exists
      let documentData = null;
      if (req.file) {
        try {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'taxi-documents',
            resource_type: 'auto',
            public_id: `taxi-doc-${Date.now()}`,
            overwrite: true
          });
          
          documentData = {
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            resource_type: result.resource_type
          };
          
          console.log('Document uploaded to Cloudinary:', documentData);
        } catch (uploadError) {
          console.error('Error uploading document to Cloudinary:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Error uploading document',
            error: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
          });
        }
      }

      // Create new taxi with document details
      const taxiData = {
        driverName: driverName.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleModel: vehicleModel.trim(),
        vehicleType: vehicleType.trim(),
        licenseNumber: licenseNumber.trim(),
        phoneNumber: phoneNumber.trim(),
        documents: documentData,
        address: address.trim(),
        user: userId,
        isApproved: false, // Default to false for admin approval
        documents: {
          url: req.file.path,
          public_id: req.file.filename,
          format: req.file.mimetype.split('/')[1],
          size: req.file.size,
          originalName: req.file.originalname
        }
      };

      console.log('Creating taxi with data:', JSON.stringify(taxiData, null, 2));
      
      // Create new taxi
      const taxi = await Taxi.create(taxiData);
      console.log('Taxi created successfully:', taxi._id);

      // Update user role to driver
      await User.findByIdAndUpdate(userId, { role: 'driver' });
      console.log('User role updated to driver:', userId);

      // Populate user details for response
      await taxi.populate('user', 'name email');

      return res.status(201).json({
        success: true,
        message: 'Taxi registration submitted successfully! Your registration is pending admin approval.',
        data: taxi
      });

    } catch (dbError) {
      console.error('Database error during taxi registration:', dbError);
      
      // Clean up uploaded file if there was a database error
      if (req.file && req.file.path) {
        try {
          console.log('Cleaning up uploaded file due to database error');
          await cloudinary.uploader.destroy(req.file.filename);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file:', cleanupError);
        }
      }
      
      // Handle specific database errors
      if (dbError.name === 'ValidationError') {
        const messages = Object.values(dbError.errors).map(val => val.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: messages
        });
      }
      
      if (dbError.code === 11000) {
        // Extract the duplicate field from the error message
        const duplicateField = dbError.message.match(/index: (\w+)_/)[1];
        return res.status(400).json({
          success: false,
          message: `This ${duplicateField} is already registered`
        });
      }
      
      throw dbError; // Re-throw to be caught by the outer catch
    }
  } catch (error) {
    console.error('Unexpected error during taxi registration:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during registration. Please try again.',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        stack: error.stack
      })
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
