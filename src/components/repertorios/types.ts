// Tipos para el sistema de repertorios avanzado

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
  status: 'draft' | 'ready' | 'completed';
}

export interface SetlistSong {
  id: string;
  setlist_id: string;
  song_id: string;
  position: number;
  notes: string | null;
  section: string;
  assigned_to: string | null;
  special_instructions: string | null;
  created_at: string | null;
  songs?: {
    id: string;
    title: string;
    category: string;
    lyrics: string | null;
    chords: string | null;
    youtube_url: string | null;
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

export interface Song {
  id: string;
  title: string;
  category: string;
  lyrics: string | null;
  chords: string | null;
  youtube_url: string | null;
  audio_url: string | null;
}

export const SECTION_TYPES = [
  { id: 'alabanza', name: 'Alabanza', icon: 'Music', color: 'text-yellow-400', description: 'Canciones de celebración y gozo' },
  { id: 'adoracion', name: 'Adoración', icon: 'Heart', color: 'text-pink-400', description: 'Momento íntimo de adoración' },
  { id: 'lectura', name: 'Lectura Bíblica', icon: 'BookOpen', color: 'text-blue-400', description: 'Lectura de la Palabra' },
  { id: 'ofrenda', name: 'Diezmo y Ofrenda', icon: 'Gift', color: 'text-green-400', description: 'Momento de ofrenda' },
  { id: 'palabra', name: 'Comparte la Palabra', icon: 'MessageSquare', color: 'text-purple-400', description: 'Predicación del mensaje' },
  { id: 'ministracion', name: 'Ministración', icon: 'Sparkles', color: 'text-cyan-400', description: 'Ministración especial' },
  { id: 'cierre', name: 'Cierre', icon: 'Flag', color: 'text-orange-400', description: 'Cierre del servicio' },
] as const;

export type SectionType = typeof SECTION_TYPES[number]['id'];
