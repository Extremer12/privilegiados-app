import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Play, Eye, Trash2,
  CheckCircle2, Clock, FileEdit, Music, Calendar
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
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/20',
  },
  ready: { 
    label: 'Listo', 
    icon: CheckCircle2, 
    dotColor: 'bg-emerald-400',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/20',
  },
  completed: { 
    label: 'Completado', 
    icon: Clock, 
    dotColor: 'bg-sky-400',
    textColor: 'text-sky-400',
    bgColor: 'bg-sky-400/10',
    borderColor: 'border-sky-400/20',
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
  const StatusIcon = status.icon;
  const serviceDate = new Date(setlist.service_date);
  const isToday = format(new Date(), 'yyyy-MM-dd') === format(serviceDate, 'yyyy-MM-dd');
  const isPast = serviceDate < new Date() && !isToday;

  return (
    <Card className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-1 ${
      isToday 
        ? 'border-secondary/40 bg-gradient-to-br from-secondary/15 via-secondary/5 to-background shadow-xl shadow-secondary/15' 
        : isPast
          ? 'border-white/[0.04] bg-white/[0.01] opacity-60 hover:opacity-80'
          : 'border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent hover:border-white/[0.15] hover:shadow-xl hover:shadow-black/20'
    }`}>
      {/* Accent line for today */}
      {isToday && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-secondary via-secondary/80 to-secondary/40" />
      )}

      {/* Background glow */}
      <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 ${
        isToday 
          ? 'bg-secondary/20 opacity-100' 
          : 'bg-secondary/10 opacity-0 group-hover:opacity-60'
      }`} />

      <CardHeader className="pb-2 relative z-10 px-5 pt-5">
        <div className="space-y-3">
          {/* Status + Today badge row */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bgColor} border ${status.borderColor}`}>
              <StatusIcon className={`w-3.5 h-3.5 ${status.textColor}`} />
              <span className={`text-[11px] font-bold tracking-wide uppercase ${status.textColor}`}>
                {status.label}
              </span>
            </div>
            {isToday && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/20 border border-secondary/30">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                <span className="text-[11px] font-black text-secondary tracking-wider">HOY</span>
              </div>
            )}
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-secondary transition-colors line-clamp-2 leading-snug">
            {setlist.title}
          </h3>
          
          {/* Date */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <p className="text-sm font-medium capitalize">
              {format(serviceDate, "EEEE d 'de' MMMM", { locale: es })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 relative z-10 pt-0 px-5 pb-5">
        {/* Verse */}
        {setlist.theme_verse && (
          <div className="py-3 px-4 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
            <p className="text-sm italic text-muted-foreground/80 leading-relaxed line-clamp-2">
              "{setlist.theme_verse}"
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-secondary/10 border border-secondary/15">
            <Music className="w-4 h-4 text-secondary" />
            <span className="text-lg font-black text-secondary">{songsCount}</span>
            <span className="text-xs text-secondary/70 font-medium">canciones</span>
          </div>
          {setlist.service_director && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground/80 truncate">
                {setlist.service_director}
              </p>
              <p className="text-[11px] text-muted-foreground/60 font-medium">Director</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={onView}
            variant="ghost"
            className="flex-1 h-12 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-foreground text-sm font-semibold transition-all active:scale-[0.97] border border-white/[0.06]"
          >
            <Eye className="w-4 h-4 mr-2" />
            Detalles
          </Button>
          
          <Button
            onClick={onStartLive}
            className="flex-1 h-12 rounded-2xl bg-secondary text-primary-foreground hover:opacity-90 font-bold text-sm shadow-lg shadow-secondary/25 transition-all active:scale-[0.97]"
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
              className="h-12 w-12 shrink-0 rounded-2xl text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-[0.95] border border-transparent hover:border-red-500/20"
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
