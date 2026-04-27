import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import * as liveSessionService from '@/services/liveSessionService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Invite {
  id: string;
  session_id: string;
  role_in_service: string;
  status: string;
}

export function LiveSessionInviteModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeInvite, setActiveInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check for existing pending invites
    const checkExistingInvites = async () => {
      const { data } = await supabase
        .from('live_session_participants')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        // Double check if the session is still active
        const { data: session } = await supabase
          .from('live_sessions')
          .select('is_active')
          .eq('id', data.session_id)
          .maybeSingle();

        if (session?.is_active) {
          setActiveInvite(data);
        }
      }
    };

    checkExistingInvites();

    // Listen for new invites
    const channel = supabase
      .channel(`invites_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_session_participants',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.status === 'pending') {
            setActiveInvite(payload.new as Invite);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_session_participants',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.status !== 'pending' && activeInvite?.id === payload.new.id) {
            setActiveInvite(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeInvite?.id]);

  const handleResponse = async (status: 'confirmed' | 'rejected') => {
    if (!activeInvite || !user) return;
    
    setLoading(true);
    try {
      await liveSessionService.updateInviteStatus(activeInvite.session_id, user.id, status);
      
      if (status === 'confirmed') {
        toast.success("Has confirmado tu asistencia");
        navigate(`/en-vivo/${activeInvite.session_id}`);
      } else {
        toast.info("Has rechazado la invitación al servicio");
      }
      
      setActiveInvite(null);
    } catch (error) {
      console.error("Error updating invite:", error);
      toast.error("Error al responder la invitación");
    } finally {
      setLoading(false);
    }
  };

  if (!activeInvite) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl overflow-hidden relative"
          style={{
            background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
            border: "1px solid hsl(217 33% 25% / 0.5)",
            boxShadow: "0 25px 50px -12px hsl(222 47% 5% / 0.8)",
          }}
        >
          {/* Animated background glow */}
          <div className="absolute -inset-24 bg-secondary/10 blur-[100px] rounded-full pointer-events-none animate-pulse" />
          
          <div className="p-8 relative z-10 text-center">
            <div className="w-20 h-20 mx-auto bg-secondary/20 rounded-full flex items-center justify-center mb-6 border-2 border-secondary/40 shadow-[0_0_30px_rgba(var(--secondary),0.3)]">
              <Mic className="w-10 h-10 text-secondary" />
            </div>

            <h2 className="text-3xl font-black tracking-tight text-white mb-3">¡Casi en Vivo!</h2>
            
            <p className="text-muted-foreground mb-6">
              Has sido convocado para servir en el culto que está por comenzar.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8">
              <p className="text-xs font-black uppercase tracking-widest text-secondary/80 mb-1">Tu Rol Asignado</p>
              <p className="text-lg font-bold text-white">{activeInvite.role_in_service || "Músico"}</p>
            </div>

            <div className="space-y-3">
              <Button 
                disabled={loading}
                onClick={() => handleResponse('confirmed')}
                className="w-full h-14 rounded-2xl bg-secondary text-primary-foreground font-black text-sm tracking-widest uppercase shadow-xl shadow-secondary/20 hover:scale-[1.02] transition-transform"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Confirmar y Unirse
              </Button>
              
              <Button 
                disabled={loading}
                variant="outline"
                onClick={() => handleResponse('rejected')}
                className="w-full h-14 rounded-2xl bg-transparent border-white/10 hover:bg-white/5 hover:text-white text-muted-foreground font-bold text-sm"
              >
                <XCircle className="w-5 h-5 mr-2" />
                No puedo participar
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
