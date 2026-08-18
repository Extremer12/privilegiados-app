import { useMemo } from "react";
import { useGroup } from "@/hooks/useGroupContext";
import { useUserRole } from "@/hooks/useUserRole";

export function useSubscription() {
  const { activeGroup, isGroupAdmin, isGroupLeader } = useGroup();
  const { isAdmin } = useUserRole();

  const subscriptionInfo = useMemo(() => {
    if (!activeGroup) {
      return {
        hasGroup: false,
        status: "trialing" as const,
        isTrial: true,
        isActive: false,
        isExpired: false,
        daysRemaining: 30,
        plan: null,
        planName: "Prueba Gratuita",
        trialEndsAt: null,
        subscriptionEndsAt: null,
        aiRequestsToday: 0,
        aiLimit: 10,
        canManage: false,
      };
    }

    const status = activeGroup.subscription_status || "trialing";
    const plan = activeGroup.subscription_plan || null;
    const trialEndsAt = activeGroup.trial_ends_at ? new Date(activeGroup.trial_ends_at) : null;
    const subscriptionEndsAt = activeGroup.subscription_ends_at ? new Date(activeGroup.subscription_ends_at) : null;
    const now = new Date();

    let isActive = false;
    let isTrial = false;
    let isExpired = false;
    let daysRemaining = 0;
    let planName = "Prueba Gratuita";
    let aiLimit = 10;

    if (status === "active" && subscriptionEndsAt && subscriptionEndsAt > now) {
      isActive = true;
      isTrial = false;
      isExpired = false;
      const diffMs = subscriptionEndsAt.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      planName = plan === "annual" ? "Plan Anual" : plan === "quarterly" ? "Plan Trimestral" : "Plan Mensual";
      aiLimit = 50;
    } else if (status === "trialing" && trialEndsAt) {
      const diffMs = trialEndsAt.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      if (now > trialEndsAt) {
        isExpired = true;
        isTrial = false;
        planName = "Prueba Vencida";
      } else {
        isTrial = true;
        isExpired = false;
        planName = "Prueba Gratuita (30 días)";
      }
      aiLimit = 10;
    } else {
      isExpired = true;
      planName = "Membresía Inactiva";
    }

    const aiRequestsToday = activeGroup.ai_requests_today || 0;
    const canManage = isGroupAdmin || isGroupLeader || isAdmin;

    return {
      hasGroup: true,
      status,
      isTrial,
      isActive,
      isExpired,
      daysRemaining,
      plan,
      planName,
      trialEndsAt,
      subscriptionEndsAt,
      aiRequestsToday,
      aiLimit,
      canManage,
    };
  }, [activeGroup, isGroupAdmin, isGroupLeader, isAdmin]);

  return subscriptionInfo;
}
