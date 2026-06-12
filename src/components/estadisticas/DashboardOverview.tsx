import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Music, Star, TrendingUp, AlertCircle, Lightbulb, Trophy, Activity, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const DashboardOverview = ({ data }: { data: any }) => {
  const stats = useMemo(() => {
    const { reports, songsPlayed, participants } = data;
    
    // 1. Total services
    const totalServices = reports.length;
    
    // 2. Unique Participants
    const uniqueParticipants = new Set(participants.map((p: any) => p.user_id || p.participant_name)).size;
      
    // 3. Total Songs Played
    const totalSongsPlayed = songsPlayed.length;

    // 4. Musical Keys Distribution
    const keysMap = songsPlayed.reduce((acc: any, s: any) => {
      if (s.key_played) acc[s.key_played] = (acc[s.key_played] || 0) + 1;
      return acc;
    }, {});
    const topKeys = Object.entries(keysMap)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({ key, count }));

    // 5. Team Streaks (Consecutive services)
    const sortedReports = [...reports].sort((a: any, b: any) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime());
    const streaks: Record<string, number> = {};
    
    if (sortedReports.length > 0) {
      const lastServiceId = sortedReports[0].id;
      participants.filter((p: any) => p.service_report_id === lastServiceId).forEach((p: any) => {
        const name = p.profiles?.full_name || p.participant_name;
        let count = 0;
        for (const report of sortedReports) {
          const wasPresent = participants.some((part: any) => part.service_report_id === report.id && (part.profiles?.full_name === name || part.participant_name === name));
          if (wasPresent) count++;
          else break;
        }
        streaks[name] = count;
      } );
    }
    const topStreaks = Object.entries(streaks).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // 6. Song Momentum (Trending)
    const recent30Days = new Date();
    recent30Days.setDate(recent30Days.getDate() - 30);
    const recentSongs = songsPlayed.filter((s: any) => new Date(s.service_reports?.service_date) >= recent30Days);
    const songTrend = recentSongs.reduce((acc: any, s: any) => {
      if (s.songs) acc[s.songs.title] = (acc[s.songs.title] || 0) + 1;
      return acc;
    }, {});
    const trendingSongs = Object.entries(songTrend).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3);

    return { totalServices, uniqueParticipants, totalSongsPlayed, topKeys, topStreaks, trendingSongs };
  }, [data]);

  // Generate Insights
  const insights = useMemo(() => {
    const messages = [];
    const { allSongs, songsPlayed, reports } = data;
    
    // 1. Repertoire Health
    const playedSongIds = new Set(songsPlayed.map((s: any) => s.song_id));
    const unusedPercentage = Math.round(( (allSongs.length - playedSongIds.size) / (allSongs.length || 1) ) * 100);
    if (unusedPercentage > 40) {
      messages.push({
        type: "warning",
        title: "Repertorio Estancado",
        text: `El ${unusedPercentage}% de tus canciones no se han tocado nunca. ¡Es hora de renovar!`
      });
    }

    // 2. New Songs Added
    const recent30Days = new Date();
    recent30Days.setDate(recent30Days.getDate() - 30);
    const newSongsCount = allSongs.filter((s: any) => new Date(s.created_at) >= recent30Days).length;
    if (newSongsCount > 0) {
      messages.push({
        type: "success",
        title: "Crecimiento Musical",
        text: `Has agregado ${newSongsCount} canciones nuevas este mes. ¡Sigan ampliando el repertorio!`
      });
    }

    // 3. Top Key Usage
    const topKey = stats.topKeys[0];
    if (topKey && (topKey.count / (songsPlayed.length || 1)) > 0.4) {
      messages.push({
        type: "info",
        title: "Diversidad Tonal",
        text: `El ${Math.round((topKey.count / songsPlayed.length) * 100)}% de las canciones están en ${topKey.key}. Intenta variar más las tonalidades.`
      });
    }

    return messages.length > 0 ? messages : [{
      type: "info", title: "Acumulando datos", text: "Registra más cultos para obtener mejores insights."
    }];
  }, [data]);

  const statCards = [
    { title: "Servicios Realizados", value: stats.totalServices, icon: CalendarIcon, color: "text-blue-400", bg: "bg-blue-400/10" },
    { title: "Canciones Diferentes", value: new Set(data.songsPlayed.map((s: any) => s.song_id)).size, icon: Music, color: "text-purple-400", bg: "bg-purple-400/10" },
    { title: "Reproducciones Totales", value: stats.totalSongsPlayed, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "Miembros Activos", value: stats.uniqueParticipants, icon: Users, color: "text-amber-400", bg: "bg-amber-400/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            key={i}
            className="p-6 rounded-[2rem] relative overflow-hidden group bg-card border border-border/80 shadow-md hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                <h3 className="text-3xl font-black text-foreground tracking-tight">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-2xl ${stat.bg} shrink-0`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            {/* Soft decorative bottom accent bar */}
            <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-secondary/35 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Musical Keys Distribution */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2 p-6 md:p-8 rounded-[2.5rem] border border-border/80 bg-card shadow-md flex flex-col justify-between"
        >
          <div className="mb-6">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2.5">
              <Music className="w-5.5 h-5.5 text-secondary" /> Distribución de Tonos
            </h2>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">Tonalidades recurrentes en tus servicios musicales</p>
          </div>
          
          <div className="space-y-5 flex-1 flex flex-col justify-center">
            {stats.topKeys.length > 0 ? stats.topKeys.map((item, i) => (
              <div key={item.key} className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-foreground">{item.key}</span>
                  <span className="text-muted-foreground">{item.count} {item.count === 1 ? 'vez' : 'veces'}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${(item.count / stats.topKeys[0].count) * 100}%` }}
                     transition={{ duration: 0.8, delay: i * 0.05 }}
                     className="h-full bg-gradient-to-r from-secondary to-amber-500 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                  />
                </div>
              </div>
            )) : (
              <div className="py-12 flex items-center justify-center text-muted-foreground text-sm italic">
                No hay datos de tonos registrados aún.
              </div>
            )}
          </div>
        </motion.div>

        {/* Team Momentum / Streaks */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="p-6 md:p-8 rounded-[2.5rem] border border-border/80 bg-card shadow-md flex flex-col justify-between"
        >
          <div className="mb-6">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2.5">
              <Trophy className="w-5.5 h-5.5 text-secondary" /> Racha Activa
            </h2>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1 font-mono">Constancia del equipo</p>
          </div>

          <div className="space-y-4">
            {stats.topStreaks.length > 0 ? stats.topStreaks.map(([name, count]: any, i: number) => (
              <div
                key={name}
                className="flex items-center justify-between bg-muted/40 p-4 rounded-2xl border border-border/60 transition-all hover:border-secondary/25 group hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center font-black text-secondary text-sm">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-foreground text-sm">
                      {name.split(' ')[0]}
                    </h4>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                      Asistencia consecutiva
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-foreground">{count}</span>
                  <span className="text-[9px] text-secondary ml-1 font-bold">SERVS</span>
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground text-center text-sm py-8 italic">Sin datos de racha.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Song Momentum Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2.5">
            <TrendingUp className="w-5.5 h-5.5 text-secondary" /> Momentum de Canciones
          </h2>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">Canciones con más recurrencia en el último mes</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {stats.trendingSongs.map(([title, count]: any, i) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 + (i * 0.08) }}
              key={title}
              className="p-5 rounded-3xl border border-border bg-card hover:bg-muted/40 transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-secondary/15 text-secondary">
                  <Music className="w-5 h-5" />
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase tracking-wider">TENDENCIA</Badge>
              </div>
              <div>
                <h4 className="font-black text-foreground text-base truncate group-hover:text-secondary transition-colors">{title}</h4>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Interpretada <span className="text-foreground font-extrabold">{count} {count === 1 ? 'vez' : 'veces'}</span> en los últimos 30 días
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Insights Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2.5">
            <Lightbulb className="w-5.5 h-5.5 text-secondary" /> Insights Inteligentes
          </h2>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">Análisis automatizado para mejorar tus planificaciones</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {insights.map((insight, i) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 + (i * 0.08) }}
              key={i}
              className={`p-6 rounded-[2rem] border shadow-md relative overflow-hidden group ${
                insight.type === 'warning' ? 'bg-orange-500/[0.06] border-orange-500/20' :
                insight.type === 'success' ? 'bg-emerald-500/[0.06] border-emerald-500/20' :
                'bg-blue-500/[0.06] border-blue-500/20'
              }`}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 transition-opacity duration-500 group-hover:opacity-25 rounded-full ${
                insight.type === 'warning' ? 'bg-orange-500' :
                insight.type === 'success' ? 'bg-emerald-500' :
                'bg-blue-500'
              }`} />
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    insight.type === 'warning' ? 'bg-orange-500/15 text-orange-500 dark:text-orange-400' :
                    insight.type === 'success' ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400' :
                    'bg-blue-500/15 text-blue-500 dark:text-blue-400'
                  }`}>
                    {insight.type === 'warning' && <AlertCircle className="w-4.5 h-4.5" />}
                    {insight.type === 'success' && <Star className="w-4.5 h-4.5" />}
                    {insight.type === 'info' && <Lightbulb className="w-4.5 h-4.5" />}
                  </div>
                  <h4 className="font-extrabold text-foreground text-base tracking-tight">{insight.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed font-semibold">{insight.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
