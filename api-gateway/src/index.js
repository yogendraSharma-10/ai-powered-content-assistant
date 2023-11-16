require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = 'morgan';
const rateLimit = require('express-rate-limit');

const aiRoutes = require('./routes/ai');

// --- Constants ---
const PORT = process.env.API_GATEWAY_PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// --- App Initialization ---
const app = express();

// --- Core Middleware ---

// Set security-related HTTP headers
app.use(helmet());

// Enable CORS with configurable options
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  optionsSuccessStatus: 200, // For legacy browser support
};
app.use(cors(corsOptions));

// Parse incoming JSON requests with a size limit
app.use(express.json({ limit: '1mb' }));

// Log HTTP requests. Use 'combined' in production and 'dev' otherwise.
app.use(require('morgan')(IS_PRODUCTION ? 'combined' : 'dev'));

// --- Rate Limiting ---
// Apply a basic rate limiter to all API requests to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});
app.use('/api', apiLimiter);


// --- API Routes ---

// Health check endpoint for monitoring services
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
});

// Mount the AI service routes under a versioned path
app.use('/api/v1/ai', aiRoutes);


// --- Error Handling Middleware ---

// Catch-all for 404 Not Found errors
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      message: 'Resource not found.',
      path: req.originalUrl,
    },
  });
});

// Generic error handler. Must be the last middleware.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err);

  const statusCode = err.status || 500;
  const errorMessage = err.message || 'An unexpected internal server error occurred.';

  res.status(statusCode).json({
    error: {
      message: errorMessage,
      // Only include stack trace in non-production environments
      ...( !IS_PRODUCTION && { stack: err.stack } ),
    },
  });
});


// --- Server Startup ---
const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// --- Graceful Shutdown ---
const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    // Add any other cleanup here (e.g., database connections)
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));