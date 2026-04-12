import { motion } from "framer-motion";
import { ArrowLeft, Radio, Clock, Music2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LiveHeaderProps {
  onBack: () => void;
  startedAt: string | null;
  currentPosition: number;
  totalSongs: number;
  viewersCount?: number;
  setlistTitle?: string;
}

export const LiveHeader = ({
  onBack,
  startedAt,
  currentPosition,
  totalSongs,
  viewersCount = 0,
  setlistTitle,
}: LiveHeaderProps) => {
  const elapsedTime = startedAt
    ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000 / 60)
    : 0;

  return (
    <TooltipProvider>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-20"
      >
        <div className="max-w-7xl mx-auto">
          {/* Glass morphism header */}
          <div
            className="flex items-center justify-between p-4 rounded-2xl"
            style={{
              background: "linear-gradient(145deg, hsl(217 33% 14% / 0.9) 0%, hsl(222 47% 8% / 0.9) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid hsl(217 33% 25% / 0.5)",
              boxShadow: "0 10px 40px -10px hsl(222 47% 5% / 0.5)",
            }}
          >
            {/* Left section */}
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="text-foreground hover:bg-secondary/10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Volver a Repertorios</TooltipContent>
              </Tooltip>

              <div className="hidden md:block h-8 w-px bg-border" />

              <div className="flex items-center gap-3">
                {/* Live indicator */}
                <motion.div
                  className="flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, hsl(0 100% 50% / 0.2) 0%, hsl(0 100% 40% / 0.3) 100%)",
                    border: "1px solid hsl(0 100% 50% / 0.4)",
                  }}
                  animate={{
                    boxShadow: [
                      "0 0 20px hsl(0 100% 50% / 0.2)",
                      "0 0 30px hsl(0 100% 50% / 0.4)",
                      "0 0 20px hsl(0 100% 50% / 0.2)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <motion.div
                    className="w-3 h-3 rounded-full bg-red-500"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-sm font-bold text-red-400 tracking-wider">
                    EN VIVO
                  </span>
                </motion.div>

                {/* Title */}
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-foreground">
                    {setlistTitle || "Sesión en Vivo"}
                  </h1>
                </div>
              </div>
            </div>

            {/* Center section - Stats */}
            <div className="hidden lg:flex items-center gap-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/30">
                    <Clock className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-medium text-foreground">
                      {elapsedTime} min
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Tiempo transcurrido</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/30">
                    <Music2 className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-medium text-foreground">
                      {currentPosition + 1} / {totalSongs}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Canción actual</TooltipContent>
              </Tooltip>

              {viewersCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/30">
                      <Eye className="w-4 h-4 text-secondary" />
                      <span className="text-sm font-medium text-foreground">
                        {viewersCount}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Músicos conectados</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Right section - Time */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground tabular-nums">
                  {format(new Date(), "HH:mm")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.header>
    </TooltipProvider>
  );
};
