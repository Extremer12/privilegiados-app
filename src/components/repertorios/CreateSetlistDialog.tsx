import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, BookOpen, Users, MessageSquare, 
  Sparkles, X, ChevronLeft, UserPlus, Check, Trash2, 
  Search, Music, Mic
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useGroup } from '@/hooks/useGroupContext';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Participant {
  user_id: string;
  role: string;
}

interface Event {
  id: string;
  title: string;
  event_date: string;
}

interface CreateSetlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
  userId: string;
}

const ROLES = [
  'Cantante', 'Músico', 'Sonido', 'Proyección', 'Director', 'Predicador', 'Otro'
];

export function CreateSetlistDialog({ 
  open, 
  onOpenChange, 
  onCreated, 
  userId 
}: CreateSetlistDialogProps) {
  const { activeGroup } = useGroup();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    theme_verse: '',
    service_director: '',
    preacher: '',
    event_id: '',
  });

  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (open) {
      fetchEvents();
      fetchProfiles();
      setStep(1);
    }
  }, [open]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, event_date')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(20);
    
    if (data) setEvents(data);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .order('full_name');
    if (data) setProfiles(data);
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

  const handleSubmit = async () => {
    if (!formData.title.trim() || !date) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }
    
    setLoading(true);
    try {
      // 1. Create setlist
      const { data: setlist, error: setlistError } = await supabase
        .from('setlists')
        .insert({
          title: formData.title,
          description: formData.description || null,
          service_date: date.toISOString(),
          theme_verse: formData.theme_verse || null,
          service_director: formData.service_director || null,
          preacher: formData.preacher || null,
          event_id: formData.event_id || null,
          created_by: userId,
          status: 'draft',
          group_id: activeGroup?.id,
        })
        .select('id')
        .single();

      if (setlistError) throw setlistError;

      // 2. Add participants
      if (participants.length > 0) {
        const { error: participantsError } = await supabase
          .from('setlist_participants')
          .insert(participants.map(p => ({
            setlist_id: setlist.id,
            user_id: p.user_id,
            role_in_service: p.role
          })));
        if (participantsError) throw participantsError;
      }
      
      onCreated(setlist.id);
      onOpenChange(false);
      toast.success("¡Repertorio creado con éxito!");
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        theme_verse: '',
        service_director: '',
        preacher: '',
        event_id: '',
      });
      setParticipants([]);
    } catch (error: any) {
      console.error('Error creating setlist:', error);
      toast.error("Error al crear el repertorio: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none m-0 p-0 rounded-none bg-[#0d1117] border-none flex flex-col overflow-hidden">
        {/* Full Screen Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-xl sticky top-0 z-50">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-white/5">
            <X className="h-6 w-6" />
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-black tracking-tight uppercase">Nuevo Repertorio</h2>
            <p className="text-[10px] font-bold text-secondary tracking-widest uppercase">Paso {step} de 2</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        <ScrollArea className="flex-1">
          <div className="max-w-2xl mx-auto px-6 py-10">
            {step === 1 ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tighter text-white">Información Básica</h3>
                  <p className="text-muted-foreground text-sm font-medium">Define los detalles principales del servicio.</p>
                </div>

                <div className="grid gap-8">
                  {/* Título */}
                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-xs uppercase font-black tracking-widest text-muted-foreground/80">Título del Repertorio *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ej: Culto Dominical de Adoración"
                      className="bg-white/5 border-white/10 h-14 rounded-2xl text-lg font-bold focus:border-secondary/40 px-5"
                      required
                    />
                  </div>

                  {/* Fecha */}
                  <div className="space-y-3">
                    <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground/80">Fecha del Servicio *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-14 justify-start text-left font-bold rounded-2xl bg-white/5 border-white/10 px-5",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-5 w-5 text-secondary" />
                          {date ? format(date, "PPPP", { locale: es }) : "Selecciona una fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-3xl border-white/10 bg-[#1a1f2c] shadow-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Director */}
                    <div className="space-y-3">
                      <Label htmlFor="service_director" className="text-xs uppercase font-black tracking-widest text-muted-foreground/80 flex items-center gap-2">
                        <Users className="h-3 w-3" /> Director
                      </Label>
                      <Input
                        id="service_director"
                        value={formData.service_director}
                        onChange={(e) => setFormData(prev => ({ ...prev, service_director: e.target.value }))}
                        placeholder="Ej: Karina Andrada"
                        className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-secondary/40"
                      />
                    </div>

                    {/* Predicador */}
                    <div className="space-y-3">
                      <Label htmlFor="preacher" className="text-xs uppercase font-black tracking-widest text-muted-foreground/80 flex items-center gap-2">
                        <Mic className="h-3 w-3" /> Predicador
                      </Label>
                      <Input
                        id="preacher"
                        value={formData.preacher}
                        onChange={(e) => setFormData(prev => ({ ...prev, preacher: e.target.value }))}
                        placeholder="Ej: Pastor Juan Benegas"
                        className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-secondary/40"
                      />
                    </div>
                  </div>

                  {/* Versículo */}
                  <div className="space-y-3">
                    <Label htmlFor="theme_verse" className="text-xs uppercase font-black tracking-widest text-muted-foreground/80 flex items-center gap-2">
                      <BookOpen className="h-3 w-3" /> Versículo Temático
                    </Label>
                    <Textarea
                      id="theme_verse"
                      value={formData.theme_verse}
                      onChange={(e) => setFormData(prev => ({ ...prev, theme_verse: e.target.value }))}
                      placeholder="Ej: Salmos 100:2 - Cantad con júbilo a Jehová..."
                      className="bg-white/5 border-white/10 rounded-2xl focus:border-secondary/40 min-h-[100px] p-5 text-base italic"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tighter text-white">Equipo de Servicio</h3>
                  <p className="text-muted-foreground text-sm font-medium">Selecciona quiénes servirán en este repertorio.</p>
                </div>

                <div className="space-y-6">
                  {/* Search Profiles */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar miembros..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-11 bg-white/5 border-white/10 h-12 rounded-xl focus:border-secondary/40"
                    />
                  </div>

                  {/* Profiles List */}
                  <div className="grid gap-3">
                    {filteredProfiles.map(profile => {
                      const isSelected = participants.some(p => p.user_id === profile.id);
                      const currentParticipant = participants.find(p => p.user_id === profile.id);
                      
                      return (
                        <div 
                          key={profile.id}
                          className={cn(
                            "flex flex-col gap-3 p-4 rounded-[2rem] border transition-all duration-300",
                            isSelected ? "bg-secondary/10 border-secondary/30" : "bg-white/5 border-white/5"
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
                                <p className="font-bold text-white">{profile.full_name}</p>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Miembro</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleParticipant(profile.id)}
                              className={cn(
                                "rounded-2xl transition-all",
                                isSelected ? "bg-secondary text-primary-foreground" : "bg-white/5 text-white/40"
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
                                      "cursor-pointer rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase transition-all",
                                      currentParticipant?.role === role 
                                        ? "bg-secondary text-primary-foreground" 
                                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
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
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Bottom Actions */}
        <div className="px-6 py-6 border-t border-white/5 bg-[#0d1117]/80 backdrop-blur-xl flex items-center gap-4">
          {step === 2 && (
            <Button 
              variant="outline" 
              onClick={() => setStep(1)} 
              className="h-14 w-14 rounded-2xl bg-white/5 border-white/10 flex-shrink-0"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          
          <Button 
            disabled={loading || (step === 1 && !formData.title.trim())}
            onClick={() => step === 1 ? setStep(2) : handleSubmit()}
            className="flex-1 h-14 rounded-2xl bg-secondary text-primary-foreground font-black text-sm shadow-xl shadow-secondary/20 tracking-widest uppercase transition-all active:scale-95"
          >
            {loading ? 'Creando...' : step === 1 ? 'Continuar' : 'Crear Repertorio'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
