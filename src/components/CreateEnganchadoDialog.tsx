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
import { useAuth } from '@/hooks/useAuth';
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
  }, [open]);

  const fetchSongs = async () => {
    const { data } = await supabase
      .from('songs')
      .select('id, title, category, lyrics, chords, youtube_url, audio_url')
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
      
      const mergedLyrics = selectedSongs.map((s, i) => 
        `[== CANCIÓN ${i + 1}: ${s.title.toUpperCase()} ==]\n\n${s.lyrics || '(Sin letra)'}`
      ).join('\n\n\n');

      const mergedChords = selectedSongs.map((s, i) => 
        `[== CANCIÓN ${i + 1}: ${s.title.toUpperCase()} ==]\n\n${s.chords || '(Sin acordes)'}`
      ).join('\n\n\n');

      const { data, error } = await supabase
        .from('songs')
        .insert({
          title: finalTitle,
          author: 'Varios (Enganchado)',
          category: 'enganchado',
          lyrics: mergedLyrics,
          chords: mergedChords,
          created_by: user?.id,
          status: 'approved' // Auto-approve as it's generated from existing
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('¡Enganchado creado con éxito!');
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
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-emerald-400" />
            Crear Enganchado
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-6 overflow-hidden flex-1 min-h-[400px]">
          {/* Left side: Search and select */}
          <div className="flex-1 flex flex-col space-y-4 border-r border-white/5 pr-4">
            <Label>Buscar canciones</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ej: Bueno es Dios..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-4">
                {filteredSongs.map(song => (
                  <button
                    key={song.id}
                    onClick={() => handleAddSong(song)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Music2 className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                      <p className="font-medium text-sm truncate">{song.title}</p>
                    </div>
                    <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right side: Selected songs and title */}
          <div className="flex-1 flex flex-col space-y-4">
            <div className="space-y-2">
              <Label>Título del Enganchado (Opcional)</Label>
              <Input
                placeholder="Ej: Enganchado de Adoración"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <Label>Orden de canciones ({selectedSongs.length})</Label>
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-2">
                {selectedSongs.length === 0 ? (
                  <div className="text-center text-muted-foreground/60 p-6 border border-dashed border-white/10 rounded-lg">
                    Busca y selecciona canciones para agregarlas aquí
                  </div>
                ) : (
                  selectedSongs.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                    >
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="text-muted-foreground hover:text-white disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button 
                          onClick={() => handleMoveDown(index)}
                          disabled={index === selectedSongs.length - 1}
                          className="text-muted-foreground hover:text-white disabled:opacity-30"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-emerald-100">{index + 1}. {song.title}</p>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveSong(song.id)}
                        className="p-1 rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={loading || selectedSongs.length < 2}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {loading ? 'Creando...' : 'Crear Enganchado'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
