const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const REQUIRED_IN_PRODUCTION = ['MONGODB_URI', 'JWT_SECRET'];

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/not-so-corrupt',

  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  cookieSecure: process.env.COOKIE_SECURE === 'true',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',

  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    bucket: process.env.AWS_S3_BUCKET || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || '',
  },
};

/**
 * Validates presence of critical env vars. Only hard-fails in production so
 * local development / smoke tests (which don't need a live DB) still work.
 *
 * Throws rather than calling process.exit() — on a serverless platform the
 * same warm process can serve other concurrent invocations, so killing the
 * process here would take those down too.
 */
function validateEnv() {
  if (config.nodeEnv === 'production') {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

module.exports = { config, validateEnv };
