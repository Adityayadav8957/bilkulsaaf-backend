const mongoose = require('mongoose');
const Person = require('../models/Person');
const { normalizeToSlugKey, toUrlSlug } = require('../utils/slug');
const { parseLimit, decodeCursor, encodeCursor } = require('../utils/pagination');

/**
 * Finds an existing Person matching (name, organization, state) via a
 * normalized slugKey, or creates one. Upserts atomically so concurrent post
 * creations about the same person never produce duplicate Person docs.
 *
 * A human-readable `slug` (e.g. "ravi-kumar-chennai-tamil-nadu") is assigned
 * on insert. Because slug uniqueness is a separate constraint from the
 * slugKey dedup key, a slug collision (two different people who'd otherwise
 * generate the same URL slug) is retried with a numeric suffix; a slugKey
 * collision (a genuine concurrent duplicate of the same person) just returns
 * the document the other request created.
 * @returns {Promise<import('mongoose').Document>} the Person document
 */
async function findOrCreatePerson({ name, designation, organization, state, city, photoUrl }) {
  const slugKey = normalizeToSlugKey(name, organization, state);

  const existing = await Person.findOne({ slugKey });
  if (existing) {
    // A later post can add a photo for a person that doesn't have one yet,
    // but never overwrites one that's already set (first photo wins, so a
    // report can't be used to quietly swap someone else's picture out).
    if (photoUrl && !existing.photoUrl) {
      existing.photoUrl = photoUrl;
      await existing.save();
    }
    return existing;
  }

  const baseSlug = toUrlSlug(name, city, state) || 'citizen';

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    try {
      // eslint-disable-next-line no-await-in-loop
      return await Person.findOneAndUpdate(
        { slugKey },
        {
          $setOnInsert: {
            name: name.trim(),
            designation: (designation || '').trim(),
            organization: (organization || '').trim(),
            photoUrl: (photoUrl || '').trim(),
            location: { state: state.trim(), city: (city || '').trim() },
            slugKey,
            slug,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      if (err && err.code === 11000) {
        // eslint-disable-next-line no-await-in-loop
        const dupe = await Person.findOne({ slugKey });
        if (dupe) return dupe;
        continue; // slug collided with a different person's slug — retry with next suffix
      }
      throw err;
    }
  }

  throw new Error(`Failed to allocate a unique person slug for base "${baseSlug}"`);
}

/**
 * Increments/decrements a Person's denormalized stat counters.
 * @param {string} personId
 * @param {{postsCount?:number, totalVotes?:number, totalComments?:number}} deltas
 */
async function adjustPersonStats(personId, deltas) {
  const inc = {};
  if (deltas.postsCount) inc['stats.postsCount'] = deltas.postsCount;
  if (deltas.totalVotes) inc['stats.totalVotes'] = deltas.totalVotes;
  if (deltas.totalComments) inc['stats.totalComments'] = deltas.totalComments;
  if (Object.keys(inc).length === 0) return;
  await Person.updateOne({ _id: personId }, { $inc: inc });
}

/**
 * Lists/searches people with optional text query, state/city filters, and
 * cursor pagination sorted by stats.totalVotes desc then _id desc.
 */
async function listPeople({ q, state, city, cursor, limit }) {
  const lim = parseLimit(limit);
  const filter = {};
  if (q) filter.$text = { $search: q };
  if (state) filter['location.state'] = new RegExp(`^${escapeRegex(state)}$`, 'i');
  if (city) filter['location.city'] = new RegExp(`^${escapeRegex(city)}$`, 'i');

  const decoded = decodeCursor(cursor);
  if (decoded) {
    filter.$or = [
      { 'stats.totalVotes': { $lt: decoded.v } },
      { 'stats.totalVotes': decoded.v, _id: { $lt: decoded.id } },
    ];
  }

  const people = await Person.find(filter)
    .sort({ 'stats.totalVotes': -1, _id: -1 })
    .limit(lim + 1)
    .lean();

  const hasMore = people.length > lim;
  const page = hasMore ? people.slice(0, lim) : people;
  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1].stats.totalVotes, page[page.length - 1]._id)
      : null;

  return { items: page, nextCursor };
}

/**
 * Fetches a Person by Mongo ObjectId or by its human-readable `slug`,
 * whichever the caller supplies (routes accept both for SEO-friendly URLs).
 */
async function getPersonById(idOrSlug) {
  const filter = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  return Person.findOne(filter).lean();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { findOrCreatePerson, adjustPersonStats, listPeople, getPersonById };
