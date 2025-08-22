exports.registerTaxi = async (req, res) => {
  try {
    const {
      driverName,
      vehicleNumber,
      vehicleModel,
      vehicleType,
      licenseNumber,
      phoneNumber,
      address
    } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a document'
      });
    }

    // Create new taxi with document URL from Cloudinary
    const taxi = new Taxi({
      driverName,
      vehicleNumber,
      vehicleModel,
      vehicleType,
      licenseNumber,
      phoneNumber,
      address,
      documents: {
        url: req.file.path, // Cloudinary URL
        public_id: req.file.filename // Cloudinary public ID
      },
      user: req.user.id,
      status: 'pending'
    });

    await taxi.save();

    res.status(201).json({
      success: true,
      message: 'Taxi registration submitted for approval',
      data: taxi
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};