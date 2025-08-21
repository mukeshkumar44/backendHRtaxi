const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories if they don't exist
const createUploadsDirs = () => {
  const baseDir = path.join(__dirname, '..', 'public', 'uploads');
  const dirs = ['documents', 'tours', 'taxis'];
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  dirs.forEach(dir => {
    const dirPath = path.join(baseDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

// Call this function when the module loads
createUploadsDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = path.join(__dirname, '..', 'public', 'uploads');
    
    // Determine the subdirectory based on the route
    if (req.originalUrl.includes('tour-packages')) {
      uploadPath = path.join(uploadPath, 'tours');
    } else if (req.originalUrl.includes('taxis') || req.originalUrl.includes('driver')) {
      uploadPath = path.join(uploadPath, 'taxis');
    } else {
      uploadPath = path.join(uploadPath, 'documents');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept pdf, jpg, jpeg, png, and zip files
  const allowedTypes = [
    'application/pdf', 
    'image/jpeg', 
    'image/jpg', 
    'image/png',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, and ZIP files are allowed.'), false);
  }
};

// Create multer instance with configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Create a custom middleware for taxi document uploads
const handleTaxiDocumentUpload = (req, res, next) => {
  // Use field name 'documents' (plural) to match frontend, fallback to 'document' for backward compatibility
  const uploadMiddleware = req.get('content-type')?.includes('multipart/form-data') 
    ? upload.single('documents') 
    : upload.single('document');
    
  uploadMiddleware(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      return res.status(400).json({
        success: false,
        message: err.message
      });
    } else if (err) {
      // An unknown error occurred
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // File was uploaded successfully
    req.file.path = req.file.path.replace(/\\/g, '/'); // Convert Windows paths to forward slashes
    next();
  });
};

// Export both the multer instance and the custom middleware
module.exports = {
  upload,  // Multer instance for other routes
  handleTaxiDocumentUpload  // Custom middleware for taxi document uploads
};
