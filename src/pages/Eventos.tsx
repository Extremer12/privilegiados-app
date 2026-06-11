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
        
        {/* Minimalist Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight mb-1">Eventos</h1>
            <p className="text-muted-foreground text-sm">Organización y coordinación del grupo</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative group flex-1 md:min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-secondary transition-colors" />
              <Input 
                placeholder="Buscar eventos..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50 border-border rounded-xl h-10 text-sm focus:ring-secondary/20"
              />
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm" className="h-10 px-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-secondary/10 shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px] rounded-3xl bg-card border-border shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Nuevo Evento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Título</Label>
                    <Input 
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                      placeholder="Ej: Ensayo General" 
                      className="bg-muted/50 border-border rounded-xl"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Hora</Label>
                      <Input 
                        type="time"
                        value={newEvent.event_time}
                        onChange={(e) => setNewEvent({...newEvent, event_time: e.target.value})}
                        className="bg-muted/50 border-border rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo</Label>
                      <select
                        value={newEvent.event_type}
                        onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value as Event["event_type"] })}
                        className="w-full h-10 px-3 rounded-xl border border-border bg-muted/50 text-sm"
                      >
                        {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value} className="bg-card">{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ubicación</Label>
                    <Input 
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                      placeholder="Lugar" 
                      className="bg-muted/50 border-border rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha</Label>
                    <div className="flex justify-center bg-muted/50 p-2 rounded-2xl border border-border">
                      <Calendar
                        mode="single"
                        selected={newEvent.event_date}
                        onSelect={(date) => date && setNewEvent({ ...newEvent, event_date: date })}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl text-xs font-bold">Cancelar</Button>
                  <Button onClick={handleCreateEvent} className="rounded-xl bg-secondary text-primary font-bold text-xs">Publicar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Categories / Filter Pills - Minimal */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFilterType("todos")}
            className={`rounded-full px-4 h-8 text-[11px] font-bold uppercase tracking-wider transition-all ${filterType === 'todos' ? 'bg-secondary text-primary shadow-lg shadow-secondary/10' : 'bg-muted text-muted-foreground border border-border'}`}
          >
            Todos
          </Button>
          {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
            <Button 
              key={val}
              variant="ghost" 
              size="sm"
              onClick={() => setFilterType(val)}
              className={`rounded-full px-4 h-8 text-[11px] font-bold uppercase tracking-wider transition-all ${filterType === val ? 'bg-secondary text-primary shadow-lg shadow-secondary/10' : 'bg-muted text-muted-foreground border border-border'}`}
            >
              {label}
            </Button>
          ))}
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
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-secondary">Hoy</h2>
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Próximas Actividades</h2>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground/40">{upcomingEvents.length} total</span>
                </div>
                
                {upcomingEvents.length === 0 ? (
                  <Card className="p-12 text-center bg-muted/50 border-dashed border-border rounded-3xl">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
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
              <Card className="p-6 bg-card border-border rounded-[2rem] shadow-xl overflow-hidden sticky top-24">
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-2xl pointer-events-none" />
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-secondary" />
                  Calendario
                </h2>
                <div className="flex justify-center p-2 rounded-2xl bg-muted/50 border border-border">
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
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${EVENT_TYPE_COLORS[key as keyof typeof EVENT_TYPE_COLORS].split(' ')[0]}`} />
                          <span className="text-sm font-medium text-foreground/80">{label}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-muted border-border">
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
            <AlertDialogCancel className="rounded-xl border-border font-bold">Mantener Evento</AlertDialogCancel>
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isToday 
          ? 'bg-secondary/10 border-secondary/20 p-5' 
          : isPast
            ? 'bg-muted/50 border-border p-4 opacity-50'
            : 'bg-card border-border p-4 hover:bg-muted/50 hover:border-border'
      }`}
    >
      <div className="flex gap-4">
        {/* Date Box - Compact */}
        <div className={`flex flex-col items-center justify-center min-w-[50px] h-[50px] rounded-xl ${
          isToday 
            ? 'bg-secondary text-primary' 
            : 'bg-muted text-muted-foreground'
        }`}>
          <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{format(date, "MMM", { locale: es })}</span>
          <span className="text-lg font-black tracking-tighter">{format(date, "d")}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase tracking-wider ${isToday ? 'text-secondary' : 'text-muted-foreground'}`}>
                  {EVENT_TYPE_LABELS[event.event_type]}
                </span>
                {isToday && <span className="w-1 h-1 rounded-full bg-secondary animate-pulse" />}
              </div>
              <h3 className="font-bold text-sm text-foreground tracking-tight truncate">
                {event.title}
              </h3>
            </div>
            {(event.created_by === currentUserId || isAdmin) && !isPast && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 h-7 w-7 rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60">
              <Clock className="w-3 h-3" />
              {format(date, "HH:mm")}
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 truncate">
                <MapPin className="w-3 h-3" />
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
