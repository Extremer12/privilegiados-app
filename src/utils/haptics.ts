/**
 * Utility functions for haptic feedback using the Vibration API.
 * Safely checks for browser support and provides different vibration patterns.
 */

export const isVibrationSupported = () => {
  return typeof window !== 'undefined' && 'vibrate' in navigator;
};

// Light tap (e.g. for pressing small buttons)
export const vibrateLight = () => {
  if (isVibrationSupported()) {
    navigator.vibrate(20);
  }
};

// Medium tap (e.g. for opening dialogs, changing tabs)
export const vibrateMedium = () => {
  if (isVibrationSupported()) {
    navigator.vibrate(50);
  }
};

// Success pattern (e.g. song added, form saved)
export const vibrateSuccess = () => {
  if (isVibrationSupported()) {
    navigator.vibrate([30, 50, 30]);
  }
};

// Error pattern
export const vibrateError = () => {
  if (isVibrationSupported()) {
    navigator.vibrate([50, 50, 50, 50, 50]);
  }
};
