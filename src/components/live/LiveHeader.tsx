import { motion } from "framer-motion";
import { ArrowLeft, Clock, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface LiveHeaderProps {
  onBack: () => void;
  startedAt: string | null;
  currentPosition: number;
  totalSongs: number;
  setlistTitle?: string;
}

import { memo } from "react";

export const LiveHeader = memo(({
  onBack,
  startedAt,
  currentPosition,
  totalSongs,
  setlistTitle,
}: LiveHeaderProps) => {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    if (!startedAt) return;

    const update = () => {
      const diff = Date.now() - new Date(startedAt).getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between max-w-7xl mx-auto w-full"
    >
      {/* Left — Back */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-xl text-muted-foreground hover:text-foreground"
          aria-label="Volver a repertorios"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="hidden sm:block">
          <h2 className="text-lg font-bold text-foreground truncate max-w-[200px] lg:max-w-xs">
            {setlistTitle || "Sesión en vivo"}
          </h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Music className="w-3 h-3" />
            {currentPosition + 1} / {totalSongs} canciones
          </p>
        </div>
      </div>

      {/* Center — Live badge */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-sm font-bold tracking-wider text-red-400 uppercase">
          En Vivo
        </span>
      </div>

      {/* Right — Timer */}
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full"
        style={{
          background:
            "linear-gradient(135deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
          border: "1px solid hsl(217 33% 25% / 0.5)",
        }}
      >
        <Clock className="w-4 h-4 text-secondary" />
        <span className="text-sm font-mono font-bold text-foreground">
          {elapsed}
        </span>
      </div>
    </motion.div>
  );
});
