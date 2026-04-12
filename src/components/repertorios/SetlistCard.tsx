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
    <Card className="card-gradient border-secondary/20 group overflow-hidden hover:border-secondary/40 hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isToday && (
                <Badge variant="default" className="bg-secondary text-primary-foreground animate-pulse">
                  ¡HOY!
                </Badge>
              )}
              <Badge className={status.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <h3 className="font-bold text-lg text-foreground group-hover:text-secondary transition-colors line-clamp-1">
              {setlist.title}
            </h3>
            {setlist.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {setlist.description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Versículo temático */}
        {setlist.theme_verse && (
          <div className="bg-secondary/20 rounded-lg p-3 border-l-4 border-secondary">
            <p className="text-sm italic text-muted-foreground">
              "{setlist.theme_verse}"
            </p>
          </div>
        )}

        {/* Info del servicio */}
        <div className="grid grid-cols-2 gap-3 text-foreground">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-secondary" />
            <span className="capitalize">
              {format(serviceDate, "EEEE d 'de' MMMM", { locale: es })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Music2 className="h-4 w-4 text-secondary" />
            <span>{songsCount} {songsCount === 1 ? 'canción' : 'canciones'}</span>
          </div>
          {setlist.service_director && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <Users className="h-4 w-4 text-secondary" />
              <span>Dirección: <strong>{setlist.service_director}</strong></span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-2 border-t border-secondary/20">
          <Button
            onClick={onView}
            variant="outline"
            size="sm"
            className="flex-1 gap-2 border-secondary/30 hover:bg-secondary/20 text-foreground"
          >
            <Settings className="h-4 w-4" />
            Editar
          </Button>
          
          <Button
            onClick={onStartLive}
            size="sm"
            className="flex-1 gap-2 bg-gradient-to-r from-secondary to-accent text-primary-foreground hover:opacity-90"
          >
            <Play className="h-4 w-4" />
            En Vivo
          </Button>

          {isOwner && onDelete && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              variant="destructive"
              size="icon"
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
