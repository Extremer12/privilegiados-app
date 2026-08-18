/**
 * Service layer for Music Group data access.
 *
 * Centralises all Supabase queries for the music_groups, group_members
 * and group_join_requests tables.
 */

import { supabase } from "@/integrations/supabase/client";
import type { MusicGroup, GroupMember, GroupJoinRequest } from "@/types";

// Type-safe reference to Supabase for dynamic multi-group tables
const db = supabase as any;

// ──────────────────────────────────────────────
//  Slug utility
// ──────────────────────────────────────────────

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "")   // remove special chars
    .replace(/\s+/g, "-")            // spaces → dashes
    .replace(/-+/g, "-")             // collapse dashes
    .replace(/^-|-$/g, "")           // trim leading/trailing dashes
    .slice(0, 60);
}

// ──────────────────────────────────────────────
//  Groups CRUD
// ──────────────────────────────────────────────

export async function createGroup(
  name: string,
  description: string,
  logoUrl: string | null,
  userId: string,
): Promise<MusicGroup> {
  const slug = generateSlug(name);

  // Check slug uniqueness
  const { data: existing } = await db
    .from("music_groups")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const finalSlug = existing
    ? `${slug}-${Date.now().toString(36)}`
    : slug;

  const { data, error } = await db
    .from("music_groups")
    .insert({
      name,
      slug: finalSlug,
      description,
      logo_url: logoUrl,
      created_by: userId,
      is_public: true,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Creator becomes admin automatically
  const { error: memberError } = await db
    .from("group_members")
    .insert({
      group_id: data.id,
      user_id: userId,
      role: "admin",
      display_name: null, // will be filled from profile
      status: "approved",
      joined_at: new Date().toISOString(),
    });

  if (memberError) throw memberError;

  return data as MusicGroup;
}

export async function updateGroup(
  groupId: string,
  updates: { name?: string; description?: string; logo_url?: string | null; is_public?: boolean },
) {
  const { error } = await db
    .from("music_groups")
    .update(updates)
    .eq("id", groupId);

  if (error) throw error;
}

export async function deleteGroup(groupId: string) {
  const { error } = await db
    .from("music_groups")
    .delete()
    .eq("id", groupId);

  if (error) throw error;
}

export async function fetchGroupBySlug(slug: string): Promise<MusicGroup | null> {
  const { data, error } = await db
    .from("music_groups")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data as MusicGroup | null;
}

export async function fetchGroupById(groupId: string): Promise<MusicGroup | null> {
  const { data, error } = await db
    .from("music_groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (error) throw error;
  return data as MusicGroup | null;
}

// ──────────────────────────────────────────────
//  User's Groups
// ──────────────────────────────────────────────

export async function fetchUserGroups(userId: string): Promise<(MusicGroup & { memberRole: string })[]> {
  const { data, error } = await db
    .from("group_members")
    .select("role, music_groups (*)")
    .eq("user_id", userId)
    .eq("status", "approved");

  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row.music_groups,
    memberRole: row.role,
  }));
}

// ──────────────────────────────────────────────
//  Search public groups
// ──────────────────────────────────────────────

export async function searchPublicGroups(query: string): Promise<MusicGroup[]> {
  let q = db
    .from("music_groups")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (query.trim()) {
    q = q.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as MusicGroup[];
}

// ──────────────────────────────────────────────
//  Members
// ──────────────────────────────────────────────

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await db
    .from("group_members")
    .select("*, profiles (full_name, avatar_url)")
    .eq("group_id", groupId)
    .eq("status", "approved")
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data || []) as GroupMember[];
}

export async function fetchApprovedMemberCount(groupId: string): Promise<number> {
  const { count, error } = await db
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("status", "approved");

  if (error) throw error;
  return count || 0;
}

export async function updateMemberRole(memberId: string, role: string) {
  const { error } = await db
    .from("group_members")
    .update({ role })
    .eq("id", memberId);

  if (error) throw error;
}

export async function removeMember(memberId: string) {
  const { error } = await db
    .from("group_members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;
}

// ──────────────────────────────────────────────
//  Join Requests
// ──────────────────────────────────────────────

export async function submitJoinRequest(
  groupId: string,
  userId: string,
  displayName: string,
  instrument: string,
  message: string,
) {
  // Insert into group_join_requests (historical log)
  const { error: reqError } = await db
    .from("group_join_requests")
    .insert({
      group_id: groupId,
      user_id: userId,
      display_name: displayName,
      instrument,
      message,
      status: "pending",
    });

  if (reqError) throw reqError;

  // Insert into group_members as pending
  const { error: memError } = await db
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: userId,
      role: "miembro",
      display_name: displayName,
      instrument,
      bio: message,
      status: "pending",
    });

  // Ignore duplicate key error (user already requested)
  if (memError && !memError.message.includes("duplicate")) throw memError;
}

export async function fetchPendingJoinRequests(groupId: string): Promise<GroupJoinRequest[]> {
  const { data, error } = await db
    .from("group_join_requests")
    .select("*, profiles (full_name, avatar_url)")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as GroupJoinRequest[];
}

