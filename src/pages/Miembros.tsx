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
import { User, Search, Users, Music, Mic, Shield, ShieldOff } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { toast } from "@/hooks/use-toast";
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

interface Member {
  id: string;
  full_name: string;
  avatar_url: string | null;
  instrument: string | null;
  role: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  vocalista: <Mic className="w-4 h-4" />,
  guitarrista: <Music className="w-4 h-4" />,
  default: <User className="w-4 h-4" />,
};

const Miembros = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, promoteToAdmin, demoteFromAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Member[];
    },
    enabled: !!user,
  });

  const { data: userRoles = [], isLoading: loadingRoles } = useQuery({
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

  const loading = loadingMembers || loadingRoles;

  const [searchQuery, setSearchQuery] = useState("");
  const [roleActionMember, setRoleActionMember] = useState<{ id: string; name: string; action: 'promote' | 'demote' } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const isUserAdmin = (userId: string) => {
    return userRoles.some(role => role.user_id === userId && role.role === 'admin');
  };

  const roleActionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'promote' | 'demote' }) => {
      if (action === 'promote') {
        const result = await promoteToAdmin(id);
        if (!result.success) throw new Error(result.error || "No se pudo asignar el rol");
        return { success: true, isPromote: true };
      } else {
        const result = await demoteFromAdmin(id);
        if (!result.success) throw new Error(result.error || "No se pudo remover el rol");
        return { success: true, isPromote: false };
      }
    },
    onSuccess: (data) => {
      toast({
        title: data.isPromote ? "Administrador asignado" : "Rol removido",
        description: data.isPromote ? "El usuario ahora es administrador" : "El usuario ya no es administrador",
      });
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      setRoleActionMember(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error con la operación",
        variant: "destructive",
      });
      setRoleActionMember(null);
    }
  });

  const handleRoleAction = async () => {
    if (!roleActionMember) return;
    roleActionMutation.mutate({ id: roleActionMember.id, action: roleActionMember.action });
  };

  const filteredMembers = (members || []).filter((member) =>
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
          <Card variant="premium" className="p-6 mb-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center">
                  <Users className="w-7 h-7 text-secondary" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Miembros</h1>
                  <p className="text-muted-foreground">
                    {members.length} integrantes del grupo
                  </p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/20 border border-secondary/30">
                  <Shield className="w-4 h-4 text-secondary" aria-hidden="true" />
                  <span className="text-sm text-secondary font-medium">Administrador</span>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative mt-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
              <Input
                type="text"
                placeholder="Buscar por nombre, rol o instrumento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-muted/50 border-border/50 rounded-xl text-base"
                aria-label="Buscar miembros del grupo"
              />
            </div>
          </Card>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader />
              <p className="text-muted-foreground">Cargando miembros...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <Card className="p-12 text-center card-gradient border-secondary/20 animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-secondary/10 flex items-center justify-center">
                <User className="w-10 h-10 text-secondary/50" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery ? "No se encontraron miembros" : "No hay miembros registrados"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Intenta con otra búsqueda" : "Los miembros aparecerán aquí"}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredMembers.map((member, index) => {
                const memberIsAdmin = isUserAdmin(member.id);
                return (
                  <Card
                    key={member.id}
                    className="group relative p-5 sm:p-6 card-gradient border-secondary/20 cursor-pointer overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-secondary/20 hover:-translate-y-2 animate-fade-in"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      transformStyle: "preserve-3d",
                      perspective: "1000px",
                    }}
                    onClick={() => navigate(`/perfil/${member.id}`)}
                    role="button"
                    aria-label={`Ver perfil de ${member.full_name}`}
                    onMouseMove={(e) => {
                      const card = e.currentTarget;
                      const rect = card.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      const centerX = rect.width / 2;
                      const centerY = rect.height / 2;
                      const rotateX = (y - centerY) / 15;
                      const rotateY = (centerX - x) / 15;
                      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "perspective(1000px) rotateX(0) rotateY(0) translateY(0) scale(1)";
                    }}
                  >
                    {/* Admin badge */}
                    {memberIsAdmin && (
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/30 border border-secondary/50">
                        <Shield className="w-3 h-3 text-secondary" aria-hidden="true" />
                        <span className="text-xs text-secondary font-medium">Admin</span>
                      </div>
                    )}
                    
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-secondary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>
                    
                    <div className="relative flex flex-col items-center text-center space-y-4">
                      {/* Avatar with glow */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-secondary/30 rounded-full blur-xl scale-110 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500" />
                        <Avatar className="relative w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-secondary/20 group-hover:ring-secondary/50 transition-all duration-300 shadow-xl">
                          <AvatarImage 
                            src={member.avatar_url || undefined} 
                            alt={member.full_name}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-secondary/30 to-secondary/10 text-secondary text-2xl sm:text-3xl font-bold">
                            {member.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Status indicator */}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-secondary/30 flex items-center justify-center">
                          <span aria-hidden="true">{ROLE_ICONS[member.role?.toLowerCase() || "default"] || ROLE_ICONS.default}</span>
                        </div>
                      </div>
                      
                      {/* Info */}
                      <div className="space-y-1">
                        <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-secondary transition-colors duration-300 line-clamp-2">
                          {member.full_name}
                        </h3>
                        <p className="text-xs sm:text-sm text-secondary/80 capitalize font-medium">
                          {member.role || member.instrument || "Miembro"}
                        </p>
                      </div>

                      {/* Admin controls */}
                      {isAdmin && member.id !== user.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoleActionMember({
                              id: member.id,
                              name: member.full_name,
                              action: memberIsAdmin ? 'demote' : 'promote'
                            });
                          }}
                          aria-label={memberIsAdmin ? "Quitar rol de administrador" : "Asignar rol de administrador"}
                          className={`w-full mt-2 text-xs gap-1.5 ${
                            memberIsAdmin 
                              ? 'border-destructive/50 text-destructive hover:bg-destructive/10' 
                              : 'border-secondary/50 text-secondary hover:bg-secondary/10'
                          }`}
                        >
                          {memberIsAdmin ? (
                            <>
                              <ShieldOff className="w-3.5 h-3.5" aria-hidden="true" />
                              Quitar Admin
                            </>
                          ) : (
                            <>
                              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                              Hacer Admin
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Role Action Confirmation Dialog */}
      <AlertDialog open={!!roleActionMember} onOpenChange={(open) => !open && setRoleActionMember(null)}>
        <AlertDialogContent className="card-gradient border-secondary/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {roleActionMember?.action === 'promote' ? '¿Hacer administrador?' : '¿Quitar rol de administrador?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {roleActionMember?.action === 'promote' 
                ? `${roleActionMember?.name} tendrá permisos completos para gestionar eventos, canciones y otros miembros.`
                : `${roleActionMember?.name} perderá los permisos de administrador.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRoleAction}
              className={roleActionMember?.action === 'promote' 
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" 
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {roleActionMember?.action === 'promote' ? 'Confirmar' : 'Quitar rol'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Miembros;
