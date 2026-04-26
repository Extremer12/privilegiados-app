import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Music, FileText, Guitar, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Song {
  id: string;
  position: number;
  notes: string | null;
  section?: string | null;
  special_instructions?: string | null;
  songs: {
    id: string;
    title: string;
    lyrics: string | null;
    chords: string | null;
  };
}

interface LyricsDisplayProps {
  currentSong: Song | null;
  currentPosition: number;
  totalSongs: number;
  isCreator: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPresentationMode?: () => void;
  nextSong?: Song;
}

export const LyricsDisplay = ({
  currentSong,
  currentPosition,
  totalSongs,
  isCreator,
  onPrevious,
  onNext,
  onPresentationMode,
  nextSong,
}: LyricsDisplayProps) => {
  const [viewMode, setViewMode] = useState<"lyrics" | "chords">("lyrics");

  if (!currentSong) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center text-muted-foreground">
          <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No hay canciones en este repertorio</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <motion.div
        layout
        className="relative h-full flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, hsl(217 33% 12%) 0%, hsl(222 47% 6%) 100%)",
          border: "1px solid hsl(217 33% 20% / 0.5)",
          boxShadow: "0 25px 50px -12px hsl(222 47% 5% / 0.6), inset 0 1px 0 hsl(217 33% 30% / 0.2)",
        }}
      >
        {/* Song header */}
        <div className="relative p-6 pb-4 border-b border-border/30">
          {/* Background glow */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at top, hsl(48 100% 50% / 0.1) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10">
            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-4">
              <motion.div
                key={currentPosition}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: "linear-gradient(135deg, hsl(48 100% 50% / 0.2) 0%, hsl(48 100% 50% / 0.1) 100%)",
                  border: "1px solid hsl(48 100% 50% / 0.3)",
                }}
              >
                <span className="text-2xl font-bold text-secondary">
                  {currentPosition + 1}
                </span>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="text-sm text-muted-foreground">{totalSongs}</span>
              </motion.div>

              {/* View mode toggle */}
              <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-background/30 justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("lyrics")}
                      className={`h-8 px-3 ${
                        viewMode === "lyrics" 
                          ? "bg-secondary/20 text-secondary" 
                          : "text-muted-foreground"
                      }`}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Letra
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver letra</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("chords")}
                      className={`h-8 px-3 ${
                        viewMode === "chords" 
                          ? "bg-secondary/20 text-secondary" 
                          : "text-muted-foreground"
                      }`}
                    >
                      <Guitar className="w-4 h-4 mr-1" />
                      Acordes
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver acordes</TooltipContent>
                </Tooltip>

                {onPresentationMode && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onPresentationMode}
                        className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-white/10"
                      >
                        <MonitorPlay className="w-4 h-4 mr-1" />
                        Presentación
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Modo presentación (letras gigantes)</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Song title */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSong.songs.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
                  {currentSong.songs.title}
                </h1>

                {/* Section badge and notes */}
                <div className="flex flex-wrap items-center gap-3">
                  {currentSong.section && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary/20 text-secondary">
                      {currentSong.section}
                    </span>
                  )}
                  {currentSong.notes && (
                    <span className="text-sm text-muted-foreground italic">
                      "{currentSong.notes}"
                    </span>
                  )}
                  {currentSong.special_instructions && (
                    <span className="px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">
                      🎵 {currentSong.special_instructions}
                    </span>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Lyrics/Chords content */}
        <ScrollArea className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentSong.songs.id}-${viewMode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              {viewMode === "lyrics" ? (
                <div className="text-foreground text-xl md:text-2xl lg:text-3xl leading-relaxed whitespace-pre-wrap font-medium">
                  {currentSong.songs.lyrics || (
                    <span className="text-muted-foreground italic">
                      No hay letra disponible para esta canción
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-foreground text-lg md:text-xl leading-loose whitespace-pre-wrap font-mono">
                  {currentSong.songs.chords || (
                    <span className="text-muted-foreground italic">
                      No hay acordes disponibles para esta canción
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </ScrollArea>

        {/* Navigation controls */}
        {isCreator && (
          <div className="p-6 border-t border-border/30">
            <div className="flex items-center justify-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={onPrevious}
                      disabled={currentPosition === 0}
                      className="h-14 px-6 text-lg rounded-xl border-2"
                    >
                      <ChevronLeft className="w-6 h-6 mr-2" />
                      Anterior
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>Ir a la canción anterior</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="lg"
                      onClick={onNext}
                      disabled={currentPosition >= totalSongs - 1}
                      className="h-14 px-8 text-lg rounded-xl font-bold flex flex-col justify-center items-center py-2"
                      style={{
                        background: currentPosition >= totalSongs - 1
                          ? undefined
                          : "linear-gradient(135deg, hsl(48 100% 50%) 0%, hsl(45 100% 55%) 100%)",
                        color: currentPosition >= totalSongs - 1 ? undefined : "hsl(222 47% 7%)",
                      }}
                    >
                      <div className="flex items-center">
                        Siguiente
                        <ChevronRight className="w-6 h-6 ml-2" />
                      </div>
                      {nextSong && (
                        <span className="text-[10px] font-medium opacity-80 mt-0.5 truncate max-w-[200px]">
                          {nextSong.songs.title}
                        </span>
                      )}
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>Ir a la siguiente canción</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  );
};
