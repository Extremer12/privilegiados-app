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

import { Plus, Music, Search, FileText, Headphones, Youtube, FileMusic, ChevronRight, Star, Disc3, ArrowUp, AlertCircle, ListMusic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/ui/loader";
import { FloatingActionButton } from "@/components/ui/fab";
import { vibrateLight } from "@/utils/haptics";

import type { Song } from "@/types";
import { CreateEnganchadoDialog } from "@/components/CreateEnganchadoDialog";

const Canciones = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [createEnganchadoOpen, setCreateEnganchadoOpen] = useState(false);
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
    enganchado: {
      badge: "bg-[#064E3B]/80 text-[#10B981] border-[#10B981]/30",
      iconColor: "text-emerald-500",
      gradient: "from-[#022C22]/80 via-background to-background",
      glow: "hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)]",
      textHover: "group-hover:text-emerald-400",
      dot: "bg-emerald-500",
      borderFocus: "group-hover:border-emerald-500/40"
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
      <main className="flex-1 pt-20 pb-20 px-4 w-full">
        <div className="max-w-7xl mx-auto">
          {/* Header Section - Minimalist */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Canciones
              </h1>
              <p className="text-muted-foreground text-sm font-medium">
                Biblioteca musical del grupo
              </p>
            </div>
            
            <div className="hidden sm:flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 px-5 rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold text-sm"
                onClick={() => setCreateEnganchadoOpen(true)}
              >
                <ListMusic className="w-4 h-4 mr-2" />
                Crear Enganchado
              </Button>
              <Button 
                variant="hero" 
                size="sm"
                className="h-10 px-5 rounded-xl shadow-md font-bold text-sm"
                onClick={() => {
                  vibrateLight();
                  navigate('/canciones/nueva');
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Canción
              </Button>
            </div>
          </div>

          <div className="mb-8 space-y-4">
            {/* Search Bar - Professional & Subtle */}
            <div className="relative group max-w-xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 w-5 h-5 group-focus-within:text-secondary transition-colors" />
              <Input
                type="text"
                placeholder="Busca por título o autor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-12 text-base rounded-xl bg-white/[0.02] border-white/10 focus-visible:ring-secondary/20 transition-all placeholder:text-muted-foreground/30"
              />
            </div>

            {/* Professional Categories - Clean Tabs */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
              {[
                { id: "all", label: "Todas" },
                { id: "favorites", label: "Favoritos" },
                { id: "alabanza", label: "Alabanza" },
                { id: "adoracion", label: "Adoración" },
                { id: "especial", label: "Especial" },
                { id: "enganchado", label: "Enganchados" },
                { id: "otro", label: "Otro" },
                ...(isAuthorized ? [{ id: "suggestions", label: "Sugerencias" }] : [])
              ].map((cat) => {
                const isActive = selectedCategory === cat.id;
                const hasSuggestions = cat.id === 'suggestions' && songs.filter(s => s.status === 'pending').length > 0;
                
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`
                      px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200
                      ${isActive 
                        ? `bg-secondary text-primary shadow-sm` 
                        : `text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent`}
                    `}
                  >
                    <span className="flex items-center gap-2">
                      {cat.label}
                      {hasSuggestions && (
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      )}
                    </span>
                  </button>
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

      <FloatingActionButton 
        icon={<Plus className="w-6 h-6" />}
        label="Nueva Canción"
        onClick={() => navigate('/canciones/nueva')}
      />

      <CreateEnganchadoDialog 
        open={createEnganchadoOpen} 
        onOpenChange={setCreateEnganchadoOpen} 
        onCreated={() => fetchSongs()}
      />
    </>
  );
};

export default Canciones;
