const express = require('express');
const reportController = require('../controllers/report.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { writeLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { createReportValidation } = require('../validations/report.validation');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  writeLimiter,
  createReportValidation,
  validate,
  reportController.create
);

module.exports = router;
