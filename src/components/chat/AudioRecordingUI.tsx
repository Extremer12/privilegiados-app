import { Mic, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioRecordingUIProps {
  isRecording: boolean;
  recordingTime: number;
  uploading: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
}

export const AudioRecordingUI = ({
  isRecording,
  recordingTime,
  uploading,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
}: AudioRecordingUIProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (uploading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-secondary/10 rounded-full animate-pulse">
        <Loader2 className="w-5 h-5 animate-spin text-secondary" />
        <span className="text-sm text-muted-foreground">Enviando audio...</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-3 flex-1">
        {/* Cancel Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancelRecording}
          className="h-10 w-10 rounded-full hover:bg-destructive/20 hover:text-destructive"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Recording Indicator */}
        <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-destructive/10 rounded-full">
          <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-mono text-foreground">{formatTime(recordingTime)}</span>
          <div className="flex-1 flex items-center gap-1">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-secondary/60 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 16 + 4}px`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Send Button */}
        <Button
          type="button"
          variant="hero"
          size="icon"
          onClick={onStopRecording}
          className="h-12 w-12 rounded-full shadow-lg"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onStartRecording}
      className="h-10 w-10 rounded-full hover:bg-secondary/20 hover:text-secondary transition-all"
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
};
