import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ZoomOut, ZoomIn, Sun, Moon, X } from "lucide-react";
import type { SetlistSong } from "@/types";

interface PresentationViewProps {
  currentSong: SetlistSong;
  isCreator: boolean;
  theme: "dark" | "light";
  fontSize: number;
  onThemeToggle: () => void;
  onIncreaseFont: () => void;
  onDecreaseFont: () => void;
  onClose: () => void;
  onNavigate: (direction: "next" | "prev") => void;
}

export function PresentationView({
  currentSong,
  isCreator,
  theme,
  fontSize,
  onThemeToggle,
  onIncreaseFont,
  onDecreaseFont,
  onClose,
  onNavigate,
}: PresentationViewProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${
        theme === "dark" ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      {/* Control Bar */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm z-50 relative">
        <h2 className="text-xl font-bold truncate max-w-md opacity-80">
          {currentSong.songs.title}
        </h2>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDecreaseFont}
                  className="text-current hover:bg-white/10"
                >
                  <ZoomOut className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reducir tamaño</TooltipContent>
            </Tooltip>

            <span className="text-sm font-medium min-w-[3rem] text-center opacity-80">
              {fontSize}px
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onIncreaseFont}
                  className="text-current hover:bg-white/10"
                >
                  <ZoomIn className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Aumentar tamaño</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-current hover:bg-white/10"
                  onClick={onThemeToggle}
                >
                  {theme === "dark" ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cambiar tema</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-current hover:bg-white/10 text-red-400 hover:text-red-500"
                  onClick={onClose}
                >
                  <X className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Salir</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-12 relative">
        <div className="min-h-full flex flex-col justify-center">
          <pre
            className="font-sans font-black text-center whitespace-pre-wrap leading-[1.2] max-w-6xl mx-auto my-auto transition-all duration-300"
            style={{
              fontSize: `${fontSize}px`,
              textShadow:
                theme === "dark" ? "0 4px 24px rgba(0,0,0,0.5)" : "none",
            }}
          >
            {currentSong.songs.lyrics || "Sin letra disponible"}
          </pre>
        </div>
      </div>

      {/* Invisible navigation zones for touch/click */}
      {isCreator && (
        <>
          <div
            className="fixed top-0 left-0 w-[20%] h-full cursor-pointer z-10"
            onClick={() => onNavigate("prev")}
            title="Anterior"
          />
          <div
            className="fixed top-0 right-0 w-[20%] h-full cursor-pointer z-10"
            onClick={() => onNavigate("next")}
            title="Siguiente"
          />
        </>
      )}
    </div>
  );
}
