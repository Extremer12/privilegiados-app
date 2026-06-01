import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart3, Music, Users, CalendarDays, LineChart, 
  TrendingUp, AlertTriangle, Star, CheckCircle2,
  Clock, Calendar as CalendarIcon, Filter
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";

// Components
import { DashboardOverview } from "@/components/estadisticas/DashboardOverview";
import { SongsRanking } from "@/components/estadisticas/SongsRanking";
import { MembersParticipation } from "@/components/estadisticas/MembersParticipation";
import { ServicesHistory } from "@/components/estadisticas/ServicesHistory";

const TABS = [
  { id: "overview", label: "Resumen", icon: BarChart3 },
  { id: "songs", label: "Canciones", icon: Music },
  { id: "members", label: "Miembros", icon: Users },
  { id: "history", label: "Historial", icon: CalendarDays },
];

const Estadisticas = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Main data fetch
  const { data: statsData, isLoading } = useQuery({
    queryKey: ["service_stats"],
    queryFn: async () => {
      // 1. Fetch Reports
      const { data: reports } = await supabase
        .from("service_reports")
        .select(`
          *,
          service_ratings (rating)
        `)
        .order("service_date", { ascending: false });

      // 2. Fetch all songs played
      const { data: songsPlayed } = await supabase
        .from("service_songs")
        .select(`
          *,
          songs (id, title, category),
          service_reports (service_date)
        `);

      // 3. Fetch all participants
      const { data: participants } = await supabase
        .from("service_participants")
        .select(`
          *,
          service_reports (service_date),
          profiles (full_name, avatar_url, role)
        `);

      // 4. Fetch all available feedback
      const { data: feedback } = await supabase
        .from("service_feedback")
        .select(`
          *,
          profiles (full_name, avatar_url)
        `);

      // 5. Fetch all available songs to find the ones never played and get top uploaders
      const { data: allSongs } = await supabase
        .from("songs")
        .select("id, title, category, creator_profile:profiles!songs_created_by_profile_fkey(full_name, avatar_url)");

      return {
        reports: reports || [],
        songsPlayed: songsPlayed || [],
        participants: participants || [],
        allSongs: allSongs || [],
        feedback: feedback || [],
      };
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 pt-24">
        <Card className="max-w-md w-full p-8 text-center bg-black/40 border-white/10">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-secondary/50" />
          <h2 className="text-2xl font-bold mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground">Inicia sesión para ver las estadísticas.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 pt-24 pb-20 min-h-screen bg-background transition-colors duration-300">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(48 100% 50% / 0.15) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.2, 0.15] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-secondary/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-secondary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">Estadísticas</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Análisis y rendimiento de los servicios musicales
            </p>
          </motion.div>
        </div>

        {/* Custom Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 pb-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-medium whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-secondary text-primary-foreground shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center">
            <Loader />
            <p className="mt-4 text-muted-foreground animate-pulse">Calculando estadísticas...</p>
          </div>
        ) : !statsData?.reports.length ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-3xl border border-border"
          >
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <LineChart className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Aún no hay datos</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Las estadísticas aparecerán aquí una vez que se finalicen cultos en la sección de "En Vivo".
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "overview" && <DashboardOverview data={statsData} />}
              {activeTab === "songs" && <SongsRanking data={statsData} />}
              {activeTab === "members" && <MembersParticipation data={statsData} />}
              {activeTab === "history" && <ServicesHistory data={statsData} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Estadisticas;
