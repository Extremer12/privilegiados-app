import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Music, Star, TrendingUp, AlertCircle, Lightbulb, Trophy, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

    // Health Score (0-100)
    // Formula: (Avg Rating / 5) * 50 + (Attendance stable?) * 50
    const ratingScore = ratings.length > 0 ? (Number(avgRating) / 5) * 60 : 0;
    const attendanceScore = avgAttendance > 0 ? Math.min(40, (avgAttendance / 15) * 40) : 0; // Assuming 15 is a good baseline
    const healthScore = Math.round(ratingScore + attendanceScore);

    // Chart Data (Last 10 services)
    const chartData = [...reports].reverse().slice(-10).map((r: any) => {
      const sRatings = r.service_ratings.map((sr: any) => sr.rating);
      const sAvgRating = sRatings.length > 0 ? sRatings.reduce((a: number, b: number) => a + b, 0) / sRatings.length : 0;
      return {
        date: format(new Date(r.service_date), 'MMM dd', { locale: es }),
        asistencia: r.attendance_count || 0,
        valoracion: sAvgRating * 20, // scale to 100 for chart comparison
      };
    });

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

    // Calculate Top Uploaders
    const { allSongs } = data;
    const uploadersMap = (allSongs || []).reduce((acc: any, song: any) => {
      if (song.profiles) {
        const name = song.profiles.full_name;
        if (!acc[name]) {
          acc[name] = { count: 0, profile: song.profiles };
        }
        acc[name].count += 1;
      }
      return acc;
    }, {});
    
    const topUploaders = Object.values(uploadersMap)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5); // Top 5

    return { totalServices, avgRating, avgAttendance, healthScore, chartData, topSong: topSong[0], topSongCount: topSong[1], topUploaders };
  }, [data]);

  // Generate Insights
  const insights = useMemo(() => {
    const messages = [];
    const { allSongs, songsPlayed } = data;
    
    const playedSongIds = new Set(songsPlayed.map((s: any) => s.song_id));
    const unusedSongs = allSongs.filter((s: any) => !playedSongIds.has(s.id));
    if (unusedSongs.length > 0) {
      messages.push({
        type: "warning",
        title: "Repertorio estancado",
        text: `Hay ${unusedSongs.length} canciones en la base de datos que nunca se han tocado. Considera refrescar el repertorio.`
      });
    }

    const recentRatings = data.reports.slice(0, 3).flatMap((r: any) => r.service_ratings.map((sr: any) => sr.rating));
    if (recentRatings.length > 0 && recentRatings.every((r: number) => r >= 4)) {
      messages.push({
        type: "success",
        title: "¡Excelente trabajo!",
        text: "Los últimos 3 cultos han recibido calificaciones excelentes. ¡Sigan así!"
      });
    }

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
    { title: "Salud del Ministerio", value: `${stats.healthScore}%`, icon: Activity, color: "text-rose-400", bg: "bg-rose-400/10" },
    { title: "Valoración General", value: `${stats.avgRating} / 5`, icon: Star, color: "text-amber-400", bg: "bg-amber-400/10" },
    { title: "Promedio Asistencia", value: stats.avgAttendance, icon: Users, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "Canción Top Mensual", value: stats.topSong, sub: `${stats.topSongCount} veces`, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-400/10" },
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
        {/* Trend Chart */}
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
                <TrendingUp className="w-5 h-5 text-secondary" /> Tendencia de Servicios
              </h2>
              <p className="text-sm text-muted-foreground">Evolución de asistencia y valoración (últimos 10 cultos)</p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAsistencia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorValoracion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(47.9 95.8% 53.1%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(47.9 95.8% 53.1%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="hsl(215 20.2% 65.1%)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(215 20.2% 65.1%)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(222.2 84% 4.9%)', borderColor: 'hsl(217 33% 25%)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="asistencia" stroke="hsl(142.1 76.2% 36.3%)" strokeWidth={3} fillOpacity={1} fill="url(#colorAsistencia)" />
                <Area type="monotone" dataKey="valoracion" stroke="hsl(47.9 95.8% 53.1%)" strokeWidth={3} fillOpacity={1} fill="url(#colorValoracion)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Uploaders Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-3xl border border-white/10"
          style={{ background: "linear-gradient(180deg, hsl(217 33% 12%) 0%, hsl(222 47% 6%) 100%)" }}
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> Top Contribuidores
          </h2>
          <div className="space-y-4">
            {stats.topUploaders.length > 0 ? stats.topUploaders.map((uploader: any, i: number) => (
              <div
                key={uploader.profile.full_name}
                className="flex items-center justify-between group hover:bg-white/5 p-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10 border border-white/10">
                      <AvatarImage src={uploader.profile.avatar_url || undefined} />
                      <AvatarFallback className="text-[12px] bg-secondary/20 text-secondary font-bold">
                        {uploader.profile.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {i === 0 && (
                      <div className="absolute -top-2 -right-2 bg-amber-500 rounded-full p-1 border-2 border-[#131722] shadow-lg shadow-amber-500/50">
                        <Trophy className="w-3 h-3 text-[#131722]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {uploader.profile.full_name.split(' ')[0]}
                    </h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Music className="w-3 h-3 text-secondary" />
                      {uploader.count} canciones aportadas
                    </p>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground text-center py-4">No hay datos suficientes</p>
            )}
          </div>
        </motion.div>
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
