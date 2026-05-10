import { useState } from 'react';
import { 
  Music, Heart, BookOpen, Gift, MessageSquare, Sparkles, Flag,
  ChevronDown, ChevronUp, Plus, X, ArrowUp, ArrowDown, Edit2, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SetlistSong } from './types';
import { HelpTooltip } from './HelpTooltip';

const iconMap: Record<string, React.ElementType> = {
  Music, Heart, BookOpen, Gift, MessageSquare, Sparkles, Flag,
};

interface SongsBySection {
  [key: string]: SetlistSong[];
}

export interface SectionConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface ServiceStructureViewProps {
  sections: SectionConfig[];
  onUpdateSections: (sections: SectionConfig[]) => void;
  songsBySection: SongsBySection;
  onAddSong: (section: string) => void;
  onRemoveSong: (songId: string) => void;
  onMoveSong?: (songId: string, direction: 'up' | 'down') => void;
  onSongClick: (song: SetlistSong) => void;
  isEditing: boolean;
}

export function ServiceStructureView({ 
  sections,
  onUpdateSections,
  songsBySection, 
  onAddSong, 
  onRemoveSong,
  onMoveSong,
  onSongClick,
  isEditing 
}: ServiceStructureViewProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    sections.map(s => s.id)
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    if (direction === 'up' && index > 0) {
      [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    } else if (direction === 'down' && index < newSections.length - 1) {
      [newSections[index + 1], newSections[index]] = [newSections[index], newSections[index + 1]];
    }
    onUpdateSections(newSections);
  };

  const deleteSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    onUpdateSections(newSections);
  };

  const addSection = () => {
    const newId = `custom_${Date.now()}`;
    const newSection: SectionConfig = {
      id: newId,
      name: 'Nueva Sección',
      icon: 'Sparkles',
      color: 'text-zinc-400',
      description: 'Sección personalizada'
    };
    onUpdateSections([...sections, newSection]);
    setExpandedSections(prev => [...prev, newId]);
    setEditingSectionId(newId);
    setEditingName('Nueva Sección');
  };

  const saveSectionName = (id: string) => {
    const newSections = sections.map(s => s.id === id ? { ...s, name: editingName } : s);
    onUpdateSections(newSections);
    setEditingSectionId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Estructura del Servicio
          </h2>
          <HelpTooltip
            title="Estructura del Servicio"
            description="Organiza las canciones por secciones según el flujo típico de un culto. Cada sección representa un momento diferente del servicio."
            example="Alabanza → Adoración → Ofrenda → Palabra → Cierre"
          />
        </div>
        {isEditing && (
          <Button
            onClick={addSection}
            variant="outline"
            size="sm"
            className="rounded-xl border-secondary/30 text-secondary hover:bg-secondary hover:text-primary-foreground transition-all gap-2 text-sm font-semibold active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            Sección
          </Button>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, index) => {
          const Icon = iconMap[section.icon] || Sparkles;
          const songs = songsBySection[section.id] || [];
          const isExpanded = expandedSections.includes(section.id);
          const isRenaming = editingSectionId === section.id;

          return (
            <Collapsible 
              key={section.id} 
              open={isExpanded}
              onOpenChange={() => !isRenaming && toggleSection(section.id)}
            >
              <Card className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                songs.length > 0 
                  ? 'border-l-[3px] border-l-secondary/60 border-white/10 bg-white/[0.02]' 
                  : 'border-white/5 bg-white/[0.01]'
              }`}>
                <CollapsibleTrigger asChild>
                  <CardHeader className={`cursor-pointer py-5 px-5 md:px-6 ${isRenaming ? 'pointer-events-none' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Section icon */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-white/[0.05] shrink-0 ${section.color}`}>
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        
                        {/* Section name */}
                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <div className="flex items-center gap-2 pointer-events-auto">
                              <Input 
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="max-w-[200px] h-9 bg-black/20 border-white/10 text-base"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveSectionName(section.id);
                                }}
                              />
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-9 w-9 rounded-lg text-emerald-400 hover:bg-emerald-400/10" 
                                onClick={() => saveSectionName(section.id)}
                                aria-label="Guardar nombre"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <CardTitle className="text-base md:text-lg font-semibold tracking-wide text-foreground flex items-center gap-2">
                                {section.name}
                                {isEditing && (
                                  <button 
                                    className="text-muted-foreground/40 hover:text-secondary transition-colors p-1" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSectionId(section.id);
                                      setEditingName(section.name);
                                    }}
                                    aria-label={`Renombrar ${section.name}`}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {section.description}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Right side controls */}
                      <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
                        {/* Edit controls */}
                        {isEditing && !isRenaming && (
                          <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1 border border-white/5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-md text-muted-foreground hover:text-white disabled:opacity-20"
                              disabled={index === 0}
                              onClick={(e) => { e.stopPropagation(); moveSection(index, 'up'); }}
                              aria-label="Mover sección arriba"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-md text-muted-foreground hover:text-white disabled:opacity-20"
                              disabled={index === sections.length - 1}
                              onClick={(e) => { e.stopPropagation(); moveSection(index, 'down'); }}
                              aria-label="Mover sección abajo"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                              onClick={(e) => { e.stopPropagation(); deleteSection(index); }}
                              aria-label="Eliminar sección"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {/* Song count badge */}
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          songs.length > 0 
                            ? 'bg-secondary/15 text-secondary' 
                            : 'bg-white/5 text-muted-foreground'
                        }`}>
                          {songs.length}
                        </span>

                        {/* Chevron */}
                        {!isRenaming && (
                          isExpanded 
                            ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> 
                            : <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="px-5 md:px-6 pb-5 pt-0">
                    {songs.length === 0 ? (
                      <div className="py-6 border-t border-white/5 text-center">
                        <p className="text-sm text-muted-foreground/60">
                          Sin canciones asignadas
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 border-t border-white/5 pt-4">
                        {songs.map((song, songIndex) => (
                          <div
                            key={song.id}
                            className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all active:scale-[0.99] group"
                          >
                            {/* Number */}
                            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-secondary">
                                {songIndex + 1}
                              </span>
                            </div>

                            {/* Song info */}
                            <div 
                              className="flex-1 cursor-pointer min-w-0"
                              onClick={() => onSongClick(song)}
                            >
                              <p className="text-base font-semibold text-foreground group-hover:text-secondary transition-colors truncate">
                                {song.songs?.title || 'Sin título'}
                              </p>
                              {(song.special_instructions || song.notes || song.assigned_to) && (
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {song.assigned_to && (
                                    <span className="text-xs font-semibold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-md">
                                      {song.assigned_to}
                                    </span>
                                  )}
                                  {(song.special_instructions || song.notes) && (
                                    <span className="text-xs italic text-muted-foreground/70 truncate">
                                      {song.special_instructions || song.notes}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Actions */}
                            {isEditing && (
                              <div className="flex items-center gap-1 shrink-0">
                                {onMoveSong && (
                                  <div className="flex flex-col gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 rounded-[4px] hover:bg-white/10 text-muted-foreground hover:text-white"
                                      disabled={songIndex === 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onMoveSong(song.id, 'up');
                                      }}
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 rounded-[4px] hover:bg-white/10 text-muted-foreground hover:text-white"
                                      disabled={songIndex === songs.length - 1}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onMoveSong(song.id, 'down');
                                      }}
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 shrink-0 rounded-xl hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-400 transition-all active:scale-[0.9]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveSong(song.id);
                                  }}
                                  aria-label={`Remover ${song.songs?.title || 'canción'}`}
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add song button - always visible, even in non-edit mode */}
                    <Button
                      variant="ghost"
                      className="w-full mt-4 h-12 rounded-xl border border-dashed border-white/10 hover:border-secondary/40 hover:bg-secondary/5 text-sm font-semibold text-muted-foreground hover:text-secondary transition-all active:scale-[0.98]"
                      onClick={() => onAddSong(section.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar canción
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
