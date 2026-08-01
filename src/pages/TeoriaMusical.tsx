import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useTheoryPermissions } from "@/hooks/useTheoryPermissions";
import {
  fetchCategories,
  fetchResources,
  fetchUserFavorites,
  fetchUserCompletions,
  toggleTheoryFavorite,
  toggleTheoryCompletion,
  deleteTheoryResource,
} from "@/services/theoryService";
import type { TheoryResource } from "@/types/theory";
import { ManageTheoryResourceDialog } from "@/components/teoria/ManageTheoryResourceDialog";
import { TheoryResourceViewerModal } from "@/components/teoria/TheoryResourceViewerModal";
import { TheoryOnboardingModal } from "@/components/teoria/TheoryOnboardingModal";
import {
  BookOpen,
  Search,
  Plus,
  Youtube,
  FileText,
  Music,
  Guitar,
  Piano,
  Drum,
  Volume2,
  Mic,
  Star,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  ChevronRight,
  GraduationCap,
  X,
  ArrowLeft,
  HelpCircle,
  LayoutGrid,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const INSTRUMENT_FILTERS = [
  { id: "all", label: "Todos", icon: GraduationCap },
  { id: "vocal", label: "Canto / Voces", icon: Mic },
  { id: "guitarra", label: "Guitarra", icon: Guitar },
  { id: "bajo", label: "Bajo", icon: Guitar },
  { id: "teclado", label: "Teclado / Piano", icon: Piano },
  { id: "bateria", label: "Batería", icon: Drum },
  { id: "sonido", label: "Sonido / Audio", icon: Volume2 },
];

const LEVEL_FILTERS = [
  { id: "all", label: "Todos los niveles" },
  { id: "principiante", label: "Principiante" },
  { id: "intermedio", label: "Intermedio" },
  { id: "avanzado", label: "Avanzado" },
];

export default function TeoriaMusical() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageTheory } = useTheoryPermissions();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedInstrument, setSelectedInstrument] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [activeTab, setActiveTab] = useState<"explore" | "favorites" | "completed">("explore");
  const [hasPreferences, setHasPreferences] = useState(false);

  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState<TheoryResource | null>(null);
  const [selectedResource, setSelectedResource] = useState<TheoryResource | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Read preferences on mount
  useEffect(() => {
    const rawPrefs = localStorage.getItem("theory_user_preferences");
    if (rawPrefs) {
      try {
        const prefs = JSON.parse(rawPrefs);
        if (prefs.instruments && prefs.instruments.length > 0) {
          setSelectedInstrument(prefs.instruments[0]);
          setHasPreferences(true);
        }
        if (prefs.level && prefs.level !== "todos") {
          setSelectedLevel(prefs.level);
          setHasPreferences(true);
        }
      } catch (e) {
        console.error("Error parsing preferences:", e);
      }
    }

    const hasSeen = localStorage.getItem("has_seen_theory_onboarding");
    if (!hasSeen) {
      setShowOnboarding(true);
    }
  }, []);

  const handlePreferencesSaved = (prefs: { instruments: string[]; level: string }) => {
    if (prefs.instruments && prefs.instruments.length > 0) {
      setSelectedInstrument(prefs.instruments[0]);
      setHasPreferences(true);
    }
    if (prefs.level && prefs.level !== "todos") {
      setSelectedLevel(prefs.level);
      setHasPreferences(true);
    }
  };

  const resetFilters = () => {
    setSelectedInstrument("all");
    setSelectedLevel("all");
    setSelectedCategory("all");
    setSearch("");
    setHasPreferences(false);
  };

  // Queries
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["theory-categories"],
    queryFn: fetchCategories,
  });

  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ["theory-resources", selectedCategory, selectedInstrument, selectedLevel, search],
    queryFn: () =>
      fetchResources({
        categoryId: selectedCategory,
        instrument: selectedInstrument,
        level: selectedLevel,
        search,
      }),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["theory-favorites", user?.id],
    queryFn: () => fetchUserFavorites(user!.id),
    enabled: !!user,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["theory-completions", user?.id],
    queryFn: () => fetchUserCompletions(user!.id),
    enabled: !!user,
  });

  // Favorite toggle mutation
  const favoriteMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const isFav = favorites.includes(resourceId);
      await toggleTheoryFavorite(resourceId, user!.id, isFav);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theory-favorites"] });
    },
  });

  // Completion toggle mutation
  const completionMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const isComp = completions.includes(resourceId);
      await toggleTheoryCompletion(resourceId, user!.id, isComp);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theory-completions"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTheoryResource(id),
    onSuccess: () => {
      toast.success("Recurso eliminado");
      queryClient.invalidateQueries({ queryKey: ["theory-resources"] });
      setResourceToDelete(null);
    },
  });

  const filteredResources = useMemo(() => {
    if (activeTab === "favorites") {
      return resources.filter((r) => favorites.includes(r.id));
    }
    if (activeTab === "completed") {
      return resources.filter((r) => completions.includes(r.id));
    }
    return resources;
  }, [resources, favorites, completions, activeTab]);

  const completedCount = completions.length;
  const totalCount = resources.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const contentTypeBadges: Record<string, { label: string; icon: any; color: string }> = {
    video: { label: "YouTube", icon: Youtube, color: "bg-red-500/20 text-red-300 border-red-500/30" },
    pdf: { label: "PDF", icon: FileText, color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
    article: { label: "Lección", icon: Sparkles, color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    image: { label: "Imagen", icon: BookOpen, color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    audio: { label: "Audio", icon: Music, color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  };

  const levelBadges: Record<string, string> = {
    principiante: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    intermedio: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    avanzado: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    todos: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#0a0e17] text-slate-100 flex flex-col overflow-x-hidden">
      {/* Clean Native Android Top Header */}
      <header className="sticky top-0 z-40 bg-[#0a0e17]/95 backdrop-blur-xl border-b border-white/10 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-10 w-10 rounded-full hover:bg-white/10 text-slate-300"
            title="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
              <GraduationCap className="w-5 h-5 text-purple-400" /> Mi Academia
            </h1>
            <p className="text-[11px] text-slate-400">Escuela de Música</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOnboarding(true)}
            className="h-9 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <HelpCircle className="w-4 h-4" /> Tutorial
          </button>

          {canManageTheory && (
            <Button
              onClick={() => {
                setResourceToEdit(null);
                setManageDialogOpen(true);
              }}
              className="h-9 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 text-xs flex items-center gap-1 shadow-md shadow-purple-600/30"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Publicar</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Body Section */}
      <main className="flex-1 p-3.5 sm:p-6 space-y-5 max-w-4xl w-full mx-auto">
        {/* Progress Bar Card */}
        {user && totalCount > 0 && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Tu Progreso
              </span>
              <span className="text-slate-400">{completedCount} de {totalCount} ({progressPercent}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full bg-emerald-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
        )}

        {/* 1. Main Navigation Segmented Tabs (Explorar, Favoritos, Completadas) */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-white/10">
          <button
            onClick={() => setActiveTab("explore")}
            className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "explore"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Explorar
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "favorites"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Star className={`w-4 h-4 ${activeTab === "favorites" ? "fill-amber-400 text-amber-400" : ""}`} /> Favoritos ({favorites.length})
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "completed"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Vistas ({completedCount})
          </button>
        </div>

        {/* 2. Intuitive Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar lección o tema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-10 h-11 bg-slate-900/90 border-white/10 rounded-2xl text-sm placeholder:text-slate-500 focus:border-purple-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 3. Level & Instrument Filter Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Nivel
            </h2>
            {hasPreferences && (
              <button
                onClick={resetFilters}
                className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Ver Todos los Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LEVEL_FILTERS.map((lvl) => {
              const active = selectedLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`h-9 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    active
                      ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30"
                      : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Instrument Pills Horizontal Selector */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Instrumento
          </h2>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {INSTRUMENT_FILTERS.map((inst) => {
              const Icon = inst.icon;
              const active = selectedInstrument === inst.id;
              return (
                <button
                  key={inst.id}
                  onClick={() => setSelectedInstrument(inst.id)}
                  className={`h-10 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                    active
                      ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30"
                      : "bg-slate-900/90 border-white/10 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {inst.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Minimalist, Professional Lesson Cards */}
        {resourcesLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl bg-slate-900/80 border border-white/5" />
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={
              activeTab === "favorites"
                ? "No tienes favoritos"
                : activeTab === "completed"
                ? "No has marcado lecciones como vistas"
                : "No se encontraron lecciones"
            }
            description="Intenta seleccionar otro nivel o instrumento."
          />
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filteredResources.map((resource) => {
                const formatConfig = contentTypeBadges[resource.content_type] || contentTypeBadges.article;
                const FormatIcon = formatConfig.icon;
                const isFav = favorites.includes(resource.id);
                const isComp = completions.includes(resource.id);

                return (
                  <motion.div
                    key={resource.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                  >
                    <Card
                      onClick={() => setSelectedResource(resource)}
                      className={`group relative rounded-2xl border transition-all p-3.5 sm:p-4 flex items-center justify-between gap-3.5 cursor-pointer shadow-md overflow-hidden ${
                        isComp
                          ? "bg-slate-900/60 border-emerald-500/30 hover:border-emerald-500/50"
                          : "bg-slate-900/90 hover:bg-slate-900 border-white/10 hover:border-purple-500/40"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Clean Format Thumbnail Box */}
                        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
                          isComp
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : "bg-purple-500/20 border-purple-500/30 text-purple-300"
                        }`}>
                          {isComp ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <FormatIcon className="w-5 h-5" />}
                        </div>

                        {/* Title & Concise Badges */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${formatConfig.color} text-[9px] uppercase font-bold px-1.5 py-0.2`}>
                              {formatConfig.label}
                            </Badge>
                            <Badge className={`${levelBadges[resource.target_level] || levelBadges.todos} text-[9px] capitalize font-bold px-1.5 py-0.2`}>
                              {resource.target_level}
                            </Badge>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 truncate">
                              {resource.instrument}
                            </span>
                            {resource.duration_minutes && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {resource.duration_minutes}m
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                            {resource.title}
                          </h3>
                        </div>
                      </div>

                      {/* Right Action Icons & Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        {user && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              favoriteMutation.mutate(resource.id);
                            }}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors"
                            title={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
                          >
                            <Star className={`w-4 h-4 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                          </button>
                        )}

                        {canManageTheory && (
                          <div className="hidden sm:flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setResourceToEdit(resource);
                                setManageDialogOpen(true);
                              }}
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setResourceToDelete(resource.id);
                              }}
                              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <Button size="sm" className="h-9 px-3 sm:px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-500 font-bold text-xs shadow-md shadow-purple-600/20">
                          Ver <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Onboarding Tutorial Modal with Preferences Questionnaire */}
      <TheoryOnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSavePreferences={handlePreferencesSaved}
      />

      {/* Fullscreen Resource Viewer Modal */}
      <TheoryResourceViewerModal
        open={!!selectedResource}
        onOpenChange={(open) => !open && setSelectedResource(null)}
        resource={selectedResource}
      />

      {/* Admin Manage Resource Dialog */}
      <ManageTheoryResourceDialog
        open={manageDialogOpen}
        onOpenChange={setManageDialogOpen}
        resourceToEdit={resourceToEdit}
        categories={categories}
      />

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!resourceToDelete} onOpenChange={() => setResourceToDelete(null)}>
        <AlertDialogContent className="bg-slate-950 border-white/10 text-slate-100 rounded-3xl max-w-sm p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">¿Eliminar este recurso?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-xs">
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex flex-row justify-end gap-2">
            <AlertDialogCancel className="rounded-xl border-white/10 text-slate-300 h-10 text-xs m-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resourceToDelete && deleteMutation.mutate(resourceToDelete)}
              className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold h-10 text-xs m-0"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
