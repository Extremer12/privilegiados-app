/**
 * Service layer for live-session data access.
 *
 * Centralises all Supabase queries related to live sessions, setlist songs,
 * comments and the end-of-session reporting flow.  This keeps the React
 * component layer free from data-access details.
 */

import { supabase } from "@/integrations/supabase/client";
import { SECTION_TYPES } from "@/components/repertorios/types";
import type {
  LiveSession,
  SetlistSong,
  SetlistCompact,
  LiveComment,
} from "@/types";

// ── Session ──────────────────────────────────

export async function fetchLiveSession(sessionId: string) {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) throw error;
  return data as LiveSession;
}

export async function updateSessionPosition(
  sessionId: string,
  position: number,
  songId: string,
) {
  const { error } = await supabase
    .from("live_sessions")
    .update({ current_position: position, current_song_id: songId })
    .eq("id", sessionId);

  if (error) throw error;
}

export async function deactivateSession(sessionId: string) {
  const { error } = await supabase
    .from("live_sessions")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) throw error;
}

// ── Setlist ──────────────────────────────────

export async function fetchSetlistCompact(setlistId: string) {
  const { data, error } = await supabase
    .from("setlists")
    .select("id, title, theme_verse, sections_config")
    .eq("id", setlistId)
    .single();

  if (error) throw error;
  return data as SetlistCompact;
}

export async function markSetlistCompleted(setlistId: string) {
  await supabase
    .from("setlists")
    .update({ status: "completed" })
    .eq("id", setlistId);
}

// ── Songs ────────────────────────────────────

export async function fetchSetlistSongs(setlistId: string) {
  const { data, error } = await supabase
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
    .eq("setlist_id", setlistId)
    .order("position");

  if (error) throw error;
  return data as SetlistSong[];
}

/**
 * Sort songs by their section order (from setlist sections_config)
 * then by position within each section.  Songs that don't match any
 * section are appended at the end.
 */
export function sortSongsBySections(
  songs: SetlistSong[],
  sectionsConfig?: any[],
): SetlistSong[] {
  const config = sectionsConfig || SECTION_TYPES;
  const sorted: SetlistSong[] = [];

  config.forEach((sec: any) => {
    const sectionSongs = songs
      .filter((s) => s.section === sec.id)
      .sort((a, b) => a.position - b.position);
    sorted.push(...sectionSongs);
  });

  // Append orphan songs
  const remaining = songs.filter(
    (s) => !config.find((sec: any) => sec.id === s.section),
  );
  sorted.push(...remaining);

  return sorted;
}

export async function deleteSetlistSong(songId: string) {
  const { error } = await supabase
    .from("setlist_songs")
    .delete()
    .eq("id", songId);

  if (error) throw error;
}

// ── Comments ─────────────────────────────────

export async function fetchSessionComments(sessionId: string) {
  const { data, error } = await supabase
    .from("live_comments")
    .select(`
      *,
      profiles (
        full_name,
        avatar_url
      )
    `)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as LiveComment[];
}

export async function fetchSingleComment(commentId: string) {
  const { data, error } = await supabase
    .from("live_comments")
    .select(`
      *,
      profiles (
        full_name,
        avatar_url
      )
    `)
    .eq("id", commentId)
    .single();

  if (error) throw error;
  return data as LiveComment;
}

// ── Participants ─────────────────────────────

export async function fetchSetlistParticipants(setlistId: string) {
  const { data, error } = await supabase
    .from("setlist_participants")
    .select(`
      participant_name,
      role_in_service,
      profiles (full_name)
    `)
    .eq("setlist_id", setlistId);

  if (error) throw error;

  return (data || []).map((p: any) => ({
    name: p.profiles?.full_name || p.participant_name || "",
    role: p.role_in_service || "Cantante",
  }));
}

// ── End-of-service Report ────────────────────

export interface ServiceReportPayload {
  setlistId: string;
  sessionId: string;
  userId: string;
  startedAt: string;
  notes: string;
  attendanceCount: number;
  participants: { name: string; role: string }[];
  songs: { song_id: string; played: boolean; was_improvised?: boolean }[];
  leaderRating: number;
}

export async function createServiceReport(payload: ServiceReportPayload) {
  // 1. Report
  const { data: report, error: reportError } = await supabase
    .from("service_reports")
    .insert({
      setlist_id: payload.setlistId,
      live_session_id: payload.sessionId,
      finalized_by: payload.userId,
      service_date: new Date().toISOString(),
      duration_minutes: Math.round(
        (Date.now() - new Date(payload.startedAt).getTime()) / 60000,
      ),
      notes: payload.notes,
      attendance_count: payload.attendanceCount,
    })
    .select()
    .single();

  if (reportError) throw reportError;

  // 2. Participants
  if (payload.participants.length > 0) {
    const { error } = await supabase.from("service_participants").insert(
      payload.participants.map((p) => ({
        service_report_id: report.id,
        participant_name: p.name,
        role_in_service: p.role,
      })),
    );
    if (error) throw error;
  }

  // 3. Songs played
  const played = payload.songs.filter((s) => s.played);
  if (played.length > 0) {
    const { error } = await supabase.from("service_songs").insert(
      played.map((s, idx) => ({
        service_report_id: report.id,
        song_id: s.song_id,
        position: idx + 1,
        was_improvised: s.was_improvised,
      })),
    );
    if (error) throw error;
  }

  // 4. Leader rating
  if (payload.leaderRating > 0) {
    await supabase.from("service_ratings").insert({
      service_report_id: report.id,
      user_id: payload.userId,
      rating: payload.leaderRating,
    });
  }

  // 5. Deactivate session
  await deactivateSession(payload.sessionId);

  // 6. Mark setlist as completed
  await markSetlistCompleted(payload.setlistId);

  return report;
}
