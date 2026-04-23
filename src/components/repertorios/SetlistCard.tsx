import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Play, Eye, Trash2,
  CheckCircle2, Clock, FileEdit 
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Setlist } from './types';

interface SetlistCardProps {
  setlist: Setlist;
  songsCount: number;
  onView: () => void;
  onStartLive: () => void;
  onDelete?: () => void;
  isOwner: boolean;
}

const statusConfig = {
  draft: { 
    label: 'Borrador', 
    icon: FileEdit, 
    dotColor: 'bg-amber-400',
    textColor: 'text-amber-400',
  },
  ready: { 
    label: 'Listo', 
    icon: CheckCircle2, 
    dotColor: 'bg-emerald-400',
    textColor: 'text-emerald-400',
  },
  completed: { 
    label: 'Completado', 
    icon: Clock, 
    dotColor: 'bg-sky-400',
    textColor: 'text-sky-400',
  },
};

export function SetlistCard({ 
  setlist, 
  songsCount, 
  onView, 
  onStartLive, 
  onDelete, 
}: SetlistCardProps) {
  const status = statusConfig[setlist.status] || statusConfig.draft;
  const serviceDate = new Date(setlist.service_date);
  const isToday = format(new Date(), 'yyyy-MM-dd') === format(serviceDate, 'yyyy-MM-dd');
  const isPast = serviceDate < new Date() && !isToday;

  return (
    <Card className={`relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-lg group ${
      isToday 
        ? 'border-secondary/50 bg-gradient-to-br from-secondary/10 to-background shadow-secondary/10' 
        : isPast
          ? 'border-white/5 bg-white/[0.02] opacity-70'
          : 'border-white/10 bg-gradient-to-br from-neutral-900/80 to-background hover:border-secondary/30'
    }`}>
      <CardHeader className="pb-3 relative z-10">
        <div className="space-y-3">
          {/* Status + Date row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status.dotColor}`} />
              <span className={`text-xs font-semibold tracking-wide ${status.textColor}`}>
                {status.label}
              </span>
            </div>
            {isToday && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/20 border border-secondary/30">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                <span className="text-xs font-bold text-secondary">HOY</span>
              </div>
            )}
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-secondary transition-colors line-clamp-2 leading-snug">
            {setlist.title}
          </h3>
          
          {/* Date */}
          <p className="text-sm text-muted-foreground font-medium capitalize">
            {format(serviceDate, "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 relative z-10 pt-0">
        {/* Verse */}
        {setlist.theme_verse && (
          <div className="py-3 px-4 bg-white/[0.04] rounded-xl border border-white/5">
            <p className="text-sm italic text-muted-foreground leading-relaxed line-clamp-2">
              "{setlist.theme_verse}"
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-secondary">{songsCount}</span>
            <span className="text-xs text-muted-foreground font-medium">canciones</span>
          </div>
          {setlist.service_director && (
            <div className="flex-1 min-w-0 border-l border-white/10 pl-4">
              <p className="text-sm font-medium text-foreground/80 truncate">
                {setlist.service_director}
              </p>
              <p className="text-xs text-muted-foreground">Director</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={onView}
            variant="ghost"
            className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-foreground text-sm font-semibold transition-all active:scale-[0.97]"
          >
            <Eye className="w-4 h-4 mr-2" />
            Detalles
          </Button>
          
          <Button
            onClick={onStartLive}
            className="flex-1 h-12 rounded-xl bg-secondary text-primary-foreground hover:opacity-90 font-bold text-sm shadow-lg shadow-secondary/20 transition-all active:scale-[0.97]"
          >
            <Play className="w-4 h-4 mr-2" />
            En Vivo
          </Button>

          {onDelete && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              variant="ghost"
              size="icon"
              className="h-12 w-12 shrink-0 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-[0.95]"
              aria-label="Eliminar repertorio"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
