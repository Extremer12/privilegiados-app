import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Calendar as CalendarIcon, MapPin, Clock, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
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

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  created_by: string;
  created_at: string;
  songs_to_practice: string[] | null;
  event_type: "ensayo" | "presentacion" | "reunion" | "servicio" | "otro";
}

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("todos");
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    location: "",
    event_date: new Date(),
    event_type: "otro" as Event["event_type"],
  });

  useEffect(() => {
    if (user) {
      fetchEvents();
      requestNotificationPermission();
      checkUpcomingEvents();
    }
  }, [user]);

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const checkUpcomingEvents = async () => {
    if (!user) return;

    const { data: todayEvents } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString().split("T")[0])
      .lte("event_date", new Date(new Date().setHours(23, 59, 59)).toISOString());

    if (todayEvents && todayEvents.length > 0 && Notification.permission === "granted") {
      todayEvents.forEach((event) => {
        new Notification("Evento Hoy", {
          body: `${event.title} - ${event.location || "Sin ubicación"}`,
          icon: "/logo.jpg",
        });
      });
    }
  };

  const fetchEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los eventos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!user || !newEvent.title) {
      toast({
        title: "Error",
        description: "El título es requerido",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: newEventData, error } = await supabase.from("events").insert({
        title: newEvent.title,
        description: newEvent.description || null,
        location: newEvent.location || null,
        event_date: newEvent.event_date.toISOString(),
        event_type: newEvent.event_type,
        created_by: user.id,
      }).select('id').single();

      if (error) throw error;

      toast({
        title: "Evento creado",
        description: "El evento se ha creado exitosamente",
      });

      // Send push notification about the new event
      if (newEventData) {
        const eventDateStr = format(newEvent.event_date, "d 'de' MMMM 'a las' HH:mm", { locale: es });
        notificationService.notifyEventReminder(newEvent.title, eventDateStr, newEventData.id);
      }

      setIsDialogOpen(false);
      setNewEvent({
        title: "",
        description: "",
        location: "",
        event_date: new Date(),
        event_type: "otro",
      });
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el evento",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventId || !user) return;
    
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", deleteEventId);

      if (error) {
        console.error("Supabase delete error:", error);
        throw error;
      }

      toast({
        title: "Evento eliminado",
        description: "El evento se ha eliminado exitosamente",
      });

      setDeleteEventId(null);
      fetchEvents();
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el evento. Verifica que seas el creador.",
        variant: "destructive",
      });
    }
  };

  // Unused function - kept for potential future use
  const _getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(parseISO(event.event_date), date));
  };

  const filteredEvents = filterType === "todos" 
    ? events 
    : events.filter((event) => event.event_type === filterType);

  const selectedDateEvents = selectedDate 
    ? filteredEvents.filter((event) => isSameDay(parseISO(event.event_date), selectedDate))
    : [];
  
  const eventDates = events.map((event) => parseISO(event.event_date));

  if (!user) {
    return (
    <>
      <main className="flex-1 flex items-center justify-center px-4 pt-20 w-full">
          <Card className="max-w-md w-full p-8 card-gradient border-secondary/20 text-center">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-secondary" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Acceso Restringido
            </h2>
            <p className="text-muted-foreground">
              Debes iniciar sesión para ver los eventos
            </p>
          </Card>
        </main>
      
    </>
  );
  }

  return (
    <>
      <main className="flex-1 pt-20 pb-24 px-4 safe-top safe-bottom w-full">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <Card variant="premium" className="p-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">Eventos</h1>
                    <p className="text-muted-foreground">
                      Gestiona y consulta los eventos del grupo
                    </p>
                  </div>
                </div>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" size="lg" className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Crear Evento
                  </Button>
                </DialogTrigger>
                <DialogContent className="card-gradient border-secondary/20 max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl text-foreground">Nuevo Evento</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Crea un nuevo evento para el grupo
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5">
                    <div>
                      <Label htmlFor="title" className="text-base">Título *</Label>
                      <Input
                        id="title"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        placeholder="Nombre del evento"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description" className="text-base">Descripción</Label>
                      <Textarea
                        id="description"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        placeholder="Detalles del evento"
                        rows={3}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="location" className="text-base">Ubicación</Label>
                      <Input
                        id="location"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        placeholder="Lugar del evento"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="event_type" className="text-base">Tipo de Evento *</Label>
                      <select
                        id="event_type"
                        value={newEvent.event_type}
                        onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value as Event["event_type"] })}
                        className="w-full mt-2 px-4 py-3 rounded-xl border border-border bg-background text-foreground text-base"
                      >
                        {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-base">Fecha del Evento *</Label>
                      <div className="mt-2 flex justify-center">
                        <Calendar
                          mode="single"
                          selected={newEvent.event_date}
                          onSelect={(date) => date && setNewEvent({ ...newEvent, event_date: date })}
                          className="rounded-xl border border-border bg-background/50"
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </div>
                    </div>
                    <Button onClick={handleCreateEvent} className="w-full" variant="hero" size="lg">
                      Crear Evento
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          {/* Filters */}
          <Card variant="action" className="p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground mb-3 font-medium">Filtrar por tipo:</p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={filterType === "todos" ? "hero" : "outline"}
                size="default"
                onClick={() => setFilterType("todos")}
              >
                Todos
              </Button>
              {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                <Button
                  key={value}
                  variant={filterType === value ? "hero" : "outline"}
                  size="default"
                  onClick={() => setFilterType(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </Card>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Calendar */}
              <Card variant="premium" className="p-6 animate-fade-in">
                <h2 className="text-xl font-bold text-foreground mb-6 text-center">Calendario</h2>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-xl"
                    locale={es}
                    modifiers={{
                      event: eventDates,
                    }}
                    modifiersStyles={{
                      event: {
                        fontWeight: "bold",
                        background: "hsl(48 100% 50% / 0.2)",
                        color: "hsl(48 100% 50%)",
                        borderRadius: "8px",
                      },
                    }}
                  />
                </div>
                <div className="mt-6 flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-secondary/20 border-2 border-secondary/40"></div>
                    <span className="text-muted-foreground">Hoy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-secondary"></div>
                    <span className="text-muted-foreground">Seleccionado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-secondary/20"></div>
                    <span className="text-muted-foreground">Con eventos</span>
                  </div>
                </div>
              </Card>

              {/* Events List */}
              <Card variant="premium" className="p-6 animate-fade-in">
                <h2 className="text-xl font-bold text-foreground mb-6">
                  {selectedDate
                    ? `Eventos - ${format(selectedDate, "d 'de' MMMM", { locale: es })}`
                    : "Selecciona una fecha"}
                </h2>

                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-secondary/10 flex items-center justify-center">
                      <CalendarIcon className="w-10 h-10 text-secondary/50" />
                    </div>
                    <p className="text-lg text-muted-foreground">
                      No hay eventos para esta fecha
                    </p>
                    <p className="text-sm text-muted-foreground/70 mt-2">
                      Selecciona otra fecha o crea un nuevo evento
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDateEvents.map((event) => (
                      <Card
                        key={event.id}
                        variant="action"
                        className="p-5"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center flex-wrap gap-2 mb-3">
                              <h3 className="text-lg font-semibold text-foreground">
                                {event.title}
                              </h3>
                              <span className={`text-xs px-3 py-1 rounded-full border font-medium ${EVENT_TYPE_COLORS[event.event_type]}`}>
                                {EVENT_TYPE_LABELS[event.event_type]}
                              </span>
                            </div>
                            {event.description && (
                              <p className="text-base text-muted-foreground mb-3">
                                {event.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-4">
                              {event.location && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="w-4 h-4 text-secondary/70" />
                                  {event.location}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 text-secondary/70" />
                                {format(parseISO(event.event_date), "HH:mm", { locale: es })}
                              </div>
                            </div>
                          </div>
                        {(event.created_by === user.id || isAdmin) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteEventId(event.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>

              {/* All Upcoming Events */}
              <Card variant="premium" className="p-6 lg:col-span-2 animate-fade-in">
                <h2 className="text-xl font-bold text-foreground mb-6">
                  Próximos Eventos
                </h2>
                {events.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-secondary/10 flex items-center justify-center">
                      <CalendarIcon className="w-10 h-10 text-secondary/50" />
                    </div>
                    <p className="text-lg text-muted-foreground">
                      No hay eventos programados
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredEvents.map((event) => (
                      <Card
                        key={event.id}
                        variant="action"
                        className="p-5 group relative"
                      >
                        <div 
                          className="flex gap-4 cursor-pointer"
                          onClick={() => setSelectedDate(parseISO(event.event_date))}
                        >
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-secondary/30 to-secondary/10 flex flex-col items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                            <span className="text-xs text-secondary font-semibold uppercase">
                              {format(parseISO(event.event_date), "MMM", { locale: es })}
                            </span>
                            <span className="text-2xl font-bold text-secondary">
                              {format(parseISO(event.event_date), "d")}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-2">
                              <h3 className="font-bold text-foreground text-base truncate">
                                {event.title}
                              </h3>
                            </div>
                            <span className={`inline-block text-xs px-3 py-1 rounded-full border font-medium mb-2 ${EVENT_TYPE_COLORS[event.event_type]}`}>
                              {EVENT_TYPE_LABELS[event.event_type]}
                            </span>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-secondary/60" />
                                {format(parseISO(event.event_date), "HH:mm")}
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-1 truncate">
                                  <MapPin className="w-4 h-4 text-secondary/60 flex-shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Delete button - always visible on mobile, hover on desktop */}
                        {(event.created_by === user.id || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteEventId(event.id);
                            }}
                            className="absolute top-3 right-3 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEventId} onOpenChange={(open) => !open && setDeleteEventId(null)}>
        <AlertDialogContent className="card-gradient border-secondary/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">¿Eliminar evento?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta acción no se puede deshacer. El evento será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Eventos;
