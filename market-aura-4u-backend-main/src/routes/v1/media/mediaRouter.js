const mediaRouter = require('express').Router();
const auth = require('../../../middleware/auth');
const isOnboarded = require('../../../middleware/isOnboarded');
const {
  listMedia,
  createMedia,
  updateMedia,
  deleteMedia,
} = require('../../../controllers/media/mediaController');

mediaRouter.get('/', auth, isOnboarded, listMedia);
mediaRouter.post('/', auth, isOnboarded, createMedia);
mediaRouter.put('/:id', auth, isOnboarded, updateMedia);
mediaRouter.delete('/:id', auth, isOnboarded, deleteMedia);

module.exports = mediaRouter;
