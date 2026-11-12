const socialRouter = require('express').Router();
const auth = require('../../../middleware/auth');
const {
  getSocialStatus,
  updateTimezone,
  initTwitterConnect,
  twitterCallback,
  initLinkedInConnect,
  linkedinCallback,
  initInstagramConnect,
  instagramCallback,
  initFacebookConnect,
  facebookCallback,
  selectFacebookPage,
  connectEmailAccount,
  connectBlogAccount,
  disconnectPlatform,
} = require('../../../controllers/connectAccount/socialConnectController');

socialRouter.get('/social/status', auth, getSocialStatus);
socialRouter.put('/social/timezone', auth, updateTimezone);

socialRouter.get('/social/twitter/connect', auth, initTwitterConnect);
socialRouter.get('/social/twitter/callback', twitterCallback);

socialRouter.get('/social/linkedin/connect', auth, initLinkedInConnect);
socialRouter.get('/social/linkedin/callback', linkedinCallback);

socialRouter.get('/social/instagram/connect', auth, initInstagramConnect);
socialRouter.get('/social/instagram/callback', instagramCallback);
socialRouter.get('/instagram/login', auth, initInstagramConnect);
socialRouter.get('/instagram/callback', instagramCallback);

socialRouter.get('/social/facebook/connect', auth, initFacebookConnect);
socialRouter.get('/social/facebook/callback', facebookCallback);
socialRouter.post('/social/facebook/select-page', auth, selectFacebookPage);

socialRouter.post('/social/email/connect', auth, connectEmailAccount);
socialRouter.post('/social/blog/connect', auth, connectBlogAccount);

socialRouter.delete('/social/:platform', auth, disconnectPlatform);

module.exports = socialRouter;
