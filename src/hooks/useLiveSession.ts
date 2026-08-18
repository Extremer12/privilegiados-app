/**
 * useLiveSession — custom hook that owns ALL live-session state and
 * Supabase Realtime subscriptions.
 *
 * Extracts ~400 lines of logic from EnVivo.tsx into a focused,
 * independently testable hook.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useGroup } from "@/hooks/useGroupContext";
import { toast } from "sonner";
import { vibrateLight } from "@/utils/haptics";
import * as liveService from "@/services/liveSessionService";
import type {
  LiveSession,
  SetlistSong,
  SetlistCompact,
  LiveComment,
} from "@/types";
import type { FinalizeServiceData } from "@/components/live/EndSessionDialog";

export function useLiveSession(sessionId: string | undefined) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLeader, isAdmin } = useUserRole();
  const { isGroupLeader, isGroupAdmin } = useGroup();

  // ── Core state ────────────────────────────
  const [session, setSession] = useState<LiveSession | null>(null);
  const [setlist, setSetlist] = useState<SetlistCompact | null>(null);
  const [songs, setSongs] = useState<SetlistSong[]>([]);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialParticipants, setInitialParticipants] = useState<
    { name: string; role: string }[]
  >([]);
  const [spectatorCount, setSpectatorCount] = useState(0);

  // Ref to track setlist_id for realtime subscriptions (avoids stale closures)
  const setlistIdRef = useRef<string | null>(null);
  const wakeLockRef = useRef<any>(null);
  // Prevents duplicate navigation when the creator ends the session
  const isEndingRef = useRef(false);

  // ── Derived state ─────────────────────────
  const rawPosition = session?.current_position ?? 0;
  const safePosition =
    songs.length > 0 ? Math.min(Math.max(0, rawPosition), songs.length - 1) : 0;

  const currentSong = songs[safePosition] ?? null;
  const nextSong = songs[safePosition + 1] ?? null;
  const isCreator = Boolean(session?.created_by && user?.id && session.created_by === user.id);
  const isAuthorized = isCreator || isLeader || isAdmin || isGroupLeader || isGroupAdmin;
  const canControlSession = isAuthorized;
  const canEndSession = isAuthorized;

  // ── Data fetching ─────────────────────────

  const fetchAllData = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);

      const sessionData = await liveService.fetchLiveSession(sessionId);
      setSession(sessionData);
      setlistIdRef.current = sessionData.setlist_id;

      const setlistData = await liveService.fetchSetlistCompact(
        sessionData.setlist_id,
      );
      setSetlist(setlistData);

      const rawSongs = await liveService.fetchSetlistSongs(
        sessionData.setlist_id,
      );
      const sorted = liveService.sortSongsBySections(
        rawSongs,
        setlistData?.sections_config,
      );
      setSongs(sorted);

      const commentsData = await liveService.fetchSessionComments(sessionId);
      setComments(commentsData);

      const participants = await liveService.fetchSetlistParticipants(
        sessionData.setlist_id,
      );
      setInitialParticipants(participants);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error", {
        description: "No se pudo cargar la sesión",
      });
      navigate("/repertorios");
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate]);

  /**
   * Light refetch — only songs.  Used by the realtime subscription
   * when a setlist_song row changes, so we don't re-load comments,
   * participants, etc.
   */
  const fetchSongsOnly = useCallback(async () => {
    const sid = setlistIdRef.current;
    if (!sid) return;

    try {
      const rawSongs = await liveService.fetchSetlistSongs(sid);
      const sorted = liveService.sortSongsBySections(
        rawSongs,
        setlist?.sections_config,
      );
      setSongs(sorted);
    } catch (error) {
      console.error("Error refetching songs:", error);
    }
  }, [setlist?.sections_config]);

  // ── Realtime subscriptions ────────────────

  useEffect(() => {
    if (!user || !sessionId) return;

    fetchAllData();

    // Confirm current user in live_session_participants
    const confirmPresence = async () => {
      try {
        await supabase.from("live_session_participants").upsert(
          {
            session_id: sessionId,
            user_id: user.id,
            role_in_service: "Músico / Cantante",
            status: "confirmed",
          },
          { onConflict: "session_id,user_id" }
        );
      } catch (err) {
        console.warn("Could not upsert live participant status:", err);
      }
    };
    confirmPresence();

    // Session changes
    const sessionChannel = supabase
      .channel(`live_session_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const newSession = payload.new as LiveSession;
          setSession(newSession);
          // Only auto-navigate for non-creators (participants).
          // The creator already navigates via handleEndSession.
          if (newSession && !newSession.is_active && !isEndingRef.current) {
            toast.success("Sesión finalizada", {
              description: "La sesión en vivo ha terminado",
            });
            navigate("/repertorios");
          }
        },
      )
      .subscribe();

    // Comments — INSERT only
    const commentsChannel = supabase
      .channel(`live_comments_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_comments",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          if (payload.new.user_id !== user?.id) {
            try {
              const comment = await liveService.fetchSingleComment(
                payload.new.id,
              );
              setComments((prev) => [...prev, comment]);
            } catch {
              // Non-blocking
            }
          }
        },
      )
      .subscribe();

    // Songs — any change → lightweight refetch
    const currentSetlistId = setlistIdRef.current;
    const songsChannel = supabase
      .channel(`setlist_songs_${currentSetlistId || sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "setlist_songs",
          filter: currentSetlistId
            ? `setlist_id=eq.${currentSetlistId}`
            : undefined,
        },
        () => {
          fetchSongsOnly();
        },
      )
      .subscribe();

    // Presence subscription to track online members and spectators
    const presenceChannel = supabase.channel(`live_presence_${sessionId}`, {
      config: {
        presence: {
          key: user?.id || `anon-${Math.random().toString(36).substring(2, 9)}`,
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        let specs = 0;
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.type === "spectator") {
              specs++;
            }
          });
        });
        setSpectatorCount(specs);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            type: "participant",
            name: user?.user_metadata?.full_name || "Músico",
          });
        }
      });

    // Wake Lock
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request(
            "screen",
          );
        }
      } catch {
        // Wake Lock not supported or denied
      }
    };
    requestWakeLock();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(songsChannel);
      supabase.removeChannel(presenceChannel);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  // ── Handlers ──────────────────────────────

  const handleNavigateSong = useCallback(
    async (direction: "next" | "prev") => {
      if (!session || !sessionId || songs.length === 0) return;

      const currentPos = safePosition;
      const newPos =
        direction === "next"
          ? currentPos + 1
          : currentPos - 1;

      if (newPos < 0 || newPos >= songs.length) return;

      vibrateLight();

      const previousSession = session;
      const targetSong = songs[newPos];
      if (!targetSong?.songs?.id) return;

      // Optimistic update
      setSession((prev) =>
        prev
          ? {
              ...prev,
              current_position: newPos,
              current_song_id: targetSong.songs.id,
            }
          : null,
      );

      try {
        await liveService.updateSessionPosition(
          sessionId,
          newPos,
          targetSong.songs.id,
        );
      } catch (error) {
        console.error("Error navigating song:", error);
        setSession(previousSession);
        toast.error("Error", {
          description: "No se pudo cambiar de canción",
        });
      }
    },
    [session, sessionId, songs, safePosition],
  );

  const handleJumpToSong = useCallback(
    async (position: number) => {
      if (!session || !sessionId || songs.length === 0) return;
      if (position < 0 || position >= songs.length) return;

      vibrateLight();

      const previousSession = session;
      const targetSong = songs[position];
      if (!targetSong?.songs?.id) return;

      // Optimistic update
      setSession((prev) =>
        prev
          ? {
              ...prev,
              current_position: position,
              current_song_id: targetSong.songs.id,
            }
          : null,
      );

      try {
        await liveService.updateSessionPosition(
          sessionId,
          position,
          targetSong.songs.id,
        );
      } catch (error) {
        console.error("Error jumping to song:", error);
        setSession(previousSession);
        toast.error("Error", {
          description: "No se pudo saltar a la canción seleccionada",
        });
      }
    },
    [session, sessionId, songs],
  );

  const handleDeleteSong = useCallback(
    async (songId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      const isSessionCreator = session?.created_by === user?.id;
      if (!isLeader && !isSessionCreator) return;
      try {
        await liveService.deleteSetlistSong(songId);
        toast.success("Canción removida", {
          description: "La canción fue removida del repertorio.",
        });
      } catch {
        toast.error("Error", {
          description: "No se pudo remover la canción.",
        });
      }
    },
    [session, user, isLeader],
  );

  const handleEndSession = useCallback(
    async (data: FinalizeServiceData): Promise<boolean> => {
      if (!session || !user || !sessionId) return false;

      try {
        isEndingRef.current = true;
        await liveService.createServiceReport({
          setlistId: session.setlist_id,
          sessionId,
          userId: user.id,
          startedAt: session.started_at,
          notes: data.notes,
          attendanceCount: data.attendance_count,
          participants: data.participants,
          songs: data.songs,
          leaderRating: data.leader_rating,
        });

        toast.success("🎉 ¡Culto Finalizado!", {
          description:
            "Se guardaron las estadísticas del servicio exitosamente.",
        });

        navigate("/repertorios");
        return true;
      } catch (error) {
        console.error("Error ending session:", error);
        isEndingRef.current = false;
        toast.error("Error", {
          description:
            "No se pudo finalizar la sesión y guardar las estadísticas.",
        });
        return false;
      }
    },
    [session, user, sessionId, navigate],
  );

  const addComment = useCallback(
    (comment: LiveComment) => {
      setComments((prev) => [...prev, comment]);
    },
    [],
  );

  return {
    // State
    session,
    setlist,
    songs,
    comments,
    loading,
    initialParticipants,

    // Derived
    currentSong,
    nextSong,
    isCreator,
    canControlSession,
    canEndSession,
    isLeader,

    // Handlers
    handleNavigateSong,
    handleJumpToSong,
    handleDeleteSong,
    handleEndSession,
    addComment,
    spectatorCount,
  };
}

