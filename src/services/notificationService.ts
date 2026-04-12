import { supabase } from '@/integrations/supabase/client';

type NotificationType = 'event_reminder' | 'new_member' | 'new_song' | 'announcement' | 'custom';

interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, unknown>;
  targetUserIds?: string[];
}

export const notificationService = {
  async send(payload: NotificationPayload): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: payload
      });

      if (error) {
        console.error('Error sending notification:', error);
        return false;
      }

      console.log('Notification sent:', data);
      return true;
    } catch (error) {
      console.error('Error invoking notification function:', error);
      return false;
    }
  },

  async notifyNewSong(songTitle: string, songId: string): Promise<boolean> {
    return this.send({
      type: 'new_song',
      title: '🎵 Nueva canción agregada',
      body: `Se ha agregado "${songTitle}" al repertorio`,
      url: `/canciones/${songId}`,
      data: { songId }
    });
  },

  async notifyNewMember(memberName: string, memberId: string): Promise<boolean> {
    return this.send({
      type: 'new_member',
      title: '👋 Nuevo miembro',
      body: `${memberName} se ha unido al grupo`,
      url: `/perfil/${memberId}`,
      data: { memberId }
    });
  },

  async notifyEventReminder(
    eventTitle: string, 
    eventDate: string, 
    eventId: string
  ): Promise<boolean> {
    return this.send({
      type: 'event_reminder',
      title: '📅 Recordatorio de evento',
      body: `${eventTitle} - ${eventDate}`,
      url: '/eventos',
      data: { eventId }
    });
  },

  async notifyAnnouncement(
    title: string, 
    content: string, 
    priority: string
  ): Promise<boolean> {
    const emoji = priority === 'urgent' ? '🚨' : priority === 'high' ? '⚠️' : '📢';
    return this.send({
      type: 'announcement',
      title: `${emoji} ${title}`,
      body: content,
      url: '/',
      data: { priority }
    });
  }
};