import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ListMusic,
  MessageSquare,
  Maximize2,
  Minimize2,
  StopCircle,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

interface BottomControlsProps {
  showSongList: boolean;
  setShowSongList: (show: boolean) => void;
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  showParticipants: boolean;
  setShowParticipants: (show: boolean) => void;
  commentsCount: number;
  songsCount: number;
  participantsCount?: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  canEndSession: boolean;
  onEndSessionClick: () => void;
}

export function BottomControls({
  showSongList,
  setShowSongList,
  showChat,
  setShowChat,
  showParticipants,
  setShowParticipants,
  commentsCount,
  songsCount,
  participantsCount = 0,
  isFullscreen,
  onToggleFullscreen,
  canEndSession,
  onEndSessionClick,
}: BottomControlsProps) {

  const ToggleButton = ({
    active,
    onClick,
    icon: Icon,
    label,
    badge,
  }: {
    active: boolean;
    onClick: () => void;
    icon: any;
    label: string;
    badge?: number;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all active:scale-95 ${
            active
              ? "bg-secondary/15 text-secondary"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <div className="relative">
            <Icon className="w-5 h-5" />
            {badge !== undefined && badge > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-secondary rounded-full text-[9px] flex items-center justify-center text-primary font-bold px-1">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium leading-none">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{active ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}</TooltipContent>
    </Tooltip>
  );

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-40"
    >
      <div className="max-w-7xl mx-auto">
        <div
          className="flex items-center justify-between px-2 sm:px-4 py-2 rounded-2xl"
          style={{
            background:
              "linear-gradient(145deg, hsl(217 33% 14% / 0.95) 0%, hsl(222 47% 8% / 0.95) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px solid hsl(217 33% 25% / 0.5)",
            boxShadow: "0 -4px 30px hsl(222 47% 5% / 0.5)",
          }}
        >
          {/* Toggle buttons */}
          <div className="flex items-center gap-1">
            <ToggleButton
              active={showSongList}
              onClick={() => setShowSongList(!showSongList)}
              icon={ListMusic}
              label="Lista"
              badge={songsCount}
            />
            <ToggleButton
              active={showChat}
              onClick={() => setShowChat(!showChat)}
              icon={MessageSquare}
              label="Chat"
              badge={commentsCount}
            />
            <ToggleButton
              active={showParticipants}
              onClick={() => setShowParticipants(!showParticipants)}
              icon={Users}
              label="Equipo"
            />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleFullscreen}
                  className="text-muted-foreground hover:text-foreground h-9 w-9"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isFullscreen
                  ? "Salir de pantalla completa"
                  : "Pantalla completa"}
              </TooltipContent>
            </Tooltip>

            {canEndSession && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    onClick={onEndSessionClick}
                    className="gap-2 h-9 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Finalizar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Finalizar culto en vivo</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
