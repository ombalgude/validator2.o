const mongoose = require('mongoose');

const getMongoUrl = () => {
  const mongoUrl = process.env.MONGODB_URL || process.env.MONGODB_URI;

  if (!mongoUrl) {
    throw new Error(
      'MongoDB connection string is missing. Set MONGODB_URL or MONGODB_URI in backend/.env.'
    );
  }

  if (mongoUrl.includes('<db_password>')) {
    throw new Error(
      'MongoDB connection string is invalid. Replace <db_password> in backend/.env with the actual database user password.'
    );
  }

  return mongoUrl;
};

const connectDB = async () => {
  const mongoUrl = getMongoUrl();

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const connection = await mongoose.connect(mongoUrl);
    console.log(`MongoDB connected: ${connection.connection.name}`);
    return connection;
  } catch (error) {
    if (/bad auth|authentication failed/i.test(error?.message || '')) {
      console.error(
        'MongoDB connection failed: authentication failed. Check the MongoDB username/password in backend/.env and confirm the database user has access to this cluster.'
      );
    } else {
      console.error('MongoDB connection failed:', error?.message || error);
    }

    throw error;
  }
};

module.exports = connectDB;
