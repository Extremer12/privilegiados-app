import { useState, useEffect } from 'react';
import { Search, UserPlus, Check, Users, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Participant {
  user_id: string;
  role: string;
}

interface ManageParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'setlist' | 'live_session';
  targetId: string; // setlist_id or session_id
  onSaved?: () => void;
}

const ROLES = [
  'Cantante', 'Músico', 'Sonido', 'Proyección', 'Director', 'Predicador', 'Otro'
];

export function ManageParticipantsDialog({
  open,
  onOpenChange,
  type,
  targetId,
  onSaved
}: ManageParticipantsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, targetId, type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      
      if (profilesData) setProfiles(profilesData);

      // Fetch existing participants
      if (type === 'setlist') {
        const { data: parts } = await supabase
          .from('setlist_participants')
          .select('user_id, role_in_service')
          .eq('setlist_id', targetId);
          
        if (parts) {
          setParticipants(parts.map(p => ({ user_id: p.user_id!, role: p.role_in_service })));
        }
      } else {
        const { data: parts } = await supabase
          .from('live_session_participants')
          .select('user_id, role_in_service')
          .eq('session_id', targetId);
          
        if (parts) {
          setParticipants(parts.map(p => ({ user_id: p.user_id!, role: p.role_in_service })));
        }
      }
    } catch (error) {
      console.error("Error fetching participants data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleParticipant = (profileId: string) => {
    if (participants.some(p => p.user_id === profileId)) {
      setParticipants(prev => prev.filter(p => p.user_id !== profileId));
    } else {
      setParticipants(prev => [...prev, { user_id: profileId, role: 'Cantante' }]);
    }
  };

  const handleUpdateRole = (profileId: string, role: string) => {
    setParticipants(prev => prev.map(p => p.user_id === profileId ? { ...p, role } : p));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (type === 'setlist') {
        // 1. Delete existing
        await supabase.from('setlist_participants').delete().eq('setlist_id', targetId);
        
        // 2. Insert new
        if (participants.length > 0) {
          await supabase.from('setlist_participants').insert(
            participants.map(p => ({
              setlist_id: targetId,
              user_id: p.user_id,
              role_in_service: p.role
            }))
          );
        }
      } else {
        // live_session_participants
        // To preserve status ('confirmed', etc.), we shouldn't delete all.
        // But for simplicity, we can fetch existing, keep status if they exist, or delete removed ones.
        const { data: existingParts } = await supabase
          .from('live_session_participants')
          .select('user_id, status')
          .eq('session_id', targetId);
        
        const existingMap = new Map((existingParts || []).map(p => [p.user_id, p.status]));

        await supabase.from('live_session_participants').delete().eq('session_id', targetId);
        
        if (participants.length > 0) {
          await supabase.from('live_session_participants').insert(
            participants.map(p => ({
              session_id: targetId,
              user_id: p.user_id,
              role_in_service: p.role,
              status: existingMap.get(p.user_id) || 'pending'
            }))
          );
        }
      }

      toast.success("Equipo actualizado con éxito");
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (error: any) {
      console.error('Error saving participants:', error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl rounded-3xl bg-[#0d1117] border border-white/10 p-0 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/20 rounded-xl">
              <Users className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white">Gestionar Equipo</DialogTitle>
              <DialogDescription className="sr-only">
                Gestionar los integrantes y roles asignados a este servicio.
              </DialogDescription>
              <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">
                {participants.length} participantes
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-white/5">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 flex flex-col gap-4 overflow-hidden">
          <div className="relative shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar miembros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 bg-white/5 border-white/10 h-12 rounded-xl focus:border-secondary/40"
            />
          </div>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="grid gap-3 pb-4">
              {filteredProfiles.map(profile => {
                const isSelected = participants.some(p => p.user_id === profile.id);
                const currentParticipant = participants.find(p => p.user_id === profile.id);
                
                return (
                  <div 
                    key={profile.id}
                    className={cn(
                      "flex flex-col gap-3 p-4 rounded-[1.5rem] border transition-all duration-300",
                      isSelected ? "bg-secondary/10 border-secondary/30" : "bg-white/5 border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-white/10">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-secondary/20 text-secondary font-bold">
                            {profile.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-white text-sm">{profile.full_name}</p>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Miembro</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleParticipant(profile.id)}
                        className={cn(
                          "rounded-xl transition-all",
                          isSelected ? "bg-secondary text-primary-foreground" : "bg-white/5 text-white/40 hover:text-white"
                        )}
                      >
                        {isSelected ? <Check className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                      </Button>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-2 pt-2 border-t border-secondary/20">
                        <span className="text-[10px] font-black uppercase text-secondary/60">Rol:</span>
                        <div className="flex flex-wrap gap-2">
                          {ROLES.map(role => (
                            <Badge
                              key={role}
                              onClick={() => handleUpdateRole(profile.id, role)}
                              className={cn(
                                "cursor-pointer rounded-md px-2 py-0.5 text-[10px] font-bold uppercase transition-all border-0",
                                currentParticipant?.role === role 
                                  ? "bg-secondary text-primary-foreground" 
                                  : "bg-black/40 text-muted-foreground hover:bg-white/10"
                              )}
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="p-6 border-t border-white/5 bg-[#0d1117]/80 backdrop-blur-xl shrink-0">
          <Button 
            disabled={loading}
            onClick={handleSave}
            className="w-full h-12 rounded-xl bg-secondary text-primary-foreground font-black text-sm shadow-xl shadow-secondary/20 tracking-widest uppercase transition-all active:scale-95"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
