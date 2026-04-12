import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Edit3, Save, Play, BookOpen, Users, MessageSquare,
  Calendar, Music2, CheckCircle2, AlertCircle, Sparkles, FileDown
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
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
  
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [songs, setSongs] = useState<SetlistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (id && user) {
      fetchData();
    }
  }, [id, user]);

  const fetchData = async () => {
    try {
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
      
      setSetlist(formattedSetlist);
      setEditForm({
        title: formattedSetlist.title,
        description: formattedSetlist.description || '',
        theme_verse: formattedSetlist.theme_verse || '',
        service_director: formattedSetlist.service_director || '',
        preacher: formattedSetlist.preacher || '',
        status: formattedSetlist.status,
      });

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
      
      setSongs((songsData || []).map(s => ({
        ...s,
        section: s.section || 'alabanza',
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar el repertorio');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!setlist) return;
    
    setSaving(true);
    try {
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
        .eq('id', setlist.id);

      if (error) throw error;
      
      setSetlist(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
      toast.success('Repertorio actualizado');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSong = async (songId: string) => {
    try {
      const { error } = await supabase
        .from('setlist_songs')
        .delete()
        .eq('id', songId);

      if (error) throw error;
      
      setSongs(prev => prev.filter(s => s.id !== songId));
      toast.success('Canción removida');
    } catch (error) {
      console.error('Error removing song:', error);
      toast.error('Error al remover la canción');
    }
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
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary via-primary/95 to-primary/80">
        <Navigation />
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md w-full p-8 card-gradient border-secondary/20 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-foreground">Repertorio no encontrado</h1>
            <Button onClick={() => navigate('/repertorios')} className="mt-4 bg-secondary text-primary-foreground">
              Volver a Repertorios
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const status = statusConfig[setlist.status];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary via-primary/95 to-primary/80">
      <Navigation />
      
      <main className="flex-1 pt-20 pb-20 px-4 safe-top safe-bottom">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button
              variant="ghost"
              onClick={() => navigate('/repertorios')}
              className="mb-4 gap-2 text-foreground hover:bg-secondary/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Repertorios
            </Button>

            <Card className="card-gradient border-secondary/20">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        className="text-2xl font-bold mb-2 bg-secondary/20 border-secondary/30"
                      />
                    ) : (
                      <h1 className="text-2xl font-bold mb-2 text-foreground">{setlist.title}</h1>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge className={status.className}>{status.label}</Badge>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(setlist.service_date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Music2 className="h-4 w-4" />
                        {songs.length} canciones
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {isEditing ? (
                      <>
                        <Button variant="outline" onClick={() => setIsEditing(false)} className="border-secondary/30 hover:bg-secondary/20">
                          Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-secondary text-primary-foreground hover:bg-secondary/90">
                          <Save className="h-4 w-4" />
                          {saving ? 'Guardando...' : 'Guardar'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={handleExportPDF} className="gap-2 border-secondary/30 hover:bg-secondary/20">
                          <FileDown className="h-4 w-4" />
                          PDF
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2 border-secondary/30 hover:bg-secondary/20">
                          <Edit3 className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button 
                          onClick={handleStartLive}
                          className="gap-2 bg-gradient-to-r from-secondary to-accent text-primary-foreground"
                        >
                          <Play className="h-4 w-4" />
                          En Vivo
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Versículo temático */}
                {(isEditing || setlist.theme_verse) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-secondary" />
                      <span className="font-medium text-sm text-foreground">Versículo Temático</span>
                      {isEditing && (
                        <HelpTooltip
                          title="Versículo Temático"
                          description="El pasaje bíblico que guía el tema del servicio."
                        />
                      )}
                    </div>
                    {isEditing ? (
                      <Textarea
                        value={editForm.theme_verse}
                        onChange={(e) => setEditForm(prev => ({ ...prev, theme_verse: e.target.value }))}
                        placeholder="Ej: Hechos 3:6 - Mas Pedro dijo..."
                        rows={2}
                        className="bg-secondary/20 border-secondary/30"
                      />
                    ) : (
                      <div className="bg-secondary/20 rounded-lg p-4 border-l-4 border-secondary">
                        <p className="italic text-muted-foreground">"{setlist.theme_verse}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Info del servicio */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Director */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-secondary" />
                      <span className="font-medium text-sm text-foreground">Dirección de Culto</span>
                    </div>
                    {isEditing ? (
                      <Input
                        value={editForm.service_director}
                        onChange={(e) => setEditForm(prev => ({ ...prev, service_director: e.target.value }))}
                        placeholder="Ej: Pastora Karina Andrada"
                        className="bg-secondary/20 border-secondary/30"
                      />
                    ) : (
                      <p className="text-muted-foreground">
                        {setlist.service_director || 'No asignado'}
                      </p>
                    )}
                  </div>

                  {/* Predicador */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-secondary" />
                      <span className="font-medium text-sm text-foreground">Comparte la Palabra</span>
                    </div>
                    {isEditing ? (
                      <Input
                        value={editForm.preacher}
                        onChange={(e) => setEditForm(prev => ({ ...prev, preacher: e.target.value }))}
                        placeholder="Ej: Pastor Juan Benegas"
                        className="bg-secondary/20 border-secondary/30"
                      />
                    ) : (
                      <p className="text-muted-foreground">
                        {setlist.preacher || 'No asignado'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Estado */}
                {isEditing && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-secondary" />
                      <span className="font-medium text-sm text-foreground">Estado del Repertorio</span>
                      <HelpTooltip
                        title="Estado del Repertorio"
                        description="Indica si el repertorio está en preparación, listo para el servicio, o ya fue completado."
                      />
                    </div>
                    <Select 
                      value={editForm.status}
                      onValueChange={(value: 'draft' | 'ready' | 'completed') => 
                        setEditForm(prev => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger className="bg-secondary/20 border-secondary/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="ready">Listo para el servicio</SelectItem>
                        <SelectItem value="completed">Servicio completado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
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
        onSongAdded={fetchData}
      />
    </div>
  );
};

export default RepertorioDetalle;
