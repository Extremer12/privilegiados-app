import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Play, Eye, Trash2, Copy,
  CheckCircle2, Clock, FileEdit, Music, Calendar,
  Mic, User, Star
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Setlist } from './types';

interface SetlistCardProps {
  setlist: Setlist;
  songsCount: number;
  onView: () => void;
  onStartLive: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  isOwner: boolean;
  avgRating?: number;
}

const statusConfig = {
  draft: { 
    label: 'Borrador', 
    icon: FileEdit, 
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/20',
    borderColor: 'border-amber-400/30',
    gradient: 'from-amber-500/10 to-transparent'
  },
  ready: { 
    label: 'Listo para el Servicio', 
    icon: CheckCircle2, 
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/20',
    borderColor: 'border-emerald-400/30',
    gradient: 'from-emerald-500/10 to-transparent'
  },
  completed: { 
    label: 'Completado', 
    icon: Clock, 
    color: 'text-sky-400',
    bgColor: 'bg-sky-400/20',
    borderColor: 'border-sky-400/30',
    gradient: 'from-sky-500/10 to-transparent'
  },
};

export function SetlistCard({ 
  setlist, 
  songsCount, 
  onView, 
  onStartLive, 
  onDuplicate,
  onDelete, 
  avgRating
}: SetlistCardProps) {
  const status = statusConfig[setlist.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const serviceDate = new Date(setlist.service_date);
  const isToday = format(new Date(), 'yyyy-MM-dd') === format(serviceDate, 'yyyy-MM-dd');
  const isCompleted = setlist.status === 'completed';

  return (
    <Card 
      className={`relative overflow-hidden rounded-[2.5rem] border transition-all duration-300 active:scale-[0.98] ${
        isToday 
          ? 'border-secondary bg-card text-card-foreground shadow-2xl shadow-secondary/20' 
          : 'border-border bg-card text-card-foreground shadow-xl'
      }`}
    >
      {/* Background Gradient Accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${status.gradient} blur-2xl opacity-50`} />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex flex-col gap-5">
          {/* Header Section */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${status.bgColor} ${status.color} border ${status.borderColor} rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap`}>
                  <StatusIcon className="w-3 h-3 mr-1.5" />
                  {status.label}
                </Badge>
                {isToday && (
                  <Badge className="bg-secondary text-primary-foreground font-black px-2.5 py-0.5 rounded-full text-[9px] animate-pulse whitespace-nowrap">
                    HOY
                  </Badge>
                )}
                {isCompleted && avgRating !== undefined && (
                  <Badge className="bg-secondary/10 text-secondary border-secondary/20 font-black px-2.5 py-0.5 rounded-full text-[9px] flex items-center gap-1 whitespace-nowrap">
                    <Star className="w-2.5 h-2.5 fill-secondary" />
                    {avgRating.toFixed(1)}
                  </Badge>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight mt-1 line-clamp-2">
                {setlist.title}
              </h3>
            </div>
            
            <div className="shrink-0">
              <div className="bg-muted rounded-2xl p-2 sm:p-3 border border-border flex flex-col items-center min-w-[45px] sm:min-w-[60px]">
                <span className="text-base sm:text-xl font-black text-secondary leading-none">{songsCount}</span>
                <Music className="w-3 h-3 text-secondary/60 mt-1" />
              </div>
            </div>
          </div>
 
          {/* Date & Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-secondary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Fecha</p>
                <p className="text-sm font-bold text-foreground/90 capitalize truncate">
                  {format(serviceDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
              </div>
            </div>
            {setlist.service_director && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Director</p>
                  <p className="text-sm font-bold text-foreground/90 truncate">{setlist.service_director}</p>
                </div>
              </div>
            )}
          </div>
 
          {/* Secondary Info */}
          {setlist.preacher && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-muted/50 rounded-2xl border border-border">
              <Mic className="w-4 h-4 text-secondary/80 shrink-0" />
              <p className="text-xs font-semibold text-muted-foreground truncate">
                <span className="text-secondary/60 mr-1">Palabra:</span> {setlist.preacher}
              </p>
            </div>
          )}
 
          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-2">
            <div className="flex gap-3 flex-1">
              <Button
                onClick={onView}
                className="flex-1 h-12 sm:h-14 rounded-2xl bg-muted hover:bg-muted/80 text-foreground font-bold text-sm transition-all border border-border"
              >
                <Eye className="w-5 h-5 mr-2" />
                <span className="sm:inline">Detalles</span>
              </Button>
              
              <Button
                onClick={onStartLive}
                disabled={isCompleted || songsCount === 0}
                className={`flex-[1.2] h-12 sm:h-14 rounded-2xl bg-secondary text-primary-foreground font-black text-sm shadow-xl transition-all active:scale-95 ${
                  isCompleted 
                    ? 'bg-muted text-muted-foreground shadow-none border border-border' 
                    : songsCount === 0 
                      ? 'opacity-50 cursor-not-allowed shadow-none' 
                      : 'hover:opacity-90 shadow-secondary/20'
                }`}
              >
                <Play className="w-5 h-5 mr-2 fill-current" />
                {isCompleted ? 'FINAL' : 'VIVO'}
              </Button>
            </div>
 
            <div className="flex gap-3 sm:w-auto">
              {onDuplicate && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                  variant="ghost"
                  className="flex-1 sm:h-14 sm:w-14 h-12 rounded-2xl bg-muted hover:bg-secondary/10 text-muted-foreground hover:text-secondary transition-all border border-border"
                  title="Duplicar"
                >
                  <Copy className="h-5 w-5" />
                </Button>
              )}
              
              {onDelete && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  variant="ghost"
                  className="flex-1 sm:h-14 sm:w-14 h-12 rounded-2xl bg-red-500/5 hover:bg-red-500/20 text-red-400 transition-all border border-red-500/10"
                >
                  <Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
