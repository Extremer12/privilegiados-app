import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Play, Eye, Trash2,
  CheckCircle2, Clock, FileEdit, Music, Calendar,
  Mic, User
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
  onDelete?: () => void;
  isOwner: boolean;
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
  onDelete, 
}: SetlistCardProps) {
  const status = statusConfig[setlist.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const serviceDate = new Date(setlist.service_date);
  const isToday = format(new Date(), 'yyyy-MM-dd') === format(serviceDate, 'yyyy-MM-dd');

  return (
    <Card 
      className={`relative overflow-hidden rounded-[2.5rem] border transition-all duration-300 active:scale-[0.98] ${
        isToday 
          ? 'border-secondary/50 bg-[#1A1F2C] shadow-2xl shadow-secondary/20' 
          : 'border-white/10 bg-[#12141C] shadow-xl'
      }`}
    >
      {/* Background Gradient Accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${status.gradient} blur-2xl opacity-50`} />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex flex-col gap-5">
          {/* Header Section */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${status.bgColor} ${status.color} border ${status.borderColor} rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider`}>
                  <StatusIcon className="w-3 h-3 mr-1.5" />
                  {status.label}
                </Badge>
                {isToday && (
                  <Badge className="bg-secondary text-primary-foreground font-black px-3 py-1 rounded-full text-[10px] animate-pulse">
                    HOY
                  </Badge>
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-tight mt-2 line-clamp-2">
                {setlist.title}
              </h3>
            </div>
            
            <div className="flex flex-col items-end shrink-0">
              <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5 flex flex-col items-center min-w-[50px]">
                <span className="text-lg font-black text-secondary leading-none">{songsCount}</span>
                <Music className="w-3 h-3 text-secondary/60 mt-1" />
              </div>
            </div>
          </div>

          {/* Date & Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Fecha</p>
                <p className="text-sm font-bold text-white/90 capitalize truncate">
                  {format(serviceDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
              </div>
            </div>
            {setlist.service_director && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Director</p>
                  <p className="text-sm font-bold text-white/90 truncate">{setlist.service_director}</p>
                </div>
              </div>
            )}
          </div>

          {/* Secondary Info */}
          {setlist.preacher && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] rounded-2xl border border-white/5">
              <Mic className="w-4 h-4 text-secondary/80" />
              <p className="text-xs font-semibold text-white/70">
                <span className="text-secondary/60 mr-1">Palabra:</span> {setlist.preacher}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <Button
              onClick={onView}
              className="flex-1 h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/5"
            >
              <Eye className="w-5 h-5 mr-2" />
              Ver Detalles
            </Button>
            
            <Button
              onClick={onStartLive}
              className="flex-[1.2] h-14 rounded-2xl bg-secondary text-primary-foreground hover:opacity-90 font-black text-sm shadow-xl shadow-secondary/20 transition-all active:scale-95"
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              INICIAR VIVO
            </Button>

            {onDelete && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                variant="ghost"
                className="h-14 w-14 shrink-0 rounded-2xl bg-red-500/5 hover:bg-red-500/20 text-red-400 transition-all border border-red-500/10"
              >
                <Trash2 className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
