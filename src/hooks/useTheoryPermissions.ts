import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import { supabase } from "@/integrations/supabase/client";

const GENERACION_PRIVILEGIADA_GROUP_ID = "4e634cc1-9bb8-460b-8d9c-7b87f62b6fb4";

export const useTheoryPermissions = () => {
  const { user } = useAuth();
  const { isAdmin: isGlobalAdmin } = useUserRole();

  const { data: isGenPrivAdmin = false, isLoading } = useQuery({
    queryKey: ["isGenPrivAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("group_members")
        .select("role, status")
        .eq("user_id", user.id)
        .eq("group_id", GENERACION_PRIVILEGIADA_GROUP_ID)
        .eq("role", "admin")
        .eq("status", "approved")
        .maybeSingle();

      if (error) {
        console.error("Error checking theory permissions:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const canManageTheory = isGlobalAdmin || isGenPrivAdmin;

  return {
    canManageTheory,
    isGlobalAdmin,
    isGenPrivAdmin,
    isLoading,
  };
};
