import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Radio, 
  Users, 
  Wifi, 
  WifiOff,
  Headphones,
  Settings,
  Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VoiceParticipant {
  id: string;
  name: string;
  avatar?: string;
  isSpeaking: boolean;
  isMuted: boolean;
  instrument?: string;
}

interface VoiceChannelProps {
  sessionId: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const VoiceChannel = ({ sessionId, isExpanded = false, onToggleExpand }: VoiceChannelProps) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null; instrument: string | null } | null>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, instrument")
        .eq("id", user.id)
        .single();
      if (data) setUserProfile(data);
    };
    fetchProfile();
  }, [user]);

  // Set up presence channel for voice
  useEffect(() => {
    if (!user || !sessionId) return;

    channelRef.current = supabase.channel(`voice-${sessionId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current
      .on("presence", { event: "sync" }, () => {
        const presenceState = channelRef.current?.presenceState() || {};
        const participantsList: VoiceParticipant[] = [];
        
        Object.entries(presenceState).forEach(([key, value]) => {
          const presenceData = (value as any[])[0];
          if (presenceData) {
            participantsList.push({
              id: key,
              name: presenceData.name || "Usuario",
              avatar: presenceData.avatar,
              isSpeaking: presenceData.isSpeaking || false,
              isMuted: presenceData.isMuted || false,
              instrument: presenceData.instrument,
            });
          }
        });
        
        setParticipants(participantsList);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        const presence = newPresences[0];
        if (presence && key !== user.id) {
          toast({
            title: "🎤 Nuevo músico conectado",
            description: `${presence.name || "Un músico"} se unió al canal de voz`,
          });
        }
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        const presence = leftPresences[0];
        if (presence && key !== user.id) {
          toast({
            title: "Músico desconectado",
            description: `${presence.name || "Un músico"} dejó el canal de voz`,
          });
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && isConnected) {
          await channelRef.current?.track({
            name: userProfile?.full_name || "Usuario",
            avatar: userProfile?.avatar_url,
            instrument: userProfile?.instrument,
            isSpeaking: false,
            isMuted: isMuted,
            joinedAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [user, sessionId, isConnected, userProfile]);

  // Update presence when speaking state changes
  useEffect(() => {
    if (channelRef.current && isConnected) {
      channelRef.current.track({
        name: userProfile?.full_name || "Usuario",
        avatar: userProfile?.avatar_url,
        instrument: userProfile?.instrument,
        isSpeaking: isSpeaking,
        isMuted: isMuted,
        joinedAt: new Date().toISOString(),
      });
    }
  }, [isSpeaking, isMuted, isConnected, userProfile]);

  // Audio level visualization
  const startAudioAnalysis = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const analyze = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedLevel = average / 255;
      
      setAudioLevel(normalizedLevel);
      setIsSpeaking(normalizedLevel > 0.1 && !isMuted);
      
      animationFrameRef.current = requestAnimationFrame(analyze);
    };
    
    analyze();
  }, [isMuted]);

  // Connect to voice channel
  const connectVoice = async () => {
    setIsConnecting(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      
      localStreamRef.current = stream;
      
      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      startAudioAnalysis();
      setIsConnected(true);
      
      // Track presence
      if (channelRef.current) {
        await channelRef.current.track({
          name: userProfile?.full_name || "Usuario",
          avatar: userProfile?.avatar_url,
          instrument: userProfile?.instrument,
          isSpeaking: false,
          isMuted: false,
          joinedAt: new Date().toISOString(),
        });
      }
      
      toast({
        title: "🎙️ Conectado al canal de voz",
        description: "Ya puedes comunicarte con tu banda en tiempo real",
      });
    } catch (error) {
      console.error("Error connecting to voice:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo acceder al micrófono. Verifica los permisos.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from voice channel
  const disconnectVoice = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    channelRef.current?.untrack();
    
    setIsConnected(false);
    setIsSpeaking(false);
    setAudioLevel(0);
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  // Toggle deafen
  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
    if (!isDeafened) {
      setIsMuted(true);
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = false;
      }
    }
  };

  // Push to talk handlers
  const handlePTTStart = useCallback(() => {
    if (pushToTalk && localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        setIsMuted(false);
        setIsPTTActive(true);
      }
    }
  }, [pushToTalk]);

  const handlePTTEnd = useCallback(() => {
    if (pushToTalk && localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
        setIsMuted(true);
        setIsPTTActive(false);
      }
    }
  }, [pushToTalk]);

  // Keyboard shortcut for PTT (Space key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && pushToTalk && isConnected && !e.repeat) {
        e.preventDefault();
        handlePTTStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && pushToTalk && isConnected) {
        e.preventDefault();
        handlePTTEnd();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [pushToTalk, isConnected, handlePTTStart, handlePTTEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectVoice();
    };
  }, []);

  return (
    <TooltipProvider>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative overflow-hidden rounded-2xl ${
          isExpanded 
            ? "p-6" 
            : "p-4"
        }`}
        style={{
          background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
          border: isConnected 
            ? "2px solid hsl(48 100% 50% / 0.4)" 
            : "1px solid hsl(217 33% 25% / 0.5)",
          boxShadow: isConnected 
            ? "0 0 40px hsl(48 100% 50% / 0.15), inset 0 1px 0 hsl(48 100% 50% / 0.1)"
            : "0 10px 30px -10px hsl(222 47% 5% / 0.5)",
        }}
      >
        {/* Background animation when connected */}
        {isConnected && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              background: isSpeaking
                ? [
                    "radial-gradient(circle at 50% 50%, hsl(48 100% 50% / 0.1) 0%, transparent 70%)",
                    "radial-gradient(circle at 50% 50%, hsl(48 100% 50% / 0.2) 0%, transparent 70%)",
                    "radial-gradient(circle at 50% 50%, hsl(48 100% 50% / 0.1) 0%, transparent 70%)",
                  ]
                : "radial-gradient(circle at 50% 50%, transparent 0%, transparent 100%)",
            }}
            transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
          />
        )}

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`relative p-2 rounded-xl ${
              isConnected 
                ? "bg-secondary/20" 
                : "bg-muted/50"
            }`}>
              <Radio className={`w-5 h-5 ${
                isConnected ? "text-secondary" : "text-muted-foreground"
              }`} />
              {isConnected && (
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-secondary"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>
            <div>
              <h3 className="font-bold text-foreground flex items-center gap-2">
                Canal de Voz
                {isConnected && (
                  <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                    EN AIR
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isConnected 
                  ? `${participants.length} músico${participants.length !== 1 ? "s" : ""} conectado${participants.length !== 1 ? "s" : ""}`
                  : "Comunicación en tiempo real"
                }
              </p>
            </div>
          </div>

          {isConnected && (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPushToTalk(!pushToTalk)}
                    className={`h-8 px-2 ${
                      pushToTalk ? "bg-secondary/20 text-secondary" : ""
                    }`}
                  >
                    <Headphones className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{pushToTalk ? "Modo: Push-to-Talk (Espacio)" : "Modo: Siempre activo"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Connection button / Controls */}
        {!isConnected ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={connectVoice}
            disabled={isConnecting}
            className="relative w-full py-4 rounded-xl font-bold text-lg overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, hsl(48 100% 50%) 0%, hsl(45 100% 55%) 100%)",
              color: "hsl(222 47% 7%)",
            }}
          >
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: "linear-gradient(135deg, hsl(45 100% 55%) 0%, hsl(48 100% 60%) 100%)",
              }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isConnecting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Wifi className="w-5 h-5" />
                  </motion.div>
                  Conectando...
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Unirse al Canal de Voz
                </>
              )}
            </span>
          </motion.button>
        ) : (
          <div className="space-y-4">
            {/* Audio visualization */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/30">
              <div className="relative">
                <motion.div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: isSpeaking && !isMuted
                      ? "linear-gradient(135deg, hsl(48 100% 50%) 0%, hsl(45 100% 55%) 100%)"
                      : "hsl(217 33% 20%)",
                  }}
                  animate={{
                    scale: isSpeaking && !isMuted ? [1, 1.1, 1] : 1,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {isMuted ? (
                    <MicOff className="w-5 h-5 text-destructive" />
                  ) : (
                    <Mic className={`w-5 h-5 ${
                      isSpeaking ? "text-primary" : "text-foreground"
                    }`} />
                  )}
                </motion.div>
                
                {/* Audio level rings */}
                {isSpeaking && !isMuted && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-secondary"
                      animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-secondary"
                      animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                    />
                  </>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {userProfile?.full_name || "Tú"}
                  </span>
                  {pushToTalk && (
                    <span className="text-xs text-muted-foreground">
                      {isPTTActive ? "🔊 Hablando" : "Presiona [ESPACIO]"}
                    </span>
                  )}
                </div>
                
                {/* Audio level bar */}
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, hsl(120 70% 45%), hsl(48 100% 50%), hsl(0 70% 50%))",
                    }}
                    animate={{ width: `${audioLevel * 100}%` }}
                    transition={{ duration: 0.05 }}
                  />
                </div>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMute}
                    onMouseDown={pushToTalk ? handlePTTStart : undefined}
                    onMouseUp={pushToTalk ? handlePTTEnd : undefined}
                    onMouseLeave={pushToTalk ? handlePTTEnd : undefined}
                    className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                      isMuted
                        ? "bg-destructive/20 text-destructive"
                        : "bg-secondary/20 text-secondary"
                    }`}
                  >
                    {isMuted ? (
                      <MicOff className="w-6 h-6" />
                    ) : (
                      <Mic className="w-6 h-6" />
                    )}
                    {pushToTalk && isPTTActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-secondary"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      />
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isMuted ? "Activar micrófono" : "Silenciar micrófono"}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleDeafen}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isDeafened
                        ? "bg-destructive/20 text-destructive"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isDeafened ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isDeafened ? "Activar audio" : "Silenciar todo"}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={disconnectVoice}
                    className="w-12 h-12 rounded-full bg-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/30"
                  >
                    <WifiOff className="w-5 h-5" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Desconectar</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-3 px-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <Slider
                value={[volume]}
                onValueChange={(v) => setVolume(v[0])}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8">{volume}%</span>
            </div>

            {/* Connected participants */}
            <AnimatePresence>
              {participants.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 pt-3 border-t border-border/50"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Users className="w-3 h-3" />
                    <span>Músicos en el canal</span>
                  </div>
                  
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {participants.map((participant) => (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          participant.isSpeaking
                            ? "bg-secondary/10 border border-secondary/30"
                            : "bg-background/30"
                        }`}
                      >
                        <div className="relative">
                          {participant.avatar ? (
                            <img
                              src={participant.avatar}
                              alt={participant.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-secondary">
                                {participant.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          
                          {/* Speaking indicator */}
                          {participant.isSpeaking && (
                            <motion.div
                              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                            />
                          )}
                          
                          {/* Muted indicator */}
                          {participant.isMuted && !participant.isSpeaking && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-destructive rounded-full border-2 border-background flex items-center justify-center">
                              <MicOff className="w-2 h-2" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {participant.name}
                            {participant.id === user?.id && (
                              <span className="text-xs text-muted-foreground ml-1">(tú)</span>
                            )}
                          </p>
                          {participant.instrument && (
                            <p className="text-xs text-muted-foreground truncate">
                              {participant.instrument}
                            </p>
                          )}
                        </div>
                        
                        {participant.isSpeaking && (
                          <div className="flex gap-0.5">
                            {[...Array(3)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="w-1 bg-green-500 rounded-full"
                                animate={{
                                  height: ["8px", "16px", "8px"],
                                }}
                                transition={{
                                  duration: 0.5,
                                  repeat: Infinity,
                                  delay: i * 0.1,
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  );
};
