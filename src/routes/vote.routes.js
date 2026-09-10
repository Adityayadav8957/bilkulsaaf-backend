const express = require('express');
const voteController = require('../controllers/vote.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { writeLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { castVoteValidation } = require('../validations/vote.validation');

const router = express.Router();

router.post(
  '/posts/:id',
  requireAuth,
  writeLimiter,
  castVoteValidation,
  validate,
  voteController.voteOnPost
);

module.exports = router;
