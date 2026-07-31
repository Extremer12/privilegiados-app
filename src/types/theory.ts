export type ContentType = 'video' | 'pdf' | 'article' | 'image' | 'audio';
export type TargetLevel = 'principiante' | 'intermedio' | 'avanzado' | 'todos';
export type TargetInstrument = 'vocal' | 'guitarra' | 'bajo' | 'teclado' | 'bateria' | 'sonido' | 'general';

export interface TheoryCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color_gradient: string;
  sort_order: number;
  created_at: string;
}

export interface TheoryResource {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  content_type: ContentType;
  youtube_url: string | null;
  file_url: string | null;
  file_name: string | null;
  article_body: string | null;
  target_level: TargetLevel;
  instrument: TargetInstrument;
  duration_minutes: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: TheoryCategory;
  creator_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface TheoryFavorite {
  id: string;
  resource_id: string;
  user_id: string;
  created_at: string;
}
