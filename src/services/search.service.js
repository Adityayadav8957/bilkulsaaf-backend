const Post = require('../models/Post');
const Person = require('../models/Person');

const RESULT_LIMIT = 20;

/**
 * Full-text search across Posts (text index on description + personSnapshot
 * name/organization) and People (text index on name/organization/designation).
 * Returns grouped results: posts, people, and distinct organizations/locations
 * pulled from the matched people/posts for lightweight facet-style browsing.
 *
 * @param {string} q - search query
 * @param {{type?: 'all'|'posts'|'people'}} filters
 */
async function searchAll(q, filters = {}) {
  const type = filters.type || 'all';
  const trimmed = (q || '').trim();
  if (!trimmed) {
    return { posts: [], people: [], organizations: [], locations: [] };
  }

  const [posts, people] = await Promise.all([
    type === 'people'
      ? []
      : Post.find({ $text: { $search: trimmed }, status: 'active' })
          .select({ score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .limit(RESULT_LIMIT)
          .populate('author', 'anonymousIdentity')
          .lean(),
    type === 'posts'
      ? []
      : Person.find({ $text: { $search: trimmed } })
          .select({ score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .limit(RESULT_LIMIT)
          .lean(),
  ]);

  const organizations = [
    ...new Set(
      [...people.map((p) => p.organization), ...posts.map((p) => p.personSnapshot.organization)].filter(
        Boolean
      )
    ),
  ].slice(0, RESULT_LIMIT);

  const locations = [
    ...new Set(
      [
        ...people.map((p) => [p.location.state, p.location.city].filter(Boolean).join(', ')),
        ...posts.map((p) =>
          [p.personSnapshot.state, p.personSnapshot.city].filter(Boolean).join(', ')
        ),
      ].filter(Boolean)
    ),
  ].slice(0, RESULT_LIMIT);

  return { posts, people, organizations, locations };
}

module.exports = { searchAll };
