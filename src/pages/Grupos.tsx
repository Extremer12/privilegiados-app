import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroupContext";
import { searchPublicGroups, fetchApprovedMemberCount } from "@/services/groupService";
import {
  Plus, Search, Users, Crown, ChevronRight, Music, Compass, Sparkles, LogOut, ArrowLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { MusicGroup } from "@/types";

const Grupos = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { userGroups, switchGroup, loading, activeGroup } = useGroup();
  const [searchQuery, setSearchQuery] = useState("");
  const [showExplorer, setShowExplorer] = useState(false);

  // Search public groups
  const { data: publicGroups = [], isLoading: searchLoading } = useQuery({
    queryKey: ["publicGroups", searchQuery],
    queryFn: () => searchPublicGroups(searchQuery),
    enabled: showExplorer,
    staleTime: 30 * 1000,
  });

  // Filter out groups user already belongs to
  const userGroupIds = new Set(userGroups.map((g) => g.id));
  const discoverableGroups = publicGroups.filter((g) => !userGroupIds.has(g.id));

  const handleSelectGroup = (group: MusicGroup & { memberRole?: string }) => {
    switchGroup(group.id);
    navigate("/");
  };

  if (loading) {
    return (
      <main className="flex-1 pt-20 pb-20 px-4 safe-top safe-bottom w-full">
        <div className="max-w-lg mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl bg-muted" />
          ))}
        </div>
      </main>
    );
  }

  if (!activeGroup) {
    return (
      <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 select-none">
        {/* Cinematic Ambient Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        </div>

        <div className="max-w-md w-full relative z-10">
          <AnimatePresence mode="wait">
            {!showExplorer ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full text-center"
              >
                {/* Premium Animated Icon */}
                <div className="relative mx-auto mb-8 w-24 h-24 rounded-3xl bg-secondary/5 border border-secondary/15 flex items-center justify-center overflow-hidden shadow-2xl shadow-secondary/5">
                  <div className="absolute inset-0 bg-gradient-to-tr from-secondary/10 to-transparent opacity-50" />
                  <div className="absolute inset-0 blur-md bg-secondary/20 scale-75 rounded-full" />
                  <Music className="w-10 h-10 text-secondary relative z-10 animate-bounce" style={{ animationDuration: '3s' }} />
                </div>

                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4 uppercase">
                  Comienza tu <span className="bg-gradient-to-r from-secondary via-secondary/80 to-secondary/60 bg-clip-text text-transparent">viaje musical</span>
                </h1>
                
                <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto mb-10 font-medium">
                  Crea tu propio grupo musical o busca uno existente para unirte y empezar a sincronizar tus canciones, eventos y repertorios.
                </p>

                <div className="flex flex-col gap-4 w-full">
                  <Button
                    onClick={() => navigate("/grupos/crear")}
                    className="w-full h-14 rounded-2xl bg-secondary text-primary font-black uppercase tracking-widest text-sm shadow-xl shadow-secondary/10 hover:shadow-secondary/25 transition-all duration-300"
                  >
                    <Plus className="w-5 h-5 mr-2" /> Crear un Grupo
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowExplorer(true)}
                    className="w-full h-14 rounded-2xl border-border bg-muted/20 hover:bg-muted/40 font-bold uppercase tracking-wider text-xs transition-all duration-300"
                  >
                    <Compass className="w-5 h-5 mr-2 text-secondary" /> Buscar tu Grupo
                  </Button>
                </div>

                {/* Logout Button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  whileHover={{ opacity: 1 }}
                  className="mt-12 flex justify-center"
                >
                  <button
                    onClick={signOut}
                    type="button"
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors py-2 px-4 rounded-xl hover:bg-destructive/5 border border-transparent hover:border-destructive/10"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="explorer"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full"
              >
                {/* Back Button */}
                <div className="flex items-center gap-3 mb-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowExplorer(false)}
                    className="rounded-xl bg-muted/20 border border-border"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="text-left">
                    <h2 className="text-xl font-black uppercase text-foreground">Buscar Grupo</h2>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Explorar grupos públicos</p>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                  <Input
                    placeholder="Buscar por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 h-14 bg-muted/30 border-border/80 focus:border-secondary rounded-2xl font-medium text-sm"
                    autoFocus
                  />
                </div>

                {/* Search Results */}
                {searchLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 rounded-2xl bg-muted/30 border border-border/10" />
                    ))}
                  </div>
                ) : discoverableGroups.length === 0 ? (
                  <Card className="p-8 text-center bg-card-gradient border-border rounded-2xl">
                    <p className="text-muted-foreground text-sm font-medium">
                      {searchQuery ? "No se encontraron grupos" : "Ingresa un nombre para buscar grupos disponibles"}
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                    {discoverableGroups.map((group) => (
                      <Card
                        key={group.id}
                        className="p-4 bg-muted/10 border-border/50 rounded-2xl hover:border-secondary/30 transition-all cursor-pointer group"
                        onClick={() => navigate(`/unirse/${group.slug}`)}
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 rounded-xl border border-border">
                            <AvatarImage src={group.logo_url || undefined} className="object-cover animate-fade-in" />
                            <AvatarFallback className="bg-secondary/10 text-secondary font-black rounded-xl text-base">
                              {group.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-bold text-foreground truncate group-hover:text-secondary transition-colors">{group.name}</h4>
                            {group.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="rounded-xl bg-secondary/15 text-secondary hover:bg-secondary hover:text-primary font-bold text-xs h-9 px-4 transition-all duration-300"
                          >
                            Unirse
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 pt-20 pb-28 px-4 safe-top safe-bottom w-full bg-background">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Mis Grupos
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            {userGroups.length > 0
              ? `${userGroups.length} grupo${userGroups.length > 1 ? "s" : ""} musical${userGroups.length > 1 ? "es" : ""}`
              : "Aún no perteneces a ningún grupo"}
          </p>
        </motion.div>

        {/* User's Groups List */}
        {userGroups.length > 0 ? (
          <div className="space-y-3 mb-8">
            {userGroups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  onClick={() => handleSelectGroup(group)}
                  className={`relative p-4 cursor-pointer transition-all duration-300 rounded-2xl border group
                    ${activeGroup?.id === group.id
                      ? "border-secondary/50 bg-secondary/5 shadow-lg shadow-secondary/10"
                      : "border-border hover:border-secondary/30 hover:bg-muted/50"
                    }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Logo */}
                    <Avatar className="w-14 h-14 rounded-xl border border-border">
                      <AvatarImage src={group.logo_url || undefined} className="object-cover" />
                      <AvatarFallback className="bg-secondary/10 text-secondary font-black text-lg rounded-xl">
                        {group.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground truncate">{group.name}</h3>
                        {activeGroup?.id === group.id && (
                          <Badge className="bg-secondary/20 text-secondary border-secondary/30 text-[9px] px-1.5 font-black">
                            ACTIVO
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-secondary">
                          {group.memberRole === "admin" ? "Administrador" : group.memberRole}
                        </span>
                        {group.memberRole === "admin" && (
                          <Crown className="w-3 h-3 text-secondary" />
                        )}
                      </div>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {group.description}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-secondary transition-colors flex-shrink-0" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card className="p-12 text-center border-secondary/10 rounded-3xl">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-secondary/10 flex items-center justify-center border border-secondary/20">
                <Music className="w-10 h-10 text-secondary/40" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Comienza tu viaje musical
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
                Crea tu propio grupo musical o busca uno para unirte.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate("/grupos/crear")}
                  className="h-12 px-6 rounded-xl bg-secondary text-primary font-bold"
                >
                  <Plus className="w-4 h-4 mr-2" /> Crear Grupo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowExplorer(true)}
                  className="h-12 px-6 rounded-xl border-border font-bold"
                >
                  <Compass className="w-4 h-4 mr-2" /> Explorar
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Action Buttons */}
        {userGroups.length > 0 && (
          <div className="flex gap-3 mb-8">
            <Button
              onClick={() => navigate("/grupos/crear")}
              className="flex-1 h-12 rounded-xl bg-secondary text-primary font-bold text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Crear Grupo
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowExplorer(!showExplorer)}
              className="flex-1 h-12 rounded-xl border-border font-bold text-sm"
            >
              <Compass className="w-4 h-4 mr-2" />
              {showExplorer ? "Ocultar" : "Explorar Grupos"}
            </Button>
          </div>
        )}

        {/* Explorer Section */}
        <AnimatePresence>
          {showExplorer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mb-6">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  Descubrir Grupos
                </h2>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input
                    placeholder="Buscar por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 h-12 bg-muted/50 border-border rounded-xl"
                  />
                </div>

                {/* Results */}
                {searchLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 rounded-2xl bg-muted" />
                    ))}
                  </div>
                ) : discoverableGroups.length === 0 ? (
                  <Card className="p-8 text-center border-border rounded-2xl">
                    <p className="text-muted-foreground text-sm">
                      {searchQuery ? "No se encontraron grupos" : "No hay grupos disponibles"}
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {discoverableGroups.map((group) => (
                      <Card
                        key={group.id}
                        className="p-4 border-border rounded-2xl hover:border-secondary/30 transition-all cursor-pointer"
                        onClick={() => navigate(`/unirse/${group.slug}`)}
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 rounded-xl border border-border">
                            <AvatarImage src={group.logo_url || undefined} className="object-cover" />
                            <AvatarFallback className="bg-secondary/10 text-secondary font-bold rounded-xl">
                              {group.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-foreground truncate">{group.name}</h4>
                            {group.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="rounded-xl bg-secondary/10 text-secondary hover:bg-secondary/20 border border-secondary/20 font-bold text-xs h-9 px-4"
                          >
                            Unirse
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default Grupos;
