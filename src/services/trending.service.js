/**
 * Computes a time-decayed trending score from a post's current voteScore and
 * age. Newer posts with the same voteScore rank higher than older ones, and
 * the ranking gently decays as a post ages — a lightweight "hot" algorithm
 * (similar in spirit to Reddit/HackerNews decay formulas).
 *
 * score = voteScore / (ageInHours + 2) ^ 1.5
 *
 * The "+2" keeps very fresh posts (age ~0) from producing a huge divide-by-
 * near-zero score, and the 1.5 exponent controls how fast old posts fade.
 *
 * @param {number} voteScore
 * @param {Date|string} createdAt
 * @returns {number}
 */
function computeTrendingScore(voteScore, createdAt) {
  const createdMs = new Date(createdAt).getTime();
  const ageInHours = Math.max(0, (Date.now() - createdMs) / (1000 * 60 * 60));
  const denominator = Math.pow(ageInHours + 2, 1.5);
  return voteScore / denominator;
}

module.exports = { computeTrendingScore };
