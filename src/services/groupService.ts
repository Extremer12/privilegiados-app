/**
 * Service layer for Music Group data access.
 *
 * Centralises all Supabase queries for the music_groups, group_members
 * and group_join_requests tables.
 */

import { supabase } from "@/integrations/supabase/client";
import type { MusicGroup, GroupMember, GroupJoinRequest } from "@/types";

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
  const { data: existing } = await supabase
    .from("music_groups")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const finalSlug = existing
    ? `${slug}-${Date.now().toString(36)}`
    : slug;

  const { data, error } = await supabase
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
  const { error: memberError } = await supabase
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
  const { error } = await supabase
    .from("music_groups")
    .update(updates)
    .eq("id", groupId);

  if (error) throw error;
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase
    .from("music_groups")
    .delete()
    .eq("id", groupId);

  if (error) throw error;
}

export async function fetchGroupBySlug(slug: string): Promise<MusicGroup | null> {
  const { data, error } = await supabase
    .from("music_groups")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data as MusicGroup | null;
}

export async function fetchGroupById(groupId: string): Promise<MusicGroup | null> {
  const { data, error } = await supabase
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

export async function fetchUserGroups(userId: string): Promise<(MusicGroup & { memberRole: string }  )[]> {
  const { data, error } = await supabase
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
  let q = supabase
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
  const { data, error } = await supabase
    .from("group_members")
    .select("*, profiles (full_name, avatar_url)")
    .eq("group_id", groupId)
    .eq("status", "approved")
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data || []) as GroupMember[];
}

export async function fetchApprovedMemberCount(groupId: string): Promise<number> {
  const { count, error } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("status", "approved");

  if (error) throw error;
  return count || 0;
}

export async function updateMemberRole(memberId: string, role: string) {
  const { error } = await supabase
    .from("group_members")
    .update({ role })
    .eq("id", memberId);

  if (error) throw error;
}

export async function removeMember(memberId: string) {
  const { error } = await supabase
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
  const { error: reqError } = await supabase
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
  const { error: memError } = await supabase
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

export async function fetchPendingRequests(groupId: string): Promise<GroupJoinRequest[]> {
  const { data, error } = await supabase
    .from("group_join_requests")
    .select("*, profiles (full_name, avatar_url)")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as GroupJoinRequest[];
}

export async function approveRequest(requestId: string, groupId: string, userId: string, reviewerId: string) {
  // Update the request
  const { error: reqError } = await supabase
    .from("group_join_requests")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (reqError) throw reqError;

  // Update the member record
  const { error: memError } = await supabase
    .from("group_members")
    .update({
      status: "approved",
      joined_at: new Date().toISOString(),
    })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (memError) throw memError;
}

export async function rejectRequest(requestId: string, groupId: string, userId: string, reviewerId: string) {
  // Update the request
  const { error: reqError } = await supabase
    .from("group_join_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (reqError) throw reqError;

  // Update the member record
  const { error: memError } = await supabase
    .from("group_members")
    .update({ status: "rejected" })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (memError) throw memError;
}

// ──────────────────────────────────────────────
//  Logo Upload
// ──────────────────────────────────────────────

export async function uploadGroupLogo(
  groupId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${groupId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("group-logos")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
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
  const { data, error } = await supabase
    .from("group_members")
    .select("status")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return "none";
  return data.status as "approved" | "pending" | "rejected";
}
