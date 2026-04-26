import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, 
  StopCircle, 
  Maximize2, 
  Minimize2,
  Radio,
  Settings,
  Volume2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons and dependencies
import { Trash2, Plus, Moon, Sun, ZoomIn, ZoomOut, X, Minimize2 } from "lucide-react";
import { SECTION_TYPES, SectionType } from "@/components/repertorios/types";
import { AddSongToSetlistDialog } from "@/components/repertorios/AddSongToSetlistDialog";

// Live components
import { LiveHeader } from "@/components/live/LiveHeader";
import { LyricsDisplay } from "@/components/live/LyricsDisplay";
import { SongListPanel } from "@/components/live/SongListPanel";
import { LiveChat } from "@/components/live/LiveChat";
import { VoiceChannel } from "@/components/live/VoiceChannel";
import { EndSessionDialog, FinalizeServiceData } from "@/components/live/EndSessionDialog";
import { useUserRole } from "@/hooks/useUserRole";

interface LiveSession {
  id: string;
  is_active: boolean;
  current_position: number;
  current_song_id: string | null;
  started_at: string;
  created_by: string;
  setlist_id: string;
}

interface SetlistSong {
  id: string;
  position: number;
  notes: string | null;
  section: string | null;
  special_instructions: string | null;
  songs: {
    id: string;
    title: string;
    lyrics: string | null;
    chords: string | null;
  };
}

interface Setlist {
  id: string;
  title: string;
  theme_verse: string | null;
  sections_config?: any;
}

