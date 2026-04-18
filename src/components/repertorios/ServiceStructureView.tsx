import { useState } from 'react';
import { 
  Music, Heart, BookOpen, Gift, MessageSquare, Sparkles, Flag,
  ChevronDown, ChevronUp, Plus, GripVertical, X, ArrowUp, ArrowDown, Edit2, Check
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
  onSongClick: (song: SetlistSong) => void;
  isEditing: boolean;
}

export function ServiceStructureView({ 
  sections,
  onUpdateSections,
  songsBySection, 
  onAddSong, 
  onRemoveSong,
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
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-extralight tracking-tight text-foreground">Estructura del Servicio</h2>
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
            className="squircle-sm border-white/[0.05] bg-white/[0.02] hover:bg-secondary hover:text-primary-foreground transition-all duration-300 gap-2 text-xs"
          >
            <Plus className="h-4 w-4" />
            Añadir Sección
          </Button>
        )}
      </div>

      <div className="space-y-6">
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
              <Card className={`
                squircle border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-300 overflow-hidden
                ${songs.length > 0 ? 'border-l-2 border-l-secondary/40' : 'border-l-transparent'}
              `}>
                <CollapsibleTrigger asChild>
                  <CardHeader className={`cursor-pointer py-6 px-8 ${isRenaming ? 'pointer-events-none' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <div className={`w-10 h-10 squircle-sm flex items-center justify-center bg-white/[0.03] shrink-0 ${section.color}`}>
                          <Icon className="h-5 w-5 opacity-60" />
                        </div>
                        <div className="flex-1">
                          {isRenaming ? (
                            <div className="flex items-center gap-2 pointer-events-auto">
                              <Input 
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="max-w-[250px] h-8 bg-black/20 border-white/10"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveSectionName(section.id);
                                }}
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400" onClick={() => saveSectionName(section.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <CardTitle className="text-lg font-light tracking-wide text-foreground/90 flex items-center gap-2">
                                {section.name}
                                {isEditing && (
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-white/10 text-muted-foreground transition-opacity" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSectionId(section.id);
                                      setEditingName(section.name);
                                    }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </CardTitle>
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/30 mt-1">
                                {section.description}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 pointer-events-auto">
                        {isEditing && !isRenaming && (
                          <div className="flex items-center gap-1 mr-4 bg-black/20 rounded-lg p-1 border border-white/5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-white disabled:opacity-30"
                              disabled={index === 0}
                              onClick={(e) => { e.stopPropagation(); moveSection(index, 'up'); }}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-white disabled:opacity-30"
                              disabled={index === sections.length - 1}
                              onClick={(e) => { e.stopPropagation(); moveSection(index, 'down'); }}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-red-400/50 hover:text-red-400 hover:bg-red-400/10"
                              onClick={(e) => { e.stopPropagation(); deleteSection(index); }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-secondary tracking-widest bg-secondary/10 px-2 py-0.5 rounded-full">
                          {songs.length}
                        </span>
                        {!isRenaming && (
                          isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground/30" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground/30" />
                          )
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="px-8 pb-8 pt-2">
                    {songs.length === 0 ? (
                      <div className="py-8 border-t border-white/[0.02] text-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/20 font-medium">
                          Sin canciones asignadas
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 border-t border-white/[0.02] pt-6">
                        {songs.map((song, songIndex) => (
                          <div
                            key={song.id}
                            className="flex items-center gap-6 p-6 squircle-sm bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] transition-all group"
                          >
                            <div className="w-8 h-8 rounded-full bg-secondary/5 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-secondary/40">
                                {songIndex + 1}
                              </span>
                            </div>
                            <div 
                              className="flex-1 cursor-pointer min-w-0"
                              onClick={() => onSongClick(song)}
                            >
                              <p className="text-xl font-light tracking-tight text-foreground/90 group-hover:text-secondary transition-colors truncate">
                                {song.songs?.title || 'Sin título'}
                              </p>
                              {(song.special_instructions || song.notes) && (
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mt-2 italic font-medium truncate">
                                  {song.special_instructions || song.notes}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-6 shrink-0">
                              {song.assigned_to && (
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-secondary/40" />
                                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">
                                    {song.assigned_to}
                                  </span>
                                </div>
                              )}
                              
                              {isEditing && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 squircle-sm hover:bg-destructive/10 text-muted-foreground/20 hover:text-destructive transition-all"
                                  onClick={() => onRemoveSong(song.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-6 h-12 squircle-sm border border-dashed border-white/[0.1] hover:border-secondary/30 hover:bg-secondary/5 text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/40 hover:text-secondary transition-all"
                        onClick={() => onAddSong(section.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar canción
                      </Button>
                    )}
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
