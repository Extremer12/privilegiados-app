/**
 * Custom hook to manage the Presentation Mode state.
 *
 * Extracts the presentation mode logic (theme toggling, font size control, fullscreen)
 * from EnVivo.tsx into a reusable hook.
 */

import { useState, useCallback, useEffect } from "react";

export function usePresentationMode() {
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [presentationTheme, setPresentationTheme] = useState<"dark" | "light">("dark");
  const [presentationFontSize, setPresentationFontSize] = useState(32);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleTheme = useCallback(() => {
    setPresentationTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const increaseFontSize = useCallback(() => {
    setPresentationFontSize((prev) => Math.min(prev + 4, 72));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setPresentationFontSize((prev) => Math.max(prev - 4, 16));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Error attempting to disable fullscreen:", err);
      });
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes made by the user (e.g., pressing Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const openPresentationMode = useCallback(() => {
    setIsPresentationMode(true);
  }, []);

  const closePresentationMode = useCallback(() => {
    setIsPresentationMode(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  return {
    isPresentationMode,
    presentationTheme,
    presentationFontSize,
    isFullscreen,
    toggleTheme,
    increaseFontSize,
    decreaseFontSize,
    toggleFullscreen,
    openPresentationMode,
    closePresentationMode,
  };
}