interface Comment {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

const EnVivo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLeader } = useUserRole();
  
  const [session, setSession] = useState<LiveSession | null>(null);
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [songs, setSongs] = useState<SetlistSong[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI states
  const [showChat, setShowChat] = useState(false);
  const [showSongList, setShowSongList] = useState(true);
  const [showVoiceChannel, setShowVoiceChannel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [initialParticipants, setInitialParticipants] = useState<any[]>([]);

  // Wake Lock state
  const wakeLockRef = useRef<any>(null);

  // Add song state
  const [showAddSong, setShowAddSong] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionType>("alabanza");
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [presentationTheme, setPresentationTheme] = useState<"dark" | "light">("dark");
  const [presentationFontSize, setPresentationFontSize] = useState(32);

  // Fetch initial data
  useEffect(() => {
    if (user && id) {
      fetchAllData();
      const unsubSession = subscribeToSession();
      const unsubComments = subscribeToComments();
      const unsubSongs = subscribeToSongs();
      
      // Request Wake Lock to keep screen on
      const requestWakeLock = async () => {
        try {
          if ('wakeLock' in navigator) {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          }
        } catch (err) {
          console.error('Wake Lock error:', err);
        }
      };

      requestWakeLock();
      
      return () => {
        unsubSession();
        unsubComments();
        unsubSongs();
        if (wakeLockRef.current) {
          wakeLockRef.current.release();
        }
      };
    }
  }, [user, id]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch setlist info
      const { data: setlistData } = await supabase
        .from("setlists")
        .select("id, title, theme_verse, sections_config")
        .eq("id", sessionData.setlist_id)
        .single();
      
      if (setlistData) setSetlist(setlistData);

      // Fetch songs
      const { data: songsData, error: songsError } = await supabase
        .from("setlist_songs")
        .select(`
          id,
          position,
          notes,
          section,
          special_instructions,
          songs (
            id,
            title,
            lyrics,
            chords
          )
        `)
        .eq("setlist_id", sessionData.setlist_id)
        .order("position");

      if (songsError) throw songsError;

      // Sort songs strictly by section order
      const sectionsConfig = setlistData?.sections_config || SECTION_TYPES;
      const sortedSongs: any[] = [];
      sectionsConfig.forEach((sec: any) => {
        const sectionSongs = (songsData || [])
          .filter(s => s.section === sec.id)
          .sort((a, b) => a.position - b.position);
        sortedSongs.push(...sectionSongs);
      });
      // Add any remaining songs that didn't match a section
      const remainingSongs = (songsData || []).filter(s => !sectionsConfig.find((sec: any) => sec.id === s.section));
      sortedSongs.push(...remainingSongs);

      setSongs(sortedSongs || []);

      const { data: commentsData } = await supabase
        .from("live_comments")
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq("session_id", id)
        .order("created_at", { ascending: true });

      setComments(commentsData as any || []);

      // Fetch participants from setlist
      const { data: participantsData } = await supabase
        .from("setlist_participants")
        .select(`
          participant_name,
          role_in_service,
          profiles (full_name)
        `)
        .eq("setlist_id", sessionData.setlist_id);
      
      if (participantsData) {
        setInitialParticipants(participantsData.map(p => ({
          name: p.profiles?.full_name || p.participant_name || "",
          role: p.role_in_service || "Cantante"
        })));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la sesión",
        variant: "destructive",
      });
      navigate("/repertorios");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToSession = () => {
    const channel = supabase
      .channel(`live_session_${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_sessions",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const newSession = payload.new as LiveSession;
          setSession(newSession);
          
          // If session ended, navigate away
          if (!newSession.is_active) {
            toast({
              title: "Sesión finalizada",
              description: "La sesión en vivo ha terminado",
            });
            navigate("/repertorios");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`live_comments_${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_comments",
          filter: `session_id=eq.${id}`,
        },
        async (payload) => {
          // Only add if it's from someone else (we add our own optimistically)
          if (payload.new.user_id !== user?.id) {
            const { data } = await supabase
              .from("live_comments")
              .select(`
                *,
                profiles (
                  full_name,
                  avatar_url
                )
              `)
              .eq("id", payload.new.id)
              .single();

            if (data) {
              setComments((prev) => [...prev, data as any]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToSongs = () => {
    // When songs change in the setlist (added/removed), we want to fetch the new list and sort it properly
    const channel = supabase
      .channel(`setlist_songs_${session?.setlist_id || id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "setlist_songs",
          filter: session?.setlist_id ? `setlist_id=eq.${session.setlist_id}` : undefined,
        },
        () => {
          // Re-fetch all data to ensure sorting is correct instead of manually handling inserts/deletes
          fetchAllData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleDeleteSong = async (songId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isLeader && !isCreator) return;
    
    if (!confirm("¿Seguro que deseas remover esta canción del repertorio en vivo?")) return;

    try {
      const { error } = await supabase
        .from("setlist_songs")
        .delete()
        .eq("id", songId);

      if (error) throw error;
      toast({
        title: "Canción removida",
        description: "La canción fue removida del repertorio.",
      });
      // The realtime subscription will trigger a refetch
    } catch (error) {
      console.error("Error deleting song:", error);
      toast({
        title: "Error",
        description: "No se pudo remover la canción.",
        variant: "destructive",
      });
    }
  };

  const handleNavigateSong = async (direction: "next" | "prev") => {
    if (!session) return;
    
    const newPosition = direction === "next" 
      ? session.current_position + 1 
      : session.current_position - 1;
    
    if (newPosition < 0 || newPosition >= songs.length) return;

    const targetSong = songs[newPosition];

    try {
      const { error } = await supabase
        .from("live_sessions")
        .update({
          current_position: newPosition,
          current_song_id: targetSong.songs.id,
        })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating position:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar de canción",
        variant: "destructive",
      });
    }
  };

  const handleJumpToSong = async (position: number) => {
    if (!session || position < 0 || position >= songs.length) return;

    const targetSong = songs[position];

    try {
      const { error } = await supabase
        .from("live_sessions")
        .update({
          current_position: position,
          current_song_id: targetSong.songs.id,
        })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error jumping to song:", error);
    }
  };

  const handleEndSession = async (data: FinalizeServiceData) => {
    setIsEnding(true);
    
    try {
      // 1. Create service report
      const { data: report, error: reportError } = await supabase
        .from("service_reports")
        .insert({
          setlist_id: session?.setlist_id,
          live_session_id: id,
          finalized_by: user?.id,
          service_date: new Date().toISOString(),
          duration_minutes: Math.round((new Date().getTime() - new Date(session?.started_at || new Date()).getTime()) / 60000),
          notes: data.notes,
          attendance_count: data.attendance_count
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // 2. Add participants
      if (data.participants.length > 0) {
        const { error: partsError } = await supabase
          .from("service_participants")
          .insert(
            data.participants.map(p => ({
              service_report_id: report.id,
              participant_name: p.name,
              role_in_service: p.role
            }))
          );
        if (partsError) throw partsError;
      }

      // 3. Add songs played
      const playedSongs = data.songs.filter(s => s.played);
      if (playedSongs.length > 0) {
        const { error: songsError } = await supabase
          .from("service_songs")
          .insert(
            playedSongs.map((s, idx) => ({
              service_report_id: report.id,
              song_id: s.song_id,
              position: idx + 1,
              was_improvised: s.was_improvised
            }))
          );
        if (songsError) throw songsError;
      }

      // 4. Add leader's rating if any
      if (data.leader_rating > 0) {
        const { error: ratingError } = await supabase
          .from("service_ratings")
          .insert({
            service_report_id: report.id,
            user_id: user?.id,
            rating: data.leader_rating
          });
        if (ratingError) console.error("Error saving rating:", ratingError); // Non-blocking
      }

      // 5. Update session
      const { error } = await supabase
        .from("live_sessions")
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Update setlist status to completed
      if (session?.setlist_id) {
        await supabase
          .from("setlists")
          .update({ status: "completed" })
          .eq("id", session.setlist_id);
      }

      toast({
        title: "🎉 ¡Culto Finalizado!",
        description: "Se guardaron las estadísticas del servicio exitosamente.",
      });

      navigate("/repertorios");
    } catch (error) {
      console.error("Error ending session:", error);
      toast({
        title: "Error",
        description: "No se pudo finalizar la sesión y guardar las estadísticas.",
        variant: "destructive",
      });
    } finally {
      setIsEnding(false);
      setShowEndDialog(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/80">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader />
          <p className="mt-4 text-foreground/80 animate-pulse">
            Cargando sesión en vivo...
          </p>
        </motion.div>
      </div>
    );
  }

  const currentSong = songs[session?.current_position || 0];
  const isCreator = session?.created_by === user?.id;
  const canEndSession = isCreator || isLeader;

  if (isPresentationMode && currentSong) {
    return (
      <div 
        className={`fixed inset-0 z-50 flex flex-col ${
          presentationTheme === "dark" ? "bg-black text-white" : "bg-white text-black"
        }`}
      >
        {/* Control Bar */}
        <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm z-50 relative">
          <h2 className="text-xl font-bold truncate max-w-md opacity-80">{currentSong.songs.title}</h2>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPresentationFontSize((prev) => Math.max(prev - 4, 16))}
                    className="text-current hover:bg-white/10"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reducir tamaño</TooltipContent>
              </Tooltip>

              <span className="text-sm font-medium min-w-[3rem] text-center opacity-80">
                {presentationFontSize}px
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPresentationFontSize((prev) => Math.min(prev + 4, 100))}
                    className="text-current hover:bg-white/10"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Aumentar tamaño</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-current hover:bg-white/10"
                    onClick={() => setPresentationTheme(prev => prev === "dark" ? "light" : "dark")}
                  >
                    {presentationTheme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cambiar tema</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-current hover:bg-white/10 text-red-400 hover:text-red-500"
                    onClick={() => setIsPresentationMode(false)}
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Salir</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-12 relative">
          <div className="min-h-full flex flex-col justify-center">
            <pre
              className="font-sans font-black text-center whitespace-pre-wrap leading-[1.2] max-w-6xl mx-auto my-auto transition-all duration-300"
              style={{ 
                fontSize: `${presentationFontSize}px`,
                textShadow: presentationTheme === "dark" ? '0 4px 24px rgba(0,0,0,0.5)' : 'none'
              }}
            >
              {currentSong.songs.lyrics || "Sin letra disponible"}
            </pre>
          </div>
        </div>
        
        {/* Invisible navigation zones for touch/click */}
        {isCreator && (
          <>
            <div 
              className="fixed top-0 left-0 w-[20%] h-full cursor-pointer z-10" 
              onClick={() => handleNavigateSong("prev")}
              title="Anterior"
            />
            <div 
              className="fixed top-0 right-0 w-[20%] h-full cursor-pointer z-10" 
              onClick={() => handleNavigateSong("next")}
              title="Siguiente"
            />
          </>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(222 47% 6%) 0%, hsl(222 47% 10%) 50%, hsl(222 47% 6%) 100%)",
        }}
      >
        {/* Ambient background effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-30"
            style={{
              background: "radial-gradient(circle, hsl(48 100% 50% / 0.1) 0%, transparent 70%)",
            }}
            transition={{ duration: 20, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, hsl(48 100% 50% / 0.15) 0%, transparent 70%)",
            }}
            transition={{ duration: 15, ease: "easeInOut" }}
          />
        </div>

        {/* Main content */}
        <div className="relative z-10 min-h-screen flex flex-col p-4 lg:p-6">
          {/* Header */}
          <LiveHeader
            onBack={() => navigate("/repertorios")}
            startedAt={session?.started_at || null}
            currentPosition={session?.current_position || 0}
            totalSongs={songs.length}
            setlistTitle={setlist?.title}
          />

          {/* Theme verse */}
          {setlist?.theme_verse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto mt-4 text-center"
            >
              <p className="text-sm text-secondary/80 italic">
                "{setlist.theme_verse}"
              </p>
            </motion.div>
          )}

          {/* Main grid layout */}
          <div className="flex-1 max-w-7xl mx-auto w-full mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Song list panel - left */}
            <AnimatePresence>
              {showSongList && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="col-span-1 lg:col-span-3 mb-4 lg:mb-0"
                >
                  <div className="h-full flex flex-col gap-2">
                    <SongListPanel
                      songs={songs}
                      currentPosition={session?.current_position || 0}
                      onSongSelect={isCreator ? handleJumpToSong : undefined}
                      isCreator={isCreator}
                      onDeleteSong={handleDeleteSong}
                    />
                    
                    {isCreator && (
                      <Button
                        onClick={() => setShowAddSong(true)}
                        className="w-full bg-secondary text-primary-foreground hover:bg-secondary/90 shadow-lg"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Añadir Canción
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main lyrics display - center */}
            <div className={`${showSongList ? "lg:col-span-6" : "lg:col-span-9"} min-h-[60vh]`}>
              <LyricsDisplay
                currentSong={currentSong}
                currentPosition={session?.current_position || 0}
                totalSongs={songs.length}
                isCreator={isCreator}
                onPrevious={() => handleNavigateSong("prev")}
                onNext={() => handleNavigateSong("next")}
                onPresentationMode={() => setIsPresentationMode(true)}
                nextSong={songs[session?.current_position !== undefined ? session.current_position + 1 : 1]}
              />
            </div>

            {/* Right sidebar - Voice & Chat */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              {/* Voice Channel */}
              <AnimatePresence>
                {showVoiceChannel && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <VoiceChannel sessionId={id!} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat */}
              <div className="flex-1 min-h-[300px]">
                <LiveChat
                  sessionId={id!}
                  isOpen={showChat}
                  onClose={() => setShowChat(false)}
                  comments={comments}
                  onNewComment={(comment) => setComments((prev) => [...prev, comment])}
                />
                
                {!showChat && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowChat(true)}
                    className="w-full h-full min-h-[200px] rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors"
                    style={{
                      background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
                      border: "1px solid hsl(217 33% 25% / 0.5)",
                    }}
                  >
                    <div className="p-4 rounded-full bg-secondary/20">
                      <MessageSquare className="w-8 h-8 text-secondary" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">Chat en Vivo</p>
                      <p className="text-xs text-muted-foreground">
                        {comments.length} mensajes
                      </p>
                    </div>
                  </motion.button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom controls */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-w-7xl mx-auto w-full mt-4"
          >
            <div
              className="flex items-center justify-between p-4 rounded-2xl"
              style={{
                background: "linear-gradient(145deg, hsl(217 33% 14% / 0.9) 0%, hsl(222 47% 8% / 0.9) 100%)",
                backdropFilter: "blur(20px)",
                border: "1px solid hsl(217 33% 25% / 0.5)",
              }}
            >
              {/* Left controls */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSongList(!showSongList)}
                      className={showSongList ? "text-secondary" : "text-muted-foreground"}
                    >
                      <Radio className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showSongList ? "Ocultar lista" : "Mostrar lista"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowVoiceChannel(!showVoiceChannel)}
                      className={showVoiceChannel ? "text-secondary" : "text-muted-foreground"}
                    >
                      <Volume2 className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showVoiceChannel ? "Ocultar canal de voz" : "Mostrar canal de voz"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowChat(!showChat)}
                      className={showChat ? "text-secondary" : "text-muted-foreground"}
                    >
                      <MessageSquare className="w-5 h-5" />
                      {comments.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-secondary rounded-full text-[10px] flex items-center justify-center text-primary">
                          {comments.length > 99 ? "99+" : comments.length}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showChat ? "Ocultar chat" : "Mostrar chat"}
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Center info */}
              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  🎵 {songs.length} canciones
                </span>
                <span className="text-border">|</span>
                <span>
                  💬 {comments.length} mensajes
                </span>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFullscreen}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-5 h-5" />
                      ) : (
                        <Maximize2 className="w-5 h-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                  </TooltipContent>
                </Tooltip>

                {canEndSession && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        onClick={() => setShowEndDialog(true)}
                        className="gap-2 h-10 px-3 md:px-4"
                      >
                        <StopCircle className="w-4 h-4" />
                        <span className="hidden md:inline">Finalizar</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Finalizar sesión en vivo</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* End session dialog */}
        <EndSessionDialog
          isOpen={showEndDialog}
          onClose={() => setShowEndDialog(false)}
          onConfirm={handleEndSession}
          isEnding={isEnding}
          setlistSongs={songs}
          initialParticipants={initialParticipants}
        />

        {/* Add Song Dialog */}
        {session?.setlist_id && (
          <AddSongToSetlistDialog
            open={showAddSong}
            onOpenChange={setShowAddSong}
            section={selectedSection}
            setlistId={session.setlist_id}
            currentPosition={songs.filter(s => s.section === selectedSection).length + 1}
            onSongAdded={() => {
              // Realtime handles the list update, but we close dialog
              setShowAddSong(false);
            }}
          />
        )}
      </motion.div>
    </TooltipProvider>
  );
};

export default EnVivo;
