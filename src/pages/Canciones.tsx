import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useGroup } from "@/hooks/useGroupContext";

import { supabase } from "@/integrations/supabase/client";
import { fetchSongsWithProfiles } from "@/services/songService";

import { Plus, Music, Search, FileText, Headphones, Youtube, FileMusic, ChevronRight, Star, Disc3, ArrowUp, AlertCircle, ListMusic, Sparkles } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const Canciones = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [createEnganchadoOpen, setCreateEnganchadoOpen] = useState(false);
  const [addChoiceOpen, setAddChoiceOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);
  const { isAdmin, isLeader, isModerator } = useUserRole();
  const { activeGroup, isGroupAdmin, isGroupLeader } = useGroup();
  const isAuthorized = isAdmin || isLeader || isModerator || isGroupAdmin || isGroupLeader;

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
    queryKey: ['songs', activeGroup?.id],
    queryFn: async () => {
      if (!activeGroup) return [];
      const { data, error } = await supabase
        .from("songs")
        .select("*, creator_profile:profiles!songs_created_by_profile_fkey(full_name, avatar_url)")
        .eq("group_id", activeGroup.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Song[];
    },
    enabled: !!user && !!activeGroup,
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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 pt-20 pb-20 px-4 w-full">
        <div className="max-w-7xl mx-auto">
          {/* Header Section - Minimalist */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Canciones
              </h1>
              <p className="text-muted-foreground text-sm font-medium">
                Biblioteca musical del grupo
              </p>
            </div>
            
            <div className="hidden sm:flex items-center gap-3">
              <Button 
                variant="hero" 
                size="sm"
                className="h-10 px-5 rounded-xl shadow-md font-bold text-sm"
                onClick={() => {
                  vibrateLight();
                  setAddChoiceOpen(true);
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
                className="pl-11 h-12 text-base rounded-xl bg-muted/50 border-border focus-visible:ring-secondary/20 transition-all placeholder:text-muted-foreground/50"
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
                        : `text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent`}
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
                <Card key={i} className="p-6 bg-card border-border rounded-3xl relative overflow-hidden h-[240px]">
                  <div className="space-y-4 h-full flex flex-col">
                    <div className="flex justify-between">
                      <Skeleton className="w-20 h-6 rounded-full bg-muted" />
                      <Skeleton className="w-8 h-8 rounded-full bg-muted" />
                    </div>
                    <div className="mt-auto space-y-3">
                      <Skeleton className="h-8 w-3/4 bg-muted" />
                      <Skeleton className="h-4 w-1/2 bg-muted" />
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-border mt-4">
                      <Skeleton className="w-6 h-6 rounded bg-muted" />
                      <Skeleton className="w-6 h-6 rounded bg-muted" />
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
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {visibleSongs.map((song) => {
                const style = categoryStyles[song.category] || categoryStyles.otro;
                const isFav = favorites.includes(song.id);
                
                // Deterministic beautiful abstract images for covers matching Screen 3
                const coverImages: Record<string, string> = {
                  alabanza: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=200&auto=format&fit=crop",
                  adoracion: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=200&auto=format&fit=crop",
                  especial: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=200&auto=format&fit=crop",
                  enganchado: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=200&auto=format&fit=crop",
                  otro: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop"
                };
                
                const coverUrl = coverImages[song.category] || coverImages.otro;

                // Tone/Key fallback
                const songKey = song.key || "G";

                return (
                  <motion.div key={song.id} variants={itemVariants}>
                    <Card 
                      className="group relative p-4 bg-card backdrop-blur-xl border border-border hover:border-secondary/35 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden flex items-center justify-between shadow-lg shadow-black/5 dark:shadow-black/30 hover:-translate-y-0.5"
                      onClick={() => navigate(`/canciones/${song.id}`)}
                    >
                      {/* Left: Album cover & Song details */}
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Song Album Cover */}
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-border shadow-md">
                          <img 
                            src={coverUrl} 
                            alt={song.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {isFav && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center border border-amber-500/30 backdrop-blur-sm">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 space-y-1">
                          <h3 className="font-black text-[17px] tracking-tight leading-tight text-foreground group-hover:text-secondary transition-colors truncate">
                            {song.title}
                          </h3>
                          {song.author && (
                            <p className="text-xs text-muted-foreground font-bold truncate">
                              {song.author}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <Badge variant="outline" className={`px-2 py-0.5 font-bold text-[9px] uppercase tracking-wider rounded-full backdrop-blur-md ${style.badge}`}>
                              {song.category}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Right: Discreet Tono badge and ellipse button */}
                      <div className="flex items-center gap-3.5 flex-shrink-0">
                        {/* Small elegant gold-bordered Tone badge */}
                        <div className="flex flex-col items-center justify-center w-11 h-11 rounded-full border border-secondary/35 bg-background shadow-inner flex-shrink-0">
                          <span className="text-sm font-black text-secondary leading-none">
                            {songKey}
                          </span>
                          <span className="text-[7.5px] font-black uppercase text-muted-foreground tracking-wider mt-0.5 leading-none">
                            Tono
                          </span>
                        </div>

                        {/* Arrow or actions */}
                        <div className="w-8 h-8 rounded-full bg-muted/50 group-hover:bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-all">
                          <ChevronRight className="w-4 h-4" />
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
                className="rounded-full px-8 py-6 bg-muted/50 border-border hover:bg-muted text-foreground font-medium shadow-lg shadow-black/5 dark:shadow-black/20"
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
        onClick={() => {
          vibrateLight();
          setAddChoiceOpen(true);
        }}
      />

      {/* Choice Modal: Single Song vs Enganchado */}
      <Dialog open={addChoiceOpen} onOpenChange={setAddChoiceOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-white/10 bg-background/95 backdrop-blur-2xl p-6 shadow-2xl">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
              ¿Qué deseas agregar?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Selecciona el tipo de contenido musical que deseas añadir.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3.5 pt-2">
            {/* Option 1: AI Assistant (Featured) */}
            <button
              onClick={() => {
                vibrateLight();
                setAddChoiceOpen(false);
                navigate('/canciones/nueva?ai=true');
              }}
              className="group flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/30 hover:border-indigo-500/50 transition-all text-left shadow-sm"
            >
              <div className="p-3.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-base text-foreground group-hover:text-indigo-400 transition-colors">
                    Autocompletar con IA
                  </h3>
                  <Badge variant="outline" className="text-[10px] uppercase font-extrabold border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
                    Gemini Flash
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Escribe el título y Gemini buscará acordes verificados, ordenará las secciones y el video por ti.
                </p>
              </div>
            </button>

            {/* Option 2: Single Song */}
            <button
              onClick={() => {
                vibrateLight();
                setAddChoiceOpen(false);
                navigate('/canciones/nueva');
              }}
              className="group flex items-start gap-4 p-4 rounded-2xl bg-muted/40 hover:bg-secondary/15 border border-border/50 hover:border-secondary/40 transition-all text-left"
            >
              <div className="p-3.5 rounded-xl bg-secondary/20 text-secondary group-hover:scale-105 transition-transform shrink-0">
                <Music className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-base text-foreground group-hover:text-secondary transition-colors">
                    Canción Individual
                  </h3>
                  <Badge variant="outline" className="text-[10px] uppercase font-extrabold border-secondary/30 text-secondary">
                    Estándar
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ingresa una canción desde cero con letra, acordes, audio o enlace de YouTube.
                </p>
              </div>
            </button>

            {/* Option 2: Enganchado */}
            <button
              onClick={() => {
                vibrateLight();
                setAddChoiceOpen(false);
                setCreateEnganchadoOpen(true);
              }}
              className="group flex items-start gap-4 p-4 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/40 transition-all text-left"
            >
              <div className="p-3.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                <ListMusic className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-base text-foreground group-hover:text-emerald-400 transition-colors">
                    Crear Enganchado
                  </h3>
                  <Badge variant="outline" className="text-[10px] uppercase font-extrabold border-emerald-500/30 text-emerald-400">
                    Combinación
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Une 2 o más canciones existentes de la biblioteca en una sola secuencia continua.
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateEnganchadoDialog 
        open={createEnganchadoOpen} 
        onOpenChange={setCreateEnganchadoOpen} 
        onCreated={() => fetchSongs()}
      />
    </>
  );
};

export default Canciones;
