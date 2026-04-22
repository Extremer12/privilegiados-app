import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Printer, X, Music, Settings2, Eye, EyeOff, Type, AlignLeft, Columns, ALargeSmall } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PrintPreviewModeProps {
  title: string;
  author?: string | null;
  category: string;
  content: string | null;
  onClose: () => void;
}

export const PrintPreviewMode = ({ title, author, category, content, onClose }: PrintPreviewModeProps) => {
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [layout, setLayout] = useState("1");
  const [align, setAlign] = useState("left");
  const [showControls, setShowControls] = useState(true);

  // Add fullscreen class to hide main app header
  useEffect(() => {
    document.body.classList.add('fullscreen-mode');
    return () => document.body.classList.remove('fullscreen-mode');
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900 overflow-hidden">
      
      {/* Floating Action Buttons when controls are hidden */}
      {!showControls && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
          <Button 
            size="icon" 
            variant="destructive"
            onClick={onClose} 
            className="rounded-full shadow-2xl h-12 w-12"
            title="Cerrar vista previa"
          >
            <X className="w-5 h-5" />
          </Button>
          <Button 
            size="icon" 
            onClick={() => setShowControls(true)} 
            className="rounded-full shadow-2xl h-14 w-14 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            title="Mostrar controles"
          >
            <Settings2 className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Workspace Area - This contains the 'Paper' */}
      <div 
        className="flex-1 overflow-y-auto bg-neutral-900 pb-[300px]"
        onClick={() => {
          if (showControls) setShowControls(false);
        }}
      >
        <div className="min-h-full py-8 px-4 flex justify-center items-start">
          <div 
            className="bg-white shadow-2xl w-full max-w-[21cm] min-h-[29.7cm] h-max p-[1.5cm] text-black transition-all duration-300 relative"
            style={{
              fontFamily: fontFamily === 'sans-serif' ? 'Inter, sans-serif' : fontFamily === 'serif' ? 'Georgia, serif' : 'Courier New, monospace'
            }}
            onClick={(e) => e.stopPropagation()} // Prevent clicks on the paper from hiding controls
          >
            <div className="border-b-2 border-black/10 pb-6 mb-8 text-center">
              <div className="flex justify-center items-center gap-2 mb-4 opacity-60">
                <img src="/logo.jpg" alt="Privilegiados" className="w-5 h-5 rounded object-cover grayscale" />
                <span className="font-bold text-[10px] tracking-[0.2em] uppercase text-gray-500">Privilegiados App</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-black m-0 p-0 leading-tight tracking-tight mb-4">
                {title}
              </h1>
              <div className="flex justify-center items-center gap-3">
                {author && (
                  <span className="text-gray-700 font-semibold text-lg">{author}</span>
                )}
                {author && <span className="text-gray-300">&bull;</span>}
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {category}
                </span>
              </div>
            </div>

            <div 
              className="whitespace-pre-wrap leading-relaxed"
              style={{ 
                fontSize: `${fontSize}px`,
                textAlign: align as any,
                columnCount: layout === '2' ? 2 : 1,
                columnGap: '2rem'
              }}
            >
              {content || "No hay contenido para imprimir."}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Controls (Glassmorphism Toolbar) */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: 100, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: 100, x: "-50%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 z-40 w-[95vw] max-w-4xl"
          >
            <div className="bg-neutral-950/70 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 md:gap-8 overflow-hidden">
              
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-6">
                <Button variant="hero" onClick={handlePrint} className="w-full md:w-auto shadow-lg shadow-secondary/20 h-12 px-6 rounded-xl">
                  <Printer className="w-5 h-5 mr-2" />
                  Imprimir
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" size="icon" onClick={() => setShowControls(false)} title="Ocultar controles" className="h-12 w-12 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5">
                    <EyeOff className="w-5 h-5" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={onClose} title="Cerrar" className="h-12 w-12 rounded-xl border border-red-500/20">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 md:gap-6 flex-1 w-full overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {/* Size */}
                <div className="flex flex-col gap-2 min-w-[140px] flex-1">
                  <Label className="text-xs text-neutral-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                    <ALargeSmall className="w-3 h-3 text-secondary" /> Tamaño ({fontSize}px)
                  </Label>
                  <Slider
                    value={[fontSize]}
                    min={10}
                    max={36}
                    step={1}
                    onValueChange={(vals) => setFontSize(vals[0])}
                    className="py-2"
                  />
                </div>

                {/* Font */}
                <div className="flex flex-col gap-2 min-w-[130px]">
                  <Label className="text-xs text-neutral-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                    <Type className="w-3 h-3 text-secondary" /> Fuente
                  </Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="h-10 bg-black/40 border-white/10 text-sm rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sans-serif">Moderna</SelectItem>
                      <SelectItem value="serif">Clásica</SelectItem>
                      <SelectItem value="monospace">Acordes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Alignment */}
                <div className="flex flex-col gap-2 min-w-[130px]">
                  <Label className="text-xs text-neutral-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                    <AlignLeft className="w-3 h-3 text-secondary" /> Alineación
                  </Label>
                  <Select value={align} onValueChange={setAlign}>
                    <SelectTrigger className="h-10 bg-black/40 border-white/10 text-sm rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Izquierda</SelectItem>
                      <SelectItem value="center">Centrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Layout */}
                <div className="flex flex-col gap-2 min-w-[130px]">
                  <Label className="text-xs text-neutral-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                    <Columns className="w-3 h-3 text-secondary" /> Columnas
                  </Label>
                  <Select value={layout} onValueChange={setLayout}>
                    <SelectTrigger className="h-10 bg-black/40 border-white/10 text-sm rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Columna</SelectItem>
                      <SelectItem value="2">2 Columnas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HIDDEN PRINT SECTION — Portaled to body so `body > * { display: none }` does not affect it */}
      {createPortal(
        <div id="print-section" className="hidden print:block bg-white text-black p-0 m-0"
             style={{
                fontFamily: fontFamily === 'sans-serif' ? 'Inter, sans-serif' : fontFamily === 'serif' ? 'Georgia, serif' : 'Courier New, monospace'
              }}>
          <div className="border-b-2 border-black/10 pb-6 mb-8 text-center" style={{ breakInside: 'avoid' }}>
            <div className="flex justify-center items-center gap-2 mb-4 opacity-60">
              <img src="/logo.jpg" alt="Privilegiados" className="w-5 h-5 rounded object-cover grayscale" />
              <span className="font-bold text-[10px] tracking-[0.2em] uppercase text-gray-500">Privilegiados App</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-black m-0 p-0 leading-tight tracking-tight mb-4">
              {title}
            </h1>
            <div className="flex justify-center items-center gap-3">
              {author && (
                <span className="text-gray-700 font-semibold text-lg">{author}</span>
              )}
              {author && <span className="text-gray-300">&bull;</span>}
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {category}
              </span>
            </div>
          </div>

          <div 
            className="whitespace-pre-wrap leading-relaxed"
            style={{ 
              fontSize: `${fontSize}px`,
              textAlign: align as any,
              columnCount: layout === '2' ? 2 : 1,
              columnGap: '3rem'
            }}
          >
            {content || "No hay contenido para imprimir."}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