export async function approveJoinRequest(
  requestId: string,
  groupId: string,
  userId: string,
  role: string = "miembro",
) {
  // Update the join request record
  const { error: reqError } = await db
    .from("group_join_requests")
    .update({ status: "approved" })
    .eq("id", requestId);

  if (reqError) throw reqError;

  // Update or insert the group member
  const { error: memError } = await db
    .from("group_members")
    .upsert(
      {
        group_id: groupId,
        user_id: userId,
        role,
        status: "approved",
        joined_at: new Date().toISOString(),
      },
      { onConflict: "group_id,user_id" },
    );

  if (memError) throw memError;
}

export async function rejectJoinRequest(
  requestId: string,
  groupId: string,
  userId: string,
) {
  // Update the request log
  const { error: reqError } = await db
    .from("group_join_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);

  if (reqError) throw reqError;

  // Update the member record
  const { error: memError } = await db
    .from("group_members")
    .update({ status: "rejected" })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (memError) throw memError;
}

// Aliases for compatibility
export const fetchPendingRequests = fetchPendingJoinRequests;
export const approveRequest = approveJoinRequest;
export const rejectRequest = rejectJoinRequest;

// ──────────────────────────────────────────────
//  Logo Upload
// ──────────────────────────────────────────────

export async function uploadGroupLogo(
  groupId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${groupId}/logo.${ext}`;

  const { error: uploadError } = await db.storage
    .from("group-logos")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = db.storage
    .from("group-logos")
    .getPublicUrl(path);

  return data.publicUrl;
}

// ──────────────────────────────────────────────
//  Check user membership status
// ──────────────────────────────────────────────

export async function checkMembershipStatus(
  groupId: string,
  userId: string,
): Promise<"approved" | "pending" | "rejected" | "none"> {
  const { data, error } = await db
    .from("group_members")
    .select("status")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return "none";
  return data.status as "approved" | "pending" | "rejected";
}

// ──────────────────────────────────────────────
//  Account & Group Permanent Deletion
// ──────────────────────────────────────────────

/**
 * Elimina un grupo definitivamente junto con sus registros asociados
 */
export async function deleteGroupPermanently(groupId: string): Promise<void> {
  try {
    await db.from("group_join_requests").delete().eq("group_id", groupId);
    await db.from("group_members").delete().eq("group_id", groupId);
    await db.from("setlists").delete().eq("group_id", groupId);
    await db.from("events").delete().eq("group_id", groupId);
    await db.from("theory_resources").delete().eq("group_id", groupId);
    await db.from("songs").delete().eq("group_id", groupId);
  } catch (cleanErr) {
    console.warn("Error en limpieza secundaria del grupo:", cleanErr);
  }

  const { error } = await db
    .from("music_groups")
    .delete()
    .eq("id", groupId);

  if (error) throw error;
}

/**
 * Elimina la cuenta del usuario transfiriendo la administración de grupos
 * o eliminando el grupo si el usuario era el único integrante.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  // 1. Obtener todos los grupos donde el usuario participa
  const { data: memberships, error: memErr } = await db
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", userId);

  if (memErr) {
    console.warn("Error consultando membresías:", memErr);
  }

  // 2. Gestionar la sucesión de cada grupo donde era admin
  for (const mem of memberships || []) {
    if (mem.role === "admin") {
      // Buscar otros integrantes aprobados en el grupo
      const { data: otherMembers, error: otherErr } = await db
        .from("group_members")
        .select("id, user_id, role, joined_at")
        .eq("group_id", mem.group_id)
        .neq("user_id", userId)
        .eq("status", "approved");

      if (otherErr) console.warn("Error buscando sucesor:", otherErr);

      if (otherMembers && otherMembers.length > 0) {
        // Ponderar rango más alto: lider/moderador > miembro, luego antigüedad
        const rankWeight = (r: string) => {
          if (r === "admin") return 3;
          if (r === "lider" || r === "moderador") return 2;
          return 1;
        };

        const sorted = [...otherMembers].sort((a, b) => {
          const diff = rankWeight(b.role) - rankWeight(a.role);
          if (diff !== 0) return diff;
          return new Date(a.joined_at || 0).getTime() - new Date(b.joined_at || 0).getTime();
        });

        const successor = sorted[0];

        // Promover al sucesor a admin
        await db
          .from("group_members")
          .update({ role: "admin" })
          .eq("id", successor.id);

        // Actualizar created_by del grupo
        await db
          .from("music_groups")
          .update({ created_by: successor.user_id })
          .eq("id", mem.group_id);
      } else {
        // No hay más integrantes: se elimina el grupo definitivamente
        await deleteGroupPermanently(mem.group_id);
      }
    }
  }

  // 3. Eliminar registros del usuario
  try {
    await db.from("group_members").delete().eq("user_id", userId);
    await db.from("group_join_requests").delete().eq("user_id", userId);
    await db.from("favorite_songs").delete().eq("user_id", userId);
    await db.from("song_comments").delete().eq("user_id", userId);
    await db.from("song_likes").delete().eq("user_id", userId);
    await db.from("theory_progress").delete().eq("user_id", userId);
    await db.from("user_roles").delete().eq("user_id", userId);
    await db.from("profiles").delete().eq("id", userId);
  } catch (deleteErr) {
    console.warn("Error eliminando registros del usuario:", deleteErr);
  }
}
