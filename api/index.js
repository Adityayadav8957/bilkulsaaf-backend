const { validateEnv } = require('../src/config/env');
const { connectDB } = require('../src/config/db');
const app = require('../src/app');

validateEnv();

module.exports = async (req, res) => {
  await connectDB();
  return app(req, res);
};
