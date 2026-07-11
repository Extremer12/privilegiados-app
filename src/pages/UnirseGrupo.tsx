import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchGroupBySlug,
  submitJoinRequest,
  checkMembershipStatus,
  fetchApprovedMemberCount,
} from "@/services/groupService";
import {
  ArrowLeft, Users, Loader2, CheckCircle2, Clock, XCircle, Send, Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";

const UnirseGrupo = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    instrument: "",
    message: "",
  });

  // Fetch the group by slug
  const { data: group, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ["groupBySlug", slug],
    queryFn: () => fetchGroupBySlug(slug!),
    enabled: !!slug,
  });

  // Check if user already has a membership status
  const { data: memberStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["membershipStatus", group?.id, user?.id],
    queryFn: () => checkMembershipStatus(group!.id, user!.id),
    enabled: !!group && !!user,
  });

  // Fetch member count
  const { data: memberCount = 0 } = useQuery({
    queryKey: ["memberCount", group?.id],
    queryFn: () => fetchApprovedMemberCount(group!.id),
    enabled: !!group,
  });

  // Pre-fill name from profile if available
  useEffect(() => {
    if (user?.user_metadata?.full_name && !formData.displayName) {
      setFormData((prev) => ({
        ...prev,
        displayName: user.user_metadata.full_name,
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !group || !formData.displayName.trim()) return;

    setSubmitting(true);
    try {
      await submitJoinRequest(
        group.id,
        user.id,
        formData.displayName.trim(),
        formData.instrument.trim(),
        formData.message.trim(),
      );
      toast.success("¡Solicitud enviada!", {
        description: "El administrador del grupo revisará tu solicitud.",
      });
      refetchStatus();
    } catch (error: any) {
      toast.error("Error al enviar solicitud", {
        description: error.message || "Intenta de nuevo",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (groupLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  // Group not found
  if (!group || groupError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative overflow-hidden select-none">
        {/* Cinematic Ambient Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-sm w-full relative z-10"
        >
          <Card className="p-10 text-center rounded-3xl bg-card/30 backdrop-blur-xl border-border/50 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-destructive/10 to-transparent opacity-50" />
              <div className="absolute inset-0 blur-md bg-destructive/20 scale-75 rounded-full" />
              <XCircle className="w-8 h-8 text-destructive relative z-10" />
            </div>
            <h2 className="text-xl font-black uppercase text-foreground mb-2">Grupo no encontrado</h2>
            <p className="text-sm text-muted-foreground mb-6 font-medium leading-relaxed">
              El enlace que usaste no corresponde a ningún grupo activo o el grupo ya no existe.
            </p>
            <Button 
              onClick={() => navigate("/grupos")} 
              className="w-full h-12 rounded-xl bg-secondary text-primary font-bold uppercase tracking-wider text-xs shadow-lg shadow-secondary/10"
            >
              Ir a Mis Grupos
            </Button>
          </Card>
        </motion.div>
      </main>
    );
  }

  // Not logged in — redirect to auth
  if (!user) {
    return (
      <main className="min-h-screen flex flex-col bg-background relative overflow-hidden select-none">
        {/* Cinematic Ambient Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        </div>

        <div className="max-w-md mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center relative z-10 w-full">
          {/* Group Preview */}
          <GroupPreview group={group} memberCount={memberCount} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full mt-6"
          >
            <Card className="w-full p-8 text-center rounded-3xl bg-card/30 backdrop-blur-xl border-border/50 shadow-2xl">
              <h3 className="text-lg font-black uppercase text-foreground mb-2">
                Inicia sesión para unirte
              </h3>
              <p className="text-sm text-muted-foreground mb-6 font-medium leading-relaxed">
                Necesitas iniciar sesión con tu cuenta de Google para solicitar acceso a este grupo musical.
              </p>
              <Button
                onClick={() => navigate(`/auth?redirect=/unirse/${slug}`)}
                className="w-full h-14 rounded-2xl bg-secondary text-primary font-black uppercase tracking-widest text-sm shadow-xl shadow-secondary/15 hover:shadow-secondary/25 transition-all duration-300"
              >
                Iniciar Sesión con Google
              </Button>
            </Card>
          </motion.div>
        </div>
      </main>
    );
  }

  // Already approved → go to dashboard
  if (memberStatus === "approved") {
    return (
      <main className="min-h-screen flex flex-col bg-background relative overflow-hidden select-none">
        {/* Cinematic Ambient Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        </div>

        <div className="max-w-md mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center relative z-10 w-full">
          <GroupPreview group={group} memberCount={memberCount} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full mt-6"
          >
            <Card className="w-full p-8 text-center rounded-3xl bg-card/30 backdrop-blur-xl border-secondary/20 shadow-2xl">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-green-500/10 to-transparent opacity-50" />
                <div className="absolute inset-0 blur-md bg-green-500/20 scale-75 rounded-full" />
                <CheckCircle2 className="w-8 h-8 text-green-500 relative z-10" />
              </div>
              <h3 className="text-lg font-black uppercase text-foreground mb-2">
                ¡Ya eres miembro!
              </h3>
              <p className="text-sm text-muted-foreground mb-6 font-medium leading-relaxed">
                Ya eres un miembro activo de <strong>{group.name}</strong>. Puedes ingresar a la plataforma ahora.
              </p>
              <Button
                onClick={() => navigate("/")}
                className="w-full h-14 rounded-2xl bg-secondary text-primary font-black uppercase tracking-widest text-sm shadow-xl shadow-secondary/15 hover:shadow-secondary/25 transition-all duration-300"
              >
                Ir al Dashboard
              </Button>
            </Card>
          </motion.div>
        </div>
      </main>
    );
  }

  // Pending request
  if (memberStatus === "pending") {
    return (
      <main className="min-h-screen flex flex-col bg-background relative overflow-hidden select-none">
        {/* Cinematic Ambient Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        </div>

        <div className="max-w-md mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center relative z-10 w-full">
          <GroupPreview group={group} memberCount={memberCount} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full mt-6"
          >
            <Card className="w-full p-8 text-center rounded-3xl bg-card/30 backdrop-blur-xl border-amber-500/20 shadow-2xl">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent opacity-50" />
                <div className="absolute inset-0 blur-md bg-amber-500/20 scale-75 rounded-full" />
                <Clock className="w-8 h-8 text-amber-500 relative z-10 animate-pulse" />
              </div>
              <h3 className="text-lg font-black uppercase text-foreground mb-2">
                Solicitud pendiente
              </h3>
              <p className="text-sm text-muted-foreground mb-6 font-medium leading-relaxed">
                Tu solicitud para unirte a <strong>{group.name}</strong> está en espera de aprobación por parte del administrador.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate("/grupos")}
                className="w-full h-12 rounded-xl border-border bg-muted/20 hover:bg-muted/40 font-bold uppercase tracking-wider text-xs transition-all duration-300"
              >
                Ir a Mis Grupos
              </Button>
            </Card>
          </motion.div>
        </div>
      </main>
    );
  }

  // Show join form
  return (
    <main className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Cinematic Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3 relative z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl bg-muted/20 border border-border">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-black uppercase tracking-wider">Solicitar Ingreso</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 flex-1 relative z-10 w-full">
        {/* Group Preview */}
        <GroupPreview group={group} memberCount={memberCount} />

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <Label className="text-xs font-black uppercase tracking-wider text-secondary">
              Tu Nombre *
            </Label>
            <Input
              placeholder="¿Cómo te conocen en el grupo?"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="h-14 text-base bg-muted/30 border-border/80 focus:border-secondary rounded-2xl px-5 font-medium"
              required
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <Label className="text-xs font-black uppercase tracking-wider text-secondary">
              Tu Rol / Instrumento
            </Label>
            <Input
              placeholder="Ej: Guitarrista, Vocalista, Bajista..."
              value={formData.instrument}
              onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
              className="h-14 text-base bg-muted/30 border-border/80 focus:border-secondary rounded-2xl px-5 font-medium"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <Label className="text-xs font-black uppercase tracking-wider text-secondary">
              Mensaje para el Admin
            </Label>
            <Textarea
              placeholder="Cuéntale al administrador un poco sobre ti..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="min-h-[120px] text-base bg-muted/30 border-border/80 focus:border-secondary rounded-2xl px-5 py-4 font-medium resize-none"
              rows={4}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              type="submit"
              disabled={submitting || !formData.displayName.trim()}
              className="w-full h-14 rounded-2xl bg-secondary text-primary font-black uppercase tracking-widest text-sm shadow-xl shadow-secondary/15 hover:shadow-secondary/25 transition-all duration-300"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </div>
    </main>
  );
};

// ──────────────────────────────────────────────
//  Group Preview Component
// ──────────────────────────────────────────────

function GroupPreview({ group, memberCount }: { group: any; memberCount: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="p-6 bg-muted/10 backdrop-blur-xl border-border/50 text-center rounded-3xl relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-tr from-secondary/5 to-transparent opacity-30" />
        <Avatar className="w-20 h-20 mx-auto mb-4 rounded-2xl border border-border shadow-lg">
          <AvatarImage src={group.logo_url || undefined} className="object-cover rounded-2xl" />
          <AvatarFallback className="bg-secondary/15 text-secondary font-black text-2xl rounded-2xl">
            {group.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-2xl font-black text-foreground mb-1 tracking-tight">{group.name}</h2>
        {group.description && (
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto leading-relaxed">{group.description}</p>
        )}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/15 text-xs text-secondary font-bold">
          <Users className="w-3.5 h-3.5" />
          {memberCount} miembro{memberCount !== 1 ? "s" : ""}
        </div>
      </Card>
    </motion.div>
  );
}

export default UnirseGrupo;
