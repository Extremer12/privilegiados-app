import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Music, Star, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";

export const DashboardOverview = ({ data }: { data: any }) => {
  const stats = useMemo(() => {
    const { reports, songsPlayed } = data;
    
    // Total services
    const totalServices = reports.length;
    
    // Average rating
    const ratings = reports.flatMap((r: any) => r.service_ratings.map((sr: any) => sr.rating));
    const avgRating = ratings.length > 0 
      ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1)
      : "N/A";
      
    // Average attendance
    const attendance = reports.map((r: any) => r.attendance_count).filter(Boolean);
    const avgAttendance = attendance.length > 0
      ? Math.round(attendance.reduce((a: number, b: number) => a + b, 0) / attendance.length)
      : 0;

    // Top song of the month
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentSongs = songsPlayed.filter((s: any) => new Date(s.service_reports.service_date) >= last30Days);
    const songCounts = recentSongs.reduce((acc: any, s: any) => {
      if (s.songs) {
        acc[s.songs.title] = (acc[s.songs.title] || 0) + 1;
      }
      return acc;
    }, {});
    
    const topSong = Object.entries(songCounts).sort((a: any, b: any) => b[1] - a[1])[0] || ["Ninguna", 0];

    return { totalServices, avgRating, avgAttendance, topSong: topSong[0], topSongCount: topSong[1] };
  }, [data]);

  // Generate Insights
  const insights = useMemo(() => {
    const messages = [];
    const { allSongs, songsPlayed } = data;
    
    // 1. Unused songs insight
    const playedSongIds = new Set(songsPlayed.map((s: any) => s.song_id));
    const unusedSongs = allSongs.filter((s: any) => !playedSongIds.has(s.id));
    if (unusedSongs.length > 0) {
      messages.push({
        type: "warning",
        title: "Repertorio estancado",
        text: `Hay ${unusedSongs.length} canciones en la base de datos que nunca se han tocado. Considera refrescar el repertorio.`
      });
    }

    // 2. High rating insight
    const recentRatings = data.reports.slice(0, 3).flatMap((r: any) => r.service_ratings.map((sr: any) => sr.rating));
    if (recentRatings.length > 0 && recentRatings.every((r: number) => r >= 4)) {
      messages.push({
        type: "success",
        title: "¡Excelente trabajo!",
        text: "Los últimos 3 cultos han recibido calificaciones excelentes. ¡Sigan así!"
      });
    }

    // 3. Improvised songs
    const improvisedCount = data.songsPlayed.filter((s: any) => s.was_improvised).length;
    if (improvisedCount > 5) {
      messages.push({
        type: "info",
        title: "Alta improvisación",
        text: `Se han improvisado ${improvisedCount} canciones históricamente. Esto muestra flexibilidad, pero trata de planificar con anticipación.`
      });
    }

    return messages.length > 0 ? messages : [{
      type: "info", title: "Acumulando datos", text: "Registra más cultos para obtener mejores insights."
    }];
  }, [data]);

  const statCards = [
    { title: "Cultos Totales", value: stats.totalServices, icon: Music, color: "text-blue-400", bg: "bg-blue-400/10" },
    { title: "Promedio Asistencia", value: stats.avgAttendance, icon: Users, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "Valoración General", value: `${stats.avgRating} / 5`, icon: Star, color: "text-amber-400", bg: "bg-amber-400/10" },
    { title: "Canción del Mes", value: stats.topSong, sub: `${stats.topSongCount} veces`, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-400/10" },
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
            className="p-6 rounded-3xl relative overflow-hidden"
            style={{
              background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
              border: "1px solid hsl(217 33% 25% / 0.5)",
            }}
          >
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                <h3 className="text-2xl font-bold text-white truncate max-w-[150px]">{stat.value}</h3>
                {stat.sub && <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>}
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
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
            transition={{ delay: 0.3 + (i * 0.1) }}
            key={i}
            className={`p-5 rounded-2xl border ${
              insight.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20' :
              insight.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
              'bg-blue-500/10 border-blue-500/20'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              {insight.type === 'warning' && <AlertCircle className="w-5 h-5 text-orange-400" />}
              {insight.type === 'success' && <Star className="w-5 h-5 text-emerald-400" />}
              {insight.type === 'info' && <Lightbulb className="w-5 h-5 text-blue-400" />}
              <h4 className="font-bold text-white">{insight.title}</h4>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">{insight.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
