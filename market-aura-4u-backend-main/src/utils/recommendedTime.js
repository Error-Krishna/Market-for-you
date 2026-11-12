const DAYS_OF_WEEK = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

function parseStringWindow(raw) {
  const match = String(raw || '')
    .trim()
    .match(/^(sunday|sun|monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat)\b.*?(\d{1,2}):(\d{2})/i);
  if (!match) return null;
  return {
    day: match[1].toLowerCase(),
    hours: Number(match[2]),
    minutes: Number(match[3]),
  };
}

/**
 * Computes the next upcoming UTC Date matching an ML recommendation posting window
 * such as { day: "Thursday", start: "06:00", end: "07:00", timezone: "UTC" } or
 * "Thursday 06:00-07:00 UTC". Falls back to 1 hour from `now` if unstructured.
 */
function computeNextRecommendedDate(recommendedPostingTime, now = new Date()) {
  let dayName = '';
  let hours = NaN;
  let minutes = NaN;

  if (typeof recommendedPostingTime === 'string') {
    const parsed = parseStringWindow(recommendedPostingTime);
    if (parsed) {
      dayName = parsed.day;
      hours = parsed.hours;
      minutes = parsed.minutes;
    }
  } else if (recommendedPostingTime && typeof recommendedPostingTime === 'object') {
    dayName = String(recommendedPostingTime.day || '').trim().toLowerCase();
    const startMatch = String(recommendedPostingTime.start || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (startMatch) {
      hours = Number(startMatch[1]);
      minutes = Number(startMatch[2]);
    }
  }

  const targetDay = DAYS_OF_WEEK[dayName];
  if (
    targetDay === undefined
    || !Number.isInteger(hours)
    || hours < 0
    || hours > 23
    || !Number.isInteger(minutes)
    || minutes < 0
    || minutes > 59
  ) {
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  const candidate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    hours,
    minutes,
    0,
    0,
  ));

  const currentDay = now.getUTCDay();
  const daysAhead = (targetDay - currentDay + 7) % 7;
  candidate.setUTCDate(candidate.getUTCDate() + daysAhead);

  // If the target slot today has already passed (or is within the next 2 minutes), advance 1 week.
  if (candidate.getTime() <= now.getTime() + 2 * 60 * 1000) {
    candidate.setUTCDate(candidate.getUTCDate() + 7);
  }

  return candidate;
}

module.exports = { computeNextRecommendedDate };
