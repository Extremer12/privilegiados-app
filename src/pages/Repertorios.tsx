import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const { data: setlists = [], isLoading: loading } = useQuery({
    queryKey: ['setlists'],
    queryFn: async () => {
      const { data: setlistsData, error } = await supabase
        .from('setlists')
        .select(`
          *,
          setlist_songs (count)
        `)
        .order('service_date', { ascending: false });

      if (error) throw error;

      return (setlistsData || []).map(item => ({
        ...item,
        status: (item.status as 'draft' | 'ready' | 'completed') || 'draft',
        songsCount: (item.setlist_songs as any)?.[0]?.count || 0,
      })) as SetlistWithCount[];
    },
    enabled: !!user,
  });

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('setlists').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast.success('Repertorio eliminado');
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
    },
    onError: (error) => {
      console.error('Error deleting setlist:', error);
      toast.error('Error al eliminar el repertorio');
    }
  });

  const handleDeleteSetlist = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este repertorio?')) return;
    deleteMutation.mutate(id);
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
          {/* Header Editorial */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 px-2"
          >
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl md:text-5xl font-extralight tracking-elegant text-foreground">
                  REPERTORIOS
                </h1>
                <button
                  onClick={() => setHelpDialogOpen(true)}
                  className="text-muted-foreground/30 hover:text-secondary transition-colors"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium mt-3">
                Gestión y organización de servicios musicales
              </p>
            </div>
            
            <Button
              onClick={() => setCreateDialogOpen(true)}
              variant="outline"
              size="lg"
              className="squircle-sm border-white/[0.05] bg-white/[0.02] hover:bg-secondary hover:text-primary-foreground hover:border-secondary transition-all duration-300 gap-2"
            >
              <Plus className="h-5 w-5" />
              Nuevo Repertorio
            </Button>
          </motion.div>

          {/* Próximos servicios - Squircle Cards */}
          {upcomingSetlists.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-12"
            >
              <h2 className="text-[10px] uppercase tracking-widest font-bold mb-4 text-muted-foreground/40 flex items-center gap-2 px-2">
                Próximos Servicios
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {upcomingSetlists.map(setlist => (
                  <Card 
                    key={setlist.id}
                    className="shrink-0 w-64 cursor-pointer squircle border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05] hover:border-secondary/20 transition-all duration-500 shadow-2xl shadow-black/20"
                    onClick={() => navigate(`/repertorios/${setlist.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                          {format(new Date(setlist.service_date), "EEEE d", { locale: es })}
                        </span>
                      </div>
                      <p className="font-light text-xl tracking-tight text-foreground truncate mb-1">
                        {setlist.title}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/40 font-medium">
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
          queryClient.invalidateQueries({ queryKey: ['setlists'] });
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
    </>
  );
};

export default Repertorios;
