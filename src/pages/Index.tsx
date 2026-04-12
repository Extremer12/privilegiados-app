import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Music, ChevronRight, 
  CalendarDays, Bell, Clock,
  MapPin, AlertCircle, Info, AlertTriangle, Zap
} from "lucide-react";
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { StatsCards } from "@/components/dashboard/StatsCards";

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
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalMembers: 0,
    totalPosts: 0,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
      fetchUpcomingEvents();
      fetchAnnouncements();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (data) setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const [songsResult, membersResult, postsResult] = await Promise.all([
        supabase.from("songs").select("id", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("forum_posts").select("id", { count: "exact" }),
      ]);

      setStats({
        totalSongs: songsResult.count || 0,
        totalMembers: membersResult.count || 0,
        totalPosts: postsResult.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const { data } = await supabase
        .from("events")
        .select("id, title, event_date, location, event_type")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(3);
      
      if (data) setUpcomingEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, content, priority, created_at")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (data) setAnnouncements(data);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  };

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

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary via-primary/95 to-primary/80">
        <Navigation />
        <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="max-w-md w-full p-8 card-gradient border-secondary/20 text-center space-y-6">
              <motion.div
                className="w-20 h-20 mx-auto rounded-full bg-secondary/20 flex items-center justify-center mb-4"
                animate={{
                  scale: [1, 1.1, 1],
                  boxShadow: ["0 0 0px rgba(255,215,0,0)", "0 0 30px rgba(255,215,0,0.3)", "0 0 0px rgba(255,215,0,0)"],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Music className="w-10 h-10 text-secondary" />
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
                <Link to="/auth" className="block">
                  <Button variant="outline" size="lg" className="w-full">
                    Crear Cuenta
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary via-primary/95 to-primary/80">
      <Navigation />
      
      <main className="flex-1 pt-20 pb-24 px-4 safe-top safe-bottom">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Welcome Banner */}
          <WelcomeCard />

          {/* Announcements Section */}
          {announcements.length > 0 && (
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center shadow-lg"
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  <Bell className="w-5 h-5 text-red-400" />
                </motion.div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Anuncios Importantes</h3>
                  <p className="text-xs text-muted-foreground">Mantente al día con las novedades</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {announcements.map((announcement, index) => {
                  const config = getPriorityConfig(announcement.priority);
                  const IconComponent = config.icon;
                  return (
                    <motion.div
                      key={announcement.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.1 }}
                      whileHover={{ scale: 1.01, x: 4 }}
                    >
                      <Card 
                        className={`p-4 border ${config.border} ${config.bg} backdrop-blur-sm shadow-lg ${config.glow}`}
                      >
                        <div className="flex gap-3">
                          <motion.div
                            className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}
                            animate={{
                              rotate: announcement.priority === 'urgent' ? [0, -5, 5, 0] : 0,
                            }}
                            transition={{
                              duration: 0.5,
                              repeat: announcement.priority === 'urgent' ? Infinity : 0,
                              repeatDelay: 2,
                            }}
                          >
                            <IconComponent className={`w-6 h-6 ${config.color}`} />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-bold text-foreground line-clamp-1">{announcement.title}</h4>
                              {announcement.priority === 'urgent' && (
                                <Badge variant="destructive" className="text-xs flex-shrink-0 animate-pulse">
                                  Urgente
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{announcement.content}</p>
                            <p className="text-xs text-muted-foreground/70 mt-2">
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

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center shadow-lg"
                    whileHover={{ rotate: 5 }}
                  >
                    <CalendarDays className="w-5 h-5 text-green-400" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Próximos Eventos</h3>
                    <p className="text-xs text-muted-foreground">No te pierdas ninguno</p>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-secondary border-secondary/30 hover:bg-secondary/10"
                    onClick={() => navigate("/eventos")}
                  >
                    Ver todos
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              </div>
              
              <div className="space-y-4">
                {upcomingEvents.map((event, index) => {
                  const eventDate = new Date(event.event_date);
                  const isThisWeek = isBefore(eventDate, addDays(new Date(), 7));
                  const isToday = isBefore(eventDate, addDays(new Date(), 1)) && isAfter(eventDate, new Date());
                  
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className={`relative overflow-hidden cursor-pointer group transition-all duration-300 ${
                          isToday 
                            ? 'bg-gradient-to-r from-secondary/20 via-secondary/10 to-transparent border-secondary/40 shadow-lg shadow-secondary/10' 
                            : isThisWeek
                              ? 'bg-gradient-to-r from-green-500/10 via-card to-card border-green-500/30'
                              : 'card-gradient border-secondary/20'
                        }`}
                        onClick={() => navigate("/eventos")}
                      >
                        {isToday && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-secondary/10 via-transparent to-transparent pointer-events-none"
                            animate={{
                              opacity: [0.3, 0.6, 0.3],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                            }}
                          />
                        )}
                        
                        <div className="p-5 sm:p-6">
                          <div className="flex items-stretch gap-4 sm:gap-6">
                            {/* Date Block */}
                            <motion.div
                              className={`flex flex-col items-center justify-center min-w-[80px] sm:min-w-[100px] py-4 px-3 rounded-2xl ${
                                isToday 
                                  ? 'bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground shadow-lg shadow-secondary/30' 
                                  : isThisWeek
                                    ? 'bg-gradient-to-br from-green-500/30 to-green-600/20 text-green-300'
                                    : 'bg-gradient-to-br from-secondary/25 to-secondary/10'
                              }`}
                              whileHover={{ scale: 1.05 }}
                            >
                              {isToday && (
                                <motion.span
                                  className="text-[10px] font-bold uppercase tracking-wider mb-1"
                                  animate={{ opacity: [1, 0.5, 1] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                  Hoy
                                </motion.span>
                              )}
                              <span className={`text-3xl sm:text-4xl font-bold ${isToday ? 'text-secondary-foreground' : 'text-secondary'}`}>
                                {format(eventDate, "d")}
                              </span>
                              <span className={`text-xs sm:text-sm font-medium uppercase ${isToday ? 'text-secondary-foreground/80' : 'text-muted-foreground'}`}>
                                {format(eventDate, "MMM", { locale: es })}
                              </span>
                            </motion.div>
                            
                            {/* Event Details */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="flex items-start gap-2 mb-2">
                                <h4 className="text-lg sm:text-xl font-bold text-foreground line-clamp-1 group-hover:text-secondary transition-colors">
                                  {event.title}
                                </h4>
                                {isToday && (
                                  <Badge className="bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5 flex-shrink-0 animate-pulse">
                                    HOY
                                  </Badge>
                                )}
                              </div>
                              
                              <Badge className={`w-fit mb-3 text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                                {event.event_type}
                              </Badge>
                              
                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                  <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center">
                                    <Clock className="w-3.5 h-3.5 text-secondary" />
                                  </div>
                                  <span className="font-medium">{format(eventDate, "HH:mm")} hrs</span>
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-2 text-muted-foreground">
                                    <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center">
                                      <MapPin className="w-3.5 h-3.5 text-secondary" />
                                    </div>
                                    <span className="font-medium truncate max-w-[150px]">{event.location}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Arrow */}
                            <div className="hidden sm:flex items-center">
                              <motion.div
                                className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center"
                                whileHover={{ x: 5, backgroundColor: "rgba(255, 215, 0, 0.2)" }}
                              >
                                <ChevronRight className="w-5 h-5 text-secondary" />
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Profile Card */}
          <ProfileCard profile={profile} email={user.email} />

          {/* Quick Stats */}
          <StatsCards stats={stats} />

          {/* Quick Actions */}
          <QuickActions stats={stats} />

        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
