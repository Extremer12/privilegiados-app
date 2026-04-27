import { useState, useEffect } from 'react';
import { Users, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParticipantStatus {
  id: string;
  user_id: string;
  role_in_service: string;
  status: 'pending' | 'confirmed' | 'rejected';
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function LiveParticipantsPanel({ sessionId }: { sessionId: string }) {
  const [participants, setParticipants] = useState<ParticipantStatus[]>([]);

  useEffect(() => {
    // 1. Initial fetch
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('live_session_participants')
        .select(`
          id,
          user_id,
          role_in_service,
          status,
          profiles(full_name, avatar_url)
        `)
        .eq('session_id', sessionId);
      
      if (data) {
        setParticipants(data as unknown as ParticipantStatus[]);
      }
    };
    
    fetchParticipants();

    // 2. Subscribe to realtime updates
    const channel = supabase
      .channel(`live_participants_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_participants',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          // Re-fetch on any change to keep it simple and ensure profiles data is joined
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const confirmedCount = participants.filter(p => p.status === 'confirmed').length;

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-4 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="p-2 bg-secondary/20 rounded-xl">
          <Users className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">Equipo Conectado</h3>
          <p className="text-[10px] uppercase tracking-widest text-secondary/80 font-black">
            {confirmedCount} / {participants.length} Confirmados
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-2">
          {participants.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No hay participantes asignados</p>
          ) : (
            participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-white/5 border border-white/5 p-2 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-white/10">
                    <AvatarImage src={p.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary/20 text-secondary text-xs font-bold">
                      {p.profiles?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-white line-clamp-1">{p.profiles?.full_name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black">{p.role_in_service}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center shrink-0 w-6 h-6">
                  {p.status === 'confirmed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {p.status === 'pending' && <Clock className="w-4 h-4 text-amber-400" />}
                  {p.status === 'rejected' && <XCircle className="w-4 h-4 text-red-400" />}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
