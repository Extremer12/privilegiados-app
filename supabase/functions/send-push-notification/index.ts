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
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Validate request
    const payload: PushPayload = await req.json();
    if (!payload.title || !payload.body || !payload.type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check authorization
    // If it's the service role key (from a trigger), skip user validation
    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
    
    if (!isServiceRole) {
      const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)
        .auth.getUser(authHeader.replace('Bearer ', ''));

      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if user is admin/moderator for global announcements
      if (!payload.targetUserIds || payload.targetUserIds.length === 0) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        const authorizedRoles = ['admin', 'moderador', 'lider'];
        if (!roleData || !authorizedRoles.includes(roleData.role)) {
          return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions for global notifications' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    webpush.setVapidDetails(
      'mailto:info@privilegiados.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    console.log('Sending push:', payload.type, payload.title);

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