import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroupContext";
import { createGroup, uploadGroupLogo, generateSlug } from "@/services/groupService";
import { ArrowLeft, Camera, Loader2, Music, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const CrearGrupo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetchGroups, switchGroup } = useGroup();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const slug = generateSlug(formData.name);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    setLoading(true);
    try {
      // Create the group first
      const group = await createGroup(
        formData.name.trim(),
        formData.description.trim(),
        null,
        user.id,
      );

      // Upload logo if provided
      if (logoFile) {
        const logoUrl = await uploadGroupLogo(group.id, logoFile);
        // Update the group with the logo URL
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase
          .from("music_groups")
          .update({ logo_url: logoUrl })
          .eq("id", group.id);
      }

      toast.success("¡Grupo creado!", {
        description: `"${formData.name}" está listo. Eres el administrador.`,
      });

      refetchGroups();
      switchGroup(group.id);
      navigate("/");
    } catch (error: any) {
      toast.error("Error al crear el grupo", {
        description: error.message || "Intenta de nuevo",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl bg-muted/20 border border-border"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-black uppercase tracking-wider">Crear Grupo</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 relative z-10 w-full">
        <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 shadow-2xl rounded-3xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Logo Upload */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative cursor-pointer group"
              >
                <Avatar className="w-28 h-28 rounded-2xl border-2 border-dashed border-secondary/30 group-hover:border-secondary/60 transition-all shadow-md">
                  <AvatarImage src={logoPreview || undefined} className="object-cover rounded-2xl animate-fade-in" />
                  <AvatarFallback className="bg-secondary/5 text-secondary rounded-2xl">
                    {formData.name ? (
                      <span className="text-3xl font-black">{formData.name.charAt(0).toUpperCase()}</span>
                    ) : (
                      <Music className="w-10 h-10 text-secondary/30" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-secondary text-primary flex items-center justify-center shadow-lg">
                  <Camera className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 font-semibold">
                Toca para subir el logo del grupo
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </motion.div>

            {/* Name Field */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <Label className="text-xs font-black uppercase tracking-wider text-secondary">
                Nombre del Grupo *
              </Label>
              <Input
                placeholder="Ej: Generación Privilegiada"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-14 text-base bg-muted/30 border-border/80 focus:border-secondary rounded-2xl px-5 font-medium"
                required
              />
              {slug && (
                <p className="text-[10px] text-muted-foreground font-mono pl-1">
                  Enlace: /unirse/<span className="text-secondary font-bold">{slug}</span>
                </p>
              )}
            </motion.div>

            {/* Description Field */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <Label className="text-xs font-black uppercase tracking-wider text-secondary">
                Descripción
              </Label>
              <Textarea
                placeholder="Describe tu grupo musical, iglesia, ministerio..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[120px] text-base bg-muted/30 border-border/80 focus:border-secondary rounded-2xl px-5 py-4 font-medium resize-none"
                rows={4}
              />
            </motion.div>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="w-full h-14 rounded-2xl bg-secondary text-primary font-black uppercase tracking-widest text-sm shadow-xl shadow-secondary/15 hover:shadow-secondary/25 transition-all duration-300"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Crear Grupo
                  </>
                )}
              </Button>
            </motion.div>

            {/* Info Note */}
            <p className="text-[11px] text-center text-muted-foreground/60 font-medium leading-relaxed">
              Al crear el grupo, te convertirás en administrador automáticamente.
              Podrás invitar miembros compartiendo el enlace de invitación.
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
};

export default CrearGrupo;
