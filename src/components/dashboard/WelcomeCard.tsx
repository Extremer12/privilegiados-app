import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Sparkles, Calendar, Star } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const WelcomeCard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card variant="premium" className="relative p-6 md:p-8 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 rounded-full blur-2xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {/* Floating Stars */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                top: `${20 + i * 15}%`,
                right: `${10 + i * 8}%`,
              }}
              animate={{
                y: [0, -10, 0],
                opacity: [0.3, 0.7, 0.3],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            >
              <Star className="w-3 h-3 text-secondary/40" fill="currentColor" />
            </motion.div>
          ))}
        </div>

        <div className="relative z-10">
          <motion.div
            className="flex items-center gap-3 mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center shadow-lg shadow-secondary/20"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              >
                <Sparkles className="w-6 h-6 text-secondary" />
              </motion.div>
            </motion.div>
            <motion.span
              className="text-sm font-bold text-secondary tracking-widest uppercase"
              animate={{
                textShadow: ["0 0 0px #FFD700", "0 0 10px #FFD700", "0 0 0px #FFD700"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              Bienvenido
            </motion.span>
          </motion.div>

          <motion.h1
            className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-secondary/80 bg-clip-text text-transparent mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Privilegiados App
          </motion.h1>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20"
              whileHover={{ scale: 1.02 }}
            >
              <Calendar className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-muted-foreground capitalize">
                {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </span>
            </motion.div>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
};
