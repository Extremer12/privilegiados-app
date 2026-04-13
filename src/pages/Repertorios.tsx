import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, Music2, Calendar, Sparkles, HelpCircle, Filter, 
  ListMusic, Clock, CheckCircle2, FileEdit, Music, Play, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SetlistCard } from '@/components/repertorios/SetlistCard';
import { CreateSetlistDialog } from '@/components/repertorios/CreateSetlistDialog';
import { HelpTooltip } from '@/components/repertorios/HelpTooltip';
import { Setlist } from '@/components/repertorios/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SetlistWithCount extends Setlist {
  songsCount: number;
}

const Repertorios = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [setlists, setSetlists] = useState<SetlistWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user) {
      fetchSetlists();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSetlists = async () => {
    try {
      const { data: setlistsData, error } = await supabase
        .from('setlists')
        .select(`
          *,
          setlist_songs (count)
        `)
        .order('service_date', { ascending: false });

      if (error) throw error;

      const formattedSetlists: SetlistWithCount[] = (setlistsData || []).map(item => ({
        ...item,
        status: (item.status as 'draft' | 'ready' | 'completed') || 'draft',
        songsCount: (item.setlist_songs as any)?.[0]?.count || 0,
      }));

      setSetlists(formattedSetlists);
    } catch (error) {
      console.error('Error fetching setlists:', error);
      toast.error('Error al cargar los repertorios');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLive = async (setlist: Setlist) => {
    try {
      // Check for existing active session
      const { data: existingSession } = await supabase
        .from('live_sessions')
        .select('id')
        .eq('setlist_id', setlist.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingSession) {
        navigate(`/en-vivo/${existingSession.id}`);
        return;
      }

      // Create new session
      const { data: newSession, error } = await supabase
        .from('live_sessions')
        .insert({
          setlist_id: setlist.id,
          created_by: user?.id,
          is_active: true,
          current_position: 0,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;
      
      navigate(`/en-vivo/${newSession.id}`);
    } catch (error) {
      console.error('Error starting live session:', error);
      toast.error('Error al iniciar la sesión en vivo');
    }
  };

  const handleDeleteSetlist = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este repertorio?')) return;
    
    try {
      const { error } = await supabase
        .from('setlists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSetlists(prev => prev.filter(s => s.id !== id));
      toast.success('Repertorio eliminado');
    } catch (error) {
      console.error('Error deleting setlist:', error);
      toast.error('Error al eliminar el repertorio');
    }
  };

  const filteredSetlists = setlists.filter(setlist => {
    if (activeTab === 'all') return true;
    return setlist.status === activeTab;
  });

  const upcomingSetlists = setlists.filter(
    s => new Date(s.service_date) >= new Date()
  ).slice(0, 3);

  if (!user) {
    return (
    <>
      <main className="flex-1 flex items-center justify-center px-4 pt-20 w-full">
          <Card className="max-w-md w-full p-8 card-gradient border-secondary/20 text-center">
            <Music className="w-16 h-16 mx-auto mb-4 text-secondary" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Acceso Restringido
            </h2>
            <p className="text-muted-foreground">
              Debes iniciar sesión para gestionar repertorios
            </p>
          </Card>
        </main>
      
    </>
  );
  }

  return (
    <>
      <main className="flex-1 pt-20 pb-20 px-4 safe-top safe-bottom w-full">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-secondary/20">
                  <ListMusic className="h-6 w-6 text-secondary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">Repertorios</h1>
                <button
                  onClick={() => setHelpDialogOpen(true)}
                  className="text-muted-foreground hover:text-secondary transition-colors"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              </div>
              <p className="text-muted-foreground mt-1">
                Organiza y gestiona los repertorios para tus servicios
              </p>
            </div>
            
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2 bg-gradient-to-r from-secondary to-accent hover:opacity-90 text-primary-foreground"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              Nuevo Repertorio
            </Button>
          </motion.div>

          {/* Próximos servicios */}
          {upcomingSetlists.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-foreground">
                <Calendar className="h-5 w-5 text-secondary" />
                Próximos Servicios
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {upcomingSetlists.map(setlist => (
                  <Card 
                    key={setlist.id}
                    className="shrink-0 w-64 cursor-pointer card-gradient border-secondary/20 hover:border-secondary/40 transition-colors"
                    onClick={() => navigate(`/repertorios/${setlist.id}`)}
                  >
                    <CardContent className="p-4">
                      <Badge className="mb-2 bg-secondary/20 text-secondary">
                        {format(new Date(setlist.service_date), "EEEE d", { locale: es })}
                      </Badge>
                      <p className="font-semibold truncate text-foreground">{setlist.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {setlist.songsCount} canciones
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Filtros */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-4 max-w-md bg-secondary/10">
              <TabsTrigger value="all" className="gap-1 data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
                <ListMusic className="h-4 w-4" />
                Todos
              </TabsTrigger>
              <TabsTrigger value="draft" className="gap-1 data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
                <FileEdit className="h-4 w-4" />
                Borrador
              </TabsTrigger>
              <TabsTrigger value="ready" className="gap-1 data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Listos
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1 data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
                <Clock className="h-4 w-4" />
                Pasados
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Lista de repertorios */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader />
            </div>
          ) : filteredSetlists.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {activeTab === 'all' 
                  ? 'No hay repertorios aún' 
                  : `No hay repertorios en estado "${activeTab}"`}
              </h3>
              <p className="text-muted-foreground mb-6">
                Crea tu primer repertorio para organizar las canciones del próximo servicio
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 bg-secondary text-primary-foreground hover:bg-secondary/90">
                <Plus className="h-4 w-4" />
                Crear Repertorio
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence>
                {filteredSetlists.map((setlist, index) => (
                  <motion.div
                    key={setlist.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <SetlistCard
                      setlist={setlist}
                      songsCount={setlist.songsCount}
                      onView={() => navigate(`/repertorios/${setlist.id}`)}
                      onStartLive={() => handleStartLive(setlist)}
                      onDelete={() => handleDeleteSetlist(setlist.id)}
                      isOwner={setlist.created_by === user?.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      {/* Create Dialog */}
      <CreateSetlistDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(id) => {
          fetchSetlists();
          navigate(`/repertorios/${id}`);
        }}
        userId={user?.id || ''}
      />

      {/* Help Dialog */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-secondary" />
              ¿Cómo usar los Repertorios?
            </DialogTitle>
            <DialogDescription>
              Sistema completo para organizar tus servicios de adoración
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-secondary/20 h-fit">
                <Plus className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Crear Repertorio</h4>
                <p className="text-sm text-muted-foreground">
                  Define el título, fecha, versículo temático, director del culto y predicador.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-secondary/20 h-fit">
                <ListMusic className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Agregar Canciones por Sección</h4>
                <p className="text-sm text-muted-foreground">
                  Organiza las canciones según el flujo del culto: Alabanza, Adoración, Ofrenda, Ministración, etc.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-secondary/20 h-fit">
                <Play className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Modo En Vivo</h4>
                <p className="text-sm text-muted-foreground">
                  Sincroniza las letras en tiempo real con todo el equipo durante el servicio.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={() => setHelpDialogOpen(false)} className="mt-4 bg-secondary text-primary-foreground hover:bg-secondary/90">
            ¡Entendido!
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Repertorios;
