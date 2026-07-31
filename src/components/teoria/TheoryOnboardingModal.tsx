import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowLeft, Check, GraduationCap } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface TheoryOnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export function TheoryOnboardingModal({ open, onClose }: TheoryOnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!open) return null;

  const slides = [
    {
      title: "Bienvenido a la Academia",
      subtitle: "Un espacio diseñado para hacer crecer el talento musical de tu ministerio.",
      badge: "Paso 1 de 3",
      lottieSrc: "https://lottie.host/3836add6-d3d4-4f7c-93cb-0b015de0658c/FjnT24mbPB.json",
      description: "Accede a lecciones organizadas para cantantes, guitarristas, pianistas, bajistas, bateristas y sonidistas."
    },
    {
      title: "Instrumentos y Canto",
      subtitle: "Filtra por tu instrumento o nivel de experiencia.",
      badge: "Paso 2 de 3",
      lottieSrc: "https://lottie.host/7f17a5d9-4126-4ee3-94ad-75a369ba29ad/MhAZCGLgtm.json",
      description: "Encuentra explicaciones claras para principiantes, intermedios y avanzados. ¡Ideal para todas las edades!"
    },
    {
      title: "PDFs, Videos y Favoritos",
      subtitle: "Aprende con videos de YouTube, guías PDF descargables y lecciones escritas.",
      badge: "Paso 3 de 3",
      lottieSrc: "https://lottie.host/2b810f3d-bb99-4c04-ae74-8a3a417cccff/fzidDUd1Y7.json",
      description: "Guarda tus temas favoritos haciendo clic en la estrella ⭐ para repasarlos cuando quieras antes de un ensayo."
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      localStorage.setItem("has_seen_theory_onboarding", "true");
      onClose();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("has_seen_theory_onboarding", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0e17] text-white flex flex-col justify-between p-6 sm:p-10 overflow-hidden">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between w-full max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
          <GraduationCap className="w-3.5 h-3.5" /> {slides[currentSlide].badge}
        </div>
        <button
          onClick={handleSkip}
          className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5"
        >
          Omitir
        </button>
      </div>

      {/* Slide Content with Animation */}
      <div className="w-full max-w-xl mx-auto flex-1 flex flex-col items-center justify-center my-auto text-center space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 w-full"
          >
            {/* DotLottie Animated Center Component */}
            <div className="w-56 h-56 sm:w-72 sm:h-72 mx-auto flex items-center justify-center">
              <DotLottieReact
                src={slides[currentSlide].lottieSrc}
                loop
                autoplay
                className="w-full h-full object-contain"
              />
            </div>

            {/* Text Explanations */}
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {slides[currentSlide].title}
              </h2>
              <p className="text-purple-300 text-sm sm:text-base font-medium">
                {slides[currentSlide].subtitle}
              </p>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed pt-2">
                {slides[currentSlide].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation Bar with Dots & Big Touch Button */}
      <div className="w-full max-w-xl mx-auto space-y-6">
        {/* Step Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, index) => (
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
              onClick={() => setCurrentSlide(prev => prev - 1)}
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
            {currentSlide === slides.length - 1 ? (
              <span className="flex items-center gap-2">
                ¡Comenzar a Aprender! <Check className="w-5 h-5" />
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
