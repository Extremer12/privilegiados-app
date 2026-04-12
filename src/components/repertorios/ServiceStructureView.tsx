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
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-foreground">Estructura del Servicio</h2>
          <HelpTooltip
            title="Estructura del Servicio"
            description="Organiza las canciones por secciones según el flujo típico de un culto. Cada sección representa un momento diferente del servicio."
            example="Alabanza → Adoración → Ofrenda → Palabra → Cierre"
          />
        </div>
      </div>

      <div className="space-y-3">
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
                card-gradient border-secondary/20 border-l-4 transition-all duration-200
                ${songs.length > 0 ? 'border-l-secondary' : 'border-l-muted'}
              `}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-secondary/10 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-secondary/20 ${section.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-foreground">
                            {section.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {section.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {songs.length}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    {songs.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">No hay canciones en esta sección</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {songs.map((song, index) => (
                          <div
                            key={song.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors group"
                          >
                            {isEditing && (
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                            )}
                            <span className="text-sm font-mono text-muted-foreground w-6">
                              {index + 1}.
                            </span>
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => onSongClick(song)}
                            >
                              <p className="font-medium text-sm text-foreground group-hover:text-secondary transition-colors">
                                {song.songs?.title || 'Sin título'}
                              </p>
                              {(song.special_instructions || song.notes) && (
                                <p className="text-xs text-muted-foreground italic mt-0.5">
                                  {song.special_instructions || song.notes}
                                </p>
                              )}
                            </div>
                            {song.assigned_to && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                {song.assigned_to}
                              </div>
                            )}
                            {isEditing && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => onRemoveSong(song.id)}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 gap-2 border-secondary/30 hover:bg-secondary/20 text-foreground"
                        onClick={() => onAddSong(section.id)}
                      >
                        <Plus className="h-4 w-4" />
                        Agregar canción a {section.name}
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
