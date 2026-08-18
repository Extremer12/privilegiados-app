import { useAuth } from "./useAuth";

export const SUPER_ADMIN_EMAIL = "cristianbordon186@gmail.com";

export const useTheoryPermissions = () => {
  const { user } = useAuth();

  const isSuperAdmin =
    !!user?.email && user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  return {
    canManageTheory: isSuperAdmin,
    isSuperAdmin,
    isGlobalAdmin: isSuperAdmin,
    isLoading: false,
  };
};
