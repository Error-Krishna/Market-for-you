const bcrypt = require('bcrypt');
const User = require('../../models/User');

const text = (value, fallback = '') => typeof value === 'string' ? value.trim() : fallback;

// GET /api/v1/auth/settings
async function getSettings(req, res) {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const bp = user.brandProfile || {};
    const audience = typeof bp.targetAudience === 'string'
      ? bp.targetAudience
      : (bp.targetAudience?.description || '');

    const monthlyCredits = Number.isFinite(user.credits?.monthly) ? user.credits.monthly : 100;
    const usedCredits = Number.isFinite(user.credits?.used) ? user.credits.used : 0;
    const remainingCredits = Math.max(0, monthlyCredits - usedCredits);

    return res.status(200).json({
      success: true,
      data: {
        profile: {
          id: String(user._id),
          name: text(user.name),
          email: text(user.email),
          joinedAt: user.createdAt ? user.createdAt.toISOString() : undefined,
        },
        brand: {
          companyName: text(bp.companyName),
          industry: text(bp.industry),
          description: text(bp.description || bp.uvp),
          uvp: text(bp.uvp),
          targetAudience: text(audience),
          marketingGoal: text(bp.marketingGoal),
          brandVoice: {
            tone: text(bp.brandVoice?.tone, 'Professional'),
            description: text(bp.brandVoice?.description),
          },
          platforms: Array.isArray(bp.platforms) ? bp.platforms : [],
          timezone: text(user.timezone, 'UTC'),
        },
        appearance: {
          theme: user.settings?.theme || 'system',
        },
        notifications: {
          emailAlerts: user.settings?.notifications?.emailAlerts ?? true,
          weeklyDigest: user.settings?.notifications?.weeklyDigest ?? false,
        },
        billing: {
          status: user.subscription?.status || (user.isPremium ? 'active' : 'free'),
          plan: user.subscription?.plan || (user.isPremium ? 'pro' : 'free'),
          startDate: user.subscription?.startDate || user.createdAt,
          isPremium: Boolean(user.isPremium || user.subscription?.status === 'active'),
        },
        credits: {
          monthly: monthlyCredits,
          used: usedCredits,
          remaining: remainingCredits,
        },
      },
    });
  } catch (error) {
    console.error('getSettings error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve settings' });
  }
}

// PUT /api/v1/auth/profile
async function updateProfile(req, res) {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { name, appearance, notifications } = req.body || {};
  const update = {};

  if (typeof name === 'string') {
    update.name = name.trim().slice(0, 100);
  }

  if (appearance?.theme && ['light', 'dark', 'system'].includes(appearance.theme)) {
    update['settings.theme'] = appearance.theme;
  }

  if (notifications && typeof notifications === 'object') {
    if (typeof notifications.emailAlerts === 'boolean') {
      update['settings.notifications.emailAlerts'] = notifications.emailAlerts;
    }
    if (typeof notifications.weeklyDigest === 'boolean') {
      update['settings.notifications.weeklyDigest'] = notifications.weeklyDigest;
    }
  }

  try {
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: String(updated._id),
        name: text(updated.name),
        email: text(updated.email),
        theme: updated.settings?.theme || 'system',
        notifications: updated.settings?.notifications || { emailAlerts: true, weeklyDigest: false },
      },
    });
  } catch (error) {
    console.error('updateProfile error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
}

// PUT /api/v1/auth/brand
async function updateBrand(req, res) {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const body = req.body || {};
  const update = {};

  if (typeof body.companyName === 'string') update['brandProfile.companyName'] = body.companyName.trim().slice(0, 200);
  if (typeof body.industry === 'string') update['brandProfile.industry'] = body.industry.trim().slice(0, 200);
  if (typeof body.description === 'string') update['brandProfile.description'] = body.description.trim().slice(0, 2000);
  if (typeof body.uvp === 'string') update['brandProfile.uvp'] = body.uvp.trim().slice(0, 2000);
  if (typeof body.targetAudience === 'string') update['brandProfile.targetAudience'] = body.targetAudience.trim().slice(0, 1000);
  if (typeof body.marketingGoal === 'string') update['brandProfile.marketingGoal'] = body.marketingGoal.trim().slice(0, 500);

  if (body.brandVoice && typeof body.brandVoice === 'object') {
    if (typeof body.brandVoice.tone === 'string') {
      update['brandProfile.brandVoice.tone'] = body.brandVoice.tone.trim().slice(0, 100);
    }
    if (typeof body.brandVoice.description === 'string') {
      update['brandProfile.brandVoice.description'] = body.brandVoice.description.trim().slice(0, 1000);
    }
  }

  const allowedPlatforms = new Set(['twitter', 'linkedin', 'instagram', 'facebook', 'email', 'blog']);
  if (Array.isArray(body.platforms)) {
    update['brandProfile.platforms'] = [...new Set(body.platforms.filter(p => allowedPlatforms.has(p)))];
  }

  if (typeof body.timezone === 'string' && body.timezone.trim()) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: body.timezone.trim() });
      update.timezone = body.timezone.trim();
    } catch {
      // Ignore invalid timezone
    }
  }

  try {
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const bp = updated.brandProfile || {};
    return res.status(200).json({
      success: true,
      message: 'Brand settings updated successfully',
      data: {
        companyName: text(bp.companyName),
        industry: text(bp.industry),
        description: text(bp.description),
        uvp: text(bp.uvp),
        targetAudience: text(bp.targetAudience),
        marketingGoal: text(bp.marketingGoal),
        brandVoice: bp.brandVoice,
        platforms: bp.platforms,
        timezone: text(updated.timezone, 'UTC'),
      },
    });
  } catch (error) {
    console.error('updateBrand error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update brand settings' });
  }
}

// POST /api/v1/auth/password/change
async function changePassword(req, res) {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || typeof currentPassword !== 'string') {
    return res.status(400).json({ success: false, message: 'Current password is required' });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 10 characters long and at most 72 UTF-8 bytes.',
    });
  }

  if (Buffer.byteLength(newPassword, 'utf8') > 72) {
    return res.status(400).json({
      success: false,
      message: 'Password cannot exceed 72 bytes.',
    });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    const saltRounds = 12;
    const newHash = await bcrypt.hash(newPassword, saltRounds);

    await User.findByIdAndUpdate(req.user.id, { $set: { password: newHash } });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('changePassword error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to change password' });
  }
}

module.exports = {
  getSettings,
  updateProfile,
  updateBrand,
  changePassword,
};
