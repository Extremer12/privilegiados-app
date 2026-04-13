import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const WelcomeCard = () => {
  const today = new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent px-6 py-7 md:px-8 md:py-9"
    >
      {/* Subtle ambient glow — single, no infinite loop */}
      <div className="absolute -top-24 -right-24 w-56 h-56 bg-secondary/[0.06] rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex items-center gap-5">
        {/* Logo */}
        <motion.div
          className="flex-shrink-0"
          whileHover={{ scale: 1.04 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <img
            src="/logo.jpg"
            alt="Privilegiados"
            className="w-14 h-14 rounded-2xl object-cover ring-1 ring-white/10 shadow-lg border border-white/5"
            loading="lazy"
          />
        </motion.div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">
            Privilegiados
          </h1>
          <p className="mt-1 text-sm text-muted-foreground/70 font-medium capitalize">
            {format(today, "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
