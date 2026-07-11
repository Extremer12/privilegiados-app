import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Eye, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";
import * as liveService from "@/services/liveSessionService";
import type { LiveSession, SetlistSong, SetlistCompact } from "@/types";

const EnVivoEspectador = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [setlist, setSetlist] = useState<SetlistCompact | null>(null);
  const [songs, setSongs] = useState<SetlistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [spectatorCount, setSpectatorCount] = useState(1); // include self

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch live session
        const sessionData = await liveService.fetchLiveSession(id);
        if (!isMounted) return;
        setSession(sessionData);

        if (!sessionData.is_active) {
          setLoading(false);
          return;
        }

        // 2. Fetch setlist
        const setlistData = await liveService.fetchSetlistCompact(sessionData.setlist_id);
        if (!isMounted) return;
        setSetlist(setlistData);

        // 3. Fetch songs
        const rawSongs = await liveService.fetchSetlistSongs(sessionData.setlist_id);
        if (!isMounted) return;
        const sorted = liveService.sortSongsBySections(rawSongs, setlistData?.sections_config);
        setSongs(sorted);
      } catch (error) {
        console.error("Error loading spectator view:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    // 4. Realtime subscription to live session changes
    const sessionChannel = supabase
      .channel(`live_session_spec_${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_sessions",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (!isMounted) return;
          const newSession = payload.new as LiveSession;
          setSession(newSession);
        }
      )
      .subscribe();

    // 5. Presence subscription to count spectators
    const presenceChannel = supabase.channel(`live_presence_${id}`, {
      config: {
        presence: {
          key: `anon-${Math.random().toString(36).substring(2, 9)}`,
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        if (!isMounted) return;
        const state = presenceChannel.presenceState();
        let specs = 0;
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.type === "spectator") {
              specs++;
            }
          });
        });
        setSpectatorCount(specs || 1);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            type: "spectator",
            name: "Espectador",
          });
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [id]);

  const currentSong = songs[session?.current_position ?? 0] ?? null;

  if (loading) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader />
          <p className="mt-4 text-slate-300 animate-pulse font-medium">
            Conectando a la transmisión en vivo...
          </p>
        </motion.div>
      </div>
    );
  }

  // Session inactive or not found
  if (!session || !session.is_active) {
    return (
      <main className="dark relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-slate-950 text-slate-100 px-4 py-12 select-none">
        {/* Cinematic Ambient Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-md w-full relative z-10"
        >
          <Card className="p-10 text-center rounded-3xl bg-slate-900/50 backdrop-blur-xl border-slate-800 shadow-2xl">
            <div className="relative mx-auto mb-8 w-20 h-20 rounded-2xl bg-secondary/5 border border-secondary/15 flex items-center justify-center overflow-hidden shadow-2xl shadow-secondary/5">
              <div className="absolute inset-0 bg-gradient-to-tr from-secondary/10 to-transparent opacity-50" />
              <Radio className="w-8 h-8 text-secondary relative z-10" />
            </div>

            <h1 className="text-2xl font-black uppercase tracking-wider text-white mb-4">
              Sin transmisión en vivo
            </h1>
            
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto mb-8 font-medium">
              No hay ninguna sesión en vivo activa con este enlace en este momento. Pídele al líder musical que inicie el evento en vivo.
            </p>

            <Button
              onClick={() => navigate("/")}
              className="w-full h-12 rounded-2xl bg-secondary text-primary font-black uppercase tracking-widest text-xs transition-all duration-300 hover:scale-105"
            >
              Ir al Inicio
            </Button>
          </Card>
        </motion.div>
      </main>
    );
  }

  return (
    <div 
      className="dark min-h-screen relative flex flex-col justify-between overflow-x-hidden p-6 bg-slate-950 text-slate-100"
      style={{
        background: "linear-gradient(135deg, hsl(222 47% 6%) 0%, hsl(222 47% 10%) 50%, hsl(222 47% 6%) 100%)",
      }}
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, hsl(48 100% 50% / 0.06) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, hsl(217 91% 60% / 0.04) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 max-w-4xl mx-auto w-full flex items-center justify-between border-b border-border/30 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-1">
            Siguiendo en vivo
          </span>
          <h1 className="text-lg font-black text-foreground uppercase tracking-wider truncate max-w-[250px] sm:max-w-md">
            {setlist?.title || "Repertorio en vivo"}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Spectator count */}
          <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/25 px-3 py-1.5 rounded-full text-xs font-black text-blue-400 uppercase tracking-wider">
            <Eye className="w-4 h-4" />
            <span>{spectatorCount}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[10px] font-black tracking-wider text-red-400 uppercase">
              Al Aire
            </span>
          </div>
        </div>
      </header>

      {/* Lyrics Stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto my-8">
        <AnimatePresence mode="wait">
          {currentSong ? (
            <motion.div
              key={currentSong.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center text-center px-4"
            >
              <h2 className="text-2xl sm:text-3xl font-black text-secondary uppercase tracking-widest mb-10">
                {currentSong.songs.title}
              </h2>

              <div 
                className="w-full text-lg sm:text-2xl font-semibold text-foreground/90 leading-relaxed overflow-y-auto max-h-[60vh] custom-scrollbar px-2 select-text"
                style={{
                  textShadow: "0 2px 8px rgba(0, 0, 0, 0.4)"
                }}
              >
                {currentSong.songs.lyrics ? (
                  <div className="whitespace-pre-line space-y-6">
                    {currentSong.songs.lyrics}
                  </div>
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center gap-3">
                    <Music className="w-12 h-12 opacity-30 animate-pulse" />
                    <p className="text-sm font-medium">Esta canción no tiene letra cargada aún.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground flex flex-col items-center gap-4"
            >
              <Music className="w-16 h-16 opacity-30 animate-bounce" style={{ animationDuration: '3s' }} />
              <h3 className="text-xl font-bold uppercase tracking-wider text-foreground">Esperando canción...</h3>
              <p className="text-sm max-w-xs font-medium">El director musical aún no ha seleccionado ninguna canción del repertorio.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center max-w-4xl mx-auto w-full border-t border-border/20 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">
          Privilegiados App • Todos los derechos reservados
        </p>

        {setlist?.theme_verse && (
          <p className="text-xs italic text-secondary/60 max-w-xs truncate font-medium">
            "{setlist.theme_verse}"
          </p>
        )}
      </footer>
    </div>
  );
};

export default EnVivoEspectador;
