const router = require('express').Router();

const unavailable = (feature) => (req, res) => res.status(403).json({
  success: false,
  code: 'FEATURE_DISABLED',
  message: `${feature} is unavailable in this MVP.`,
});

router.use(['/user/payment', '/payments'], unavailable('Payments and subscriptions'));

module.exports = router;
