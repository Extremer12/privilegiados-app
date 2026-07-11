import { useState, useEffect } from 'react';
import { Search, Music2, Plus, User } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogClose } from '@radix-ui/react-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SECTION_TYPES, Song, SectionType } from './types';
import { supabase } from '@/integrations/supabase/client';
import { HelpTooltip } from './HelpTooltip';
import { CreateEnganchadoDialog } from '@/components/CreateEnganchadoDialog';
import { ListMusic } from 'lucide-react';

interface AddSongToSetlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: SectionType;
  setlistId: string;
  currentPosition: number;
  onSongAdded: () => void;
}

export function AddSongToSetlistDialog({
  open,
  onOpenChange,
  section,
  setlistId,
  currentPosition,
  onSongAdded,
}: AddSongToSetlistDialogProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [assignedTo, setAssignedTo] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [createEnganchadoOpen, setCreateEnganchadoOpen] = useState(false);

  const sectionInfo = SECTION_TYPES.find(s => s.id === section);

  useEffect(() => {
    if (open) {
      fetchSongs();
    }
  }, [open]);

  const fetchSongs = async () => {
    const { data } = await supabase
      .from('songs')
      .select('id, title, category, lyrics, chords, youtube_url, audio_url')
      .order('title');
    
    if (data) setSongs(data);
  };

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.title.toLowerCase().includes(search.toLowerCase()) || 
                          song.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || song.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleAddSong = async () => {
    if (!selectedSong) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('setlist_songs')
        .insert({
          setlist_id: setlistId,
          song_id: selectedSong.id,
          position: currentPosition,
          section: section,
          assigned_to: assignedTo || null,
          special_instructions: specialInstructions || null,
        });

      if (error) throw error;
      
      onSongAdded();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error adding song:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSong(null);
    setAssignedTo('');
    setSpecialInstructions('');
    setSearch('');
    setCategoryFilter('all');
  };

  const categoryColors: Record<string, string> = {
    alabanza: 'bg-yellow-500/20 text-yellow-400',
    adoracion: 'bg-pink-500/20 text-pink-400',
    especial: 'bg-purple-500/20 text-purple-400',
    enganchado: 'bg-emerald-500/20 text-emerald-400',
    otro: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-screen h-[100dvh] max-h-[100dvh] m-0 p-0 rounded-none border-0 flex flex-col bg-background/95 backdrop-blur-3xl overflow-hidden shadow-none gap-0">
        <DialogHeader className="p-4 md:p-6 border-b border-white/10 bg-black/40 shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-3 text-xl md:text-2xl font-bold">
              {selectedSong ? (
                <Button variant="ghost" size="icon" onClick={() => setSelectedSong(null)} className="h-8 w-8 mr-2 rounded-full hover:bg-white/10">
                  <Search className="h-4 w-4" />
                </Button>
              ) : (
                <div className="p-2 rounded-xl bg-secondary/20 text-secondary">
                  <Plus className="h-5 w-5" />
                </div>
              )}
              {selectedSong ? 'Configurar Canción' : `Agregar a ${sectionInfo?.name}`}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Busca y configura canciones para añadir al repertorio.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white">
              <Plus className="h-6 w-6 rotate-45" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col bg-gradient-to-b from-black/20 to-transparent">
          {!selectedSong ? (
            <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 md:p-8 gap-6 h-full overflow-hidden">
              {/* Top Bar: Search, Filter & Create Enganchado */}
              <div className="flex flex-col md:flex-row gap-4 shrink-0 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título o autor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-12 h-14 text-lg bg-black/20 border-white/10 rounded-xl focus-visible:ring-secondary/50 placeholder:text-muted-foreground/50"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-14 w-full md:w-[180px] bg-black/20 border-white/10 rounded-xl text-base">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-white/10">
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      <SelectItem value="alabanza">Alabanza</SelectItem>
                      <SelectItem value="adoracion">Adoración</SelectItem>
                      <SelectItem value="especial">Especial</SelectItem>
                      <SelectItem value="enganchado">Enganchados</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    className="h-14 px-6 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold rounded-xl hidden md:flex items-center gap-2"
                    onClick={() => setCreateEnganchadoOpen(true)}
                  >
                    <ListMusic className="w-5 h-5" />
                    Crear Enganchado
                  </Button>
                </div>
              </div>

              {/* Mobile Create Enganchado Button */}
              <Button
                variant="outline"
                className="h-14 w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold rounded-xl flex md:hidden items-center justify-center gap-2 shrink-0"
                onClick={() => setCreateEnganchadoOpen(true)}
              >
                <ListMusic className="w-5 h-5" />
                Crear Enganchado
              </Button>

              {/* Song List */}
              <ScrollArea className="flex-1 rounded-2xl border border-white/5 bg-black/20 p-2 md:p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                  {filteredSongs.map(song => (
                    <button
                      key={song.id}
                      onClick={() => setSelectedSong(song)}
                      className="group flex flex-col p-4 rounded-xl bg-white/[0.03] hover:bg-secondary/10 border border-white/[0.05] hover:border-secondary/30 transition-all text-left w-full h-full"
                    >
                      <div className="flex items-start justify-between w-full mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg ${categoryColors[song.category]?.split(' ')[0] || 'bg-white/10'}`}>
                            <Music2 className={`h-5 w-5 ${categoryColors[song.category]?.split(' ')[1] || 'text-white'}`} />
                          </div>
                          <p className="font-bold text-base text-foreground truncate group-hover:text-secondary transition-colors">
                            {song.title}
                          </p>
                        </div>
                        <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${categoryColors[song.category] || categoryColors.otro}`}>
                          {song.category}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between w-full mt-auto pt-3 border-t border-white/5">
                        <div className="flex items-center gap-4">
                          {song.lyrics && <span className="text-xs text-muted-foreground/60 flex items-center gap-1"><Search className="h-3 w-3" /> Letra</span>}
                          {song.chords && <span className="text-xs text-muted-foreground/60 flex items-center gap-1"><Music2 className="h-3 w-3" /> Acordes</span>}
                        </div>
                        <span className="text-xs font-semibold text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                          Seleccionar →
                        </span>
                      </div>
                    </button>
                  ))}

                  {filteredSongs.length === 0 && (
                    <div className="col-span-1 md:col-span-2 py-20 flex flex-col items-center justify-center text-center">
                      <Music2 className="h-16 w-16 text-muted-foreground/20 mb-4" />
                      <p className="text-xl font-bold text-foreground mb-2">No se encontraron canciones</p>
                      <p className="text-muted-foreground">Intenta con otro término de búsqueda o crea un enganchado.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto p-4 md:p-8 overflow-y-auto">
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl">
                
                <div className="flex items-center gap-5 mb-10 pb-8 border-b border-white/10">
                  <div className={`p-4 rounded-2xl ${categoryColors[selectedSong.category]?.split(' ')[0] || 'bg-white/10'} shadow-inner`}>
                    <Music2 className={`h-8 w-8 ${categoryColors[selectedSong.category]?.split(' ')[1] || 'text-white'}`} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground mb-2">{selectedSong.title}</h2>
                    <div className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${categoryColors[selectedSong.category] || categoryColors.otro}`}>
                      {selectedSong.category}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="assigned" className="text-base flex items-center gap-2 font-semibold">
                        <User className="h-5 w-5 text-secondary" />
                        ¿Quién la dirige/canta?
                      </Label>
                      <HelpTooltip
                        title="Asignado a"
                        description="La persona que cantará o tocará esta canción."
                        example="Paula - Angelina DIAZ - Pastor Rafa"
                      />
                    </div>
                    <Input
                      id="assigned"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      placeholder="Ej: Paula, Angelina DIAZ..."
                      className="h-14 text-lg bg-black/20 border-white/10 rounded-xl focus-visible:ring-secondary/50"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="instructions" className="text-base font-semibold">Instrucciones especiales</Label>
                      <HelpTooltip
                        title="Instrucciones especiales"
                        description="Notas adicionales sobre cómo interpretar esta canción."
                        example="(intro nueva), solo primera estrofa, a capella"
                      />
                    </div>
                    <Textarea
                      id="instructions"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="Ej: Empezar con guitarra acústica, solo primera estrofa..."
                      className="min-h-[120px] text-lg bg-black/20 border-white/10 rounded-xl focus-visible:ring-secondary/50 resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-4 pt-10 mt-10 border-t border-white/5">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedSong(null)}
                    className="h-14 flex-1 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 font-bold text-base"
                  >
                    ← Volver a la lista
                  </Button>
                  <Button
                    onClick={handleAddSong}
                    disabled={loading}
                    className="h-14 flex-1 rounded-xl bg-secondary text-primary-foreground hover:bg-secondary/90 shadow-xl shadow-secondary/20 font-bold text-lg"
                  >
                    {loading ? 'Agregando...' : 'Confirmar y Agregar'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
      
      <CreateEnganchadoDialog 
        open={createEnganchadoOpen}
        onOpenChange={setCreateEnganchadoOpen}
        onCreated={() => {
          fetchSongs();
          setCategoryFilter('enganchado');
        }}
      />
    </Dialog>
  );
}
