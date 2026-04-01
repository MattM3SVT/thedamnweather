/**
 * Theme management - dark mode toggle and dynamic backgrounds
 */

const THEME_KEY = 'theme';

/**
 * Initialize theme system
 */
export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved);
  }
  // Already handled by inline script in <head> for initial load
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
}

/**
 * Apply a specific theme
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

/**
 * Update body data attributes for dynamic background
 */
export function updateWeatherTheme(conditionTag, isDay, tempRange) {
  document.body.setAttribute('data-conditions', conditionTag);
  document.body.setAttribute('data-daytime', isDay ? 'day' : 'night');
  document.body.setAttribute('data-temp-range', tempRange);
}
