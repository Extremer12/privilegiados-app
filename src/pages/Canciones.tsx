import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

import { supabase } from "@/integrations/supabase/client";
import { fetchSongsWithProfiles } from "@/services/songService";

import { Plus, Music, Play, ExternalLink, Search, Loader2, FileText, Headphones, Youtube, FileMusic, ChevronRight, Star, Disc3, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/ui/loader";

import type { Song } from "@/types";

const Canciones = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);
  const { isAdmin, isLeader, isModerator } = useUserRole();
  const isAuthorized = isAdmin || isLeader || isModerator;

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const { data: songs = [], isLoading: loading, refetch: fetchSongs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => fetchSongsWithProfiles(),
    enabled: !!user,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorite_songs")
        .select("song_id")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data.map(f => f.song_id);
    },
    enabled: !!user,
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  const categoryStyles = useMemo<Record<string, { badge: string, iconColor: string, gradient: string, glow: string, textHover: string, dot: string, borderFocus: string }>>(() => ({
    alabanza: {
      badge: "bg-[#0A2540]/80 text-[#3B82F6] border-[#3B82F6]/30",
      iconColor: "text-blue-500",
      gradient: "from-[#0A192F]/80 via-background to-background",
      glow: "hover:shadow-[0_8px_30px_rgba(59,130,246,0.12)]",
      textHover: "group-hover:text-blue-400",
      dot: "bg-blue-500",
      borderFocus: "group-hover:border-blue-500/40"
    },
    adoracion: {
      badge: "bg-[#2D1B4E]/80 text-[#A855F7] border-[#A855F7]/30",
      iconColor: "text-purple-500",
      gradient: "from-[#1F103A]/80 via-background to-background",
      glow: "hover:shadow-[0_8px_30px_rgba(168,85,247,0.12)]",
      textHover: "group-hover:text-purple-400",
      dot: "bg-purple-500",
      borderFocus: "group-hover:border-purple-500/40"
    },
    especial: {
      badge: "bg-[#3D2514]/80 text-[#F59E0B] border-[#F59E0B]/30",
      iconColor: "text-amber-500",
      gradient: "from-[#2A180A]/80 via-background to-background",
      glow: "hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)]",
      textHover: "group-hover:text-amber-400",
      dot: "bg-amber-500",
      borderFocus: "group-hover:border-amber-500/40"
    },
    otro: {
      badge: "bg-[#252525]/80 text-[#9CA3AF] border-[#9CA3AF]/30",
      iconColor: "text-gray-500",
      gradient: "from-[#151515]/80 via-background to-background",
      glow: "hover:shadow-[0_8px_30px_rgba(156,163,175,0.12)]",
      textHover: "group-hover:text-gray-400",
      dot: "bg-gray-500",
      borderFocus: "group-hover:border-gray-500/40"
    },
  }), []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (song.author && song.author.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (selectedCategory === "favorites") {
        return matchesSearch && favorites.includes(song.id) && song.status === 'approved';
      }
      
      if (selectedCategory === "suggestions") {
        return matchesSearch && song.status === 'pending';
      }

      // Default: show only approved songs unless in suggestions tab
      const isApproved = song.status === 'approved' || !song.status;
      const matchesCategory = selectedCategory === "all" || song.category === selectedCategory;
      
      return matchesSearch && matchesCategory && isApproved;
    });
  }, [songs, searchTerm, selectedCategory, favorites]);

  // Reset visible count when search or category changes
  useEffect(() => {
    setVisibleCount(40);
  }, [searchTerm, selectedCategory]);

  const visibleSongs = useMemo(() => {
    return filteredSongs.slice(0, visibleCount);
  }, [filteredSongs, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 40);
  };

  return (
    <>
      <main className="flex-1 pt-24 pb-20 px-4 safe-top safe-bottom w-full bg-gradient-to-b from-background to-background/50">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-secondary/20 rounded-xl">
                  <Music className="w-6 h-6 text-secondary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                  Canciones
                </h1>
              </div>
              <p className="text-muted-foreground text-lg font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Biblioteca musical del grupo
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                variant="hero" 
                size="lg"
                className="h-14 px-8 rounded-2xl shadow-2xl shadow-secondary/20 font-black text-lg group"
                onClick={() => navigate('/canciones/nueva')}
              >
                <Plus className="w-6 h-6 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                Nueva Canción
              </Button>
            </motion.div>
          </div>

          <div className="mb-10 space-y-6">
            {/* Search Bar - Premium Style */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group max-w-2xl"
            >
              <div className="absolute inset-0 bg-secondary/5 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-6 h-6 group-focus-within:text-secondary transition-colors" />
                <Input
                  type="text"
                  placeholder="Busca por título, autor o letra..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-14 h-16 text-lg rounded-[1.5rem] bg-white/[0.03] backdrop-blur-md border-white/10 focus-visible:ring-secondary/30 focus-visible:border-secondary/50 transition-all placeholder:text-muted-foreground/50 shadow-inner"
                />
              </div>
            </motion.div>

            {/* Premium Categories - Custom Pills */}
            <div className="flex overflow-x-auto no-scrollbar gap-3 pb-4">
              {[
                { id: "all", label: "Todas", icon: Music, color: "secondary" },
                { id: "favorites", label: "Favoritos", icon: Star, color: "amber" },
                { id: "alabanza", label: "Alabanza", icon: Headphones, color: "blue" },
                { id: "adoracion", label: "Adoración", icon: Headphones, color: "purple" },
                { id: "especial", label: "Especial", icon: Star, color: "amber" },
                { id: "otro", label: "Otro", icon: Disc3, color: "gray" },
                ...(isAuthorized ? [{ id: "suggestions", label: "Sugerencias", icon: AlertCircle, color: "emerald" }] : [])
              ].map((cat) => {
                const isActive = selectedCategory === cat.id;
                const hasSuggestions = cat.id === 'suggestions' && songs.filter(s => s.status === 'pending').length > 0;
                
                return (
                  <motion.button
                    key={cat.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`
                      relative flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold whitespace-nowrap transition-all duration-300
                      ${isActive 
                        ? `bg-secondary text-primary shadow-[0_10px_25px_rgba(251,191,36,0.3)]` 
                        : `bg-white/[0.03] text-muted-foreground hover:bg-white/10 border border-white/5`}
                    `}
                  >
                    <cat.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`} />
                    {cat.label}
                    {hasSuggestions && (
                      <span className="w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center animate-bounce shadow-lg">
                        {songs.filter(s => s.status === 'pending').length}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="p-6 bg-white/[0.02] border-white/5 rounded-3xl relative overflow-hidden h-[240px]">
                  <div className="space-y-4 h-full flex flex-col">
                    <div className="flex justify-between">
                      <Skeleton className="w-20 h-6 rounded-full bg-white/5" />
                      <Skeleton className="w-8 h-8 rounded-full bg-white/5" />
                    </div>
                    <div className="mt-auto space-y-3">
                      <Skeleton className="h-8 w-3/4 bg-white/5" />
                      <Skeleton className="h-4 w-1/2 bg-white/5" />
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-white/5 mt-4">
                      <Skeleton className="w-6 h-6 rounded bg-white/5" />
                      <Skeleton className="w-6 h-6 rounded bg-white/5" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredSongs.length === 0 ? (
            <EmptyState
              icon={Music}
              title={songs.length === 0 ? "No hay canciones aún" : "No se encontraron canciones"}
              description={songs.length === 0 
                ? "Comienza agregando tu primera canción al repertorio"
                : "Intenta con otro término de búsqueda o categoría"}
            />
          ) : (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {visibleSongs.map((song) => {
                const style = categoryStyles[song.category] || categoryStyles.otro;
                const isFav = favorites.includes(song.id);
                
                return (
                  <motion.div key={song.id} variants={itemVariants} className="h-full">
                    <Card 
                      className={`group relative p-5 bg-gradient-to-br ${style.gradient} border border-white/[0.05] ${style.borderFocus} rounded-3xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-[260px] ${style.glow} hover:-translate-y-1`}
                      onClick={() => navigate(`/canciones/${song.id}`)}
                    >
                      {/* Subtler background icon for premium feel */}
                      <Disc3 className={`absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.02] transform group-hover:scale-110 group-hover:-rotate-45 transition-all duration-700 pointer-events-none ${style.iconColor}`} />
                      
                      <div className="relative z-10 flex-grow flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className={`px-3 py-1 font-bold text-[10px] uppercase tracking-wider rounded-full backdrop-blur-md ${style.badge}`}>
                            {song.category}
                          </Badge>
                          
                          <div className="flex gap-1.5 items-center">
                            {isFav && (
                              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center backdrop-blur-md border border-amber-500/20 shadow-sm" title="Favorito">
                                <Star className="w-4 h-4 fill-amber-500 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                              </div>
                            )}
                            {song.youtube_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-red-500 hover:text-white text-white/50 transition-all z-20 backdrop-blur-md border border-white/5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(song.youtube_url!, "_blank");
                                }}
                                title="Ver en YouTube"
                              >
                                <Youtube className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Title and Author Pushed to Bottom */}
                        <div className="mt-auto mb-4">
                          <h3 className={`font-black text-2xl tracking-tight leading-tight mb-1 text-foreground/90 ${style.textHover} transition-colors line-clamp-2`}>
                            {song.title}
                          </h3>
                          
                          {song.author && (
                            <p className="text-sm text-white/40 font-medium flex items-center gap-2 mb-2">
                              {song.author}
                            </p>
                          )}
                          {song.creator_profile && (
                            <div className="flex items-center gap-2 mt-2">
                              <Avatar className="w-5 h-5 border border-white/10">
                                <AvatarImage src={song.creator_profile.avatar_url || undefined} />
                                <AvatarFallback className="text-[8px] bg-white/5">
                                  {song.creator_profile.full_name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-white/50 truncate max-w-[120px]">
                                Agregada por {song.creator_profile.full_name.split(' ')[0]}
                              </span>
                            </div>
                          )}
                        </div>
                           
                        {/* Elegant Icon Dock */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                          <div className="flex gap-1">
                            {song.lyrics && (
                              <div className="flex items-center justify-center w-7 h-7 rounded-md text-white/30 group-hover:text-white/60 transition-colors" title="Tiene letra">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}
                            {song.chords && (
                              <div className="flex items-center justify-center w-7 h-7 rounded-md text-white/30 group-hover:text-white/60 transition-colors" title="Tiene acordes">
                                <FileMusic className="w-4 h-4" />
                              </div>
                            )}
                            {song.audio_url && (
                              <div className="flex items-center justify-center w-7 h-7 rounded-md text-white/30 group-hover:text-white/60 transition-colors" title="Tiene audio">
                                <Headphones className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          
                          <div className="w-7 h-7 rounded-full bg-white/[0.03] group-hover:bg-white/[0.1] flex items-center justify-center text-white/30 group-hover:text-white/90 transition-all transform group-hover:translate-x-1">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Load More Button */}
          {!loading && filteredSongs.length > visibleCount && (
            <div className="flex justify-center mt-12 mb-8">
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleLoadMore}
                className="rounded-full px-8 py-6 bg-white/[0.03] border-white/10 hover:bg-white/10 text-white font-medium shadow-xl shadow-black/20"
              >
                Cargar más canciones...
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 z-50 w-12 h-12 rounded-2xl bg-secondary text-primary-foreground shadow-2xl shadow-secondary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
            aria-label="Volver arriba"
          >
            <ArrowUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default Canciones;
