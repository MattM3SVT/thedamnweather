import { getConditionTag, getConditionLabel } from './utils.js';
import { cacheWeather, getCachedWeather, cacheGeocode, getCachedGeocode } from './cache.js';

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Geocode a query (zip code or city name) to coordinates
 * Returns array of { name, state, country, lat, lon, timezone }
 */
export async function geocodeLocation(query) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Check cache
  const cached = getCachedGeocode(trimmed);
  if (cached) return cached;

  const params = new URLSearchParams({
    name: trimmed,
    count: '5',
    language: 'en',
    format: 'json',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const response = await fetch(`${GEOCODE_URL}?${params}`, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!response.ok) {
    throw new Error('Failed to geocode location');
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return [];
  }

  const results = data.results.map(r => ({
    name: r.name,
    state: r.admin1 || '',
    country: r.country || '',
    lat: r.latitude,
    lon: r.longitude,
    timezone: r.timezone || 'America/New_York',
  }));

  cacheGeocode(trimmed, results);
  return results;
}

/**
 * Fetch weather data for coordinates
 * Returns normalized weather object with current, hourly, daily
 */
export async function fetchWeather(lat, lon) {
  // Check cache
  const cached = getCachedWeather(lat, lon);
  if (cached) return cached;

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
      'is_day', 'precipitation', 'weather_code', 'cloud_cover',
      'pressure_msl', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'
    ].join(','),
    hourly: [
      'temperature_2m', 'apparent_temperature', 'precipitation_probability',
      'weather_code', 'wind_speed_10m', 'is_day'
    ].join(','),
    daily: [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min',
      'sunrise', 'sunset', 'precipitation_sum',
      'precipitation_probability_max', 'wind_speed_10m_max', 'uv_index_max'
    ].join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
    forecast_days: '10',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const response = await fetch(`${WEATHER_URL}?${params}`, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }

  const raw = await response.json();
  const normalized = normalizeWeatherData(raw);

  cacheWeather(lat, lon, normalized);
  return normalized;
}

/**
 * Normalize raw Open-Meteo response into app-friendly structure
 */
function normalizeWeatherData(raw) {
  const current = {
    temp: raw.current.temperature_2m ?? 0,
    feelsLike: raw.current.apparent_temperature ?? raw.current.temperature_2m ?? 0,
    humidity: raw.current.relative_humidity_2m ?? 0,
    isDay: raw.current.is_day === 1,
    precipitation: raw.current.precipitation ?? 0,
    weatherCode: raw.current.weather_code,
    cloudCover: raw.current.cloud_cover ?? 0,
    pressure: raw.current.pressure_msl ?? 0,
    windSpeed: raw.current.wind_speed_10m ?? 0,
    windDirection: raw.current.wind_direction_10m ?? 0,
    windGusts: raw.current.wind_gusts_10m ?? 0,
    conditionTag: getConditionTag(raw.current.weather_code, raw.current.wind_speed_10m),
    conditionLabel: getConditionLabel(raw.current.weather_code),
  };

  // Filter hourly to remaining hours in the LOCATION's timezone + next 24h
  // Open-Meteo returns times without timezone offset (e.g., "2024-04-02T20:00")
  // which represent the location's local time. We need to compare against
  // the current time in the location's timezone, not the user's browser timezone.
  // Get current hour in location's timezone using Intl (Safari-safe)
  const tz = raw.timezone || 'UTC';
  let nowLocal;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', day: 'numeric', month: 'numeric',
      year: 'numeric', minute: 'numeric', hour12: false,
    });
    const parts = {};
    for (const { type, value } of fmt.formatToParts(new Date())) {
      parts[type] = parseInt(value, 10);
    }
    nowLocal = new Date(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute);
  } catch {
    nowLocal = new Date();
  }

  // Truncate to start of current hour so the current hour block is included
  // (e.g. the 9:00 AM entry stays visible when it's 9:09 AM)
  const nowHourStart = new Date(nowLocal);
  nowHourStart.setMinutes(0, 0, 0);

  const hourly = raw.hourly.time.map((time, i) => ({
    time,
    temp: raw.hourly.temperature_2m[i],
    feelsLike: raw.hourly.apparent_temperature[i],
    precipProb: raw.hourly.precipitation_probability[i],
    weatherCode: raw.hourly.weather_code[i],
    windSpeed: raw.hourly.wind_speed_10m[i],
    isDay: raw.hourly.is_day[i] === 1,
    conditionTag: getConditionTag(raw.hourly.weather_code[i], raw.hourly.wind_speed_10m[i]),
  })).filter(h => {
    const hDate = new Date(h.time);
    return hDate >= nowHourStart;
  }).slice(0, 24);

  // Use the current hour's hourly forecast for hero icon/condition so hero
  // and hourly cards always agree visually. Keep current's real-time temp,
  // wind, humidity, etc. since those are more accurate moment-to-moment.
  const currentHourStr = `${String(nowLocal.getHours()).padStart(2, '0')}:00`;
  const currentHourIdx = raw.hourly.time.findIndex(t => t.endsWith(`T${currentHourStr}`));
  if (currentHourIdx !== -1) {
    current.weatherCode = raw.hourly.weather_code[currentHourIdx];
    current.conditionTag = getConditionTag(current.weatherCode, current.windSpeed);
    current.conditionLabel = getConditionLabel(current.weatherCode);
    current.isDay = raw.hourly.is_day[currentHourIdx] === 1;
  }

  const daily = raw.daily.time.map((time, i) => ({
    time,
    weatherCode: raw.daily.weather_code[i],
    high: raw.daily.temperature_2m_max[i],
    low: raw.daily.temperature_2m_min[i],
    sunrise: raw.daily.sunrise[i],
    sunset: raw.daily.sunset[i],
    precipSum: raw.daily.precipitation_sum[i],
    precipProb: raw.daily.precipitation_probability_max[i],
    windMax: raw.daily.wind_speed_10m_max[i],
    uvMax: raw.daily.uv_index_max[i],
    conditionTag: getConditionTag(raw.daily.weather_code[i]),
    conditionLabel: getConditionLabel(raw.daily.weather_code[i]),
  }));

  return {
    current,
    hourly,
    daily,
    timezone: raw.timezone,
  };
}
