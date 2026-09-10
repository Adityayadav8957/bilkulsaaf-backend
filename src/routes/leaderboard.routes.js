const express = require('express');
const { query } = require('express-validator');
const leaderboardController = require('../controllers/leaderboard.controller');
const { attachUserIfPresent } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');

const router = express.Router();

const limitValidation = [query('limit').optional().isInt({ min: 1, max: 50 })];

router.get(
  '/most-voted',
  limitValidation,
  validate,
  attachUserIfPresent,
  leaderboardController.mostVoted
);
router.get(
  '/most-discussed',
  limitValidation,
  validate,
  attachUserIfPresent,
  leaderboardController.mostDiscussed
);
router.get(
  '/trending',
  limitValidation,
  validate,
  attachUserIfPresent,
  leaderboardController.trending
);
router.get(
  '/most-reported',
  limitValidation,
  validate,
  attachUserIfPresent,
  leaderboardController.mostReported
);
router.get('/rising-people', limitValidation, validate, leaderboardController.risingPeople);

module.exports = router;
