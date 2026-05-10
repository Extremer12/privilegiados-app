import { TrendingUp, AlertTriangle, Music, PieChart as PieChartIcon, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export const SongsRanking = ({ data }: { data: any }) => {
  const { topSongs, unusedSongs, categoryData } = useMemo(() => {
    const { songsPlayed, allSongs, reports } = data;
    
    // Count frequencies
    const counts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    
    songsPlayed.forEach((s: any) => {
      if (s.songs) {
        counts[s.songs.id] = (counts[s.songs.id] || 0) + 1;
        categoryCounts[s.songs.category] = (categoryCounts[s.songs.category] || 0) + 1;
      }
    });

    const totalPlayed = songsPlayed.length || 1;
    const catData = Object.entries(categoryCounts).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
      percentage: Math.round((value / totalPlayed) * 100)
    }));

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
    const unused = allSongs.filter((s: any) => !playedIds.has(s.id)).slice(0, 15);

    return { topSongs: ranked.slice(0, 10), unusedSongs: unused, categoryData: catData };
  }, [data]);

  const COLORS = ['#FB1F2C', '#FBBF24', '#10B981', '#6366F1', '#EC4899'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        {/* Top Ranking */}
        <div className="p-6 rounded-3xl" style={{
          background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
          border: "1px solid hsl(217 33% 25% / 0.5)",
        }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-secondary/20 rounded-xl">
              <TrendingUp className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="text-xl font-bold text-white">Top 10 Canciones</h2>
          </div>

          <div className="space-y-4">
            {topSongs.map((song, i) => (
              <div key={song.id} className="relative group">
                <div className="flex justify-between items-end mb-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-muted-foreground font-mono w-4 text-xs">{i + 1}.</span>
                    <span className="font-bold text-white text-sm truncate">{song.title}</span>
                    <Badge variant="outline" className="text-[9px] bg-white/5 border-white/10 uppercase py-0">{song.category}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 pl-2">
                    <span className="text-secondary font-black">{song.count}</span> ejecuciones
                  </div>
                </div>
                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${song.percentage}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full bg-secondary rounded-full shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unused Songs */}
        <div className="p-6 rounded-3xl" style={{
          background: "linear-gradient(145deg, hsl(0 50% 12%) 0%, hsl(0 50% 8%) 100%)",
          border: "1px solid hsl(0 50% 25% / 0.3)",
        }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-rose-500/20 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Repertorio en Espera</h2>
          </div>
          <p className="text-xs text-rose-200/60 mb-4 font-medium uppercase tracking-widest">
            Canciones en biblioteca que aún no han debutado en vivo
          </p>

          <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto no-scrollbar pr-2">
            {unusedSongs.map((song: any) => (
              <div key={song.id} className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2 group hover:bg-white/10 transition-colors">
                <Music className="w-3 h-3 text-muted-foreground/50 group-hover:text-secondary transition-colors" />
                <span className="text-xs text-white/80 font-medium">{song.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Category Distribution */}
        <div className="p-6 rounded-3xl h-full flex flex-col" style={{
          background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
          border: "1px solid hsl(217 33% 25% / 0.5)",
        }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <PieChartIcon className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Balance de Géneros</h2>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(222.2 84% 4.9%)', borderColor: 'hsl(217 33% 25%)', borderRadius: '12px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 gap-4 w-full mt-6">
              {categoryData.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1">{cat.name}</span>
                    <span className="text-sm font-bold text-white">{cat.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
