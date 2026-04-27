import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "https://esm.sh/web-push@3.6.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  type: 'event_reminder' | 'new_member' | 'new_song' | 'announcement' | 'custom' | 'forum_post';
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, unknown>;
  targetUserIds?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured in Edge Function secrets');
    }

    webpush.setVapidDetails(
      'mailto:info@privilegiados.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushPayload = await req.json();
    
    console.log('Push Request:', payload);

    // Get subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    if (payload.targetUserIds && payload.targetUserIds.length > 0) {
      query = query.in('user_id', payload.targetUserIds);
    }

    const { data: subscriptions, error: subError } = await query;
    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/logo.jpg',
      url: payload.url || '/',
      data: payload.data,
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };
          await webpush.sendNotification(pushSubscription, notificationPayload);
          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          console.error(`Push failed for ${sub.endpoint}:`, error);
          if (error.statusCode === 404 || error.statusCode === 410) {
            return { success: false, endpoint: sub.endpoint, remove: true };
          }
          return { success: false, endpoint: sub.endpoint };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const toRemove = results
      .filter(r => r.status === 'fulfilled' && !r.value.success && r.value.remove)
      .map(r => (r as any).value.endpoint);

    if (toRemove.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', toRemove);
    }

    // Log to notification_logs
    await supabase.from('notification_logs').insert({
      type: payload.type,
      title: payload.title,
      body: payload.body,
      recipients_count: successCount
    });

    return new Response(
      JSON.stringify({ success: true, sent: successCount, total: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});