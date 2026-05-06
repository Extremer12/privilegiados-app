import { useEffect } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

interface HotkeyMap {
  [key: string]: KeyHandler;
}

/**
 * Hook to easily register keyboard shortcuts that won't trigger
 * when the user is typing in an input field.
 */
export function useHotkeys(keyMap: HotkeyMap, dependencies: any[] = []) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Build a string representation of the key combo (e.g. "Ctrl+K" or "ArrowRight")
      let combo = '';
      if (event.ctrlKey || event.metaKey) combo += 'Ctrl+';
      if (event.altKey) combo += 'Alt+';
      if (event.shiftKey) combo += 'Shift+';
      
      // Use event.key for the actual key name, handling ' ' as 'Space'
      let keyName = event.key === ' ' ? 'Space' : event.key;
      
      // Capitalize first letter if it's a single character for consistency
      if (keyName.length === 1) {
        keyName = keyName.toUpperCase();
      }
      
      combo += keyName;

      // Check if we have a handler for this exact combo
      if (keyMap[combo]) {
        event.preventDefault();
        keyMap[combo](event);
      }
      // Also allow matching just by event.key for simple keys without modifiers
      else if (keyMap[keyName] && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        keyMap[keyName](event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, dependencies); // Re-bind if dependencies change
}
