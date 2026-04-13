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
    <Card className="squircle border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05] hover:border-secondary/20 group transition-all duration-500 overflow-hidden shadow-2xl shadow-black/30">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <Badge className="bg-white/[0.03] text-muted-foreground/60 border-none px-2 py-0.5 text-[9px] uppercase tracking-widest font-bold">
                {status.label}
              </Badge>
              {isToday && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/10 border border-secondary/20">
                  <div className="w-1 h-1 rounded-full bg-secondary" />
                  <span className="text-[9px] uppercase tracking-widest text-secondary font-bold">Hoy</span>
                </div>
              )}
            </div>
            
            <h3 className="text-2xl font-light tracking-tight text-foreground group-hover:text-secondary transition-colors line-clamp-1">
              {setlist.title}
            </h3>
            
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/30 font-medium">
              {format(serviceDate, "EEEE d 'de' MMMM", { locale: es })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {setlist.theme_verse && (
          <div className="relative py-2">
            <p className="text-sm italic text-muted-foreground/60 font-light leading-relaxed border-l border-secondary/30 pl-4">
              "{setlist.theme_verse}"
            </p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">{songsCount}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium">Canciones</span>
          </div>
          {setlist.service_director && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium truncate">
                Dir. <span className="text-foreground/60">{setlist.service_director}</span>
              </p>
            </div>
          )}
        </div>

        {/* Acciones - Minimalist */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/[0.03]">
          <Button
            onClick={onView}
            variant="ghost"
            size="sm"
            className="flex-1 h-10 squircle-sm bg-white/[0.03] hover:bg-white/[0.08] text-foreground/70 text-xs font-light tracking-wide transition-all"
          >
            Detalles
          </Button>
          
          <Button
            onClick={onStartLive}
            size="sm"
            className="flex-1 h-10 squircle-sm bg-secondary text-primary-foreground hover:opacity-90 font-medium text-xs tracking-wide"
          >
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
              className="h-10 w-10 squircle-sm text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
