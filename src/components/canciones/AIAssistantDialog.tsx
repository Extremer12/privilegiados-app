import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles,
  Search,
  FileText,
  Music2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Youtube,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  searchSongWithGemini,
  formatRawSongWithGemini,
  GeminiSongResult,
} from "@/services/geminiService";

const MUSICAL_KEYS = [
  "Original",
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm",
];

interface AIAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplySong: (song: {
    title: string;
    author: string;
    category: string;
    lyrics: string;
    chords: string;
    youtube_url?: string;
  }) => void;
}

export function AIAssistantDialog({
  open,
  onOpenChange,
  onApplySong,
}: AIAssistantDialogProps) {
  const [activeTab, setActiveTab] = useState<"search" | "paste">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [rawText, setRawText] = useState("");
  const [selectedKey, setSelectedKey] = useState("Original");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState<GeminiSongResult | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Ingresa el título o artista de la canción");
      return;
    }

    setLoading(true);
    setResult(null);
    setLoadingStep("Consultando cancioneros y fuentes de acordes oficiales...");

    try {
      const targetKey = selectedKey !== "Original" ? selectedKey : undefined;
      
      const timer1 = setTimeout(() => {
        setLoadingStep("Verificando progresiones armónicas y estructura...");
      }, 1200);

      const songData = await searchSongWithGemini(searchQuery, targetKey);
      clearTimeout(timer1);

      setResult(songData);

      if (!songData.found) {
        toast.warning("Canción no confirmada", {
          description: songData.message || "No se encontraron acordes oficiales para este título.",
        });
      } else {
        toast.success("¡Canción encontrada y estructurada!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error al consultar Gemini AI", {
        description: err.message || "Verifica tu conexión y tu API Key de Gemini.",
      });
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleFormatRaw = async () => {
    if (!rawText.trim()) {
      toast.error("Pega la letra o acordes para formatear");
      return;
    }

    setLoading(true);
    setResult(null);
    setLoadingStep("Analizando y ordenando secciones...");

    try {
      const targetKey = selectedKey !== "Original" ? selectedKey : undefined;
      const songData = await formatRawSongWithGemini(rawText, targetKey);
      setResult(songData);

      if (!songData.found) {
        toast.warning("No se pudo estructurar", {
          description: songData.message || "El texto proporcionado no parece ser una canción válida.",
        });
      } else {
        toast.success("¡Texto formateado correctamente!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error al formatear", {
        description: err.message,
      });
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleApply = () => {
    if (!result || !result.found) return;

    // Build YouTube URL if direct one wasn't returned
    let finalYoutube = result.youtubeUrl || "";
    if (!finalYoutube && result.youtubeQuery) {
      finalYoutube = `https://www.youtube.com/results?search_query=${encodeURIComponent(result.youtubeQuery)}`;
    }

    onApplySong({
      title: result.title,
      author: result.author,
      category: result.category || "otro",
      lyrics: result.lyrics,
      chords: result.chords,
      youtube_url: result.youtubeUrl || "",
    });

    toast.success("¡Canción aplicada al formulario!", {
      description: "Revisa los campos y guarda la canción cuando estés listo.",
    });

    onOpenChange(false);
  };

  const resetState = () => {
    setResult(null);
    setSearchQuery("");
    setRawText("");
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "alabanza":
        return "bg-amber-500/15 text-amber-500 border-amber-500/30";
      case "adoracion":
        return "bg-pink-500/15 text-pink-500 border-pink-500/30";
      case "especial":
        return "bg-purple-500/15 text-purple-500 border-purple-500/30";
      default:
        return "bg-blue-500/15 text-blue-500 border-blue-500/30";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetState(); }}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-5 md:p-6 border-b border-border bg-card/60 backdrop-blur-md flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2">
                Asistente IA de Canciones
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                  Gemini Flash
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Busca acordes reales verificados o formatea letras desordenadas al instante.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {!result ? (
            <div className="space-y-5 max-w-2xl mx-auto py-2">
              {/* Mode Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid grid-cols-2 w-full p-1 bg-muted/60 rounded-xl border border-border h-12">
                  <TabsTrigger
                    value="search"
                    className="rounded-lg text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Buscar Canción
                  </TabsTrigger>
                  <TabsTrigger
                    value="paste"
                    className="rounded-lg text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Pegar y Formatear
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Search */}
                <TabsContent value="search" className="space-y-4 pt-4 mt-0">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">
                      Título y Artista / Ministerio
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="Ej: La Bondad de Dios - Bethel / Christine D'Clario"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleSearch(); }}
                        className="pl-12 h-13 text-base bg-muted/40 border-border rounded-xl focus-visible:ring-indigo-500/50"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Consejo: Puedes incluir el artista para que la IA elija la versión exacta que canta tu equipo.
                    </p>
                  </div>
                </TabsContent>

                {/* Tab: Paste & Format */}
                <TabsContent value="paste" className="space-y-4 pt-4 mt-0">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">
                      Pega la letra y acordes sin formatear
                    </Label>
                    <Textarea
                      placeholder="Pega aquí el texto copiado de WhatsApp, Word o páginas de acordes..."
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      className="min-h-[160px] text-sm bg-muted/40 border-border rounded-xl focus-visible:ring-indigo-500/50 font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Gemini detectará las estrofas, coros y alineará los acordes perfectamente sobre la letra.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Tonalidad Target Selector */}
              <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="h-5 w-5 text-indigo-400" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Tono deseado</p>
                    <p className="text-xs text-muted-foreground">Opcional: transporta los acordes directamente</p>
                  </div>
                </div>
                <Select value={selectedKey} onValueChange={setSelectedKey}>
                  <SelectTrigger className="w-full sm:w-[150px] bg-muted/50 border-border rounded-lg h-10 font-semibold">
                    <SelectValue placeholder="Tonalidad" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[220px]">
                    {MUSICAL_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k === "Original" ? "Tono Original" : `Tono: ${k}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Button */}
              {loading ? (
                <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-center space-y-3">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-foreground">{loadingStep}</p>
                  <p className="text-xs text-muted-foreground">Esto tomará sólo un par de segundos...</p>
                </div>
              ) : (
                <Button
                  onClick={activeTab === "search" ? handleSearch : handleFormatRaw}
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base shadow-lg shadow-indigo-500/25 transition-all gap-2"
                >
                  <Sparkles className="h-5 w-5" />
                  {activeTab === "search" ? "Buscar y Generar con IA" : "Formatear y Estructurar con IA"}
                </Button>
              )}
            </div>
          ) : (
            /* Result Preview Screen */
            <div className="space-y-6">
              {!result.found ? (
                /* Not found / Warning message */
                <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-foreground text-base">No se pudo verificar la canción</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.message || "No se encontraron acordes oficiales ni fuentes verificadas para este título."}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => setResult(null)} className="rounded-xl border-border">
                      Intentar con otro título
                    </Button>
                  </div>
                </div>
              ) : (
                /* Found Song Card */
                <div className="space-y-5">
                  {/* Song Metadata Banner */}
                  <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`font-bold uppercase tracking-wider text-[11px] ${getCategoryBadgeClass(result.category)}`}>
                          {result.category}
                        </Badge>
                        {result.originalKey && (
                          <Badge variant="secondary" className="font-bold text-[11px] bg-secondary/15 text-secondary">
                            Tono: {result.originalKey}
                          </Badge>
                        )}
                        {result.bpm && (
                          <Badge variant="outline" className="text-[11px] text-muted-foreground">
                            {result.bpm}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black text-foreground">{result.title}</h3>
                      <p className="text-sm md:text-base font-medium text-muted-foreground flex items-center gap-1.5">
                        <Music2 className="h-4 w-4 text-indigo-400" />
                        {result.author}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                      {result.youtubeQuery && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="rounded-xl border-red-500/20 text-red-500 hover:bg-red-500/10 gap-2 h-10"
                        >
                          <a
                            href={result.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(result.youtubeQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Youtube className="h-4 w-4" />
                            Ver en YouTube
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResult(null)}
                        className="rounded-xl text-muted-foreground hover:text-foreground h-10 gap-1.5"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Buscar otra
                      </Button>
                    </div>
                  </div>

                  {/* Tabs: Chords vs Lyrics */}
                  <Tabs defaultValue="chords" className="w-full">
                    <TabsList className="grid grid-cols-2 w-full max-w-md p-1 bg-muted/60 rounded-xl border border-border h-11">
                      <TabsTrigger value="chords" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">
                        Acordes y Letra
                      </TabsTrigger>
                      <TabsTrigger value="lyrics" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">
                        Solo Letra (Proyección)
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="chords" className="mt-3">
                      <div className="p-4 md:p-5 rounded-2xl bg-card border border-border max-h-[380px] overflow-y-auto font-mono text-xs md:text-sm whitespace-pre-wrap leading-relaxed select-text shadow-inner">
                        {result.chords}
                      </div>
                    </TabsContent>

                    <TabsContent value="lyrics" className="mt-3">
                      <div className="p-4 md:p-5 rounded-2xl bg-card border border-border max-h-[380px] overflow-y-auto text-xs md:text-sm whitespace-pre-wrap leading-relaxed select-text shadow-inner">
                        {result.lyrics}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {result.notes && (
                    <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-xs text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span><strong>Consejo:</strong> {result.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {result && result.found && (
          <div className="p-4 md:p-5 border-t border-border bg-card/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            <Button
              variant="ghost"
              onClick={() => setResult(null)}
              className="rounded-xl text-muted-foreground hover:text-foreground"
            >
              Volver a buscar
            </Button>

            <Button
              onClick={handleApply}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base shadow-lg shadow-indigo-500/25 px-6 gap-2"
            >
              <CheckCircle2 className="h-5 w-5" />
              ✨ Aplicar a la Canción
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
