import {
  formatTemp, getIconPath, getConditionLabel, getWindDirection,
  getUVLevel, getHumidityDesc, formatHour, formatDay, formatShortDate,
  formatTime, getCurrentTime, getTempRange,
} from './utils.js';

// DOM element cache
const $ = (id) => document.getElementById(id);

/**
 * Show a specific app state (loading, empty, error, weather)
 */
export function showState(state, errorMsg = '') {
  $('loading-state').hidden = state !== 'loading';
  $('empty-state').hidden = state !== 'empty';
  $('error-state').hidden = state !== 'error';
  $('weather-content').hidden = state !== 'weather';

  if (state === 'error' && errorMsg) {
    $('error-message').textContent = errorMsg;
  }
}

/**
 * Render all weather sections
 */
export function renderAll(weather, location, phrase) {
  renderHero(weather.current, location, phrase, weather.timezone);
  renderHourly(weather.hourly, weather.timezone);
  renderDaily(weather.daily);
  renderDetails(weather.current, weather.daily[0]);
  showState('weather');
}

/**
 * Render the hero section
 */
function renderHero(current, location, phrase, timezone) {
  // Icon
  const iconEl = $('hero-icon');
  iconEl.src = getIconPath(current.conditionTag, current.isDay);
  iconEl.alt = current.conditionLabel;

  // Temperature
  $('hero-temp').textContent = formatTemp(current.temp);

  // Phrase
  updatePhrase(phrase);

  // Location
  const locParts = [location.name];
  if (location.state) locParts.push(location.state);
  $('location-name').textContent = locParts.join(', ');
  $('location-time').textContent = getCurrentTime(timezone);

  // Stats
  $('stat-feels-like').textContent = `${formatTemp(current.feelsLike)}°`;
  $('stat-condition').textContent = current.conditionLabel;
  $('stat-wind').textContent = `${Math.round(current.windSpeed)} mph`;
}

/**
 * Update just the phrase text (for mode switching)
 */
export function updatePhrase(phrase) {
  const el = $('hero-phrase');
  el.classList.add('fading');
  setTimeout(() => {
    el.textContent = phrase;
    el.classList.remove('fading');
  }, 300);
}

/**
 * Render hourly forecast cards
 */
function renderHourly(hourly, timezone) {
  const container = $('hourly-scroll');
  container.innerHTML = '';

  hourly.forEach((h, i) => {
    const card = document.createElement('div');
    card.className = 'hourly-card' + (i === 0 ? ' is-now' : '');
    card.setAttribute('role', 'listitem');

    const timeLabel = formatHour(h.time, timezone);
    const iconPath = getIconPath(h.conditionTag, h.isDay);
    const temp = formatTemp(h.temp);
    const precip = h.precipProb;

    card.innerHTML = `
      <span class="hourly-time">${timeLabel}</span>
      <img class="hourly-icon" src="${iconPath}" alt="" loading="lazy" width="32" height="32">
      <span class="hourly-temp">${temp}°</span>
      ${precip > 0 ? `<span class="hourly-precip"><span class="hourly-precip-dot"></span>${precip}%</span>` : '<span class="hourly-precip">&nbsp;</span>'}
    `;

    container.appendChild(card);
  });
}

/**
 * Render daily forecast rows
 */
function renderDaily(daily) {
  const container = $('daily-list');
  container.innerHTML = '';

  // Find overall min/max for temperature bar scaling
  const allLows = daily.map(d => d.low);
  const allHighs = daily.map(d => d.high);
  const overallMin = Math.min(...allLows);
  const overallMax = Math.max(...allHighs);
  const range = overallMax - overallMin || 1;

  daily.forEach((d, i) => {
    const row = document.createElement('div');
    row.className = 'daily-row';
    row.setAttribute('role', 'listitem');

    const dayLabel = formatDay(d.time, i);
    const dateLabel = formatShortDate(d.time);
    const iconPath = getIconPath(d.conditionTag, true);
    const low = formatTemp(d.low);
    const high = formatTemp(d.high);
    const precip = d.precipProb;

    // Calculate bar position as percentage of overall range
    const leftPct = ((d.low - overallMin) / range) * 100;
    const rightPct = ((overallMax - d.high) / range) * 100;

    row.innerHTML = `
      <div class="daily-day">
        ${dayLabel}
        <span class="daily-date">${dateLabel}</span>
      </div>
      <img class="daily-icon" src="${iconPath}" alt="${d.conditionLabel}" loading="lazy" width="32" height="32">
      <div class="daily-temp-bar-wrapper">
        <span class="daily-low">${low}°</span>
        <div class="daily-bar">
          <div class="daily-bar-fill" style="left: ${leftPct}%; right: ${rightPct}%"></div>
        </div>
        <span class="daily-high">${high}°</span>
      </div>
      <span class="daily-precip">
        ${precip > 0 ? `<span class="daily-precip-icon"></span>${precip}%` : ''}
      </span>
    `;

    container.appendChild(row);
  });
}

/**
 * Render weather details grid
 */
function renderDetails(current, today) {
  // Humidity
  $('detail-humidity').textContent = `${current.humidity}%`;
  $('detail-humidity-desc').textContent = getHumidityDesc(current.humidity);

  // Wind
  $('detail-wind').textContent = `${Math.round(current.windSpeed)} mph`;
  $('detail-wind-dir').textContent = `${getWindDirection(current.windDirection)} · Gusts ${Math.round(current.windGusts)} mph`;

  // UV Index
  if (today && today.uvMax != null) {
    $('detail-uv').textContent = Math.round(today.uvMax);
    $('detail-uv-level').textContent = getUVLevel(today.uvMax);
  } else {
    $('detail-uv').textContent = '--';
    $('detail-uv-level').textContent = '';
  }

  // Pressure
  $('detail-pressure').textContent = `${Math.round(current.pressure)} hPa`;
  $('detail-pressure-trend').textContent = '';

  // Sunrise / Sunset
  if (today && today.sunrise) {
    $('detail-sunrise').textContent = `↑ ${formatTime(today.sunrise)}`;
    $('detail-sunset').textContent = `↓ ${formatTime(today.sunset)}`;
  }

  // Precipitation
  $('detail-precip').textContent = `${current.precipitation.toFixed(2)} in`;
  if (today && today.precipProb != null) {
    $('detail-precip-chance').textContent = `${today.precipProb}% chance today`;
  }
}

/**
 * Update the displayed time
 */
export function updateTime(timezone) {
  const el = $('location-time');
  if (el) {
    el.textContent = getCurrentTime(timezone);
  }
}
