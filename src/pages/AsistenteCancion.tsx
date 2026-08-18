import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Search,
  FileText,
  Music,
  Check,
  AlertCircle,
  Loader2,
  Youtube,
  Save,
  PenSquare,
  SlidersHorizontal,
  RefreshCw,
  Copy,
  Link,
  Quote,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroupContext";
import { useUserRole } from "@/hooks/useUserRole";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { searchSongWithGemini, formatRawSongWithGemini } from "@/services/geminiService";

const MUSICAL_KEYS = [
  "Original",
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm",
];

export default function AsistenteCancion() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeGroup, isGroupAdmin, isGroupLeader } = useGroup();
  const { isAdmin, isLeader, isModerator } = useUserRole();
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [activeTab, setActiveTab] = useState<"search" | "paste">("search");

  // Search parameters
  const [songTitle, setSongTitle] = useState("");
  const [songAuthor, setSongAuthor] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [lyricsSnippet, setLyricsSnippet] = useState("");
  const [selectedKey, setSelectedKey] = useState("Original");

  // Raw paste state
  const [rawText, setRawText] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State for Review
  const [reviewedData, setReviewedData] = useState<{
    title: string;
    author: string;
    category: string;
    originalKey: string;
    bpm: string;
    lyrics: string;
    chords: string;
    youtube_url: string;
  } | null>(null);

  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    toast.info("Búsqueda cancelada.");
  };

  const handleSearch = async () => {
    if (!songTitle.trim() && !youtubeInput.trim()) {
      toast.error("Ingresa el título de la canción o un enlace de YouTube");
      return;
    }

    // Initialize AbortController
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setSearchFeedback(null);

    try {
      const targetKey = selectedKey !== "Original" ? selectedKey : undefined;
      const result = await searchSongWithGemini({
        title: songTitle.trim() || "Canción",
        author: songAuthor.trim() || undefined,
        youtubeUrl: youtubeInput.trim() || undefined,
        lyricsSnippet: lyricsSnippet.trim() || undefined,
        targetKey,
        signal: controller.signal,
      });

      if (!result.found) {
        setSearchFeedback(result.message || "No se encontraron fuentes de acordes confirmadas para este título.");
        toast.warning("Canción no encontrada", {
          description: result.message || "Verifica el título, autor o agrega el enlace de YouTube.",
        });
        return;
      }

      // Prioritize the user's provided YouTube URL if valid, otherwise AI found URL
      let finalYoutube = youtubeInput.trim() || result.youtubeUrl || "";
      if (!finalYoutube && result.youtubeVideoId) {
        finalYoutube = `https://www.youtube.com/watch?v=${result.youtubeVideoId}`;
      }

      setReviewedData({
        title: result.title || songTitle,
        author: result.author || songAuthor,
        category: result.category || "otro",
        originalKey: result.originalKey || "",
        bpm: result.bpm || "",
        lyrics: result.lyrics || "",
        chords: result.chords || "",
        youtube_url: finalYoutube,
      });

      toast.success("Canción encontrada y estructurada");
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        return; // User cancelled
      }
      console.error(err);
      toast.error("Error al buscar la canción", {
        description: err.message || "Verifica tu conexión y configuración.",
      });
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleFormatRaw = async () => {
    if (!rawText.trim()) {
      toast.error("Pega el texto de la canción con acordes");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setSearchFeedback(null);

    try {
      const targetKey = selectedKey !== "Original" ? selectedKey : undefined;
      const result = await formatRawSongWithGemini(rawText, targetKey, controller.signal);

      if (!result.found) {
        setSearchFeedback(result.message || "El texto no parece contener una estructura musical válida.");
        toast.warning("No se pudo estructurar", {
          description: result.message,
        });
        return;
      }

      setReviewedData({
        title: result.title || "Canción",
        author: result.author || "",
        category: result.category || "otro",
        originalKey: result.originalKey || "",
        bpm: result.bpm || "",
        lyrics: result.lyrics || "",
        chords: result.chords || "",
        youtube_url: result.youtubeUrl || "",
      });

      toast.success("Texto formateado correctamente");
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        return;
      }
      console.error(err);
      toast.error("Error al formatear", {
        description: err.message,
      });
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSaveDirectly = async () => {
    if (!reviewedData || !user) return;
    if (!reviewedData.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const isAuthorized = isAdmin || isLeader || isModerator || isGroupAdmin || isGroupLeader;
      const initialStatus = isAuthorized ? "approved" : "pending";

      const { data: newSong, error } = await supabase
        .from("songs")
        .insert({
          title: reviewedData.title.trim(),
          author: reviewedData.author.trim() || null,
          category: reviewedData.category as any,
          lyrics: reviewedData.lyrics,
          chords: reviewedData.chords,
          youtube_url: reviewedData.youtube_url.trim() || null,
          created_by: user.id,
          status: initialStatus,
          group_id: activeGroup?.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["songs", activeGroup?.id] });
      toast.success("Canción guardada correctamente");
      navigate(`/canciones/${newSong.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al guardar la canción", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenInManualEditor = () => {
    if (!reviewedData) return;
    navigate("/canciones/nueva", {
      state: {
        prefilledSong: reviewedData,
      },
    });
  };

  const handleCopyChords = () => {
    if (reviewedData?.chords) {
      navigator.clipboard.writeText(reviewedData.chords);
      toast.success("Acordes copiados al portapapeles");
    }
  };

  return (
    <main className="flex-1 pt-20 pb-24 px-3 sm:px-6 lg:px-8 safe-top safe-bottom max-w-6xl mx-auto w-full overflow-x-hidden">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <Button
          variant="ghost"
          onClick={() => navigate("/canciones")}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all h-10 px-4 font-semibold text-sm gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Canciones
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-muted/60 border-border text-foreground">
            Buscador Musical
          </Badge>
        </div>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
          Agregar Canción con Asistente
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          Especifica los detalles, el artista o el video de YouTube para asegurar la versión exacta de la canción con acordes reales.
        </p>
      </div>

      {/* Step 1: Input Form (When no song is being reviewed) */}
      {!reviewedData ? (
        <div className="max-w-3xl mx-auto w-full space-y-6">
          <Card className="p-6 md:p-8 bg-card border-border rounded-2xl shadow-sm space-y-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid grid-cols-2 w-full p-1 bg-muted/70 rounded-xl border border-border h-12">
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

              {/* Tab: Search with Disambiguation Fields */}
              <TabsContent value="search" className="space-y-5 pt-5 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Field 1: Song Title */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Título de la Canción *
                    </Label>
                    <Input
                      placeholder="Ej: Hosanna, Dios Incomparable, Way Maker"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      className="h-11 text-sm bg-muted/40 border-border rounded-xl focus-visible:ring-primary/40 font-semibold"
                      autoFocus
                    />
                  </div>

                  {/* Field 2: Author / Ministry */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Autor o Ministerio (Recomendado)
                    </Label>
                    <Input
                      placeholder="Ej: Marco Barrientos, Miel San Marcos, Hillsong"
                      value={songAuthor}
                      onChange={(e) => setSongAuthor(e.target.value)}
                      className="h-11 text-sm bg-muted/40 border-border rounded-xl focus-visible:ring-primary/40 font-medium"
                    />
                  </div>
                </div>

                {/* Field 3: YouTube Link */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Youtube className="w-4 h-4 text-red-500" />
                      Enlace de Video de YouTube (Opcional)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Identificación exacta</span>
                  </div>
                  <Input
                    placeholder="Pega el enlace de YouTube ej: https://www.youtube.com/watch?v=..."
                    value={youtubeInput}
                    onChange={(e) => setYoutubeInput(e.target.value)}
                    className="h-11 text-xs font-mono bg-muted/40 border-border rounded-xl focus-visible:ring-primary/40"
                  />
                  {youtubeInput.trim() && (
                    <div className="mt-3 p-3 bg-muted/20 border border-border rounded-xl">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Vista previa del video seleccionado:</p>
                      <div className="max-w-md mx-auto">
                        <YouTubePlayer url={youtubeInput.trim()} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Field 4: Lyrics Snippet / Distinctive Phrase */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-muted-foreground" />
                    Frase de la letra o notas distintivas (Opcional)
                  </Label>
                  <Input
                    placeholder="Ej: Levantamos un clamor por sanidad y redención... / Versión acústica en vivo"
                    value={lyricsSnippet}
                    onChange={(e) => setLyricsSnippet(e.target.value)}
                    className="h-11 text-xs bg-muted/40 border-border rounded-xl focus-visible:ring-primary/40"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Evita confusiones si existen varias canciones con el mismo nombre.
                  </p>
                </div>
              </TabsContent>

              {/* Tab: Paste and Format */}
              <TabsContent value="paste" className="space-y-4 pt-5 mt-0">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-foreground">
                    Texto con acordes sin estructurar
                  </Label>
                  <Textarea
                    placeholder="Pega aquí la letra y acordes copiados de cualquier sitio o documento..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="min-h-[220px] text-sm bg-muted/30 border-border rounded-xl font-mono leading-relaxed p-4"
                  />
                  <p className="text-xs text-muted-foreground">
                    El sistema organizará las estrofas ([Verso 1], [Coro], [Puente]) y alineará los acordes encima de las palabras.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Target Musical Key */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-bold text-foreground">Tono de acordes</p>
                  <p className="text-xs text-muted-foreground">Transporta la canción a tu tonalidad preferida</p>
                </div>
              </div>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger className="w-full sm:w-[160px] bg-card border-border rounded-lg h-10 font-semibold">
                  <SelectValue placeholder="Tono" />
                </SelectTrigger>
                <SelectContent className="max-h-[240px]">
                  {MUSICAL_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k === "Original" ? "Tono Original" : `Tono: ${k}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Feedback Message */}
            {searchFeedback && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{searchFeedback}</p>
              </div>
            )}

            {/* Submit or Loading/Cancel Block */}
            {loading ? (
              <div className="p-4 rounded-xl bg-muted/60 border border-border flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Buscando y verificando transcripción oficial...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Consultando bases de acordes y cancioneros
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="rounded-xl h-10 px-4 border-destructive/40 text-destructive hover:bg-destructive/10 font-bold text-xs gap-1.5 shrink-0"
                >
                  <X className="w-4 h-4" />
                  Cancelar Búsqueda
                </Button>
              </div>
            ) : (
              <Button
                onClick={activeTab === "search" ? handleSearch : handleFormatRaw}
                className="w-full h-13 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base shadow-sm transition-all gap-2"
              >
                <Search className="h-5 w-5" />
                {activeTab === "search" ? "Buscar Canción" : "Formatear y Estructurar"}
              </Button>
            )}
          </Card>
        </div>
      ) : (
        /* Step 2: Review Screen with Inline YouTube Player and Dual-Column Layout */
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-card border border-border rounded-2xl w-full">
            <Button
              variant="outline"
              onClick={() => {
                setReviewedData(null);
                setSearchFeedback(null);
              }}
              className="w-full sm:w-auto rounded-xl border-border text-foreground hover:bg-muted font-semibold text-xs sm:text-sm gap-2 h-10 sm:h-11 justify-center"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              Nueva Búsqueda
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleOpenInManualEditor}
                className="w-full sm:w-auto rounded-xl border-border text-foreground hover:bg-muted font-semibold text-xs sm:text-sm gap-2 h-10 sm:h-11 justify-center"
              >
                <PenSquare className="w-4 h-4 shrink-0" />
                Editar en Formulario
              </Button>

              <Button
                onClick={handleSaveDirectly}
                disabled={saving}
                className="w-full sm:w-auto rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs sm:text-sm px-4 sm:px-6 h-10 sm:h-11 gap-2 shadow-sm justify-center"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Save className="w-4 h-4 shrink-0" />}
                Guardar Canción
              </Button>
            </div>
          </div>

          {/* Dual Column: Metadata & Video (Left) vs Chords & Lyrics (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Metadata & Video Player */}
            <div className="lg:col-span-5 space-y-6">
              {/* Metadata Card */}
              <Card className="p-5 md:p-6 bg-card border-border rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-foreground pb-2 border-b border-border">
                  Datos de la Canción
                </h3>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título</Label>
                  <Input
                    value={reviewedData.title}
                    onChange={(e) => setReviewedData({ ...reviewedData, title: e.target.value })}
                    className="h-11 bg-muted/40 border-border rounded-xl font-bold text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Autor / Ministerio</Label>
                  <Input
                    value={reviewedData.author}
                    onChange={(e) => setReviewedData({ ...reviewedData, author: e.target.value })}
                    className="h-11 bg-muted/40 border-border rounded-xl font-medium text-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoría</Label>
                    <Select
                      value={reviewedData.category}
                      onValueChange={(val) => setReviewedData({ ...reviewedData, category: val })}
                    >
                      <SelectTrigger className="h-11 bg-muted/40 border-border rounded-xl font-medium">
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
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tono Original</Label>
                    <Input
                      value={reviewedData.originalKey}
                      onChange={(e) => setReviewedData({ ...reviewedData, originalKey: e.target.value })}
                      placeholder="Ej: G"
                      className="h-11 bg-muted/40 border-border rounded-xl font-bold text-foreground"
                    />
                  </div>
                </div>

                {reviewedData.bpm && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tempo / BPM</Label>
                    <Input
                      value={reviewedData.bpm}
                      onChange={(e) => setReviewedData({ ...reviewedData, bpm: e.target.value })}
                      className="h-11 bg-muted/40 border-border rounded-xl text-xs font-medium text-muted-foreground"
                    />
                  </div>
                )}
              </Card>

              {/* YouTube Video Player Card */}
              <Card className="p-5 md:p-6 bg-card border-border rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-red-500" />
                    Video de YouTube
                  </h3>
                  <span className="text-xs text-muted-foreground">Reproductor integrado</span>
                </div>

                {/* Inline YouTube Player */}
                {reviewedData.youtube_url ? (
                  <div className="space-y-3">
                    <YouTubePlayer url={reviewedData.youtube_url} />
                    <p className="text-xs text-muted-foreground text-center">
                      Reproduce el video para comprobar que coincida con la letra y los acordes.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 bg-muted/40 rounded-xl text-center text-xs text-muted-foreground">
                    No se detectó enlace de video. Puedes ingresar uno debajo.
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL del Video</Label>
                  <Input
                    value={reviewedData.youtube_url}
                    onChange={(e) => setReviewedData({ ...reviewedData, youtube_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="h-10 bg-muted/40 border-border rounded-xl text-xs font-mono"
                  />
                </div>
              </Card>
            </div>

            {/* Right Column: Chords & Lyrics Editor */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="p-5 md:p-6 bg-card border-border rounded-2xl space-y-4">
                <Tabs defaultValue="chords" className="w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-3">
                    <TabsList className="grid grid-cols-2 w-full sm:w-[280px] p-1 bg-muted/60 rounded-xl border border-border h-10">
                      <TabsTrigger value="chords" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">
                        Acordes y Letra
                      </TabsTrigger>
                      <TabsTrigger value="lyrics" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">
                        Solo Letra
                      </TabsTrigger>
                    </TabsList>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyChords}
                      className="rounded-lg text-xs text-muted-foreground hover:text-foreground h-9 gap-1.5 self-end sm:self-auto"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </Button>
                  </div>

                  {/* Tab Chords */}
                  <TabsContent value="chords" className="space-y-2 pt-2">
                    <Label className="text-xs text-muted-foreground">
                      Puedes ajustar los acordes o la tabulación directamente en el recuadro:
                    </Label>
                    <Textarea
                      value={reviewedData.chords}
                      onChange={(e) => setReviewedData({ ...reviewedData, chords: e.target.value })}
                      className="min-h-[500px] font-mono text-xs md:text-sm bg-muted/30 border-border rounded-xl p-4 leading-relaxed whitespace-pre"
                    />
                  </TabsContent>

                  {/* Tab Lyrics Only */}
                  <TabsContent value="lyrics" className="space-y-2 pt-2">
                    <Label className="text-xs text-muted-foreground">
                      Texto limpio para proyección en vivo:
                    </Label>
                    <Textarea
                      value={reviewedData.lyrics}
                      onChange={(e) => setReviewedData({ ...reviewedData, lyrics: e.target.value })}
                      className="min-h-[500px] text-xs md:text-sm bg-muted/30 border-border rounded-xl p-4 leading-relaxed whitespace-pre"
                    />
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
