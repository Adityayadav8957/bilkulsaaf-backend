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

let connectPromise = null;

/**
 * Connects to MongoDB. Only called from server.js / the serverless entrypoint
 * — importing this module never opens a connection on its own.
 *
 * Caches the in-flight/resolved connection so repeated calls (e.g. once per
 * serverless invocation on a warm container) reuse the same connection
 * instead of opening a new one each time.
 */
async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (!connectPromise) {
    mongoose.set('strictQuery', true);
    connectPromise = mongoose
      .connect(config.mongodbUri, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 10000,
        autoIndex: config.nodeEnv !== 'production',
      })
      .catch((err) => {
        connectPromise = null;
        throw err;
      });
  }
  await connectPromise;
  return mongoose.connection;
}

module.exports = { connectDB };
