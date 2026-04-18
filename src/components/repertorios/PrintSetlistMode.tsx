import { useState, useRef } from "react";
import { Printer, X, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Setlist, SetlistSong } from "./types";
import { SectionConfig } from "./ServiceStructureView";

interface PrintSetlistModeProps {
  setlist: Setlist;
  sections: SectionConfig[];
  songsBySection: Record<string, SetlistSong[]>;
  onClose: () => void;
}

export const PrintSetlistMode = ({ setlist, sections, songsBySection, onClose }: PrintSetlistModeProps) => {
  const [columns, setColumns] = useState<1 | 2>(1);

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm print:bg-white print:items-start"
    >
      {/* Floating Toolbar (Hidden when printing) */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl flex items-center gap-6 print:hidden"
      >
        <div className="flex items-center gap-3 border-r border-white/10 pr-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setColumns(1)}
            className={`rounded-xl transition-all ${columns === 1 ? 'bg-secondary text-primary-foreground' : 'text-white/70 hover:bg-white/10'}`}
          >
            <LayoutTemplate className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setColumns(2)}
            className={`rounded-xl transition-all ${columns === 2 ? 'bg-secondary text-primary-foreground' : 'text-white/70 hover:bg-white/10'}`}
          >
            <div className="flex gap-0.5">
              <div className="w-2 h-4 border border-current rounded-sm" />
              <div className="w-2 h-4 border border-current rounded-sm" />
            </div>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={onClose}
            variant="ghost"
            className="rounded-xl text-white/70 hover:text-white hover:bg-white/10 font-medium tracking-wide"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handlePrint}
            className="rounded-xl bg-secondary text-primary-foreground hover:bg-secondary/90 font-bold tracking-wider uppercase px-8 shadow-lg shadow-secondary/20"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Estructura
          </Button>
        </div>
      </motion.div>

      {/* Printable Area */}
      <div className="bg-white text-black w-full h-full md:w-[800px] md:h-[90vh] md:rounded-2xl overflow-y-auto md:shadow-2xl print:w-full print:h-auto print:overflow-visible print:shadow-none print:rounded-none">
        <div className="p-12 md:p-16 max-w-4xl mx-auto">
          
          {/* Document Header */}
          <div className="border-b-2 border-black pb-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-black tracking-tight uppercase leading-none mb-2">
                  {setlist.title}
                </h1>
                <p className="text-sm font-bold tracking-widest uppercase text-gray-500">
                  {format(new Date(setlist.service_date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
              
              <div className="text-right">
                <img src="/logo.jpg" alt="Logo" className="h-12 object-contain ml-auto grayscale opacity-80" />
                <p className="text-[10px] uppercase tracking-widest font-bold mt-2 text-gray-400">
                  Privilegiados App
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4">
              {setlist.service_director && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block mb-1">Director</span>
                  <span className="text-sm font-bold">{setlist.service_director}</span>
                </div>
              )}
              {setlist.preacher && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block mb-1">Palabra</span>
                  <span className="text-sm font-bold">{setlist.preacher}</span>
                </div>
              )}
            </div>

            {setlist.theme_verse && (
              <div className="mt-6 bg-gray-50 p-4 border-l-4 border-black">
                <p className="text-sm font-medium italic text-gray-700">
                  "{setlist.theme_verse}"
                </p>
              </div>
            )}
          </div>

          {/* Service Sections */}
          <div className={`grid gap-x-12 gap-y-8 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {sections.map((section, idx) => {
              const songs = songsBySection[section.id] || [];
              if (songs.length === 0 && section.id !== 'palabra' && section.id !== 'cierre' && section.id !== 'ofrenda') {
                return null;
              }

              return (
                <div key={section.id} className="break-inside-avoid">
                  <div className="flex items-center gap-3 border-b border-gray-200 pb-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <h2 className="text-lg font-black uppercase tracking-widest">
                      {section.name}
                    </h2>
                  </div>
                  
                  {songs.length > 0 ? (
                    <div className="space-y-4 pl-9">
                      {songs.map((song, songIdx) => (
                        <div key={song.id} className="relative">
                          <span className="absolute -left-6 top-1 text-[10px] font-bold text-gray-400">
                            {songIdx + 1}.
                          </span>
                          <p className="text-sm font-bold leading-tight">
                            {song.songs?.title || 'Sin título'}
                          </p>
                          {(song.special_instructions || song.notes || song.assigned_to) && (
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                              {song.assigned_to && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-black bg-gray-100 px-2 py-0.5 rounded-sm">
                                  {song.assigned_to}
                                </span>
                              )}
                              {(song.special_instructions || song.notes) && (
                                <span className="text-[10px] italic text-gray-600">
                                  {song.special_instructions || song.notes}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pl-9 pb-4">
                      <div className="w-full border-b border-dashed border-gray-300 mt-6"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
        </div>
      </div>
    </motion.div>
  );
};
