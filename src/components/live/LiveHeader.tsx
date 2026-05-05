import { motion } from "framer-motion";
import { ArrowLeft, Clock, Music, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, memo } from "react";
import { useNavigate } from "react-router-dom";

interface LiveHeaderProps {
  setlistTitle?: string;
  sessionStartedAt?: string;
  currentPosition?: number;
  totalSongs?: number;
}

export const LiveHeader = memo(({
  setlistTitle,
  sessionStartedAt,
  currentPosition = 0,
  totalSongs = 0,
}: LiveHeaderProps) => {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    if (!sessionStartedAt) return;

    const update = () => {
      const diff = Date.now() - new Date(sessionStartedAt).getTime();
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(
        hrs > 0
          ? `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
          : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sessionStartedAt]);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between w-full"
    >
      {/* Left — Back + Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/repertorios")}
          className="rounded-xl text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Volver a repertorios"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-foreground truncate max-w-[200px] lg:max-w-xs">
            {setlistTitle || "Sesión en vivo"}
          </h2>
          {totalSongs > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Music className="w-3 h-3" />
              {currentPosition + 1} / {totalSongs} canciones
            </p>
          )}
        </div>
      </div>

      {/* Center — Live badge */}
      <div className="flex items-center gap-2 shrink-0 mx-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        <span className="text-xs font-bold tracking-wider text-red-400 uppercase hidden sm:inline">
          En Vivo
        </span>
      </div>

      {/* Right — Timer */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
          border: "1px solid hsl(217 33% 25% / 0.5)",
        }}
      >
        <Clock className="w-3.5 h-3.5 text-secondary" />
        <span className="text-sm font-mono font-bold text-foreground">
          {elapsed}
        </span>
      </div>
    </motion.div>
  );
});
