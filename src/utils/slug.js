const mongoose = require('mongoose');

/**
 * Normalizes a set of strings into a single lowercase, alnum-only slug key.
 * Used to deduplicate Person documents referring to the same real-world person
 * (e.g. "Ravi Kumar" + "PWD" + "Uttar Pradesh" -> "ravikumarpwduttarpradesh").
 *
 * @param {...(string|undefined|null)} parts
 * @returns {string}
 */
function normalizeToSlugKey(...parts) {
  return parts
    .filter((p) => typeof p === 'string' && p.trim().length > 0)
    .map((p) => p.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
    .join('');
}

/**
 * Builds a human-readable, dash-separated URL slug from a set of strings
 * (e.g. "Ravi Kumar" + "Chennai" + "Tamil Nadu" -> "ravi-kumar-chennai-tamil-nadu").
 * Unlike normalizeToSlugKey this is meant to be shown in a URL, not just used
 * as an internal dedup key.
 *
 * @param {...(string|undefined|null)} parts
 * @returns {string}
 */
function toUrlSlug(...parts) {
  const joined = parts
    .filter((p) => typeof p === 'string' && p.trim().length > 0)
    .join(' ');

  const slug = joined
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

  return slug;
}

/**
 * Returns a short, effectively-unique token derived from a fresh ObjectId
 * (e.g. "a1b2c3"). Used to disambiguate slugs for documents (like Post) where
 * the human-readable base slug alone is expected to repeat often.
 * @returns {string}
 */
function randomSlugToken() {
  return new mongoose.Types.ObjectId().toString().slice(-6);
}

/**
 * Generates a slug guaranteed not to collide with any existing `slug` value
 * on Model, retrying with either a numeric suffix ("-2", "-3", ...) or a
 * random token suffix until a free one is found.
 *
 * @param {import('mongoose').Model} Model
 * @param {string} baseSlug
 * @param {{randomSuffix?: boolean, maxAttempts?: number}} [options]
 * @returns {Promise<string>}
 */
async function ensureUniqueSlug(Model, baseSlug, options = {}) {
  const { randomSuffix = false, maxAttempts = 25 } = options;
  const base = baseSlug || (randomSuffix ? 'post' : 'item');

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let candidate;
    if (attempt === 0 && !randomSuffix) {
      candidate = base;
    } else if (randomSuffix) {
      candidate = `${base}-${randomSlugToken()}`;
    } else {
      candidate = `${base}-${attempt + 1}`;
    }

    // eslint-disable-next-line no-await-in-loop
    const exists = await Model.exists({ slug: candidate });
    if (!exists) return candidate;
  }

  throw new Error(`Could not generate a unique slug for base "${base}"`);
}

module.exports = { normalizeToSlugKey, toUrlSlug, ensureUniqueSlug, randomSlugToken };
