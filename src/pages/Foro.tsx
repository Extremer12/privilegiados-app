import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

const Foro = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [showEmojis, setShowEmojis] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const MESSAGES_LIMIT = 50;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } =
    useAudioRecorder();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchProfiles();
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
      if (isNearBottom || messages.length === 1) {
        scrollToBottom();
      }
    }
  }, [messages]);

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

  const fetchMessages = async (pageIndex = 0) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .range(pageIndex * MESSAGES_LIMIT, (pageIndex + 1) * MESSAGES_LIMIT - 1);

      if (error) throw error;
      
      if (data) {
        const reversedData = data.reverse();
        if (pageIndex === 0) {
          setMessages(reversedData);
        } else {
          setMessages(prev => [...reversedData, ...prev]);
        }
        setHasMore(data.length === MESSAGES_LIMIT);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(nextPage);
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url");

      if (error) throw error;

      const profilesMap: Record<string, Profile> = {};
      data?.forEach((profile) => {
        profilesMap[profile.id] = {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        };
      });
      setProfiles(profilesMap);
    } catch (error) {
      console.error("Error fetching profiles:", error);
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
      .on("presence", { event: "join" }, () => {})
      .on("presence", { event: "leave" }, () => {});

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
      },
      (payload) => {
        const newMessage = payload.new as ChatMessageType;

        setMessages((current) => {
          const filtered = current.filter((m) => m.id !== "temp-" + newMessage.author_id);

          if (filtered.find((m) => m.id === newMessage.id)) {
            return current;
          }

          if (newMessage.author_id !== user?.id) {
            const author = profiles[newMessage.author_id];
            toast({
              title: `${author?.full_name || "Un usuario"}`,
              description: newMessage.content || "Archivo compartido",
            });
          }

          return [...filtered, { ...newMessage, status: "sent" }];
        });
      }
    );

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

  const uploadFile = async (file: File | Blob, fileName: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = fileName.split(".").pop() || "webm";
      const uploadName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(uploadName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-files").getPublicUrl(uploadName);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Error al subir archivo",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isImage = false) => {
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

    setUploading(true);
    const fileUrl = await uploadFile(file, file.name);

    if (fileUrl) {
      const fileType = file.type.startsWith("image/") ? "image" : "file";

      await supabase.from("chat_messages").insert({
        content: file.name,
        file_url: fileUrl,
        file_type: fileType,
        author_id: user.id
      });
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
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

  const handleStopRecording = async () => {
    const audioBlob = await stopRecording();
    if (!audioBlob || !user) return;

    setUploading(true);
    const fileUrl = await uploadFile(audioBlob, `audio_${Date.now()}.webm`);

    if (fileUrl) {
      await supabase.from("chat_messages").insert({
        content: "Mensaje de voz",
        file_url: fileUrl,
        file_type: "audio",
        author_id: user.id
      });
    }

    setUploading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    const messageContent = message;
    const tempId = "temp-" + user.id + "-" + Date.now();

    const optimisticMessage: ChatMessageType = {
      id: tempId,
      content: messageContent,
      file_url: null,
      file_type: null,
      created_at: new Date().toISOString(),
      author_id: user.id,
      status: "sending",
    };

    setMessages((current) => [...current, optimisticMessage]);
    setMessage("");
    setShowEmojis(false);

    if (channelRef.current) {
      channelRef.current.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
        typing: false,
      });
    }

    try {
      const { error } = await supabase.from("chat_messages").insert({
        content: messageContent,
        author_id: user.id
      });

      if (error) throw error;

      setMessages((current) =>
        current.map((m) => (m.id === tempId ? { ...m, status: "sent" as const } : m))
      );
    } catch (error: any) {
      setMessages((current) =>
        current.map((m) => (m.id === tempId ? { ...m, status: "error" as const } : m))
      );

      toast({
        title: "Error al enviar mensaje",
        description: error.message,
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
            className="mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 bg-gradient-to-r from-card via-card to-card/80 border-secondary/20 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div
                    className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/30 to-purple-500/20 flex items-center justify-center shadow-lg"
                    whileHover={{ rotate: 5, scale: 1.05 }}
                  >
                    <div
                      className="absolute inset-0 rounded-2xl bg-secondary/20"
                    />
                    <MessageCircle className="w-7 h-7 text-secondary relative z-10" />
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold text-foreground">Chat Grupal</h1>
                      <div>
                        <Sparkles className="w-5 h-5 text-secondary" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Hash className="w-3 h-3" />
                      Conversación en tiempo real
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Connection Status */}
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                      isConnected ? "bg-green-500/20" : "bg-red-500/20 animate-pulse"
                    }`}
                  >
                    {isConnected ? (
                      <Wifi className="w-4 h-4 text-green-400" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-xs font-medium ${isConnected ? "text-green-400" : "text-red-400"}`}>
                      {isConnected ? "Conectado" : "Reconectando..."}
                    </span>
                  </motion.div>

                  {/* Online Users */}
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/20 border-secondary/30 shadow-lg"
                  >
                    <div
                      className="w-2.5 h-2.5 bg-green-400 rounded-full"
                    />
                    <Users className="w-4 h-4" />
                    <span className="font-bold text-base">{onlineUsers.length}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">en línea</span>
                  </Badge>
                </div>
              </div>

              {/* Online Users Avatars */}
              {onlineUsers.length > 0 && (
                <motion.div
                  className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-xs text-muted-foreground mr-2">En línea:</span>
                  <div className="flex -space-x-2">
                    {onlineUsers.slice(0, 8).map((userId, index) => {
                      const profile = profiles[userId];
                      return (
                        <motion.div
                          key={userId}
                          initial={{ scale: 0, x: -10 }}
                          animate={{ scale: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Avatar className="w-8 h-8 border-2 border-card ring-2 ring-green-500/30">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-secondary/20 text-secondary text-xs">
                              {profile?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                      );
                    })}
                    {onlineUsers.length > 8 && (
                      <div className="w-8 h-8 rounded-full bg-secondary/20 border-2 border-card flex items-center justify-center">
                        <span className="text-xs text-secondary font-medium">+{onlineUsers.length - 8}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>

          {/* Chat Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <Card className="flex-1 flex flex-col bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-xl border-secondary/20 overflow-hidden shadow-2xl">
              {loading ? (
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
                        </motion.div>
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
                            >
                              {emoji}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                        {hasMore && (
                          <div className="flex justify-center py-4">
                            <Button variant="outline" size="sm" onClick={loadMore} className="bg-secondary/10 text-secondary border-secondary/30 hover:bg-secondary/20">
                              Cargar mensajes anteriores
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
                      >
                        <ArrowDown className="w-5 h-5" />
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
                      />
                      <input
                        ref={imageInputRef}
                        type="file"
                        onChange={(e) => handleFileSelect(e, true)}
                        className="hidden"
                        accept="image/*"
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
                            >
                              <Smile className="w-5 h-5" />
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
                            >
                              <ImageIcon className="w-5 h-5" />
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
                            >
                              {uploading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Paperclip className="w-5 h-5" />
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
                                disabled={uploading}
                                className="h-12 w-12 rounded-full shadow-lg shadow-secondary/30"
                              >
                                <Send className="w-5 h-5" />
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
