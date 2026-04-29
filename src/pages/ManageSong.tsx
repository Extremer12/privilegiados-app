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
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(editMode ? `/canciones/${id}` : "/canciones")}
            className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Volver
          </Button>

          {editMode && (
            <div className="px-3 py-1 bg-secondary/20 text-secondary text-xs font-bold rounded-full border border-secondary/30">
              Modo Edición
            </div>
          )}
        </div>

        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
            {editMode ? "Editar Canción" : "Nueva Canción"}
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            {editMode 
              ? "Actualiza los detalles, letra o acordes de esta canción." 
              : "Comparte una nueva canción con el grupo. Los líderes la revisarán pronto."}
          </p>
        </div>

        <AnimatePresence>
          {duplicateWarning && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-4"
            >
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h4 className="text-amber-500 font-bold mb-1">¡Posible canción duplicada!</h4>
                <p className="text-amber-200/70 text-sm mb-3">
                  Ya existe una canción llamada <strong>"{duplicateWarning.title}"</strong> {duplicateWarning.author ? `de ${duplicateWarning.author}` : ""}.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white rounded-lg"
                  onClick={() => navigate(`/canciones/${duplicateWarning.id}`)}
                >
                  <Music className="w-4 h-4 mr-2" />
                  Ver canción existente
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Card className="p-6 md:p-10 bg-white/[0.02] backdrop-blur-xl border-white/5 shadow-2xl rounded-[2rem] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-white font-bold ml-1">Título de la Canción *</Label>
                <div className="relative">
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Ej: Dios Incomparable"
                    className="h-14 text-lg bg-white/[0.03] border-white/10 focus:border-secondary/50 focus:ring-secondary/20 rounded-2xl pl-4 transition-all"
                  />
                  {formData.title.length > 3 && !duplicateWarning && (
                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50" />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="author" className="text-white font-bold ml-1">Autor o Grupo</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Ej: Miel San Marcos"
                  className="h-14 text-lg bg-white/[0.03] border-white/10 focus:border-secondary/50 focus:ring-secondary/20 rounded-2xl pl-4 transition-all"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="category" className="text-white font-bold ml-1">Categoría *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-14 bg-white/[0.03] border-white/10 focus:border-secondary/50 focus:ring-secondary/20 rounded-2xl pl-4 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F2C] border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
                  <SelectItem value="alabanza" className="focus:bg-blue-500/20 focus:text-blue-200 py-3 cursor-pointer">Alabanza</SelectItem>
                  <SelectItem value="adoracion" className="focus:bg-purple-500/20 focus:text-purple-200 py-3 cursor-pointer">Adoración</SelectItem>
                  <SelectItem value="especial" className="focus:bg-amber-500/20 focus:text-amber-200 py-3 cursor-pointer">Especial</SelectItem>
                  <SelectItem value="otro" className="focus:bg-white/10 py-3 cursor-pointer">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="chords" className="text-white font-bold">Letra con Acordes</Label>
                  <span className="text-[10px] uppercase tracking-widest text-secondary/70 font-black">Recomendado</span>
                </div>
                <Textarea
                  id="chords"
                  value={formData.chords}
                  onChange={(e) => setFormData({ ...formData, chords: e.target.value })}
                  placeholder="Ejemplo:&#10; G           C&#10;Toda la gloria es para Ti..."
                  rows={12}
                  className="resize-none font-mono text-base p-5 bg-white/[0.02] border-white/10 focus:border-secondary/40 focus:ring-secondary/10 rounded-[1.5rem] transition-all scrollbar-thin"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="lyrics" className="text-white font-bold">Letra (Solo texto)</Label>
                  <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Opcional</span>
                </div>
                <Textarea
                  id="lyrics"
                  value={formData.lyrics}
                  onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                  placeholder="Solo letra de la canción (sin acordes)..."
                  rows={12}
                  className="resize-none font-mono text-base p-5 bg-white/[0.02] border-white/10 focus:border-secondary/40 focus:ring-secondary/10 rounded-[1.5rem] transition-all scrollbar-thin"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="youtube" className="text-white font-bold ml-1 flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-500" />
                  URL de YouTube
                </Label>
                <Input
                  id="youtube"
                  type="url"
                  value={formData.youtube_url}
                  onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="h-14 bg-white/[0.03] border-white/10 focus:border-secondary/50 focus:ring-secondary/20 rounded-2xl pl-4 transition-all"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="audio" className="text-white font-bold ml-1 flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-blue-400" />
                  Audio de Ensayo
                </Label>
                <div className="relative group">
                  <Input
                    id="audio"
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioChange}
                    className="h-14 bg-white/[0.03] border-white/10 group-hover:border-white/20 focus:border-secondary/50 focus:ring-secondary/20 rounded-2xl pl-4 pt-3.5 transition-all cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-secondary file:text-primary hover:file:bg-secondary/80"
                  />
                  {(audioFile || existingSong?.audio_url) && (
                    <div className="absolute -bottom-6 left-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                        {audioFile ? audioFile.name : "Audio guardado"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-white/5">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(editMode ? `/canciones/${id}` : "/canciones")}
                className="flex-1 h-14 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold text-lg transition-all"
                disabled={loading || uploading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="hero"
                className="flex-[2] h-14 rounded-2xl shadow-xl shadow-secondary/20 font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading || uploading}
              >
                {loading || uploading ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    {uploading ? "Subiendo audio..." : "Guardando..."}
                  </>
                ) : (
                  <>
                    <Upload className="mr-3 h-6 w-6" />
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
