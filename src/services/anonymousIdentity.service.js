const Counter = require('../models/Counter');

const COUNTER_KEY = 'anonymousCitizen';
const BASE_NUMBER = 10000;

/**
 * Atomically generates the next anonymous identity for a new user.
 * Uses findByIdAndUpdate with $inc + upsert, which Mongo executes atomically,
 * so concurrent registrations never collide on the same number.
 * @returns {Promise<{label:string, number:number, displayName:string}>}
 */
async function generateAnonymousIdentity() {
  const counter = await Counter.findByIdAndUpdate(
    COUNTER_KEY,
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const number = BASE_NUMBER + counter.seq;
  return {
    label: 'Citizen',
    number,
    displayName: `Anonymous Citizen #${number}`,
  };
}

module.exports = { generateAnonymousIdentity };
