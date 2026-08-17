import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGroup } from './useGroupContext';

// Roles de liderazgo que tienen permisos elevados
const LEADERSHIP_ROLES = ['admin', 'lider', 'pastor', 'moderador'];

export const useUserRole = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  let groupContext: ReturnType<typeof useGroup> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    groupContext = useGroup();
  } catch {
    groupContext = null;
  }

  const isGroupAdmin = groupContext?.isGroupAdmin ?? false;
  const isGroupLeader = groupContext?.isGroupLeader ?? false;
  const groupRole = groupContext?.activeGroup?.memberRole;

  const { data, isLoading: loading } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error checking roles:', error);
        return [];
      }

      return roles?.map(r => r.role) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const userRoles = data || [];
  const isAdmin = userRoles.includes('admin') || isGroupAdmin;
  const isModerator = userRoles.includes('moderador') || isAdmin || groupRole === 'moderador';
  const isLeader = isGroupLeader || isAdmin || userRoles.some(role => LEADERSHIP_ROLES.includes(role));

  const promoteToAdmin = async (userId: string) => {
    if (!isAdmin) return { error: 'Not authorized' };

    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (existingRole) {
        return { error: 'User is already an admin' };
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) throw error;
      
      // Invalidate queries so UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error promoting to admin:', error);
      return { error: error.message };
    }
  };

  const demoteFromAdmin = async (userId: string) => {
    if (!isAdmin) return { error: 'Not authorized' };

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error demoting from admin:', error);
      return { error: error.message };
    }
  };

  const syncRoles = async (userId: string, roles: string[]) => {
    if (!isAdmin) return { error: 'Not authorized' };

    try {
      // 1. Delete all existing roles for the user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // 2. Insert new roles
      if (roles.length > 0) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(roles.map(role => ({ user_id: userId, role })));
        
        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ['userRoles'] });

      return { success: true };
    } catch (error: any) {
      console.error('Error syncing roles:', error);
      return { error: error.message };
    }
  };

  const deleteUserCompletely = async (userId: string) => {
    if (!isAdmin && !isModerator) return { error: 'No tienes permisos para realizar esta acción' };

    try {
      const { error } = await supabase.rpc('delete_user_completely', {
        user_id_to_delete: userId
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      return { error: error.message };
    }
  };

  return { 
    isAdmin, 
    isLeader, 
    isModerator, 
    userRoles, 
    loading, 
    promoteToAdmin, 
    demoteFromAdmin, 
    syncRoles,
    deleteUserCompletely 
  };
};
