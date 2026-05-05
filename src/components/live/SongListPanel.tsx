import { motion } from "framer-motion";
import { Music, CheckCircle, Trash2, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { SECTION_TYPES } from "@/components/repertorios/types";
import { memo } from "react";

import type { SetlistSong } from "@/types";

interface SongListPanelProps {
  songs: SetlistSong[];
  currentPosition: number;
  onSongSelect?: (position: number) => void;
  isCreator: boolean;
  onDeleteSong?: (songId: string) => void;
  onAddSong?: (section: string) => void;
}

export const SongListPanel = memo(({
  songs,
  currentPosition,
  onSongSelect,
  isCreator,
  onDeleteSong,
  onAddSong,
}: SongListPanelProps) => {

  // Group songs by section for ordered display
  const songsBySection = new Map<string, { songs: (SetlistSong & { globalIndex: number })[]; config: any }>();

  // First, build a global index for each song
  songs.forEach((song, index) => {
    const sectionId = song.section || "otro";
    if (!songsBySection.has(sectionId)) {
      const config = SECTION_TYPES.find(s => s.id === sectionId);
      songsBySection.set(sectionId, {
        songs: [],
        config: config || { id: sectionId, name: sectionId, color: "text-muted-foreground" },
      });
    }
    songsBySection.get(sectionId)!.songs.push({ ...song, globalIndex: index });
  });

  // Order sections by SECTION_TYPES order
  const orderedSections = [...songsBySection.entries()].sort((a, b) => {
    const aIdx = SECTION_TYPES.findIndex(s => s.id === a[0]);
    const bIdx = SECTION_TYPES.findIndex(s => s.id === b[0]);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

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
      <div className="p-4 border-b border-border/30 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-secondary/20">
              <Music className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">
                Canciones
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {songs.length} en total
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Songs grouped by section */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {orderedSections.map(([sectionId, { songs: sectionSongs, config }]) => (
            <div key={sectionId} className="mb-3">
              {/* Section header */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    config.color?.replace("text-", "bg-") || "bg-muted-foreground"
                  }`} />
                  <span className={`text-[11px] font-bold uppercase tracking-widest ${config.color || "text-muted-foreground"}`}>
                    {config.name || sectionId}
                  </span>
                </div>
                {isCreator && onAddSong && (
                  <button
                    onClick={() => onAddSong(sectionId)}
                    className="p-1 rounded-md text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-colors"
                    title={`Agregar canción a ${config.name}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Songs in section */}
              <div className="space-y-1">
                {sectionSongs.map((song) => {
                  const isCurrent = song.globalIndex === currentPosition;
                  const isPast = song.globalIndex < currentPosition;

                  return (
                    <motion.button
                      key={song.id}
                      whileHover={onSongSelect ? { x: 3 } : undefined}
                      onClick={() => onSongSelect?.(song.globalIndex)}
                      disabled={!onSongSelect}
                      className={`group w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 ${
                        isCurrent
                          ? "bg-secondary/20 border border-secondary/40"
                          : isPast
                          ? "opacity-40"
                          : "hover:bg-background/30"
                      } ${onSongSelect ? "cursor-pointer" : "cursor-default"}`}
                    >
                      {/* Number / check */}
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isCurrent
                            ? "bg-secondary text-primary"
                            : isPast
                            ? "bg-green-500/20 text-green-400"
                            : "bg-background/30 text-muted-foreground"
                        }`}
                      >
                        {isPast ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          song.globalIndex + 1
                        )}
                      </div>

                      {/* Song info */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium truncate ${
                            isCurrent ? "text-secondary" : isPast ? "text-foreground/60" : "text-foreground"
                          }`}
                        >
                          {song.songs.title}
                        </p>
                        {song.notes && (
                          <p className="text-[10px] text-muted-foreground truncate italic">
                            {song.notes}
                          </p>
                        )}
                      </div>

                      {/* Current indicator */}
                      {isCurrent && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-secondary animate-pulse" />
                      )}
                      
                      {/* Delete button (only visible for creator on hover) */}
                      {isCreator && onDeleteSong && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSong(song.id);
                            }}
                            className="p-1 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                            title="Remover canción"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}

          {songs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay canciones</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
