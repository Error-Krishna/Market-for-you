const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../../models/User');

const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter Plan',
    tier: 'starter',
    monthlyCredits: 500,
    pricePaise: 49900,
    priceINR: 499,
    currency: 'INR',
    features: [
      '500 generation credits / month',
      'Multi-platform publishing (Instagram, X, LinkedIn, Email)',
      'Brand profile intelligence',
      'Standard email support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    tier: 'pro',
    monthlyCredits: 2500,
    pricePaise: 149900,
    priceINR: 1499,
    currency: 'INR',
    popular: true,
    features: [
      '2,500 generation credits / month',
      'AI + ML Data-Backed Recommendations',
      'Multi-slide Instagram Carousel generation',
      'Schedule queue & priority publishing',
      'Multi-account platform connectivity',
      'Priority 24/7 support',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Plan',
    tier: 'enterprise',
    monthlyCredits: 10000,
    pricePaise: 499900,
    priceINR: 4999,
    currency: 'INR',
    features: [
      '10,000 generation credits / month',
      'Custom Brand Voice & Tone Persona',
      'Dedicated media storage & CDN assets',
      'High-concurrency API throughput',
      'Early access to new platform models',
      'Dedicated account manager',
    ],
  },
};

function resolvePlan(identifier) {
  if (!identifier || typeof identifier !== 'string') return null;
  const key = identifier.trim().toLowerCase();
  if (PLANS[key]) return PLANS[key];
  if (key === 'basic') return PLANS.starter;
  return null;
}

const _getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const getPlans = async (_req, res) => {
  return res.status(200).json({
    success: true,
    data: Object.values(PLANS),
  });
};

const getSubscription = async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const sub = user.subscription || {};
    const planKey = (sub.plan || 'starter').toLowerCase();
    const planObj = PLANS[planKey] || null;

    return res.status(200).json({
      success: true,
      data: {
        status: sub.status || (user.isPremium ? 'active' : 'free'),
        plan: sub.plan || (user.isPremium ? 'pro' : 'free'),
        planDetails: planObj,
        startDate: sub.startDate || user.createdAt,
        isPremium: Boolean(user.isPremium || sub.status === 'active'),
        credits: {
          monthly: user.credits?.monthly || 100,
          used: user.credits?.used || 0,
          remaining: Math.max(0, (user.credits?.monthly || 100) - (user.credits?.used || 0)),
        },
      },
    });
  } catch (error) {
    console.error('getSubscription error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve subscription' });
  }
};

const createOrder = async (req, res) => {
  try {
    const razorpay = _getRazorpayInstance();
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment service is not configured on this server.',
      });
    }

    const { plan, planId, planName, amount: rawAmount, currency: rawCurrency } = req.body || {};
    const userId = req.user?.id || 'anonymous';

    // Authoritative plan resolution
    const requestedPlan = resolvePlan(planId || plan || planName);
    const amountPaise = typeof rawAmount === 'number' && rawAmount > 0
      ? Math.round(rawAmount * 100)
      : (requestedPlan ? requestedPlan.pricePaise : 49900);
    const currency = rawCurrency || requestedPlan?.currency || 'INR';
    const planLabel = requestedPlan ? requestedPlan.name : (planName || 'Custom');

    const options = {
      amount: amountPaise,
      currency,
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      notes: {
        userId,
        plan: requestedPlan ? requestedPlan.id : planLabel,
      },
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan: requestedPlan ? requestedPlan.id : planLabel,
    });
  } catch (error) {
    console.error('Razorpay Order Error:', error.message || error);
    return res.status(500).json({ success: false, message: 'Could not create order' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      orderId,
      razorpay_payment_id,
      paymentId,
      razorpay_signature,
      signature,
      userId: bodyUserId,
      planId,
      planName,
      plan: legacyPlan,
    } = req.body || {};

    const effectiveOrderId = razorpay_order_id || orderId;
    const effectivePaymentId = razorpay_payment_id || paymentId;
    const effectiveSignature = razorpay_signature || signature;
    const targetUserId = req.user?.id || bodyUserId;

    if (!effectiveOrderId || !effectivePaymentId || !effectiveSignature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification credentials' });
    }

    const bodyString = `${effectiveOrderId}|${effectivePaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(bodyString)
      .digest('hex');

    let isAuthentic = false;
    try {
      if (typeof expectedSignature === 'string' && typeof effectiveSignature === 'string'
          && expectedSignature.length === effectiveSignature.length) {
        isAuthentic = crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'utf8'),
          Buffer.from(effectiveSignature, 'utf8')
        );
      }
    } catch {
      isAuthentic = false;
    }

    if (!isAuthentic) {
      return res.status(400).json({ success: false, message: 'Invalid Signature' });
    }

    const resolvedPlanObj = resolvePlan(planId || planName || legacyPlan) || PLANS.pro;

    if (targetUserId) {
      try {
        await User.findByIdAndUpdate(targetUserId, {
          $set: {
            isPremium: true,
            'credits.monthly': resolvedPlanObj.monthlyCredits,
            'credits.used': 0,
            subscription: {
              status: 'active',
              plan: resolvedPlanObj.id,
              startDate: new Date(),
              paymentId: effectivePaymentId,
            },
          },
        });
      } catch (err) {
        console.error('Failed to update user subscription record:', err.message);
      }
    }

    return res.json({
      success: true,
      message: 'Payment verified successfully',
      subscription: {
        status: 'active',
        plan: resolvedPlanObj.id,
        startDate: new Date().toISOString(),
        monthlyCredits: resolvedPlanObj.monthlyCredits,
      },
    });
  } catch (error) {
    console.error('Verification Error:', error.message || error);
    return res.status(500).json({ success: false, message: 'Server Error during verification' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPlans,
  getSubscription,
  PLANS,
};
