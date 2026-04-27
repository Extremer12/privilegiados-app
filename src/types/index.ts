/**
 * Centralized type definitions for Privilegiados App.
 *
 * All domain interfaces live here so that every page, hook and component
 * imports from a single source of truth instead of redefining their own
 * interfaces.  Keep this file alphabetically ordered by export name.
 */

// ──────────────────────────────────────────────
//  Chat / Forum
// ──────────────────────────────────────────────

export interface ChatMessageType {
  id: string;
  content: string;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
  author_id: string;
  status?: "sending" | "sent" | "error";
}

export interface UserPresence {
  user_id: string;
  online_at: string;
  typing?: boolean;
}

// ──────────────────────────────────────────────
//  Events
// ──────────────────────────────────────────────

export type EventType = "ensayo" | "presentacion" | "reunion" | "servicio" | "otro";

export interface AppEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  created_by: string;
  created_at: string;
  songs_to_practice: string[] | null;
  event_type: EventType;
}

// ──────────────────────────────────────────────
//  Live Sessions
// ──────────────────────────────────────────────

export interface LiveSession {
  id: string;
  is_active: boolean;
  current_position: number;
  current_song_id: string | null;
  started_at: string;
  created_by: string;
  setlist_id: string;
}

export interface LiveSessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  role_in_service: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface LiveComment {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

// ──────────────────────────────────────────────
//  Members / Profiles
// ──────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  instrument?: string | null;
  role?: string | null;
}

export interface UserRole {
  user_id: string;
  role: string;
}

// ──────────────────────────────────────────────
//  Songs
// ──────────────────────────────────────────────

export type SongCategory = "alabanza" | "adoracion" | "especial" | "otro";

export interface Song {
  id: string;
  title: string;
  author?: string | null;
  category: SongCategory | string;
  lyrics: string | null;
  chords: string | null;
  audio_url: string | null;
  youtube_url: string | null;
  created_at?: string;
  created_by?: string;
  status?: "approved" | "pending";
}

// ──────────────────────────────────────────────
//  Setlists / Repertorios
// ──────────────────────────────────────────────

export type SetlistStatus = "draft" | "ready" | "completed";

export interface Setlist {
  id: string;
  title: string;
  description: string | null;
  service_date: string;
  created_by: string;
  created_at: string | null;
  event_id: string | null;
  theme_verse: string | null;
  service_director: string | null;
  preacher: string | null;
  status: SetlistStatus;
  sections_config?: any;
}

/** Compact setlist shape used inside EnVivo (only the fields we query). */
export interface SetlistCompact {
  id: string;
  title: string;
  theme_verse: string | null;
  sections_config?: any;
}

export interface SetlistSong {
  id: string;
  setlist_id?: string;
  song_id?: string;
  position: number;
  notes: string | null;
  section: string | null;
  assigned_to?: string | null;
  special_instructions: string | null;
  created_at?: string | null;
  songs: {
    id: string;
    title: string;
    category?: string;
    lyrics: string | null;
    chords: string | null;
    youtube_url?: string | null;
  };
}

export interface ServiceSection {
  id: string;
  setlist_id: string;
  section_type: string;
  section_order: number;
  title: string;
  assigned_person: string | null;
  notes: string | null;
  bible_verse: string | null;
  created_at: string | null;
}
