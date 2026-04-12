import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AddSongDialog } from "@/components/AddSongDialog";
import { Plus, Music, Play, ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Song {
  id: string;
  title: string;
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
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSongs();
    }
  }, [user]);

  const fetchSongs = async () => {
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSongs(data || []);
    } catch (error) {
      console.error("Error fetching songs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  const categoryColors: Record<string, string> = {
    alabanza: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    adoracion: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    especial: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    otro: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  };

  const filteredSongs = songs.filter((song) => {
    const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || song.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary via-primary/95 to-primary/80">
      <Navigation />
      <main className="flex-1 pt-20 pb-20 px-4 safe-top safe-bottom">
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
            
            <AddSongDialog
              onSongAdded={fetchSongs}
              trigger={
                <Button variant="hero" size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Agregar Canción
                </Button>
              }
            />
          </div>

          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar canciones..."
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
            <div className="text-center py-12">
              <p className="text-muted-foreground">Cargando canciones...</p>
            </div>
          ) : filteredSongs.length === 0 ? (
            <Card className="p-12 card-gradient border-secondary/20 text-center">
              <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {songs.length === 0 ? "No hay canciones aún" : "No se encontraron canciones"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {songs.length === 0 
                  ? "Comienza agregando tu primera canción"
                  : "Intenta con otro término de búsqueda o categoría"}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSongs.map((song) => (
                <Card 
                  key={song.id} 
                  className="p-6 card-gradient border-secondary/20 hover:border-secondary/40 transition-all hover-lift overflow-hidden"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Music className="w-6 h-6 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-2 truncate">
                        {song.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className={categoryColors[song.category] || categoryColors.otro}
                      >
                        {song.category}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/canciones/${song.id}`)}
                    >
                      Ver Detalles
                    </Button>
                    
                    {song.youtube_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(song.youtube_url!, "_blank");
                        }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        YouTube
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Canciones;
