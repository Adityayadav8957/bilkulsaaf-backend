const mongoose = require('mongoose');

/**
 * Generic atomic counter used to generate sequential numbers
 * (e.g. anonymous citizen numbers) without race conditions.
 * _id is the counter's name/key (e.g. 'anonymousCitizen').
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
