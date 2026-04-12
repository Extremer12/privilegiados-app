import { 
  Music, Heart, BookOpen, Gift, MessageSquare, Sparkles, Flag, LucideIcon 
} from 'lucide-react';
import { SECTION_TYPES, SectionType } from './types';

const iconMap: Record<string, LucideIcon> = {
  Music,
  Heart,
  BookOpen,
  Gift,
  MessageSquare,
  Sparkles,
  Flag,
};

interface SectionBadgeProps {
  sectionId: SectionType;
  size?: 'sm' | 'md' | 'lg';
}

export function SectionBadge({ sectionId, size = 'md' }: SectionBadgeProps) {
  const section = SECTION_TYPES.find(s => s.id === sectionId);
  if (!section) return null;

  const Icon = iconMap[section.icon];
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full bg-secondary/80 font-medium ${sizeClasses[size]}`}
    >
      <Icon className={`${iconSize[size]} ${section.color}`} />
      <span className={section.color}>{section.name}</span>
    </span>
  );
}
