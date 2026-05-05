import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Star, Users, ChevronDown, ChevronUp, Clock, FileText, Music, Trash2, MessageSquare } from "lucide-react";
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
  const { role } = useUserRole();
  const queryClient = useQueryClient();
  const isAuthorized = ["admin", "lider", "pastor", "moderador"].includes(role || "");

  const { reports, songsPlayed, participants, feedback } = data;

  const deleteMutation = useMutation({
    mutationFn: async (setlistId: string) => {
      const { error } = await supabase
        .from('setlists')
        .delete()
        .eq('id', setlistId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("Culto eliminado permanentemente");
      queryClient.invalidateQueries({ queryKey: ["service_stats"] });
    },
    onError: (error) => {
      console.error("Error deleting setlist:", error);
      toast.error("Error al eliminar el culto");
    }
  });

  const toggleExpand = (id: string) => {
    if (expandedId === id) setExpandedId(null);
    else setExpandedId(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="p-2 bg-blue-500/20 rounded-xl">
          <CalendarDays className="w-5 h-5 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Historial de Servicios</h2>
      </div>

      {reports.map((report: any, i: number) => {
        const isExpanded = expandedId === report.id;
        const reportSongs = songsPlayed.filter((s: any) => s.service_report_id === report.id);
        const reportParts = participants.filter((p: any) => p.service_report_id === report.id);
        const reportFeedback = feedback.filter((f: any) => f.service_id === report.setlist_id);
        
        const avgRating = reportFeedback.length > 0 
          ? reportFeedback.reduce((a: number, b: any) => a + b.rating, 0) / reportFeedback.length
          : null;

        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={report.id}
            className="rounded-2xl overflow-hidden border border-white/10 transition-colors bg-white/5 hover:bg-white/[0.07]"
          >
            {/* Header / Summary */}
            <div 
              onClick={() => toggleExpand(report.id)}
              className="p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground font-medium uppercase leading-none mb-1">
                    {format(new Date(report.service_date), "MMM", { locale: es })}
                  </span>
                  <span className="text-lg font-black text-white leading-none">
                    {format(new Date(report.service_date), "dd")}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">
                    {format(new Date(report.service_date), "EEEE", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {report.duration_minutes || '?'} min</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {report.attendance_count || '?'} asis.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                {avgRating ? (
                  <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 text-amber-400 font-bold text-sm">
                    {avgRating.toFixed(1)} <Star className="w-4 h-4 fill-amber-400" />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin valorar</span>
                )}
                
                <div className="flex items-center gap-2">
                  {isAuthorized && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl border-white/10 bg-neutral-900">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">¿Estás completamente seguro?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            Esta acción eliminará permanentemente este culto del historial y todas sus estadísticas asociadas. No se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl border-white/10 text-white hover:bg-white/5">Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteMutation.mutate(report.setlist_id)}
                            className="rounded-xl bg-red-500 hover:bg-red-600 text-white border-none"
                          >
                            Eliminar definitivamente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <div className="text-muted-foreground bg-white/5 p-2 rounded-lg">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5 bg-black/20"
                >
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Songs */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-white/80 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Music className="w-4 h-4" /> Repertorio Tocado ({reportSongs.length})
                      </h4>
                      <div className="space-y-2">
                        {reportSongs.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between bg-white/5 p-2 rounded-lg text-sm">
                            <span className="text-white truncate pr-2">{s.songs?.title || "Desconocida"}</span>
                            {s.was_improvised && (
                              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20 shrink-0">
                                Improv.
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Column: Participants & Notes */}
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-white/80 flex items-center gap-2 text-sm uppercase tracking-wider">
                          <Users className="w-4 h-4" /> Participantes ({reportParts.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {reportParts.map((p: any) => (
                            <Badge key={p.id} variant="secondary" className="bg-white/10 text-white border-white/5">
                              {p.participant_name} <span className="opacity-50 ml-1">({p.role_in_service})</span>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {report.notes && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-white/80 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <FileText className="w-4 h-4" /> Observaciones del Líder
                          </h4>
                          <p className="text-sm text-muted-foreground bg-white/5 p-3 rounded-xl italic">
                            "{report.notes}"
                          </p>
                        </div>
                      )}

                      {/* Participant Feedback Section */}
                      {reportFeedback.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <h4 className="font-semibold text-secondary flex items-center gap-2 text-sm uppercase tracking-wider">
                            <MessageSquare className="w-4 h-4" /> Opiniones del Equipo
                          </h4>
                          <div className="space-y-2">
                            {reportFeedback.map((f: any) => (
                              <div key={f.id} className="bg-white/5 border border-white/5 p-3 rounded-2xl">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-white/70">{f.profiles?.full_name || "Miembro"}</span>
                                  <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`w-2.5 h-2.5 ${i < f.rating ? 'fill-secondary text-secondary' : 'text-white/10'}`} />
                                    ))}
                                  </div>
                                </div>
                                {f.comment && (
                                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                                    "{f.comment}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
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

      {reports.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hay cultos finalizados para mostrar.
        </div>
      )}
    </div>
  );
};
