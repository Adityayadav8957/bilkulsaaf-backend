const sanitizeHtml = require('sanitize-html');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Vote = require('../models/Vote');
const SavedPost = require('../models/SavedPost');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { parseLimit, decodeCursor, encodeCursor } = require('../utils/pagination');
const { toUrlSlug, ensureUniqueSlug } = require('../utils/slug');
const { findOrCreatePerson, adjustPersonStats } = require('./person.service');
const { computeTrendingScore } = require('./trending.service');

const SORT_FIELD_BY_MODE = {
  latest: 'createdAt',
  popular: 'voteScore',
  trending: 'trendingScore',
  discussed: 'commentCount',
};

function sanitizeText(text) {
  return sanitizeHtml(text || '', { allowedTags: [], allowedAttributes: {} }).trim();
}

/**
 * Creates a post: dedupes/creates the referenced Person, denormalizes a
 * personSnapshot onto the post for fast reads, sanitizes free text, and
 * bumps the person's postsCount.
 */
async function createPost(authorId, payload) {
  const { personName, designation, organization, state, city, description, media } = payload;

  const person = await findOrCreatePerson({
    name: personName,
    designation,
    organization,
    state,
    city,
  });

  const slug = await ensureUniqueSlug(Post, toUrlSlug(person.name) || 'report', {
    randomSuffix: true,
  });

  const post = await Post.create({
    author: authorId,
    person: person._id,
    personSnapshot: {
      name: person.name,
      designation: person.designation,
      organization: person.organization,
      state: person.location.state,
      city: person.location.city,
    },
    slug,
    description: sanitizeText(description),
    media: Array.isArray(media) ? media : [],
  });

  await Promise.all([
    adjustPersonStats(person._id, { postsCount: 1 }),
    User.updateOne({ _id: authorId }, { $inc: { postsCount: 1 } }),
  ]);

  return post;
}

/**
 * Fetches a raw (non-lean) Post document by Mongo ObjectId or by its
 * human-readable `slug`, whichever the caller supplies.
 */
async function getPostRawById(idOrSlug) {
  const filter = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  return Post.findOne(filter);
}

/**
 * Fetches a single active post (or the author's/admin's own non-active post)
 * enriched with viewer-specific context when a viewerId is supplied.
 */
async function getPostById(id, viewerId) {
  const post = await getPostRawById(id);
  if (!post || post.status === 'removed') {
    throw ApiError.notFound('Post not found', 'POST_NOT_FOUND');
  }
  await post.populate('author', 'anonymousIdentity');
  const [enriched] = await attachViewerContext([post.toObject()], viewerId);
  return enriched;
}

/**
 * Attaches isSavedByMe / myVote to a list of plain post objects when a
 * viewerId is present. No-op (returns posts unchanged) for guests.
 */
async function attachViewerContext(posts, viewerId) {
  if (!viewerId || posts.length === 0) return posts;
  const postIds = posts.map((p) => p._id);
  const [votes, saves] = await Promise.all([
    Vote.find({ post: { $in: postIds }, user: viewerId }).lean(),
    SavedPost.find({ post: { $in: postIds }, user: viewerId }).lean(),
  ]);
  const voteByPost = new Map(votes.map((v) => [v.post.toString(), v.value]));
  const savedSet = new Set(saves.map((s) => s.post.toString()));
  return posts.map((p) => ({
    ...p,
    myVote: voteByPost.get(p._id.toString()) || 0,
    isSavedByMe: savedSet.has(p._id.toString()),
  }));
}

/**
 * Cursor-paginated feed. sort=latest|trending|popular, optional filters by
 * state/city/personId. Only status:'active' posts are ever surfaced here.
 */
async function listFeed({ sort = 'latest', state, city, personId, cursor, limit }, viewerId) {
  const lim = parseLimit(limit);
  const sortField = SORT_FIELD_BY_MODE[sort] || SORT_FIELD_BY_MODE.latest;

  const filter = { status: 'active' };
  if (state) filter['personSnapshot.state'] = new RegExp(`^${escapeRegex(state)}$`, 'i');
  if (city) filter['personSnapshot.city'] = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (personId && mongoose.isValidObjectId(personId)) filter.person = personId;

  const decoded = decodeCursor(cursor);
  if (decoded) {
    const cursorValue = sortField === 'createdAt' ? new Date(decoded.v) : decoded.v;
    filter.$or = [
      { [sortField]: { $lt: cursorValue } },
      { [sortField]: cursorValue, _id: { $lt: decoded.id } },
    ];
  }

  const posts = await Post.find(filter)
    .sort({ [sortField]: -1, _id: -1 })
    .limit(lim + 1)
    .populate('author', 'anonymousIdentity')
    .lean();

  const hasMore = posts.length > lim;
  const page = hasMore ? posts.slice(0, lim) : posts;
  const enriched = await attachViewerContext(page, viewerId);

  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1][sortField], page[page.length - 1]._id)
      : null;

  return { items: enriched, nextCursor };
}

/**
 * Updates editable fields (description, media). Author-only.
 */
