import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Music } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  instrument: string | null;
  bio: string | null;
  created_at: string;
}

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { data: profile, isLoading: loading } = useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user && !!id,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user || loading) {
    return null;
  }

  if (!profile) {
    return (
    <>
      <main className="flex-1 pt-24 pb-20 px-4 w-full">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-muted-foreground">Perfil no encontrado</p>
          </div>
        </main>
    </>
  );
  }

  const isOwnProfile = user.id === profile.id;

  return (
    <>
      <main className="flex-1 pt-20 pb-20 px-4 safe-top safe-bottom w-full">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/miembros")}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>

          <Card className="p-6 md:p-8 card-gradient border-secondary/20">
            <div className="flex flex-col items-center mb-6">
              <Avatar className="w-24 h-24 md:w-32 md:h-32 mb-4 ring-2 ring-secondary/20">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                <AvatarFallback className="bg-secondary/20 text-secondary text-2xl md:text-4xl">
                  {profile.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
                {profile.full_name}
              </h1>

              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/perfil")}
                  className="mt-2"
                >
                  Editar Perfil
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-background/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Music className="w-4 h-4 text-secondary" />
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Rol en el grupo
                  </h2>
                </div>
                <p className="text-foreground capitalize">
                  {profile.role || profile.instrument || "Miembro"}
                </p>
              </div>

              {profile.bio && (
                <div className="p-4 bg-background/30 rounded-lg">
                  <h2 className="text-sm font-medium text-muted-foreground mb-1">
                    Biografía
                  </h2>
                  <p className="text-foreground whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}

              <div className="p-4 bg-background/30 rounded-lg">
                <h2 className="text-sm font-medium text-muted-foreground mb-1">
                  Miembro desde
                </h2>
                <p className="text-foreground">
                  {new Date(profile.created_at).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
      
    </>
  );
};

export default PublicProfile;
