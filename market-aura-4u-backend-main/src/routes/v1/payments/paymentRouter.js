const express = require('express');
const paymentRouter = express.Router();
const verify = require('../../../middleware/auth');
const {
  createOrder,
  verifyPayment,
  getPlans,
  getSubscription,
} = require('../../../controllers/payments/paymentController');

paymentRouter.get('/plans', getPlans);
paymentRouter.get('/subscription', verify, getSubscription);
paymentRouter.post('/payment/create-order', verify, createOrder);
paymentRouter.post('/payment/verify', verify, verifyPayment);
paymentRouter.post('/create-order', verify, createOrder);
paymentRouter.post('/verify', verify, verifyPayment);

module.exports = paymentRouter;
