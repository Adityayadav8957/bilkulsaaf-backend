const express = require('express');
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/me', requireAuth, userController.getMyProfile);
router.get('/me/posts', requireAuth, userController.getMyPosts);
router.get('/me/comments', requireAuth, userController.getMyComments);
router.get('/me/saved-posts', requireAuth, userController.getMySavedPosts);
router.get('/me/activity', requireAuth, userController.getMyActivity);
router.get('/anonymous/:number', userController.getPublicAnonymousProfile);

module.exports = router;
