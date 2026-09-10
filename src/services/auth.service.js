const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { config } = require('../config/env');
const { generateAnonymousIdentity } = require('./anonymousIdentity.service');

const BCRYPT_COST = 12;

/**
 * Registers a new user: hashes password, mints an immutable anonymous
 * identity, and creates the account. Handles the rare race on either the
 * email unique index or the anonymousIdentity.number unique index by
 * surfacing a friendly 409 instead of a raw Mongo error.
 * @returns {Promise<import('mongoose').Document>} the created user
 */
async function register(email, password) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const anonymousIdentity = await generateAnonymousIdentity();

  try {
    const user = await User.create({ email, passwordHash, anonymousIdentity });
    return user;
  } catch (err) {
    if (err && err.code === 11000) {
      if (err.keyPattern && err.keyPattern.email) {
        throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
      }
      // Extremely unlikely (counter race) — ask the client to retry.
      throw ApiError.conflict('Could not allocate identity, please retry', 'IDENTITY_COLLISION');
    }
    throw err;
  }
}

/**
 * Validates credentials and returns the matched user, or throws 401.
 */
async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +email');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  if (user.status === 'suspended') {
    throw ApiError.forbidden('Account suspended', 'ACCOUNT_SUSPENDED');
  }
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  return user;
}

/**
 * Issues a signed JWT carrying only minimal claims (sub, role, status).
 */
function issueToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, status: user.status },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/**
 * Sets the httpOnly session cookie on the response.
 */
function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
  });
}

module.exports = { register, login, issueToken, setAuthCookie, clearAuthCookie };
