const rateLimit = require('express-rate-limit');

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// General cap across all /api traffic — generous, mostly a DoS backstop.
const generalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please try again later', code: 'RATE_LIMITED' } },
});

// Stricter cap on register/login to slow down credential stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many auth attempts, please try again later', code: 'RATE_LIMITED' } },
});

// Moderate cap on content-creation endpoints (post/comment/vote/report) to
// curb spam/abuse while still allowing normal, active usage.
const writeLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many write requests, please slow down', code: 'RATE_LIMITED' } },
});

module.exports = { generalLimiter, authLimiter, writeLimiter };
