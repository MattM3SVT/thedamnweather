import { fetchWeather } from './api.js';
import { getBrowserLocation, searchLocation, reverseGeocode, rememberLocation, getRememberedLocation } from './location.js';
import { selectPhrase, getPhraseMode, setPhraseMode, isExplicitConfirmed, confirmExplicit } from './phrases.js';
import { showState, renderAll, updatePhrase, updateTime } from './ui.js';
import { updateWeatherTheme } from './theme.js';
import { cleanupCache } from './cache.js';
import { getTempRange } from './utils.js';

// App state
let currentWeather = null;
let currentLocation = null;
let timeInterval = null;
let loadRequestId = 0; // Race condition guard
let searchRequestId = 0; // Search race condition guard

/**
 * Initialize the app
 */
async function init() {
  // Clean expired cache
  cleanupCache();

  // Bind events
  bindEvents();

  // Load explicit toggle state
  const mode = getPhraseMode();
  document.getElementById('explicit-toggle').checked = mode === 'explicit';

  // Try to load weather
  const saved = getRememberedLocation();
  if (saved) {
    await loadWeather(saved);
  } else {
    // Try geolocation
    showState('loading');
    try {
      const coords = await getBrowserLocation();
      const location = await reverseGeocode(coords.lat, coords.lon);
      rememberLocation(location);
      await loadWeather(location);
    } catch {
      showState('empty');
    }
  }
}

/**
 * Load weather for a location
 */
async function loadWeather(location) {
  const thisRequest = ++loadRequestId;
  showState('loading');

  try {
    const weather = await fetchWeather(location.lat, location.lon);
    // Bail out if a newer request started while we were waiting
    if (thisRequest !== loadRequestId) return;
    currentWeather = weather;
    currentLocation = location;

    // Update theme based on weather
    updateWeatherTheme(
      weather.current.conditionTag,
      weather.current.isDay,
      getTempRange(weather.current.temp)
    );

    // Select phrase
    const mode = getPhraseMode();
    const phrase = selectPhrase(weather.current.conditionTag, weather.current.temp, mode, weather.current.isDay);

    // Render
    renderAll(weather, location, phrase);

    // Start time updates, aligned to next minute boundary
    if (timeInterval) clearInterval(timeInterval);
    const msUntilNextMinute = (60 - new Date().getSeconds()) * 1000;
    setTimeout(() => {
      updateTime(weather.timezone);
      timeInterval = setInterval(() => updateTime(weather.timezone), 60000);
    }, msUntilNextMinute);

  } catch (err) {
    console.error('Weather load failed:', err);
    showState('error', 'Could not load the weather. Check your connection and try again.');
  }
}

/**
 * Bind all event listeners
 */
function bindEvents() {
  // Search form
  const searchForm = document.querySelector('.search-form');
  const searchInput = document.querySelector('.search-input');
  const searchResults = document.querySelector('.search-results');

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    searchResults.hidden = true;
    await handleSearch(query);
  });

  // Live search (debounced)
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    if (query.length < 2) {
      searchResults.hidden = true;
      return;
    }
    searchTimeout = setTimeout(() => showSearchResults(query), 300);
  });

  // Close search results on click outside
  document.addEventListener('click', (e) => {
    if (!searchForm.contains(e.target)) {
      searchResults.hidden = true;
    }
  });

  // Geolocation button
  document.querySelector('.geo-btn').addEventListener('click', async () => {
    showState('loading');
    try {
      const coords = await getBrowserLocation();
      const location = await reverseGeocode(coords.lat, coords.lon);
      rememberLocation(location);
      searchInput.value = '';
      document.querySelector('.search-results').hidden = true;
      await loadWeather(location);
    } catch (err) {
      showState('error', err.message || 'Could not get your location.');
    }
  });

  // Explicit toggle
  const explicitToggle = document.getElementById('explicit-toggle');
  explicitToggle.addEventListener('change', () => {
    if (explicitToggle.checked) {
      // Check if already confirmed
      if (isExplicitConfirmed()) {
        enableExplicitMode();
      } else {
        // Show age modal
        explicitToggle.checked = false;
        document.getElementById('age-modal').hidden = false;
      }
    } else {
      setPhraseMode('clean');
      refreshPhrase();
    }
  });

  // Age modal buttons
  document.getElementById('age-confirm').addEventListener('click', () => {
    confirmExplicit();
    enableExplicitMode();
    document.getElementById('age-modal').hidden = true;
  });

  document.getElementById('age-cancel').addEventListener('click', () => {
    document.getElementById('age-modal').hidden = true;
    document.getElementById('explicit-toggle').checked = false;
  });

  // Retry button
  document.getElementById('retry-btn').addEventListener('click', () => {
    if (currentLocation) {
      loadWeather(currentLocation);
    } else {
      showState('empty');
    }
  });

  // Keyboard: close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('age-modal');
      if (!modal.hidden) {
        modal.hidden = true;
        document.getElementById('explicit-toggle').checked = false;
      }
      document.querySelector('.search-results').hidden = true;
    }
  });
}

