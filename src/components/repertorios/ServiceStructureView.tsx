import { useState, useMemo } from 'react';
import { 
  Music, Heart, BookOpen, Gift, MessageSquare, Sparkles, Flag,
  ChevronDown, ChevronUp, Plus, X, ArrowUp, ArrowDown, Edit2, Check,
  GripVertical, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SetlistSong } from './types';
import { HelpTooltip } from './HelpTooltip';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const iconMap: Record<string, React.ElementType> = {
  Music, Heart, BookOpen, Gift, MessageSquare, Sparkles, Flag,
};

export interface SectionConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface SongsBySection {
  [key: string]: SetlistSong[];
}

interface ServiceStructureViewProps {
  sections: SectionConfig[];
  onUpdateSections: (sections: SectionConfig[]) => void;
  songsBySection: SongsBySection;
  onAddSong: (section: string) => void;
  onRemoveSong: (songId: string) => void;
  onMoveSong?: (songId: string, direction: 'up' | 'down') => void;
  onReorderSongs?: (sectionId: string, songIds: string[]) => void;
  onSongClick: (song: SetlistSong) => void;
  isEditing: boolean;
}

// --- Sortable Song Item ---
function SortableSongItem({ 
  song, 
  songIndex, 
  isEditing, 
  onSongClick, 
  onRemoveSong 
}: { 
  song: SetlistSong, 
  songIndex: number, 
  isEditing: boolean, 
  onSongClick: (song: SetlistSong) => void,
  onRemoveSong: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all group ${isDragging ? 'shadow-2xl bg-white/[0.08] border-secondary/30' : ''}`}
    >
      {/* Grip handle */}
      {isEditing && (
        <div 
          {...attributes} 
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-2 text-muted-foreground/30 hover:text-secondary transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Number */}
      {!isDragging && (
        <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-secondary">
            {songIndex + 1}
          </span>
        </div>
      )}

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
      )}
    </div>
  );
}

// --- Sortable Section Item ---
function SortableSectionItem({
  section,
  index,
  isEditing,
  isExpanded,
  toggleSection,
  isRenaming,
  editingName,
  setEditingName,
  saveSectionName,
  setEditingSectionId,
  deleteSection,
  songs,
  onAddSong,
  onRemoveSong,
  onSongClick,
  onReorderSongs
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 40 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const Icon = iconMap[section.icon] || Sparkles;

  const handleDragEndSongs = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = songs.findIndex((s: any) => s.id === active.id);
      const newIndex = songs.findIndex((s: any) => s.id === over.id);
      const newSongs = arrayMove(songs, oldIndex, newIndex);
      onReorderSongs(section.id, newSongs.map((s: any) => s.id));
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Collapsible 
        open={isExpanded}
        onOpenChange={() => !isRenaming && toggleSection(section.id)}
      >
        <Card className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
          isDragging ? 'shadow-2xl border-secondary/50 ring-1 ring-secondary/20' : ''
        } ${
          songs.length > 0 
            ? 'border-l-[3px] border-l-secondary/60 border-white/10 bg-white/[0.02]' 
            : 'border-white/5 bg-white/[0.01]'
        }`}>
          <CollapsibleTrigger asChild>
            <CardHeader className={`cursor-pointer py-5 px-5 md:px-6 ${isRenaming ? 'pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Grip handle for sections */}
                  {isEditing && (
                    <div 
                      {...attributes} 
                      {...listeners}
                      className="cursor-grab active:cursor-grabbing p-1 -ml-2 text-muted-foreground/30 hover:text-secondary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-5 w-5" />
                    </div>
                  )}

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
                  {isEditing && !isRenaming && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl text-red-400/40 hover:text-red-400 hover:bg-red-400/10"
                      onClick={(e) => { e.stopPropagation(); deleteSection(index); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    songs.length > 0 ? 'bg-secondary/15 text-secondary' : 'bg-white/5 text-muted-foreground'
                  }`}>
                    {songs.length}
                  </span>

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
                  <p className="text-sm text-muted-foreground/60">Sin canciones asignadas</p>
                </div>
              ) : (
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <DndContext
                    sensors={useSensors(
                      useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
                      useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
                    )}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndSongs}
                  >
                    <SortableContext items={songs.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                      {songs.map((song: any, songIdx: number) => (
                        <SortableSongItem 
                          key={song.id} 
                          song={song} 
                          songIndex={songIdx} 
                          isEditing={isEditing} 
                          onSongClick={onSongClick}
                          onRemoveSong={onRemoveSong}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              <Button
                variant="ghost"
                className="w-full mt-4 h-12 rounded-xl border border-dashed border-white/10 hover:border-secondary/40 hover:bg-secondary/5 text-sm font-semibold text-muted-foreground hover:text-secondary transition-all"
                onClick={() => onAddSong(section.id)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar canción
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

export function ServiceStructureView({ 
  sections,
  onUpdateSections,
  songsBySection, 
  onAddSong, 
  onRemoveSong,
  onReorderSongs,
  onSongClick,
  isEditing 
}: ServiceStructureViewProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    sections.map(s => s.id)
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
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

  const handleDragEndSections = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      onUpdateSections(arrayMove(sections, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Estructura del Servicio
          </h2>
          <HelpTooltip
            title="Estructura del Servicio"
            description="Organiza las canciones por secciones según el flujo típico de un culto."
            example="Alabanza → Adoración → Ofrenda → Palabra → Cierre"
          />
        </div>
        {isEditing && (
          <Button
            onClick={addSection}
            variant="outline"
            size="sm"
            className="rounded-xl border-secondary/30 text-secondary hover:bg-secondary hover:text-primary-foreground transition-all gap-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Sección
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEndSections}
      >
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section, index) => (
            <SortableSectionItem
              key={section.id}
              section={section}
              index={index}
              isEditing={isEditing}
              isExpanded={expandedSections.includes(section.id)}
              toggleSection={toggleSection}
              isRenaming={editingSectionId === section.id}
              editingName={editingName}
              setEditingName={setEditingName}
              saveSectionName={saveSectionName}
              setEditingSectionId={setEditingSectionId}
              deleteSection={deleteSection}
              songs={songsBySection[section.id] || []}
              onAddSong={onAddSong}
              onRemoveSong={onRemoveSong}
              onSongClick={onSongClick}
              onReorderSongs={onReorderSongs}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
