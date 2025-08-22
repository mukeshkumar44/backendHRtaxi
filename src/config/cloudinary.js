const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage for tour package images
const tourPackageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tour-packages',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 800, crop: 'limit' }],
    resource_type: 'auto'
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'tour-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure storage for gallery images
const galleryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 1200, height: 800, crop: 'limit' }],
    resource_type: 'auto'
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

// Configure storage for taxi documents
const taxiDocumentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'taxi-documents',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      public_id: `taxi-doc-${Date.now()}-${Math.round(Math.random() * 1E9)}`
    };
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `taxi-doc-${uniqueSuffix}${ext}`);
  }
});

// Create memory storage for file uploads
const memoryStorage = multer.memoryStorage();

// Create multer instance for tour image uploads
const uploadTourImage = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload only images.'), false);
    }
  }
}).single('image');

// Middleware to handle the upload
const handleTourImageUpload = (req, res, next) => {
  uploadTourImage(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading file',
        error: process.env.NODE_ENV === 'development' ? err : undefined
      });
    }

    // If no file was uploaded, continue to the next middleware
    if (!req.file) {
      console.log('No file uploaded');
      return next();
    }

    try {
      // Convert buffer to base64
      const base64Data = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(base64Data, {
        folder: 'tour-packages',
        width: 1200,
        height: 800,
        crop: 'limit'
      });

      // Attach the result to the request object
      req.file.cloudinaryResult = result;
      next();
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing file upload',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
};

const uploadGalleryImage = multer({
  storage: galleryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed!'), false);
    }
  }
}).single('image');

// Configure multer for taxi documents
const uploadTaxiDocument = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
    parts: 20 // Increase parts limit for form data
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (file && allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed (max 10MB)'), false);
    }
  }
}).single('documents');

// Middleware to handle taxi document upload
const handleTaxiDocumentUpload = (req, res, next) => {
  uploadTaxiDocument(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading file',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    // If no file was uploaded
    if (!req.file) {
      console.log('No file was uploaded');
      return res.status(400).json({
        success: false,
        message: 'Please upload a document file (PDF, JPG, or PNG)'
      });
    }

    // Verify file exists and has data
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error('Uploaded file is empty');
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is empty'
      });
    }

    next();
  });
};

// Function to upload file to Cloudinary
const uploadToCloudinary = async (file) => {
  try {
    const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'taxi-documents',
      resource_type: 'auto',
      public_id: `taxi-doc-${Date.now()}`
    });
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

// Function to delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return false;
  }
};

module.exports = {
  uploadTourImage: handleTourImageUpload,
  uploadGalleryImage,
  uploadTaxiDocument: handleTaxiDocumentUpload,
  deleteImage,
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary
};
