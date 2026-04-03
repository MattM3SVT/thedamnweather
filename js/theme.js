/**
 * Theme management - dark mode toggle and dynamic backgrounds
 */

const THEME_KEY = 'theme';

/**
 * Initialize theme system
 */
export function initTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      applyTheme(saved);
    }
  } catch {
    // localStorage unavailable (private browsing) — use inline script default
  }
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // ignore
  }
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
