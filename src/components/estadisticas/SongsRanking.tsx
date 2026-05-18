import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Music, PieChart as PieChartIcon, Activity, Clock, FileMusic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export const SongsRanking = ({ data }: { data: any }) => {
  const { topSongs, unusedSongs, categoryData, totalPlayed, mostUsedKey } = useMemo(() => {
    const { songsPlayed, allSongs, reports } = data;
    
    // Count frequencies
    const counts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const keyCounts: Record<string, number> = {};
    
    songsPlayed.forEach((s: any) => {
      if (s.songs) {
        counts[s.songs.id] = (counts[s.songs.id] || 0) + 1;
        categoryCounts[s.songs.category] = (categoryCounts[s.songs.category] || 0) + 1;
        if (s.key_played) keyCounts[s.key_played] = (keyCounts[s.key_played] || 0) + 1;
      }
    });

    const totalPlayed = songsPlayed.length || 1;
    const catData = Object.entries(categoryCounts).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
      percentage: Math.round((value / totalPlayed) * 100)
    })).sort((a, b) => b.value - a.value);

    let mostUsedKey = { key: '-', count: 0 };
    if (Object.keys(keyCounts).length > 0) {
      const top = Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0];
      mostUsedKey = { key: top[0], count: top[1] };
    }

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
          percentage: Math.round((count / Math.max(...Object.values(counts))) * 100) // relative to top song
        };
      })
      .sort((a, b) => b.count - a.count);

    const playedIds = new Set(Object.keys(counts));
    const unused = allSongs.filter((s: any) => !playedIds.has(s.id)).slice(0, 15);

    return { topSongs: ranked.slice(0, 10), unusedSongs: unused, categoryData: catData, totalPlayed, mostUsedKey };
  }, [data]);

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#64748B'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center text-center">
          <Activity className="w-10 h-10 text-emerald-400 mb-3" />
          <p className="text-sm font-medium text-emerald-200/70 uppercase tracking-widest mb-1">Frecuencia Total</p>
          <h3 className="text-4xl font-black text-emerald-50">{totalPlayed}</h3>
          <p className="text-xs text-emerald-400/60 mt-1 font-bold">REPRODUCCIONES</p>
        </div>
        
        <div className="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center justify-center text-center">
          <FileMusic className="w-10 h-10 text-blue-400 mb-3" />
          <p className="text-sm font-medium text-blue-200/70 uppercase tracking-widest mb-1">Tono Preferido</p>
          <h3 className="text-4xl font-black text-blue-50">{mostUsedKey.key}</h3>
          <p className="text-xs text-blue-400/60 mt-1 font-bold">TOCADO {mostUsedKey.count} VECES</p>
        </div>

        <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-center justify-center text-center">
          <Clock className="w-10 h-10 text-rose-400 mb-3" />
          <p className="text-sm font-medium text-rose-200/70 uppercase tracking-widest mb-1">Sin Tocar</p>
          <h3 className="text-4xl font-black text-rose-50">{unusedSongs.length}</h3>
          <p className="text-xs text-rose-400/60 mt-1 font-bold">CANCIONES</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Top Ranking */}
          <div className="p-8 rounded-3xl" style={{
            background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
            border: "1px solid hsl(217 33% 25% / 0.5)",
          }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-secondary/20 rounded-2xl">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Top 10 Canciones</h2>
                <p className="text-sm text-muted-foreground">Las más elegidas por el equipo</p>
              </div>
            </div>

            <div className="space-y-5">
              {topSongs.map((song, i) => (
                <div key={song.id} className="relative group">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-secondary group-hover:text-primary transition-colors shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-base truncate group-hover:text-secondary transition-colors">{song.title}</p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{song.category}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-4">
                      <span className="text-xl font-black text-white">{song.count}</span>
                      <span className="text-[10px] uppercase font-black text-secondary block">Veces</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${song.percentage}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full bg-secondary rounded-full shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Category Distribution */}
          <div className="p-8 rounded-3xl flex flex-col" style={{
            background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
            border: "1px solid hsl(217 33% 25% / 0.5)",
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/20 rounded-2xl">
                <PieChartIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Balance de Géneros</h2>
                <p className="text-sm text-muted-foreground">Distribución de categorías tocadas</p>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center min-h-[350px]">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={8}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(222.2 84% 4.9%)', borderColor: 'hsl(217 33% 25%)', borderRadius: '16px', fontSize: '14px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-4 w-full mt-8">
                {categoryData.map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1.5">{cat.name}</span>
                      <span className="text-base font-bold text-white">{cat.percentage}% <span className="text-muted-foreground text-xs font-normal ml-1">({cat.value})</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Unused Songs */}
          <div className="p-8 rounded-3xl" style={{
            background: "linear-gradient(145deg, hsl(0 50% 12%) 0%, hsl(0 50% 8%) 100%)",
            border: "1px solid hsl(0 50% 25% / 0.3)",
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-rose-500/20 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Repertorio en Espera</h2>
                <p className="text-sm text-rose-200/60">No han debutado en vivo aún</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 max-h-[250px] overflow-y-auto no-scrollbar pr-2">
              {unusedSongs.length > 0 ? unusedSongs.map((song: any) => (
                <div key={song.id} className="bg-black/20 border border-white/5 px-4 py-2.5 rounded-xl flex items-center gap-2 group hover:bg-white/10 hover:border-rose-500/30 transition-all cursor-default">
                  <Music className="w-4 h-4 text-rose-400/50 group-hover:text-rose-400 transition-colors" />
                  <span className="text-sm text-white/90 font-bold">{song.title}</span>
                </div>
              )) : (
                <p className="text-muted-foreground w-full text-center py-8">¡Excelente! Has tocado todas las canciones de tu biblioteca.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
