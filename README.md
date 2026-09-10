# Not So Corrupt — Backend API

A satirical, public-accountability social platform: users create private accounts but every
public action (posts, comments, votes) is attributed only to an auto-generated, immutable
anonymous identity ("Anonymous Citizen #48291"). Real account details (email, password hash,
account id) are never exposed on any public-facing response.

## Setup

```bash
cp .env.example .env
# fill in MONGODB_URI, JWT_SECRET, AWS_* (S3), CLIENT_ORIGIN, etc.

npm install
npm run dev   # nodemon, auto-restarts on change
# or
npm start     # plain node
```

Requires a running MongoDB instance (local or Atlas) reachable at `MONGODB_URI`. The server
listens on `PORT` (default 5000) and exposes all routes under `/api/*`, plus a `GET /health`
check.

## Architecture overview

The app follows a strict layered structure under `src/`: `routes/` only wire an HTTP path,
middleware chain, and controller function; `controllers/` parse the request and shape the
response envelope but contain no business logic; all business rules, database writes, and
denormalized-counter bookkeeping live in `services/`; and `models/` are pure Mongoose schemas
with their indexes. Authentication is a stateless JWT stored in an httpOnly `token` cookie
(no session store) — `middleware/auth.middleware.js` provides both a hard `requireAuth` gate
and an optional `attachUserIfPresent` that lets public GET endpoints (feed, post, person,
search, leaderboard, map) enrich their response with viewer-specific context (`myVote`,
`isSavedByMe`) when a valid cookie is present, without ever requiring one. Every write path
that touches a unique index (votes, saves, reports, person dedup, email, anonymous identity
number) catches Mongo's duplicate-key error (code 11000) and converts it into a clean 409
`ApiError` instead of crashing. Posts and comments are always returned with their real author
replaced by the anonymous identity only (`utils/shapeAuthor.js`); the underlying account is
never populated beyond that. Trending/leaderboards/map aggregation all read from denormalized
counters maintained on `Post`/`Person` (`voteScore`, `commentCount`, `trendingScore`,
`stats.*`) rather than aggregating raw `Vote`/`Comment` collections on every request, keeping
those endpoints cheap even at scale.
