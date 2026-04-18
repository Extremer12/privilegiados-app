import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Printer, X, Music } from "lucide-react";

interface PrintPreviewDialogProps {
  title: string;
  category: string;
  content: string | null;
  trigger?: React.ReactNode;
}

export const PrintPreviewDialog = ({ title, category, content, trigger }: PrintPreviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [layout, setLayout] = useState("1");
  const [align, setAlign] = useState("left");

  // Force re-render preview when settings change
  const handlePrint = () => {
    window.print();
  };

  // We split the content into columns if the user chooses 2 columns
  // Note: CSS multi-column layout handles text flow beautifully automatically!
  // We'll just use the CSS column-count property.

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex-1">
            <Printer className="w-4 h-4 mr-2" aria-hidden="true" />
            Imprimir
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col overflow-hidden p-0 gap-0 bg-background/95 backdrop-blur-md">
        <DialogHeader className="px-6 py-4 border-b border-border/50 bg-background">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Vista Previa de Impresión
            </span>
            <Button onClick={handlePrint} variant="hero" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Ahora
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Settings Sidebar */}
          <div className="w-full md:w-64 border-r border-border/50 bg-background/50 p-6 flex flex-col gap-6 overflow-y-auto">
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
                  <SelectItem value="sans-serif">Sans Serif (Moderna)</SelectItem>
                  <SelectItem value="serif">Serif (Clásica)</SelectItem>
                  <SelectItem value="monospace">Monospace (Acordes Alineados)</SelectItem>
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
                  <SelectItem value="center">Centrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Columnas</Label>
              <Select value={layout} onValueChange={setLayout}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Columna (Normal)</SelectItem>
                  <SelectItem value="2">2 Columnas (Ahorrar hojas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mt-auto p-4 bg-secondary/10 rounded-lg text-xs text-muted-foreground">
              Asegúrate de desactivar los márgenes de impresión y activar los gráficos de fondo en las opciones de impresión de tu navegador para que el diseño salga perfecto.
            </div>
          </div>

          {/* Preview Area (Simulated Paper) */}
          <div className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-8 flex justify-center">
            <div 
              className="bg-white shadow-xl w-full max-w-[21cm] min-h-[29.7cm] p-[1.5cm] text-black"
              style={{
                fontFamily: fontFamily === 'sans-serif' ? 'Inter, sans-serif' : fontFamily === 'serif' ? 'Georgia, serif' : 'Courier New, monospace'
              }}
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

        {/* HIDDEN PRINT SECTION. This is the only thing that gets printed. */}
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
      </DialogContent>
    </Dialog>
  );
};
