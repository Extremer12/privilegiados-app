import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
  };
}

interface SongCommentsProps {
  songId: string;
}

export const SongComments = ({ songId }: SongCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [songId]);

  const fetchComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from("song_comments")
        .select("*")
        .eq("song_id", songId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (!commentsData) {
        setComments([]);
        return;
      }

      // Fetch profiles for all users
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Combine comments with profile data
      const commentsWithProfiles = commentsData.map((comment) => ({
        ...comment,
        profiles: profilesData?.find((p) => p.id === comment.user_id),
      }));

      setComments(commentsWithProfiles as any);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      const { error } = await supabase
        .from("song_comments")
        .insert({
          song_id: songId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      toast({
        title: "Comentario agregado",
        description: "Tu comentario se ha publicado correctamente",
      });

      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "No se pudo agregar el comentario",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 card-gradient border-secondary/20">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-secondary" />
        <h3 className="text-lg font-semibold text-foreground">
          Comentarios ({comments.length})
        </h3>
      </div>

      {user && (
        <div className="mb-6">
          <Textarea
            placeholder="Agregar un comentario..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="mb-2"
            rows={3}
          />
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            variant="hero"
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            Publicar
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground text-center py-4">
            Cargando comentarios...
          </p>
        ) : comments.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No hay comentarios aún. ¡Sé el primero en comentar!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-secondary/20 text-secondary">
                  {comment.profiles?.full_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">
                    {comment.profiles?.full_name || "Usuario"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      locale: es,
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
