import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, BookOpen, Users, MessageSquare, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpTooltip } from './HelpTooltip';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

export function CreateSetlistDialog({ 
  open, 
  onOpenChange, 
  onCreated, 
  userId 
}: CreateSetlistDialogProps) {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    theme_verse: '',
    service_director: '',
    preacher: '',
    event_id: '',
  });

  useEffect(() => {
    if (open) {
      fetchEvents();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !date) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
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
        })
        .select('id')
        .single();

      if (error) throw error;
      
      onCreated(data.id);
      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        theme_verse: '',
        service_director: '',
        preacher: '',
        event_id: '',
      });
    } catch (error) {
      console.error('Error creating setlist:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Nuevo Repertorio
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo repertorio para tu servicio de adoración
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Título */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="title">Título del Repertorio *</Label>
              <HelpTooltip 
                title="Título del Repertorio"
                description="Un nombre descriptivo para identificar este servicio."
                example="Culto Dominical 23 de Noviembre"
              />
            </div>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ej: Culto Dominical"
              required
            />
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Label>Fecha del Servicio *</Label>
              <HelpTooltip 
                title="Fecha del Servicio"
                description="La fecha en que se llevará a cabo el culto o evento."
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Selecciona una fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Versículo Temático */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="theme_verse" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Versículo Temático
              </Label>
              <HelpTooltip 
                title="Versículo Temático"
                description="El versículo bíblico que guiará el tema del culto. Aparecerá destacado en la vista del repertorio."
                example="Hechos 3:6 - Mas Pedro dijo: No tengo plata ni oro..."
              />
            </div>
            <Textarea
              id="theme_verse"
              value={formData.theme_verse}
              onChange={(e) => setFormData(prev => ({ ...prev, theme_verse: e.target.value }))}
              placeholder="Ej: Hechos 3:6 - Mas Pedro dijo: No tengo plata ni oro..."
              rows={2}
            />
          </div>

          {/* Director de Culto */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="service_director" className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Dirección de Culto
              </Label>
              <HelpTooltip 
                title="Dirección de Culto"
                description="La persona que estará dirigiendo el servicio."
                example="Pastora Karina Andrada"
              />
            </div>
            <Input
              id="service_director"
              value={formData.service_director}
              onChange={(e) => setFormData(prev => ({ ...prev, service_director: e.target.value }))}
              placeholder="Ej: Pastora Karina Andrada"
            />
          </div>

          {/* Predicador */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="preacher" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Comparte la Palabra
              </Label>
              <HelpTooltip 
                title="Comparte la Palabra"
                description="La persona encargada de predicar el mensaje."
                example="Pastor Juan Benegas"
              />
            </div>
            <Input
              id="preacher"
              value={formData.preacher}
              onChange={(e) => setFormData(prev => ({ ...prev, preacher: e.target.value }))}
              placeholder="Ej: Pastor Juan Benegas"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Notas adicionales sobre este servicio..."
              rows={2}
            />
          </div>

          {/* Evento vinculado */}
          {events.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>Vincular a Evento</Label>
                <HelpTooltip 
                  title="Vincular a Evento"
                  description="Si este repertorio corresponde a un evento específico del calendario, puedes vincularlo aquí."
                />
              </div>
              <Select 
                value={formData.event_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, event_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar evento (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} - {format(new Date(event.event_date), 'dd/MM/yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.title.trim()}
              className="flex-1"
            >
              {loading ? 'Creando...' : 'Crear Repertorio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
