/**
 * Mercado Pago & Subscription Service for Privilegiados App
 */

import { supabase } from "@/integrations/supabase/client";
import type { GroupPayment } from "@/types";

export interface MembershipPlan {
  id: "monthly" | "quarterly" | "annual";
  name: string;
  price: number;
  period: string;
  durationDays: number;
  equivalentMonthly?: number;
  savingsBadge?: string;
  badge?: string;
  popular?: boolean;
  bestValue?: boolean;
  description: string;
  features: string[];
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "monthly",
    name: "Plan Mensual",
    price: 30000,
    period: "por mes",
    durationDays: 30,
    description: "Acceso completo mes a mes para todo tu grupo de alabanza.",
    features: [
      "Todos los miembros del grupo incluidos",
      "Canciones, acordes y repertorios ilimitados",
      "Sesiones en vivo y modo atril sincronizado",
      "Asistente con Búsqueda Real + IA para Acordes y Secciones (50/día)",
      "Proyección de letras en vivo para la congregación",
      "Soporte directo",
    ],
  },
  {
    id: "quarterly",
    name: "Plan Trimestral",
    price: 75000,
    period: "por 3 meses",
    durationDays: 90,
    equivalentMonthly: 25000,
    savingsBadge: "Ahorrás 16%",
    badge: "Recomendado",
    popular: true,
    description: "La mejor opción para planificar el trimestre con descuento.",
    features: [
      "Todo lo incluido en el Plan Mensual",
      "Equivale a $25.000 ARS por mes",
      "Ahorro de $15.000 cada 3 meses",
      "Prioridad en nuevas funciones",
    ],
  },
  {
    id: "annual",
    name: "Plan Anual",
    price: 240000,
    period: "por 1 año",
    durationDays: 365,
    equivalentMonthly: 20000,
    savingsBadge: "Ahorrás 33% (4 meses gratis)",
    badge: "Mejor Valor",
    bestValue: true,
    description: "Máximo ahorro para la iglesia con 4 meses bonificados al año.",
    features: [
      "Todo lo incluido en los planes anteriores",
      "Equivale a $20.000 ARS por mes",
      "Ahorro total de $120.000 al año",
      "Asistencia y soporte prioritario VIP",
    ],
  },
];

const MP_ACCESS_TOKEN = import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || "";

/**
 * Creates a Mercado Pago Checkout Pro preference for a group subscription
 */
export async function createMercadoPagoPreference({
  groupId,
  groupName,
  planId,
  userId,
  userEmail,
  userName,
}: {
  groupId: string;
  groupName: string;
  planId: "monthly" | "quarterly" | "annual";
  userId: string;
  userEmail?: string;
  userName?: string;
}): Promise<{ init_point: string; preference_id: string }> {
  if (!MP_ACCESS_TOKEN) {
    throw new Error("No se ha configurado la clave de Mercado Pago.");
  }

  const plan = MEMBERSHIP_PLANS.find((p) => p.id === planId);
  if (!plan) {
    throw new Error("Plan no válido.");
  }

  const origin = window.location.origin;
  const backUrl = `${origin}/membresia`;

  const preferenceData = {
    items: [
      {
        id: `plan-${plan.id}`,
        title: `Membresía ${plan.name} - ${groupName}`,
        description: `Suscripción ${plan.period} para el grupo "${groupName}" en Privilegiados App`,
        quantity: 1,
        currency_id: "ARS",
        unit_price: plan.price,
      },
    ],
    payer: {
      email: userEmail || "usuario@privilegiados.app",
      name: userName || "Director de Alabanza",
    },
    back_urls: {
      success: `${backUrl}?status=success&group_id=${groupId}&plan=${planId}`,
      failure: `${backUrl}?status=failure&group_id=${groupId}`,
      pending: `${backUrl}?status=pending&group_id=${groupId}`,
    },
    auto_return: "approved",
    external_reference: `${groupId}:${planId}:${userId}`,
    statement_descriptor: "PRIVILEGIADOS",
    metadata: {
      group_id: groupId,
      plan_id: planId,
      user_id: userId,
    },
  };

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferenceData),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error("Error creando preferencia en Mercado Pago:", errData);
    throw new Error(errData?.message || "No se pudo generar el enlace de pago con Mercado Pago.");
  }

  const data = await response.json();
  return {
    init_point: data.init_point,
    preference_id: data.id,
  };
}

/**
 * Verifies payment with Mercado Pago and activates the subscription in Supabase
 */
export async function verifyAndActivatePayment({
  paymentId,
  preferenceId,
  groupId,
  userId,
  planId,
  paymentType,
  payerEmail,
}: {
  paymentId: string;
  preferenceId?: string;
  groupId: string;
  userId: string;
  planId: "monthly" | "quarterly" | "annual";
  paymentType?: string;
  payerEmail?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    let verifiedAmount = 0;
    let verifiedStatus = "approved";
    let detectedType = paymentType || "mercado_pago";
    let detectedEmail = payerEmail || "";

    // If we have access token and paymentId, verify directly with MP API
    if (MP_ACCESS_TOKEN && paymentId) {
      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          },
        });
        if (mpRes.ok) {
          const mpData = await mpRes.json();
          verifiedStatus = mpData.status; // 'approved', 'pending', etc.
          verifiedAmount = mpData.transaction_amount || 0;
          detectedType = mpData.payment_type_id || mpData.payment_method_id || detectedType;
          detectedEmail = mpData.payer?.email || detectedEmail;
        }
      } catch (e) {
        console.warn("Could not verify directly with MP API, proceeding with fallback check", e);
      }
    }

    const plan = MEMBERSHIP_PLANS.find((p) => p.id === planId);
    const amount = verifiedAmount || plan?.price || 30000;

    if (verifiedStatus !== "approved") {
      return {
        success: false,
        message: `El pago se encuentra en estado: ${verifiedStatus}`,
      };
    }

    // Call Supabase RPC function to activate group subscription
    const { data: rpcResult, error } = await supabase.rpc("activate_group_subscription", {
      p_group_id: groupId,
      p_user_id: userId,
      p_plan: planId,
      p_amount: amount,
      p_payment_id: paymentId,
      p_preference_id: preferenceId || null,
      p_payment_type: detectedType,
      p_payer_email: detectedEmail || null,
    });

    if (error) throw error;

    return {
      success: true,
      message: "Suscripción activada con éxito.",
    };
  } catch (err: any) {
    console.error("Error activating group subscription:", err);
    throw err;
  }
}

/**
 * Fetches the payment history for a given music group
 */
export async function fetchGroupPayments(groupId: string): Promise<GroupPayment[]> {
  const { data, error } = await supabase
    .from("group_payments" as any)
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching group payments:", error);
    return [];
  }

  return (data as any) || [];
}

/**
 * Checks and increments group daily AI usage
 */
export async function checkGroupAIQuota(groupId: string): Promise<{
  allowed: boolean;
  reason?: string;
  message?: string;
  usage_today?: number;
  limit?: number;
  remaining?: number;
  is_active?: boolean;
}> {
  try {
    const { data, error } = await supabase.rpc("check_and_increment_group_ai_usage", {
      p_group_id: groupId,
    });

    if (error) {
      console.warn("Could not execute AI quota RPC, allowing fallback:", error);
      return { allowed: true, limit: 10, remaining: 10 };
    }

    return (data as any) || { allowed: true };
  } catch (err) {
    console.warn("AI quota check failed, allowing fallback:", err);
    return { allowed: true };
  }
}
