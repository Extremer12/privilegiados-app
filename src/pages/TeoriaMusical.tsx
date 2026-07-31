import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  PlayCircle,
  ChevronRight,
  GraduationCap,
  SlidersHorizontal,
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
  { id: "vocal", label: "Voces", icon: Mic },
  { id: "guitarra", label: "Guitarra", icon: Guitar },
  { id: "bajo", label: "Bajo", icon: Guitar },
  { id: "teclado", label: "Teclado", icon: Piano },
  { id: "bateria", label: "Batería", icon: Drum },
  { id: "sonido", label: "Sonido", icon: Volume2 },
];

export default function TeoriaMusical() {
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
    principiante: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    intermedio: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    avanzado: "bg-purple-500/20 text-purple-400 border-purple-500/30",
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
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 p-4 sm:p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl p-6 sm:p-10 overflow-hidden bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-indigo-950/80 border border-white/10 shadow-2xl backdrop-blur-3xl"
      >
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" /> Escuela & Centro de Aprendizaje
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Academia de <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">Teoría Musical</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Explora recursos, videos instructivos, guías en PDF y técnicas para voces e instrumentos.
            </p>
          </div>

          {canManageTheory && (
            <Button
              onClick={() => {
                setResourceToEdit(null);
                setManageDialogOpen(true);
              }}
              className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-6 py-6 shadow-xl shadow-purple-600/30 border border-purple-400/20 shrink-0 transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" /> Nuevo Recurso
            </Button>
          )}
        </div>
      </motion.div>

      {/* Category Cards Slider / Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" /> Áreas de Estudio
        </h2>

        {categoriesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl bg-slate-900/60 border border-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-28 group ${
                selectedCategory === "all"
                  ? "bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-500/10"
                  : "bg-slate-900/60 border-white/5 hover:border-white/20 hover:bg-slate-900"
              }`}
            >
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 w-fit">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-white">Todas</span>
            </button>

            {categories.map((cat) => {
              const IconComponent = ICON_MAP[cat.icon] || Music;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isSelected ? "all" : cat.id)}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-28 group relative overflow-hidden ${
                    isSelected
                      ? "bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-500/10"
                      : "bg-slate-900/60 border-white/5 hover:border-white/20 hover:bg-slate-900"
                  }`}
                >
                  <div className={`p-2.5 rounded-xl w-fit bg-gradient-to-br ${cat.color_gradient} text-white shadow-md`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs text-white truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar tema, acorde, técnica..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 bg-slate-900/80 border-white/10 rounded-2xl text-sm focus:border-purple-500"
            />
          </div>

          {/* Instrument Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide">
            {INSTRUMENTS_LIST.map((inst) => {
              const Icon = inst.icon;
              const active = selectedInstrument === inst.id;
              return (
                <button
                  key={inst.id}
                  onClick={() => setSelectedInstrument(inst.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                    active
                      ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20"
                      : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {inst.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty Level Badges */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-400 font-semibold">Nivel:</span>
          {["all", "principiante", "intermedio", "avanzado"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all border ${
                selectedLevel === lvl
                  ? "bg-white/15 text-white border-white/30"
                  : "bg-slate-900/40 text-slate-400 border-white/5 hover:text-slate-200"
              }`}
            >
              {lvl === "all" ? "Todos" : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      {resourcesLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-3xl bg-slate-900/60 border border-white/5" />
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No se encontraron recursos"
          description="Intenta cambiar los filtros de búsqueda o categoría."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredResources.map((resource) => {
              const TypeIcon = contentTypeIcons[resource.content_type] || BookOpen;
              const isFav = favorites.includes(resource.id);

              return (
                <motion.div
                  key={resource.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    onClick={() => setSelectedResource(resource)}
                    className="group relative rounded-3xl bg-slate-900/70 hover:bg-slate-900 border border-white/10 hover:border-purple-500/40 transition-all duration-300 p-6 flex flex-col justify-between gap-4 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-purple-950/40 backdrop-blur-xl overflow-hidden"
                  >
                    <div className="space-y-3">
                      {/* Card Top badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] uppercase font-bold flex items-center gap-1">
                            <TypeIcon className="w-3 h-3" /> {resource.content_type}
                          </Badge>
                          <Badge className={`${levelBadges[resource.target_level] || levelBadges.todos} text-[10px] capitalize font-bold`}>
                            {resource.target_level}
                          </Badge>
                        </div>

                        {/* Favorite button */}
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

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                          {resource.title}
                        </h3>
                        {resource.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                            {resource.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="uppercase text-[10px] font-bold text-purple-400">
                          {resource.instrument}
                        </span>
                        {resource.duration_minutes && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" /> {resource.duration_minutes}m
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {canManageTheory && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setResourceToEdit(resource);
                                setManageDialogOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
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
                          </>
                        )}
                        <span className="flex items-center gap-1 font-bold text-purple-400 text-xs group-hover:translate-x-1 transition-transform">
                          Ver <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

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
        <AlertDialogContent className="bg-slate-950 border-white/10 text-slate-100 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">¿Eliminar este recurso?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-sm">
              Esta acción no se puede deshacer y el recurso ya no estará disponible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-white/10 text-slate-300">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resourceToDelete && deleteMutation.mutate(resourceToDelete)}
              className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
