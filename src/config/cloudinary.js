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
    allowed_formats: ['jpg', 'jpeg', 'png'],
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

// Create multer instance with proper configuration
const uploadTourImage = (req, res, next) => {
  const upload = multer({
    storage: tourPackageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    }
  }).single('image');

  upload(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File size too large. Max 5MB allowed.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
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

// Create multer upload instance for taxi documents
const uploadTaxiDocument = (req, res, next) => {
  console.log('Starting file upload...');
  console.log('Request headers:', req.headers);
  
  // Check if the request is multipart/form-data
  if (!req.is('multipart/form-data')) {
    return res.status(400).json({
      success: false,
      message: 'Content-Type must be multipart/form-data'
    });
  }
  
  const multerUpload = multer({
    storage: taxiDocumentStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
      fields: 10 // Number of non-file fields to accept
    },
    fileFilter: (req, file, cb) => {
      console.log('Processing file:', file);
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (file && allowedTypes.includes(file.mimetype)) {
        console.log('File type accepted:', file.mimetype);
        cb(null, true);
      } else {
        console.error('Invalid file type:', file.mimetype);
        cb(new Error('Only PDF, JPG, and PNG files are allowed'));
      }
    }
  });
  
  // Handle both 'document' and 'documents' field names
  const upload = multerUpload.fields([
    { name: 'documents', maxCount: 1 },
    { name: 'document', maxCount: 1 }
  ]);
  
  // Handle multer errors
  upload(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading file',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
    
    // Handle the uploaded file from either field name
    if (req.files) {
      // Check for 'documents' field first, then 'document'
      const files = req.files['documents'] || req.files['document'];
      if (!files || files.length === 0) {
        console.error('No file uploaded');
        return res.status(400).json({
          success: false,
          message: 'Please upload a document file (PDF, JPG, or PNG)'
        });
      }
      
      // Attach the first file to req.file for backward compatibility
      req.file = files[0];
    } else if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'Please upload a document file (PDF, JPG, or PNG)'
      });
    }
    
    console.log('File uploaded successfully:', req.file);
    next();
  });
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
  uploadTourImage,
  uploadGalleryImage,
  uploadTaxiDocument,
  deleteImage,
  cloudinary
};
