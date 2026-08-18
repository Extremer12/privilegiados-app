import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroupContext";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteUserAccount,
  deleteGroupPermanently,
} from "@/services/groupService";
import {
  LogOut,
  Camera,
  Save,
  Trash2,
  AlertTriangle,
  UserX,
  Users,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { activeGroup, isGroupAdmin, refetchGroups } = useGroup();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Deletion modals state
  const [confirmDeleteAccountText, setConfirmDeleteAccountText] = useState("");
  const [confirmDeleteGroupText, setConfirmDeleteGroupText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setRole(profile.role || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user!.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      return publicUrl;
    },
    onSuccess: (publicUrl) => {
      setAvatarUrl(publicUrl);
      toast.success("Foto subida exitosamente");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (error: any) => {
      toast.error("Error al subir la foto: " + error.message);
    },
  });

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    uploadMutation.mutate(event.target.files[0]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          bio: bio,
          avatar_url: avatarUrl,
        })
        .eq("id", user!.id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("Perfil actualizado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profilesList"] });
      queryClient.invalidateQueries({ queryKey: ["groupMembersList"] });
    },
    onError: (error: any) => {
      toast.error("Error al actualizar perfil: " + error.message);
    },
  });

  const saveProfile = async () => {
    saveMutation.mutate();
  };

  // Handler: Delete Active Group
  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    setIsDeletingGroup(true);
    try {
      await deleteGroupPermanently(activeGroup.id);
      toast.success(`El grupo "${activeGroup.name}" ha sido eliminado definitivamente.`);
      refetchGroups();
      queryClient.invalidateQueries();
      navigate("/grupos");
    } catch (err: any) {
      console.error(err);
      toast.error("Error al eliminar el grupo: " + err.message);
    } finally {
      setIsDeletingGroup(false);
      setConfirmDeleteGroupText("");
    }
  };

  // Handler: Delete User Account
  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      await deleteUserAccount(user.id);
      toast.success("Tu cuenta y datos han sido eliminados correctamente.");
      await signOut();
      navigate("/auth");
    } catch (err: any) {
      console.error(err);
      toast.error("Error al eliminar tu cuenta: " + err.message);
    } finally {
      setIsDeletingAccount(false);
      setConfirmDeleteAccountText("");
    }
  };

  if (!user) {
    return null;
  }

  return (
    <main className="flex-1 pt-20 pb-24 px-4 safe-top safe-bottom w-full">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Main Profile Info Card */}
        <Card className="p-6 md:p-8 card-gradient border-secondary/20 rounded-2xl shadow-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              <Avatar className="w-24 h-24 md:w-32 md:h-32 ring-2 ring-secondary/20">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="bg-secondary/20 text-secondary text-2xl md:text-4xl">
                  {fullName.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center cursor-pointer hover:bg-secondary/90 transition-colors shadow-lg"
              >
                <Camera className="w-5 h-5" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploadMutation.isPending}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-muted-foreground font-medium">{user.email}</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="fullName" className="text-foreground font-semibold text-xs uppercase tracking-wider">
                Nombre Completo
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-background/50 border-secondary/20 mt-1 h-11"
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <Label className="text-foreground font-semibold text-xs uppercase tracking-wider">
                Rol en el Grupo (Asignado por Administrador)
              </Label>
              <div className="bg-background/30 border border-secondary/20 rounded-xl px-3.5 py-2.5 mt-1 text-sm text-foreground/80 cursor-not-allowed font-medium">
                {role || "Miembro"}
              </div>
            </div>

            <div>
              <Label htmlFor="bio" className="text-foreground font-semibold text-xs uppercase tracking-wider">
                Biografía
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-background/50 border-secondary/20 min-h-[100px] mt-1 rounded-xl"
                placeholder="Cuéntanos un poco sobre ti..."
              />
            </div>

            <div className="p-4 bg-background/30 rounded-xl border border-border/40">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Miembro desde
              </h2>
              <p className="text-foreground font-medium text-sm">
                {new Date(user.created_at).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="hero"
              className="w-full h-11 rounded-xl font-bold"
              onClick={saveProfile}
              disabled={saveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>

            <Button
              variant="outline"
              className="w-full h-11 rounded-xl border-border text-foreground hover:bg-muted font-semibold"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </Card>

        {/* Danger Zone Card */}
        <Card className="p-6 md:p-8 border-destructive/30 bg-destructive/5 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-destructive/20">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            <div>
              <h2 className="text-base font-extrabold text-destructive tracking-tight">
                Zona de Peligro
              </h2>
              <p className="text-xs text-muted-foreground">
                Acciones irreversibles sobre tu cuenta o grupos administrados.
              </p>
            </div>
          </div>

          {/* Option: Delete Active Group (Only visible if admin of active group) */}
          {activeGroup && isGroupAdmin && (
            <div className="p-4 rounded-xl bg-card border border-destructive/20 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Eliminar el Grupo "{activeGroup.name}"
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esta acción eliminará definitivamente el grupo, todos sus repertorios, canciones exclusivas, eventos y desvinculará a todos sus miembros.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-xl font-bold text-xs h-9 gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar Grupo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-md rounded-2xl border-destructive/30">
                    <AlertDialogHeader>
                      <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-2 mx-auto sm:mx-0">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <AlertDialogTitle className="text-lg font-black text-foreground">
                        ¿Eliminar "{activeGroup.name}" definitivamente?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
                        <span>
                          Esta acción es <strong>permanente e irreversible</strong>. Se borrarán todas las listas, programaciones y archivos del grupo para todos los músicos.
                        </span>
                        <span className="block pt-2">
                          Para confirmar, escribe exactamente <strong>ELIMINAR GRUPO</strong> a continuación:
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-2">
                      <Input
                        value={confirmDeleteGroupText}
                        onChange={(e) => setConfirmDeleteGroupText(e.target.value)}
                        placeholder="Escribe ELIMINAR GRUPO"
                        className="h-10 text-sm bg-muted/40 border-destructive/30 rounded-xl"
                      />
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel
                        onClick={() => setConfirmDeleteGroupText("")}
                        className="rounded-xl text-xs font-semibold h-10"
                      >
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteGroup}
                        disabled={confirmDeleteGroupText !== "ELIMINAR GRUPO" || isDeletingGroup}
                        className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-xs h-10 gap-1.5"
                      >
                        {isDeletingGroup ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Eliminando...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Confirmar y Eliminar Grupo
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {/* Option: Delete User Account */}
          <div className="p-4 rounded-xl bg-card border border-destructive/20 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0 mt-0.5">
                <UserX className="w-4 h-4" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-sm font-bold text-foreground">
                  Eliminar mi Cuenta
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Eliminará tu perfil, datos personales y accesos permanentemente. Si eres administrador principal de un grupo, el rango se transferirá automáticamente al integrante de mayor jerarquía. Si eres el único miembro, el grupo será eliminado.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 font-bold text-xs h-9 gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar mi Cuenta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md rounded-2xl border-destructive/30">
                  <AlertDialogHeader>
                    <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-2 mx-auto sm:mx-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <AlertDialogTitle className="text-lg font-black text-foreground">
                      ¿Eliminar tu cuenta definitivamente?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <span>
                        Se borrará tu cuenta de usuario, tus favoritos y tus datos de perfil.
                      </span>
                      <span className="block p-3 bg-muted/40 rounded-xl text-[11px] text-foreground font-medium border border-border">
                        🛡️ <strong>Regla de sucesión automática:</strong> Si administras algún grupo, el rol de Administrador pasará al miembro de mayor rango (líder o miembro más antiguo). Si estás solo en el grupo, el grupo se eliminará contigo.
                      </span>
                      <span className="block pt-1">
                        Para confirmar, escribe exactamente <strong>ELIMINAR MI CUENTA</strong> a continuación:
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="py-2">
                    <Input
                      value={confirmDeleteAccountText}
                      onChange={(e) => setConfirmDeleteAccountText(e.target.value)}
                      placeholder="Escribe ELIMINAR MI CUENTA"
                      className="h-10 text-sm bg-muted/40 border-destructive/30 rounded-xl"
                    />
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => setConfirmDeleteAccountText("")}
                      className="rounded-xl text-xs font-semibold h-10"
                    >
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={confirmDeleteAccountText !== "ELIMINAR MI CUENTA" || isDeletingAccount}
                      className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-xs h-10 gap-1.5"
                    >
                      {isDeletingAccount ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Eliminando cuenta...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Confirmar y Eliminar Cuenta
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
};

export default Profile;
