const v1Router = require('express').Router();
const authRouter = require('./auth/authRouter');
const contentRouter = require('./content/contentRouter');
const postsRouter = require('./content/postsRouter');
const mediaRouter = require('./media/mediaRouter');
const socialRouter = require('./social/socialRouter');
const paymentRouter = require('./payments/paymentRouter');
const settingsRouter = require('./settings/settingsRouter');
const disabledFeaturesRouter = require('./disabledFeaturesRouter');

v1Router.use(disabledFeaturesRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/auth', socialRouter);
v1Router.use('/settings', settingsRouter);
v1Router.use('/content', contentRouter);
v1Router.use('/posts', postsRouter);
v1Router.use('/media', mediaRouter);
v1Router.use('/user', paymentRouter);
v1Router.use('/payments', paymentRouter);
v1Router.use('/billing', paymentRouter);

module.exports = v1Router;
