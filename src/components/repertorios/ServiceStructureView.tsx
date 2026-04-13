import { useState } from 'react';
import { 
  Music, Heart, BookOpen, Gift, MessageSquare, Sparkles, Flag,
  ChevronDown, ChevronUp, Plus, GripVertical, X, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SECTION_TYPES, SetlistSong } from './types';
import { HelpTooltip } from './HelpTooltip';

const iconMap: Record<string, React.ElementType> = {
  Music,
  Heart,
  BookOpen,
  Gift,
  MessageSquare,
  Sparkles,
  Flag,
};

interface SongsBySection {
  [key: string]: SetlistSong[];
}

interface ServiceStructureViewProps {
  songsBySection: SongsBySection;
  onAddSong: (section: string) => void;
  onRemoveSong: (songId: string) => void;
  onSongClick: (song: SetlistSong) => void;
  isEditing: boolean;
}

export function ServiceStructureView({ 
  songsBySection, 
  onAddSong, 
  onRemoveSong,
  onSongClick,
  isEditing 
}: ServiceStructureViewProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    SECTION_TYPES.map(s => s.id)
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
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
      </div>

      <div className="space-y-6">
        {SECTION_TYPES.map((section) => {
          const Icon = iconMap[section.icon];
          const songs = songsBySection[section.id] || [];
          const isExpanded = expandedSections.includes(section.id);

          return (
            <Collapsible 
              key={section.id} 
              open={isExpanded}
              onOpenChange={() => toggleSection(section.id)}
            >
              <Card className={`
                squircle border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-300 overflow-hidden
                ${songs.length > 0 ? 'border-l-2 border-l-secondary/40' : 'border-l-transparent'}
              `}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer py-6 px-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className={`w-10 h-10 squircle-sm flex items-center justify-center bg-white/[0.03] ${section.color}`}>
                          <Icon className="h-5 w-5 opacity-60" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-light tracking-wide text-foreground/90">
                            {section.name}
                          </CardTitle>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/30 mt-1">
                            {section.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-secondary tracking-widest bg-secondary/10 px-2 py-0.5 rounded-full">
                          {songs.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground/30" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground/30" />
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
                        {songs.map((song, index) => (
                          <div
                            key={song.id}
                            className="flex items-center gap-6 p-6 squircle-sm bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] transition-all group"
                          >
                            {isEditing && (
                              <GripVertical className="h-4 w-4 text-muted-foreground/20 cursor-grab group-hover:text-secondary/40" />
                            )}
                            <div className="w-8 h-8 rounded-full bg-secondary/5 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-secondary/40">
                                {index + 1}
                              </span>
                            </div>
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => onSongClick(song)}
                            >
                              <p className="text-xl font-light tracking-tight text-foreground/90 group-hover:text-secondary transition-colors">
                                {song.songs?.title || 'Sin título'}
                              </p>
                              {(song.special_instructions || song.notes) && (
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mt-2 italic font-medium">
                                  {song.special_instructions || song.notes}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-6">
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
