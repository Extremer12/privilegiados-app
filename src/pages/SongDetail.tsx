import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Navigation removed
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Music, ExternalLink, Edit, Trash2, Maximize2, ChevronUp, ChevronDown, Printer, Youtube, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";

import { toast } from "@/hooks/use-toast";
import { PresentationMode } from "@/components/PresentationMode";
import { PrintPreviewMode } from "@/components/PrintPreviewMode";
import { SongComments } from "@/components/SongComments";
import { transposeChords } from "@/utils/chordTransposer";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Song {
  id: string;
  title: string;
  category: "alabanza" | "adoracion" | "especial" | "otro";
  author: string | null;
  lyrics: string | null;
  chords: string | null;
  audio_url: string | null;
  youtube_url: string | null;
  created_at: string;
  created_by?: string;
}

const SongDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useUserRole();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [transposeSteps, setTransposeSteps] = useState(0);
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: song, isLoading: loading } = useQuery({
    queryKey: ['song', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        throw new Error("Canción no encontrada");
      }
      
      return data as Song;
    },
    enabled: !!id && !!user,
  });

  useEffect(() => {
    if (song) {
      setIsOwner(song.created_by === user?.id);
    }
  }, [song, user?.id]);

  // Favorite status query
  const { data: favoriteData, refetch: refetchFavorite } = useQuery({
    queryKey: ['favorite', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorite_songs")
        .select("id")
        .eq("song_id", id)
        .eq("user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const isFavorite = !!favoriteData;

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        const { error } = await supabase
          .from("favorite_songs")
          .delete()
          .eq("song_id", id)
          .eq("user_id", user?.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorite_songs")
          .insert({
            song_id: id,
            user_id: user?.id
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetchFavorite();
      toast({
        title: isFavorite ? "Quitado de favoritos" : "Añadido a favoritos",
        description: isFavorite ? "La canción ya no está en tus favoritos" : "La canción se ha guardado en tus favoritos",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!song) throw new Error("No hay canción seleccionada");
      const { error } = await supabase
        .from("songs")
        .delete()
        .eq("id", song.id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Canción eliminada",
        description: "La canción se ha eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      navigate("/canciones");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleDelete = async () => {
    deleteMutation.mutate();
  };

  const handlePrint = () => {
    window.print();
  };

  const transposedChords = song?.chords 
    ? transposeChords(song.chords, transposeSteps)
    : null;

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  if (!song) {
    return (
      <>
        <main className="flex-1 pt-24 pb-20 px-4 w-full">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-muted-foreground">Canción no encontrada</p>
          </div>
        </main>
      </>
    );
  }

  const categoryColors: Record<string, string> = {
    alabanza: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    adoracion: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    especial: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    otro: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  };

  return (
    <>
      <main className="flex-1 pt-20 pb-20 px-4 safe-top safe-bottom w-full">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/canciones")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              Volver
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleFavoriteMutation.mutate()}
                disabled={toggleFavoriteMutation.isPending}
                className={`transition-all ${isFavorite ? 'text-amber-500 border-amber-500/50 bg-amber-500/10' : ''}`}
              >
                <Star className={`w-4 h-4 md:mr-2 ${isFavorite ? 'fill-amber-500' : ''}`} aria-hidden="true" />
                <span className="hidden md:inline">{isFavorite ? 'Favorito' : 'Marcar Favorito'}</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/canciones/${id}/editar`)}
              >
                <Edit className="w-4 h-4 md:mr-2" aria-hidden="true" />
                <span className="hidden md:inline">Editar</span>
              </Button>
              <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 md:mr-2" aria-hidden="true" />
                  <span className="hidden md:inline">Eliminar</span>
                </Button>
            </div>
          </div>

          <Card className="p-6 md:p-8 card-gradient border-secondary/20 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <Music className="w-8 h-8 text-secondary" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 break-words">
                  {song.title}
                </h1>
                {song.author && (
                  <p className="text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
                    <span className="opacity-75">Por</span> {song.author}
                  </p>
                )}
                <Badge
                  variant="outline"
                  className={`${categoryColors[song.category] || categoryColors.otro} ${!song.author ? 'mt-2' : ''}`}
                >
                  {song.category}
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-6 flex flex-wrap gap-2">
              {song.lyrics && (
                <Button
                  variant="hero"
                  className="flex-1"
                  onClick={() => setShowPresentation(true)}
                >
                  <Maximize2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  Modo Presentación
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPrintPreview(true)}
              >
                <Printer className="w-4 h-4 mr-2" aria-hidden="true" />
                Imprimir
              </Button>
              {song.youtube_url && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(song.youtube_url!, "_blank")}
                >
                  <Youtube className="w-4 h-4 mr-2" aria-hidden="true" />
                  Abrir en YouTube
                  <ExternalLink className="w-3 h-3 ml-1" aria-hidden="true" />
                </Button>
              )}
            </div>

            {/* YouTube Player */}
            {song.youtube_url && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Youtube className="w-5 h-5 text-red-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Video de YouTube
                  </h3>
                </div>
                <YouTubePlayer url={song.youtube_url} />
              </div>
            )}

            {song.audio_url && (
              <div className="mb-6 p-4 bg-background/30 rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Audio
                </h3>
                <audio controls className="w-full">
                  <source src={song.audio_url} />
                  Tu navegador no soporta el elemento de audio.
                </audio>
              </div>
            )}

            {song.lyrics && (
              <div className="mb-6 p-4 bg-background/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Letra
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFontSize((prev) => Math.max(prev - 2, 12))}
                    >
                      A-
                    </Button>
                    <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
                      {fontSize}px
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFontSize((prev) => Math.min(prev + 2, 32))}
                    >
                      A+
                    </Button>
                  </div>
                </div>
                <pre 
                  className="text-foreground whitespace-pre-wrap font-sans leading-relaxed"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {song.lyrics}
                </pre>
              </div>
            )}

            {song.chords && (
              <div className="mb-6 p-4 bg-background/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Acordes
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Transponer:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransposeSteps((prev) => prev - 1)}
                      aria-label="Disminuir tono"
                    >
                      <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    <span className="text-sm font-medium min-w-[3rem] text-center text-foreground font-mono">
                      {transposeSteps > 0 ? `+${transposeSteps}` : transposeSteps}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransposeSteps((prev) => prev + 1)}
                      aria-label="Aumentar tono"
                    >
                      <ChevronUp className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    {transposeSteps !== 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTransposeSteps(0)}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
                <pre className="text-foreground whitespace-pre-wrap font-mono text-sm md:text-base">
                  {transposedChords}
                </pre>
              </div>
            )}
          </Card>

          {/* Comments Section */}
          <SongComments songId={song.id} />
        </div>
      </main>

      {/* Presentation Mode */}
      {showPresentation && song.lyrics && (
        <PresentationMode
          lyrics={song.lyrics}
          title={song.title}
          onClose={() => setShowPresentation(false)}
        />
      )}

      {/* Print Preview Mode */}
      {showPrintPreview && (
        <PrintPreviewMode
          title={song.title}
          author={song.author}
          category={song.category}
          content={transposedChords || song.lyrics || ""}
          onClose={() => setShowPrintPreview(false)}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La canción será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SongDetail;
