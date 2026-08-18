import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroupContext";
import {
  fetchGroupById,
  fetchGroupMembers,
  fetchPendingRequests,
  approveRequest,
  rejectRequest,
  updateMemberRole,
  removeMember,
  updateGroup,
  uploadGroupLogo,
} from "@/services/groupService";
import {
  ArrowLeft, Crown, Users, Shield, Clock, Check, X, Copy,
  Settings, UserMinus, ChevronRight, Link2, Camera, Loader2, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";
import type { GroupMember, GroupJoinRequest } from "@/types";

type TabId = "requests" | "members" | "settings";

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "lider", label: "Líder" },
  { value: "moderador", label: "Moderador" },
  { value: "miembro", label: "Miembro" },
];

const GrupoConfig = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGroupAdmin, refetchGroups } = useGroup();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>("requests");
  const [removingMember, setRemovingMember] = useState<GroupMember | null>(null);

  // Fetch group
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["groupConfig", id],
    queryFn: () => fetchGroupById(id!),
    enabled: !!id,
  });

  // Fetch members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["groupMembers", id],
    queryFn: () => fetchGroupMembers(id!),
    enabled: !!id,
  });

  // Fetch pending requests
  const { data: pendingRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["pendingRequests", id],
    queryFn: () => fetchPendingRequests(id!),
    enabled: !!id,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (req: GroupJoinRequest) =>
      approveRequest(req.id, req.group_id, req.user_id, user!.id),
    onSuccess: () => {
      toast.success("Solicitud aprobada");
      queryClient.invalidateQueries({ queryKey: ["pendingRequests", id] });
      queryClient.invalidateQueries({ queryKey: ["groupMembers", id] });
    },
    onError: (e: any) => toast.error(e.message || "Error al aprobar"),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (req: GroupJoinRequest) =>
      rejectRequest(req.id, req.group_id, req.user_id, user!.id),
    onSuccess: () => {
      toast.success("Solicitud rechazada");
      queryClient.invalidateQueries({ queryKey: ["pendingRequests", id] });
    },
    onError: (e: any) => toast.error(e.message || "Error al rechazar"),
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      updateMemberRole(memberId, role),
    onSuccess: () => {
      toast.success("Rol actualizado");
      queryClient.invalidateQueries({ queryKey: ["groupMembers", id] });
      refetchGroups();
    },
    onError: (e: any) => toast.error(e.message || "Error al actualizar rol"),
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      toast.success("Miembro eliminado del grupo");
      queryClient.invalidateQueries({ queryKey: ["groupMembers", id] });
      setRemovingMember(null);
    },
    onError: (e: any) => toast.error(e.message || "Error al eliminar"),
  });

  const copyInviteLink = () => {
    if (!group) return;
    const link = `${window.location.origin}/unirse/${group.slug}`;
    const text = `🤝 *Invitación al Grupo "${group.name}" - Privilegiados App* 🤝\n\n¡Hola! Te invito a formar parte de nuestro grupo musical en Privilegiados App. Regístrate y accede a todas nuestras canciones, repertorios y ensayos desde este enlace:\n\n🔗 ${link}`;
    navigator.clipboard.writeText(text);
    toast.success("Mensaje de invitación copiado", { description: "Compártelo con los nuevos integrantes." });
  };

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  if (!group) {
    navigate("/grupos");
    return null;
  }

  const tabs: { id: TabId; label: string; icon: any; count?: number }[] = [
    { id: "requests", label: "Solicitudes", icon: Clock, count: pendingRequests.length },
    { id: "members", label: "Miembros", icon: Users, count: members.length },
    { id: "settings", label: "Ajustes", icon: Settings },
  ];

  return (
    <main className="flex-1 min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{group.name}</h1>
            <p className="text-[10px] text-secondary font-black uppercase tracking-wider">Configuración</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Invite Link Banner */}
        <Card className="p-4 mb-3 rounded-2xl border-secondary/20 bg-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-5 h-5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">Enlace de invitación</p>
              <p className="text-[10px] text-muted-foreground font-mono truncate">
                /unirse/{group.slug}
              </p>
            </div>
            <Button
              size="sm"
              onClick={copyInviteLink}
              className="rounded-xl bg-secondary text-primary font-bold text-xs h-9 px-4"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar
            </Button>
          </div>
        </Card>

        {/* Subscription / Membership Banner */}
        <Card className="p-4 mb-6 rounded-2xl border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">Membresía y Planes</p>
              <p className="text-[11px] text-muted-foreground">
                Estado del mes de prueba, límites de IA y pagos con Mercado Pago
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/grupos/${group.id}/membresia`)}
            className="rounded-xl bg-primary text-primary-foreground font-bold text-xs h-9 px-4 shrink-0 gap-1.5"
          >
            Administrar Membresía
          </Button>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? "bg-secondary text-primary shadow-lg shadow-secondary/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black
                  ${activeTab === tab.id ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "requests" && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {requestsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl bg-muted" />)}
                </div>
              ) : pendingRequests.length === 0 ? (
                <Card className="p-12 text-center rounded-2xl border-border">
                  <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="font-bold text-foreground mb-1">Sin solicitudes</h3>
                  <p className="text-xs text-muted-foreground">
                    Comparte el enlace de invitación para recibir solicitudes.
                  </p>
                </Card>
              ) : (
                pendingRequests.map((req) => (
                  <Card key={req.id} className="p-4 rounded-2xl border-border">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12 border border-border">
                        <AvatarImage src={req.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary/10 text-secondary font-bold">
                          {req.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-foreground text-sm">{req.display_name}</h4>
                        {req.instrument && (
                          <p className="text-[10px] font-black uppercase tracking-wider text-secondary">
                            {req.instrument}
                          </p>
                        )}
                        {req.message && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(req)}
                        disabled={approveMutation.isPending}
                        className="flex-1 h-10 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20 font-bold text-xs"
                      >
                        <Check className="w-4 h-4 mr-1" /> Aprobar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => rejectMutation.mutate(req)}
                        disabled={rejectMutation.isPending}
                        className="flex-1 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 font-bold text-xs"
                      >
                        <X className="w-4 h-4 mr-1" /> Rechazar
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "members" && (
            <motion.div
              key="members"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {membersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl bg-muted" />)}
                </div>
              ) : (
                members.map((member) => (
                  <Card key={member.id} className="p-4 rounded-2xl border-border">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border border-border">
                        <AvatarImage src={member.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary/10 text-secondary font-bold">
                          {(member.display_name || member.profiles?.full_name || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-foreground text-sm truncate">
                          {member.display_name || member.profiles?.full_name}
                        </h4>
                        <div className="flex items-center gap-2">
                          {member.role === "admin" && <Crown className="w-3 h-3 text-secondary" />}
                          <span className="text-[10px] font-black uppercase tracking-wider text-secondary">
                            {member.role}
                          </span>
                          {member.instrument && (
                            <span className="text-[10px] text-muted-foreground">• {member.instrument}</span>
                          )}
                        </div>
                      </div>

                      {/* Admin controls (can't modify yourself) */}
                      {isGroupAdmin && member.user_id !== user?.id && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(role) =>
                              updateRoleMutation.mutate({ memberId: member.id, role })
                            }
                          >
                            <SelectTrigger className="w-[130px] h-9 rounded-xl text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRemovingMember(member)}
                            className="h-9 w-9 rounded-xl hover:bg-red-500/10 hover:text-red-500"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <GroupSettingsForm group={group} onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ["groupConfig", id] });
                refetchGroups();
              }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Remove Member Dialog */}
      <AlertDialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <AlertDialogContent className="rounded-[2rem] border-red-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-red-500">
              ¿Eliminar miembro?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removingMember?.display_name || removingMember?.profiles?.full_name}</strong> será
              eliminado del grupo. Podrá solicitar ingreso nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-12 rounded-2xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingMember && removeMemberMutation.mutate(removingMember.id)}
              className="h-12 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

// ──────────────────────────────────────────────
//  Settings Form
// ──────────────────────────────────────────────

function GroupSettingsForm({ group, onUpdate }: { group: any; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [name, setName] = useState(group.name || "");
  const [description, setDescription] = useState(group.description || "");
  const [logoUrl, setLogoUrl] = useState(group.logo_url || "");

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const url = await uploadGroupLogo(group.id, file);
      setLogoUrl(url);
      toast.success("Logo subido temporalmente. Guarda los cambios para confirmar.");
    } catch (err: any) {
      toast.error(err.message || "Error al subir el logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateGroup(group.id, { name, description, logo_url: logoUrl || null });
      toast.success("Configuración actualizada");
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Group Logo Selector */}
      <div className="flex flex-col items-center justify-center space-y-3 mb-6">
        <Label className="text-xs font-black uppercase tracking-wider text-secondary">
          Logo del Grupo
        </Label>
        <div className="relative group/logo">
          <Avatar className="w-24 h-24 border-2 border-secondary/20 group-hover/logo:border-secondary/60 transition-all duration-300">
            <AvatarImage src={logoUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-muted text-muted-foreground text-3xl font-black">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <label 
            htmlFor="logo-upload" 
            className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover/logo:opacity-100 cursor-pointer transition-opacity duration-300"
          >
            {uploadingLogo ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
          </label>
          <input 
            type="file" 
            id="logo-upload" 
            accept="image/*" 
            className="hidden" 
            onChange={handleLogoChange}
            disabled={uploadingLogo}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">Recomendado: Imagen cuadrada (PNG o JPG)</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-black uppercase tracking-wider text-secondary">
          Nombre del Grupo
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-14 text-base bg-muted/50 border-border rounded-2xl px-5 font-medium"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-black uppercase tracking-wider text-secondary">
          Descripción
        </Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[120px] text-base bg-muted/50 border-border rounded-2xl px-5 py-4 font-medium resize-none"
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={loading || uploadingLogo}
        className="w-full h-14 rounded-2xl bg-secondary text-primary font-black uppercase tracking-widest"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
      </Button>
    </div>
  );
}

export default GrupoConfig;
