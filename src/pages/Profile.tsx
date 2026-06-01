import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User, Camera, Save } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
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

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      return publicUrl;
    },
    onSuccess: (publicUrl) => {
      setAvatarUrl(publicUrl);
      toast.success("Foto subida exitosamente");
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (error: any) => {
      toast.error("Error al subir la foto: " + error.message);
    }
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
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] }); // Invalidate global members cache too
      queryClient.invalidateQueries({ queryKey: ['profilesList'] });
    },
    onError: (error: any) => {
      toast.error("Error al actualizar perfil: " + error.message);
    }
  });

  const saveProfile = async () => {
    saveMutation.mutate();
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <main className="flex-1 pt-20 pb-20 px-4 safe-top safe-bottom w-full">
        <div className="max-w-2xl mx-auto">
          <Card className="p-6 md:p-8 card-gradient border-secondary/20">
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
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <Label htmlFor="fullName" className="text-foreground">
                  Nombre Completo
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-background/50 border-secondary/20"
                  placeholder="Tu nombre completo"
                />
              </div>

              <div>
                <Label className="text-foreground">
                  Rol en el Grupo (Asignado por Administrador)
                </Label>
                <div className="bg-background/30 border border-secondary/20 rounded-md px-3 py-2 mt-1 text-sm text-foreground/80 cursor-not-allowed">
                  {role || "Miembro"}
                </div>
              </div>

              <div>
                <Label htmlFor="bio" className="text-foreground">
                  Biografía
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="bg-background/50 border-secondary/20 min-h-[100px]"
                  placeholder="Cuéntanos un poco sobre ti..."
                />
              </div>

              <div className="p-4 bg-background/30 rounded-lg">
                <h2 className="text-sm font-medium text-muted-foreground mb-1">
                  Miembro desde
                </h2>
                <p className="text-foreground">
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
                className="w-full"
                onClick={saveProfile}
                disabled={saveMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>

              <Button
                variant="destructive"
                className="w-full"
                onClick={signOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Profile;
