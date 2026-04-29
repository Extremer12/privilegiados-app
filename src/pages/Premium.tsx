import { motion } from "framer-motion";
import { 
  Diamond, 
  Crown, 
  Music, 
  Mic2, 
  Headphones, 
  FileText, 
  ShieldCheck, 
  Star,
  Zap,
  Lock
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Premium = () => {
  const resources = [
    {
      title: "Guías de Alabanza",
      description: "Estrategias para liderar el tiempo de adoración con excelencia.",
      icon: Crown,
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    {
      title: "Técnicas Vocales",
      description: "Ejercicios de calentamiento y técnicas de respiración profesional.",
      icon: Mic2,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Teoría Musical",
      description: "Conceptos avanzados de armonía y ritmo para músicos.",
      icon: Music,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
    {
      title: "Recursos Multi-track",
      description: "Pistas aisladas para práctica individual y grupal.",
      icon: Headphones,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
    {
      title: "Partituras Exclusivas",
      description: "Arreglos originales para piano, guitarra y vientos.",
      icon: FileText,
      color: "text-rose-500",
      bg: "bg-rose-500/10"
    },
    {
      title: "Masterclasses",
      description: "Vídeos exclusivos con músicos invitados y pastores.",
      icon: Star,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10"
    }
  ];

  return (
    <main className="flex-1 pt-20 pb-20 px-4 w-full bg-gradient-to-b from-background to-background/50">
      <div className="max-w-6xl mx-auto">
        {/* Header - Premium Minimalist */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 mb-4"
          >
            <Diamond className="w-3 h-3 text-secondary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Recursos Premium</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight"
          >
            Nivel <span className="text-secondary">Elite</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-base max-w-2xl mx-auto"
          >
            Contenido exclusivo diseñado para llevar tu ministerio musical al siguiente nivel de excelencia y profesionalismo.
          </motion.p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res, index) => (
            <motion.div
              key={res.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
            >
              <Card className="group relative p-8 bg-white/[0.01] border-white/5 hover:bg-white/[0.03] hover:border-secondary/30 transition-all duration-500 rounded-3xl overflow-hidden cursor-pointer h-full">
                <div className={`absolute top-0 right-0 w-32 h-32 ${res.bg} blur-3xl opacity-0 group-hover:opacity-40 transition-opacity`} />
                
                <div className={`w-12 h-12 ${res.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                  <res.icon className={`w-6 h-6 ${res.color}`} />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-secondary transition-colors">
                  {res.title}
                </h3>
                
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  {res.description}
                </p>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 text-white/40 hover:text-secondary transition-colors gap-2 font-bold uppercase tracking-widest text-[10px]"
                >
                  <Lock className="w-3 h-3" />
                  Acceso Restringido
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Professional Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 p-8 rounded-[2.5rem] bg-gradient-to-r from-secondary/20 via-secondary/10 to-transparent border border-secondary/20 relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-white mb-2">¿Buscas algo específico?</h2>
              <p className="text-muted-foreground text-sm max-w-md">
                Si necesitas recursos para un instrumento específico o guías para tu equipo de alabanza, contáctanos.
              </p>
            </div>
            <Button variant="hero" className="rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-xs shadow-lg shadow-secondary/20">
              Solicitar Contenido
            </Button>
          </div>
          <Zap className="absolute right-10 top-1/2 -translate-y-1/2 w-48 h-48 text-secondary/5 -mr-16 pointer-events-none" />
        </motion.div>
      </div>
    </main>
  );
};

export default Premium;
