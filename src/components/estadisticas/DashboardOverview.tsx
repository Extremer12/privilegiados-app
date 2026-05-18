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
    <div className="space-y-6">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="p-6 rounded-3xl relative overflow-hidden group"
            style={{
              background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
              border: "1px solid hsl(217 33% 25% / 0.5)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                <h3 className="text-3xl font-black text-white tracking-tight truncate max-w-[150px]">{stat.value}</h3>
                {stat.sub && <p className="text-xs text-secondary mt-1 font-bold">{stat.sub}</p>}
              </div>
              <div className={`p-3 rounded-2xl ${stat.bg} shadow-inner`}>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Musical Keys Distribution */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 p-6 rounded-3xl border border-white/10"
          style={{ background: "linear-gradient(180deg, hsl(217 33% 12%) 0%, hsl(222 47% 6%) 100%)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-secondary" /> Distribución de Tonos
              </h2>
              <p className="text-sm text-muted-foreground">Tonos más utilizados en los últimos servicios</p>
            </div>
          </div>
          
          <div className="space-y-5">
            {stats.topKeys.length > 0 ? stats.topKeys.map((item, i) => (
              <div key={item.key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-white">{item.key}</span>
                  <span className="text-muted-foreground">{item.count} veces</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.count / stats.topKeys[0].count) * 100}%` }}
                    className="h-full bg-secondary shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                  />
                </div>
              </div>
            )) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground italic">
                No hay datos de tonos registrados aún.
              </div>
            )}
          </div>
        </motion.div>

        {/* Team Momentum / Streaks */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-3xl border border-white/10"
          style={{ background: "linear-gradient(180deg, hsl(217 33% 12%) 0%, hsl(222 47% 6%) 100%)" }}
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> Racha de Servicio
          </h2>
          <div className="space-y-4">
            {stats.topStreaks.length > 0 ? stats.topStreaks.map(([name, count]: any, i: number) => (
              <div
                key={name}
                className="flex items-center justify-between group bg-white/5 p-3 rounded-2xl border border-white/5 transition-all hover:border-secondary/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center font-bold text-secondary text-sm">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {name.split(' ')[0]}
                    </h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                      Presente
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-white">{count}</span>
                  <span className="text-[10px] text-secondary ml-1 font-bold">CULTOS</span>
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground text-center py-4">Sin datos de racha.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Song Momentum Section */}
      <h2 className="text-xl font-bold text-white mt-8 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-secondary" /> Momentum de Canciones
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.trendingSongs.map(([title, count]: any, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + (i * 0.1) }}
            key={title}
            className="p-5 rounded-3xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary">
                <Music className="w-5 h-5" />
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">EN TENDENCIA</Badge>
            </div>
            <h4 className="font-bold text-white text-lg truncate group-hover:text-secondary transition-colors">{title}</h4>
            <p className="text-sm text-muted-foreground mt-1">Tocada <span className="text-white font-bold">{count} veces</span> en los últimos 30 días</p>
          </motion.div>
        ))}
      </div>

      {/* Insights Section */}
      <h2 className="text-xl font-bold text-white mt-8 mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-secondary" /> Insights Inteligentes
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + (i * 0.1) }}
            key={i}
            className={`p-6 rounded-3xl border shadow-lg relative overflow-hidden group ${
              insight.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20' :
              insight.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
              'bg-blue-500/10 border-blue-500/20'
            }`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-40 rounded-full ${
              insight.type === 'warning' ? 'bg-orange-500' :
              insight.type === 'success' ? 'bg-emerald-500' :
              'bg-blue-500'
            }`} />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl ${
                  insight.type === 'warning' ? 'bg-orange-500/20 text-orange-400' :
                  insight.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {insight.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                  {insight.type === 'success' && <Star className="w-5 h-5" />}
                  {insight.type === 'info' && <Lightbulb className="w-5 h-5" />}
                </div>
                <h4 className="font-bold text-white text-lg tracking-tight">{insight.title}</h4>
              </div>
              <p className="text-sm text-white/70 leading-relaxed font-medium">{insight.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