/**
 * Handle search query
 */
async function handleSearch(query) {
  try {
    const results = await searchLocation(query);
    if (results.length === 0) {
      showState('error', `Couldn't find "${query}". Try a zip code or different city name.`);
      return;
    }
    if (results.length === 1) {
      selectLocation(results[0]);
      return;
    }
    // Multiple results - pick the first one (already shown in dropdown)
    selectLocation(results[0]);
  } catch (err) {
    showState('error', 'Search failed. Check your connection and try again.');
  }
}

/**
 * Show search result dropdown
 */
async function showSearchResults(query) {
  const thisSearch = ++searchRequestId;
  const container = document.querySelector('.search-results');
  try {
    const results = await searchLocation(query);
    // Bail if a newer search started while we were waiting
    if (thisSearch !== searchRequestId) return;
    if (results.length === 0) {
      container.hidden = true;
      return;
    }

    // Build results using DOM methods to prevent XSS
    container.innerHTML = '';
    results.forEach((r, i) => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.setAttribute('role', 'option');
      item.setAttribute('tabindex', '0');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'result-name';
      nameSpan.textContent = r.name;
      item.appendChild(nameSpan);

      const detail = [r.state, r.country].filter(Boolean).join(', ');
      if (detail) {
        const detailSpan = document.createElement('span');
        detailSpan.className = 'result-detail';
        detailSpan.textContent = detail;
        item.appendChild(detailSpan);
      }

      // Click and keyboard support
      const select = () => {
        selectLocation(results[i]);
        container.hidden = true;
        document.querySelector('.search-input').value = '';
      };
      item.addEventListener('click', select);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      });

      container.appendChild(item);
    });

    container.hidden = false;
  } catch {
    if (thisSearch === searchRequestId) {
      container.hidden = true;
    }
  }
}

/**
 * Select a location and load its weather
 */
function selectLocation(location) {
  rememberLocation(location);
  document.querySelector('.search-input').value = '';
  document.querySelector('.search-results').hidden = true;
  loadWeather(location).catch(err => {
    console.error('Weather load failed:', err);
    showState('error', 'Could not load the weather. Check your connection and try again.');
  });
}

/**
 * Enable explicit phrase mode
 */
function enableExplicitMode() {
  document.getElementById('explicit-toggle').checked = true;
  setPhraseMode('explicit');
  refreshPhrase();
}

/**
 * Refresh the displayed phrase with current weather data
 */
function refreshPhrase() {
  if (!currentWeather) return;
  const mode = getPhraseMode();
  const phrase = selectPhrase(
    currentWeather.current.conditionTag,
    currentWeather.current.temp,
    mode,
    currentWeather.current.isDay
  );
  updatePhrase(phrase);
}

// Boot
init();
