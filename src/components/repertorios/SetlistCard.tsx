import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, Music2, Users, Play, Eye, Trash2, Settings, 
  CheckCircle2, Clock, FileEdit 
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
    className: 'bg-muted text-muted-foreground' 
  },
  ready: { 
    label: 'Listo', 
    icon: CheckCircle2, 
    className: 'bg-green-500/20 text-green-400' 
  },
  completed: { 
    label: 'Completado', 
    icon: Clock, 
    className: 'bg-blue-500/20 text-blue-400' 
  },
};

export function SetlistCard({ 
  setlist, 
  songsCount, 
  onView, 
  onStartLive, 
  onDelete, 
  isOwner 
}: SetlistCardProps) {
  const status = statusConfig[setlist.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const serviceDate = new Date(setlist.service_date);
  const isToday = format(new Date(), 'yyyy-MM-dd') === format(serviceDate, 'yyyy-MM-dd');

  return (
    <Card className="squircle relative overflow-hidden bg-gradient-to-br from-neutral-900/80 to-background border border-white/10 hover:border-secondary/40 transition-all duration-500 shadow-xl group">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-secondary/10 blur-[40px] group-hover:bg-secondary/20 transition-all duration-500 pointer-events-none" />
      
      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <Badge className={`border-none px-2.5 py-0.5 text-[9px] uppercase tracking-widest font-bold ${status.className}`}>
                <StatusIcon className="w-3 h-3 mr-1 inline-block" />
                {status.label}
              </Badge>
              {isToday && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/20 border border-secondary/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  <span className="text-[9px] uppercase tracking-widest text-secondary font-bold">Hoy</span>
                </div>
              )}
            </div>
            
            <h3 className="text-2xl font-black tracking-tight text-foreground group-hover:text-secondary transition-colors line-clamp-1 mt-2">
              {setlist.title}
            </h3>
            
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              {format(serviceDate, "EEEE d 'de' MMMM", { locale: es })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative z-10">
        {setlist.theme_verse && (
          <div className="relative py-2 bg-white/5 rounded-lg p-3 border border-white/5">
            <p className="text-sm italic text-muted-foreground font-medium leading-relaxed">
              "{setlist.theme_verse}"
            </p>
          </div>
        )}

        <div className="flex items-center gap-6 bg-black/20 p-3 rounded-lg border border-white/5">
          <div className="flex flex-col">
            <span className="text-lg text-secondary font-black">{songsCount}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Canciones</span>
          </div>
          {setlist.service_director && (
            <div className="flex-1 min-w-0 border-l border-white/10 pl-4">
              <span className="text-foreground/80 font-semibold truncate block">
                {setlist.service_director}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block">
                Director
              </span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 pt-4">
          <Button
            onClick={onView}
            variant="ghost"
            size="sm"
            className="flex-1 h-10 bg-white/5 hover:bg-white/10 text-foreground text-xs font-bold tracking-wider uppercase transition-all"
          >
            Detalles
          </Button>
          
          <Button
            onClick={onStartLive}
            size="sm"
            className="flex-1 h-10 bg-secondary text-primary-foreground hover:opacity-90 font-bold text-xs tracking-wider uppercase shadow-lg shadow-secondary/20"
          >
            <Play className="w-3 h-3 mr-2" />
            En Vivo
          </Button>

          {isOwner && onDelete && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
