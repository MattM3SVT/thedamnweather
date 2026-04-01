const WEATHER_TTL = 15 * 60 * 1000;     // 15 minutes
const GEOCODE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get item from cache, returns null if expired or missing
 */
export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, expiry } = JSON.parse(raw);
    if (expiry && Date.now() > expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Set item in cache with TTL
 */
export function cacheSet(key, data, ttl) {
  try {
    const entry = {
      data,
      expiry: ttl ? Date.now() + ttl : null,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/**
 * Remove item from cache
 */
export function cacheRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Cache weather data for a location
 */
export function cacheWeather(lat, lon, data) {
  const key = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  cacheSet(key, data, WEATHER_TTL);
}

/**
 * Get cached weather data
 */
export function getCachedWeather(lat, lon) {
  const key = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  return cacheGet(key);
}

/**
 * Cache geocoding result
 */
export function cacheGeocode(query, data) {
  const key = `geocode_${query.toLowerCase().trim()}`;
  cacheSet(key, data, GEOCODE_TTL);
}

/**
 * Get cached geocoding result
 */
export function getCachedGeocode(query) {
  const key = `geocode_${query.toLowerCase().trim()}`;
  return cacheGet(key);
}

/**
 * Save last used location (no expiry)
 */
export function saveLastLocation(location) {
  cacheSet('last_location', location, null);
}

/**
 * Get last used location
 */
export function getLastLocation() {
  return cacheGet('last_location');
}

/**
 * Clean up expired cache entries
 */
export function cleanupCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('weather_') || key.startsWith('geocode_'))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const { expiry } = JSON.parse(raw);
          if (expiry && Date.now() > expiry) {
            keysToRemove.push(key);
          }
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}
