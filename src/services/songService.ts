/**
 * Service layer for Song data access.
 *
 * Centralises all Supabase queries for the songs table.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Song } from "@/types";

export async function fetchSongs() {
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .order("title", { ascending: true });

  if (error) throw error;
  return data as Song[];
}

export async function fetchSongById(id: string) {
  const { data, error } = await supabase
    .from("songs")
    .select("*")
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
