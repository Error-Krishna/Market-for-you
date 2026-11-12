const postsRouter = require('express').Router();
const auth = require('../../../middleware/auth');
const isOnboarded = require('../../../middleware/isOnboarded');
const {
  createPost,
  listPosts,
  getPost,
  updatePost,
  publishPostNow,
  retryFailedPlatforms,
  cancelPost,
  deletePost,
} = require('../../../controllers/content/scheduleController');

postsRouter.post('/', auth, isOnboarded, createPost);
postsRouter.get('/', auth, isOnboarded, listPosts);
postsRouter.get('/:id', auth, isOnboarded, getPost);
postsRouter.put('/:id', auth, isOnboarded, updatePost);
postsRouter.post('/:id/publish-now', auth, isOnboarded, publishPostNow);
postsRouter.post('/:id/retry', auth, isOnboarded, retryFailedPlatforms);
postsRouter.post('/:id/cancel', auth, isOnboarded, cancelPost);
postsRouter.delete('/:id', auth, isOnboarded, deletePost);

module.exports = postsRouter;
