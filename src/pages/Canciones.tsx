import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { Plus, Music, Play, ExternalLink, Search, Loader2, FileText, Headphones, Youtube, FileMusic, ChevronRight, Star, Disc3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/ui/loader";

interface Song {
  id: string;
  title: string;
  author?: string | null;
  category: "alabanza" | "adoracion" | "especial" | "otro";
  lyrics: string | null;
  chords: string | null;
  audio_url: string | null;
  youtube_url: string | null;
  created_at: string;
}

const Canciones = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { data: songs = [], isLoading: loading, refetch: fetchSongs } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Song[];
    },
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

  const categoryStyles: Record<string, { badge: string, iconColor: string, gradient: string, glow: string, textHover: string, dot: string, borderFocus: string }> = {
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
  };

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

  const filteredSongs = songs.filter((song) => {
    const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (song.author && song.author.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedCategory === "favorites") {
      return matchesSearch && favorites.includes(song.id);
    }
    
    const matchesCategory = selectedCategory === "all" || song.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <main className="flex-1 pt-20 pb-20 px-4 safe-top safe-bottom w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
                Canciones
              </h1>
              <p className="text-muted-foreground font-medium">
                Biblioteca de música del grupo
              </p>
            </div>
            
            <Button 
              variant="hero" 
              size="lg"
              className="rounded-2xl shadow-lg shadow-secondary/20"
              onClick={() => navigate('/canciones/nueva')}
            >
              <Plus className="w-5 h-5 mr-2" />
              Agregar Canción
            </Button>
          </div>

          <div className="mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar por título o autor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-base rounded-2xl bg-white/[0.03] border-white/10 focus-visible:ring-secondary/50"
              />
            </div>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="flex overflow-x-auto no-scrollbar bg-transparent p-0 gap-2 h-auto border-none">
                <TabsTrigger value="all" className="rounded-full px-5 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white bg-white/[0.03] text-muted-foreground border border-white/5 hover:bg-white/5 transition-all">Todas</TabsTrigger>
                <TabsTrigger value="favorites" className="rounded-full px-5 py-2.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/30 bg-white/[0.03] text-muted-foreground border border-white/5 hover:bg-amber-500/10 hover:text-amber-400 transition-all">
                  <Star className="w-3.5 h-3.5 mr-1.5" /> Favoritos
                </TabsTrigger>
                <TabsTrigger value="alabanza" className="rounded-full px-5 py-2.5 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 data-[state=active]:border-blue-500/30 bg-white/[0.03] text-muted-foreground border border-white/5 hover:bg-blue-500/10 transition-all">Alabanza</TabsTrigger>
                <TabsTrigger value="adoracion" className="rounded-full px-5 py-2.5 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/30 bg-white/[0.03] text-muted-foreground border border-white/5 hover:bg-purple-500/10 transition-all">Adoración</TabsTrigger>
                <TabsTrigger value="especial" className="rounded-full px-5 py-2.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/30 bg-white/[0.03] text-muted-foreground border border-white/5 hover:bg-amber-500/10 transition-all">Especial</TabsTrigger>
                <TabsTrigger value="otro" className="rounded-full px-5 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white bg-white/[0.03] text-muted-foreground border border-white/5 hover:bg-white/5 transition-all">Otro</TabsTrigger>
              </TabsList>
            </Tabs>
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
              {filteredSongs.map((song) => {
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
                            <p className="text-sm text-white/40 font-medium flex items-center gap-2">
                              {song.author}
                            </p>
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
        </div>
      </main>
    </>
  );
};

export default Canciones;
