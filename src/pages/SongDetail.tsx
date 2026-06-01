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
  Printer, Youtube, Star, BarChart3, Disc, Clock, ShieldAlert, BadgeInfo, Radio
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
    });
    
    return parsedLines.join("");
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040a]">
        <Loader />
      </div>
    );
  }

  if (!song) {
    return (
      <main className="flex-1 pt-24 pb-20 px-4 w-full bg-[#02040a]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground">Canción no encontrada</p>
        </div>
      </main>
    );
  }

  const categoryColors: Record<string, string> = {
    alabanza: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    adoracion: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    especial: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    otro: "bg-gray-500/10 text-gray-300 border-gray-500/30",
  };

  return (
    <>
      <main className="flex-1 pt-24 pb-28 px-4 safe-top safe-bottom w-full bg-[#02040a]">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header Action Bar */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/canciones")}
              className="text-neutral-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  vibrateLight();
                  toggleFavoriteMutation.mutate();
                }}
                disabled={toggleFavoriteMutation.isPending}
                className={`transition-all rounded-xl h-9 ${
                  isFavorite 
                    ? 'text-amber-500 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                    : 'border-white/5 hover:bg-white/5'
                }`}
              >
                <Star className={`w-4 h-4 md:mr-2 ${isFavorite ? 'fill-amber-500 text-amber-500' : 'text-neutral-400'}`} />
                <span className="hidden md:inline">{isFavorite ? 'Favorito' : 'Marcar Favorito'}</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  vibrateLight();
                  navigate(`/canciones/${id}/editar`);
                }}
                className="h-9 rounded-xl border-white/5 hover:bg-white/5"
              >
                <Edit className="w-4 h-4 md:mr-2 text-neutral-400" />
                <span className="hidden md:inline">Editar</span>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  vibrateMedium();
                  setShowDeleteDialog(true);
                }}
                className="h-9 w-9 md:w-auto md:px-4 rounded-xl border border-red-500/20"
              >
                <Trash2 className="w-4 h-4 md:mr-2 text-red-400" />
                <span className="hidden md:inline">Eliminar</span>
              </Button>
            </div>
          </div>

          {/* Pending Suggestion Notice */}
          {song.status === 'pending' && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/35 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-emerald-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-black text-emerald-400 text-sm">Esta canción es una sugerencia</p>
                  <p className="text-xs text-neutral-400">Solo directores y líderes pueden visualizarla antes de ser aprobada.</p>
                </div>
              </div>
              {isAuthorized && (
                <Button 
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl w-full md:w-auto text-xs px-5 h-10 shadow-lg shadow-emerald-900/30"
                >
                  {approveMutation.isPending ? "Aprobando..." : "Aprobar Canción"}
                </Button>
              )}
            </div>
          )}

          {/* Core Info & Chords Display Card */}
          <Card className="p-6 md:p-8 bg-[#070c1b]/60 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl relative overflow-hidden">
            {/* Visual background ambient gradient */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-secondary/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col gap-4 mb-6 relative z-10">
              {/* Category and Metrics tags */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={`${categoryColors[song.category] || categoryColors.otro} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider`}
                >
                  {song.category}
                </Badge>
                {stats !== undefined && stats > 0 && (
                  <Badge variant="outline" className="px-3 py-1 rounded-full text-[10px] font-black bg-white/[0.03] text-neutral-300 border-white/5 flex items-center gap-1.5 uppercase tracking-wider">
                    <Radio className="w-3 h-3 text-secondary animate-pulse" />
                    Tocada {stats} {stats === 1 ? 'vez' : 'veces'} en culto
                  </Badge>
                )}
              </div>
              
              {/* Song Title and Author and Discreet Tono */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-3xl md:text-5xl font-black text-white leading-tight break-words tracking-tight">
                    {song.title}
                  </h1>
                  {song.author && (
                    <p className="text-lg md:text-xl text-neutral-400 font-bold mt-1.5 flex items-center gap-1.5">
                      Por <span className="text-white font-extrabold">{song.author}</span>
                      <span className="w-4.5 h-4.5 rounded-full bg-secondary/15 flex items-center justify-center border border-secondary/20 shadow-sm" title="Artista Verificado">
                        <span className="text-[8px] text-secondary font-black">✓</span>
                      </span>
                    </p>
                  )}
                </div>

                {/* DISCREET TONO BADGE (Small refined circle matching user visual requests) */}
                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 border-secondary/35 bg-[#02040a] shadow-xl flex-shrink-0">
                  <span className="text-lg font-black text-secondary leading-none">
                    {song.key || "G"}
                  </span>
                  <span className="text-[7.5px] font-black uppercase text-neutral-500 tracking-wider mt-0.5 leading-none">
                    Tono
                  </span>
                </div>
              </div>

              {/* Creator details */}
              {song.creator_profile && (
                <div className="flex items-center gap-2.5 mt-2 pt-4 border-t border-white/[0.04]">
                  <Avatar className="w-7 h-7 border border-white/10">
                    <AvatarImage src={song.creator_profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary/10 text-secondary font-black text-[9px]">
                      {song.creator_profile.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-neutral-400 font-semibold">
                    Agregada por <span className="text-white font-bold">{song.creator_profile.full_name}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Performance Details Grid (Screen 4 Theme) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 relative z-10">
              <div className="p-3 bg-[#02040a]/40 border border-white/[0.03] rounded-xl flex flex-col justify-center">
                <span className="text-[8.5px] font-black uppercase text-neutral-500 tracking-wider mb-1 block">Compás</span>
                <span className="text-sm font-extrabold text-white">4/4</span>
              </div>
              <div className="p-3 bg-[#02040a]/40 border border-white/[0.03] rounded-xl flex flex-col justify-center">
                <span className="text-[8.5px] font-black uppercase text-neutral-500 tracking-wider mb-1 block">Tempo</span>
                <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  120 BPM
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
                </span>
              </div>
              <div className="p-3 bg-[#02040a]/40 border border-white/[0.03] rounded-xl flex flex-col justify-center">
                <span className="text-[8.5px] font-black uppercase text-neutral-500 tracking-wider mb-1 block">Capo sugerido</span>
                <span className="text-sm font-extrabold text-white">0</span>
              </div>
              <div className="p-3 bg-[#02040a]/40 border border-white/[0.03] rounded-xl flex flex-col justify-center">
                <span className="text-[8.5px] font-black uppercase text-neutral-500 tracking-wider mb-1 block">Dificultad</span>
                <span className="text-sm font-extrabold text-secondary">Media</span>
              </div>
            </div>

            {/* Main Action Pill Buttons */}
            <div className="mb-6 flex flex-wrap gap-2.5 relative z-10">
              {song.lyrics && (
                <Button
                  variant="hero"
                  className="flex-1 rounded-xl h-11"
                  onClick={() => {
                    vibrateMedium();
                    setShowPresentation(true);
                  }}
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Modo Presentación
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-11 border-white/5 hover:bg-white/5"
                onClick={() => {
                  vibrateLight();
                  setShowPrintPreview(true);
                }}
              >
                <Printer className="w-4 h-4 mr-2 text-neutral-400" />
                Imprimir
              </Button>
              {song.youtube_url && (
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl h-11 border-white/5 hover:bg-white/5"
                  onClick={() => window.open(song.youtube_url!, "_blank")}
                >
                  <Youtube className="w-4 h-4 mr-2 text-red-500" />
                  Ver en YouTube
                </Button>
              )}
            </div>

            {/* Premium Sliding Segmented Tab Menu */}
            <div className="bg-[#02040a]/80 p-1 rounded-xl border border-white/[0.04] mb-6 flex relative z-10 w-full">
              {[
                { id: "lyrics", label: "Letra y Acordes" },
                { id: "details", label: "Multimedia y Detalles" },
                { id: "comments", label: "Mensajes y Foro" },
              ].map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition-all relative ${
                      active ? "text-secondary" : "text-neutral-400 hover:text-white"
                    }`}
                    type="button"
                  >
                    {active && (
                      <motion.div
                        className="absolute inset-0 bg-white/[0.04] rounded-lg border border-white/[0.03]"
                        layoutId="active-song-tab"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT: Chords & Lyrics */}
            {activeTab === "lyrics" && (
              <div className="relative z-10 flex gap-6 items-start">
                
                {/* Lyric Sheet Body */}
                <div className="flex-1 min-w-0 bg-[#02040a]/40 border border-white/[0.03] p-5 rounded-2xl relative">
                  
                  {/* Lyrics size controls */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5 rounded-lg border border-white/5">
                    <button
                      onClick={() => setFontSize(prev => Math.max(prev - 1, 10))}
                      className="text-xs font-bold text-neutral-400 hover:text-white w-5 h-5 flex items-center justify-center"
                      type="button"
                    >
                      A-
                    </button>
                    <span className="text-[10px] font-mono text-neutral-500 font-bold px-1">{fontSize}px</span>
                    <button
                      onClick={() => setFontSize(prev => Math.min(prev + 1, 28))}
                      className="text-xs font-bold text-neutral-400 hover:text-white w-5 h-5 flex items-center justify-center"
                      type="button"
                    >
                      A+
                    </button>
                  </div>

                  {/* Chord sheet display with highlighted gold chords */}
                  {transposedChords ? (
                    <div 
                      className="whitespace-pre-wrap select-text selection:bg-secondary/20"
                      style={{ fontSize: `${fontSize}px` }}
                      dangerouslySetInnerHTML={{ __html: renderHighlightedChords(transposedChords) }}
                    />
                  ) : song.lyrics ? (
                    <pre 
                      className="text-neutral-200 whitespace-pre-wrap font-sans leading-relaxed"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {song.lyrics}
                    </pre>
                  ) : (
                    <p className="text-xs text-neutral-500 font-bold italic py-4 text-center">No hay contenido de acordes ni letras cargado.</p>
                  )}
                </div>

                {/* Metrónomo & Transposer Float Floating Sidebar (Screen 4 Layout) */}
                {song.chords && (
                  <div className="flex flex-col gap-2.5 flex-shrink-0 w-11">
                    <div className="flex flex-col items-center gap-1.5 bg-[#02040a]/60 border border-white/[0.04] p-1.5 rounded-2xl shadow-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          vibrateLight();
                          setTransposeSteps(prev => prev + 1);
                        }}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-secondary/15 text-neutral-400 hover:text-secondary hover:border hover:border-secondary/10"
                        title="Subir tono (+1)"
                      >
                        <ChevronUp className="w-4.5 h-4.5" />
                      </Button>
                      <span className="text-[10px] font-mono text-secondary font-black w-8 text-center leading-none">
                        {transposeSteps > 0 ? `+${transposeSteps}` : transposeSteps}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          vibrateLight();
                          setTransposeSteps(prev => prev - 1);
                        }}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-secondary/15 text-neutral-400 hover:text-secondary hover:border hover:border-secondary/10"
                        title="Bajar tono (-1)"
                      >
                        <ChevronDown className="w-4.5 h-4.5" />
                      </Button>
                    </div>

                    {transposeSteps !== 0 && (
                      <Button
                        onClick={() => setTransposeSteps(0)}
                        variant="ghost"
                        className="w-11 h-8 rounded-xl bg-secondary/10 text-secondary border border-secondary/10 text-[9px] font-black uppercase tracking-wider"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Details & Media */}
            {activeTab === "details" && (
              <div className="space-y-6 relative z-10">
                {/* YouTube Video Player */}
                {song.youtube_url && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-neutral-400 flex items-center gap-2 uppercase tracking-wider">
                      <Youtube className="w-4.5 h-4.5 text-red-500" />
                      Video Guía de YouTube
                    </h3>
                    <YouTubePlayer url={song.youtube_url} />
                  </div>
                )}

                {/* Audio File Player */}
                {song.audio_url && (
                  <div className="p-5 bg-[#02040a]/40 border border-white/[0.03] rounded-2xl space-y-3">
                    <h3 className="text-sm font-bold text-neutral-400 flex items-center gap-2 uppercase tracking-wider">
                      <Disc className="w-4.5 h-4.5 text-secondary" />
                      Grabación de Audio / Ensayo
                    </h3>
                    <audio controls className="w-full filter invert hue-rotate-180 opacity-90">
                      <source src={song.audio_url} />
                      Tu navegador no soporta el reproductor de audio.
                    </audio>
                  </div>
                )}

                {!song.youtube_url && !song.audio_url && (
                  <div className="p-8 text-center bg-white/[0.01] border border-white/[0.03] rounded-2xl flex flex-col items-center justify-center gap-3">
                    <BadgeInfo className="w-8 h-8 text-neutral-600" />
                    <p className="text-xs text-neutral-500 font-bold italic">Esta canción no posee archivos de audio ni enlaces de YouTube asociados.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Comments */}
            {activeTab === "comments" && (
              <div className="relative z-10">
                <SongComments songId={song.id} />
              </div>
            )}
          </Card>

        </div>
      </main>

      {/* Fullscreen Presentation Mode */}
      {showPresentation && song.lyrics && (
        <PresentationMode
          lyrics={song.lyrics}
          title={song.title}
          onClose={() => setShowPresentation(false)}
        />
      )}

      {/* Hidden Print Preview Frame */}
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
        <AlertDialogContent className="bg-[#070c1b] border border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-black text-xl">¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400 font-semibold text-sm">
              Esta acción no se puede deshacer. La canción será eliminada de forma permanente e irreversible de los repertorios y el sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 text-white hover:bg-white/10 border-none rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-500 rounded-xl font-bold shadow-lg shadow-red-900/30">
              Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SongDetail;
