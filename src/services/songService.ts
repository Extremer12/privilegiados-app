/**
 * Service layer for Song data access.
 *
 * Centralises all Supabase queries for the songs table.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Song } from "@/types";

export async function fetchSongs(options?: { groupId?: string; orderBy?: string; ascending?: boolean }) {
  const { groupId, orderBy = "title", ascending = true } = options || {};
  let query = supabase.from("songs").select("*");
  
  if (groupId) {
    query = query.eq("group_id", groupId);
  }

  const { data, error } = await query.order(orderBy, { ascending });

  if (error) throw error;
  return data as Song[];
}

export async function fetchSongsWithProfiles(options?: { groupId?: string; orderBy?: string; ascending?: boolean }) {
  const { groupId, orderBy = "created_at", ascending = false } = options || {};
  let query = supabase
    .from("songs")
    .select("*, creator_profile:profiles!songs_created_by_profile_fkey(full_name, avatar_url)");

  if (groupId) {
    query = query.eq("group_id", groupId);
  }

  const { data, error } = await query.order(orderBy, { ascending });

  if (error) throw error;
  return data as Song[];
}

export async function fetchSongById(id: string) {
  const { data, error } = await supabase
    .from("songs")
    .select("*, creator_profile:profiles!songs_created_by_profile_fkey(full_name, avatar_url)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Canción no encontrada");

  return data as Song;
}

export async function deleteSong(id: string) {
  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchFavoriteStatus(songId: string, userId: string) {
  const { data, error } = await supabase
    .from("favorite_songs")
    .select("id")
    .eq("song_id", songId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function toggleFavorite(
  songId: string,
  userId: string,
  isFavorite: boolean,
) {
  if (isFavorite) {
    const { error } = await supabase
      .from("favorite_songs")
      .delete()
      .eq("song_id", songId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("favorite_songs")
      .insert({ song_id: songId, user_id: userId });
    if (error) throw error;
  }
}
