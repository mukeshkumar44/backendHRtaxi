// CORS configuration
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'https://yourfrontenddomain.com', // Add your production frontend URL
  'https://backendhrtaxi.onrender.com' // Your backend URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  preflightContinue: true,
  optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', cors());