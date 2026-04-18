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

  if (authLoading || !user) {
    return null;
  }

  const categoryStyles: Record<string, { badge: string, iconBg: string, iconColor: string, cardBorder: string, cardBg: string, highlight: string }> = {
    alabanza: {
      badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      iconBg: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-400",
      cardBorder: "border-blue-500/20 hover:border-blue-500/40",
      cardBg: "hover:bg-blue-500/5",
      highlight: "bg-blue-500"
    },
    adoracion: {
      badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      iconBg: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-400",
      cardBorder: "border-purple-500/20 hover:border-purple-500/40",
      cardBg: "hover:bg-purple-500/5",
      highlight: "bg-purple-500"
    },
    especial: {
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      iconBg: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-400",
      cardBorder: "border-amber-500/20 hover:border-amber-500/40",
      cardBg: "hover:bg-amber-500/5",
      highlight: "bg-amber-500"
    },
    otro: {
      badge: "bg-gray-500/20 text-gray-300 border-gray-500/40",
      iconBg: "from-gray-500/20 to-gray-500/5",
      iconColor: "text-gray-400",
      cardBorder: "border-gray-500/20 hover:border-gray-500/40",
      cardBg: "hover:bg-gray-500/5",
      highlight: "bg-gray-500"
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
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">Todas</TabsTrigger>
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
                      className={`group relative p-6 bg-card transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full shadow-md hover:shadow-xl border ${style.cardBorder} ${style.cardBg}`}
                      onClick={() => navigate(`/canciones/${song.id}`)}
                    >
                      {/* Top color highlight line */}
                      <div className={`absolute top-0 left-0 w-full h-1 ${style.highlight} opacity-50 group-hover:opacity-100 transition-opacity`} />
                      
                      {/* Animated gradient border effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      
                      <div className="relative z-10 flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${style.iconBg}`}>
                             <Music className={`w-6 h-6 ${style.iconColor}`} />
                          </div>
                          <div>
                            <Badge
                              variant="outline"
                              className={`mb-1.5 ${style.badge}`}
                            >
                              {song.category}
                            </Badge>
                            <h3 className={`font-bold text-lg text-foreground line-clamp-1 transition-colors group-hover:${style.iconColor}`}>
                              {song.title}
                            </h3>
                            {song.author && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {song.author}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="relative z-10 flex-grow">
                        {/* Indicators */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {song.lyrics && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-md border border-border/50 shadow-sm">
                              <FileText className="w-3 h-3" />
                              Letra
                            </div>
                          )}
                          {song.chords && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-md border border-border/50 shadow-sm">
                              <FileMusic className="w-3 h-3" />
                              Acordes
                            </div>
                          )}
                          {song.audio_url && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-md border border-border/50 shadow-sm">
                              <Headphones className="w-3 h-3" />
                              Audio
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Area */}
                      <div className="relative z-10 flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                        <span className="text-xs font-medium text-secondary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-x-2 group-hover:translate-x-0">
                          Abrir detalles <ChevronRight className="w-3 h-3" />
                        </span>
                        
                        {song.youtube_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-colors ml-auto z-20 relative"
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
