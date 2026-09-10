const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * Clamps a client-supplied limit query param into [1, MAX_LIMIT], defaulting
 * to DEFAULT_LIMIT when absent/invalid.
 * @param {any} rawLimit
 * @returns {number}
 */
function parseLimit(rawLimit) {
  const n = parseInt(rawLimit, 10);
  if (Number.isNaN(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

/**
 * Encodes a cursor from a sort field value + _id into an opaque base64 string.
 * @param {any} sortValue - value of the field results are sorted by (Date, Number, etc.)
 * @param {any} id - the document's _id
 */
function encodeCursor(sortValue, id) {
  const payload = JSON.stringify({
    v: sortValue instanceof Date ? sortValue.toISOString() : sortValue,
    id: id.toString(),
  });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

/**
 * Decodes a cursor produced by encodeCursor. Returns null if malformed
 * (callers should treat a bad cursor as "start from the beginning").
 */
function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (payload && typeof payload.id === 'string') return payload;
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = { parseLimit, encodeCursor, decodeCursor, DEFAULT_LIMIT, MAX_LIMIT };
