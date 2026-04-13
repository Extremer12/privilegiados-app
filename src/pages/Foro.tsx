import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageCircle, Send, Paperclip, Loader2, Users, Image as ImageIcon, 
  Smile, Hash, ArrowDown, Sparkles, Wifi, WifiOff
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { AudioRecordingUI } from "@/components/chat/AudioRecordingUI";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface ChatMessageType {
  id: string;
  content: string;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
  author_id: string;
  status?: "sending" | "sent" | "error";
}

interface UserPresence {
  user_id: string;
  online_at: string;
  typing?: boolean;
}

const QUICK_REACTIONS = ["👍", "❤️", "🙏", "🎵", "🔥", "✨"];
const MESSAGES_LIMIT = 50;

const Foro = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [showEmojis, setShowEmojis] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } =
    useAudioRecorder();

  // Profiles query
  const { data: profilesData } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url");
      if (error) throw error;
      const profilesMap: Record<string, Profile> = {};
      data?.forEach((profile) => {
        profilesMap[profile.id] = profile;
      });
      return profilesMap;
    },
    enabled: !!user,
  });

  const profiles = profilesData || {};

  // Messages infinite query
  const {
    data: infiniteMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: messagesLoading,
  } = useInfiniteQuery({
    queryKey: ['chat_messages'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .range(pageParam * MESSAGES_LIMIT, (pageParam + 1) * MESSAGES_LIMIT - 1);

      if (error) throw error;
      return data as ChatMessageType[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === MESSAGES_LIMIT ? allPages.length : undefined;
    },
    enabled: !!user,
  });

  // Flatten messages and reverse for display (oldest first)
  const messages = useMemo(() => {
    if (!infiniteMessages) return [];
    return [...infiniteMessages.pages].reverse().flatMap(page => [...page].reverse());
  }, [infiniteMessages]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      setupRealtimeChannel();
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [user]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom || messages.length > 0) {
        scrollToBottom();
      }
    }
  }, [messages.length]); // Only on new messages

  // Handle scroll to show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const setupRealtimeChannel = () => {
    if (!user) return;

    const channel = supabase.channel("forum_room", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<UserPresence>();
        const online = Object.keys(state);
        setOnlineUsers(online);

        const typing = new Set<string>();
        Object.entries(state).forEach(([userId, presences]) => {
          if (presences[0]?.typing && userId !== user.id) {
            typing.add(userId);
          }
        });
        setTypingUsers(typing);
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
      }, (payload) => {
        const newMessage = payload.new as ChatMessageType;
        
        // Update React Query cache
        queryClient.setQueryData(['chat_messages'], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any, i: number) => 
              i === 0 ? [newMessage, ...page] : page
            )
          };
        });

        if (newMessage.author_id !== user?.id) {
          const author = profiles[newMessage.author_id];
          toast({
            title: `${author?.full_name || "Un usuario"}`,
            description: newMessage.content || "Archivo compartido",
          });
        }
      });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
          typing: false,
        });
      } else if (status === "CHANNEL_ERROR") {
        setIsConnected(false);
        toast({
          title: "Conexión perdida",
          description: "Reintentando conectar...",
          variant: "destructive",
        });
      }
    });

    channelRef.current = channel;
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("chat_messages").insert({
        content: content,
        author_id: user!.id
      });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      setMessage("");
      setShowEmojis(false);
      if (channelRef.current) {
        channelRef.current.track({
          user_id: user!.id,
          online_at: new Date().toISOString(),
          typing: false,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error al enviar mensaje",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const sendFileMutation = useMutation({
    mutationFn: async ({ file, fileName }: { file: File | Blob, fileName: string }) => {
      setUploading(true);
      const fileExt = fileName.split(".").pop() || "webm";
      const uploadName = `${user!.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(uploadName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("chat-files").getPublicUrl(uploadName);

      const fileType = fileName.includes("audio_") ? "audio" : (file instanceof File && file.type.startsWith("image/") ? "image" : "file");

      const { error } = await supabase.from("chat_messages").insert({
        content: fileName.includes("audio_") ? "Mensaje de voz" : fileName,
        file_url: fileUrl,
        file_type: fileType,
        author_id: user!.id
      });

      if (error) throw error;
      return true;
    },
    onSettled: () => setUploading(false),
    onError: (error: any) => {
      toast({
        title: "Error al subir archivo",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleTyping = useCallback(() => {
    if (!user || !channelRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    channelRef.current.track({
      user_id: user.id,
      online_at: new Date().toISOString(),
      typing: true,
    });

    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
        typing: false,
      });
    }, 2000);
  }, [user]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El archivo debe ser menor a 50MB",
        variant: "destructive",
      });
      return;
    }

    sendFileMutation.mutate({ file, fileName: file.name });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleStopRecording = async () => {
    const audioBlob = await stopRecording();
    if (!audioBlob || !user) return;
    sendFileMutation.mutate({ file: audioBlob, fileName: `audio_${Date.now()}.webm` });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    sendMessageMutation.mutate(message);
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo acceder al micrófono",
        variant: "destructive",
      });
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojis(false);
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <>
      <main className="flex-1 pt-20 pb-4 px-3 sm:px-4 flex flex-col w-full">
        <div className="max-w-4xl mx-auto w-full flex flex-col h-[calc(100vh-120px)]">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
              <div>
                <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground">
                  Comunidad
                </h1>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
                      {isConnected ? "En tiempo real" : "Desconectado"}
                    </span>
                  </div>
                  <span className="text-muted-foreground/20 text-xs">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                      {onlineUsers.length}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
                      Conectados
                    </span>
                  </div>
                </div>
              </div>

              {/* Online Users Avatars - Sleek and Minimal */}
              {onlineUsers.length > 0 && (
                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex -space-x-3">
                    {onlineUsers.slice(0, 5).map((userId, index) => {
                      const profile = profiles[userId];
                      return (
                        <motion.div
                          key={userId}
                          initial={{ scale: 0, x: -10 }}
                          animate={{ scale: 1, x: 0 }}
                          transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
                        >
                          <Avatar className="w-10 h-10 squircle-sm border-4 border-[#0d1117] relative z-10 shadow-xl">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-white/5 text-muted-foreground text-[10px] uppercase font-bold">
                              {profile?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                      );
                    })}
                    {onlineUsers.length > 5 && (
                      <div className="w-10 h-10 squircle-sm bg-white/[0.03] border-4 border-[#0d1117] flex items-center justify-center relative z-0">
                        <span className="text-[10px] text-muted-foreground/60 font-bold">+{onlineUsers.length - 5}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Chat Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <Card className="flex-1 flex flex-col bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-xl border-secondary/20 overflow-hidden shadow-2xl">
              {messagesLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="loader" />
                    <span className="text-muted-foreground text-sm">Cargando mensajes...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Messages Area */}
                  <div
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-1 relative"
                  >
                    {messages.length === 0 ? (
                      <motion.div
                        className="flex flex-col items-center justify-center h-full text-center"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div
                          className="w-24 h-24 rounded-full bg-gradient-to-br from-secondary/20 to-purple-500/10 flex items-center justify-center mb-6 shadow-xl"
                        >
                          <MessageCircle className="w-12 h-12 text-secondary" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-3">
                          ¡Inicia la conversación!
                        </h3>
                        <p className="text-muted-foreground max-w-xs mb-6">
                          Sé el primero en enviar un mensaje al grupo
                        </p>
                        <div className="flex gap-2">
                          {QUICK_REACTIONS.map((emoji) => (
                            <motion.button
                              key={emoji}
                              className="text-2xl p-2 rounded-xl bg-secondary/10 hover:bg-secondary/20 transition-colors"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => addEmoji(emoji)}
                              aria-label={`Reaccionar con ${emoji}`}
                            >
                              {emoji}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <>
                        {hasNextPage && (
                          <div className="flex justify-center py-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={loadMore} 
                              disabled={isFetchingNextPage}
                              className="bg-secondary/10 text-secondary border-secondary/30 hover:bg-secondary/20"
                              aria-label="Cargar mensajes anteriores"
                            >
                              {isFetchingNextPage ? "Cargando..." : "Cargar mensajes anteriores"}
                            </Button>
                          </div>
                        )}
                        {messages.map((msg) => (
                          <ChatMessage
                            key={msg.id}
                            {...msg}
                            isOwnMessage={msg.author_id === user?.id}
                            author={profiles[msg.author_id]}
                          />
                        ))}

                        <TypingIndicator typingUsers={typingUsers} profiles={profiles} />
                      </>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Scroll to Bottom Button */}
                  <AnimatePresence>
                    {showScrollButton && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="absolute bottom-24 right-6 w-12 h-12 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center z-10"
                        onClick={scrollToBottom}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Desplazarse hacia abajo"
                      >
                        <ArrowDown className="w-5 h-5" aria-hidden="true" />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {/* Input Area */}
                  <div className="border-t border-border/30 p-4 bg-gradient-to-t from-background/60 to-transparent backdrop-blur-md">
                    {/* Quick Reactions */}
                    <AnimatePresence>
                      {showEmojis && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="flex gap-2 mb-3 p-2 bg-card/80 rounded-xl border border-border/30"
                        >
                          {QUICK_REACTIONS.map((emoji) => (
                            <motion.button
                              key={emoji}
                              className="text-2xl p-2 rounded-lg hover:bg-secondary/20 transition-colors"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => addEmoji(emoji)}
                              aria-label={`Añadir emoji ${emoji}`}
                            >
                              {emoji}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                       {/* Hidden File Inputs */}
                       <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => handleFileSelect(e)}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      <input
                        ref={imageInputRef}
                        type="file"
                        onChange={(e) => handleFileSelect(e)}
                        className="hidden"
                        accept="image/*"
                        aria-hidden="true"
                        tabIndex={-1}
                      />

                      {!isRecording && (
                        <>
                          {/* Emoji Button */}
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowEmojis(!showEmojis)}
                              className={`h-11 w-11 rounded-full transition-all ${
                                showEmojis ? "bg-secondary/20 text-secondary" : "hover:bg-secondary/20 hover:text-secondary"
                              }`}
                              aria-label="Abrir panel de emojis"
                            >
                              <Smile className="w-5 h-5" aria-hidden="true" />
                            </Button>
                          </motion.div>

                          {/* Image Button */}
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => imageInputRef.current?.click()}
                              disabled={uploading}
                              className="h-11 w-11 rounded-full hover:bg-secondary/20 hover:text-secondary transition-all"
                              aria-label="Adjuntar imagen"
                            >
                              <ImageIcon className="w-5 h-5" aria-hidden="true" />
                            </Button>
                          </motion.div>

                          {/* File Button */}
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                              className="h-11 w-11 rounded-full hover:bg-secondary/20 hover:text-secondary transition-all"
                              aria-label="Adjuntar archivo"
                            >
                              {uploading ? (
                                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                              ) : (
                                <Paperclip className="w-5 h-5" aria-hidden="true" />
                              )}
                            </Button>
                          </motion.div>

                          {/* Message Input */}
                          <div className="flex-1 relative">
                            <Input
                              value={message}
                              onChange={(e) => {
                                setMessage(e.target.value);
                                handleTyping();
                              }}
                              placeholder="Escribe un mensaje..."
                              className="h-12 bg-background/60 backdrop-blur-sm border-border/50 focus:border-secondary/50 rounded-2xl px-5 pr-12 transition-all text-base"
                              disabled={uploading}
                              aria-label="Campo de mensaje"
                            />
                          </div>

                          {/* Send or Mic Button */}
                          {message.trim() ? (
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button
                                type="submit"
                                variant="hero"
                                size="icon"
                                disabled={uploading || sendMessageMutation.isPending}
                                className="h-12 w-12 rounded-full shadow-lg shadow-secondary/30"
                                aria-label="Enviar mensaje"
                              >
                                {sendMessageMutation.isPending ? (
                                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Send className="w-5 h-5" aria-hidden="true" />
                                )}
                              </Button>
                            </motion.div>
                          ) : (
                            <AudioRecordingUI
                              isRecording={isRecording}
                              recordingTime={recordingTime}
                              uploading={uploading}
                              onStartRecording={handleStartRecording}
                              onStopRecording={handleStopRecording}
                              onCancelRecording={cancelRecording}
                            />
                          )}
                        </>
                      )}

                      {isRecording && (
                        <AudioRecordingUI
                          isRecording={isRecording}
                          recordingTime={recordingTime}
                          uploading={uploading}
                          onStartRecording={handleStartRecording}
                          onStopRecording={handleStopRecording}
                          onCancelRecording={cancelRecording}
                        />
                      )}
                    </form>
                  </div>
                </>
              )}
              </Card>
            </motion.div>
          </div>
        </main>
      </>
  );
};

export default Foro;
