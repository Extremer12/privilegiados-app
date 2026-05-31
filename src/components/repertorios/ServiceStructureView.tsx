import { useState, useMemo, useCallback } from 'react';
import { 
  Music, Heart, BookOpen, Gift, MessageSquare, Sparkles, Flag,
  ChevronDown, ChevronUp, Plus, X, Edit2, Check,
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
  DragStartEvent,
  DragOverlay,
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
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { toast } from 'sonner';

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
  /** Whether the current user is authorized to reorder (admin/leader/owner) */
  canReorder?: boolean;
}

// --- Sortable Song Item ---
function SortableSongItem({ 
  song, 
  songIndex, 
  isEditing, 
  canDrag,
  onSongClick, 
  onRemoveSong 
}: { 
  song: SetlistSong; 
  songIndex: number; 
  isEditing: boolean;
  canDrag: boolean;
  onSongClick: (song: SetlistSong) => void;
  onRemoveSong: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: song.id,
    disabled: !canDrag,
    data: {
      type: 'song',
      sectionId: song.section
    }
  });

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-center p-4 rounded-xl border border-dashed border-secondary/40 bg-secondary/[0.02] text-secondary text-xs font-bold uppercase tracking-widest min-h-[58px] select-none transition-all duration-300"
      >
        <span className="opacity-40 mr-3 text-secondary font-black">✦</span>
        Suelta aquí para insertar
        <span className="opacity-40 ml-3 text-secondary font-black">✦</span>
      </div>
    );
  }

  const styleConfig: Record<string, string> = {
    alabanza: "border-blue-500/30 text-blue-400 bg-blue-500/10",
    adoracion: "border-purple-500/30 text-purple-400 bg-purple-500/10",
    especial: "border-amber-500/30 text-amber-400 bg-amber-500/10",
    otro: "border-neutral-500/30 text-neutral-400 bg-neutral-500/10"
  };

  const tagStyle = styleConfig[song.songs?.category || "otro"] || styleConfig.otro;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#070c1b]/60 backdrop-blur-xl border border-white/[0.04] hover:border-secondary/25 transition-all group select-none hover:-translate-y-0.5 shadow-md shadow-black/20"
    >
      {/* Grip handle — visible when user can drag (authorized), not just editing */}
      {canDrag && (
        <div 
          {...attributes} 
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 -ml-2 text-neutral-500 hover:text-secondary transition-colors touch-none flex-shrink-0"
        >
          <GripVertical className="h-5 w-5" />
        </div>
      )}

      {/* Number badge */}
      <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-neutral-400">
          {songIndex + 1}
        </span>
      </div>

      {/* Song info */}
      <div 
        className="flex-1 cursor-pointer min-w-0"
        onClick={() => onSongClick(song)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-black text-white group-hover:text-secondary transition-colors truncate">
              {song.songs?.title || 'Sin título'}
            </p>
            <p className="text-[11px] text-neutral-400 font-bold mt-0.5">
              Tono: <span className="text-secondary">{song.songs?.key || "G"}</span> &bull; 4:20
            </p>
          </div>

          {/* Category Pill Tag */}
          <Badge variant="outline" className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${tagStyle}`}>
            {song.songs?.category || "otro"}
          </Badge>
        </div>
      </div>
      
      {/* Remove action — only in editing mode */}
      {isEditing && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-all active:scale-[0.9]"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveSong(song.id);
          }}
          aria-label={`Remover ${song.songs?.title || 'canción'}`}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// --- Static Song Item (for DragOverlay) ---
function SongOverlayItem({ song, songIndex }: { song: SetlistSong; songIndex: number }) {
  return (
    <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#070c1b] border border-secondary/50 shadow-2xl shadow-secondary/15 select-none w-full max-w-lg">
      <div className="p-2 -ml-2 text-secondary">
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-neutral-400">{songIndex + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-black text-secondary truncate">
          {song.songs?.title || 'Sin título'}
        </p>
        <p className="text-[11px] text-neutral-500 font-bold mt-0.5">
          Tono: {song.songs?.key || "G"}
        </p>
      </div>
    </div>
  );
}

// --- Static Section Overlay (for DragOverlay) ---
function SectionOverlayItem({ section, songCount }: { section: SectionConfig; songCount: number }) {
  const Icon = iconMap[section.icon] || Sparkles;
  return (
    <div className="mb-4">
      <Card className="rounded-2xl border-2 border-secondary/50 bg-[#1a1f2c] shadow-2xl shadow-secondary/20 overflow-hidden">
        <CardHeader className="py-5 px-5 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="p-1 -ml-2 text-secondary">
                <GripVertical className="h-5 w-5" />
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-white/[0.05] shrink-0 ${section.color}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base md:text-lg font-semibold tracking-wide text-secondary">
                  {section.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-secondary/15 text-secondary">
              {songCount}
            </span>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

// --- Section Content (non-sortable wrapper for songs DnD) ---
function SectionSongList({
  section,
  songs,
  isEditing,
  canDrag,
  onAddSong,
  onRemoveSong,
  onSongClick,
}: {
  section: SectionConfig;
  songs: SetlistSong[];
  isEditing: boolean;
  canDrag: boolean;
  onAddSong: (sectionId: string) => void;
  onRemoveSong: (songId: string) => void;
  onSongClick: (song: SetlistSong) => void;
}) {
  return (
    <CardContent className="px-5 md:px-6 pb-5 pt-0">
      {songs.length === 0 ? (
        <div className="py-6 border-t border-white/5 text-center">
          <p className="text-sm text-muted-foreground/60">Sin canciones asignadas</p>
        </div>
      ) : (
        <div className="space-y-2 border-t border-white/5 pt-4">
          <SortableContext items={songs.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {songs.map((song, songIdx) => (
              <SortableSongItem 
                key={song.id} 
                song={song} 
                songIndex={songIdx} 
                isEditing={isEditing} 
                canDrag={canDrag}
                onSongClick={onSongClick}
                onRemoveSong={onRemoveSong}
              />
            ))}
          </SortableContext>
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
  );
}

// --- Sortable Section Item ---
function SortableSectionItem({
  section,
  index,
  isEditing,
  canDrag,
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
}: {
  section: SectionConfig;
  index: number;
  isEditing: boolean;
  canDrag: boolean;
  isExpanded: boolean;
  toggleSection: (id: string) => void;
  isRenaming: boolean;
  editingName: string;
  setEditingName: (name: string) => void;
  saveSectionName: (id: string) => void;
  setEditingSectionId: (id: string | null) => void;
  deleteSection: (index: number) => void;
  songs: SetlistSong[];
  onAddSong: (section: string) => void;
  onRemoveSong: (songId: string) => void;
  onSongClick: (song: SetlistSong) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: section.id,
    disabled: !canDrag,
    data: {
      type: 'section'
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 40 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const Icon = iconMap[section.icon] || Sparkles;

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
              <div className="flex items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Grip handle for sections — visible when canDrag */}
                  {canDrag && (
                    <div 
                      {...attributes} 
                      {...listeners}
                      className="cursor-grab active:cursor-grabbing p-2 -ml-2 text-muted-foreground/40 hover:text-secondary transition-colors touch-none flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-6 w-6" />
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
            <SectionSongList
              section={section}
              songs={songs}
              isEditing={isEditing}
              canDrag={canDrag}
              onAddSong={onAddSong}
              onRemoveSong={onRemoveSong}
              onSongClick={onSongClick}
            />
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
  isEditing,
  canReorder = false,
}: ServiceStructureViewProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    sections.map(s => s.id)
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeDragItem, setActiveDragItem] = useState<{
    type: 'section' | 'song';
    id: string;
  } | null>(null);

  // Allow dragging when editing OR when canReorder is true (authorized user)
  const canDrag = isEditing || canReorder;

  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { distance: 5 } 
    }),
    useSensor(TouchSensor, { 
      activationConstraint: { 
        delay: 150, 
        tolerance: 5 
      } 
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  }, []);

  const deleteSection = useCallback((index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    onUpdateSections(newSections);
  }, [sections, onUpdateSections]);

  const addSection = useCallback(() => {
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
  }, [sections, onUpdateSections]);

  const saveSectionName = useCallback((id: string) => {
    const newSections = sections.map(s => s.id === id ? { ...s, name: editingName } : s);
    onUpdateSections(newSections);
    setEditingSectionId(null);
  }, [sections, editingName, onUpdateSections]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    setActiveDragItem({
      type: activeData?.type === 'section' ? 'section' : 'song',
      id: String(active.id),
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);
    
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    
    if (activeData?.type === 'section') {
      // --- Reordering sections ---
      const overSectionId = overData?.type === 'song' ? overData.sectionId : over.id;
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === overSectionId);
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newSections = arrayMove(sections, oldIndex, newIndex);
        onUpdateSections(newSections);
        toast.success('Secciones reordenadas', {
          description: 'El orden se guardará automáticamente.',
          duration: 2000,
        });
      }
    } else if (activeData?.type === 'song') {
      // --- Reordering songs within same section ---
      const activeSectionId = activeData.sectionId;
      const overSectionId = overData?.type === 'song' ? overData.sectionId : over.id;
      
      if (activeSectionId === overSectionId) {
        const sectionSongs = songsBySection[activeSectionId] || [];
        const oldIndex = sectionSongs.findIndex(s => s.id === active.id);
        const newIndex = sectionSongs.findIndex(s => s.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newSongs = arrayMove(sectionSongs, oldIndex, newIndex);
          if (onReorderSongs) {
            onReorderSongs(activeSectionId, newSongs.map(s => s.id));
            toast.success('Canciones reordenadas', {
              duration: 2000,
            });
          }
        }
      }
    }
  }, [sections, songsBySection, onUpdateSections, onReorderSongs]);

  // Find active item data for DragOverlay
  const activeSong = useMemo(() => {
    if (!activeDragItem || activeDragItem.type !== 'song') return null;
    for (const sectionSongs of Object.values(songsBySection)) {
      const found = sectionSongs.find(s => s.id === activeDragItem.id);
      if (found) return { song: found, index: sectionSongs.indexOf(found) };
    }
    return null;
  }, [activeDragItem, songsBySection]);

  const activeSection = useMemo(() => {
    if (!activeDragItem || activeDragItem.type !== 'section') return null;
    return sections.find(s => s.id === activeDragItem.id) || null;
  }, [activeDragItem, sections]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Estructura del Servicio
          </h2>
          <HelpTooltip
            title="Estructura del Servicio"
            description="Organiza las canciones por secciones según el flujo típico de un culto. Puedes arrastrar para reordenar secciones y canciones."
            example="Alabanza → Adoración → Ofrenda → Palabra → Cierre"
          />
        </div>
        <div className="flex items-center gap-2">
          {canDrag && !isEditing && (
            <span className="text-[10px] font-bold text-secondary/60 uppercase tracking-widest hidden sm:inline">
              Arrastra para reordenar
            </span>
          )}
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
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section, index) => (
            <SortableSectionItem
              key={section.id}
              section={section}
              index={index}
              isEditing={isEditing}
              canDrag={canDrag}
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
            />
          ))}
        </SortableContext>

        {/* DragOverlay for visual feedback */}
        <DragOverlay>
          {activeDragItem?.type === 'song' && activeSong ? (
            <SongOverlayItem song={activeSong.song} songIndex={activeSong.index} />
          ) : activeDragItem?.type === 'section' && activeSection ? (
            <SectionOverlayItem 
              section={activeSection} 
              songCount={(songsBySection[activeSection.id] || []).length} 
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
