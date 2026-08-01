import { supabase } from "@/integrations/supabase/client";
import type { TheoryCategory, TheoryResource } from "@/types/theory";

export async function fetchCategories(): Promise<TheoryCategory[]> {
  const { data, error } = await supabase
    .from("theory_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as TheoryCategory[];
}

export async function fetchResources(options?: {
  categoryId?: string;
  instrument?: string;
  level?: string;
  search?: string;
}): Promise<TheoryResource[]> {
  const { categoryId, instrument, level, search } = options || {};

  let query = supabase
    .from("theory_resources")
    .select("*, category:theory_categories(*), creator_profile:profiles!theory_resources_created_by_fkey(full_name, avatar_url)")
    .order("created_at", { ascending: false });

  if (categoryId && categoryId !== "all") {
    query = query.eq("category_id", categoryId);
  }

  if (instrument && instrument !== "all") {
    query = query.eq("instrument", instrument);
  }

  if (level && level !== "all") {
    query = query.eq("target_level", level);
  }

  if (search && search.trim()) {
    query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as TheoryResource[];
}

export async function fetchResourceById(id: string): Promise<TheoryResource> {
  const { data, error } = await supabase
    .from("theory_resources")
    .select("*, category:theory_categories(*), creator_profile:profiles!theory_resources_created_by_fkey(full_name, avatar_url)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as TheoryResource;
}

export async function fetchUserFavorites(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("theory_favorites")
    .select("resource_id")
    .eq("user_id", userId);

  if (error) throw error;
  return (data || []).map((f) => f.resource_id);
}

export async function toggleTheoryFavorite(
  resourceId: string,
  userId: string,
  isFavorite: boolean,
) {
  if (isFavorite) {
    const { error } = await supabase
      .from("theory_favorites")
      .delete()
      .eq("resource_id", resourceId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("theory_favorites")
      .insert({ resource_id: resourceId, user_id: userId });
    if (error) throw error;
  }
}

export async function uploadTheoryFile(file: File): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("theory-files")
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("theory-files")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function createTheoryResource(
  resource: Omit<TheoryResource, "id" | "created_at" | "updated_at" | "category" | "creator_profile">,
) {
  const { data, error } = await supabase
    .from("theory_resources")
    .insert(resource)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTheoryResource(
  id: string,
  updates: Partial<TheoryResource>,
) {
  const { error } = await supabase
    .from("theory_resources")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteTheoryResource(id: string) {
  const { error } = await supabase
    .from("theory_resources")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function fetchUserCompletions(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("theory_completions")
    .select("resource_id")
    .eq("user_id", userId);

  if (error) {
    console.warn("theory_completions table query fallback:", error);
    return [];
  }
  return (data || []).map((c) => c.resource_id);
}

export async function toggleTheoryCompletion(
  resourceId: string,
  userId: string,
  isCompleted: boolean,
) {
  if (isCompleted) {
    const { error } = await supabase
      .from("theory_completions")
      .delete()
      .eq("resource_id", resourceId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("theory_completions")
      .insert({ resource_id: resourceId, user_id: userId });
    if (error) throw error;
  }
}
