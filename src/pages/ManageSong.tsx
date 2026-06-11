import { useState, useEffect, useMemo } from "react";
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
import { Loader2, Upload, ArrowLeft, AlertCircle, Music, CheckCircle2 } from "lucide-react";
import { notificationService } from "@/services/notificationService";
import { useUserRole } from "@/hooks/useUserRole";
import { motion, AnimatePresence } from "framer-motion";

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

  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string, title: string, author?: string } | null>(null);

  // Fetch all songs for duplicate detection
  const { data: allSongs = [] } = useQuery({
    queryKey: ['songs-minimal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("id, title, author")
        .eq('status', 'approved');
      if (error) throw error;
      return data;
    },
    enabled: !editMode,
  });

  // Normalization function for smart comparison
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^\w\s]/gi, '') // Remove special chars
      .trim();
  };

  // Debounced duplicate check
  useEffect(() => {
    if (editMode || formData.title.length < 3) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(() => {
      const normalizedTitle = normalizeText(formData.title);
      const normalizedAuthor = normalizeText(formData.author || "");

      const duplicate = allSongs.find(s => {
        const sTitle = normalizeText(s.title);
        const sAuthor = normalizeText(s.author || "");
        
        // Exact title match OR (Title matches AND Author matches)
        if (sTitle === normalizedTitle) {
          if (!normalizedAuthor || !sAuthor || sAuthor === normalizedAuthor) {
            return true;
          }
        }
        return false;
      });

      setDuplicateWarning(duplicate || null);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.title, formData.author, allSongs, editMode]);

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
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(editMode ? `/canciones/${id}` : "/canciones")}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all h-9 px-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Volver
          </Button>

          {editMode && (
            <div className="px-2 py-0.5 bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-wider rounded border border-secondary/20">
              Editando
            </div>
          )}
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {editMode ? "Editar Canción" : "Nueva Canción"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {editMode 
              ? "Actualiza la información de la canción." 
              : "Agrega una nueva canción al repertorio del grupo."}
          </p>
        </div>

        <AnimatePresence>
          {duplicateWarning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="text-amber-500 text-sm font-bold">Posible duplicado</h4>
                <p className="text-muted-foreground text-xs mb-2">
                  Ya existe: <strong>{duplicateWarning.title}</strong> {duplicateWarning.author ? `(${duplicateWarning.author})` : ""}.
                </p>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0 text-amber-500 text-xs font-bold"
                  onClick={() => navigate(`/canciones/${duplicateWarning.id}`)}
                >
                  Ver canción existente
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Card className="p-6 md:p-8 bg-card border-border rounded-2xl relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-muted-foreground text-xs font-bold uppercase tracking-wider ml-1">Título *</Label>
                <div className="relative">
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Ej: Dios Incomparable"
                    className="h-11 bg-muted/50 border-border focus:border-secondary/40 focus:ring-0 rounded-xl pl-3 transition-all"
                  />
                  {formData.title.length > 3 && !duplicateWarning && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="author" className="text-muted-foreground text-xs font-bold uppercase tracking-wider ml-1">Autor o Grupo</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Ej: Miel San Marcos"
                  className="h-11 bg-muted/50 border-border focus:border-secondary/40 focus:ring-0 rounded-xl pl-3 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-muted-foreground text-xs font-bold uppercase tracking-wider ml-1">Categoría *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-11 bg-muted/50 border-border focus:border-secondary/40 focus:ring-0 rounded-xl pl-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl overflow-hidden backdrop-blur-xl">
                  <SelectItem value="alabanza" className="focus:bg-secondary focus:text-primary py-2 cursor-pointer text-sm">Alabanza</SelectItem>
                  <SelectItem value="adoracion" className="focus:bg-secondary focus:text-primary py-2 cursor-pointer text-sm">Adoración</SelectItem>
                  <SelectItem value="especial" className="focus:bg-secondary focus:text-primary py-2 cursor-pointer text-sm">Especial</SelectItem>
                  <SelectItem value="otro" className="focus:bg-secondary focus:text-primary py-2 cursor-pointer text-sm">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="chords" className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Acordes</Label>
                  <span className="text-[9px] font-black text-secondary">PRO</span>
                </div>
                <Textarea
                  id="chords"
                  value={formData.chords}
                  onChange={(e) => setFormData({ ...formData, chords: e.target.value })}
                  placeholder="G C D..."
                  rows={10}
                  className="resize-none font-mono text-sm p-4 bg-muted/30 border-border focus:border-secondary/40 focus:ring-0 rounded-xl transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="lyrics" className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Letra</Label>
                </div>
                <Textarea
                  id="lyrics"
                  value={formData.lyrics}
                  onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                  placeholder="Solo letra..."
                  rows={10}
                  className="resize-none font-mono text-sm p-4 bg-muted/30 border-border focus:border-secondary/40 focus:ring-0 rounded-xl transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="youtube" className="text-muted-foreground text-xs font-bold uppercase tracking-wider ml-1">YouTube</Label>
                <Input
                  id="youtube"
                  type="url"
                  value={formData.youtube_url}
                  onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                  placeholder="URL del video..."
                  className="h-11 bg-muted/50 border-border focus:border-secondary/40 focus:ring-0 rounded-xl pl-3 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audio" className="text-muted-foreground text-xs font-bold uppercase tracking-wider ml-1">Audio</Label>
                <div className="relative group">
                  <Input
                    id="audio"
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioChange}
                    className="h-11 bg-muted/50 border-border focus:border-secondary/40 focus:ring-0 rounded-xl pl-3 pt-2 transition-all cursor-pointer file:mr-3 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-black file:bg-secondary file:text-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(editMode ? `/canciones/${id}` : "/canciones")}
                className="flex-1 h-11 rounded-xl bg-transparent border-border hover:bg-muted text-foreground font-bold text-sm transition-all"
                disabled={loading || uploading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="hero"
                className="flex-[2] h-11 rounded-xl shadow-md font-bold text-sm transition-all active:scale-[0.98]"
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
                    {editMode ? "Guardar" : "Agregar"}
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
