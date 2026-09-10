/**
 * Converts a populated User (or lean user object) into the only
 * public-facing representation of an account that is ever allowed to leave
 * the API: its anonymous identity. Never pass through email/passwordHash/id.
 */
function toAnonymousAuthor(userLike) {
  if (!userLike || !userLike.anonymousIdentity) return null;
  return {
    displayName: userLike.anonymousIdentity.displayName,
    number: userLike.anonymousIdentity.number,
  };
}

/**
 * Replaces a lean document's populated `author` field with its anonymous
 * representation. Safe no-op if `author` isn't populated (leaves as-is).
 */
function shapeAuthorField(doc) {
  if (!doc) return doc;
  if (doc.author && typeof doc.author === 'object' && doc.author.anonymousIdentity) {
    return { ...doc, author: toAnonymousAuthor(doc.author) };
  }
  return doc;
}

module.exports = { toAnonymousAuthor, shapeAuthorField };
