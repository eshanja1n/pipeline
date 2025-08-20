const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);

const { errorHandler, notFoundHandler } = require('./middleware/errorHandlers');
const rateLimiter = require('./middleware/rateLimiter');

// Import route handlers
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const emailRoutes = require('./routes/emails');
const healthRoutes = require('./routes/health');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting (completely disabled for development)
if (process.env.NODE_ENV === 'production') {
  app.use(rateLimiter);
}
console.log(`🚦 Rate limiting: ${process.env.NODE_ENV === 'production' ? 'ENABLED' : 'DISABLED'}`);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/emails', emailRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Pipeline backend server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 CORS enabled for: ${process.env.NODE_ENV === 'production' ? 'production domains' : 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;