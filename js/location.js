import { geocodeLocation } from './api.js';
import { isZipCode } from './utils.js';
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
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (response.ok) {
      const data = await response.json();
      const city = data.city || data.locality || data.principalSubdivision || '';
      const state = data.principalSubdivision || '';
      // Avoid showing the same thing twice (e.g. city = "Washington", state = "Washington")
      const displayState = (state && state !== city) ? state : '';
      if (city) {
        return {
          name: city,
          state: displayState,
          country: data.countryName || '',
          lat,
          lon,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
        };
      }
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: try Open-Meteo geocoding with a nearby search
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${lat.toFixed(1)},${lon.toFixed(1)}&count=1&language=en`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return {
          name: data.results[0].name,
          state: data.results[0].admin1 || '',
          country: data.results[0].country || '',
          lat,
          lon,
          timezone: data.results[0].timezone || 'America/New_York',
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
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
  };
}

/**
 * Search for a location by query (zip code or city name)
 * Returns array of location results
 */
export async function searchLocation(query) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (isZipCode(trimmed)) {
    return geocodeLocation(trimmed);
  }

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
