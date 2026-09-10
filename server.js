const { config, validateEnv } = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const app = require('./src/app');

validateEnv();

async function start() {
  try {
    await connectDB();
    app.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`[server] listening on port ${config.port} (${config.nodeEnv})`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[server] failed to start:', err);
    process.exit(1);
  }
}

start();
