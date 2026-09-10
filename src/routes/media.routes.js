const express = require('express');
const mediaController = require('../controllers/media.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { writeLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { uploadUrlValidation } = require('../validations/media.validation');

const router = express.Router();

router.post(
  '/upload-url',
  requireAuth,
  writeLimiter,
  uploadUrlValidation,
  validate,
  mediaController.uploadUrl
);

module.exports = router;
