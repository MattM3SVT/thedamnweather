import { geocodeLocation } from './api.js';
import { saveLastLocation, getLastLocation } from './cache.js';

/**
 * Attempt browser geolocation
 * Returns { lat, lon } or throws
 */
export function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      (err) => {
        reject(new Error(err.code === 1 ? 'Location permission denied' : 'Could not determine location'));
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  });
}

/**
 * Reverse geocode coordinates to a city name using BigDataCloud free API
 * No API key required, no signup needed
 */
export async function reverseGeocode(lat, lon) {
  // First, get the correct timezone from Open-Meteo (quick lightweight call)
  let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  try {
    const tzCtrl = new AbortController();
    const tzTimeout = setTimeout(() => tzCtrl.abort(), 10000);
    const tzResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=1`,
      { signal: tzCtrl.signal }
    );
    clearTimeout(tzTimeout);
    if (tzResponse.ok) {
      const tzData = await tzResponse.json();
      if (tzData.timezone) timezone = tzData.timezone;
    }
  } catch {
    // Keep browser timezone as fallback
  }

  // Get the city name from BigDataCloud
  try {
    const geoCtrl = new AbortController();
    const geoTimeout = setTimeout(() => geoCtrl.abort(), 10000);
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: geoCtrl.signal }
    );
    clearTimeout(geoTimeout);
    if (response.ok) {
      const data = await response.json();
      const city = data.city || data.locality || data.principalSubdivision || '';
      const state = data.principalSubdivision || '';
      const displayState = (state && state !== city) ? state : '';
      if (city) {
        return {
          name: city,
          state: displayState,
          country: data.countryName || '',
          lat,
          lon,
          timezone,
        };
      }
    }
  } catch {
    // Fall through to coordinates
  }

  // Last resort: show coordinates
  return {
    name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
    state: '',
    country: '',
    lat,
    lon,
    timezone,
  };
}

/**
 * Search for a location by query (zip code or city name)
 * Returns array of location results
 */
export async function searchLocation(query) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return geocodeLocation(trimmed);
}

/**
 * Save a location as the last used
 */
export function rememberLocation(location) {
  saveLastLocation(location);
}

/**
 * Get the previously used location
 */
export function getRememberedLocation() {
  return getLastLocation();
}
