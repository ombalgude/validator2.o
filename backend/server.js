const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');
require('dotenv').config();
const connectDB = require('./models/connection');
const notificationService = require('./services/notification_instance');


// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const certificateRoutes = require('./routes/certificates');
const institutionRoutes = require('./routes/institutions');
const dashboardRoutes = require('./routes/dashboard');
const verificationLogRoutes = require('./routes/verificationLogs');
const accessRoutes = require('./routes/access');

const getAllowedOrigins = () => {
  const fallbackOrigin = 'http://localhost:3000';

  return String(process.env.FRONTEND_URL || fallbackOrigin)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const createUnavailableFeatureRouter = (message) => {
  const router = express.Router();

  router.use((_req, res) => {
    res.status(503).json({ message });
  });

  return router;
};

const loadOptionalRoute = (modulePath, unavailableMessage) => {
  try {
    return require(modulePath);
  } catch (error) {
    console.warn(`Optional route "${modulePath}" is unavailable: ${error.message}`);
    return createUnavailableFeatureRouter(unavailableMessage);
  }
};

const adminBlockchainRoutes = loadOptionalRoute(
  './routes/admin.blockchain',
  'Blockchain admin routes are unavailable in this environment'
);

const verifyRoutes = loadOptionalRoute(
  './routes/verify.route',
  'Blockchain verification routes are unavailable in this environment'
);

const createApp = () => {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  // CORS configuration
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
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
  app.use("/api/admin/blockchain", adminBlockchainRoutes);
  app.use("/api/verify", verifyRoutes);

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

    if (err.message && err.message.includes('not allowed by CORS')) {
      return res.status(403).json({
        message: err.message
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

const createRealtimeServer = (app) => {
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

  notificationService.initialize(io);

  return { server, io };
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
  const { server, io } = createRealtimeServer(app);

  await new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      resolve();
    });
  });

  return { app, server, io };
};

const app = createApp();

if (require.main === module) {
  startServer(app);
}

module.exports = { app, createApp, createRealtimeServer, startServer };
