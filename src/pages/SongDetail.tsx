import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { fetchSongById } from "@/services/songService";
import { 
  ArrowLeft, Edit, Trash2, Maximize2, ChevronUp, ChevronDown, 
  Printer, Youtube, Star, BarChart3, Disc, Clock, ShieldAlert, BadgeInfo, Radio, Music
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { toast } from "sonner";
import { PresentationMode } from "@/components/PresentationMode";
import { PrintPreviewMode } from "@/components/PrintPreviewMode";
import { SongComments } from "@/components/SongComments";
import { transposeChords } from "@/utils/chordTransposer";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { vibrateLight, vibrateMedium } from "@/utils/haptics";
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

  // Chord Highlighting Parser Function matching Screen 4/5
  const renderHighlightedChords = (chordsText: string | null) => {
    if (!chordsText) return "";
    
    const lines = chordsText.split("\n");
    const parsedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return `<span class="block h-4"></span>`;
      
      // Recognition of chord lines: spaces, notes, numbers, modifiers, slashes
      const isChordLine = /^[A-G][b#]?(?:2|4|5|6|7|9|11|13|maj|min|sus|dim|aug|add|m)?(?:\d)?(?:\/[A-G][b#]?)?(?:\s+[A-G][b#]?(?:2|4|5|6|7|9|11|13|maj|min|sus|dim|aug|add|m)?(?:\d)?(?:\/[A-G][b#]?)?)*\s*$/.test(trimmed);
      
      if (isChordLine) {
        // Wrap chords in gold bold text, preserving spaces
        const replaced = line.replace(/\b([A-G][b#]?(?:2|4|5|6|7|9|11|13|maj|min|sus|dim|aug|add|m)?(?:\d)?(?:\/[A-G][b#]?)?)\b/g, 
          `<span class="text-secondary font-black font-mono tracking-wider">$1</span>`
        );
        return `<span class="block leading-none h-[1.3rem] font-mono whitespace-pre">${replaced}</span>`;
      }
      return `<span class="block text-neutral-200 font-sans leading-relaxed py-0.5">${line}</span>`;
      return `<span class="block text-foreground font-sans leading-relaxed py-0.5">${line}</span>`;
    });
    return parsedLines.join("");
  };

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

          <Card className="p-6 md:p-8 bg-card border border-border rounded-3xl shadow-2xl relative overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-[0.03] dark:opacity-10 pointer-events-none"
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=600&auto=format&fit=crop')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent dark:from-black dark:via-black/80 dark:to-transparent pointer-events-none" />
 
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between mb-8 pb-6 border-b border-border">
              <div className="flex items-center gap-4.5 w-full md:w-auto">
                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 border-secondary/35 bg-background shadow-xl flex-shrink-0">
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
            </div>
 
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 relative z-10">
              <div className="p-3 bg-muted border border-border rounded-xl flex flex-col justify-center">
                <span className="text-[8.5px] font-black uppercase text-muted-foreground tracking-wider mb-1 block">Tonalidad</span>
                <span className="text-sm font-extrabold text-foreground">{song.key || "—"}</span>
              </div>
              <div className="p-3 bg-muted border border-border rounded-xl flex flex-col justify-center">
                <span className="text-[8.5px] font-black uppercase text-muted-foreground tracking-wider mb-1 block">Tempo</span>
                <span className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                  120 BPM
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
                </span>
              </div>
              <div className="p-3 bg-muted border border-border rounded-xl flex flex-col justify-center">
                <span className="text-[8.5px] font-black uppercase text-muted-foreground tracking-wider mb-1 block">Capo sugerido</span>
                <span className="text-sm font-extrabold text-foreground">0</span>
              </div>
              <div className="p-3 bg-muted border border-border rounded-xl flex flex-col justify-center">
                <span className="text-[8.5px] font-black uppercase text-muted-foreground tracking-wider mb-1 block">Dificultad</span>
                <span className="text-sm font-extrabold text-secondary">Media</span>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2.5 relative z-10">
              {song.lyrics && (
                <Button onClick={() => setShowPresentation(true)} className="flex-1 rounded-xl h-11 bg-secondary text-primary-foreground font-bold">
                  <Maximize2 className="w-4 h-4 mr-2" /> Presentación
                </Button>
              )}
              <Button variant="outline" className="flex-1 rounded-xl h-11 border-border" onClick={() => setShowPrintPreview(true)}>
                <Printer className="w-4 h-4 mr-2 text-muted-foreground" /> Imprimir
              </Button>
            </div>
 
            {activeTab === "lyrics" && (
              <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start w-full">
                <div className="flex-1 min-w-0 flex flex-col gap-4 w-full">
                  {song.youtube_url && (
                    <div className="bg-muted/50 border border-border rounded-2xl p-4">
                      <details className="group" open>
                        <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-xs text-foreground/80">
                          <span className="flex items-center gap-2"><Youtube className="w-5 h-5 text-red-500" /> Reproductor de Video</span>
                          <span className="text-[10px] text-secondary">Mostrar/Ocultar</span>
                        </summary>
                        <div className="mt-3 pt-3 border-t border-border"><YouTubePlayer url={song.youtube_url} /></div>
                      </details>
                    </div>
                  )}
                  <div className="bg-muted/40 border border-border p-5 rounded-2xl relative w-full">
                    {transposedChords ? (
                      <div className="whitespace-pre-wrap select-text text-foreground" style={{ fontSize: `${fontSize}px` }} dangerouslySetInnerHTML={{ __html: renderHighlightedChords(transposedChords) }} />
                    ) : (
                      <pre className="text-foreground whitespace-pre-wrap font-sans" style={{ fontSize: `${fontSize}px` }}>{song.lyrics}</pre>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "details" && (
              <div className="space-y-6 relative z-10">
                {song.youtube_url && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider"><Youtube className="w-4.5 h-4.5 text-red-500" /> Video Guía</h3>
                    <YouTubePlayer url={song.youtube_url} />
                  </div>
                )}
                {song.audio_url && (
                  <div className="p-5 bg-muted/50 border border-border rounded-2xl space-y-3">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider"><Disc className="w-4.5 h-4.5 text-secondary" /> Audio</h3>
                    <audio controls className="w-full"><source src={song.audio_url} /></audio>
                  </div>
                )}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="relative z-10"><SongComments songId={song.id} /></div>
            )}
          </Card>
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
    </>
  );
};

export default SongDetail;
