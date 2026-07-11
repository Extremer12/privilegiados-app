import { motion } from "framer-motion";
import { ArrowLeft, Clock, Music, Eye, Share2, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface LiveHeaderProps {
  setlistTitle?: string;
  sessionStartedAt?: string;
  currentPosition?: number;
  totalSongs?: number;
  spectatorCount?: number;
  sessionId?: string;
}

export const LiveHeader = memo(({
  setlistTitle,
  sessionStartedAt,
  currentPosition = 0,
  totalSongs = 0,
  spectatorCount = 0,
  sessionId,
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

  const handleShareMusician = () => {
    if (!sessionId) return;
    const url = `${window.location.origin}/en-vivo/${sessionId}`;
    navigator.clipboard.writeText(url);
    toast.success("Enlace de músicos copiado", {
      description: "Compártelo con los integrantes del grupo para que se unan a tocar.",
    });
  };

  const handleShareSpectator = () => {
    if (!sessionId) return;
    const url = `${window.location.origin}/en-vivo/espectador/${sessionId}`;
    navigator.clipboard.writeText(url);
    toast.success("Enlace de espectadores copiado", {
      description: "Cualquiera puede entrar con este enlace para seguir las letras en tiempo real.",
    });
  };

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
          <h2 className="text-base sm:text-lg font-bold text-foreground truncate max-w-[150px] lg:max-w-xs">
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

      {/* Center — Live badge & Spectators Count */}
      <div className="flex items-center gap-2.5 shrink-0 mx-2">
        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-[10px] font-black tracking-wider text-red-400 uppercase">
            En Vivo
          </span>
        </div>

        {spectatorCount > 0 && (
          <div 
            className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-wider shadow-lg shadow-blue-500/5 animate-pulse"
            title={`${spectatorCount} espectador(es) siguiendo en vivo`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{spectatorCount}</span>
          </div>
        )}
      </div>

      {/* Right — Timer & Share Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
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

        {sessionId && (
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShareMusician}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-secondary/15 text-neutral-400 hover:text-secondary border border-white/5 transition-all"
              title="Copiar enlace para integrantes (Músicos)"
            >
              <Link className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShareSpectator}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-blue-500/15 text-neutral-400 hover:text-blue-400 border border-white/5 transition-all"
              title="Copiar enlace para espectadores públicos"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
});
