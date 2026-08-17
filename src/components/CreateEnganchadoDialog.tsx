import { useState, useEffect } from 'react';
import { Search, Music2, Plus, X, ArrowUp, ArrowDown, ListMusic } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { DialogClose } from '@radix-ui/react-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useGroup } from '@/hooks/useGroupContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Song } from '@/types';

interface CreateEnganchadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (songId: string) => void;
}

export function CreateEnganchadoDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateEnganchadoDialogProps) {
  const { user } = useAuth();
  const { activeGroup } = useGroup();
  const queryClient = useQueryClient();
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (open) {
      fetchSongs();
      setSearch('');
      setSelectedSongs([]);
      setTitle('');
    }
  }, [open, activeGroup?.id]);

  const fetchSongs = async () => {
    if (!activeGroup?.id) return;
    const { data } = await supabase
      .from('songs')
      .select('id, title, category, lyrics, chords, youtube_url, audio_url')
      .eq('group_id', activeGroup.id)
      .eq('status', 'approved')
      .neq('category', 'enganchado') // Evitar enganchados dentro de enganchados
      .order('title');
    
    if (data) setSongs(data);
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(search.toLowerCase()) &&
    !selectedSongs.some(s => s.id === song.id)
  );

  const handleAddSong = (song: Song) => {
    setSelectedSongs(prev => [...prev, song]);
    setSearch('');
  };

  const handleRemoveSong = (songId: string) => {
    setSelectedSongs(prev => prev.filter(s => s.id !== songId));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSelectedSongs(prev => {
      const newSongs = [...prev];
      [newSongs[index - 1], newSongs[index]] = [newSongs[index], newSongs[index - 1]];
      return newSongs;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedSongs.length - 1) return;
    setSelectedSongs(prev => {
      const newSongs = [...prev];
      [newSongs[index], newSongs[index + 1]] = [newSongs[index + 1], newSongs[index]];
      return newSongs;
    });
  };

  const handleCreate = async () => {
    if (selectedSongs.length < 2) {
      toast.error('Selecciona al menos 2 canciones');
      return;
    }
    
    setLoading(true);
    try {
      const finalTitle = title.trim() || `Enganchado: ${selectedSongs.map(s => s.title).join(' + ')}`;
      
      // Merge lyrics in exact user order
      const lyricsArray = selectedSongs.map((s, i) => {
        const header = `[== CANCIÓN ${i + 1}: ${s.title.toUpperCase()} ==]`;
        const authorStr = s.author ? `Autor: ${s.author}\n` : '';
        const body = s.lyrics && s.lyrics.trim() ? s.lyrics.trim() : '(Sin letra disponible)';
        return `${header}\n${authorStr}\n${body}`;
      });
      const mergedLyrics = lyricsArray.join('\n\n\n──────────────────────────────\n\n\n');

      // Merge chords only if at least one song has chords
      const hasAnyChords = selectedSongs.some(s => s.chords && s.chords.trim().length > 0);
      let mergedChords: string | null = null;

      if (hasAnyChords) {
        const chordsArray = selectedSongs.map((s, i) => {
          const header = `[== CANCIÓN ${i + 1}: ${s.title.toUpperCase()} ==]`;
          const body = s.chords && s.chords.trim() ? s.chords.trim() : (s.lyrics && s.lyrics.trim() ? s.lyrics.trim() : '(Sin acordes)');
          return `${header}\n\n${body}`;
        });
        mergedChords = chordsArray.join('\n\n\n──────────────────────────────\n\n\n');
      }

      const { data, error } = await supabase
        .from('songs')
        .insert({
          title: finalTitle,
          author: 'Varios (Enganchado)',
          category: 'enganchado',
          lyrics: mergedLyrics,
          chords: mergedChords,
          created_by: user?.id,
          group_id: activeGroup?.id,
          status: 'approved' // Auto-approve as it's generated from existing
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('¡Enganchado creado con éxito!');
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      if (onCreated) onCreated(data.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating enganchado:', error);
      toast.error('Error al crear: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-screen h-[100dvh] max-h-[100dvh] m-0 p-0 rounded-none border-0 flex flex-col bg-background text-foreground overflow-hidden shadow-none gap-0">
        <DialogHeader className="p-4 md:p-6 border-b border-border bg-card/80 backdrop-blur-xl shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-3 text-xl md:text-2xl font-bold text-foreground">
            <div className="p-2 rounded-xl bg-secondary/20 text-secondary">
              <ListMusic className="h-6 w-6" />
            </div>
            Crear Enganchado
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row bg-background">
          {/* Left side: Search and select */}
          <div className="flex-1 flex flex-col max-w-2xl w-full border-r border-border p-4 md:p-8 gap-4 md:gap-6 h-auto md:h-full min-h-[300px] md:min-h-0 bg-muted/20 shrink-0 md:shrink">
            <div>
              <h3 className="text-lg font-bold mb-1 text-foreground">Buscar canciones</h3>
              <p className="text-sm text-muted-foreground mb-4">Selecciona las canciones que quieras unir</p>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Ej: Bueno es Dios, Cuan Grande..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-12 md:h-14 text-base md:text-lg bg-background border-border rounded-xl focus-visible:ring-secondary/50 text-foreground"
                  autoFocus
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1 min-h-[180px] md:min-h-0 rounded-2xl border border-border bg-background/50 p-2 md:p-4">
              <div className="space-y-2 pr-4">
                {filteredSongs.map(song => (
                  <button
                    key={song.id}
                    onClick={() => handleAddSong(song)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-card hover:bg-secondary/10 border border-border hover:border-secondary/30 transition-all text-left group shadow-sm"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2 rounded-lg bg-muted group-hover:bg-secondary/20 text-muted-foreground group-hover:text-secondary transition-colors">
                        <Music2 className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <p className="font-bold text-base text-foreground group-hover:text-secondary transition-colors truncate">{song.title}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">{song.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-secondary opacity-0 group-hover:opacity-100 transition-opacity mr-2">Agregar</span>
                      <Plus className="h-5 w-5 text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}

                {filteredSongs.length === 0 && search && (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="font-bold text-foreground mb-1">No hay resultados</p>
                    <p className="text-sm text-muted-foreground">Intenta escribir diferente</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right side: Selected songs and title */}
          <div className="flex-1 flex flex-col w-full p-4 md:p-8 gap-4 md:gap-6 h-auto md:h-full bg-muted/10 shrink-0 md:shrink">
            <div className="shrink-0">
              <h3 className="text-lg font-bold mb-1 text-foreground">Configurar Enganchado</h3>
              <p className="text-sm text-muted-foreground mb-4">Ordena las canciones y dale un nombre</p>
              
              <div className="space-y-2 mb-4 md:mb-6">
                <Label className="text-base text-foreground">Título (Opcional)</Label>
                <Input
                  placeholder="Ej: Enganchado de Adoración"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12 md:h-14 text-base md:text-lg bg-background border-border rounded-xl focus-visible:ring-secondary/50 text-foreground"
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <Label className="text-base text-foreground">Orden de canciones ({selectedSongs.length})</Label>
                <Badge variant="outline" className="bg-secondary/15 text-secondary border-secondary/30">
                  Usa las flechas
                </Badge>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-[160px] md:min-h-0 rounded-2xl border border-border bg-background/50 p-2 md:p-4">
              <div className="space-y-3 pr-2">
                {selectedSongs.length === 0 ? (
                  <div className="py-12 md:py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-xl m-2">
                    <ListMusic className="h-12 md:h-16 w-12 md:w-16 text-muted-foreground/30 mb-4" />
                    <p className="text-lg md:text-xl font-bold text-foreground mb-2">Tu enganchado está vacío</p>
                    <p className="text-sm text-muted-foreground max-w-sm">Busca y selecciona canciones en el panel de la izquierda para agregarlas aquí.</p>
                  </div>
                ) : (
                  selectedSongs.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-secondary/40 shadow-sm"
                    >
                      <div className="flex flex-col gap-1 bg-muted rounded-lg p-1">
                        <button 
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1 text-muted-foreground hover:text-secondary disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleMoveDown(index)}
                          disabled={index === selectedSongs.length - 1}
                          className="p-1 text-muted-foreground hover:text-secondary disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                        <span className="font-bold text-secondary">{index + 1}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate text-foreground">{song.title}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">{song.category}</p>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveSong(song.id)}
                        className="p-3 rounded-xl text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors ml-2"
                        title="Quitar canción"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="pt-4 mt-auto shrink-0 bg-background/80 backdrop-blur-md p-2 md:p-0 rounded-xl sticky bottom-0 z-10">
              <Button 
                onClick={handleCreate} 
                disabled={loading || selectedSongs.length < 2}
                className="w-full h-12 md:h-14 rounded-xl bg-secondary text-primary-foreground hover:opacity-90 font-bold text-base md:text-lg shadow-lg shadow-secondary/20 disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Guardar Enganchado'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
