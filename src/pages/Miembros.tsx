import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useGroup } from "@/hooks/useGroupContext";
import { fetchGroupMembers, updateMemberRole, removeMember } from "@/services/groupService";
import { supabase } from "@/integrations/supabase/client";
import { User, Search, Users, Music, Mic, Shield, ShieldOff, Edit2, Check, UserCircle, Star, Crown, MessageSquare } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Profile as Member, UserRole } from "@/types";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <Crown className="w-4 h-4 text-secondary" />,
  pastor: <Shield className="w-4 h-4 text-secondary" />,
  lider: <Star className="w-4 h-4 text-secondary" />,
  moderador: <MessageSquare className="w-4 h-4 text-secondary" />,
  vocalista: <Mic className="w-4 h-4 text-secondary" />,
  guitarrista: <Music className="w-4 h-4 text-secondary" />,
  default: <User className="w-4 h-4 text-secondary/50" />,
};

const AVAILABLE_ROLES = [
  { value: "admin", label: "Administrador", icon: Crown },
  { value: "pastor", label: "Pastor", icon: Shield },
  { value: "lider", label: "Líder", icon: Star },
  { value: "moderador", label: "Moderador", icon: MessageSquare },
  { value: "vocalista", label: "Vocalista", icon: Mic },
  { value: "guitarrista", label: "Guitarrista", icon: Music },
  { value: "baterista", label: "Baterista", icon: Music },
  { value: "tecladista", label: "Tecladista", icon: Music },
  { value: "bajista", label: "Bajista", icon: Music },
  { value: "sonidista", label: "Sonidista", icon: Shield },
  { value: "otro", label: "Otro", icon: User },
];

