const express = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const postRoutes = require('./post.routes');
const personRoutes = require('./person.routes');
const commentRoutes = require('./comment.routes');
const voteRoutes = require('./vote.routes');
const searchRoutes = require('./search.routes');
const leaderboardRoutes = require('./leaderboard.routes');
const mapRoutes = require('./map.routes');
const reportRoutes = require('./report.routes');
const mediaRoutes = require('./media.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/people', personRoutes);
router.use('/comments', commentRoutes);
router.use('/votes', voteRoutes);
router.use('/search', searchRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/map', mapRoutes);
router.use('/reports', reportRoutes);
router.use('/media', mediaRoutes);

module.exports = router;
