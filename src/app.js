const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');

const { config } = require('./config/env');
const apiRoutes = require('./routes/index');
const { generalLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// NOTE: requiring this module never opens a database connection — only
// server.js calls connectDB(). This keeps `require('./src/app.js')` a cheap,
// side-effect-free smoke test.
const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression());

if (config.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}

app.use('/api', generalLimiter, apiRoutes);

app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', env: config.nodeEnv } });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
