import { useState } from "react";
import { X, ZoomIn, ZoomOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PresentationModeProps {
  lyrics: string;
  title: string;
  onClose: () => void;
}

export const PresentationMode = ({ lyrics, title, onClose }: PresentationModeProps) => {
  const [fontSize, setFontSize] = useState(32);
  const [darkMode, setDarkMode] = useState(true);

  const increaseFontSize = () => setFontSize((prev) => Math.min(prev + 4, 80));
  const decreaseFontSize = () => setFontSize((prev) => Math.max(prev - 4, 16));

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${
        darkMode ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      {/* Control Bar */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm">
        <h2 className="text-xl font-bold truncate max-w-md">{title}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={decreaseFontSize}
            className="text-current"
            aria-label="Reducir tamaño de letra"
          >
            <ZoomOut className="w-5 h-5" aria-hidden="true" />
          </Button>
          <span className="text-sm font-medium min-w-[3rem] text-center" aria-live="polite">
            {fontSize}px
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={increaseFontSize}
            className="text-current"
            aria-label="Aumentar tamaño de letra"
          >
            <ZoomIn className="w-5 h-5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="text-current"
            aria-label={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {darkMode ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-current"
            aria-label="Cerrar modo presentación"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Lyrics Display */}
      <div className="flex-1 overflow-y-auto p-4 md:p-12">
        <div className="min-h-full flex flex-col justify-center">
          <pre
            className="font-sans font-black text-center whitespace-pre-wrap leading-[1.2] max-w-6xl mx-auto my-auto"
            style={{ 
              fontSize: `${fontSize}px`,
              textShadow: darkMode ? '0 4px 24px rgba(0,0,0,0.5)' : 'none'
            }}
          >
            {lyrics}
          </pre>
        </div>
      </div>
    </div>
  );
};
