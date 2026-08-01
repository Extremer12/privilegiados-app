import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowLeft, Check, GraduationCap, Sparkles, Mic, Guitar, Piano, Drum, Volume2, SlidersHorizontal } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface TheoryOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onSavePreferences?: (prefs: { instruments: string[]; level: string }) => void;
}

const INSTRUMENT_OPTIONS = [
  { id: "vocal", label: "Canto / Voces", icon: Mic },
  { id: "guitarra", label: "Guitarra", icon: Guitar },
  { id: "bajo", label: "Bajo", icon: Guitar },
  { id: "teclado", label: "Teclado / Piano", icon: Piano },
  { id: "bateria", label: "Batería", icon: Drum },
  { id: "sonido", label: "Sonido / Audio", icon: Volume2 },
];

const LEVEL_OPTIONS = [
  { id: "principiante", label: "🌱 Principiante" },
  { id: "intermedio", label: "⚡ Intermedio" },
  { id: "avanzado", label: "🔥 Avanzado" },
  { id: "todos", label: "✨ Ver Todos" },
];

export function TheoryOnboardingModal({ open, onClose, onSavePreferences }: TheoryOnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>("todos");

  if (!open) return null;

  const slidesCount = 4;

  const toggleInstrument = (id: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    const preferences = {
      instruments: selectedInstruments,
      level: selectedLevel,
    };
    localStorage.setItem("theory_user_preferences", JSON.stringify(preferences));
    localStorage.setItem("has_seen_theory_onboarding", "true");

    if (onSavePreferences) {
      onSavePreferences(preferences);
    }
    onClose();
  };

  const handleNext = () => {
    if (currentSlide < slidesCount - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("has_seen_theory_onboarding", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0e17] text-white flex flex-col justify-between p-5 sm:p-10 overflow-y-auto">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between w-full max-w-xl mx-auto shrink-0">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
          <GraduationCap className="w-3.5 h-3.5" /> Paso {currentSlide + 1} de {slidesCount}
        </div>
        <button
          onClick={handleSkip}
          className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5"
        >
          Omitir
        </button>
      </div>

      {/* Slide Content */}
      <div className="w-full max-w-xl mx-auto flex-1 flex flex-col items-center justify-center my-auto text-center space-y-6 py-4">
        <AnimatePresence mode="wait">
          {currentSlide === 0 && (
            <motion.div
              key="slide-0"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 w-full"
            >
              <div className="w-56 h-56 sm:w-72 sm:h-72 mx-auto flex items-center justify-center">
                <DotLottieReact
                  src="https://lottie.host/3836add6-d3d4-4f7c-93cb-0b015de0658c/FjnT24mbPB.json"
                  loop
                  autoplay
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Bienvenido a la Academia
                </h2>
                <p className="text-purple-300 text-sm sm:text-base font-medium">
                  Un espacio diseñado para hacer crecer el talento musical de tu ministerio.
                </p>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed pt-2">
                  Accede a lecciones organizadas para cantantes, guitarristas, pianistas, bajistas, bateristas y sonidistas.
                </p>
              </div>
            </motion.div>
          )}

          {currentSlide === 1 && (
            <motion.div
              key="slide-1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 w-full"
            >
              <div className="w-56 h-56 sm:w-72 sm:h-72 mx-auto flex items-center justify-center">
                <DotLottieReact
                  src="https://lottie.host/7f17a5d9-4126-4ee3-94ad-75a369ba29ad/MhAZCGLgtm.json"
                  loop
                  autoplay
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Instrumentos y Canto
                </h2>
                <p className="text-purple-300 text-sm sm:text-base font-medium">
                  Filtra por tu instrumento o nivel de experiencia.
                </p>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed pt-2">
                  Encuentra explicaciones claras para principiantes, intermedios y avanzados. ¡Ideal para todas las edades!
                </p>
              </div>
            </motion.div>
          )}

          {currentSlide === 2 && (
            <motion.div
              key="slide-2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 w-full"
            >
              <div className="w-56 h-56 sm:w-72 sm:h-72 mx-auto flex items-center justify-center">
                <DotLottieReact
                  src="https://lottie.host/2b810f3d-bb99-4c04-ae74-8a3a417cccff/fzidDUd1Y7.json"
                  loop
                  autoplay
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  PDFs, Videos y Favoritos
                </h2>
                <p className="text-purple-300 text-sm sm:text-base font-medium">
                  Aprende con videos de YouTube, guías PDF descargables y lecciones escritas.
                </p>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed pt-2">
                  Guarda tus temas favoritos con la estrella ⭐ y marca las lecciones completadas como vistas ✓.
                </p>
              </div>
            </motion.div>
          )}

          {currentSlide === 3 && (
            <motion.div
              key="slide-3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 w-full text-left"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center mx-auto mb-2">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Personaliza tu Experiencia
                </h2>
                <p className="text-xs sm:text-sm text-purple-300">
                  Selecciona lo que deseas aprender para mostrarte solo lo relevante.
                </p>
              </div>

              {/* Instrument Questionnaire */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  1. ¿Qué instrumentos o áreas te interesan?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {INSTRUMENT_OPTIONS.map((inst) => {
                    const Icon = inst.icon;
                    const selected = selectedInstruments.includes(inst.id);
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => toggleInstrument(inst.id)}
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                          selected
                            ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30"
                            : "bg-slate-900/80 border-white/10 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <div className={`p-1.5 rounded-xl ${selected ? "bg-white/20" : "bg-white/5"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="truncate">{inst.label}</span>
                        {selected && <Check className="w-4 h-4 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Level Questionnaire */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  2. ¿En qué nivel te encuentras actualmente?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LEVEL_OPTIONS.map((lvl) => {
                    const selected = selectedLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setSelectedLevel(lvl.id)}
                        className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                          selected
                            ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30"
                            : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation Bar with Dots & Big Touch Button */}
      <div className="w-full max-w-xl mx-auto space-y-6 shrink-0 pt-4">
        {/* Step Dots */}
        <div className="flex items-center justify-center gap-2">
          {[...Array(slidesCount)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-purple-500 shadow-lg shadow-purple-500/50"
                  : "w-2.5 bg-slate-800 hover:bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-4">
          {currentSlide > 0 ? (
            <Button
              variant="ghost"
              onClick={() => setCurrentSlide((prev) => prev - 1)}
              className="h-14 px-5 rounded-2xl border border-white/10 text-slate-300 hover:text-white font-bold text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
            </Button>
          ) : (
            <div />
          )}

          <Button
            onClick={handleNext}
            className="h-14 flex-1 sm:flex-none px-8 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-purple-600/30 ml-auto"
          >
            {currentSlide === slidesCount - 1 ? (
              <span className="flex items-center gap-2">
                Guardar y Entrar <Check className="w-5 h-5" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Siguiente <ChevronRight className="w-5 h-5" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
