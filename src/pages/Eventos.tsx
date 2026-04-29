import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Calendar as CalendarIcon, MapPin, Clock, Trash2, Search, Filter, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";
import { notificationService } from "@/services/notificationService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

import type { AppEvent as Event } from "@/types";

const EVENT_TYPE_LABELS = {
  ensayo: "Ensayo",
  presentacion: "Presentación",
  reunion: "Reunión",
  servicio: "Servicio",
  otro: "Otro",
};

const EVENT_TYPE_COLORS = {
  ensayo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  presentacion: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  reunion: "bg-green-500/20 text-green-400 border-green-500/30",
  servicio: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  otro: "bg-secondary/20 text-secondary border-secondary/30",
};

const Eventos = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    location: "",
    event_date: new Date(),
    event_time: "19:00",
    event_type: "otro" as Event["event_type"],
  });

  const { data: events = [], isLoading: loading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      requestNotificationPermission();
    }
  }, [user]);

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const createMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const { data, error } = await supabase.from("events").insert(eventData).select('id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Evento creado", {
        description: "El evento se ha publicado para todo el grupo",
      });

      if (data) {
        const eventDateStr = format(newEvent.event_date, "d 'de' MMMM", { locale: es });
        notificationService.notifyEventReminder(newEvent.title, `${eventDateStr} a las ${newEvent.event_time}`, data.id);
      }

      setIsDialogOpen(false);
      resetNewEvent();
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => {
      console.error("Error creating event:", error);
      toast.error("Error al crear evento");
    }
  });

  const resetNewEvent = () => {
    setNewEvent({
      title: "",
      description: "",
      location: "",
      event_date: new Date(),
      event_time: "19:00",
      event_type: "otro",
    });
  };

  const handleCreateEvent = async () => {
    if (!user || !newEvent.title) {
      toast.error("El título es obligatorio");
      return;
    }

    const [hours, minutes] = newEvent.event_time.split(":");
    const finalDate = new Date(newEvent.event_date);
    finalDate.setHours(parseInt(hours), parseInt(minutes));

    createMutation.mutate({
      title: newEvent.title,
      description: newEvent.description || null,
      location: newEvent.location || null,
      event_date: finalDate.toISOString(),
      event_type: newEvent.event_type,
      created_by: user.id,
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast.success("Evento eliminado");
      setDeleteEventId(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar el evento");
    }
  });

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "todos" || event.event_type === filterType;
    return matchesSearch && matchesType;
  });

  const today = startOfDay(new Date());
  const tomorrow = endOfDay(new Date());

  const todayEvents = filteredEvents.filter(e => {
    const date = parseISO(e.event_date);
    return isSameDay(date, today);
  });

  const upcomingEvents = filteredEvents.filter(e => {
    const date = parseISO(e.event_date);
    return isAfter(date, tomorrow);
  });

  const pastEvents = filteredEvents.filter(e => {
    const date = parseISO(e.event_date);
    return isBefore(date, today);
  }).reverse();

  const eventDates = events.map((event) => parseISO(event.event_date));

  if (!user) return null;

  return (
    <div className="flex-1 min-h-screen pt-20 pb-24 px-4 bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Premium Header Section */}
        <div className="relative overflow-hidden p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-2xl backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center shadow-lg border border-secondary/20 animate-pulse-subtle">
                  <CalendarIcon className="w-7 h-7 text-secondary" />
                </div>
                <div>
                  <h1 className="text-4xl font-black text-white tracking-tighter">Calendario Grupal</h1>
                  <p className="text-muted-foreground font-medium text-lg">Organización y coordinación de actividades</p>
                </div>
              </div>
              
              {/* Search and Filters */}
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="relative group min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-secondary transition-colors" />
                  <Input 
                    placeholder="Buscar eventos..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-black/20 border-white/10 rounded-xl focus:ring-secondary/20 h-11"
                  />
                </div>
                <div className="flex bg-black/20 p-1 rounded-xl border border-white/10">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setFilterType("todos")}
                    className={`rounded-lg px-4 h-9 ${filterType === 'todos' ? 'bg-secondary text-primary font-bold' : 'text-muted-foreground hover:text-white'}`}
                  >
                    Todos
                  </Button>
                  {Object.entries(EVENT_TYPE_LABELS).slice(0, 3).map(([val, label]) => (
                    <Button 
                      key={val}
                      variant="ghost" 
                      size="sm"
                      onClick={() => setFilterType(val)}
                      className={`rounded-lg px-4 h-9 ${filterType === val ? 'bg-secondary text-primary font-bold' : 'text-muted-foreground hover:text-white'}`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="lg" className="h-16 px-8 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-secondary/20 group">
                  <Plus className="w-6 h-6 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  Nuevo Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-[2rem] card-gradient border-secondary/20 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-secondary/10 to-transparent pointer-events-none" />
                <DialogHeader className="relative z-10 pt-4">
                  <DialogTitle className="text-2xl font-black text-center tracking-tight">Agendar Actividad</DialogTitle>
                  <DialogDescription className="text-center">Organiza el próximo encuentro del grupo</DialogDescription>
                </DialogHeader>
                <div className="relative z-10 space-y-6 py-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Título del Evento</Label>
                      <Input 
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                        placeholder="Ej: Ensayo General" 
                        className="h-12 bg-black/20 border-white/10 rounded-xl"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Hora</Label>
                        <Input 
                          type="time"
                          value={newEvent.event_time}
                          onChange={(e) => setNewEvent({...newEvent, event_time: e.target.value})}
                          className="h-12 bg-black/20 border-white/10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Tipo</Label>
                        <select
                          value={newEvent.event_type}
                          onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value as Event["event_type"] })}
                          className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/20 text-foreground"
                        >
                          {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Ubicación</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                        <Input 
                          value={newEvent.location}
                          onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                          placeholder="Lugar del evento" 
                          className="h-12 pl-10 bg-black/20 border-white/10 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Fecha</Label>
                      <div className="flex justify-center bg-black/20 p-2 rounded-2xl border border-white/5">
                        <Calendar
                          mode="single"
                          selected={newEvent.event_date}
                          onSelect={(date) => date && setNewEvent({ ...newEvent, event_date: date })}
                          className="rounded-xl"
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="relative z-10 pt-2 pb-4">
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-12 font-bold">Cancelar</Button>
                  <Button onClick={handleCreateEvent} className="rounded-xl h-12 bg-secondary text-primary font-black uppercase tracking-widest flex-1 shadow-lg shadow-secondary/10">Publicar Evento</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader />
            <p className="text-muted-foreground font-medium animate-pulse">Sincronizando calendario...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Main Column */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Today Section */}
              {todayEvents.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    <h2 className="text-lg font-black uppercase tracking-widest text-secondary">Hoy</h2>
                  </div>
                  <div className="grid gap-4">
                    {todayEvents.map((event) => (
                      <EventCard key={event.id} event={event} isAdmin={isAdmin} currentUserId={user.id} onDelete={() => setDeleteEventId(event.id)} isToday />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-secondary" />
                    <h2 className="text-lg font-black uppercase tracking-widest text-white">Próximas Actividades</h2>
                  </div>
                  <Badge variant="outline" className="border-white/10 text-muted-foreground">{upcomingEvents.length} eventos</Badge>
                </div>
                
                {upcomingEvents.length === 0 ? (
                  <Card className="p-12 text-center bg-white/5 border-dashed border-white/10 rounded-3xl">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <Info className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-muted-foreground font-medium">No hay eventos próximos programados.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingEvents.map((event) => (
                      <EventCard key={event.id} event={event} isAdmin={isAdmin} currentUserId={user.id} onDelete={() => setDeleteEventId(event.id)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Past Section - Collapsible or small */}
              {pastEvents.length > 0 && (
                <div className="pt-8 opacity-60 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 mb-6">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-lg font-black uppercase tracking-widest text-muted-foreground">Historial Reciente</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {pastEvents.slice(0, 6).map((event) => (
                      <EventCard key={event.id} event={event} isAdmin={isAdmin} currentUserId={user.id} onDelete={() => setDeleteEventId(event.id)} isPast />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="p-6 bg-white/5 border-white/10 rounded-[2rem] shadow-xl overflow-hidden sticky top-24">
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-2xl pointer-events-none" />
                <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-secondary" />
                  Calendario
                </h2>
                <div className="flex justify-center p-2 rounded-2xl bg-black/20 border border-white/5">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={es}
                    modifiers={{ event: eventDates }}
                    modifiersStyles={{
                      event: {
                        fontWeight: "bold",
                        background: "hsl(var(--secondary) / 0.2)",
                        color: "hsl(var(--secondary))",
                        borderRadius: "8px",
                      }
                    }}
                    className="rounded-xl w-full"
                  />
                </div>
                
                <div className="mt-8 space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground px-1">Tipos de Actividad</h3>
                  <div className="grid gap-2">
                    {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${EVENT_TYPE_COLORS[key as keyof typeof EVENT_TYPE_COLORS].split(' ')[0]}`} />
                          <span className="text-sm font-medium text-white/80">{label}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-black/20 border-white/5">
                          {events.filter(e => e.event_type === key).length}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteEventId} onOpenChange={(open) => !open && setDeleteEventId(null)}>
        <AlertDialogContent className="rounded-3xl card-gradient border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-destructive">¿Eliminar evento?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              Esta acción no se puede deshacer. Se notificará la cancelación a los miembros afectados si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl border-white/10 font-bold">Mantener Evento</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteEventId && deleteMutation.mutate(deleteEventId)}
              className="rounded-xl bg-destructive text-white font-black uppercase tracking-widest hover:bg-destructive/90"
            >
              Confirmar Eliminación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const EventCard = ({ event, isAdmin, currentUserId, onDelete, isToday, isPast }: { 
  event: Event, 
  isAdmin: boolean, 
  currentUserId: string, 
  onDelete: () => void,
  isToday?: boolean,
  isPast?: boolean
}) => {
  const date = parseISO(event.event_date);
  const typeColor = EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.otro;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 ${
        isToday 
          ? 'bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/30 shadow-xl shadow-secondary/5 p-6' 
          : isPast
            ? 'bg-white/5 border-white/5 p-4 grayscale-[0.5]'
            : 'bg-white/5 border-white/10 p-5 hover:bg-white/10 hover:border-white/20 shadow-lg'
      }`}
    >
      <div className="flex gap-5">
        {/* Date Box */}
        <div className={`flex flex-col items-center justify-center min-w-[70px] h-[70px] rounded-2xl ${
          isToday 
            ? 'bg-secondary text-primary shadow-lg shadow-secondary/20' 
            : 'bg-white/10 text-white'
        }`}>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{format(date, "MMM", { locale: es })}</span>
          <span className="text-2xl font-black tracking-tighter">{format(date, "d")}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-[0.1em] rounded-lg px-2 py-0 ${typeColor}`}>
                {EVENT_TYPE_LABELS[event.event_type]}
              </Badge>
              <h3 className={`font-black tracking-tight truncate ${isToday ? 'text-2xl text-white' : 'text-lg text-white/90'}`}>
                {event.title}
              </h3>
            </div>
            {(event.created_by === currentUserId || isAdmin) && !isPast && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {event.description && !isPast && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{event.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-secondary/60" />
              {format(date, "HH:mm")} hs
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground truncate">
                <MapPin className="w-3.5 h-3.5 text-secondary/60 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isToday && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/20 border border-secondary/30">
            <div className="w-2 h-2 rounded-full bg-secondary animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-secondary">En curso</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Eventos;
