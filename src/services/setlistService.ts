/**
 * Service layer for Setlist / Repertorio data access.
 *
 * Centralises all Supabase queries for the setlists table
 * and related operations used by the Repertorios page.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Setlist } from "@/types";

export interface SetlistWithCount extends Setlist {
  songsCount: number;
  avgRating?: number;
}

export async function fetchSetlists(): Promise<SetlistWithCount[]> {
  const { data, error } = await supabase
    .from("setlists")
    .select(`
      *,
      setlist_songs (count),
      service_feedback (rating)
    `)
    .order("service_date", { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => {
    const feedbacks = (item.service_feedback as any[]) || [];
    const avgRating =
      feedbacks.length > 0
        ? feedbacks.reduce((acc: number, curr: any) => acc + curr.rating, 0) /
          feedbacks.length
        : undefined;

    return {
      ...item,
      status: (item.status as Setlist["status"]) || "draft",
      songsCount: (item.setlist_songs as any)?.[0]?.count || 0,
      avgRating,
    };
  });
}

export async function deleteSetlist(id: string) {
  const { error } = await supabase.from("setlists").delete().eq("id", id);
  if (error) throw error;
}

export async function createLiveSession(
  setlistId: string,
  userId: string,
) {
  // Check for existing active session
  const { data: existing } = await supabase
    .from("live_sessions")
    .select("id")
    .eq("setlist_id", setlistId)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    // Ensure creator is confirmed in existing session
    try {
      await supabase.from("live_session_participants").upsert(
        {
          session_id: existing.id,
          user_id: userId,
          role_in_service: "Director / Administrador",
          status: "confirmed",
        },
        { onConflict: "session_id,user_id" }
      );
    } catch {}
    return existing;
  }

  const { data, error } = await supabase
    .from("live_sessions")
    .insert({
      setlist_id: setlistId,
      created_by: userId,
      is_active: true,
      current_position: 0,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;

  // 1. Insert session creator as confirmed participant
  try {
    await supabase.from("live_session_participants").insert({
      session_id: data.id,
      user_id: userId,
      role_in_service: "Director / Administrador",
      status: "confirmed",
    });

    // 2. Copy any existing setlist participants to the live session
    const { data: setlistParts } = await supabase
      .from("setlist_participants")
      .select("user_id, role_in_service")
      .eq("setlist_id", setlistId);

    if (setlistParts && setlistParts.length > 0) {
      const otherParts = setlistParts
        .filter((sp) => sp.user_id && sp.user_id !== userId)
        .map((sp) => ({
          session_id: data.id,
          user_id: sp.user_id!,
          role_in_service: sp.role_in_service || "Músico / Cantante",
          status: "pending",
        }));

      if (otherParts.length > 0) {
        await supabase.from("live_session_participants").insert(otherParts);
      }
    }
  } catch (initErr) {
    console.warn("Error initializing live session participants:", initErr);
  }

  return data;
}
