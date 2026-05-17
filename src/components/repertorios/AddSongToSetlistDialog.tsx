import { useState, useEffect } from 'react';
import { Search, Music2, Plus, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <DialogContent className="max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Agregar canción a {sectionInfo?.name}
          </DialogTitle>
        </DialogHeader>

        {!selectedSong ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar canción..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="alabanza">Alabanza</SelectItem>
                    <SelectItem value="adoracion">Adoración</SelectItem>
                    <SelectItem value="especial">Especial</SelectItem>
                    <SelectItem value="enganchado">Enganchados</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold justify-start"
                onClick={() => setCreateEnganchadoOpen(true)}
              >
                <ListMusic className="w-4 h-4 mr-2" />
                Crear nuevo Enganchado
              </Button>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredSongs.map(song => (
                  <button
                    key={song.id}
                    onClick={() => setSelectedSong(song)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
                  >
                    <Music2 className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{song.title}</p>
                    </div>
                    <Badge className={categoryColors[song.category] || categoryColors.otro}>
                      {song.category}
                    </Badge>
                  </button>
                ))}

                {filteredSongs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No se encontraron canciones
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <Music2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">{selectedSong.title}</p>
                  <Badge className={categoryColors[selectedSong.category] || categoryColors.otro}>
                    {selectedSong.category}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="assigned" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Asignado a
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
                placeholder="Ej: Paula, Angelina DIAZ"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="instructions">Instrucciones especiales</Label>
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
                placeholder="Ej: intro nueva, solo primera estrofa..."
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedSong(null)}
                className="flex-1"
              >
                Volver
              </Button>
              <Button
                onClick={handleAddSong}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Agregando...' : 'Agregar'}
              </Button>
            </div>
          </div>
        )}
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
