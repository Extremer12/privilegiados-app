import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, AlertTriangle, Music, PieChart as PieChartIcon,
  Activity, Clock, Sparkles, Trophy, Flame, Crown, Star
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  alabanza:  { bg: "bg-amber-500/15",  text: "text-amber-500",  badge: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  adoracion: { bg: "bg-purple-500/15", text: "text-purple-400", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  especial:  { bg: "bg-blue-500/15",   text: "text-blue-400",   badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  enganchado:{ bg: "bg-rose-500/15",   text: "text-rose-400",   badge: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  otro:      { bg: "bg-slate-500/15",  text: "text-slate-400",  badge: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

const CHART_COLORS = ['#d9a032', '#8B5CF6', '#3B82F6', '#F43F5E', '#64748B', '#10B981'];

const RANK_ICONS = [Crown, Trophy, Star];
const RANK_COLORS = ["text-amber-400", "text-slate-400", "text-amber-700"];

export const SongsRanking = ({ data }: { data: any }) => {
  const [hoveredSong, setHoveredSong] = useState<string | null>(null);

  const { topSongs, unusedSongs, categoryData, totalPlayed, mostUsedKey, totalUnique } = useMemo(() => {
    const { songsPlayed, allSongs } = data;

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
    const totalUnique = Object.keys(counts).length;

    const catData = Object.entries(categoryCounts).map(([name, value]) => ({
      name: name === "enganchado" ? "ENGANCHADOS" : name === "otro" ? "OTROS" : name.toUpperCase(),
      rawName: name,
      value,
      percentage: Math.round((value / totalPlayed) * 100)
    })).sort((a, b) => b.value - a.value);

    let mostUsedKey = { key: '-', count: 0 };
    if (Object.keys(keyCounts).length > 0) {
      const top = Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0];
      mostUsedKey = { key: top[0], count: top[1] };
    }

    const maxCount = Math.max(...Object.values(counts), 1);
    const ranked = Object.entries(counts)
      .map(([id, count]) => {
        const song = allSongs.find((s: any) => s.id === id);
        return {
          id,
          title: song?.title || "Desconocida",
          category: song?.category || "otro",
          count,
          percentage: Math.round((count / maxCount) * 100)
        };
      })
      .sort((a, b) => b.count - a.count);

    const playedIds = new Set(Object.keys(counts));
    const unused = allSongs.filter((s: any) => !playedIds.has(s.id)).slice(0, 20);

    return { topSongs: ranked.slice(0, 10), unusedSongs: unused, categoryData: catData, totalPlayed, mostUsedKey, totalUnique };
  }, [data]);

  const topThree = topSongs.slice(0, 3);
  const restSongs = topSongs.slice(3);

  return (
    <div className="space-y-8">
      {/* ── Hero Metrics Bar ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Reproducciones", value: totalPlayed, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10", glow: "shadow-emerald-500/20" },
          { label: "Tonalidad líder", value: mostUsedKey.key, icon: Music, color: "text-secondary", bg: "bg-secondary/10", glow: "shadow-secondary/20", sub: `${mostUsedKey.count} veces` },
          { label: "Sin debut", value: unusedSongs.length, icon: Clock, color: "text-rose-400", bg: "bg-rose-500/10", glow: "shadow-rose-500/20" },
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 260, damping: 25 }}
            className={`relative p-5 rounded-3xl bg-card border border-border/80 shadow-lg ${m.glow} overflow-hidden group hover:-translate-y-1 transition-transform duration-300`}
          >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-transparent to-current`} style={{ opacity: 0 }} />
            <div className={`w-11 h-11 rounded-2xl ${m.bg} flex items-center justify-center mb-3`}>
              <m.icon className={`w-5 h-5 ${m.color}`} />
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{m.label}</p>
            <h3 className="text-2xl font-black text-foreground tracking-tight">{m.value}</h3>
            {m.sub && <span className={`text-[10px] font-bold ${m.color} mt-0.5 block`}>{m.sub}</span>}
          </motion.div>
        ))}
      </div>

      {/* ── Podium: Top 3 ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-secondary/15 bg-gradient-to-br from-secondary/5 via-card to-card p-6 md:p-8 shadow-xl"
      >
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-7">
            <div className="p-3 bg-secondary/15 rounded-2xl">
              <Crown className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">Top 3 Canciones del Equipo</h2>
              <p className="text-xs text-muted-foreground font-semibold">Las obras más interpretadas en servicios en vivo</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topThree.map((song, i) => {
              const RankIcon = RANK_ICONS[i];
              const catStyle = CATEGORY_COLORS[song.category] || CATEGORY_COLORS.otro;
              const isHovered = hoveredSong === song.id;
              return (
                <motion.div
                  key={song.id}
                  onMouseEnter={() => setHoveredSong(song.id)}
                  onMouseLeave={() => setHoveredSong(null)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 240 }}
                  className={`relative p-5 rounded-3xl border transition-all duration-300 cursor-default ${
                    i === 0
                      ? "border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5"
                      : "border-border/70 bg-card"
                  } ${isHovered ? "shadow-xl -translate-y-1" : "shadow-md"}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-2xl ${catStyle.bg} flex items-center justify-center`}>
                      <Music className={`w-5 h-5 ${catStyle.text}`} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RankIcon className={`w-5 h-5 ${RANK_COLORS[i]}`} />
                      <span className={`text-sm font-black ${RANK_COLORS[i]}`}>#{i + 1}</span>
                    </div>
                  </div>
                  <h3 className="font-black text-foreground text-base leading-tight line-clamp-2 mb-2">{song.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wider border rounded-full px-2 py-0.5 ${catStyle.badge}`}>
                      {song.category}
                    </span>
                    <div className="text-right">
                      <span className="text-xl font-black text-foreground">{song.count}</span>
                      <span className="text-[9px] text-muted-foreground ml-1 font-bold uppercase">veces</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${song.percentage}%` }}
                      transition={{ duration: 1, delay: 0.4 + i * 0.1 }}
                      className="h-full bg-gradient-to-r from-secondary to-amber-400 rounded-full"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Ranking 4-10 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-[2.5rem] border border-border/80 bg-card shadow-md"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-secondary/10 rounded-2xl">
              <TrendingUp className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">Ranking Completo</h2>
              <p className="text-xs text-muted-foreground font-semibold">Posiciones 4 al 10</p>
            </div>
          </div>
          <div className="space-y-3">
            {restSongs.map((song, i) => {
              const catStyle = CATEGORY_COLORS[song.category] || CATEGORY_COLORS.otro;
              return (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-all"
                >
                  <div className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center text-[11px] font-black text-muted-foreground group-hover:bg-secondary group-hover:text-primary-foreground transition-colors shrink-0">
                    {i + 4}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate group-hover:text-secondary transition-colors">{song.title}</p>
                    <div className="mt-1.5 h-1 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${song.percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                        className="h-full bg-gradient-to-r from-secondary/70 to-amber-500/70 rounded-full"
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-foreground">{song.count}</span>
                    <span className={`text-[9px] uppercase font-bold ml-1 ${catStyle.text}`}>v.</span>
                  </div>
                </motion.div>
              );
            })}
            {restSongs.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-6 italic">Pocos datos aún. ¡Sigan tocando!</p>
            )}
          </div>
        </motion.div>

        {/* ── Genre Distribution ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="p-6 rounded-[2.5rem] border border-border/80 bg-card shadow-md flex flex-col"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-500/10 rounded-2xl">
              <PieChartIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">Balance de Géneros</h2>
              <p className="text-xs text-muted-foreground font-semibold">Distribución por categoría</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
            <div className="w-40 h-40 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={6}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total</span>
                <span className="text-xl font-black text-foreground">{totalUnique}</span>
                <span className="text-[8px] text-muted-foreground font-bold">ÚNICAS</span>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 w-full">
              {categoryData.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-2.5 group">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-foreground font-bold uppercase tracking-wider truncate">{cat.name}</span>
                      <span className="text-[10px] font-black text-foreground ml-2 shrink-0">{cat.percentage}%</span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        transition={{ duration: 0.7, delay: 0.5 + i * 0.08 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold shrink-0 w-6 text-right">{cat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Unused Songs ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="p-6 md:p-8 rounded-[2.5rem] border border-rose-500/15 bg-gradient-to-br from-rose-500/5 to-card shadow-md"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-rose-500/10 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">Repertorio en Espera</h2>
            <p className="text-xs text-rose-400/80 font-semibold">
              {unusedSongs.length} {unusedSongs.length === 1 ? "canción cargada que" : "canciones cargadas que"} aún no debutaron en vivo
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto pr-1 no-scrollbar">
          {unusedSongs.length > 0 ? unusedSongs.map((song: any) => {
            const catStyle = CATEGORY_COLORS[song.category] || CATEGORY_COLORS.otro;
            return (
              <div
                key={song.id}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-card transition-all hover:shadow-md ${catStyle.badge}`}
              >
                <Sparkles className="w-3 h-3 opacity-70 shrink-0" />
                <span className="text-xs font-bold truncate max-w-[140px]">{song.title}</span>
              </div>
            );
          }) : (
            <div className="w-full flex flex-col items-center py-8 gap-2">
              <Flame className="w-8 h-8 text-rose-400" />
              <p className="text-muted-foreground text-sm font-bold">¡Increíble! Has tocado todo el repertorio en vivo.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
