import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroupContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Music, ChevronRight, 
  CalendarDays, Bell, Clock,
  MapPin, AlertCircle, Info, AlertTriangle, Zap, Star, MessageSquare, ListMusic, GraduationCap, Sparkles
} from "lucide-react";
import { format, formatDistanceToNow, isAfter, isBefore, addDays, subDays, subHours } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { ServiceFeedbackDialog } from "@/components/repertorios/ServiceFeedbackDialog";

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  event_type: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

const Index = () => {
  const { user } = useAuth();
  const { activeGroup, userGroups, loading: groupLoading } = useGroup();
  const navigate = useNavigate();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<{id: string, title: string} | null>(null);

  const groupId = activeGroup?.id;

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Query for recently completed services that the user hasn't rated yet
  const { data: pendingFeedback = [], isLoading: loadingFeedback } = useQuery({
    queryKey: ['pending_feedback', user?.id],
    queryFn: async () => {
      // 1. Get completed setlists from the last 24 hours
      const twentyFourHoursAgo = subHours(new Date(), 24).toISOString();
      const { data: setlists, error: setlistsError } = await supabase
        .from('setlists')
        .select('id, title, service_date')
        .eq('status', 'completed')
        .gte('service_date', twentyFourHoursAgo)
        .order('service_date', { ascending: false });

      if (setlistsError) throw setlistsError;
      if (!setlists || setlists.length === 0) return [];

      // 2. Get feedbacks already submitted by the user
      const { data: feedbacks, error: feedbackError } = await supabase
        .from('service_feedback')
        .select('service_id')
        .eq('user_id', user!.id);
      
      if (feedbackError) throw feedbackError;

      const ratedIds = new Set(feedbacks?.map(f => f.service_id) || []);
      
      // 3. Return setlists that haven't been rated
      return setlists.filter(s => !ratedIds.has(s.id));
    },
    enabled: !!user
  });

  const { data: stats = { totalSongs: 0, totalMembers: 0, totalSetlists: 0, totalEvents: 0 } } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const [songsResult, membersResult, setlistsResult, eventsResult] = await Promise.all([
        supabase.from("songs").select("id", { count: "exact" }).eq("group_id", groupId!),
        supabase.from("group_members").select("id", { count: "exact" }).eq("group_id", groupId!).eq("status", "approved"),
        supabase.from("setlists").select("id", { count: "exact" }).eq("group_id", groupId!),
        supabase.from("events").select("id", { count: "exact" }).eq("group_id", groupId!),
      ]);
      return {
        totalSongs: songsResult.count || 0,
        totalMembers: membersResult.count || 0,
        totalSetlists: setlistsResult.count || 0,
        totalEvents: eventsResult.count || 0,
      };
    },
    enabled: !!user && !!groupId
  });

  const { data: upcomingEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['upcomingEvents', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, event_date, location, event_type")
        .eq("group_id", groupId!)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data as Event[];
    },
    enabled: !!user && !!groupId
  });

  const { data: announcements = [], isLoading: loadingAnnouncements } = useQuery({
    queryKey: ['announcements', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, content, priority, created_at")
        .eq("group_id", groupId!)
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!user && !!groupId
  });

  const { data: recentActivities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['recent_activities', groupId],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url");
      if (profilesError) throw profilesError;
      
      const profilesMap: Record<string, { full_name: string | null, avatar_url: string | null }> = {};
      profiles?.forEach(p => {
        profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });

      const getUserName = (id: string | null) => {
        if (!id) return "Usuario";
        return profilesMap[id]?.full_name || "Usuario";
      };

      const { data: songs, error: songsError } = await supabase
        .from("songs")
        .select("id, title, created_at, created_by")
        .order("created_at", { ascending: false })
        .limit(4);

      const { data: setlists, error: setlistsError } = await supabase
        .from("setlists")
        .select("id, title, created_at, created_by")
        .order("created_at", { ascending: false })
        .limit(4);

      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, title, created_at, created_by")
        .order("created_at", { ascending: false })
        .limit(4);

      const { data: chatMessages, error: chatMessagesError } = await supabase
        .from("chat_messages")
        .select("id, content, created_at, author_id")
        .order("created_at", { ascending: false })
        .limit(4);

      const activities: any[] = [];

      if (songs) {
        songs.forEach(s => {
          activities.push({
            id: `song-${s.id}`,
            type: "song",
            title: "Se agregó una nueva canción:",
            detail: `“${s.title}”`,
            by: `por ${getUserName(s.created_by)}`,
            time: s.created_at ? new Date(s.created_at) : new Date(),
            grad: "from-blue-500/20 to-indigo-500/10",
            icon: Music,
            iconColor: "text-blue-500 dark:text-blue-400",
            targetPath: `/canciones/${s.id}`
          });
        });
      }

      if (setlists) {
        setlists.forEach(s => {
          activities.push({
            id: `setlist-${s.id}`,
            type: "setlist",
            title: "Se creó un nuevo repertorio:",
            detail: s.title,
            by: `por ${getUserName(s.created_by)}`,
            time: s.created_at ? new Date(s.created_at) : new Date(),
            grad: "from-amber-500/20 to-yellow-500/10",
            icon: ListMusic,
            iconColor: "text-amber-500 dark:text-amber-400",
            targetPath: `/repertorios/${s.id}`
          });
        });
      }

      if (events) {
        events.forEach(e => {
          activities.push({
            id: `event-${e.id}`,
            type: "event",
            title: "Nuevo evento creado:",
            detail: e.title,
            by: e.created_by ? `por ${getUserName(e.created_by)}` : "",
            time: e.created_at ? new Date(e.created_at) : new Date(),
            grad: "from-purple-500/20 to-fuchsia-500/10",
            icon: CalendarDays,
            iconColor: "text-purple-500 dark:text-purple-400",
            targetPath: "/eventos"
          });
        });
      }

      if (chatMessages) {
        chatMessages.forEach(m => {
          activities.push({
            id: `chat-${m.id}`,
            type: "chat",
            title: "Nuevo mensaje en el foro:",
            detail: m.content.length > 50 ? `${m.content.slice(0, 50)}...` : m.content,
            by: `por ${getUserName(m.author_id)}`,
            time: m.created_at ? new Date(m.created_at) : new Date(),
            grad: "from-emerald-500/20 to-teal-500/10",
            icon: MessageSquare,
            iconColor: "text-emerald-500 dark:text-emerald-400",
            targetPath: "/foro"
          });
        });
      }

      activities.sort((a, b) => b.time.getTime() - a.time.getTime());
      return activities.slice(0, 4);
    },
    enabled: !!user
  });

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { icon: Zap, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', glow: 'shadow-red-500/20' };
      case 'high':
        return { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', glow: 'shadow-orange-500/20' };
      case 'normal':
        return { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' };
      default:
        return { icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-muted/30', glow: '' };
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'culto': return 'bg-purple-500/20 text-purple-300';
      case 'ensayo': return 'bg-blue-500/20 text-blue-300';
      case 'especial': return 'bg-amber-500/20 text-amber-300';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const shouldRedirect = !groupLoading && user && (userGroups.length === 0 || !activeGroup);

  useEffect(() => {
    if (shouldRedirect) {
      navigate("/grupos", { replace: true });
    }
  }, [shouldRedirect, navigate]);

  if (shouldRedirect) {
    return null;
  }

  if (!user) {
    return (
      <>
        <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-20 w-full min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="max-w-md w-full p-8 card-gradient border-secondary/20 text-center space-y-6">
              <motion.div
                className="w-20 h-20 mx-auto rounded-full bg-secondary/20 flex items-center justify-center mb-4"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1, boxShadow: "0 0 20px rgba(255,215,0,0.2)" }}
                transition={{ duration: 0.5 }}
              >
                <Music className="w-10 h-10 text-secondary" aria-hidden="true" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Privilegiados App
                </h1>
                <p className="text-muted-foreground mb-6">
                  Inicia sesión para acceder a la plataforma
                </p>
              </div>
              <div className="space-y-3">
                <Link to="/auth" className="block">
                  <Button variant="hero" size="lg" className="w-full">
                    Iniciar Sesión
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        </main>
      </>
    );
  }

  return (
    <>
      <main className="flex-1 pt-24 pb-28 px-4 safe-top safe-bottom w-full bg-background transition-colors duration-300">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Welcome Banner */}
          <WelcomeCard />

          {/* Academia Banner Rectangular Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate("/teoria")}
            className="cursor-pointer group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 border-2 border-purple-500/50 shadow-2xl shadow-purple-900/30 hover:shadow-purple-600/40 transition-all hover:scale-[1.01]"
          >
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
              <GraduationCap className="w-36 h-36 text-purple-400 -rotate-12" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/30 flex items-center justify-center border-2 border-purple-400 text-purple-200 shadow-xl shadow-purple-500/20 shrink-0">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-purple-300 transition-colors">
                    MI ACADEMIA DE MÚSICA
                  </h3>
                  <p className="text-slate-200 text-xs sm:text-sm font-medium mt-1">
                    Aprende canto, técnica de instrumentos y teoría musical con PDFs y videos.
                  </p>
                </div>
              </div>
              <Button className="h-12 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider shadow-xl shadow-purple-600/30 shrink-0 group-hover:translate-x-1 transition-transform w-full sm:w-auto">
                Ingresar a la Academia <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>

          {/* Pending Feedback Section */}
          <AnimatePresence>
            {pendingFeedback.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="relative overflow-hidden group"
              >
                <Card className="p-6 bg-gradient-to-br from-secondary/15 to-transparent border border-secondary/35 shadow-2xl rounded-3xl backdrop-blur-2xl">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Star className="w-24 h-24 text-secondary rotate-12" />
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center border border-secondary/25 shadow-xl shadow-secondary/10 flex-shrink-0 animate-bounce-subtle">
                      <MessageSquare className="w-8 h-8 text-secondary" />
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <h3 className="text-lg font-black text-foreground tracking-tight">Tu opinión nos importa</h3>
                      <p className="text-neutral-400 text-sm font-semibold">
                        Has participado en <span className="text-secondary font-bold">"{pendingFeedback[0].title}"</span>. 
                        ¡Déjanos tu valoración para seguir mejorando!
                      </p>
                    </div>
                    <Button 
                      onClick={() => {
                        setSelectedService({ id: pendingFeedback[0].id, title: pendingFeedback[0].title });
                        setFeedbackOpen(true);
                      }}
                      className="h-11 px-6 rounded-xl bg-gradient-to-r from-secondary to-amber-500 text-primary-foreground font-bold uppercase tracking-wider hover:opacity-90 shadow-lg shadow-secondary/20 active:scale-95 transition-all w-full sm:w-auto text-xs"
                    >
                      Valorar Ahora
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Stats Grid */}
          <StatsCards stats={stats} />

          {/* Upcoming Events (Screen 2 Theme) */}
          {loadingEvents ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-40 bg-muted rounded-lg" />
              <Skeleton className="h-36 w-full bg-muted rounded-3xl" />
            </div>
          ) : upcomingEvents.length > 0 && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black uppercase tracking-wider text-muted-foreground">
                  Próximo Evento
                </h3>
                <button 
                  onClick={() => navigate("/eventos")} 
                  className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
                >
                  Ver todos <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {upcomingEvents.slice(0, 1).map((event) => {
                  const eventDate = new Date(event.event_date);
                  
                  return (
                    <motion.div
                      key={event.id}
                      whileHover={{ scale: 1.01, y: -2 }}
                      className="h-full"
                    >
                      {/* Premium Concert Lights Background Event Card */}
                      <Card 
                        onClick={() => navigate("/eventos")}
                        className="relative overflow-hidden cursor-pointer group bg-card border border-border p-6 rounded-3xl shadow-2xl transition-all duration-300 min-h-[160px]"
                      >
                        {/* Concert glow image placeholder */}
                        <div 
                          className="absolute inset-0 bg-cover bg-center opacity-10 group-hover:opacity-15 transition-opacity pointer-events-none"
                          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=600&auto=format&fit=crop')` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent dark:from-black dark:via-black/80 dark:to-transparent pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between h-full">
                          <div className="flex items-center gap-5 w-full md:w-auto">
                            {/* Flotante Gold Date Calendar Box */}
                            <div className="flex flex-col items-center justify-center w-20 h-24 rounded-2xl bg-background border border-secondary/35 text-center px-2 flex-shrink-0 relative shadow-lg">
                              {/* Amber Glow border */}
                              <div className="absolute inset-0 rounded-2xl bg-secondary/5 opacity-50" />
                              <span className="text-[10px] font-black uppercase text-secondary tracking-widest leading-none mb-1">
                                {format(eventDate, "MMM", { locale: es })}
                              </span>
                              <span className="text-3xl font-black text-foreground leading-none">
                                {format(eventDate, "d")}
                              </span>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                                {format(eventDate, "eeee", { locale: es }).slice(0, 3)}
                              </span>
                            </div>
                            
                            {/* Event Details */}
                            <div className="space-y-1 min-w-0">
                              <span className="text-[9px] font-black uppercase tracking-widest text-secondary bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/20">
                                Próximo Evento
                              </span>
                              <h4 className="text-xl font-black text-foreground group-hover:text-secondary transition-colors truncate mt-1.5">
                                {event.title}
                              </h4>
                              
                              <div className="flex flex-col gap-1 text-xs text-muted-foreground font-semibold mt-1">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-secondary" />
                                  {format(eventDate, "EEEE d 'de' MMMM - HH:mm", { locale: es })} hrs
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1.5 truncate">
                                    <MapPin className="w-3.5 h-3.5 text-secondary" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Button Pills */}
                          <div className="flex-shrink-0 w-full md:w-auto text-right mt-4 md:mt-0">
                            <Button 
                              variant="outline" 
                              className="h-10 rounded-full border-secondary/40 text-secondary hover:bg-secondary/10 px-6 font-bold text-xs uppercase tracking-wider group-hover:scale-105 active:scale-95 transition-all shadow-md w-full md:w-auto"
                            >
                              Ver repertorio →
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <QuickActions />

          {/* Announcements Section */}
          {loadingAnnouncements ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-40 bg-muted rounded-lg" />
              <Skeleton className="h-24 w-full bg-muted rounded-2xl" />
            </div>
          ) : announcements.length > 0 && (
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-secondary animate-bounce-subtle" />
                <h3 className="text-base font-black uppercase tracking-wider text-neutral-300">
                  Anuncios del Grupo
                </h3>
              </div>
              
              <div className="space-y-3">
                {announcements.map((announcement, index) => {
                  const config = getPriorityConfig(announcement.priority);
                  return (
                    <motion.div
                      key={announcement.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.08 }}
                    >
                      <Card 
                        className={`p-4 border ${config.border} ${config.bg} backdrop-blur-md rounded-2xl shadow-lg`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 border ${config.border}`}>
                            <config.icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                              <h4 className="font-bold text-foreground text-sm line-clamp-1">{announcement.title}</h4>
                              {announcement.priority === 'urgent' && (
                                <Badge className="bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/40 text-[9px] px-1.5 uppercase font-black tracking-wider">
                                  Urgente
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{announcement.content}</p>
                            <p className="text-[10px] text-muted-foreground/60 font-semibold mt-2">
                              {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: es })}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Actividad Reciente (Screen 2 Style) */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase tracking-wider text-neutral-300">
                Actividad Reciente
              </h3>
              <button 
                onClick={() => navigate("/foro")}
                className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
              >
                Ver todo <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <Card className="bg-card border border-border p-4 rounded-3xl shadow-2xl divide-y divide-border space-y-3.5">
              {loadingActivities ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-4 pt-3.5 first:pt-0">
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <Skeleton className="w-11 h-11 rounded-xl bg-muted" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-3 w-1/3 bg-muted rounded animate-pulse" />
                          <Skeleton className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-10 bg-muted rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground font-semibold">
                  No hay actividad reciente.
                </div>
              ) : (
                recentActivities.map((act, index) => (
                  <div 
                    key={act.id} 
                    className={`flex items-center justify-between gap-4 cursor-pointer hover:bg-neutral-500/5 p-2 rounded-xl transition-colors ${index > 0 ? "pt-3.5" : ""}`}
                    onClick={() => navigate(act.targetPath)}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Circle Gradient Icon */}
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${act.grad} flex items-center justify-center flex-shrink-0 border border-border`}>
                        <act.icon className={`w-5 h-5 ${act.iconColor}`} />
                      </div>
                      
                      {/* Description Text */}
                      <div className="min-w-0 leading-tight">
                        <p className="text-xs text-muted-foreground font-semibold">
                          {act.title}
                        </p>
                        <h5 className="text-[13.5px] font-black text-foreground mt-0.5 truncate max-w-[280px] sm:max-w-md">
                          {act.detail} <span className="text-muted-foreground/60 font-bold text-xs">{act.by}</span>
                        </h5>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[11px] font-bold text-neutral-500 flex-shrink-0">
                      {formatDistanceToNow(act.time, { addSuffix: true, locale: es })}
                    </span>
                  </div>
                ))
              )}
            </Card>
          </motion.div>


        </div>
      </main>

      {selectedService && (
        <ServiceFeedbackDialog 
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          serviceId={selectedService.id}
          serviceTitle={selectedService.title}
        />
      )}
    </>
  );
};

export default Index;
