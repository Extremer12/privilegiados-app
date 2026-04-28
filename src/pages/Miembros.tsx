import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { User, Search, Users, Music, Mic, Shield, ShieldOff, Edit2, Check, UserCircle, Star, Crown, MessageSquare } from "lucide-react";
import { Loader } from "@/components/ui/loader";
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
  const { isAdmin, isModerator, syncRoles, deleteUserCompletely } = useUserRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { data: membersRaw, isLoading: loadingMembers } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      return data as Member[];
    },
    enabled: !!user,
  });

  const members = Array.isArray(membersRaw) ? membersRaw : [];

  const { data: userRolesRaw, isLoading: loadingRoles } = useQuery({
    queryKey: ['user_roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!user,
  });

  const userRolesList = Array.isArray(userRolesRaw) ? userRolesRaw : [];

  const loading = loadingMembers || loadingRoles;

  const [searchQuery, setSearchQuery] = useState("");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const isUserAdmin = (userId: string) => {
    return userRolesList.some(role => role.user_id === userId && role.role === 'admin');
  };

  const getMemberRoles = (userId: string) => {
    return userRolesList.filter(role => role.user_id === userId).map(r => r.role);
  };

  const updateRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string, roles: string[] }) => {
      // 1. Sync internal roles for permissions
      const roleResult = await syncRoles(userId, roles);
      if (roleResult.error) throw new Error(roleResult.error);

      // 2. Generate display label (comma separated)
      const roleLabels = roles.map(r => AVAILABLE_ROLES.find(ar => ar.value === r)?.label || r);
      const roleLabel = roleLabels.join(", ");

      // 3. Update profile for public display
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: roleLabel || "Miembro" })
        .eq("id", userId);
      
      if (profileError) throw profileError;

      return { success: true };
    },
    onSuccess: () => {
      toast.success("Roles actualizados", {
        description: "Los roles del miembro han sido actualizados correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setEditingMember(null);
    },
    onError: (error: any) => {
      toast.error("Error", {
        description: error.message || "No se pudo actualizar los roles",
      });
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await deleteUserCompletely(userId);
      if (result.error) throw new Error(result.error);
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Usuario eliminado", {
        description: "El usuario ha sido eliminado completamente del sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      setMemberToDelete(null);
    },
    onError: (error: any) => {
      toast.error("Error al eliminar", {
        description: error.message || "Ocurrió un error inesperado.",
      });
      setMemberToDelete(null);
    }
  });

  const toggleRole = (roleValue: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleValue) 
        ? prev.filter(r => r !== roleValue) 
        : [...prev, roleValue]
    );
  };

  const handleUpdateRoles = () => {
    if (!editingMember) return;
    updateRolesMutation.mutate({ 
      userId: editingMember.id, 
      roles: selectedRoles
    });
  };

  const filteredMembers = members.filter((member) =>
    member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.instrument?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || !user) {
    return null;
  }

  return (
    <>
      <main className="flex-1 pt-20 pb-20 px-4 safe-top safe-bottom w-full">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <Card variant="premium" className="p-6 mb-6 animate-fade-in shadow-2xl shadow-secondary/5 border-secondary/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center shadow-lg shadow-secondary/20 border border-secondary/20">
                  <Users className="w-7 h-7 text-secondary" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground tracking-tight">Miembros</h1>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    {members.length} integrantes en total
                  </p>
                </div>
              </div>
              {(isAdmin || isModerator) && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/10 border border-secondary/20 backdrop-blur-sm">
                  <Shield className="w-4 h-4 text-secondary" aria-hidden="true" />
                  <span className="text-sm text-secondary font-bold uppercase tracking-wider">Modo Gestión</span>
                </div>
              )}
            </div>
            
            {/* Search Bar */}
            <div className="relative mt-6 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-secondary transition-colors" aria-hidden="true" />
              </div>
              <Input
                type="text"
                placeholder="Buscar por nombre, rol o instrumento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 bg-muted/30 border-border/50 rounded-2xl text-base focus:ring-secondary/20 focus:border-secondary/30 transition-all placeholder:text-muted-foreground/50"
                aria-label="Buscar miembros del grupo"
              />
            </div>
          </Card>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-secondary/20 blur-2xl rounded-full" />
                <Loader />
              </div>
              <p className="text-muted-foreground font-medium animate-pulse">Sincronizando miembros...</p>
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
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredMembers.map((member, index) => {
                const memberIsAdmin = isUserAdmin(member.id);
                const memberRoles = getMemberRoles(member.id);
                const primaryRole = memberRoles[0] || 'default';
                
                return (
                  <Card
                    key={member.id}
                    className="group relative p-6 card-gradient border-secondary/10 cursor-pointer overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(var(--secondary-rgb),0.15)] hover:-translate-y-2 animate-fade-in rounded-3xl"
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                    onClick={() => navigate(`/perfil/${member.id}`)}
                    role="button"
                    aria-label={`Ver perfil de ${member.full_name}`}
                  >
                    {/* Role Icon Overlay */}
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-colors" />
                    
                    <div className="relative flex flex-col items-center text-center">
                      {/* Avatar */}
                      <div className="relative mb-5">
                        <div className="absolute inset-0 bg-secondary/20 rounded-full blur-xl scale-110 opacity-0 group-hover:opacity-100 transition-all duration-700" />
                        <Avatar className="w-24 h-24 sm:w-28 sm:h-28 ring-4 ring-background shadow-2xl group-hover:ring-secondary/20 transition-all duration-500">
                          <AvatarImage 
                            src={member.avatar_url || undefined} 
                            alt={member.full_name}
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-white text-3xl font-black">
                            {member.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Role Mini Badge */}
                        <div className="absolute -bottom-1 right-2 w-8 h-8 rounded-xl bg-background border-2 border-secondary/20 shadow-lg flex items-center justify-center transition-transform group-hover:scale-110">
                          {ROLE_ICONS[primaryRole] || ROLE_ICONS.default}
                        </div>
                      </div>
                      
                      {/* Info */}
                      <div className="space-y-1 mb-6">
                        <h3 className="font-bold text-lg text-foreground group-hover:text-secondary transition-colors duration-300 line-clamp-1 tracking-tight">
                          {member.full_name}
                        </h3>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex flex-wrap justify-center gap-1">
                            {(member.role || "Miembro").split(", ").map((r, i) => (
                              <span key={i} className="text-[10px] font-black uppercase tracking-widest text-secondary/80 bg-secondary/5 px-2 py-0.5 rounded-full border border-secondary/10">
                                {r}
                              </span>
                            ))}
                          </div>
                          {member.instrument && (
                            <span className="text-xs text-muted-foreground font-medium italic">
                              {member.instrument}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Admin/Mod controls */}
                      {(isAdmin || isModerator) && member.id !== user.id && (
                        <div className="w-full space-y-2">
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingMember(member);
                                setSelectedRoles(getMemberRoles(member.id));
                              }}
                              className="w-full h-10 rounded-xl border-secondary/20 text-secondary hover:bg-secondary hover:text-white transition-all gap-2 group/btn font-bold text-xs uppercase tracking-tighter"
                            >
                              <Edit2 className="w-3.5 h-3.5 transition-transform group-hover/btn:rotate-12" />
                              Gestionar Roles
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMemberToDelete(member);
                            }}
                            className="w-full h-10 rounded-xl border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all gap-2 font-bold text-xs uppercase tracking-tighter"
                          >
                            Eliminar Usuario
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
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
              Selecciona todos los roles que desempeña <span className="text-foreground font-bold">{editingMember?.full_name}</span>. 
            </DialogDescription>
          </DialogHeader>

          <div className="relative z-10 py-6 space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-secondary ml-1">Seleccionar Roles</label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_ROLES.map((role) => {
                const isSelected = selectedRoles.includes(role.value);
                return (
                  <Button
                    key={role.value}
                    variant={isSelected ? "secondary" : "outline"}
                    onClick={() => toggleRole(role.value)}
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
              onClick={handleUpdateRoles} 
              disabled={updateRolesMutation.isPending} 
              className="h-12 rounded-2xl bg-secondary text-white font-black uppercase tracking-widest px-8 shadow-xl shadow-secondary/20 flex-1"
            >
              {updateRolesMutation.isPending ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent className="card-gradient border-red-500/20 rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-red-500">¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-base">
              Esta acción eliminará completamente a <strong className="text-foreground">{memberToDelete?.full_name}</strong> de la base de datos. 
              Sus mensajes, participaciones y perfil desaparecerán permanentemente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="h-12 rounded-2xl border-border font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => memberToDelete && deleteMemberMutation.mutate(memberToDelete.id)}
              className="h-12 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest hover:bg-red-600 shadow-xl shadow-red-500/20"
            >
              {deleteMemberMutation.isPending ? "Eliminando..." : "Sí, Eliminar Todo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Miembros;
