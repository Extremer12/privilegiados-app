import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Music, PieChart as PieChartIcon, Activity, Clock, FileMusic, Sparkles } from "lucide-react";
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
      name: name === "otro" ? "ENGANCHADOS / OTROS" : name.toUpperCase(),
      value,
      percentage: Math.round((value / totalPlayed) * 100)
    })).sort((a, b) => b.value - a.value);

    let mostUsedKey = { key: '-', count: 0 };
    if (Object.keys(keyCounts).length > 0) {
      const top = Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0];
      mostUsedKey = { key: top[0], count: top[1] };
    }

    // Convert to array and sort
    const ranked = Object.entries(counts)
      .map(([id, count]) => {
        const song = allSongs.find((s: any) => s.id === id);
        return {
          id,
          title: song?.title || "Desconocida",
          category: song?.category || "otro",
          count,
          percentage: Math.round((count / Math.max(...Object.values(counts))) * 100)
        };
      })
      .sort((a, b) => b.count - a.count);

    const playedIds = new Set(Object.keys(counts));
    const unused = allSongs.filter((s: any) => !playedIds.has(s.id)).slice(0, 15);

    return { topSongs: ranked.slice(0, 10), unusedSongs: unused, categoryData: catData, totalPlayed, mostUsedKey };
  }, [data]);

  const COLORS = ['#d9a032', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#64748B'];

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-[2rem] bg-card border border-border/80 shadow-md flex items-center justify-between group hover:shadow-lg transition-all"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Frecuencia Total</p>
            <h3 className="text-3xl font-black text-foreground">{totalPlayed}</h3>
            <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Reproducciones</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-6 rounded-[2rem] bg-card border border-border/80 shadow-md flex items-center justify-between group hover:shadow-lg transition-all"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Tonalidad Común</p>
            <h3 className="text-3xl font-black text-foreground">{mostUsedKey.key}</h3>
            <span className="text-[10px] font-extrabold text-secondary bg-secondary/15 px-2 py-0.5 rounded-full">{mostUsedKey.count} Veces tocada</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <FileMusic className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-[2rem] bg-card border border-border/80 shadow-md flex items-center justify-between group hover:shadow-lg transition-all"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Sin Debut en Vivo</p>
            <h3 className="text-3xl font-black text-foreground">{unusedSongs.length}</h3>
            <span className="text-[10px] font-extrabold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">En biblioteca</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Top Songs Ranking */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="p-6 md:p-8 rounded-[2.5rem] border border-border/80 bg-card shadow-md flex flex-col justify-between"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="p-3 bg-secondary/15 rounded-2xl text-secondary">
              <TrendingUp className="w-5.5 h-5.5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">Top 10 Canciones</h2>
              <p className="text-xs text-muted-foreground font-semibold">Las obras musicales más utilizadas por el equipo</p>
            </div>
          </div>

          <div className="space-y-5 flex-1">
            {topSongs.map((song, i) => (
              <div key={song.id} className="relative group">
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center text-[11px] font-black text-muted-foreground group-hover:bg-secondary group-hover:text-primary-foreground transition-colors shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-foreground text-sm truncate group-hover:text-secondary transition-colors">{song.title}</p>
                      <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">{song.category}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-4">
                    <span className="text-base font-black text-foreground">{song.count}</span>
                    <span className="text-[9px] uppercase font-bold text-secondary ml-1">Veces</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${song.percentage}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="h-full bg-gradient-to-r from-secondary to-amber-500 rounded-full shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Column: Balance of Genres & Unused Songs */}
        <div className="space-y-6 flex flex-col justify-between">
          {/* Genre Balance Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-6 md:p-8 rounded-[2.5rem] border border-border/80 bg-card shadow-md flex flex-col"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <PieChartIcon className="w-5.5 h-5.5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">Balance de Géneros</h2>
                <p className="text-xs text-muted-foreground font-semibold">Distribución porcentual de categorías</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-4">
              <div className="w-44 h-44 shrink-0 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={6}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={6}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                      itemStyle={{ color: 'var(--foreground)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text inside donut chart */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Total</span>
                  <span className="text-xl font-black text-foreground mt-1">{totalPlayed}</span>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 gap-2.5 w-full">
                {categoryData.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between bg-muted/40 p-2.5 rounded-xl border border-border/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider truncate max-w-[120px]">{cat.name}</span>
                    </div>
                    <span className="text-xs font-bold text-foreground shrink-0">{cat.percentage}% ({cat.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Unused Songs Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="p-6 md:p-8 rounded-[2.5rem] border border-rose-500/20 bg-rose-500/[0.03] shadow-md"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                <AlertTriangle className="w-5.5 h-5.5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">Repertorio en Espera</h2>
                <p className="text-xs text-rose-500/70 font-semibold">Canciones cargadas que aún no debutaron en vivo</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto no-scrollbar pr-1">
              {unusedSongs.length > 0 ? unusedSongs.map((song: any) => (
                <div key={song.id} className="bg-card border border-border/80 px-3 py-2 rounded-xl flex items-center gap-2 group hover:border-rose-500/30 transition-all">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                  <span className="text-xs text-foreground font-bold">{song.title}</span>
                </div>
              )) : (
                <p className="text-muted-foreground text-xs text-center py-6 w-full font-bold">¡Excelente! Has tocado todo el repertorio en vivo.</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
