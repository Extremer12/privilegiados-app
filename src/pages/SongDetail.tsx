import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { fetchSongById } from "@/services/songService";
import { 
  ArrowLeft, Edit, Trash2, Maximize2, ZoomIn, ZoomOut,
  Printer, Youtube, Star, Music, BadgeInfo, Share2, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";

import { toast } from "sonner";
import { PresentationMode } from "@/components/PresentationMode";
import { PrintPreviewMode } from "@/components/PrintPreviewMode";
import { SongComments } from "@/components/SongComments";
import { transposeChords } from "@/utils/chordTransposer";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { vibrateLight } from "@/utils/haptics";
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

import type { Song } from "@/types";

const SongDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLeader, isModerator } = useUserRole();
  const isAuthorized = isAdmin || isLeader || isModerator;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [transposeSteps, setTransposeSteps] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [activeTab, setActiveTab] = useState<"lyrics" | "details" | "comments">("lyrics");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: song, isLoading: loading } = useQuery({
    queryKey: ['song', id],
    queryFn: () => fetchSongById(id!),
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

  const { data: stats } = useQuery({
    queryKey: ['song_stats', id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('setlist_songs')
        .select('*', { count: 'exact', head: true })
        .eq('song_id', id);
      if (error) throw error;
      return count || 0;
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
      toast.success(isFavorite ? "Quitado de favoritos" : "Añadido a favoritos", {
        description: isFavorite ? "La canción ya no está en tus favoritos" : "La canción se ha guardado en tus favoritos",
      });
    },
    onError: (error: any) => {
      toast.error("Error", {
        description: error.message,
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
      toast.success("Canción eliminada", {
        description: "La canción se ha eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      navigate("/canciones");
    },
    onError: (error: any) => {
      toast.error("Error", {
        description: error.message,
      });
    }
  });

  const handleDelete = async () => {
    deleteMutation.mutate();
  };

  const handleShare = async () => {
    if (!song) return;
    
    const shareData = {
      title: `Canción: ${song.title}`,
      text: `Mira la canción "${song.title}" de ${song.author || "Autor Desconocido"} en la app Privilegiados`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("¡Compartido con éxito!");
      } catch (error: any) {
        if (error.name !== "AbortError") {
          toast.error("Error al compartir", { description: error.message });
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Enlace copiado", {
          description: "El enlace de la canción se copió al portapapeles",
        });
      } catch (err: any) {
        toast.error("No se pudo copiar el enlace");
      }
    }
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!song) throw new Error("No hay canción seleccionada");
      const { error } = await supabase
        .from("songs")
        .update({ status: 'approved' })
        .eq("id", song.id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("¡Canción aprobada!", {
        description: "La canción ahora es visible para todos",
      });
      queryClient.invalidateQueries({ queryKey: ['song', id] });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    },
    onError: (error: any) => {
      toast.error("Error", {
        description: error.message,
      });
    }
  });

  const transposedChords = song?.chords 
    ? transposeChords(song.chords, transposeSteps)
    : null;

  // Chord Highlighting Parser Function
  const renderHighlightedChords = (chordsText: string | null) => {
    if (!chordsText) return "";
    
    const lines = chordsText.split("\n");
    const parsedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return `<span class="block h-4"></span>`;
      
      const isChordLine = /^[A-G][b#]?(?:2|4|5|6|7|9|11|13|maj|min|sus|dim|aug|add|m)?(?:\d)?(?:\/[A-G][b#]?)?(?:\s+[A-G][b#]?(?:2|4|5|6|7|9|11|13|maj|min|sus|dim|aug|add|m)?(?:\d)?(?:\/[A-G][b#]?)?)*\s*$/.test(trimmed);
      
      if (isChordLine) {
        const replaced = line.replace(/\b([A-G][b#]?(?:2|4|5|6|7|9|11|13|maj|min|sus|dim|aug|add|m)?(?:\d)?(?:\/[A-G][b#]?)?)\b/g, 
          `<span class="text-secondary font-black font-mono tracking-wider">$1</span>`
        );
        return `<span class="block leading-none h-[1.3rem] font-mono whitespace-pre">${replaced}</span>`;
      }
      return `<span class="block text-foreground font-sans leading-relaxed py-0.5">${line}</span>`;
    });
    return parsedLines.join("");
  };

  const increaseFontSize = () => setFontSize((prev) => Math.min(prev + 2, 32));
  const decreaseFontSize = () => setFontSize((prev) => Math.max(prev - 2, 12));

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }
 
  if (!song) {
    return (
      <main className="flex-1 pt-24 pb-20 px-4 w-full bg-background transition-colors duration-300">
        <div className="max-w-4xl mx-auto text-center py-20">
          <BadgeInfo className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
          <h2 className="text-2xl font-bold text-foreground">Canción no encontrada</h2>
          <Button onClick={() => navigate("/canciones")} className="mt-4 bg-secondary text-primary-foreground hover:bg-secondary/90 rounded-xl h-12">
            Volver a Canciones
          </Button>
        </div>
      </main>
    );
  }

  const categoryConfig: Record<string, { label: string }> = {
    alabanza: { label: "Alabanza" },
    adoracion: { label: "Adoración" },
    especial: { label: "Especial" },
    otro: { label: "Otro" }
  };

  return (
    <>
      <main className="flex-1 pt-24 pb-28 px-4 safe-top safe-bottom w-full bg-background transition-colors duration-300">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => navigate("/canciones")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>

          {/* Song Header — full-width, theme-aware */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-start md:items-center gap-5 justify-between pb-6 border-b border-border"
          >
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 border-secondary/35 bg-muted shadow-xl flex-shrink-0">
                <Music className="w-6 h-6 text-secondary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge className="bg-secondary/15 text-secondary border border-secondary/20 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                    {categoryConfig[song.category]?.label || "Otro"}
                  </Badge>
                  <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                    Tono: {song.key || "—"}
                  </Badge>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground leading-tight">
                  {song.title}
                </h2>
                <p className="text-xs text-muted-foreground font-semibold mt-1">
                  por {song.author || "Autor Desconocido"}
                </p>
              </div>
            </div>
 
            {isAuthorized && (
              <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
                <Button
                  onClick={() => navigate(`/canciones/${song.id}/editar`)}
                  className="flex-1 md:flex-initial h-10 rounded-xl bg-secondary text-primary-foreground hover:opacity-90 font-bold text-xs uppercase tracking-wider shadow-md shadow-secondary/10"
                >
                  <Edit className="w-3.5 h-3.5 mr-2" />
                  Editar
                </Button>
                <Button
                  onClick={() => {
                    vibrateLight();
                    setShowDeleteDialog(true);
                  }}
                  variant="ghost"
                  className="flex-1 md:flex-initial h-10 rounded-xl bg-red-500/5 hover:bg-red-500/20 text-red-500 border border-red-500/10 text-xs font-bold uppercase tracking-wider"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Eliminar
                </Button>
              </div>
            )}
          </motion.div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2.5">
            {song.lyrics && (
              <Button onClick={() => setShowPresentation(true)} className="flex-1 rounded-xl h-11 bg-secondary text-primary-foreground font-bold">
                <Maximize2 className="w-4 h-4 mr-2" /> Presentación
              </Button>
            )}
            <Button variant="outline" className="flex-1 rounded-xl h-11 border-border" onClick={() => setShowPrintPreview(true)}>
              <Printer className="w-4 h-4 mr-2 text-muted-foreground" /> Imprimir
            </Button>
            <Button variant="outline" className="flex-1 rounded-xl h-11 border-border" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2 text-muted-foreground" /> Compartir
            </Button>
          </div>

          {/* Assistant Harmonize Banner if missing chords */}
          {(!song.chords || song.chords.trim() === "" || song.chords.trim() === song.lyrics?.trim()) && isAuthorized && (
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    Esta canción aún no tiene acordes
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Puedes agregar los acordes oficiales de CifraClub y estructurar estrofas con el asistente musical.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate(`/canciones/${song.id}/editar`)}
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs sm:text-sm h-10 px-4 shrink-0 gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Armonizar con IA
              </Button>
            </div>
          )}

          {/* Tabs Selector */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("lyrics")}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === "lyrics"
                  ? "border-secondary text-secondary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Letra y Acordes
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === "details"
                  ? "border-secondary text-secondary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Multimedia
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === "comments"
                  ? "border-secondary text-secondary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Comentarios
            </button>
          </div>
 
          {activeTab === "lyrics" && (
            <div className="flex flex-col gap-5 w-full">
              {/* YouTube Player — Prominent */}
              {song.youtube_url && (
                <div className="w-full rounded-2xl overflow-hidden border border-border shadow-lg">
                  <YouTubePlayer url={song.youtube_url} />
                </div>
              )}

              {/* Font Size Controls */}
              <div className="flex items-center justify-between bg-muted/60 border border-border rounded-xl px-4 py-2.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tamaño de letra</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={decreaseFontSize}
                    className="h-8 w-8 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-bold text-foreground min-w-[3rem] text-center">{fontSize}px</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={increaseFontSize}
                    className="h-8 w-8 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Lyrics / Chords */}
              <div className="bg-muted/40 border border-border p-5 rounded-2xl w-full">
                {transposedChords ? (
                  <div className="whitespace-pre-wrap select-text text-foreground" style={{ fontSize: `${fontSize}px` }} dangerouslySetInnerHTML={{ __html: renderHighlightedChords(transposedChords) }} />
                ) : (
                  <pre className="text-foreground whitespace-pre-wrap font-sans" style={{ fontSize: `${fontSize}px` }}>{song.lyrics}</pre>
                )}
              </div>
            </div>
          )}

          {activeTab === "details" && (
            <div className="space-y-6">
              {song.youtube_url && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Youtube className="w-4.5 h-4.5 text-red-500" /> Video Guía
                  </h3>
                  <div className="w-full rounded-2xl overflow-hidden border border-border shadow-lg">
                    <YouTubePlayer url={song.youtube_url} />
                  </div>
                </div>
              )}
              {song.audio_url && (
                <div className="p-5 bg-muted/50 border border-border rounded-2xl space-y-3">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">Audio</h3>
                  <audio controls className="w-full"><source src={song.audio_url} /></audio>
                </div>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div><SongComments songId={song.id} /></div>
          )}
        </div>
      </main>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border border-border rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">¿Estás seguro de eliminar esta canción?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted text-foreground border-border rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-500 text-white rounded-xl">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showPresentation && (
        <PresentationMode 
          lyrics={song.lyrics || ""} 
          title={song.title} 
          onClose={() => setShowPresentation(false)} 
        />
      )}

      {showPrintPreview && (
        <PrintPreviewMode 
          title={song.title}
          author={song.author}
          category={song.category}
          content={transposedChords || song.lyrics}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </>
  );
};

export default SongDetail;
