const express = require('express');
const { param, query } = require('express-validator');
const mapController = require('../controllers/map.controller');
const validate = require('../middleware/validate');

const router = express.Router();

const cursorValidation = [
  query('cursor').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

router.get('/states', mapController.states);
router.get(
  '/states/:state',
  [param('state').isString().trim().notEmpty()],
  validate,
  mapController.stateDetail
);
// Registered before /cities/:city — an index of every distinct city, used to
// build the /cities SEO page and its sitemap (there was previously no way to
// enumerate cities without already knowing a name).
router.get('/cities', cursorValidation, validate, mapController.citiesIndex);
router.get(
  '/cities/:city',
  [param('city').isString().trim().notEmpty()],
  validate,
  mapController.cityDetail
);

module.exports = router;
