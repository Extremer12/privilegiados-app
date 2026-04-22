import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { Plus, Music, Play, ExternalLink, Search, Loader2, FileText, Headphones, Youtube, FileMusic, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

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

  const categoryStyles: Record<string, { badge: string, iconColor: string, gradient: string, glow: string, textHover: string, dot: string }> = {
    alabanza: {
      badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      iconColor: "text-blue-500",
      gradient: "from-blue-950/30 via-background to-background",
      glow: "hover:shadow-[0_0_40px_-15px_rgba(59,130,246,0.4)] hover:border-blue-500/30",
      textHover: "group-hover:text-blue-400",
      dot: "bg-blue-500"
    },
    adoracion: {
      badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      iconColor: "text-purple-500",
      gradient: "from-purple-950/30 via-background to-background",
      glow: "hover:shadow-[0_0_40px_-15px_rgba(168,85,247,0.4)] hover:border-purple-500/30",
      textHover: "group-hover:text-purple-400",
      dot: "bg-purple-500"
    },
    especial: {
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      iconColor: "text-amber-500",
      gradient: "from-amber-950/30 via-background to-background",
      glow: "hover:shadow-[0_0_40px_-15px_rgba(245,158,11,0.4)] hover:border-amber-500/30",
      textHover: "group-hover:text-amber-400",
      dot: "bg-amber-500"
    },
    otro: {
      badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",
      iconColor: "text-gray-500",
      gradient: "from-neutral-900/40 via-background to-background",
      glow: "hover:shadow-[0_0_40px_-15px_rgba(156,163,175,0.4)] hover:border-gray-500/30",
      textHover: "group-hover:text-gray-400",
      dot: "bg-gray-500"
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
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
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Canciones
              </h1>
              <p className="text-muted-foreground">
                Biblioteca de canciones del grupo
              </p>
            </div>
            
            <Button 
              variant="hero" 
              size="lg"
              onClick={() => navigate('/canciones/nueva')}
            >
              <Plus className="w-5 h-5 mr-2" />
              Agregar Canción
            </Button>
          </div>

          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar por título o autor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="favorites" className="text-amber-500 font-bold">Favoritos</TabsTrigger>
                <TabsTrigger value="alabanza">Alabanza</TabsTrigger>
                <TabsTrigger value="adoracion">Adoración</TabsTrigger>
                <TabsTrigger value="especial">Especial</TabsTrigger>
                <TabsTrigger value="otro">Otro</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-6 card-gradient border-secondary/20 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-secondary/20" />
                  <div className="flex items-start gap-4 mb-4">
                    <Skeleton className="w-12 h-12 rounded-xl bg-secondary/10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4 bg-secondary/10" />
                      <Skeleton className="h-4 w-1/3 bg-secondary/10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-full bg-secondary/10" />
                    <Skeleton className="h-9 w-full bg-secondary/10" />
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredSongs.map((song) => {
                const style = categoryStyles[song.category] || categoryStyles.otro;
                
                return (
                  <motion.div key={song.id} variants={itemVariants} className="h-full">
                    <Card 
                      className={`group relative p-6 bg-gradient-to-br ${style.gradient} border-secondary/10 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-[280px] shadow-lg ${style.glow}`}
                      onClick={() => navigate(`/canciones/${song.id}`)}
                    >
                      {/* Giant watermark icon */}
                      <Music className={`absolute -right-8 -bottom-8 w-40 h-40 opacity-[0.03] transform group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700 pointer-events-none ${style.iconColor}`} />
                      
                      <div className="relative z-10 flex-grow flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <Badge variant="outline" className={`px-3 py-1 font-bold tracking-widest text-[10px] uppercase rounded-full backdrop-blur-md ${style.badge}`}>
                            {song.category}
                          </Badge>
                          
                          <div className="flex gap-2">
                            {favorites.includes(song.id) && (
                              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 backdrop-blur-md border border-amber-500/20" title="Favorito">
                                <Star className="w-4 h-4 fill-amber-500" />
                              </div>
                            )}
                            {song.youtube_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-full bg-black/40 hover:bg-red-500 hover:text-white text-muted-foreground transition-colors z-20 backdrop-blur-md border border-white/5"
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
                        
                        <div className="mt-auto">
                          <h3 className={`font-black text-2xl md:text-3xl tracking-tight leading-none mb-2 text-foreground ${style.textHover} transition-colors line-clamp-2`}>
                            {song.title}
                          </h3>
                          
                          {song.author ? (
                            <p className="text-sm text-neutral-400 font-medium flex items-center gap-2 mb-5">
                              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                              {song.author}
                            </p>
                          ) : (
                            <div className="h-4 mb-5" /> // Spacer if no author
                          )}
                           
                          {/* Indicators */}
                          <div className="flex flex-wrap gap-2 items-center justify-between border-t border-white/5 pt-4">
                            <div className="flex gap-2">
                              {song.lyrics && (
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/30 text-neutral-300 border border-white/5 shadow-sm" title="Tiene letra">
                                  <FileText className="w-4 h-4" />
                                </div>
                              )}
                              {song.chords && (
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/30 text-neutral-300 border border-white/5 shadow-sm" title="Tiene acordes">
                                  <FileMusic className="w-4 h-4" />
                                </div>
                              )}
                              {song.audio_url && (
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/30 text-neutral-300 border border-white/5 shadow-sm" title="Tiene audio">
                                  <Headphones className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
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
