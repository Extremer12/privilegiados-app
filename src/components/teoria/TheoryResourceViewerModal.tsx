import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TheoryResource } from "@/types/theory";
import {
  Youtube,
  FileText,
  Download,
  Clock,
  User,
  Sparkles,
  ExternalLink,
  BookOpen,
  Image as ImageIcon,
  Music,
} from "lucide-react";

interface TheoryResourceViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: TheoryResource | null;
}

export function TheoryResourceViewerModal({
  open,
  onOpenChange,
  resource,
}: TheoryResourceViewerModalProps) {
  if (!resource) return null;

  // Extract YouTube embed ID
  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = "";
    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    } else if (url.includes("youtube.com/watch")) {
      const urlParams = new URLSearchParams(url.split("?")[1]);
      videoId = urlParams.get("v") || "";
    } else if (url.includes("youtube.com/embed/")) {
      videoId = url.split("youtube.com/embed/")[1]?.split("?")[0];
    }
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0` : null;
  };

  const embedUrl = resource.youtube_url ? getYouTubeEmbedUrl(resource.youtube_url) : null;

  const levelColors: Record<string, string> = {
    principiante: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    intermedio: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    avanzado: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    todos: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950/95 border-white/10 text-slate-100 backdrop-blur-2xl rounded-3xl p-6 sm:p-8">
        <DialogHeader className="mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className={`${levelColors[resource.target_level] || levelColors.todos} capitalize font-bold text-[11px]`}>
              {resource.target_level}
            </Badge>
            <Badge variant="outline" className="border-white/10 text-slate-300 uppercase tracking-wider text-[10px]">
              {resource.instrument}
            </Badge>
            {resource.duration_minutes && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" /> {resource.duration_minutes} min
              </span>
            )}
          </div>

          <DialogTitle className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {resource.title}
          </DialogTitle>
          {resource.description && (
            <DialogDescription className="text-slate-300 text-sm sm:text-base mt-2">
              {resource.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Content Viewer Area */}
        <div className="space-y-6 my-2">
          {/* YouTube Video Player */}
          {resource.content_type === "video" && embedUrl && (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl">
              <iframe
                src={embedUrl}
                title={resource.title}
                className="absolute top-0 left-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {resource.content_type === "video" && !embedUrl && resource.youtube_url && (
            <div className="p-8 rounded-2xl bg-slate-900 border border-white/10 text-center space-y-3">
              <Youtube className="w-12 h-12 text-red-500 mx-auto" />
              <p className="text-sm text-slate-300">Enlace de video directo:</p>
              <a
                href={resource.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                Abrir en YouTube <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* PDF Viewer & Download */}
          {resource.content_type === "pdf" && resource.file_url && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{resource.file_name || "Documento PDF Guía"}</p>
                    <p className="text-xs text-slate-400">Material de lectura e instructivo</p>
                  </div>
                </div>
                <a
                  href={resource.file_url}
                  download={resource.file_name || "guia-teoria.pdf"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
                >
                  <Download className="w-4 h-4" /> Descargar PDF
                </a>
              </div>

              {/* Embedded PDF iframe */}
              <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-white/10 bg-slate-900">
                <iframe
                  src={resource.file_url}
                  title={resource.title}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}

          {/* Image Diagram Viewer */}
          {resource.content_type === "image" && resource.file_url && (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900 p-2">
                <img
                  src={resource.file_url}
                  alt={resource.title}
                  className="w-full max-h-[600px] object-contain rounded-xl"
                />
              </div>
              <div className="text-right">
                <a
                  href={resource.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold"
                >
                  Ver imagen completa <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Audio Player */}
          {resource.content_type === "audio" && resource.file_url && (
            <div className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                  <Music className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">Audio de Referencia</p>
                  <p className="text-xs text-slate-400">Escucha la lección o ejercicio</p>
                </div>
              </div>
              <audio controls className="w-full rounded-xl">
                <source src={resource.file_url} />
                Tu navegador no soporta el reproductor de audio.
              </audio>
            </div>
          )}

          {/* Markdown Article Lesson */}
          {resource.article_body && (
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <BookOpen className="w-4 h-4" /> Lección Escrita & Explicación
              </div>
              <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-line font-sans">
                {resource.article_body}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <span>Por {resource.creator_profile?.full_name || "Equipo Privilegiados"}</span>
          </div>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-slate-300 hover:text-white"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
