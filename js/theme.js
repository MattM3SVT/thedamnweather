/**
 * Theme management - dynamic weather backgrounds
 */

/**
 * Update body data attributes for dynamic background
 */
export function updateWeatherTheme(conditionTag, isDay, tempRange) {
  document.body.setAttribute('data-conditions', conditionTag);
  document.body.setAttribute('data-daytime', isDay ? 'day' : 'night');
  document.body.setAttribute('data-temp-range', tempRange);
}
