/**
 * GroupContext — manages the active music group for the current user.
 *
 * Wraps the entire app so every page/hook can call `useGroup()` to get:
 *   - activeGroup: the currently selected MusicGroup
 *   - userGroups: all groups the user belongs to (approved)
 *   - isGroupAdmin: whether the user is admin of the active group
 *   - switchGroup(id): change the active group
 *   - loading: initial loading state
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { fetchUserGroups } from "@/services/groupService";
import type { MusicGroup } from "@/types";

interface GroupContextType {
  activeGroup: (MusicGroup & { memberRole: string }) | null;
  userGroups: (MusicGroup & { memberRole: string })[];
  isGroupAdmin: boolean;
  isGroupLeader: boolean;
  switchGroup: (groupId: string) => void;
  loading: boolean;
  refetchGroups: () => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

const STORAGE_KEY = "active_group_id";

export const GroupProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const {
    data: userGroups = [],
    isLoading,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["userGroups", user?.id],
    queryFn: () => fetchUserGroups(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Auto-select: if user has groups but no active one, pick the first
  useEffect(() => {
    if (userGroups.length > 0 && !activeGroupId) {
      const first = userGroups[0];
      setActiveGroupId(first.id);
      localStorage.setItem(STORAGE_KEY, first.id);
    }
    // If the saved group is not in the user's groups anymore, reset
    if (
      userGroups.length > 0 &&
      activeGroupId &&
      !userGroups.some((g) => g.id === activeGroupId)
    ) {
      setActiveGroupId(userGroups[0].id);
      localStorage.setItem(STORAGE_KEY, userGroups[0].id);
    }
  }, [userGroups, activeGroupId]);

  const switchGroup = useCallback(
    (groupId: string) => {
      setActiveGroupId(groupId);
      localStorage.setItem(STORAGE_KEY, groupId);
      // Invalidate all group-specific queries so data reloads
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const activeGroup =
    userGroups.find((g) => g.id === activeGroupId) ?? null;

  const isGroupAdmin = activeGroup?.memberRole === "admin";
  const isGroupLeader =
    isGroupAdmin ||
    activeGroup?.memberRole === "lider" ||
    activeGroup?.memberRole === "moderador";

  return (
    <GroupContext.Provider
      value={{
        activeGroup,
        userGroups,
        isGroupAdmin,
        isGroupLeader,
        switchGroup,
        loading: isLoading,
        refetchGroups,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error("useGroup must be used within a GroupProvider");
  }
  return context;
};
