const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./models/connection');


// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const certificateRoutes = require('./routes/certificates');
const institutionRoutes = require('./routes/institutions');
const dashboardRoutes = require('./routes/dashboard');
const verificationLogRoutes = require('./routes/verificationLogs');
const accessRoutes = require('./routes/access');

const createApp = () => {
  const app = express();

  // CORS configuration
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static file serving
  app.use('/uploads', express.static('uploads'));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/certificates', certificateRoutes);
  app.use('/api/institutions', institutionRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/verification-logs', verificationLogRoutes);
  app.use('/api/access', accessRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum size is 10MB.'
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Unexpected field in file upload.'
      });
    }

    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  return app;
};

const registerProcessHandlers = () => {
  if (registerProcessHandlers.isRegistered) {
    return;
  }

  registerProcessHandlers.isRegistered = true;

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    mongoose.connection.close(() => process.exit(0));
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection:', reason);
  });
};

const startServer = async (app = createApp()) => {
  try {
    await connectDB();
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error?.message || error);
    process.exit(1);
  }

  registerProcessHandlers();

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  return { app, server };
};

const app = createApp();

if (require.main === module) {
  startServer(app);
}

module.exports = { app, createApp, startServer };
