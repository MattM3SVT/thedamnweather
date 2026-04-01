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
 * Reverse geocode coordinates to a location name using Open-Meteo
 * Since Open-Meteo doesn't have reverse geocoding, we use a nearby city search
 */
export async function reverseGeocode(lat, lon) {
  // Use Open-Meteo geocoding with coordinates formatted as a search
  // This is a workaround - search for nearby location
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
          lat: data.results[0].latitude,
          lon: data.results[0].longitude,
          timezone: data.results[0].timezone || 'America/New_York',
        };
      }
    }
  } catch {
    // Fall through to default
  }

  // Fallback: return coordinates as the name
  return {
    name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
    state: '',
    country: '',
    lat,
    lon,
    timezone: 'America/New_York',
  };
}

/**
 * Search for a location by query (zip code or city name)
 * Returns array of location results
 */
export async function searchLocation(query) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // If it's a zip code, search directly
  if (isZipCode(trimmed)) {
    const results = await geocodeLocation(trimmed);
    return results;
  }

  // City name search
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
