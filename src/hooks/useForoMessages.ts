import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChatMessageType } from "@/types";

const MESSAGES_LIMIT = 50;

export const useForoMessages = (userId: string | undefined, groupId: string | undefined) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const {
    data: infiniteMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['chat_messages', groupId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .range(pageParam * MESSAGES_LIMIT, (pageParam + 1) * MESSAGES_LIMIT - 1);

      if (error) throw error;
      return data as ChatMessageType[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === MESSAGES_LIMIT ? allPages.length : undefined;
    },
    enabled: !!userId && !!groupId,
  });

  const messages = useMemo(() => {
    if (!infiniteMessages) return [];
    return [...infiniteMessages.pages].reverse().flatMap(page => [...page].reverse());
  }, [infiniteMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!groupId) throw new Error("No active group");
      const { error } = await supabase.from("chat_messages").insert({
        content: content,
        author_id: userId!,
        group_id: groupId
      });
      if (error) throw error;
      return true;
    },
    onError: (error: any) => {
      toast.error("Error al enviar mensaje", {
        description: error.message,
      });
    }
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string, content: string }) => {
      const { error } = await supabase
        .from("chat_messages")
        .update({ content })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensaje editado");
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensaje eliminado");
    }
  });

  const sendFileMutation = useMutation({
    mutationFn: async ({ file, fileName }: { file: File | Blob, fileName: string }) => {
      if (!groupId) throw new Error("No active group");
      setUploading(true);
      const fileExt = fileName.split(".").pop() || "webm";
      const uploadName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(uploadName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("chat-files").getPublicUrl(uploadName);

      const fileType = fileName.includes("audio_") ? "audio" : (file instanceof File && file.type.startsWith("image/") ? "image" : "file");

      const { error } = await supabase.from("chat_messages").insert({
        content: fileName.includes("audio_") ? "Mensaje de voz" : fileName,
        file_url: publicUrl,
        file_type: fileType,
        author_id: userId!,
        group_id: groupId
      });

      if (error) throw error;
      return true;
    },
    onSettled: () => setUploading(false),
    onError: (error: any) => {
      toast.error("Error al subir archivo", {
        description: error.message,
      });
    }
  });

  return {
    messages,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    uploading,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    editMessage: editMessageMutation.mutate,
    deleteMessage: deleteMessageMutation.mutate,
    sendFile: sendFileMutation.mutate,
  };
};
