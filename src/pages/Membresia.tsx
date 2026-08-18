import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Check,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Zap,
  Crown,
  Calendar,
  Users,
  Music,
  Loader2,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroupContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  MEMBERSHIP_PLANS,
  MembershipPlan,
  createMercadoPagoPreference,
  verifyAndActivatePayment,
  fetchGroupPayments,
} from "@/services/mercadoPagoService";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Membresia() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeGroup, refetchGroups } = useGroup();
  const subscription = useSubscription();
  const queryClient = useQueryClient();

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "quarterly" | "annual">("quarterly");
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Fetch payment history
  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ["group-payments", activeGroup?.id],
    queryFn: () => fetchGroupPayments(activeGroup!.id),
    enabled: !!activeGroup?.id,
  });

  // Handle return from Mercado Pago
  useEffect(() => {
    const status = searchParams.get("status") || searchParams.get("collection_status");
    const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id");
    const preferenceId = searchParams.get("preference_id");
    const planParam = (searchParams.get("plan") as any) || "monthly";

    if ((status === "success" || status === "approved") && activeGroup && user) {
      setVerifying(true);
      verifyAndActivatePayment({
        paymentId: paymentId || `manual-${Date.now()}`,
        preferenceId: preferenceId || undefined,
        groupId: activeGroup.id,
        userId: user.id,
        planId: planParam,
      })
        .then(() => {
          toast.success("¡Pago procesado con éxito!", {
            description: "La membresía de tu grupo ha sido activada.",
          });
          refetchGroups();
          refetchPayments();
          // Clean search params
          setSearchParams({});
        })
        .catch((err) => {
          console.error(err);
          toast.error("Hubo un detalle al registrar el pago", {
            description: "Si el cobro se realizó, la activación se completará automáticamente.",
          });
        })
        .finally(() => {
          setVerifying(false);
        });
    } else if (status === "failure" || status === "rejected") {
      toast.error("El pago no se completó", {
        description: "Puedes intentar nuevamente con otro medio de pago.",
      });
      setSearchParams({});
    }
  }, [searchParams, activeGroup, user]);

  const handleCheckout = async (plan: MembershipPlan) => {
    if (!activeGroup || !user) {
      toast.error("Debes tener un grupo activo seleccionado.");
      return;
    }

    if (!subscription.canManage) {
      toast.error("Solo los administradores del grupo pueden gestionar los pagos.");
      return;
    }

    setProcessingPlan(plan.id);
    try {
      const preference = await createMercadoPagoPreference({
        groupId: activeGroup.id,
        groupName: activeGroup.name,
        planId: plan.id,
        userId: user.id,
        userEmail: user.email,
        userName: user.user_metadata?.full_name,
      });

      if (preference.init_point) {
        toast.info("Redirigiendo a Mercado Pago...");
        window.location.href = preference.init_point;
      }
    } catch (err: any) {
      console.error(err);
      toast.error("No se pudo iniciar el pago", {
        description: err.message || "Verifica tu conexión.",
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <main className="flex-1 pt-20 pb-24 px-3 sm:px-6 lg:px-8 safe-top safe-bottom max-w-6xl mx-auto w-full overflow-x-hidden">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all h-10 px-4 font-semibold text-sm gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>

        <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-muted/60 border-border text-foreground">
          Grupo: {activeGroup?.name || "Sin Grupo"}
        </Badge>
      </div>

      {/* Header Title */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5" />
          Membresías y Planes
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          Potencia tu Grupo de Alabanza
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Cancionero ilimitado, acordes sincronizados en vivo, modo atril y asistente de IA para todos los músicos de tu equipo.
        </p>
      </div>

      {/* Verification Loader */}
      {verifying && (
        <Card className="p-6 mb-8 border-primary/30 bg-primary/5 rounded-2xl flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm font-bold text-foreground">Verificando y activando tu membresía con Mercado Pago...</p>
        </Card>
      )}

      {/* Current Subscription Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10">
        {/* Status Box */}
        <Card className="md:col-span-8 p-6 bg-card border-border rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado de tu Grupo</p>
              <h3 className="text-xl font-bold text-foreground mt-0.5">{activeGroup?.name}</h3>
            </div>
            <div>
              {subscription.isActive ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs px-3 py-1 font-bold gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {subscription.planName} Activo
                </Badge>
              ) : subscription.isTrial ? (
                <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs px-3 py-1 font-bold gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Prueba Gratuita (30 días)
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs px-3 py-1 font-bold gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Prueba Finalizada
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>
                {subscription.isActive
                  ? `Vigencia de la suscripción`
                  : subscription.isTrial
                  ? `Días restantes del mes de prueba`
                  : `Membresía requerida`}
              </span>
              <span className="text-foreground font-bold">
                {subscription.isActive && subscription.subscriptionEndsAt
                  ? `Vence: ${format(subscription.subscriptionEndsAt, "dd 'de' MMMM, yyyy", { locale: es })}`
                  : subscription.isTrial
                  ? `${subscription.daysRemaining} días restantes`
                  : `0 días`}
              </span>
            </div>

            {/* Progress bar for trial */}
            {subscription.isTrial && (
              <Progress value={Math.max(5, (subscription.daysRemaining / 30) * 100)} className="h-2.5 bg-muted" />
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              {subscription.isActive
                ? "Tu grupo cuenta con todas las funciones desbloqueadas y capacidad ampliada de IA."
                : subscription.isTrial
                ? "Todos los nuevos grupos disfrutan de 30 días de prueba sin cargo para explorar repertorios, vivos y el cancionero."
                : "El período de prueba ha terminado. Elige un plan debajo para reactivar la sincronización en vivo y la IA."}
            </p>
          </div>
        </Card>

        {/* Daily AI Quota Box */}
        <Card className="md:col-span-4 p-6 bg-card border-border rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cupo Diario de IA</p>
            </div>
            <h4 className="text-lg font-bold text-foreground">
              {subscription.aiRequestsToday} / {subscription.aiLimit} canciones
            </h4>
          </div>

          <div className="space-y-2">
            <Progress
              value={Math.min(100, (subscription.aiRequestsToday / subscription.aiLimit) * 100)}
              className="h-2 bg-muted"
            />
            <p className="text-[11px] text-muted-foreground">
              {subscription.isActive
                ? "Límite ampliado de 50 consultas de IA al día."
                : "Límite de prueba: 10 consultas por día. Se reinicia cada medianoche."}
            </p>
          </div>
        </Card>
      </div>

      {/* Plans Pricing Grid */}
      <div className="mb-14 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-foreground tracking-tight">Selecciona el Plan para tu Grupo</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Un solo pago cubre a todos los directores, cantantes e instrumentistas de tu grupo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {MEMBERSHIP_PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isCurrentActive = subscription.isActive && subscription.plan === plan.id;

            return (
              <Card
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`p-6 sm:p-7 rounded-2xl flex flex-col justify-between transition-all relative cursor-pointer ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/30 shadow-lg bg-card"
                    : "border-border hover:border-border/80 bg-card/60"
                }`}
              >
                {/* Popular or Savings Badge */}
                {plan.savingsBadge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground font-black text-[11px] px-3 py-0.5 uppercase shadow-md">
                      {plan.savingsBadge}
                    </Badge>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                    {plan.badge && (
                      <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground min-h-[32px]">{plan.description}</p>

                  {/* Price */}
                  <div className="pt-2 pb-3 border-y border-border">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-foreground">
                        ${plan.price.toLocaleString("es-AR")}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">ARS</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      {plan.equivalentMonthly ? (
                        <>
                          Equivale a <strong className="text-foreground">${plan.equivalentMonthly.toLocaleString("es-AR")} ARS</strong> / mes
                        </>
                      ) : (
                        "Facturación mensual"
                      )}
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Incluye:</p>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                        <div className="p-0.5 rounded-full bg-emerald-500/15 text-emerald-500 shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-6 mt-4">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckout(plan);
                    }}
                    disabled={processingPlan === plan.id || !subscription.canManage}
                    className={`w-full h-12 rounded-xl font-bold text-xs sm:text-sm gap-2 shadow-sm transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {processingPlan === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generando Pago...
                      </>
                    ) : isCurrentActive ? (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Renovar {plan.name}
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Pagar con Mercado Pago
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Security & Payment Methods Badge */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Pagos Seguros y Procesados por Mercado Pago</p>
              <p className="text-[11px] text-muted-foreground">
                Acepta Tarjeta de Débito/Crédito, Dinero en cuenta de Mercado Pago, Rapipago, Pago Fácil y Transferencias.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-semibold text-muted-foreground border-border px-3 py-1">
            Garantía 100% Segura
          </Badge>
        </div>
      </div>

      {/* Payment History Section */}
      {payments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Historial de Pagos del Grupo
            </h3>
            <span className="text-xs text-muted-foreground">{payments.length} transacciones</span>
          </div>

          <Card className="border-border rounded-2xl overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase font-bold text-[10px] border-b border-border">
                  <tr>
                    <th className="p-3.5">Fecha</th>
                    <th className="p-3.5">Plan</th>
                    <th className="p-3.5">Monto</th>
                    <th className="p-3.5">Medio</th>
                    <th className="p-3.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 font-medium text-foreground">
                        {p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy HH:mm") : "-"}
                      </td>
                      <td className="p-3.5 capitalize font-semibold text-foreground">
                        {p.plan === "annual" ? "Anual" : p.plan === "quarterly" ? "Trimestral" : "Mensual"}
                      </td>
                      <td className="p-3.5 font-bold text-foreground">
                        ${Number(p.amount).toLocaleString("es-AR")} ARS
                      </td>
                      <td className="p-3.5 text-muted-foreground uppercase text-[10px]">
                        {p.payment_type || "Mercado Pago"}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          className={`text-[10px] uppercase font-extrabold px-2 py-0.5 ${
                            p.status === "approved"
                              ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                          }`}
                        >
                          {p.status === "approved" ? "Aprobado" : p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
