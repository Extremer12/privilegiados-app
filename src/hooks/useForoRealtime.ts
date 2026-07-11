import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ChatMessageType, UserPresence } from "@/types";

export const useForoRealtime = (userId: string | undefined, groupId: string | undefined) => {
  const queryClient = useQueryClient();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setupRealtimeChannel = useCallback(() => {
    if (!userId || !groupId) return;

    const channel = supabase.channel(`forum_room_${groupId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<UserPresence>();
        const online = Object.keys(state);
        setOnlineUsers(online);

        const typing = new Set<string>();
        Object.entries(state).forEach(([uId, presences]) => {
          if (presences[0]?.typing && uId !== userId) {
            typing.add(uId);
          }
        });
        setTypingUsers(typing);
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        const newMessage = payload.new as ChatMessageType;
        queryClient.setQueryData(['chat_messages', groupId], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any, i: number) => 
              i === 0 ? [newMessage, ...page] : page
            )
          };
        });
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "chat_messages",
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        const updatedMessage = payload.new as ChatMessageType;
        queryClient.setQueryData(['chat_messages', groupId], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => 
              page.map((msg: any) => msg.id === updatedMessage.id ? updatedMessage : msg)
            )
          };
        });
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "chat_messages",
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        const deletedId = payload.old.id;
        queryClient.setQueryData(['chat_messages', groupId], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => 
              page.filter((msg: any) => msg.id !== deletedId)
            )
          };
        });
      });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
          typing: false,
        });
      } else if (status === "CHANNEL_ERROR") {
        setIsConnected(false);
        toast.error("Conexión perdida", {
          description: "Reintentando conectar...",
        });
      }
    });

    channelRef.current = channel;
  }, [userId, groupId, queryClient]);

  useEffect(() => {
    setupRealtimeChannel();
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [setupRealtimeChannel]);

  const handleTyping = useCallback(() => {
    if (!userId || !channelRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    channelRef.current.track({
      user_id: userId,
      online_at: new Date().toISOString(),
      typing: true,
    });

    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.track({
        user_id: userId,
        online_at: new Date().toISOString(),
        typing: false,
      });
    }, 2000);
  }, [userId]);

  return {
    onlineUsers,
    typingUsers,
    isConnected,
    handleTyping,
    trackStatus: (typing: boolean) => {
        if (channelRef.current && userId) {
            channelRef.current.track({
                user_id: userId,
                online_at: new Date().toISOString(),
                typing
            });
        }
    }
  };
};
