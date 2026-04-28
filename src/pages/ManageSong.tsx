import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Upload, ArrowLeft } from "lucide-react";
import { notificationService } from "@/services/notificationService";
import { useUserRole } from "@/hooks/useUserRole";

const ManageSong = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLeader, isModerator } = useUserRole();
  const queryClient = useQueryClient();
  
  const editMode = !!id;
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    category: "otro",
    lyrics: "",
    chords: "",
    youtube_url: "",
  });

  const { data: existingSong, isLoading: isFetchingSong } = useQuery({
    queryKey: ['song', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: editMode,
  });

  useEffect(() => {
    if (existingSong) {
      setFormData({
        title: existingSong.title || "",
        author: existingSong.author || "",
        category: existingSong.category || "otro",
        lyrics: existingSong.lyrics || "",
        chords: existingSong.chords || "",
        youtube_url: existingSong.youtube_url || "",
      });
    }
  }, [existingSong]);

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Error", {
          description: "El archivo de audio debe ser menor a 50MB",
        });
        return;
      }
      setAudioFile(file);
    }
  };

  const uploadAudio = async (): Promise<string | null> => {
    if (!audioFile || !user) return null;
    
    setUploading(true);
    try {
      const fileExt = audioFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("song-audio")
        .upload(fileName, audioFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("song-audio")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast.error("Error al subir audio", {
        description: error.message,
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let audioUrl = existingSong?.audio_url || null;
      if (audioFile) {
        audioUrl = await uploadAudio();
        if (!audioUrl) {
          setLoading(false);
          return;
        }
      }

      if (editMode && id) {
        const { error } = await supabase
          .from("songs")
          .update({
            title: formData.title,
            author: formData.author || null,
            category: formData.category,
            lyrics: formData.lyrics,
            chords: formData.chords,
            youtube_url: formData.youtube_url || null,
            audio_url: audioUrl,
          })
          .eq("id", id);

        if (error) throw error;

        toast.success("¡Canción actualizada!", {
          description: "La canción se ha actualizado correctamente",
        });
        queryClient.invalidateQueries({ queryKey: ['song', id] });
        navigate(`/canciones/${id}`);
      } else {
        const isAuthorized = isAdmin || isLeader || isModerator;
        const initialStatus = isAuthorized ? 'approved' : 'pending';

        const { data: newSong, error } = await supabase.from("songs").insert({
          title: formData.title,
          author: formData.author || null,
          category: formData.category,
          lyrics: formData.lyrics,
          chords: formData.chords,
          youtube_url: formData.youtube_url || null,
          audio_url: audioUrl,
          created_by: user.id,
          status: initialStatus,
        }).select('id').single();

        if (error) throw error;

        if (newSong) {
          if (initialStatus === 'approved') {
            notificationService.notifyNewSong(formData.title, newSong.id);
            toast.success("¡Canción agregada!", {
              description: "La canción se ha agregado correctamente",
            });
          } else {
            toast.success("Sugerencia enviada", {
              description: "Tu canción ha sido enviada para revisión de los líderes",
            });
          }
          navigate(`/canciones/${newSong.id}`);
        } else {
          navigate("/canciones");
        }
      }
    } catch (error: any) {
      toast.error("Error", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (editMode && isFetchingSong) {
    return (
      <main className="flex-1 pt-24 pb-20 px-4 w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </main>
    );
  }

  return (
    <main className="flex-1 pt-20 pb-20 px-4 safe-top safe-bottom w-full">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(editMode ? `/canciones/${id}` : "/canciones")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Volver
          </Button>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          {editMode ? "Editar Canción" : "Agregar Nueva Canción"}
        </h1>
        <p className="text-muted-foreground mb-8">
          Completa los detalles de la canción a continuación.
        </p>

        <Card className="p-6 md:p-8 card-gradient border-secondary/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Nombre de la canción"
                  className="h-12 text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Autor o Grupo (Opcional)</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Ej: Miel San Marcos, Hillsong..."
                  className="h-12 text-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alabanza">Alabanza</SelectItem>
                  <SelectItem value="adoracion">Adoración</SelectItem>
                  <SelectItem value="especial">Especial</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="chords" className="text-lg">Letra con Acordes (Recomendado)</Label>
                <span className="text-sm text-muted-foreground">Pega todo junto aquí</span>
              </div>
              <Textarea
                id="chords"
                value={formData.chords}
                onChange={(e) => setFormData({ ...formData, chords: e.target.value })}
                placeholder="Ejemplo:&#10; G           C&#10;Toda la gloria es para Ti..."
                rows={12}
                className="resize-none font-mono text-base p-4"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="lyrics">Letra (Solo texto)</Label>
                <span className="text-sm text-muted-foreground">Opcional si incluyes letra con acordes arriba</span>
              </div>
              <Textarea
                id="lyrics"
                value={formData.lyrics}
                onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                placeholder="Solo letra de la canción (sin acordes)..."
                rows={6}
                className="resize-none font-mono text-base p-4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube">URL de YouTube (opcional)</Label>
              <Input
                id="youtube"
                type="url"
                value={formData.youtube_url}
                onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audio">Audio de Ensayo (MP3, WAV - Max 50MB)</Label>
              <div className="flex flex-col gap-2 p-4 border border-dashed border-border/50 rounded-lg bg-background/50">
                <Input
                  id="audio"
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioChange}
                  className="cursor-pointer"
                />
                {(audioFile || existingSong?.audio_url) && (
                  <span className="text-sm text-muted-foreground mt-2">
                    {audioFile ? audioFile.name : "Audio actual guardado (selecciona un archivo nuevo para reemplazar)"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(editMode ? `/canciones/${id}` : "/canciones")}
                className="flex-1 h-12"
                disabled={loading || uploading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="hero"
                className="flex-1 h-12"
                disabled={loading || uploading}
              >
                {loading || uploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {uploading ? "Subiendo audio..." : "Guardando..."}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    {editMode ? "Guardar Cambios" : "Agregar Canción"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
};

export default ManageSong;
