import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { notificationService } from "@/services/notificationService";

interface Song {
  id?: string;
  title: string;
  category: "alabanza" | "adoracion" | "especial" | "otro";
  lyrics: string | null;
  chords: string | null;
  youtube_url: string | null;
  audio_url: string | null;
}

interface AddSongDialogProps {
  onSongAdded: () => void;
  trigger?: React.ReactNode;
  editMode?: boolean;
  existingSong?: Song;
}

export const AddSongDialog = ({ onSongAdded, trigger, editMode = false, existingSong }: AddSongDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: existingSong?.title || "",
    category: (existingSong?.category || "otro") as "alabanza" | "adoracion" | "especial" | "otro",
    lyrics: existingSong?.lyrics || "",
    chords: existingSong?.chords || "",
    youtube_url: existingSong?.youtube_url || "",
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);

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
      
      const { error: uploadError, data } = await supabase.storage
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

      if (editMode && existingSong?.id) {
        const { error } = await supabase
          .from("songs")
          .update({
            title: formData.title,
            category: formData.category,
            lyrics: formData.lyrics,
            chords: formData.chords,
            youtube_url: formData.youtube_url || null,
            audio_url: audioUrl,
          })
          .eq("id", existingSong.id);

        if (error) throw error;

        toast.success("¡Canción actualizada!", {
          description: "La canción se ha actualizado correctamente",
        });
      } else {
        const { data: newSong, error } = await supabase.from("songs").insert({
          title: formData.title,
          category: formData.category,
          lyrics: formData.lyrics,
          chords: formData.chords,
          youtube_url: formData.youtube_url || null,
          audio_url: audioUrl,
          created_by: user.id,
        }).select('id').single();

        if (error) throw error;

        toast.success("¡Canción agregada!", {
          description: "La canción se ha agregado correctamente",
        });

        // Send push notification to all users
        if (newSong) {
          notificationService.notifyNewSong(formData.title, newSong.id);
        }
      }

      setFormData({
        title: "",
        category: "otro",
        lyrics: "",
        chords: "",
        youtube_url: "",
      });
      setAudioFile(null);
      setOpen(false);
      onSongAdded();
    } catch (error: any) {
      toast.error("Error", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? "Editar Canción" : "Agregar Nueva Canción"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Nombre de la canción"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría *</Label>
            <Select
              value={formData.category}
              onValueChange={(value: any) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
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
              <Label htmlFor="lyrics">Letra (Solo texto)</Label>
              <span className="text-xs text-muted-foreground">Opcional si incluyes letra con acordes abajo</span>
            </div>
            <Textarea
              id="lyrics"
              value={formData.lyrics}
              onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
              placeholder="Solo letra de la canción (sin acordes)..."
              rows={4}
              className="resize-none font-mono"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="chords">Letra con Acordes (Recomendado)</Label>
              <span className="text-xs text-muted-foreground">Pega todo junto aquí</span>
            </div>
            <Textarea
              id="chords"
              value={formData.chords}
              onChange={(e) => setFormData({ ...formData, chords: e.target.value })}
              placeholder="Ejemplo:&#10; G           C&#10;Toda la gloria es para Ti..."
              rows={8}
              className="resize-none font-mono"
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audio">Audio de Ensayo (MP3, WAV - Max 50MB)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="audio"
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
                className="cursor-pointer"
              />
              {audioFile && (
                <span className="text-sm text-muted-foreground">
                  {audioFile.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={loading || uploading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="hero"
              className="flex-1"
              disabled={loading || uploading}
            >
              {loading || uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? "Subiendo..." : "Guardando..."}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {editMode ? "Guardar Cambios" : "Agregar Canción"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
