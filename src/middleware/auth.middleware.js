const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Extracts and verifies the JWT from the httpOnly `token` cookie.
 * Returns the decoded payload or null (never throws) — callers decide
 * whether absence/invalidity is fatal.
 */
function readTokenPayload(req) {
  const token = req.cookies && req.cookies.token;
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return null;
  }
}

/**
 * Requires a valid session. Attaches minimal req.user = { id, role, status }.
 * 401s if missing/invalid.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const payload = readTokenPayload(req);
  if (!payload) {
    throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
  }
  if (payload.status === 'suspended') {
    throw ApiError.forbidden('Account suspended', 'ACCOUNT_SUSPENDED');
  }
  req.user = { id: payload.sub, role: payload.role, status: payload.status };
  next();
});

/**
 * Optional auth: if a valid cookie is present, attaches req.user; otherwise
 * proceeds as a guest without erroring. Used on public read endpoints that
 * enrich the response (isSavedByMe, myVote) when the caller is authenticated.
 */
function attachUserIfPresent(req, res, next) {
  const payload = readTokenPayload(req);
  if (payload) {
    req.user = { id: payload.sub, role: payload.role, status: payload.status };
  }
  next();
}

module.exports = { requireAuth, attachUserIfPresent };
