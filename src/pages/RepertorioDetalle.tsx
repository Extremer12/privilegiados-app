import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Edit3, Save, Play, BookOpen, Users, MessageSquare,
  Calendar, Music2, CheckCircle2, AlertCircle, Sparkles, FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/ui/loader';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ServiceStructureView } from '@/components/repertorios/ServiceStructureView';
import { AddSongToSetlistDialog } from '@/components/repertorios/AddSongToSetlistDialog';
import { HelpTooltip } from '@/components/repertorios/HelpTooltip';
import { Setlist, SetlistSong, SECTION_TYPES, SectionType } from '@/components/repertorios/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const RepertorioDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [addSongDialogOpen, setAddSongDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionType>('alabanza');

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    theme_verse: '',
    service_director: '',
    preacher: '',
    status: 'draft' as 'draft' | 'ready' | 'completed',
  });

  const { data, isLoading: loading } = useQuery({
    queryKey: ['setlist_detail', id],
    queryFn: async () => {
      // Fetch setlist
      const { data: setlistData, error: setlistError } = await supabase
        .from('setlists')
        .select('*')
        .eq('id', id)
        .single();
      if (setlistError) throw setlistError;
      
      const formattedSetlist: Setlist = {
        ...setlistData,
        status: (setlistData.status as 'draft' | 'ready' | 'completed') || 'draft',
      };

      // Fetch songs with song details
      const { data: songsData, error: songsError } = await supabase
        .from('setlist_songs')
        .select(`
          *,
          songs (id, title, category, lyrics, chords, youtube_url)
        `)
        .eq('setlist_id', id)
        .order('position');
      if (songsError) throw songsError;
      
      const formattedSongs = (songsData || []).map(s => ({
        ...s,
        section: s.section || 'alabanza',
      })) as SetlistSong[];

      return { setlist: formattedSetlist, songs: formattedSongs };
    },
    enabled: !!id && !!user,
  });

  const setlist = data?.setlist || null;
  const songs = data?.songs || [];

  useEffect(() => {
    if (setlist) {
      setEditForm({
        title: setlist.title,
        description: setlist.description || '',
        theme_verse: setlist.theme_verse || '',
        service_director: setlist.service_director || '',
        preacher: setlist.preacher || '',
        status: setlist.status,
      });
    }
  }, [setlist]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('setlists')
        .update({
          title: editForm.title,
          description: editForm.description || null,
          theme_verse: editForm.theme_verse || null,
          service_director: editForm.service_director || null,
          preacher: editForm.preacher || null,
          status: editForm.status,
        })
        .eq('id', setlist!.id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      setIsEditing(false);
      toast.success('Repertorio actualizado');
      queryClient.invalidateQueries({ queryKey: ['setlist_detail', id] });
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
    },
    onError: (error) => {
      console.error('Error saving:', error);
      toast.error('Error al guardar');
    }
  });

  const handleSave = async () => {
    if (!setlist) return;
    saveMutation.mutate();
  };

  const removeSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      const { error } = await supabase
        .from('setlist_songs')
        .delete()
        .eq('id', songId);

      if (error) throw error;
      return songId;
    },
    onSuccess: () => {
      toast.success('Canción removida');
      queryClient.invalidateQueries({ queryKey: ['setlist_detail', id] });
    },
    onError: (error) => {
      console.error('Error removing song:', error);
      toast.error('Error al remover la canción');
    }
  });

  const handleRemoveSong = async (songId: string) => {
    removeSongMutation.mutate(songId);
  };

  const handleStartLive = async () => {
    if (!setlist) return;
    
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
      console.error('Error starting live:', error);
      toast.error('Error al iniciar sesión en vivo');
    }
  };

  const handleExportPDF = () => {
    toast.info('La exportación a PDF estará disponible pronto');
  };

  const songsBySection = songs.reduce((acc, song) => {
    const section = song.section || 'alabanza';
    if (!acc[section]) acc[section] = [];
    acc[section].push(song);
    return acc;
  }, {} as Record<string, SetlistSong[]>);

  const getPositionForSection = (section: string) => {
    const sectionSongs = songsBySection[section] || [];
    return sectionSongs.length + 1;
  };

  const statusConfig = {
    draft: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
    ready: { label: 'Listo para el servicio', className: 'bg-green-500/20 text-green-400' },
    completed: { label: 'Servicio completado', className: 'bg-blue-500/20 text-blue-400' },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/80">
        <Loader />
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 pt-20">
        <Card className="max-w-md w-full p-8 card-gradient border-secondary/20 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-foreground">Repertorio no encontrado</h1>
          <Button onClick={() => navigate('/repertorios')} className="mt-4 bg-secondary text-primary-foreground hover:bg-secondary/90">
            Volver a Repertorios
          </Button>
        </Card>
      </div>
    );
  }

  const status = statusConfig[setlist.status];

  return (
    <>
      <main className="flex-1 pt-20 pb-20 px-4 safe-top safe-bottom w-full">
        <div className="max-w-4xl mx-auto">
          {/* Header Editorial */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 px-2"
          >
            <Button
              variant="ghost"
              onClick={() => navigate('/repertorios')}
              className="mb-8 -ml-3 gap-2 text-muted-foreground/50 hover:text-secondary hover:bg-secondary/5 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Volver</span>
            </Button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <Badge className="bg-secondary/10 text-secondary border-none px-2 py-0.5 text-[9px] uppercase tracking-widest font-bold">
                    {status.label}
                  </Badge>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium">
                    {songs.length} canciones
                  </span>
                </div>
                
                {isEditing ? (
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="text-4xl md:text-5xl font-extralight tracking-tight bg-white/[0.02] border-white/[0.05] focus:border-secondary/30 h-auto py-2"
                  />
                ) : (
                  <h1 className="text-4xl md:text-6xl font-extralight tracking-tight text-foreground leading-tight">
                    {setlist.title}
                  </h1>
                )}
                
                <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-secondary font-bold">
                  {format(new Date(setlist.service_date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>

              <div className="flex gap-3 h-fit">
                {isEditing ? (
                  <>
                    <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-xs font-light tracking-wide hover:bg-white/5">
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saveMutation.isPending} className="squircle-sm bg-secondary text-primary-foreground hover:opacity-90 px-6 font-medium text-xs tracking-wide">
                      {saveMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => setIsEditing(true)} className="w-12 h-12 squircle-sm bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] transition-all">
                      <Edit3 className="h-5 w-5 text-muted-foreground/60" />
                    </Button>
                    <Button 
                      onClick={handleStartLive}
                      className="h-12 px-8 squircle-sm bg-secondary text-primary-foreground hover:opacity-90 font-medium text-xs tracking-widest uppercase shadow-xl shadow-secondary/20"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      En Vivo
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Info del servicio - Clean Blocks */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid gap-8 mb-16 px-2"
          >
            {/* Versículo */}
            {(isEditing || setlist.theme_verse) && (
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/30">
                  Concepto Espiritual
                </h3>
                {isEditing ? (
                  <Textarea
                    value={editForm.theme_verse}
                    onChange={(e) => setEditForm(prev => ({ ...prev, theme_verse: e.target.value }))}
                    placeholder="Escribe el versículo temático..."
                    className="bg-white/[0.02] border-white/[0.05] focus:border-secondary/30 min-h-[100px] font-light text-lg italic"
                  />
                ) : (
                  <p className="text-2xl font-extralight italic text-foreground/80 leading-relaxed border-l-2 border-secondary/20 pl-8 py-2">
                    "{setlist.theme_verse}"
                  </p>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/30">
                  Liderazgo
                </h3>
                {isEditing ? (
                  <Input
                    value={editForm.service_director}
                    onChange={(e) => setEditForm(prev => ({ ...prev, service_director: e.target.value }))}
                    placeholder="Director del servicio"
                    className="bg-white/[0.02] border-white/[0.05] focus:border-secondary/30"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 squircle-sm bg-secondary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-secondary/60" />
                    </div>
                    <p className="text-lg font-light text-foreground/70">
                      {setlist.service_director || '—'}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/30">
                  Palabra
                </h3>
                {isEditing ? (
                  <Input
                    value={editForm.preacher}
                    onChange={(e) => setEditForm(prev => ({ ...prev, preacher: e.target.value }))}
                    placeholder="Persona que predica"
                    className="bg-white/[0.02] border-white/[0.05] focus:border-secondary/30"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 squircle-sm bg-secondary/10 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-secondary/60" />
                    </div>
                    <p className="text-lg font-light text-foreground/70">
                      {setlist.preacher || '—'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Estructura del servicio */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ServiceStructureView
              songsBySection={songsBySection}
              onAddSong={(section) => {
                setSelectedSection(section as SectionType);
                setAddSongDialogOpen(true);
              }}
              onRemoveSong={handleRemoveSong}
              onSongClick={(song) => navigate(`/canciones/${song.song_id}`)}
              isEditing={true}
            />
          </motion.div>
        </div>
      </main>

      {/* Add Song Dialog */}
      <AddSongToSetlistDialog
        open={addSongDialogOpen}
        onOpenChange={setAddSongDialogOpen}
        section={selectedSection}
        setlistId={id || ''}
        currentPosition={getPositionForSection(selectedSection)}
        onSongAdded={() => queryClient.invalidateQueries({ queryKey: ['setlist_detail', id] })}
      />
    </>
  );
};

export default RepertorioDetalle;
