const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const authService = require('../services/auth.service');
const User = require('../models/User');

const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.register(email, password);
  const token = authService.issueToken(user);
  authService.setAuthCookie(res, token);
  sendSuccess(res, user.toPrivateJSON(), 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.login(email, password);
  const token = authService.issueToken(user);
  authService.setAuthCookie(res, token);
  sendSuccess(res, user.toPrivateJSON());
});

const logout = asyncHandler(async (req, res) => {
  authService.clearAuthCookie(res);
  sendSuccess(res, { loggedOut: true });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+email');
  if (!user) {
    throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  }
  sendSuccess(res, user.toPrivateJSON());
});

module.exports = { register, login, logout, me };
