const express = require('express');
const { query } = require('express-validator');
const searchController = require('../controllers/search.controller');
const { attachUserIfPresent } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');

const router = express.Router();

const searchValidation = [
  query('q').optional().isString().trim(),
  query('type').optional().isIn(['all', 'posts', 'people']),
];

router.get('/', searchValidation, validate, attachUserIfPresent, searchController.search);

module.exports = router;
