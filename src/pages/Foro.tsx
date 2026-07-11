import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroupContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageCircle, Send, Paperclip, Loader2, Image as ImageIcon, 
  Smile, ArrowDown, FolderOpen
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { AudioRecordingUI } from "@/components/chat/AudioRecordingUI";
import { ChatFilesPanel } from "@/components/chat/ChatFilesPanel";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useForoMessages } from "@/hooks/useForoMessages";
import { useForoRealtime } from "@/hooks/useForoRealtime";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

import type { Profile } from "@/types";

const QUICK_REACTIONS = ["👍", "❤️", "🙏", "🎵", "🔥", "✨"];

const Foro = () => {
  const { user, loading: authLoading } = useAuth();
  const { activeGroup } = useGroup();
  const navigate = useNavigate();
  
  const [message, setMessage] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } =
    useAudioRecorder();

  const {
    messages,
    isLoading: messagesLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    uploading,
    sendMessage,
    isSending,
    editMessage,
    deleteMessage,
    sendFile
  } = useForoMessages(user?.id, activeGroup?.id);

  const {
    onlineUsers,
    typingUsers,
    isConnected,
    handleTyping,
    trackStatus
  } = useForoRealtime(user?.id, activeGroup?.id);

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom || messages.length > 0) {
        scrollToBottom();
      }
    }
  }, [messages.length]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    sendMessage(message, {
      onSuccess: () => {
        setMessage("");
        setShowEmojis(false);
        trackStatus(false);
      }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/', 'audio/'];
    const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
    
    if (!isAllowed) {
      toast.error("Archivo no permitido", { description: "Solo se permiten PDF, Word, Imágenes y Audios." });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Archivo demasiado pesado", { description: "El límite es de 15MB." });
      return;
    }

    sendFile({ file, fileName: file.name });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleStopRecording = async () => {
    const audioBlob = await stopRecording();
    if (!audioBlob || !user) return;
    sendFile({ file: audioBlob, fileName: `audio_${Date.now()}.webm` });
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      toast.error("Error", { description: "No se pudo acceder al micrófono" });
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
      <main className="flex-1 pt-20 pb-24 md:pb-4 px-3 sm:px-4 flex flex-col w-full">
        <div className="max-w-4xl mx-auto w-full flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-120px)]">
          {/* Header */}
          <motion.div className="mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Comunidad</h1>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
                      {isConnected ? "En tiempo real" : "Desconectado"}
                    </span>
                  </div>
                  <span className="text-muted-foreground/20 text-xs">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">{onlineUsers.length}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Conectados</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {onlineUsers.length > 0 && (
                  <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <div className="flex -space-x-3">
                      {onlineUsers.slice(0, 5).map((userId, index) => {
                        const profile = profiles[userId];
                        return (
                          <motion.div key={userId} initial={{ scale: 0, x: -10 }} animate={{ scale: 1, x: 0 }} transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}>
                            <Avatar className="w-10 h-10 squircle-sm border-4 border-background relative z-10 shadow-xl">
                              <AvatarImage src={profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-[10px] uppercase font-bold">
                                {profile?.full_name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>
                        );
                      })}
                      {onlineUsers.length > 5 && (
                        <div className="w-10 h-10 squircle-sm bg-muted border-4 border-background flex items-center justify-center relative z-0">
                          <span className="text-[10px] text-muted-foreground/60 font-bold">+{onlineUsers.length - 5}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all border border-secondary/20">
                      <FolderOpen className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="p-0 border-l border-border w-full sm:max-w-md bg-card">
                    <ChatFilesPanel messages={messages} />
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </motion.div>

          {/* Chat Container */}
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="flex-1 flex flex-col overflow-hidden">
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
                  <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-1 relative">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <EmptyState
                          icon={MessageCircle}
                          title="¡Inicia la conversación!"
                          description="Sé el primero en enviar un mensaje al grupo"
                          action={
                            <div className="flex gap-2 justify-center mt-4">
                              {QUICK_REACTIONS.map((emoji) => (
                                <motion.button key={emoji} className="text-2xl p-2 rounded-xl bg-secondary/10 hover:bg-secondary/20 transition-colors" whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => addEmoji(emoji)}>
                                  {emoji}
                                </motion.button>
                              ))}
                            </div>
                          }
                        />
                      </div>
                    ) : (
                      <>
                        {hasNextPage && (
                          <div className="flex justify-center py-4">
                            <Button variant="outline" size="sm" onClick={loadMore} disabled={isFetchingNextPage} className="bg-secondary/10 text-secondary border-secondary/30 hover:bg-secondary/20">
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
                            onDelete={(id) => deleteMessage(id)}
                            onUpdate={(id, content) => editMessage({ id, content })}
                          />
                        ))}
                        <TypingIndicator typingUsers={typingUsers} profiles={profiles} />
                      </>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <AnimatePresence>
                    {showScrollButton && (
                      <motion.button initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} className="absolute bottom-24 right-6 w-12 h-12 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center z-10" onClick={scrollToBottom} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <ArrowDown className="w-5 h-5" />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <div className="border-t border-border/30 p-4 bg-gradient-to-t from-background/60 to-transparent backdrop-blur-md">
                    <AnimatePresence>
                      {showEmojis && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex gap-2 mb-3 p-2 bg-card/80 rounded-xl border border-border/30">
                          {QUICK_REACTIONS.map((emoji) => (
                            <motion.button key={emoji} className="text-2xl p-2 rounded-lg hover:bg-secondary/20 transition-colors" whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => addEmoji(emoji)}>
                              {emoji}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                       <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept=".pdf,.doc,.docx,.txt,.zip,.rar" />
                       <input ref={imageInputRef} type="file" onChange={handleFileSelect} className="hidden" accept="image/*" />

                      {!isRecording && (
                        <>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button type="button" variant="ghost" size="icon" onClick={() => setShowEmojis(!showEmojis)} className={`h-11 w-11 rounded-full transition-all ${showEmojis ? "bg-secondary/20 text-secondary" : "hover:bg-secondary/20 hover:text-secondary"}`}>
                              <Smile className="w-5 h-5" />
                            </Button>
                          </motion.div>

                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button type="button" variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={uploading} className="h-11 w-11 rounded-full hover:bg-secondary/20 hover:text-secondary transition-all">
                              <ImageIcon className="w-5 h-5" />
                            </Button>
                          </motion.div>

                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-11 w-11 rounded-full hover:bg-secondary/20 hover:text-secondary transition-all">
                              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                            </Button>
                          </motion.div>

                          <div className="flex-1 relative">
                            <Input
                              value={message}
                              onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
                              placeholder="Escribe un mensaje..."
                              className="h-12 bg-background/60 backdrop-blur-sm border-border/50 focus:border-secondary/50 rounded-2xl px-5 pr-12 transition-all text-base"
                              disabled={uploading}
                            />
                          </div>

                          {message.trim() ? (
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button type="submit" variant="hero" size="icon" disabled={uploading || isSending} className="h-12 w-12 rounded-full shadow-lg shadow-secondary/30">
                                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
