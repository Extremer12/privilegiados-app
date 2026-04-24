import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Star, Users, ChevronDown, ChevronUp, Clock, FileText, Music } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ServicesHistory = ({ data }: { data: any }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { reports, songsPlayed, participants } = data;

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
        const avgRating = report.service_ratings?.length > 0 
          ? report.service_ratings.reduce((a: number, b: any) => a + b.rating, 0) / report.service_ratings.length
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
                <div className="text-muted-foreground bg-white/5 p-2 rounded-lg">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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
                            <FileText className="w-4 h-4" /> Observaciones
                          </h4>
                          <p className="text-sm text-muted-foreground bg-white/5 p-3 rounded-xl italic">
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

      {reports.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hay cultos finalizados para mostrar.
        </div>
      )}
    </div>
  );
};
