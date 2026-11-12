const router = require('express').Router();

const unavailable = (feature) => (req, res) => res.status(403).json({
  success: false,
  code: 'FEATURE_DISABLED',
  message: `${feature} is unavailable in this MVP.`,
});

router.use((req, res, next) => {
  if (process.env.CHECKOUT_ENABLED === 'true') {
    return next();
  }
  if (req.path.startsWith('/user/payment') || req.path.startsWith('/payments')) {
    return unavailable('Payments and subscriptions')(req, res);
  }
  return next();
});

module.exports = router;
