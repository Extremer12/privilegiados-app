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
import { toast } from "sonner";
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
  const { isLeader } = useUserRole();

  // ── Core state ────────────────────────────
  const [session, setSession] = useState<LiveSession | null>(null);
  const [setlist, setSetlist] = useState<SetlistCompact | null>(null);
  const [songs, setSongs] = useState<SetlistSong[]>([]);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialParticipants, setInitialParticipants] = useState<
    { name: string; role: string }[]
  >([]);

  // Ref to track setlist_id for realtime subscriptions (avoids stale closures)
  const setlistIdRef = useRef<string | null>(null);
  const wakeLockRef = useRef<any>(null);
  // Prevents duplicate navigation when the creator ends the session
  const isEndingRef = useRef(false);

  // ── Derived state ─────────────────────────
  const currentSong = songs[session?.current_position ?? 0] ?? null;
  const nextSong = songs[(session?.current_position ?? 0) + 1] ?? null;
  const isCreator = session?.created_by === user?.id;
  const canEndSession = isCreator || isLeader;

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
          if (!newSession.is_active && !isEndingRef.current) {
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
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  // ── Handlers ──────────────────────────────

  const handleNavigateSong = useCallback(
    async (direction: "next" | "prev") => {
      if (!session || !sessionId) return;

      const newPos =
        direction === "next"
          ? session.current_position + 1
          : session.current_position - 1;

      if (newPos < 0 || newPos >= songs.length) return;

      try {
        await liveService.updateSessionPosition(
          sessionId,
          newPos,
          songs[newPos].songs.id,
        );
      } catch {
        toast.error("Error", {
          description: "No se pudo cambiar de canción",
        });
      }
    },
    [session, sessionId, songs],
  );

  const handleJumpToSong = useCallback(
    async (position: number) => {
      if (!session || !sessionId || position < 0 || position >= songs.length)
        return;

      try {
        await liveService.updateSessionPosition(
          sessionId,
          position,
          songs[position].songs.id,
        );
      } catch {
        console.error("Error jumping to song");
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
    canEndSession,
    isLeader,

    // Handlers
    handleNavigateSong,
    handleJumpToSong,
    handleDeleteSong,
    handleEndSession,
    addComment,
  };
}