const Miembros = () => {
  const { user, loading: authLoading } = useAuth();
  const { activeGroup, isGroupAdmin, isGroupLeader } = useGroup();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Redirect to groups page if user has no active group
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && !activeGroup) {
      navigate("/grupos");
    }
  }, [user, authLoading, activeGroup, navigate]);
  
  const { data: members = [], isLoading: loading } = useQuery({
    queryKey: ['groupMembersList', activeGroup?.id],
    queryFn: async () => {
      if (!activeGroup) return [];
      return fetchGroupMembers(activeGroup.id);
    },
    enabled: !!user && !!activeGroup,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("miembro");
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);

  const isUserAdmin = (userId: string) => {
    return members.some(m => m.user_id === userId && m.role === 'admin');
  };

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string, role: string }) => {
      await updateMemberRole(memberId, role);
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Rol actualizado", {
        description: "El rol del miembro ha sido actualizado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['groupMembersList', activeGroup?.id] });
      setEditingMember(null);
    },
    onError: (error: any) => {
      toast.error("Error", {
        description: error.message || "No se pudo actualizar el rol",
      });
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await removeMember(memberId);
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Miembro eliminado", {
        description: "El integrante ha sido retirado del grupo.",
      });
      queryClient.invalidateQueries({ queryKey: ['groupMembersList', activeGroup?.id] });
      setMemberToDelete(null);
    },
    onError: (error: any) => {
      toast.error("Error al eliminar", {
        description: error.message || "Ocurrió un error inesperado.",
      });
      setMemberToDelete(null);
    }
  });

  const handleUpdateRole = () => {
    if (!editingMember) return;
    updateRoleMutation.mutate({ 
      memberId: editingMember.id, 
      role: selectedRole
    });
  };

  const filteredMembers = members.filter((member) => {
    const searchLower = searchQuery.toLowerCase();
    const name = (member.display_name || member.profiles?.full_name || "").toLowerCase();
    const role = (member.role || "").toLowerCase();
    const instrument = (member.instrument || "").toLowerCase();
    return name.includes(searchLower) || role.includes(searchLower) || instrument.includes(searchLower);
  });

  if (authLoading || !user || !activeGroup) {
    return null;
  }

  return (
    <>
      <main className="flex-1 pt-20 pb-20 px-4 safe-top safe-bottom w-full">
        <div className="max-w-5xl mx-auto">
          {/* Header - Minimalist */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Miembros</h1>
              <p className="text-muted-foreground text-sm font-medium">
                {members.length} integrantes en el equipo
              </p>
            </div>
            {isGroupLeader && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary/10 border border-secondary/20">
                <Shield className="w-3.5 h-3.5 text-secondary" />
                <span className="text-[10px] text-secondary font-black uppercase tracking-wider">Gestión</span>
              </div>
            )}
          </div>
          
          {/* Search Bar - Professional */}
          <div className="relative mb-8 group max-w-xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 w-4 h-4 group-focus-within:text-secondary transition-colors" />
            <Input
              type="text"
              placeholder="Busca por nombre, rol o instrumento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 bg-muted/50 border-border rounded-xl text-sm focus:ring-secondary/20 transition-all placeholder:text-muted-foreground/50"
            />
          </div>

          {loading ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="p-4 bg-card border border-border rounded-2xl flex flex-col items-center text-center space-y-4">
                  <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted" />
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-4 w-3/4 mx-auto bg-muted" />
                    <Skeleton className="h-3 w-1/2 mx-auto bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <Card className="p-16 text-center card-gradient border-secondary/10 animate-fade-in rounded-3xl">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-secondary/5 flex items-center justify-center border border-secondary/10">
                <UserCircle className="w-12 h-12 text-secondary/30" aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
                {searchQuery ? "Búsqueda sin resultados" : "No hay miembros aún"}
              </h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                {searchQuery 
                  ? "Prueba con otros términos como el instrumento o el apellido." 
                  : "Cuando los usuarios se registren, aparecerán mágicamente aquí."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredMembers.map((member, index) => {
                const primaryRole = member.role || 'default';
                const displayName = member.display_name || member.profiles?.full_name || "Integrante";
                
                return (
                  <div
                    key={member.id}
                    className="group relative p-4 bg-card border border-border cursor-pointer transition-all duration-300 hover:bg-muted/50 hover:border-border rounded-2xl flex flex-col items-center text-center h-full"
                    onClick={() => navigate(`/perfil/${member.user_id}`)}
                  >
                    {/* Avatar - Compact */}
                    <div className="relative mb-3">
                      <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border border-border group-hover:border-secondary/40 transition-all">
                        <AvatarImage 
                          src={member.profiles?.avatar_url || undefined} 
                          alt={displayName}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xl font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center">
                        {ROLE_ICONS[primaryRole] || ROLE_ICONS.default}
                      </div>
                    </div>
                    
                    {/* Info - Minimal */}
                    <div className="space-y-1 mb-4 flex-1">
                      <h3 className="font-bold text-sm text-foreground group-hover:text-secondary transition-colors line-clamp-1">
                        {displayName}
                      </h3>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight line-clamp-1">
                        {member.instrument || member.role || "Miembro"}
                      </p>
                    </div>

                    {/* Minimal Controls */}
                    {isGroupAdmin && member.user_id !== user.id && (
                      <div className="w-full flex gap-1 mt-auto pt-3 border-t border-border">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMember(member);
                            setSelectedRole(member.role);
                          }}
                          className="flex-1 h-8 bg-muted hover:bg-secondary hover:text-primary rounded-lg transition-all"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberToDelete(member);
                          }}
                          className="flex-1 h-8 bg-muted hover:bg-red-500 hover:text-white rounded-lg transition-all"
                        >
                          <UserCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Role Management Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto card-gradient border-secondary/20 rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-secondary/10 to-transparent" />
          
          <DialogHeader className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center mb-4 mx-auto border border-secondary/30 shadow-xl shadow-secondary/10">
              <Shield className="w-8 h-8 text-secondary" />
            </div>
            <DialogTitle className="text-2xl font-black text-center tracking-tight">
              Gestionar Rango
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground font-medium">
              Selecciona el rol principal de <span className="text-foreground font-bold">{editingMember?.display_name || editingMember?.profiles?.full_name}</span>. 
            </DialogDescription>
          </DialogHeader>

          <div className="relative z-10 py-6 space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-secondary ml-1">Seleccionar Rol</label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_ROLES.map((role) => {
                const isSelected = selectedRole === role.value;
                return (
                  <Button
                    key={role.value}
                    variant={isSelected ? "secondary" : "outline"}
                    onClick={() => setSelectedRole(role.value)}
                    className={`h-12 justify-start gap-2 rounded-xl transition-all ${isSelected ? 'shadow-lg shadow-secondary/20' : 'border-border/50 hover:border-secondary/30'}`}
                  >
                    <role.icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-secondary/50'}`} />
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>{role.label}</span>
                    {isSelected && <Check className="w-3 h-3 ml-auto text-white" />}
                  </Button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="relative z-10 gap-3 sm:gap-0 sticky bottom-0 bg-background/80 backdrop-blur-md py-2">
            <Button variant="ghost" onClick={() => setEditingMember(null)} className="h-12 rounded-2xl font-bold flex-1">Cancelar</Button>
            <Button 
              onClick={handleUpdateRole} 
              disabled={updateRoleMutation.isPending} 
              className="h-12 rounded-2xl bg-secondary text-white font-black uppercase tracking-widest px-8 shadow-xl shadow-secondary/20 flex-1"
            >
              {updateRoleMutation.isPending ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation Dialog */}
      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent className="card-gradient border-red-500/20 rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-red-500">¿Remover integrante?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-base">
              Esta acción retirará a <strong className="text-foreground">{memberToDelete?.display_name || memberToDelete?.profiles?.full_name}</strong> de este grupo. 
              Sus participaciones y privilegios dentro del grupo serán revocados, pero su cuenta de usuario y otros grupos no serán afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="h-12 rounded-2xl border-border font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => memberToDelete && deleteMemberMutation.mutate(memberToDelete.id)}
              className="h-12 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest hover:bg-red-600 shadow-xl shadow-red-500/20"
            >
              {deleteMemberMutation.isPending ? "Removiendo..." : "Sí, remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Miembros;
