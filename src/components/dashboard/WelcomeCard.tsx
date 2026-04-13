import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const WelcomeCard = () => {
  const today = new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative px-2 py-4 md:py-8 overflow-hidden"
    >
      <div className="relative z-10 flex items-center gap-6">
        {/* Logo Squircle */}
        <motion.div
          className="flex-shrink-0"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <img
            src="/logo.jpg"
            alt="Privilegiados"
            className="w-16 h-16 squircle-sm object-cover shadow-2xl shadow-secondary/10"
            loading="lazy"
          />
        </motion.div>

        {/* Text Area */}
        <div className="min-w-0 flex-1">
          <motion.h1 
            className="text-3xl md:text-5xl font-extralight tracking-elegant text-foreground leading-none"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            PRIVILEGIADOS
          </motion.h1>
          <motion.p 
            className="mt-2 text-[10px] md:text-xs tracking-[0.2em] text-muted-foreground/50 font-medium uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {format(today, "EEEE, d 'de' MMMM", { locale: es })}
          </motion.p>
        </div>
      </div>
      
      {/* Ultra subtle ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/[0.03] rounded-full blur-[100px] pointer-events-none" />
    </motion.div>
  );
};
