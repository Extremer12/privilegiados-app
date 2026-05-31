import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Plus, ListPlus, CalendarPlus, MessageSquarePlus, Radio } from "lucide-react";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Nueva canción",
      icon: Plus,
      path: "/canciones/nueva",
    },
    {
      label: "Nuevo repertorio",
      icon: ListPlus,
      path: "/repertorios",
    },
    {
      label: "Nuevo evento",
      icon: "/eventos", // Handled by onClick custom navigation
      customAction: () => navigate("/eventos"),
      iconComponent: CalendarPlus,
    },
    {
      label: "Nuevo mensaje",
      icon: "/foro",
      customAction: () => navigate("/foro"),
      iconComponent: MessageSquarePlus,
    },
    {
      label: "Ir a En Vivo",
      icon: "/repertorios",
      customAction: () => navigate("/repertorios"),
      iconComponent: Radio,
    },
  ];

  return (
    <div className="space-y-4">
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h3 className="text-base font-black uppercase tracking-wider text-neutral-300">
            Accesos Rápidos
          </h3>
        </div>
      </motion.div>

      {/* Horizontal Flex Container (Scrollable on mobile, beautiful row on desktop) */}
      <div className="flex items-start justify-between gap-4 overflow-x-auto pb-4 scrollbar-hide select-none w-full">
        {actions.map((action, index) => {
          const Icon = action.iconComponent || action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 25 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.customAction || (() => navigate(action.path))}
              className="flex flex-col items-center gap-2 flex-shrink-0 w-[84px] text-center group cursor-pointer"
              type="button"
            >
              {/* Glass Circle Button */}
              <div className="relative w-14 h-14 rounded-full bg-[#070c1b]/60 backdrop-blur-xl border border-white/5 flex items-center justify-center transition-all duration-300 group-hover:border-secondary/40 shadow-lg group-hover:shadow-secondary/15 group-active:scale-95">
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-full bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                
                {/* Icon */}
                <Icon className="w-5.5 h-5.5 text-secondary group-hover:scale-110 transition-transform duration-300" />
              </div>

              {/* Label */}
              <span className="text-[10px] font-bold text-neutral-400 group-hover:text-white transition-colors tracking-wide leading-tight px-1 max-w-[80px]">
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
