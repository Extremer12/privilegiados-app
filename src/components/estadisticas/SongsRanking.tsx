import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const SongsRanking = ({ data }: { data: any }) => {
  const { topSongs, unusedSongs } = useMemo(() => {
    const { songsPlayed, allSongs, reports } = data;
    
    // Count frequencies
    const counts: Record<string, number> = {};
    const categories: Record<string, string> = {};
    songsPlayed.forEach((s: any) => {
      if (s.songs) {
        counts[s.songs.id] = (counts[s.songs.id] || 0) + 1;
        categories[s.songs.id] = s.songs.category;
      }
    });

    const totalCultos = reports.length || 1;

    // Convert to array and sort
    const ranked = Object.entries(counts)
      .map(([id, count]) => {
        const song = allSongs.find((s: any) => s.id === id);
        return {
          id,
          title: song?.title || "Desconocida",
          category: song?.category || "Desconocida",
          count,
          percentage: Math.round((count / totalCultos) * 100)
        };
      })
      .sort((a, b) => b.count - a.count);

    const playedIds = new Set(Object.keys(counts));
    const unused = allSongs.filter((s: any) => !playedIds.has(s.id));

    return { topSongs: ranked.slice(0, 10), unusedSongs: unused };
  }, [data]);

  return (
    <div className="space-y-8">
      {/* Top Ranking */}
      <div className="p-6 rounded-3xl" style={{
        background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
        border: "1px solid hsl(217 33% 25% / 0.5)",
      }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-secondary/20 rounded-xl">
            <TrendingUp className="w-5 h-5 text-secondary" />
          </div>
          <h2 className="text-xl font-bold text-white">Top 10 Canciones Más Tocadas</h2>
        </div>

        <div className="space-y-4">
          {topSongs.map((song, i) => (
            <div key={song.id} className="relative">
              <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-mono w-4">{i + 1}.</span>
                  <span className="font-medium text-white">{song.title}</span>
                  <Badge variant="outline" className="text-xs bg-white/5">{song.category}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="text-secondary font-bold">{song.count}</span> veces ({song.percentage}%)
                </div>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${song.percentage}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className="h-full bg-secondary rounded-full"
                />
              </div>
            </div>
          ))}
          {topSongs.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No hay datos suficientes.</p>
          )}
        </div>
      </div>

      {/* Unused Songs */}
      <div className="p-6 rounded-3xl" style={{
        background: "linear-gradient(145deg, hsl(0 50% 15%) 0%, hsl(0 50% 10%) 100%)",
        border: "1px solid hsl(0 50% 25% / 0.5)",
      }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Canciones Olvidadas</h2>
        </div>
        <p className="text-sm text-red-200/70 mb-4">
          Estas canciones están en el sistema pero nunca se han tocado en un culto registrado.
        </p>

        <div className="flex flex-wrap gap-2">
          {unusedSongs.map((song: any) => (
            <Badge key={song.id} variant="secondary" className="bg-red-500/10 text-red-200 border-red-500/20 hover:bg-red-500/20">
              {song.title}
            </Badge>
          ))}
          {unusedSongs.length === 0 && (
            <p className="text-muted-foreground text-sm">¡Excelente! Han tocado todas las canciones al menos una vez.</p>
          )}
        </div>
      </div>
    </div>
  );
};
