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
          >
            <ZoomOut className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium min-w-[3rem] text-center">
            {fontSize}px
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={increaseFontSize}
            className="text-current"
          >
            <ZoomIn className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="text-current"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-current"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Lyrics Display */}
      <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
        <pre
          className="font-sans text-center whitespace-pre-wrap leading-relaxed max-w-5xl"
          style={{ fontSize: `${fontSize}px` }}
        >
          {lyrics}
        </pre>
      </div>
    </div>
  );
};
