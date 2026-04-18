import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Printer, X, Music, Settings2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PrintPreviewModeProps {
  title: string;
  category: string;
  content: string | null;
  onClose: () => void;
}

export const PrintPreviewMode = ({ title, category, content, onClose }: PrintPreviewModeProps) => {
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [layout, setLayout] = useState("1");
  const [align, setAlign] = useState("left");
  const [showControls, setShowControls] = useState(true);

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
            <div className="flex justify-between items-start border-b border-gray-300 pb-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-black m-0 p-0 leading-tight">{title}</h1>
                <span className="text-gray-500 uppercase text-xs tracking-widest font-bold">{category}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Music className="w-5 h-5" />
                <span className="font-bold text-sm tracking-widest">PRIVILEGIADOS</span>
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

      {/* Floating Bottom Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="max-w-5xl mx-auto p-4 md:p-6">
              
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                  <Settings2 className="w-5 h-5 text-secondary" />
                  Configuración de Impresión
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setShowControls(false)} title="Ocultar controles">
                    <EyeOff className="w-4 h-4 mr-2" />
                    Ocultar
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    <X className="w-4 h-4 mr-2" />
                    Cerrar
                  </Button>
                  <Button variant="hero" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Ahora
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-3">
                  <Label>Tamaño de Letra ({fontSize}px)</Label>
                  <Slider
                    value={[fontSize]}
                    min={10}
                    max={36}
                    step={1}
                    onValueChange={(vals) => setFontSize(vals[0])}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Fuente</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sans-serif">Sans Serif</SelectItem>
                      <SelectItem value="serif">Serif (Clásica)</SelectItem>
                      <SelectItem value="monospace">Monospace (Acordes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Alineación</Label>
                  <Select value={align} onValueChange={setAlign}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Izquierda</SelectItem>
                      <SelectItem value="center">Centrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Diseño</Label>
                  <Select value={layout} onValueChange={setLayout}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Columna</SelectItem>
                      <SelectItem value="2">2 Columnas (Ahorrar hojas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-muted-foreground text-center">
                Nota: Activa "Gráficos de fondo" y desactiva los márgenes en las opciones de impresión de tu navegador.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HIDDEN PRINT SECTION. This is the only thing that gets printed because of index.css rules. */}
      <div id="print-section" className="hidden print:block bg-white text-black p-0 m-0"
           style={{
              fontFamily: fontFamily === 'sans-serif' ? 'Inter, sans-serif' : fontFamily === 'serif' ? 'Georgia, serif' : 'Courier New, monospace'
            }}>
        <div className="flex justify-between items-start border-b border-gray-300 pb-4 mb-6" style={{ breakInside: 'avoid' }}>
          <div>
            <h1 className="text-3xl font-bold text-black m-0 p-0 leading-tight">{title}</h1>
            <span className="text-gray-500 uppercase text-xs tracking-widest font-bold">{category}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Music className="w-5 h-5" />
            <span className="font-bold text-sm tracking-widest">PRIVILEGIADOS</span>
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
  );
};
