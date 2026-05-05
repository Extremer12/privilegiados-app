import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Comment {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface LiveChatProps {
  sessionId: string;
  comments: Comment[];
  onAddComment: (comment: Comment) => void;
}

const quickEmojis = ["👍", "🔥", "🙏", "❤️", "🎵", "✨", "👏", "💪"];

export const LiveChat = ({
  sessionId,
  comments,
  onAddComment,
}: LiveChatProps) => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    
    try {
      const { data, error } = await supabase
        .from("live_comments")
        .insert({
          session_id: sessionId,
          user_id: user.id,
          message: newMessage.trim(),
        })
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        onAddComment(data as unknown as Comment);
      }
      
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error", {
        description: "No se pudo enviar el mensaje",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
  };

  return (
    <div
      className="h-full rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
        border: "1px solid hsl(217 33% 25% / 0.5)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/20">
            <MessageSquare className="w-4 h-4 text-secondary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">Chat en Vivo</h3>
            <p className="text-[10px] text-muted-foreground">
              {comments.length} mensajes
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {comments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground"
              >
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay mensajes aún</p>
                <p className="text-xs">¡Sé el primero en escribir!</p>
              </motion.div>
            ) : (
              comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`flex gap-2 ${
                    comment.user_id === user?.id ? "flex-row-reverse" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {comment.profiles?.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt={comment.profiles.full_name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-secondary">
                          {comment.profiles?.full_name?.charAt(0) || "?"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`max-w-[75%] ${
                      comment.user_id === user?.id ? "items-end" : ""
                    }`}
                  >
                    <div
                      className={`px-3 py-2 rounded-2xl ${
                        comment.user_id === user?.id
                          ? "bg-secondary text-primary rounded-br-md"
                          : "bg-background/50 text-foreground rounded-bl-md"
                      }`}
                    >
                      {comment.user_id !== user?.id && (
                        <p className="text-[10px] font-semibold text-secondary mb-0.5">
                          {comment.profiles?.full_name}
                        </p>
                      )}
                      <p className="text-sm break-words">{comment.message}</p>
                    </div>
                    <p
                      className={`text-[10px] text-muted-foreground mt-0.5 ${
                        comment.user_id === user?.id ? "text-right" : ""
                      }`}
                    >
                      {format(new Date(comment.created_at), "HH:mm", {
                        locale: es,
                      })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Quick emojis */}
      <div className="px-3 py-1.5 border-t border-border/30 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {quickEmojis.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleQuickEmoji(emoji)}
              className="p-1 rounded-lg hover:bg-background/50 transition-colors text-base"
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-background/50 border-border/50 focus:border-secondary h-10 text-sm"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || isSending}
            className="bg-secondary text-primary hover:bg-secondary/90 h-10 w-10 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};
