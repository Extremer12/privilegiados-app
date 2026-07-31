import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  createTheoryResource,
  updateTheoryResource,
  uploadTheoryFile,
} from "@/services/theoryService";
import type { TheoryResource, ContentType, TargetLevel, TargetInstrument } from "@/types/theory";
import { toast } from "sonner";
import {
  Upload,
  Youtube,
  FileText,
  Image as ImageIcon,
  Music,
  Loader2,
  Sparkles,
  ArrowLeft,
  X,
  CheckCircle2,
} from "lucide-react";

interface ManageTheoryResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceToEdit?: TheoryResource | null;
  categories: { id: string; name: string }[];
}

export function ManageTheoryResourceDialog({
  open,
  onOpenChange,
  resourceToEdit,
  categories,
}: ManageTheoryResourceDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [contentType, setContentType] = useState<ContentType>("video");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [articleBody, setArticleBody] = useState("");
  const [targetLevel, setTargetLevel] = useState<TargetLevel>("todos");
  const [instrument, setInstrument] = useState<TargetInstrument>("general");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resourceToEdit) {
      setTitle(resourceToEdit.title);
      setDescription(resourceToEdit.description || "");
      setCategoryId(resourceToEdit.category_id);
      setContentType(resourceToEdit.content_type);
      setYoutubeUrl(resourceToEdit.youtube_url || "");
      setArticleBody(resourceToEdit.article_body || "");
      setTargetLevel(resourceToEdit.target_level);
      setInstrument(resourceToEdit.instrument);
      setDurationMinutes(resourceToEdit.duration_minutes ? String(resourceToEdit.duration_minutes) : "");
    } else {
      resetForm();
      if (categories.length > 0) {
        setCategoryId(categories[0].id);
      }
    }
  }, [resourceToEdit, open, categories]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setContentType("video");
    setYoutubeUrl("");
    setArticleBody("");
    setTargetLevel("todos");
    setInstrument("general");
    setDurationMinutes("");
    setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (!categoryId) {
      toast.error("Selecciona una categoría");
      return;
    }

    setLoading(true);
    try {
      let fileUrl = resourceToEdit?.file_url || null;
      let fileName = resourceToEdit?.file_name || null;

      if (file) {
        toast.info("Subiendo archivo...", { description: file.name });
        fileUrl = await uploadTheoryFile(file);
        fileName = file.name;
      }

      const payload = {
        category_id: categoryId,
        title: title.trim(),
        description: description.trim() || null,
        content_type: contentType,
        youtube_url: youtubeUrl.trim() || null,
        file_url: fileUrl,
        file_name: fileName,
        article_body: articleBody.trim() || null,
        target_level: targetLevel,
        instrument: instrument,
        duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
        created_by: user?.id || null,
      };

      if (resourceToEdit) {
        await updateTheoryResource(resourceToEdit.id, payload);
        toast.success("Recurso actualizado con éxito");
      } else {
        await createTheoryResource(payload as any);
        toast.success("Recurso publicado con éxito");
      }

      queryClient.invalidateQueries({ queryKey: ["theory-resources"] });
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      console.error("Error saving resource:", err);
      toast.error("Error al guardar el recurso", {
        description: err.message || "Ocurrió un problema inesperado al subir el archivo.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-screen h-[100dvh] max-h-[100dvh] m-0 p-0 rounded-none border-0 flex flex-col bg-[#0a0e17] text-slate-100 overflow-hidden shadow-none gap-0">
        {/* Fullscreen Header Bar */}
        <DialogHeader className="p-4 sm:p-6 border-b border-white/10 bg-black/60 shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 rounded-full hover:bg-white/10 text-slate-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                {resourceToEdit ? "Editar Recurso" : "Publicar Nuevo Recurso"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Añade guías PDF, videos de YouTube o ejercicios prácticos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-3xl w-full mx-auto space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Título del Recurso *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Técnica Vocal y Afinación"
                  className="bg-slate-900/90 border-white/10 rounded-xl h-12 text-sm focus:border-purple-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Categoría *
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="bg-slate-900/90 border-white/10 rounded-xl h-12 text-sm text-slate-200">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-slate-200 rounded-xl">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content Type Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Tipo de Formato
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { id: "video", label: "YouTube", icon: Youtube },
                  { id: "pdf", label: "PDF Guía", icon: FileText },
                  { id: "article", label: "Lección", icon: Sparkles },
                  { id: "image", label: "Imagen", icon: ImageIcon },
                  { id: "audio", label: "Audio", icon: Music },
                ].map((type) => {
                  const Icon = type.icon;
                  const active = contentType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setContentType(type.id as ContentType)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                        active
                          ? "bg-purple-600/30 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/10"
                          : "bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      <span className="text-[11px] text-center">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format inputs */}
            {contentType === "video" && (
              <div className="space-y-2 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <Label htmlFor="youtubeUrl" className="text-xs font-bold text-purple-300 flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-500" /> Enlace de Video en YouTube
                </Label>
                <Input
                  id="youtubeUrl"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="bg-slate-900 border-white/10 rounded-xl h-12 text-sm"
                />
              </div>
            )}

            {(contentType === "pdf" || contentType === "image" || contentType === "audio") && (
              <div className="space-y-3 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <Label className="text-xs font-bold text-purple-300 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-400" /> Adjuntar Archivo ({contentType.toUpperCase()})
                </Label>
                <Input
                  type="file"
                  accept={
                    contentType === "pdf"
                      ? ".pdf"
                      : contentType === "image"
                      ? "image/*"
                      : "audio/*"
                  }
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="bg-slate-900 border-white/10 rounded-xl text-slate-300 file:bg-purple-600 file:text-white file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 file:text-xs file:font-bold"
                />
                {file && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-1">
                    <CheckCircle2 className="w-4 h-4" /> Seleccionado: {file.name} ({Math.round(file.size / 1024)} KB)
                  </div>
                )}
                {resourceToEdit?.file_name && !file && (
                  <p className="text-xs text-slate-400">Archivo actual: {resourceToEdit.file_name}</p>
                )}
              </div>
            )}

            {contentType === "article" && (
              <div className="space-y-2 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <Label htmlFor="articleBody" className="text-xs font-bold text-purple-300">
                  Lección Redactada (Soporta Markdown, acordes y letras)
                </Label>
                <Textarea
                  id="articleBody"
                  value={articleBody}
                  onChange={(e) => setArticleBody(e.target.value)}
                  placeholder="Redacta la lección..."
                  className="bg-slate-900 border-white/10 rounded-xl min-h-[160px] text-xs font-mono"
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Resumen / Descripción Corta
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve explicación para los alumnos..."
                className="bg-slate-900/90 border-white/10 rounded-xl min-h-[80px] text-sm"
              />
            </div>

            {/* Instrument, Level & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Instrumento
                </Label>
                <Select value={instrument} onValueChange={(v) => setInstrument(v as TargetInstrument)}>
                  <SelectTrigger className="bg-slate-900/90 border-white/10 rounded-xl h-12 text-sm text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-slate-200 rounded-xl">
                    <SelectItem value="general">Todos / General</SelectItem>
                    <SelectItem value="vocal">Canto / Voces</SelectItem>
                    <SelectItem value="guitarra">Guitarra</SelectItem>
                    <SelectItem value="bajo">Bajo</SelectItem>
                    <SelectItem value="teclado">Teclado / Piano</SelectItem>
                    <SelectItem value="bateria">Batería</SelectItem>
                    <SelectItem value="sonido">Sonido / Audio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Nivel Dificultad
                </Label>
                <Select value={targetLevel} onValueChange={(v) => setTargetLevel(v as TargetLevel)}>
                  <SelectTrigger className="bg-slate-900/90 border-white/10 rounded-xl h-12 text-sm text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-slate-200 rounded-xl">
                    <SelectItem value="todos">Todos los niveles</SelectItem>
                    <SelectItem value="principiante">Principiante</SelectItem>
                    <SelectItem value="intermedio">Intermedio</SelectItem>
                    <SelectItem value="avanzado">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Duración (Minutos)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="Ej. 15"
                  className="bg-slate-900/90 border-white/10 rounded-xl h-12 text-sm"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-white/10 pb-8">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-12 flex-1 rounded-xl text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-12 flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-base shadow-xl shadow-purple-600/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Guardando...
                  </>
                ) : resourceToEdit ? (
                  "Guardar Cambios"
                ) : (
                  "Publicar Recurso"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
