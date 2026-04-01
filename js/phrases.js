import { cleanPhrases } from './phrases-clean.js';
import { explicitPhrases } from './phrases-explicit.js';
import { getTempRange } from './utils.js';

const MODE_KEY = 'phraseMode';
const CONFIRMED_KEY = 'explicitConfirmed';
const SEEN_KEY_CLEAN = 'seenPhrases_clean';
const SEEN_KEY_EXPLICIT = 'seenPhrases_explicit';
const MAX_SEEN = 50; // Track last 50 phrases to avoid repeats

/**
 * Get the current phrase mode ('clean' or 'explicit')
 */
export function getPhraseMode() {
  return localStorage.getItem(MODE_KEY) || 'clean';
}

/**
 * Set the phrase mode
 */
export function setPhraseMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
}

/**
 * Check if explicit mode has been confirmed via age disclaimer
 */
export function isExplicitConfirmed() {
  return localStorage.getItem(CONFIRMED_KEY) === 'true';
}

/**
 * Mark explicit mode as confirmed
 */
export function confirmExplicit() {
  localStorage.setItem(CONFIRMED_KEY, 'true');
}

/**
 * Get recently seen phrase indices to avoid repeats
 */
function getSeenPhrases(mode) {
  try {
    const key = mode === 'explicit' ? SEEN_KEY_EXPLICIT : SEEN_KEY_CLEAN;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Record a phrase index as seen
 */
function markSeen(mode, phraseText) {
  try {
    const key = mode === 'explicit' ? SEEN_KEY_EXPLICIT : SEEN_KEY_CLEAN;
    const seen = getSeenPhrases(mode);
    seen.push(phraseText);
    // Only keep the last MAX_SEEN to eventually allow repeats
    if (seen.length > MAX_SEEN) {
      seen.splice(0, seen.length - MAX_SEEN);
    }
    localStorage.setItem(key, JSON.stringify(seen));
  } catch {
    // ignore
  }
}

/**
 * Select a phrase based on current weather conditions.
 * Uses true randomness and avoids recently shown phrases.
 */
export function selectPhrase(conditionTag, tempF, mode = 'clean') {
  const pool = mode === 'explicit' ? explicitPhrases : cleanPhrases;
  const seen = getSeenPhrases(mode);

  // Step 1: Filter by condition AND temperature range
  let matches = pool.filter(p => {
    const condMatch = p.conditions.includes(conditionTag);
    const tempMatch = !p.tempRange || (tempF >= p.tempRange[0] && tempF <= p.tempRange[1]);
    return condMatch && tempMatch;
  });

  // Step 2: If fewer than 3 matches, relax to condition-only
  if (matches.length < 3) {
    matches = pool.filter(p => p.conditions.includes(conditionTag));
  }

  // Step 3: If still empty, fall back to temperature-range phrases
  if (matches.length === 0) {
    matches = pool.filter(p => {
      if (!p.tempRange) return false;
      return tempF >= p.tempRange[0] && tempF <= p.tempRange[1];
    });
  }

  // Step 4: If still nothing, use generic phrases
  if (matches.length === 0) {
    matches = pool.filter(p => p.conditions.includes('any'));
  }

  // Step 5: Last resort - whole pool
  if (matches.length === 0) {
    matches = pool;
  }

  // Remove recently seen phrases (if we still have enough left)
  const unseen = matches.filter(p => !seen.includes(p.text));
  if (unseen.length >= 2) {
    matches = unseen;
  }

  // Build weighted pool (priority 2 = 2x weight)
  const weighted = [];
  for (const phrase of matches) {
    const weight = phrase.priority === 2 ? 2 : 1;
    for (let i = 0; i < weight; i++) {
      weighted.push(phrase);
    }
  }

  // True random selection
  const index = Math.floor(Math.random() * weighted.length);
  const selected = weighted[index];

  let text = selected.text;

  // Replace [temp] token with actual temperature
  text = text.replace(/\[temp\]/g, Math.round(tempF));

  // Track this phrase as seen
  markSeen(mode, selected.text);

  return text;
}
