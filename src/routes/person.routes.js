const express = require('express');
const { query, param } = require('express-validator');
const personController = require('../controllers/person.controller');
const { attachUserIfPresent } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');

const router = express.Router();

const listValidation = [
  query('q').optional().isString().trim(),
  query('state').optional().isString().trim(),
  query('city').optional().isString().trim(),
  query('cursor').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

// Accepts either a Mongo ObjectId or the person's human-readable `slug`
// (SEO-friendly URLs), unlike the strict isMongoId used on write routes.
const getOneValidation = [
  param('id').isString().trim().notEmpty().isLength({ max: 200 }).withMessage('Invalid person id'),
  query('cursor').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

router.get('/', listValidation, validate, personController.list);
router.get('/:id', getOneValidation, validate, attachUserIfPresent, personController.getOne);

module.exports = router;
