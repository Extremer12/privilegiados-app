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
      <DialogContent className="max-w-[100vw] w-screen h-[100dvh] max-h-[100dvh] m-0 p-0 rounded-none border-0 flex flex-col bg-background/95 backdrop-blur-3xl overflow-hidden shadow-none gap-0">
        <DialogHeader className="p-4 md:p-6 border-b border-emerald-500/20 bg-emerald-950/20 shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-3 text-xl md:text-2xl font-bold text-emerald-50">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ListMusic className="h-6 w-6" />
            </div>
            Crear Enganchado
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white">
              <Plus className="h-6 w-6 rotate-45" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-gradient-to-b from-black/20 to-transparent">
          {/* Left side: Search and select */}
          <div className="flex-1 flex flex-col max-w-2xl w-full border-r border-white/5 p-4 md:p-8 gap-6 h-full overflow-hidden bg-black/10">
            <div>
              <h3 className="text-lg font-bold mb-1">Buscar canciones</h3>
              <p className="text-sm text-muted-foreground mb-4">Selecciona las canciones que quieras unir</p>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Ej: Bueno es Dios, Cuan Grande..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-14 text-lg bg-black/20 border-white/10 rounded-xl focus-visible:ring-emerald-500/50"
                  autoFocus
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1 rounded-2xl border border-white/5 bg-black/20 p-2 md:p-4">
              <div className="space-y-2 pr-4">
                {filteredSongs.map(song => (
                  <button
                    key={song.id}
                    onClick={() => handleAddSong(song)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.05] hover:border-emerald-500/30 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2 rounded-lg bg-white/5 group-hover:bg-emerald-500/20 text-muted-foreground group-hover:text-emerald-400 transition-colors">
                        <Music2 className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <p className="font-bold text-base text-foreground group-hover:text-emerald-50 transition-colors truncate">{song.title}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">{song.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity mr-2">Agregar</span>
                      <Plus className="h-5 w-5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}

                {filteredSongs.length === 0 && search && (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <Search className="h-12 w-12 text-muted-foreground/20 mb-4" />
                    <p className="font-bold text-foreground mb-1">No hay resultados</p>
                    <p className="text-sm text-muted-foreground">Intenta escribir diferente</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right side: Selected songs and title */}
          <div className="flex-1 flex flex-col w-full p-4 md:p-8 gap-6 h-full overflow-hidden bg-emerald-950/5">
            <div>
              <h3 className="text-lg font-bold mb-1">Configurar Enganchado</h3>
              <p className="text-sm text-muted-foreground mb-4">Ordena las canciones y dale un nombre</p>
              
              <div className="space-y-2 mb-8">
                <Label className="text-base">Título (Opcional)</Label>
                <Input
                  placeholder="Ej: Enganchado de Adoración"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-14 text-lg bg-black/20 border-white/10 rounded-xl focus-visible:ring-emerald-500/50"
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">Orden de canciones ({selectedSongs.length})</Label>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  Arrastra o usa las flechas
                </Badge>
              </div>
            </div>

            <ScrollArea className="flex-1 rounded-2xl border border-white/5 bg-black/20 p-2 md:p-4">
              <div className="space-y-3 pr-2">
                {selectedSongs.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/5 rounded-xl m-2">
                    <ListMusic className="h-16 w-16 text-muted-foreground/20 mb-4" />
                    <p className="text-xl font-bold text-foreground mb-2">Tu enganchado está vacío</p>
                    <p className="text-muted-foreground max-w-sm">Busca y selecciona canciones en el panel de la izquierda para agregarlas aquí.</p>
                  </div>
                ) : (
                  selectedSongs.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg"
                    >
                      <div className="flex flex-col gap-1 bg-black/20 rounded-lg p-1">
                        <button 
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1 text-muted-foreground hover:text-emerald-400 disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleMoveDown(index)}
                          disabled={index === selectedSongs.length - 1}
                          className="p-1 text-muted-foreground hover:text-emerald-400 disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <span className="font-bold text-emerald-400">{index + 1}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate text-emerald-50">{song.title}</p>
                        <p className="text-xs text-emerald-500/70 uppercase tracking-widest">{song.category}</p>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveSong(song.id)}
                        className="p-3 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors ml-2"
                        title="Quitar canción"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="pt-6 mt-2">
              <Button 
                onClick={handleCreate} 
                disabled={loading || selectedSongs.length < 2}
                className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg shadow-xl shadow-emerald-900/20 disabled:opacity-50"
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
