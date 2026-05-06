import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, Sparkles, HelpCircle, 
  ListMusic, Clock, CheckCircle2, FileEdit, Music, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Skeleton } from '@/components/ui/skeleton';
import { FloatingActionButton } from '@/components/ui/fab';
import { vibrateLight } from '@/utils/haptics';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { SetlistCard } from '@/components/repertorios/SetlistCard';
import { CreateSetlistDialog } from '@/components/repertorios/CreateSetlistDialog';
import { Setlist } from '@/components/repertorios/types';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SetlistWithCount extends Setlist {
  songsCount: number;
}

const filterTabs = [
  { id: 'all', label: 'Todos', icon: ListMusic },
  { id: 'draft', label: 'Borrador', icon: FileEdit },
  { id: 'ready', label: 'Listos', icon: CheckCircle2 },
  { id: 'completed', label: 'Pasados', icon: Clock },
];

const Repertorios = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLeader } = useUserRole();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [setlistToDelete, setSetlistToDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const { data: setlists = [], isLoading: loading } = useQuery({
    queryKey: ['setlists', activeTab, page],
    queryFn: async () => {
      let query = supabase
        .from('setlists')
        .select(`
          *,
          setlist_songs (count),
          service_feedback (rating)
        `)
        .order('service_date', { ascending: false })
        .limit(page * ITEMS_PER_PAGE);

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data: setlistsData, error } = await query;

      if (error) throw error;

      return (setlistsData || []).map(item => {
        const feedbacks = (item.service_feedback as any[]) || [];
        const avgRating = feedbacks.length > 0 
          ? feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length 
          : undefined;

        return {
          ...item,
          status: (item.status as 'draft' | 'ready' | 'completed') || 'draft',
          songsCount: (item.setlist_songs as any)?.[0]?.count || 0,
          avgRating
        };
      }) as (SetlistWithCount & { avgRating?: number })[];
    },
    enabled: !!user,
  });

  const handleStartLive = async (setlist: Setlist) => {
    try {
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

      if (!isLeader) {
        toast.error('Solo los líderes pueden iniciar un servicio en vivo.');
        return;
      }

      if (setlist.songsCount === 0) {
        toast.error('El repertorio no tiene canciones. Agrega al menos una canción antes de iniciar.');
        return;
      }

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
      
      try {
        await notificationService.notifyAnnouncement(
          'Culto en vivo iniciado',
          `El servicio "${setlist.title}" ha comenzado en vivo. ¡Únete ahora!`,
          'high'
        );
      } catch (e) {
        console.error('Error al enviar notificacion', e);
      }
      
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

  const handleDeleteSetlist = (id: string) => {
    setSetlistToDelete(id);
  };

  const confirmDelete = () => {
    if (setlistToDelete) {
      deleteMutation.mutate(setlistToDelete);
      setSetlistToDelete(null);
    }
  };

  // setlists ya están filtrados por el servidor según el tab activo
  const filteredSetlists = setlists;

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
      <main className="flex-1 pt-24 pb-20 px-4 safe-top safe-bottom w-full">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
          >
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                  Repertorios
                </h1>
                <button
                  onClick={() => setHelpDialogOpen(true)}
                  className="text-muted-foreground/50 hover:text-secondary transition-colors p-1"
                  aria-label="Ayuda sobre repertorios"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Organiza y gestiona los servicios musicales
              </p>
            </div>
            
            <Button
              onClick={() => {
                vibrateLight();
                setCreateDialogOpen(true);
              }}
              className="hidden sm:flex h-12 px-6 rounded-xl bg-secondary text-primary-foreground hover:opacity-90 font-bold text-sm gap-2 shadow-lg shadow-secondary/20 active:scale-[0.97] transition-all"
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
              <h2 className="text-xs uppercase tracking-widest font-bold mb-3 text-muted-foreground/60 px-1">
                Próximos Servicios
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar -mx-1 px-1">
                {upcomingSetlists.map(setlist => (
                  <Card 
                    key={setlist.id}
                    className="shrink-0 w-60 cursor-pointer rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-secondary/30 transition-all duration-300 active:scale-[0.98]"
                    onClick={() => navigate(`/repertorios/${setlist.id}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-secondary" />
                        <span className="text-xs font-bold text-secondary capitalize">
                          {format(new Date(setlist.service_date), "EEEE d", { locale: es })}
                        </span>
                      </div>
                      <p className="font-semibold text-lg text-foreground truncate mb-1">
                        {setlist.title}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {setlist.songsCount} canciones
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Filter Tabs - Mobile optimized */}
          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
            {filterTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all active:scale-[0.97] ${
                    isActive
                      ? 'bg-secondary text-primary-foreground shadow-lg shadow-secondary/20'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* List */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="rounded-2xl border-white/10 bg-white/[0.03] p-6 h-[180px] overflow-hidden">
                  <div className="flex flex-col h-full gap-4">
                    <div className="flex justify-between">
                      <Skeleton className="w-24 h-6 rounded-full bg-white/5" />
                      <Skeleton className="w-8 h-8 rounded-full bg-white/5" />
                    </div>
                    <div className="space-y-2 mt-auto">
                      <Skeleton className="h-7 w-3/4 bg-white/5" />
                      <Skeleton className="h-4 w-1/2 bg-white/5" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredSetlists.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Sparkles className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-foreground">
                {activeTab === 'all' 
                  ? 'No hay repertorios aún' 
                  : `No hay repertorios "${filterTabs.find(t => t.id === activeTab)?.label}"`}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Crea tu primer repertorio para organizar las canciones del próximo servicio
              </p>
              <Button 
                onClick={() => setCreateDialogOpen(true)} 
                className="gap-2 bg-secondary text-primary-foreground hover:bg-secondary/90 h-12 px-6 rounded-xl font-bold"
              >
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
                      avgRating={(setlist as any).avgRating}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Load More Button */}
          {!loading && filteredSetlists.length >= page * ITEMS_PER_PAGE && (
            <div className="mt-8 flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => setPage(p => p + 1)}
                className="rounded-xl border-white/10 hover:bg-white/5 font-bold px-8"
              >
                Cargar más
              </Button>
            </div>
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
            <DialogTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="h-5 w-5 text-secondary" />
              ¿Cómo usar los Repertorios?
            </DialogTitle>
            <DialogDescription>
              Sistema completo para organizar tus servicios de adoración
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 mt-4">
            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-xl bg-secondary/15 shrink-0">
                <Plus className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-1">Crear Repertorio</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Define el título, fecha, versículo temático, director del culto y predicador.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-xl bg-secondary/15 shrink-0">
                <ListMusic className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-1">Agregar Canciones</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Organiza las canciones según el flujo del culto: Alabanza, Adoración, Ofrenda, Ministración, etc.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-xl bg-secondary/15 shrink-0">
                <Play className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-1">Modo En Vivo</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sincroniza las letras en tiempo real con todo el equipo durante el servicio.
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setHelpDialogOpen(false)} 
            className="mt-4 w-full h-12 rounded-xl bg-secondary text-primary-foreground hover:bg-secondary/90 font-bold"
          >
            ¡Entendido!
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!setlistToDelete} onOpenChange={(open) => !open && setSetlistToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El repertorio será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FloatingActionButton 
        icon={<Plus className="h-6 w-6" />}
        label="Nuevo Repertorio"
        onClick={() => setCreateDialogOpen(true)}
      />
    </>
  );
};

export default Repertorios;
