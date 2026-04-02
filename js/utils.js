// WMO Weather Code to internal condition tag mapping
const WMO_MAP = {
  0: 'clear',
  1: 'clear',
  2: 'partly-cloudy',
  3: 'cloudy',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  53: 'drizzle',
  55: 'drizzle',
  56: 'freezing-rain',
  57: 'freezing-rain',
  61: 'rain',
  63: 'rain',
  65: 'heavy-rain',
  66: 'freezing-rain',
  67: 'freezing-rain',
  71: 'snow',
  73: 'snow',
  75: 'heavy-snow',
  77: 'snow',
  80: 'rain',
  81: 'rain',
  82: 'heavy-rain',
  85: 'snow',
  86: 'heavy-snow',
  95: 'thunderstorm',
  96: 'thunderstorm',
  99: 'thunderstorm',
};

// Human-readable labels for WMO codes
const WMO_LABELS = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Freezing fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Moderate showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm',
};

// Icon file mapping (condition tag + day/night → filename)
const ICON_MAP = {
  'clear-day': 'clear-day.svg',
  'clear-night': 'clear-night.svg',
  'partly-cloudy-day': 'partly-cloudy-day.svg',
  'partly-cloudy-night': 'partly-cloudy-night.svg',
  'cloudy': 'cloudy.svg',
  'fog': 'fog.svg',
  'drizzle': 'drizzle.svg',
  'rain': 'rain.svg',
  'heavy-rain': 'rain.svg',
  'freezing-rain': 'sleet.svg',
  'snow': 'snow.svg',
  'heavy-snow': 'snow.svg',
  'thunderstorm': 'thunderstorms.svg',
  'wind': 'wind.svg',
};

/**
 * Get the condition tag from a WMO code, optionally considering wind speed
 */
export function getConditionTag(wmoCode, windSpeed = 0) {
  if (windSpeed > 25) {
    const baseCondition = WMO_MAP[wmoCode] || 'clear';
    // Wind overrides only clear/partly-cloudy/cloudy
    if (['clear', 'partly-cloudy', 'cloudy'].includes(baseCondition)) {
      return 'wind';
    }
  }
  return WMO_MAP[wmoCode] || 'clear';
}

/**
 * Get human-readable condition label
 */
export function getConditionLabel(wmoCode) {
  return WMO_LABELS[wmoCode] || 'Unknown';
}

/**
 * Get icon path for a condition
 */
export function getIconPath(conditionTag, isDay = true) {
  // Conditions with day/night variants
  if (conditionTag === 'clear' || conditionTag === 'partly-cloudy') {
    const key = `${conditionTag}-${isDay ? 'day' : 'night'}`;
    return `assets/icons/${ICON_MAP[key]}`;
  }
  return `assets/icons/${ICON_MAP[conditionTag] || 'cloudy.svg'}`;
}

/**
 * Get temperature range tag
 */
export function getTempRange(tempF) {
  if (tempF < 0) return 'extreme-cold';
  if (tempF <= 32) return 'cold';
  if (tempF <= 50) return 'cool';
  if (tempF <= 65) return 'mild';
  if (tempF <= 80) return 'warm';
  if (tempF <= 95) return 'hot';
  return 'extreme-hot';
}

/**
 * Format temperature as integer
 */
export function formatTemp(temp) {
  return Math.round(temp);
}

/**
 * Get wind direction as compass text
 */
export function getWindDirection(degrees) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return dirs[index];
}

/**
 * Get UV index severity label
 */
export function getUVLevel(uv) {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

/**
 * Get humidity description
 */
export function getHumidityDesc(humidity) {
  if (humidity < 30) return 'Dry';
  if (humidity < 60) return 'Comfortable';
  if (humidity < 80) return 'Humid';
  return 'Very humid';
}

/**
 * Format time string from ISO date
 */
export function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Format hour label (e.g., "3 PM")
 * Uses location timezone so "Now" is correct regardless of user's local timezone
 */
export function formatHour(isoString, timezone) {
  const date = new Date(isoString);
  if (timezone) {
    // Compare using the location's timezone, not the user's browser timezone
    const nowStr = new Date().toLocaleString('en-US', { timeZone: timezone });
    const nowInTZ = new Date(nowStr);
    if (date.getHours() === nowInTZ.getHours() && date.toDateString() === nowInTZ.toDateString()) {
      return 'Now';
    }
  } else {
    const now = new Date();
    if (date.getHours() === now.getHours() && date.toDateString() === now.toDateString()) {
      return 'Now';
    }
  }
  return date.toLocaleTimeString('en-US', { hour: 'numeric' });
}

/**
 * Format day label (e.g., "Mon", "Today")
 */
export function formatDay(isoString, index) {
  if (index === 0) return 'Today';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Format short date (e.g., "Apr 1")
 */
export function formatShortDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Check if a zip code string is valid (5 digits)
 */
export function isZipCode(str) {
  return /^\d{5}$/.test(str.trim());
}

/**
 * Get current local time string for a timezone
 */
export function getCurrentTime(timezone) {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
