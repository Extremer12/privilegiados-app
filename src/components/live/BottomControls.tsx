import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Radio,
  Volume2,
  MessageSquare,
  Maximize2,
  Minimize2,
  StopCircle,
} from "lucide-react";
import { motion } from "framer-motion";

interface BottomControlsProps {
  showSongList: boolean;
  setShowSongList: (show: boolean) => void;
  showVoiceChannel: boolean;
  setShowVoiceChannel: (show: boolean) => void;
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  commentsCount: number;
  songsCount: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  canEndSession: boolean;
  onEndSessionClick: () => void;
}

export function BottomControls({
  showSongList,
  setShowSongList,
  showVoiceChannel,
  setShowVoiceChannel,
  showChat,
  setShowChat,
  commentsCount,
  songsCount,
  isFullscreen,
  onToggleFullscreen,
  canEndSession,
  onEndSessionClick,
}: BottomControlsProps) {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-0 left-0 right-0 p-4 z-40"
    >
      <div className="max-w-7xl mx-auto">
        <div
          className="flex items-center justify-between p-4 rounded-2xl"
          style={{
            background:
              "linear-gradient(145deg, hsl(217 33% 14% / 0.9) 0%, hsl(222 47% 8% / 0.9) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px solid hsl(217 33% 25% / 0.5)",
          }}
        >
          {/* Left controls */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSongList(!showSongList)}
                    className={
                      showSongList ? "text-secondary" : "text-muted-foreground"
                    }
                  >
                    <Radio className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showSongList ? "Ocultar lista" : "Mostrar lista"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowVoiceChannel(!showVoiceChannel)}
                    className={
                      showVoiceChannel
                        ? "text-secondary"
                        : "text-muted-foreground"
                    }
                  >
                    <Volume2 className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showVoiceChannel
                    ? "Ocultar canal de voz"
                    : "Mostrar canal de voz"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowChat(!showChat)}
                    className={
                      showChat ? "text-secondary" : "text-muted-foreground"
                    }
                  >
                    <MessageSquare className="w-5 h-5" />
                    {commentsCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-secondary rounded-full text-[10px] flex items-center justify-center text-primary">
                        {commentsCount > 99 ? "99+" : commentsCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showChat ? "Ocultar chat" : "Mostrar chat"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Center info */}
          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <span>🎵 {songsCount} canciones</span>
            <span className="text-border">|</span>
            <span>💬 {commentsCount} mensajes</span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleFullscreen}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-5 h-5" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
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
                      className="gap-2 h-10 px-3 md:px-4"
                    >
                      <StopCircle className="w-4 h-4" />
                      <span className="hidden md:inline">Finalizar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Finalizar sesión en vivo</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
