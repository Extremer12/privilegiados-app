import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users, Music, TrendingUp, AlertCircle, Lightbulb,
  Trophy, Activity, Calendar as CalendarIcon, Star,
  Flame, Zap
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const DashboardOverview = ({ data }: { data: any }) => {
  const stats = useMemo(() => {
    const { reports, songsPlayed, participants } = data;

    const totalServices = reports.length;
    const uniqueParticipants = new Set(participants.map((p: any) => p.user_id || p.participant_name)).size;
    const totalSongsPlayed = songsPlayed.length;
    const uniqueSongs = new Set(songsPlayed.map((s: any) => s.song_id)).size;

    // Musical Keys Distribution
    const keysMap = songsPlayed.reduce((acc: any, s: any) => {
      if (s.key_played) acc[s.key_played] = (acc[s.key_played] || 0) + 1;
      return acc;
    }, {});
    const topKeys = Object.entries(keysMap)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({ key, count }));

    // Monthly chart data
    const monthMap: Record<string, number> = {};
    reports.forEach((r: any) => {
      try {
        const month = format(new Date(r.service_date), 'MMM', { locale: es });
        monthMap[month] = (monthMap[month] || 0) + 1;
      } catch {}
    });
    const chartData = Object.entries(monthMap).slice(-6).map(([month, count]) => ({ month, count }));

    // Team Streaks
    const sortedReports = [...reports].sort((a: any, b: any) =>
      new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
    );
    const streaks: Record<string, { count: number; avatar?: string }> = {};

    if (sortedReports.length > 0) {
      const lastServiceId = sortedReports[0].id;
      participants
        .filter((p: any) => p.service_report_id === lastServiceId)
        .forEach((p: any) => {
          const name = p.profiles?.full_name || p.participant_name;
          if (!name) return;
          let count = 0;
          for (const report of sortedReports) {
            const wasPresent = participants.some(
              (part: any) =>
                part.service_report_id === report.id &&
                (part.profiles?.full_name === name || part.participant_name === name)
            );
            if (wasPresent) count++;
            else break;
          }
          streaks[name] = { count, avatar: p.profiles?.avatar_url };
        });
    }
    const topStreaks = Object.entries(streaks)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3);

    // Trending songs (last 30 days)
    const recent30Days = new Date();
    recent30Days.setDate(recent30Days.getDate() - 30);
    const recentSongs = songsPlayed.filter(
      (s: any) => new Date(s.service_reports?.service_date) >= recent30Days
    );
    const songTrend = recentSongs.reduce((acc: any, s: any) => {
      if (s.songs) acc[s.songs.title] = (acc[s.songs.title] || 0) + 1;
      return acc;
    }, {});
    const trendingSongs = Object.entries(songTrend)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3);

    return { totalServices, uniqueParticipants, totalSongsPlayed, uniqueSongs, topKeys, topStreaks, trendingSongs, chartData };
  }, [data]);

  // Insights
  const insights = useMemo(() => {
    const messages = [];
    const { allSongs, songsPlayed, reports } = data;

    const playedSongIds = new Set(songsPlayed.map((s: any) => s.song_id));
    const unusedPercentage = Math.round(((allSongs.length - playedSongIds.size) / (allSongs.length || 1)) * 100);

    if (unusedPercentage > 40) {
      messages.push({
        type: "warning",
        title: "Repertorio Estancado",
        text: `El ${unusedPercentage}% de tus canciones no se han tocado nunca. ¡Es hora de renovar!`,
        icon: AlertCircle
      });
    }

    const recent30Days = new Date();
    recent30Days.setDate(recent30Days.getDate() - 30);
    const newSongsCount = allSongs.filter((s: any) => new Date(s.created_at) >= recent30Days).length;
    if (newSongsCount > 0) {
      messages.push({
        type: "success",
        title: "Crecimiento Musical",
        text: `Agregaron ${newSongsCount} canciones nuevas este mes. ¡Sigan ampliando el repertorio!`,
        icon: Star
      });
    }

    const topKey = stats.topKeys[0];
    if (topKey && (topKey.count as number) / (songsPlayed.length || 1) > 0.4) {
      messages.push({
        type: "info",
        title: "Diversidad Tonal",
        text: `El ${Math.round(((topKey.count as number) / songsPlayed.length) * 100)}% en ${topKey.key}. Intenta variar más las tonalidades.`,
        icon: Lightbulb
      });
    }

    return messages.length > 0 ? messages : [{
      type: "info",
      title: "Acumulando datos",
      text: "Registra más cultos para obtener mejores insights y recomendaciones del equipo.",
      icon: Lightbulb
    }];
  }, [data, stats]);

  const statCards = [
    { title: "Servicios", value: stats.totalServices, icon: CalendarIcon, color: "text-blue-400", bg: "bg-blue-400/10", gradient: "from-blue-500/20 to-transparent" },
    { title: "Canciones únicas", value: stats.uniqueSongs, icon: Music, color: "text-purple-400", bg: "bg-purple-400/10", gradient: "from-purple-500/20 to-transparent" },
    { title: "Reproducciones", value: stats.totalSongsPlayed, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-400/10", gradient: "from-emerald-500/20 to-transparent" },
    { title: "Miembros activos", value: stats.uniqueParticipants, icon: Users, color: "text-amber-400", bg: "bg-amber-400/10", gradient: "from-amber-500/20 to-transparent" },
  ];

  const insightStyles = {
    warning: { border: "border-orange-500/20", bg: "bg-orange-500/5", icon: "bg-orange-500/15 text-orange-500", glow: "bg-orange-500" },
    success: { border: "border-emerald-500/20", bg: "bg-emerald-500/5", icon: "bg-emerald-500/15 text-emerald-500", glow: "bg-emerald-500" },
    info:    { border: "border-blue-500/20",    bg: "bg-blue-500/5",    icon: "bg-blue-500/15 text-blue-400",    glow: "bg-blue-500" },
  };

  return (
    <div className="space-y-8">
      {/* ── Hero Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 260, damping: 24 }}
            className="relative overflow-hidden p-6 rounded-3xl bg-card border border-border/80 shadow-md group hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br ${stat.gradient}`} />
            <div className="relative z-10">
              <div className={`w-11 h-11 rounded-2xl ${stat.bg} flex items-center justify-center mb-4`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{stat.title}</p>
              <h3 className="text-3xl font-black text-foreground tracking-tight">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Services Chart + Streaks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 p-6 md:p-8 rounded-[2.5rem] border border-border/80 bg-card shadow-md"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-secondary/10 rounded-2xl">
              <TrendingUp className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">Actividad por Mes</h2>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Cultos registrados en los últimos meses</p>
            </div>
          </div>

          {stats.chartData.length > 1 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(48 100% 50%)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(48 100% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Cultos"
                    stroke="hsl(48 100% 50%)"
                    strokeWidth={2.5}
                    fill="url(#areaGrad)"
                    dot={{ r: 4, fill: 'hsl(48 100% 50%)', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: 'hsl(48 100% 50%)', strokeWidth: 2, stroke: 'var(--background)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-muted-foreground text-sm italic">
              Registra más cultos para ver el gráfico de actividad.
            </div>
          )}

          {/* Musical Keys mini section */}
          {stats.topKeys.length > 0 && (
            <div className="mt-6 pt-5 border-t border-border/50">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Tonalidades frecuentes</p>
              <div className="flex flex-wrap gap-2">
                {stats.topKeys.map((item, i) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60"
                  >
                    <span className="text-xs font-black text-foreground">{item.key}</span>
                    <span className="text-[9px] text-secondary font-bold">{item.count as number}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Streaks */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="p-6 md:p-8 rounded-[2.5rem] border border-border/80 bg-card shadow-md flex flex-col"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">Racha Activa</h2>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Constancia del equipo</p>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            {stats.topStreaks.length > 0 ? stats.topStreaks.map(([name, info]: any, i: number) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/50 hover:border-secondary/20 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-9 h-9 border-2 border-secondary/20 shrink-0">
                    <AvatarImage src={info.avatar || undefined} className="object-cover" />
                    <AvatarFallback className="bg-secondary/20 text-secondary font-black text-xs">
                      {name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-foreground text-sm truncate">{name.split(' ')[0]}</h4>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Consecutivos</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <div className="flex items-center gap-1 justify-end">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xl font-black text-foreground leading-none">{info.count}</span>
                  </div>
                  <span className="text-[9px] text-secondary font-bold uppercase">SERVS</span>
                </div>
              </motion.div>
            )) : (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm italic">Sin datos de racha aún.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Song Momentum (Trending Last 30 days) ── */}
      {stats.trendingSongs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <Zap className="w-5 h-5 text-secondary" />
            <h2 className="text-xl font-black text-foreground">En Tendencia Este Mes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.trendingSongs.map(([title, count]: any, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="relative overflow-hidden p-5 rounded-3xl border border-border bg-card hover:bg-muted/30 transition-all group hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-all" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-secondary/15 text-secondary">
                      <Music className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <Flame className="w-2.5 h-2.5 text-emerald-500" />
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Trend</span>
                    </div>
                  </div>
                  <h4 className="font-black text-foreground text-base truncate group-hover:text-secondary transition-colors leading-tight mb-2">{title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-extrabold">{count} {count === 1 ? 'vez' : 'veces'}</span> en los últimos 30 días
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Insights Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div className="flex items-center gap-2.5 mb-5">
          <Lightbulb className="w-5 h-5 text-secondary" />
          <h2 className="text-xl font-black text-foreground">Insights Inteligentes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, i) => {
            const style = insightStyles[insight.type as keyof typeof insightStyles] || insightStyles.info;
            const Icon = insight.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className={`relative overflow-hidden p-6 rounded-[2rem] border shadow-md group ${style.border} ${style.bg}`}
              >
                <div className={`absolute top-0 right-0 w-20 h-20 blur-3xl opacity-10 group-hover:opacity-25 transition-opacity rounded-full ${style.glow}`} />
                <div className="relative z-10 space-y-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${style.icon}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="font-extrabold text-foreground text-base">{insight.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">{insight.text}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
