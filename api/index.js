const { validateEnv } = require('../src/config/env');
const { connectDB } = require('../src/config/db');
const { primeEsmOnlyCjsDeps } = require('../src/config/esmShim');

validateEnv();

let appPromise = null;
function getApp() {
  if (!appPromise) {
    appPromise = primeEsmOnlyCjsDeps().then(() => require('../src/app'));
  }
  return appPromise;
}

module.exports = async (req, res) => {
  const [app] = await Promise.all([getApp(), connectDB()]);
  return app(req, res);
};
