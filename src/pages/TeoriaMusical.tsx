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
  toggleTheoryFavorite,
  deleteTheoryResource,
} from "@/services/theoryService";
import type { TheoryResource, TargetInstrument, TargetLevel } from "@/types/theory";
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
  SlidersHorizontal,
  X,
  ArrowLeft,
  HelpCircle,
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

const ICON_MAP: Record<string, any> = {
  Music,
  Mic,
  Guitar,
  Piano,
  Drum,
  Volume2,
};

const INSTRUMENTS_LIST = [
  { id: "all", label: "Todos", icon: GraduationCap },
  { id: "vocal", label: "Voces / Canto", icon: Mic },
  { id: "guitarra", label: "Guitarra", icon: Guitar },
  { id: "bajo", label: "Bajo", icon: Guitar },
  { id: "teclado", label: "Teclado", icon: Piano },
  { id: "bateria", label: "Batería", icon: Drum },
  { id: "sonido", label: "Sonido", icon: Volume2 },
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
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");

  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState<TheoryResource | null>(null);
  const [selectedResource, setSelectedResource] = useState<TheoryResource | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Auto show onboarding for first timers
  useEffect(() => {
    const hasSeen = localStorage.getItem("has_seen_theory_onboarding");
    if (!hasSeen) {
      setShowOnboarding(true);
    }
  }, []);

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
    return resources;
  }, [resources, favorites, activeTab]);

  const levelBadges: Record<string, string> = {
    principiante: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    intermedio: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    avanzado: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    todos: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };

  const contentTypeIcons: Record<string, any> = {
    video: Youtube,
    pdf: FileText,
    article: Sparkles,
    image: BookOpen,
    audio: Music,
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#0a0e17] text-slate-100 flex flex-col overflow-x-hidden">
      {/* Native Fullscreen Header */}
      <header className="sticky top-0 z-40 bg-[#0a0e17]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
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
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-400" /> Academia Musical
            </h1>
            <p className="text-[11px] text-slate-400">Recursos de Teoría y Técnica</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOnboarding(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5"
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
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Body Content */}
      <main className="flex-1 p-3 sm:p-6 space-y-5 max-w-7xl w-full mx-auto">
        {/* Search & Favorites Bar */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar tema, escala, técnica..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-9 h-12 bg-slate-900/90 border-white/10 rounded-xl text-sm placeholder:text-slate-500 focus:border-purple-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setActiveTab(activeTab === "all" ? "favorites" : "all")}
              className={`h-12 px-4 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === "favorites"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10"
                  : "bg-slate-900/80 text-slate-400 border-white/10 hover:text-white"
              }`}
            >
              <Star className={`w-4 h-4 ${activeTab === "favorites" ? "fill-amber-400 text-amber-400" : ""}`} />
              <span className="hidden sm:inline">Mis Favoritos</span>
            </button>
          </div>

          {/* Instrument Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {INSTRUMENTS_LIST.map((inst) => {
              const Icon = inst.icon;
              const active = selectedInstrument === inst.id;
              return (
                <button
                  key={inst.id}
                  onClick={() => setSelectedInstrument(inst.id)}
                  className={`h-11 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                    active
                      ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/30"
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

        {/* Category Pills */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Áreas de Estudio
          </h2>

          {categoriesLoading ? (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-11 w-32 shrink-0 rounded-xl bg-slate-900/80 border border-white/5" />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`h-11 px-4 rounded-xl border text-xs font-bold shrink-0 transition-all ${
                  selectedCategory === "all"
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                    : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                Todas las Áreas
              </button>

              {categories.map((cat) => {
                const IconComponent = ICON_MAP[cat.icon] || Music;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(isSelected ? "all" : cat.id)}
                    className={`h-11 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                      isSelected
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md shadow-purple-500/10"
                        : "bg-slate-900/80 border-white/10 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <IconComponent className="w-4 h-4 text-purple-400" />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Difficulty Level Bar */}
        <div className="flex items-center justify-between px-1 py-1 border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
            <span>Nivel:</span>
          </div>
          <div className="flex items-center gap-1.5">
            {["all", "principiante", "intermedio", "avanzado"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all border ${
                  selectedLevel === lvl
                    ? "bg-purple-600/30 text-purple-300 border-purple-500/50"
                    : "bg-slate-900/60 text-slate-400 border-white/5"
                }`}
              >
                {lvl === "all" ? "Todos" : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Resource Cards */}
        {resourcesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl bg-slate-900/80 border border-white/5" />
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No hay recursos para esta sección"
            description="Prueba seleccionando otro instrumento o categoría."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            <AnimatePresence mode="popLayout">
              {filteredResources.map((resource) => {
                const TypeIcon = contentTypeIcons[resource.content_type] || BookOpen;
                const isFav = favorites.includes(resource.id);

                return (
                  <motion.div
                    key={resource.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                  >
                    <Card
                      onClick={() => setSelectedResource(resource)}
                      className="group relative rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-white/10 hover:border-purple-500/40 transition-all p-4.5 flex flex-col justify-between gap-3.5 cursor-pointer shadow-lg hover:shadow-purple-950/30 overflow-hidden"
                    >
                      <div className="space-y-2.5">
                        {/* Top Bar: Type + Level + Favorite */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] uppercase font-bold flex items-center gap-1">
                              <TypeIcon className="w-3 h-3 text-purple-400" /> {resource.content_type}
                            </Badge>
                            <Badge className={`${levelBadges[resource.target_level] || levelBadges.todos} text-[10px] capitalize font-bold`}>
                              {resource.target_level}
                            </Badge>
                          </div>

                          {user && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                favoriteMutation.mutate(resource.id);
                              }}
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors"
                            >
                              <Star className={`w-4 h-4 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                            </button>
                          )}
                        </div>

                        {/* Title & Short Excerpt */}
                        <div>
                          <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
                            {resource.title}
                          </h3>
                          {resource.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                              {resource.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-purple-400 font-bold uppercase text-[10px]">
                          <span>{resource.instrument}</span>
                          {resource.duration_minutes && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-normal">
                              <Clock className="w-3 h-3" /> {resource.duration_minutes}m
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {canManageTheory && (
                            <div className="flex items-center gap-1 mr-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setResourceToEdit(resource);
                                  setManageDialogOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setResourceToDelete(resource.id);
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          <Button size="sm" className="h-8 px-3 rounded-lg bg-purple-600/30 text-purple-300 group-hover:bg-purple-600 group-hover:text-white font-bold text-xs transition-all">
                            Ver Recurso <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Onboarding Tutorial Modal */}
      <TheoryOnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Resource Viewer Modal */}
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
