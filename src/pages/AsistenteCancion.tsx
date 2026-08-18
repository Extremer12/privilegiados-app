import { useState, useRef, useEffect } from "react";
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
  Quote,
  X,
  Crown,
  Zap,
  Sparkles,
  ChevronRight,
  Disc,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroupContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import {
  searchSongCandidatesWithGemini,
  transcribeCandidateWithGemini,
  formatRawSongWithGemini,
  SongCandidate,
} from "@/services/geminiService";
import { checkGroupAIQuota } from "@/services/mercadoPagoService";

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
  const subscription = useSubscription();
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

  // Search & Candidates State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState<SongCandidate[] | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);

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
  const [dbMatches, setDbMatches] = useState<any[]>([]);

  // Search existing songs in the database for instant 100% verified chords
  useEffect(() => {
    if (!songTitle.trim() || songTitle.trim().length < 3) {
      setDbMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from("songs")
          .select("id, title, author, category, lyrics, chords, youtube_url")
          .ilike("title", `%${songTitle.trim()}%`)
          .limit(3);
        setDbMatches(data || []);
      } catch (err) {
        console.warn("Error buscando canciones en BD:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [songTitle]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setSelectedCandidateIndex(null);
    toast.info("Búsqueda cancelada.");
  };

  // Step 1: Search lightweight candidates (~150 tokens)
  const handleSearch = async () => {
    if (!songTitle.trim() && !youtubeInput.trim()) {
      toast.error("Ingresa el título de la canción o un enlace de YouTube");
      return;
    }

    if (activeGroup?.id) {
      const quota = await checkGroupAIQuota(activeGroup.id);
      if (!quota.allowed) {
        toast.error("Límite de IA alcanzado", {
          description: quota.message || "Has alcanzado tu límite diario de IA.",
          action: {
            label: "Ver Planes",
            onClick: () => navigate("/membresia"),
          },
        });
        return;
      }
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setSearchFeedback(null);
    setCandidates(null);
    setReviewedData(null);

    try {
      const targetKey = selectedKey !== "Original" ? selectedKey : undefined;
      const result = await searchSongCandidatesWithGemini({
        title: songTitle.trim() || "Canción",
        author: songAuthor.trim() || undefined,
        youtubeUrl: youtubeInput.trim() || undefined,
        lyricsSnippet: lyricsSnippet.trim() || undefined,
        targetKey,
        signal: controller.signal,
      });

      if (!result.found || !result.candidates || result.candidates.length === 0) {
        setSearchFeedback(result.message || "No se encontraron canciones que coincidan con la búsqueda.");
        toast.warning("Canción no encontrada", {
          description: result.message || "Verifica el título o agrega el autor para mayor precisión.",
        });
        return;
      }

      setCandidates(result.candidates);
      toast.success(
        result.candidates.length === 1
          ? "Se encontró 1 versión"
          : `Se encontraron ${result.candidates.length} versiones posibles`
      );
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        return;
      }
      console.error(err);
      toast.error("Error al buscar opciones", {
        description: err.message || "Verifica tu conexión y configuración.",
      });
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Step 2: User selects a candidate card -> Generate chords for that exact song
  const handleSelectCandidate = async (candidate: SongCandidate, index: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSelectedCandidateIndex(index);
    setLoading(true);

    try {
      const targetKey = selectedKey !== "Original" ? selectedKey : undefined;
      const result = await transcribeCandidateWithGemini({
        candidate,
        targetKey,
        youtubeUrlOverride: youtubeInput.trim() || undefined,
        signal: controller.signal,
      });

      if (!result.found) {
        toast.error("No se pudo obtener la transcripción completa", {
          description: result.message,
        });
        return;
      }

      let finalYoutube = youtubeInput.trim() || result.youtubeUrl || candidate.youtubeUrl || "";
      if (!finalYoutube && result.youtubeVideoId) {
        finalYoutube = `https://www.youtube.com/watch?v=${result.youtubeVideoId}`;
      }

      setReviewedData({
        title: result.title || candidate.title,
        author: result.author || candidate.author,
        category: result.category || candidate.category || "otro",
        originalKey: result.originalKey || candidate.originalKey || "",
        bpm: result.bpm || candidate.bpm || "",
        lyrics: result.lyrics || "",
        chords: result.chords || "",
        youtube_url: finalYoutube,
      });

      toast.success("Canción estructurada con acordes oficiales");
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        return;
      }
      console.error(err);
      toast.error("Error al transcribir la versión seleccionada", {
        description: err.message,
      });
    } finally {
      setLoading(false);
      setSelectedCandidateIndex(null);
      abortControllerRef.current = null;
    }
  };

  // Format pasted raw text
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
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border flex-wrap gap-2">
        <Button
          variant="ghost"
          onClick={() => navigate("/canciones")}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all h-10 px-3 sm:px-4 font-semibold text-xs sm:text-sm gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Canciones
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/membresia")}
            className="h-8 px-2.5 rounded-lg border-border text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>
              Cupo IA: <strong className="text-foreground">{subscription.aiRequestsToday}/{subscription.aiLimit}</strong>
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/membresia")}
            className="h-8 px-2.5 rounded-lg text-primary hover:bg-primary/10 text-xs font-bold gap-1"
          >
            <Crown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Membresía</span>
          </Button>
        </div>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-primary" />
          Asistente Musical con IA
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          Encuentra la versión exacta de tu canción con acordes de CifraClub/LaCuerda organizados para tocar en vivo.
        </p>
      </div>

      {/* STEP 1: Search Form (When neither candidates nor reviewed song are ready) */}
      {!candidates && !reviewedData && (
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

              {/* Tab: Search */}
              <TabsContent value="search" className="space-y-5 pt-5 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Título de la Canción *
                    </Label>
                    <Input
                      placeholder="Ej: Hosanna, Dios Incomparable, Cuan Grande es Dios"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      className="h-11 text-sm bg-muted/40 border-border rounded-xl focus-visible:ring-primary/40 font-semibold"
                      autoFocus
                    />
                  </div>

                  {/* Author */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Autor / Intérprete (Opcional)
                    </Label>
                    <Input
                      placeholder="Ej: Marco Barrientos, Hillsong, Miel San Marcos"
                      value={songAuthor}
                      onChange={(e) => setSongAuthor(e.target.value)}
                      className="h-11 text-sm bg-muted/40 border-border rounded-xl focus-visible:ring-primary/40 font-medium"
                    />
                  </div>
                </div>

                {/* YouTube Link */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Youtube className="w-4 h-4 text-red-500" />
                      Enlace de Video de YouTube (Opcional)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Para reproducir en paralelo</span>
                  </div>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
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

                {/* Lyrics Snippet */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-muted-foreground" />
                    Frase o Coro distintivo (Opcional)
                  </Label>
                  <Input
                    placeholder="Ej: Levantamos un clamor por sanidad y redención... / Veo al Rey de gloria"
                    value={lyricsSnippet}
                    onChange={(e) => setLyricsSnippet(e.target.value)}
                    className="h-11 text-xs bg-muted/40 border-border rounded-xl focus-visible:ring-primary/40"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Ayuda a identificar la versión exacta si hay varias canciones con el mismo título.
                  </p>
                </div>

                {/* Direct verified matches from database */}
                {dbMatches.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-primary" />
                        Canciones verificadas ya existentes en tu cancionero:
                      </p>
                      <Badge variant="outline" className="text-[10px] bg-background border-primary/30 text-primary font-bold">
                        Guardadas en BD
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {dbMatches.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-foreground truncate">{m.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{m.author || "Autor no especificado"}</p>
                          </div>
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => {
                              setReviewedData({
                                title: m.title,
                                author: m.author || "",
                                category: m.category || "otro",
                                originalKey: "",
                                bpm: "",
                                lyrics: m.lyrics || "",
                                chords: m.chords || "",
                                youtube_url: m.youtube_url || "",
                              });
                              toast.success("Cargada desde el cancionero verificado");
                            }}
                            className="h-8 text-xs font-bold px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 gap-1"
                          >
                            Usar esta versión
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  <p className="text-xs text-muted-foreground">Transporta automáticamente a tu tonalidad preferida</p>
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
                      Buscando versiones disponibles...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Consultando cancioneros y bases cristianas
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
                {activeTab === "search" ? "Buscar Versiones de la Canción" : "Formatear y Estructurar"}
              </Button>
            )}
          </Card>
        </div>
      )}

      {/* STEP 2: Candidate Selection Cards (Disambiguation) */}
      {candidates && !reviewedData && (
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Selecciona la versión que buscas ({candidates.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Revisa el coro o la frase de la letra para confirmar la versión exacta antes de transcribir.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCandidates(null);
                setSearchFeedback(null);
              }}
              className="rounded-xl border-border text-foreground hover:bg-muted font-semibold text-xs gap-1.5 h-9 shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Nueva Búsqueda
            </Button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidates.map((candidate, idx) => {
              const isSelected = selectedCandidateIndex === idx;
              const isAnySelected = selectedCandidateIndex !== null;

              return (
                <Card
                  key={idx}
                  className={`p-5 rounded-2xl bg-card border transition-all relative flex flex-col justify-between overflow-hidden group ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/30 shadow-lg"
                      : "border-border hover:border-primary/50 hover:shadow-md"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Badges Bar */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="capitalize text-[11px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20"
                        >
                          {candidate.category || "Alabanza"}
                        </Badge>
                        {candidate.versionOrAlbum && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium text-muted-foreground border-border flex items-center gap-1"
                          >
                            <Disc className="w-3 h-3 text-muted-foreground" />
                            {candidate.versionOrAlbum}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                        {candidate.originalKey && (
                          <span className="px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">
                            Tono: {candidate.originalKey}
                          </span>
                        )}
                        {candidate.bpm && (
                          <span className="px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                            {candidate.bpm} BPM
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title and Author */}
                    <div>
                      <h3 className="text-base font-extrabold text-foreground tracking-tight group-hover:text-primary transition-colors">
                        {candidate.title}
                      </h3>
                      <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                        {candidate.author || "Autor no especificado"}
                      </p>
                    </div>

                    {/* Sample Lyrics Quote Box */}
                    <div className="p-3 bg-muted/40 border border-border rounded-xl relative">
                      <Quote className="w-4 h-4 text-primary/40 absolute top-2.5 right-2.5" />
                      <p className="text-xs font-mono text-foreground leading-relaxed italic pr-5">
                        "{candidate.sampleLyric}"
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 mt-2 border-t border-border/60">
                    <Button
                      onClick={() => handleSelectCandidate(candidate, idx)}
                      disabled={isAnySelected}
                      className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs sm:text-sm gap-2 shadow-sm transition-all"
                    >
                      {isSelected ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Obteniendo acordes y letra...</span>
                        </>
                      ) : (
                        <>
                          <span>Elegir esta versión</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Cancel button if transcribing */}
          {loading && selectedCandidateIndex !== null && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold text-xs gap-1.5"
              >
                <X className="w-4 h-4" />
                Cancelar Transcripción
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Review Screen with Inline YouTube Player and Dual-Column Layout */}
      {reviewedData && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-card border border-border rounded-2xl w-full">
            <div className="flex items-center gap-2">
              {candidates && candidates.length > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => setReviewedData(null)}
                  className="rounded-xl border-border text-foreground hover:bg-muted font-semibold text-xs sm:text-sm gap-1.5 h-10 sm:h-11"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cambiar versión
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setReviewedData(null);
                  setCandidates(null);
                  setSearchFeedback(null);
                }}
                className="rounded-xl border-border text-foreground hover:bg-muted font-semibold text-xs sm:text-sm gap-2 h-10 sm:h-11 justify-center"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                Nueva Búsqueda
              </Button>
            </div>

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
