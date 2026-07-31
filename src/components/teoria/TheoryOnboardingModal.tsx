import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowLeft, Check, Sparkles, GraduationCap, PlayCircle, FileText, Music } from "lucide-react";

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
      svg: (
        <svg className="w-48 h-48 sm:w-64 sm:h-64 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="80" fill="url(#gradient1)" fillOpacity="0.15" />
          <motion.circle
            cx="100"
            cy="100"
            r="70"
            stroke="url(#gradient1)"
            strokeWidth="3"
            strokeDasharray="10 6"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          {/* Graduation Cap & Sparkles */}
          <path d="M100 50L150 75L100 100L50 75L100 50Z" fill="url(#gradient1)" />
          <path d="M70 90V120C70 130 130 130 130 120V90" stroke="#A855F7" strokeWidth="4" strokeLinecap="round" />
          <path d="M140 75V115" stroke="#EC4899" strokeWidth="3" strokeLinecap="round" />
          <circle cx="140" cy="120" r="4" fill="#EC4899" />
          
          {/* Animated Music Notes */}
          <motion.path
            d="M60 140Q70 120 80 140T100 140"
            stroke="#3B82F6"
            strokeWidth="3"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <defs>
            <linearGradient id="gradient1" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A855F7" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
      ),
      description: "Accede a lecciones organizadas para cantantes, guitarristas, pianistas, bajistas, bateristas y sonidistas."
    },
    {
      title: "Instrumentos y Canto",
      subtitle: "Filtra por tu instrumento o nivel de experiencia.",
      badge: "Paso 2 de 3",
      svg: (
        <svg className="w-48 h-48 sm:w-64 sm:h-64 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="80" fill="url(#gradient2)" fillOpacity="0.15" />
          {/* Microphone & Guitar Graphic */}
          <rect x="85" y="50" width="30" height="50" rx="15" fill="#3B82F6" />
          <path d="M70 80C70 100 130 100 130 80" stroke="#60A5FA" strokeWidth="4" strokeLinecap="round" />
          <line x1="100" y1="100" x2="100" y2="130" stroke="#60A5FA" strokeWidth="4" />
          <line x1="80" y1="130" x2="120" y2="130" stroke="#60A5FA" strokeWidth="4" strokeLinecap="round" />

          {/* Equalizer Bars */}
          {[40, 60, 140, 160].map((x, i) => (
            <motion.rect
              key={x}
              x={x}
              y="110"
              width="8"
              height="30"
              rx="4"
              fill="#A855F7"
              animate={{ height: [15, 45, 20, 35] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
          <defs>
            <linearGradient id="gradient2" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
      ),
      description: "Encuentra explicaciones claras para principiantes, intermedios y avanzados. ¡Ideal para todas las edades!"
    },
    {
      title: "PDFs, Videos y Favoritos",
      subtitle: "Aprende con videos de YouTube, guías PDF descargables y lecciones escritas.",
      badge: "Paso 3 de 3",
      svg: (
        <svg className="w-48 h-48 sm:w-64 sm:h-64 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="80" fill="url(#gradient3)" fillOpacity="0.15" />
          {/* Document & Video Player Graphic */}
          <rect x="50" y="50" width="100" height="100" rx="16" fill="#1E1B4B" stroke="#8B5CF6" strokeWidth="3" />
          <polygon points="90,85 120,100 90,115" fill="#EF4444" />
          
          <motion.path
            d="M70 70H130"
            stroke="#A855F7"
            strokeWidth="3"
            strokeLinecap="round"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <path d="M70 130H110" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
          <defs>
            <linearGradient id="gradient3" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10B981" />
              <stop offset="1" stopColor="#A855F7" />
            </linearGradient>
          </defs>
        </svg>
      ),
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
            {/* Animated Center SVG */}
            <div className="flex items-center justify-center py-4">
              {slides[currentSlide].svg}
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
