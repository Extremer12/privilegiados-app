import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Edit3, Save, Play, Users, MessageSquare,
  AlertCircle, FileDown, X, Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { ManageParticipantsDialog } from '@/components/repertorios/ManageParticipantsDialog';
import { Setlist, SetlistSong, SECTION_TYPES, SectionType } from '@/components/repertorios/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as liveSessionService from '@/services/liveSessionService';

import { PrintSetlistMode } from '@/components/repertorios/PrintSetlistMode';

const RepertorioDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [addSongDialogOpen, setAddSongDialogOpen] = useState(false);
  const [manageParticipantsOpen, setManageParticipantsOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionType>('alabanza');
  const [sections, setSections] = useState<any[]>([]);
  const [printMode, setPrintMode] = useState(false);

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

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('setlist_participants')
        .select(`
          *,
          profiles (id, full_name, avatar_url)
        `)
        .eq('setlist_id', id);
      
      if (participantsError) throw participantsError;

      return { 
        setlist: formattedSetlist, 
        songs: formattedSongs,
        participants: participantsData || []
      };
    },
    enabled: !!id && !!user,
  });

  const setlist = data?.setlist || null;
  const songs = data?.songs || [];
  const participants = data?.participants || [];

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
      setSections(setlist.sections_config || SECTION_TYPES);
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
          sections_config: sections,
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
      
      try {
        const participants = await liveSessionService.fetchSetlistParticipants(setlist.id);
        const validParticipants = participants.filter(p => p.user_id).map(p => ({
          user_id: p.user_id as string,
          role: p.role
        }));
        await liveSessionService.insertLiveSessionParticipants(newSession.id, validParticipants);
      } catch (e) {
        console.error("Error setting up live participants:", e);
      }

      navigate(`/en-vivo/${newSession.id}`);
    } catch (error) {
      console.error('Error starting live:', error);
      toast.error('Error al iniciar sesión en vivo');
    }
  };

  const handleExportPDF = () => {
    setPrintMode(true);
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

  const statusOptions = [
    { value: 'draft', label: 'Borrador', color: 'text-amber-400' },
    { value: 'ready', label: 'Listo para el servicio', color: 'text-emerald-400' },
    { value: 'completed', label: 'Servicio completado', color: 'text-sky-400' },
  ];

  const currentStatus = statusOptions.find(s => s.value === (isEditing ? editForm.status : setlist?.status)) || statusOptions[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
          <Button onClick={() => navigate('/repertorios')} className="mt-4 bg-secondary text-primary-foreground hover:bg-secondary/90 rounded-xl h-12">
            Volver a Repertorios
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 pt-24 pb-20 px-4 safe-top safe-bottom w-full">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            {/* Back button */}
            <Button
              variant="ghost"
              onClick={() => navigate('/repertorios')}
              className="mb-6 -ml-2 gap-2 text-muted-foreground hover:text-secondary hover:bg-secondary/5 transition-all rounded-xl h-10"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-semibold">Volver</span>
            </Button>

            {/* Title area */}
            <div className="flex flex-col gap-6">
              <div className="flex-1 min-w-0">
                {/* Status badge */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  {isEditing ? (
                    <Select
                      value={editForm.status}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value as any }))}
                    >
                      <SelectTrigger className="w-auto h-8 text-xs font-semibold bg-white/5 border-white/10 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`border-none px-3 py-1 text-xs font-semibold rounded-lg bg-white/5 ${currentStatus.color}`}>
                      {currentStatus.label}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {songs.length} canciones
                  </span>
                </div>
                
                {/* Title */}
                {isEditing ? (
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="text-2xl md:text-3xl font-bold tracking-tight bg-white/[0.03] border-white/10 focus:border-secondary/40 h-auto py-3 rounded-xl"
                  />
                ) : (
                  <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
                    {setlist.title}
                  </h1>
                )}
                
                {/* Date */}
                <p className="mt-3 text-sm font-semibold text-secondary capitalize">
                  {format(new Date(setlist.service_date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {isEditing ? (
                  <>
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsEditing(false)} 
                      className="h-11 px-5 rounded-xl text-sm font-semibold hover:bg-white/5"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      disabled={saveMutation.isPending} 
                      className="h-11 px-6 rounded-xl bg-secondary text-primary-foreground hover:opacity-90 font-bold text-sm active:scale-[0.97] transition-all"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsEditing(true)} 
                      disabled={setlist.status === 'completed'}
                      className={`h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold active:scale-[0.97] transition-all ${setlist.status === 'completed' ? 'opacity-50 grayscale' : ''}`}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      {setlist.status === 'completed' ? 'Cerrado' : 'Editar'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={handleExportPDF} 
                      className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold active:scale-[0.97] transition-all"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button 
                      onClick={handleStartLive}
                      disabled={setlist.status === 'completed' || songs.length === 0}
                      className={`h-11 px-6 rounded-xl bg-secondary text-primary-foreground font-bold text-sm shadow-lg active:scale-[0.97] transition-all ${
                        setlist.status === 'completed' 
                          ? 'bg-muted text-muted-foreground shadow-none' 
                          : songs.length === 0 
                            ? 'opacity-50 cursor-not-allowed hover:opacity-50 shadow-none' 
                            : 'hover:opacity-90 shadow-secondary/20'
                      }`}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {setlist.status === 'completed' ? 'Finalizado' : 'En Vivo'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Service info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="space-y-6 mb-10"
          >
            {/* Theme verse */}
            {(isEditing || setlist.theme_verse) && (
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">
                  Versículo Temático
                </h3>
                {isEditing ? (
                  <Textarea
                    value={editForm.theme_verse}
                    onChange={(e) => setEditForm(prev => ({ ...prev, theme_verse: e.target.value }))}
                    placeholder="Escribe el versículo temático..."
                    className="bg-white/[0.03] border-white/10 focus:border-secondary/40 min-h-[80px] text-base italic rounded-xl"
                  />
                ) : (
                  <div className="border-l-[3px] border-secondary/40 pl-5 py-2">
                    <p className="text-lg italic text-foreground/80 leading-relaxed">
                      "{setlist.theme_verse}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Leadership & Team */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">
                    Dirección de Culto
                  </h3>
                  {isEditing ? (
                    <Input
                      value={editForm.service_director}
                      onChange={(e) => setEditForm(prev => ({ ...prev, service_director: e.target.value }))}
                      placeholder="Director del servicio"
                      className="bg-white/[0.03] border-white/10 focus:border-secondary/40 rounded-xl h-11"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-secondary" />
                      </div>
                      <p className="text-base font-medium text-foreground/80">
                        {setlist.service_director || '—'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">
                    Palabra
                  </h3>
                  {isEditing ? (
                    <Input
                      value={editForm.preacher}
                      onChange={(e) => setEditForm(prev => ({ ...prev, preacher: e.target.value }))}
                      placeholder="Persona que predica"
                      className="bg-white/[0.03] border-white/10 focus:border-secondary/40 rounded-xl h-11"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                        <Mic className="h-4 w-4 text-secondary" />
                      </div>
                      <p className="text-base font-medium text-foreground/80">
                        {setlist.preacher || '—'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Team Participants */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">
                    Ministerio / Equipo
                  </h3>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setManageParticipantsOpen(true)}
                      className="h-7 text-xs font-bold text-secondary bg-secondary/10 hover:bg-secondary/20 rounded-lg px-3"
                    >
                      <UserPlus className="w-3 h-3 mr-1" /> Editar Equipo
                    </Button>
                  )}
                </div>
                {participants.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {participants.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center overflow-hidden">
                          {p.profiles?.avatar_url ? (
                            <img src={p.profiles.avatar_url} alt={p.profiles.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-secondary">{p.profiles?.full_name?.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white/90">{p.profiles?.full_name}</span>
                          <span className="text-[9px] font-medium text-secondary/60 uppercase">{p.role_in_service}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No hay participantes asignados</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Service Structure */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ServiceStructureView
              sections={sections}
              onUpdateSections={setSections}
              songsBySection={songsBySection}
              onAddSong={(section) => {
                if (setlist.status === 'completed') return;
                setSelectedSection(section as SectionType);
                setAddSongDialogOpen(true);
              }}
              onRemoveSong={handleRemoveSong}
              onSongClick={(song) => navigate(`/canciones/${song.song_id}`)}
              isEditing={isEditing && setlist.status !== 'completed'}
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

      {/* Print Mode */}
      <AnimatePresence>
        {printMode && setlist && (
          <PrintSetlistMode
            setlist={setlist}
            sections={sections}
            songsBySection={songsBySection}
            participants={participants}
            onClose={() => setPrintMode(false)}
          />
        )}
      </AnimatePresence>
      {setlist && (
        <ManageParticipantsDialog
          open={manageParticipantsOpen}
          onOpenChange={setManageParticipantsOpen}
          type="setlist"
          targetId={setlist.id}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['setlist_detail', id] })}
        />
      )}
    </>
  );
};

export default RepertorioDetalle;
