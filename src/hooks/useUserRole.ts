import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Roles de liderazgo que tienen permisos elevados
const LEADERSHIP_ROLES = ['admin', 'lider', 'pastor', 'moderador'];

export const useUserRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRoles = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLeader(false);
        setIsModerator(false);
        setUserRoles([]);
        setLoading(false);
        return;
      }

      try {
        // Get user's roles from user_roles table
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error checking roles:', error);
          setIsAdmin(false);
          setIsLeader(false);
          setIsModerator(false);
          setUserRoles([]);
        } else if (roles && roles.length > 0) {
          const roleList = roles.map(r => r.role);
          setUserRoles(roleList);
          setIsAdmin(roleList.includes('admin'));
          setIsModerator(roleList.includes('moderador') || roleList.includes('admin'));
          setIsLeader(roleList.some(role => LEADERSHIP_ROLES.includes(role)));
        } else {
          setIsAdmin(false);
          setIsLeader(false);
          setIsModerator(false);
          setUserRoles([]);
        }
      } catch (error) {
        console.error('Error checking roles:', error);
        setIsAdmin(false);
        setIsLeader(false);
        setIsModerator(false);
        setUserRoles([]);
      } finally {
        setLoading(false);
      }
    };

    checkRoles();
  }, [user]);

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
