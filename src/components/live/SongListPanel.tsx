import { motion } from "framer-motion";
import { Music, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface SongListPanelProps {
  songs: Song[];
  currentPosition: number;
  onSongSelect?: (position: number) => void;
  isCreator: boolean;
}

export const SongListPanel = ({
  songs,
  currentPosition,
  onSongSelect,
  isCreator,
}: SongListPanelProps) => {
  return (
    <div
      className="h-full rounded-2xl overflow-hidden flex flex-col"
      style={{
        background:
          "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
        border: "1px solid hsl(217 33% 25% / 0.5)",
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-secondary/20">
            <Music className="w-4 h-4 text-secondary" />
          </div>
          <h3 className="font-bold text-foreground text-sm">
            Lista de Canciones
          </h3>
        </div>
      </div>

      {/* Songs */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {songs.map((song, index) => {
            const isCurrent = index === currentPosition;
            const isPast = index < currentPosition;

            return (
              <motion.button
                key={song.id}
                whileHover={isCreator ? { x: 4 } : undefined}
                onClick={() => onSongSelect?.(index)}
                disabled={!isCreator}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 ${
                  isCurrent
                    ? "bg-secondary/20 border border-secondary/40"
                    : isPast
                    ? "opacity-50"
                    : "hover:bg-background/30"
                } ${isCreator ? "cursor-pointer" : "cursor-default"}`}
              >
                {/* Number / check */}
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? "bg-secondary text-primary"
                      : isPast
                      ? "bg-green-500/20 text-green-400"
                      : "bg-background/30 text-muted-foreground"
                  }`}
                >
                  {isPast ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Song info */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium truncate ${
                      isCurrent ? "text-secondary" : "text-foreground"
                    }`}
                  >
                    {song.songs.title}
                  </p>
                  {song.section && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {song.section}
                    </p>
                  )}
                </div>

                {/* Current indicator */}
                {isCurrent && (
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-secondary animate-pulse" />
                )}
              </motion.button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
