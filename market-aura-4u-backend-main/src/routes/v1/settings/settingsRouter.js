const express = require('express');
const settingsRouter = express.Router();
const auth = require('../../../middleware/auth');
const {
  getSettings,
  updateProfile,
  updateBrand,
  changePassword,
} = require('../../../controllers/auth/settingsController');

settingsRouter.get('/', auth, getSettings);
settingsRouter.put('/profile', auth, updateProfile);
settingsRouter.put('/brand', auth, updateBrand);
settingsRouter.post('/password/change', auth, changePassword);

module.exports = settingsRouter;
