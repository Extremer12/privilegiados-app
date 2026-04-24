import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Roles de liderazgo que tienen permisos elevados
const LEADERSHIP_ROLES = ['admin', 'lider', 'pastor', 'moderador'];

export const useUserRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRoles = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLeader(false);
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        // Get user's role from user_roles table
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error checking roles:', error);
          setIsAdmin(false);
          setIsLeader(false);
          setUserRole(null);
        } else if (roles && roles.length > 0) {
          const role = roles[0].role;
          setUserRole(role);
          setIsAdmin(role === 'admin');
          setIsLeader(LEADERSHIP_ROLES.includes(role));
        } else {
          setIsAdmin(false);
          setIsLeader(false);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error checking roles:', error);
        setIsAdmin(false);
        setIsLeader(false);
        setUserRole(null);
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
        .update({ role: 'admin' })
        .eq('user_id', userId);

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
        .update({ role: 'otro' })
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error demoting from admin:', error);
      return { error: error.message };
    }
  };

  const assignRole = async (userId: string, role: string) => {
    if (!isAdmin) return { error: 'Not authorized' };

    try {
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error assigning role:', error);
      return { error: error.message };
    }
  };

  return { isAdmin, isLeader, userRole, loading, promoteToAdmin, demoteFromAdmin, assignRole };
};
