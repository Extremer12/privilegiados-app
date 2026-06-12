import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, Music, Users, CalendarDays, LineChart } from "lucide-react";
import { Loader } from "@/components/ui/loader";

// Components
import { DashboardOverview } from "@/components/estadisticas/DashboardOverview";
import { SongsRanking } from "@/components/estadisticas/SongsRanking";
import { MembersParticipation } from "@/components/estadisticas/MembersParticipation";
import { ServicesHistory } from "@/components/estadisticas/ServicesHistory";

const TABS = [
  { id: "overview",  label: "Resumen",   icon: BarChart3,   color: "text-secondary",   bg: "bg-secondary/10" },
  { id: "songs",     label: "Canciones", icon: Music,        color: "text-purple-400",  bg: "bg-purple-400/10" },
  { id: "members",   label: "Miembros",  icon: Users,        color: "text-blue-400",    bg: "bg-blue-400/10" },
  { id: "history",   label: "Historial", icon: CalendarDays, color: "text-emerald-400", bg: "bg-emerald-400/10" },
];

const Estadisticas = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: statsData, isLoading } = useQuery({
    queryKey: ["service_stats"],
    queryFn: async () => {
      const { data: reports } = await supabase
        .from("service_reports")
        .select(`*, service_ratings (rating)`)
        .order("service_date", { ascending: false });

      const { data: songsPlayed } = await supabase
        .from("service_songs")
        .select(`*, songs (id, title, category), service_reports (service_date)`);

      const { data: participants } = await supabase
        .from("service_participants")
        .select(`*, service_reports (service_date, setlist_id), profiles (full_name, avatar_url, role)`);

      const { data: setlistParticipants } = await supabase
        .from("setlist_participants")
        .select(`*, setlists (service_date, id), profiles (full_name, avatar_url, role)`);

      const combinedParticipants = [...(participants || [])];
      if (setlistParticipants) {
        setlistParticipants.forEach((sp: any) => {
          const userId = sp.user_id;
          const name = sp.profiles?.full_name || sp.participant_name;
          const setlistId = sp.setlists?.id;
          const date = sp.setlists?.service_date;
          const exists = combinedParticipants.some((ap: any) => {
            const apUserId = ap.user_id;
            const apName = ap.profiles?.full_name || ap.participant_name;
            const apSetlistId = ap.service_reports?.setlist_id;
            return (
              (userId && apUserId && userId === apUserId && setlistId === apSetlistId) ||
              (name && apName && name === apName && setlistId === apSetlistId)
            );
          });
          if (!exists) {
            combinedParticipants.push({
              id: sp.id || `setlist-part-${sp.user_id || sp.participant_name}-${setlistId}`,
              user_id: sp.user_id,
              participant_name: sp.participant_name,
              role_in_service: sp.role_in_service,
              service_reports: { service_date: date, setlist_id: setlistId },
              profiles: sp.profiles,
            });
          }
        });
      }

      const { data: feedback } = await supabase
        .from("service_feedback")
        .select(`*, profiles (full_name, avatar_url)`);

      const { data: allSongs } = await supabase
        .from("songs")
        .select("id, title, category, created_at, creator_profile:profiles!songs_created_by_profile_fkey(full_name, avatar_url)");

      return {
        reports: reports || [],
        songsPlayed: songsPlayed || [],
        participants: combinedParticipants,
        allSongs: allSongs || [],
        feedback: feedback || [],
      };
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 pt-24">
        <div className="max-w-md w-full p-8 text-center bg-card border border-border rounded-3xl">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-2xl font-bold mb-2 text-foreground">Acceso Restringido</h2>
          <p className="text-muted-foreground">Inicia sesión para ver las estadísticas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pt-24 pb-24 min-h-screen bg-background transition-colors duration-300">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute -top-1/3 -right-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(48 100% 50% / 0.06) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-1/4 -left-1/4 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(270 80% 60% / 0.05) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 lg:px-8">
        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-secondary/15 rounded-2xl border border-secondary/20">
              <BarChart3 className="w-6 h-6 text-secondary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              Estadísticas
            </h1>
          </div>
          <p className="text-muted-foreground text-base font-semibold">
            Análisis y rendimiento de los servicios musicales del equipo
          </p>
        </motion.div>

        {/* ── Tab Navigation ── */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 pb-1">
          {TABS.map((tab, i) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-300 font-bold text-sm border whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-secondary text-primary-foreground border-secondary shadow-lg shadow-secondary/25 scale-[1.02]"
                    : "bg-card text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <div className={`w-5 h-5 flex items-center justify-center ${active ? "" : tab.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {tab.label}
                {active && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 rounded-2xl bg-secondary -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── Content Area ── */}
        {isLoading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
            <Loader />
            <p className="text-muted-foreground animate-pulse font-semibold">Calculando estadísticas...</p>
          </div>
        ) : !statsData?.reports.length ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center p-16 text-center bg-card rounded-3xl border border-border"
          >
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <LineChart className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-foreground">Aún no hay datos</h3>
            <p className="text-muted-foreground max-w-md">
              Las estadísticas aparecerán aquí una vez que se finalicen cultos en la sección de "En Vivo".
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "overview"  && <DashboardOverview data={statsData} />}
              {activeTab === "songs"     && <SongsRanking data={statsData} />}
              {activeTab === "members"   && <MembersParticipation data={statsData} />}
              {activeTab === "history"   && <ServicesHistory data={statsData} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Estadisticas;
