import { motion, AnimatePresence } from "framer-motion";
import { Music2, Check, Play } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Song {
  id: string;
  position: number;
  notes: string | null;
  section?: string | null;
  songs: {
    id: string;
    title: string;
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
  // Group songs by section
  const groupedSongs = songs.reduce((acc, song) => {
    const section = song.section || "Sin sección";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(song);
    return acc;
  }, {} as Record<string, Song[]>);

  const sections = Object.keys(groupedSongs);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
        border: "1px solid hsl(217 33% 25% / 0.5)",
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/20">
            <Music2 className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Repertorio</h3>
            <p className="text-xs text-muted-foreground">
              {songs.length} canciones
            </p>
          </div>
        </div>
      </div>

      {/* Song list */}
      <ScrollArea className="h-[calc(100%-80px)]">
        <div className="p-3 space-y-4">
          {sections.length > 1 ? (
            // Grouped by sections
            sections.map((section) => (
              <div key={section}>
                <div className="flex items-center gap-2 px-2 py-1 mb-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-secondary/50 to-transparent" />
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    {section}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-secondary/50 to-transparent" />
                </div>
                
                <div className="space-y-1">
                  {groupedSongs[section].map((song, index) => {
                    const globalIndex = songs.findIndex(s => s.id === song.id);
                    const isActive = globalIndex === currentPosition;
                    const isPast = globalIndex < currentPosition;

                    return (
                      <motion.button
                        key={song.id}
                        whileHover={isCreator ? { scale: 1.02, x: 4 } : {}}
                        whileTap={isCreator ? { scale: 0.98 } : {}}
                        onClick={() => isCreator && onSongSelect?.(globalIndex)}
                        disabled={!isCreator}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          isActive
                            ? "bg-secondary/20 border-2 border-secondary"
                            : isPast
                            ? "bg-background/30 border border-green-500/30"
                            : "bg-background/20 border border-transparent hover:border-border/50"
                        } ${isCreator ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Position indicator */}
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                              isActive
                                ? "bg-secondary text-primary"
                                : isPast
                                ? "bg-green-500/20 text-green-400"
                                : "bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            {isPast ? (
                              <Check className="w-4 h-4" />
                            ) : isActive ? (
                              <Play className="w-4 h-4" />
                            ) : (
                              globalIndex + 1
                            )}
                          </div>

                          {/* Song info */}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-medium truncate ${
                                isActive
                                  ? "text-foreground"
                                  : isPast
                                  ? "text-muted-foreground"
                                  : "text-foreground/80"
                              }`}
                            >
                              {song.songs.title}
                            </p>
                            {song.notes && (
                              <p className="text-xs text-muted-foreground truncate italic">
                                {song.notes}
                              </p>
                            )}
                          </div>

                          {/* Active indicator */}
                          {isActive && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="w-3 h-3 rounded-full bg-secondary"
                            />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            // Simple list without sections
            <div className="space-y-1">
              {songs.map((song, index) => {
                const isActive = index === currentPosition;
                const isPast = index < currentPosition;

                return (
                  <motion.button
                    key={song.id}
                    whileHover={isCreator ? { scale: 1.02, x: 4 } : {}}
                    whileTap={isCreator ? { scale: 0.98 } : {}}
                    onClick={() => isCreator && onSongSelect?.(index)}
                    disabled={!isCreator}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-secondary/20 border-2 border-secondary"
                        : isPast
                        ? "bg-background/30 border border-green-500/30"
                        : "bg-background/20 border border-transparent hover:border-border/50"
                    } ${isCreator ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          isActive
                            ? "bg-secondary text-primary"
                            : isPast
                            ? "bg-green-500/20 text-green-400"
                            : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {isPast ? (
                          <Check className="w-4 h-4" />
                        ) : isActive ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium truncate ${
                            isActive
                              ? "text-foreground"
                              : isPast
                              ? "text-muted-foreground"
                              : "text-foreground/80"
                          }`}
                        >
                          {song.songs.title}
                        </p>
                        {song.notes && (
                          <p className="text-xs text-muted-foreground truncate italic">
                            {song.notes}
                          </p>
                        )}
                      </div>

                      {isActive && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-3 h-3 rounded-full bg-secondary"
                        />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
};
