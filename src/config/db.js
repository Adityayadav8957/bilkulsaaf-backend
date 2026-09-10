const mongoose = require('mongoose');
const { config } = require('./env');

mongoose.connection.on('connected', () => {
  // eslint-disable-next-line no-console
  console.log('[db] mongoose connected');
});

mongoose.connection.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db] mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  // eslint-disable-next-line no-console
  console.warn('[db] mongoose disconnected');
});

/**
 * Connects to MongoDB. Only called from server.js — importing this module
 * (or any module that requires it indirectly) never opens a connection.
 */
async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongodbUri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
    autoIndex: config.nodeEnv !== 'production',
  });
  return mongoose.connection;
}

module.exports = { connectDB };
