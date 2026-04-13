import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceChannelProps {
  sessionId: string;
}

export const VoiceChannel = ({ sessionId }: VoiceChannelProps) => {
  const [isMuted, setIsMuted] = useState(true);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
        border: "1px solid hsl(217 33% 25% / 0.5)",
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-500/20">
              <Volume2 className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">
                Canal de Voz
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Próximamente
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder content */}
      <div className="p-4">
        <div className="text-center py-4">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-500/10 flex items-center justify-center">
            <Volume2 className="w-7 h-7 text-green-400/50" />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            El canal de voz estará disponible en una próxima actualización.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="rounded-xl text-xs opacity-50"
          >
            {isMuted ? (
              <>
                <MicOff className="w-3.5 h-3.5 mr-1.5" />
                Micrófono
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 mr-1.5" />
                Micrófono
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
