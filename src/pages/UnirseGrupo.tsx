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
      <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <Card className="p-12 text-center rounded-3xl border-border max-w-sm w-full">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Grupo no encontrado</h2>
          <p className="text-sm text-muted-foreground mb-6">
            El enlace que usaste no corresponde a ningún grupo activo.
          </p>
          <Button onClick={() => navigate("/grupos")} className="rounded-xl">
            Ir a Mis Grupos
          </Button>
        </Card>
      </main>
    );
  }

  // Not logged in — redirect to auth
  if (!user) {
    return (
      <main className="min-h-screen flex flex-col bg-background">
        <div className="max-w-lg mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center">
          {/* Group Preview */}
          <GroupPreview group={group} memberCount={memberCount} />

          <Card className="w-full p-8 text-center rounded-3xl border-border mt-8">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Inicia sesión para unirte
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Necesitas una cuenta para solicitar acceso a este grupo.
            </p>
            <Button
              onClick={() => navigate(`/auth?redirect=/unirse/${slug}`)}
              className="w-full h-12 rounded-xl bg-secondary text-primary font-bold"
            >
              Iniciar Sesión con Google
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  // Already approved → go to dashboard
  if (memberStatus === "approved") {
    return (
      <main className="min-h-screen flex flex-col bg-background">
        <div className="max-w-lg mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center">
          <GroupPreview group={group} memberCount={memberCount} />

          <Card className="w-full p-8 text-center rounded-3xl border-secondary/20 mt-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              ¡Ya eres miembro!
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Ya perteneces a <strong>{group.name}</strong>.
            </p>
            <Button
              onClick={() => navigate("/")}
              className="w-full h-12 rounded-xl bg-secondary text-primary font-bold"
            >
              Ir al Dashboard
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  // Pending request
  if (memberStatus === "pending") {
    return (
      <main className="min-h-screen flex flex-col bg-background">
        <div className="max-w-lg mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center">
          <GroupPreview group={group} memberCount={memberCount} />

          <Card className="w-full p-8 text-center rounded-3xl border-amber-500/20 mt-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              Solicitud pendiente
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Tu solicitud para unirte a <strong>{group.name}</strong> está siendo revisada por el administrador.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/grupos")}
              className="w-full h-12 rounded-xl font-bold"
            >
              Ir a Mis Grupos
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  // Show join form
  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">Solicitar Ingreso</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 flex-1">
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
              className="h-14 text-base bg-muted/50 border-border rounded-2xl px-5 font-medium"
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
              className="h-14 text-base bg-muted/50 border-border rounded-2xl px-5 font-medium"
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
              className="min-h-[120px] text-base bg-muted/50 border-border rounded-2xl px-5 py-4 font-medium resize-none"
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
              className="w-full h-14 rounded-2xl bg-secondary text-primary font-black uppercase tracking-widest text-sm shadow-xl shadow-secondary/20 disabled:opacity-50"
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="p-6 rounded-3xl border-border text-center">
        <Avatar className="w-20 h-20 mx-auto mb-4 rounded-2xl border border-border">
          <AvatarImage src={group.logo_url || undefined} className="object-cover rounded-2xl" />
          <AvatarFallback className="bg-secondary/10 text-secondary font-black text-2xl rounded-2xl">
            {group.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-black text-foreground mb-1">{group.name}</h2>
        {group.description && (
          <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
        )}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-bold">
          <Users className="w-3.5 h-3.5" />
          {memberCount} miembro{memberCount !== 1 ? "s" : ""}
        </div>
      </Card>
    </motion.div>
  );
}

export default UnirseGrupo;
