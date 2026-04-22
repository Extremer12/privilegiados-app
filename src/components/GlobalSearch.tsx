import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, ListMusic, Users, X, Command, Loader2, ChevronRight } from "lucide-react";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";

export const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setQuery("");
    }
  }, [isOpen]);

  const { data: results, isLoading } = useQuery({
    queryKey: ["global-search", query],
    queryFn: async () => {
      if (query.length < 2) return null;

      const [songs, setlists, profiles] = await Promise.all([
        supabase.from("songs").select("id, title").ilike("title", `%${query}%`).limit(5),
        supabase.from("setlists").select("id, title").ilike("title", `%${query}%`).limit(5),
        supabase.from("profiles").select("id, full_name").ilike("full_name", `%${query}%`).limit(5),
      ]);

      return {
        songs: songs.data || [],
        setlists: setlists.data || [],
        profiles: profiles.data || [],
      };
    },
    enabled: query.length >= 2,
  });

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const hasResults = results && (results.songs.length > 0 || results.setlists.length > 0 || results.profiles.length > 0);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/10 text-muted-foreground hover:text-secondary hover:bg-secondary/20 transition-all border border-white/5"
        title="Buscar (Ctrl+K)"
      >
        <Search className="w-4 h-4" />
        <span className="hidden lg:inline text-xs font-medium">Buscar...</span>
        <div className="hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/30 border border-white/10">
          <Command className="w-2.5 h-2.5" />
          <span className="text-[10px] font-bold">K</span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-2xl bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden shadow-secondary/10"
            >
              <div className="p-4 border-b border-white/5 flex items-center gap-4">
                <Search className="w-5 h-5 text-secondary" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Busca canciones, repertorios o miembros..."
                  className="flex-1 bg-transparent border-none outline-none text-lg text-foreground placeholder:text-muted-foreground"
                />
                {isLoading && <Loader2 className="w-5 h-5 animate-spin text-secondary" />}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
                {!query && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Command className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">Escribe al menos 2 caracteres para buscar</p>
                  </div>
                )}

                {query && !isLoading && !hasResults && (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="text-sm">No se encontraron resultados para "{query}"</p>
                  </div>
                )}

                {results && (
                  <div className="space-y-4 p-2">
                    {results.songs.length > 0 && (
                      <div>
                        <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                          <Music className="w-3 h-3" /> Canciones
                        </h3>
                        {results.songs.map((song) => (
                          <button
                            key={song.id}
                            onClick={() => handleNavigate(`/canciones/${song.id}`)}
                            className="w-full text-left px-3 py-3 rounded-xl hover:bg-secondary/10 group transition-all flex items-center justify-between"
                          >
                            <span className="font-medium group-hover:text-secondary transition-colors">{song.title}</span>
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all text-secondary" />
                          </button>
                        ))}
                      </div>
                    )}

                    {results.setlists.length > 0 && (
                      <div>
                        <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                          <ListMusic className="w-3 h-3" /> Repertorios
                        </h3>
                        {results.setlists.map((setlist) => (
                          <button
                            key={setlist.id}
                            onClick={() => handleNavigate(`/repertorios/${setlist.id}`)}
                            className="w-full text-left px-3 py-3 rounded-xl hover:bg-secondary/10 group transition-all flex items-center justify-between"
                          >
                            <span className="font-medium group-hover:text-secondary transition-colors">{setlist.title}</span>
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all text-secondary" />
                          </button>
                        ))}
                      </div>
                    )}

                    {results.profiles.length > 0 && (
                      <div>
                        <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                          <Users className="w-3 h-3" /> Miembros
                        </h3>
                        {results.profiles.map((profile) => (
                          <button
                            key={profile.id}
                            onClick={() => handleNavigate(`/perfil/${profile.id}`)}
                            className="w-full text-left px-3 py-3 rounded-xl hover:bg-secondary/10 group transition-all flex items-center justify-between"
                          >
                            <span className="font-medium group-hover:text-secondary transition-colors">{profile.full_name}</span>
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all text-secondary" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-[10px] text-muted-foreground font-medium px-6">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1"><span className="px-1 py-0.5 rounded bg-black/40 border border-white/10 text-foreground">↑↓</span> Navegar</span>
                  <span className="flex items-center gap-1"><span className="px-1 py-0.5 rounded bg-black/40 border border-white/10 text-foreground">Enter</span> Abrir</span>
                </div>
                <span className="flex items-center gap-1"><span className="px-1 py-0.5 rounded bg-black/40 border border-white/10 text-foreground">ESC</span> Cerrar</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
