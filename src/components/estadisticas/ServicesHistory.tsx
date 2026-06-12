import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Star, Users, ChevronDown, Clock,
  Music, Trash2, MessageSquare, FileText, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const ServicesHistory = ({ data }: { data: any }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { isLeader: isAuthorized } = useUserRole();
  const queryClient = useQueryClient();

  const { reports, songsPlayed, participants, feedback } = data;

  const deleteMutation = useMutation({
    mutationFn: async (setlistId: string) => {
      const { error } = await supabase.from("setlists").delete().eq("id", setlistId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("Culto eliminado permanentemente");
      queryClient.invalidateQueries({ queryKey: ["service_stats"] });
    },
    onError: () => toast.error("Error al eliminar el culto"),
  });

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-500/10 rounded-2xl">
          <CalendarDays className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-foreground">Historial de Servicios</h2>
          <p className="text-xs text-muted-foreground font-semibold">
            {reports.length} {reports.length === 1 ? "culto registrado" : "cultos registrados"} en total
          </p>
        </div>
      </div>

      {/* Service Cards */}
      <div className="space-y-3">
        {reports.map((report: any, i: number) => {
          const isExpanded = expandedId === report.id;
          const reportSongs = songsPlayed.filter((s: any) => s.service_report_id === report.id);
          const reportParts = participants.filter((p: any) => p.service_report_id === report.id);
          const reportFeedback = feedback.filter((f: any) => f.service_id === report.setlist_id);

          const avgRating =
            reportFeedback.length > 0
              ? reportFeedback.reduce((a: number, b: any) => a + b.rating, 0) / reportFeedback.length
              : null;

          const dayNum = format(new Date(report.service_date), "dd");
          const monthStr = format(new Date(report.service_date), "MMM", { locale: es }).toUpperCase();
          const dayName = format(new Date(report.service_date), "EEEE", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());

          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 26 }}
              className="rounded-3xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow"
            >
              {/* ── Card Header (always visible) ── */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleExpand(report.id)}
                onKeyDown={(e) => e.key === "Enter" && toggleExpand(report.id)}
                className="p-5 cursor-pointer flex items-center gap-4 hover:bg-muted/30 transition-colors"
              >
                {/* Date badge */}
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 border border-secondary/20 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] text-secondary font-black uppercase leading-none mb-0.5">{monthStr}</span>
                  <span className="text-xl font-black text-foreground leading-none">{dayNum}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-foreground text-base leading-tight">{dayName}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground font-semibold">
                    {report.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {report.duration_minutes} min
                      </span>
                    )}
                    {report.attendance_count && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {report.attendance_count} asistentes
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Music className="w-3 h-3" />
                      {reportSongs.length} canciones
                    </span>
                  </div>
                </div>

                {/* Right: rating + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {avgRating ? (
                    <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-amber-400 font-black text-xs">{avgRating.toFixed(1)}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider hidden sm:block">Sin rating</span>
                  )}

                  {isAuthorized && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-xl text-muted-foreground/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl border-border bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">¿Eliminar este culto?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            Esta acción eliminará el culto del historial y todas sus estadísticas. No se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl border-border text-foreground hover:bg-muted">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(report.setlist_id)}
                            className="rounded-xl bg-red-500 hover:bg-red-600 text-white border-none"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  <div
                    className={`p-2 rounded-xl bg-muted/60 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* ── Expanded Content ── */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-border/60 overflow-hidden"
                  >
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20">
                      {/* Songs */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <Music className="w-3.5 h-3.5" /> Repertorio ({reportSongs.length})
                        </h4>
                        {reportSongs.length > 0 ? (
                          <div className="space-y-1.5">
                            {reportSongs.map((s: any, idx: number) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between bg-card border border-border/70 px-3 py-2 rounded-xl text-sm"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-[10px] font-black text-muted-foreground/60 w-4 shrink-0">{idx + 1}</span>
                                  <span className="text-foreground font-semibold truncate">{s.songs?.title || "Desconocida"}</span>
                                </div>
                                {s.was_improvised && (
                                  <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-400 border-purple-500/20 shrink-0 ml-2">
                                    Improv.
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Sin canciones registradas.</p>
                        )}
                      </div>

                      <div className="space-y-5">
                        {/* Feedback */}
                        {reportFeedback.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                              <MessageSquare className="w-3.5 h-3.5" /> Opiniones ({reportFeedback.length})
                            </h4>
                            <div className="space-y-2">
                              {reportFeedback.map((f: any) => (
                                <div key={f.id} className="bg-card border border-border/70 p-3 rounded-2xl">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-secondary/15 flex items-center justify-center text-[10px] font-black text-secondary">
                                        {f.profiles?.full_name?.charAt(0) || "?"}
                                      </div>
                                      <span className="text-xs font-bold text-foreground">{f.profiles?.full_name || "Miembro"}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-2.5 h-2.5 ${i < f.rating ? "fill-secondary text-secondary" : "text-border"}`} />
                                      ))}
                                    </div>
                                  </div>
                                  {f.comment && (
                                    <p className="text-[11px] text-muted-foreground italic leading-relaxed pl-8">
                                      "{f.comment}"
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Participants */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" /> Participantes ({reportParts.length})
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {reportParts.map((p: any) => (
                              <div
                                key={p.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/70 text-xs"
                              >
                                <span className="font-semibold text-foreground truncate max-w-[100px]">{p.participant_name}</span>
                                {p.role_in_service && (
                                  <span className="text-muted-foreground/60 text-[9px] font-bold uppercase">({p.role_in_service})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Notes */}
                        {report.notes && (
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5" /> Observaciones
                            </h4>
                            <p className="text-xs text-muted-foreground bg-muted/50 border border-border/70 p-3 rounded-xl italic leading-relaxed">
                              "{report.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-3xl border border-dashed border-border">
          <Sparkles className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-semibold">No hay cultos finalizados para mostrar.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Los cultos aparecerán aquí cuando sean finalizados en "En Vivo".</p>
        </div>
      )}
    </div>
  );
};