async function updatePost(id, userId, updates) {
  const post = await getPostRawById(id);
  if (!post || post.status === 'removed') {
    throw ApiError.notFound('Post not found', 'POST_NOT_FOUND');
  }
  if (post.author.toString() !== userId) {
    throw ApiError.forbidden('You can only edit your own posts', 'NOT_POST_AUTHOR');
  }
  if (updates.description !== undefined) {
    post.description = sanitizeText(updates.description);
  }
  if (updates.media !== undefined) {
    post.media = updates.media;
  }
  await post.save();
  return post;
}

/**
 * Soft-deletes a post (status='removed'). Author or admin only.
 */
async function deletePost(id, userId, userRole) {
  const post = await getPostRawById(id);
  if (!post || post.status === 'removed') {
    throw ApiError.notFound('Post not found', 'POST_NOT_FOUND');
  }
  const isAuthor = post.author.toString() === userId;
  const isAdmin = userRole === 'admin';
  if (!isAuthor && !isAdmin) {
    throw ApiError.forbidden('You cannot delete this post', 'NOT_ALLOWED');
  }
  post.status = 'removed';
  await post.save();
  return post;
}

/**
 * Saves/unsaves a post for a user, keeping Post.saveCount and
 * User.savedPostsCount in sync. Handles the double-click duplicate-save
 * race via the unique index rather than crashing.
 */
async function savePost(postId, userId) {
  const post = await getPostRawById(postId);
  if (!post || post.status === 'removed') {
    throw ApiError.notFound('Post not found', 'POST_NOT_FOUND');
  }
  try {
    await SavedPost.create({ user: userId, post: postId });
  } catch (err) {
    if (err && err.code === 11000) {
      throw ApiError.conflict('Post already saved', 'ALREADY_SAVED');
    }
    throw err;
  }
  await Promise.all([
    Post.updateOne({ _id: postId }, { $inc: { saveCount: 1 } }),
    User.updateOne({ _id: userId }, { $inc: { savedPostsCount: 1 } }),
  ]);
}

async function unsavePost(postId, userId) {
  const result = await SavedPost.findOneAndDelete({ user: userId, post: postId });
  if (!result) {
    throw ApiError.notFound('Saved post not found', 'NOT_SAVED');
  }
  await Promise.all([
    Post.updateOne({ _id: postId }, { $inc: { saveCount: -1 } }),
    User.updateOne({ _id: userId }, { $inc: { savedPostsCount: -1 } }),
  ]);
}

/**
 * Paginated list of a user's saved posts, most recently saved first,
 * populated with post summaries.
 */
async function listSavedPosts(userId, { cursor, limit }) {
  const lim = parseLimit(limit);
  const filter = { user: userId };
  const decoded = decodeCursor(cursor);
  if (decoded) {
    const cursorValue = new Date(decoded.v);
    filter.$or = [
      { createdAt: { $lt: cursorValue } },
      { createdAt: cursorValue, _id: { $lt: decoded.id } },
    ];
  }

  const saves = await SavedPost.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(lim + 1)
    .populate({ path: 'post', populate: { path: 'author', select: 'anonymousIdentity' } })
    .lean();

  const hasMore = saves.length > lim;
  const page = hasMore ? saves.slice(0, lim) : saves;
  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1].createdAt, page[page.length - 1]._id)
      : null;

  const items = page
    .filter((s) => s.post && s.post.status !== 'removed')
    .map((s) => ({ savedAt: s.createdAt, post: s.post }));

  return { items, nextCursor };
}

/** Cursor-paginated active posts created by one account. */
async function listPostsByAuthor(userId, { cursor, limit }, viewerId) {
  const lim = parseLimit(limit);
  const filter = { author: userId, status: 'active' };
  const decoded = decodeCursor(cursor);
  if (decoded) {
    const cursorValue = new Date(decoded.v);
    filter.$or = [
      { createdAt: { $lt: cursorValue } },
      { createdAt: cursorValue, _id: { $lt: decoded.id } },
    ];
  }

  const posts = await Post.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(lim + 1)
    .populate('author', 'anonymousIdentity')
    .lean();

  const hasMore = posts.length > lim;
  const page = hasMore ? posts.slice(0, lim) : posts;
  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1].createdAt, page[page.length - 1]._id)
      : null;

  return { items: await attachViewerContext(page, viewerId), nextCursor };
}

/**
 * Recomputes and persists a post's trendingScore based on current voteScore.
 * Called by vote.service after any vote count change.
 */
async function refreshTrendingScore(postId) {
  const post = await Post.findById(postId).select('voteScore createdAt');
  if (!post) return;
  post.trendingScore = computeTrendingScore(post.voteScore, post.createdAt);
  await post.save();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  createPost,
  getPostById,
  getPostRawById,
  listFeed,
  updatePost,
  deletePost,
  savePost,
  unsavePost,
  listSavedPosts,
  listPostsByAuthor,
  attachViewerContext,
  refreshTrendingScore,
  sanitizeText,
};
