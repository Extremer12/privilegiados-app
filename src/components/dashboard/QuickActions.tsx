import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Music, Users, MessageCircle, CalendarDays, ListMusic, 
  ChevronRight, TrendingUp, Zap 
} from "lucide-react";

interface QuickActionsProps {
  stats: {
    totalSongs: number;
    totalMembers: number;
    totalPosts: number;
  };
}

export const QuickActions = ({ stats }: QuickActionsProps) => {
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: Music,
      title: "Canciones",
      description: `${stats.totalSongs} canciones en el repertorio`,
      path: "/canciones",
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/20 to-cyan-500/20",
      badge: stats.totalSongs > 0 ? `${stats.totalSongs}` : null,
    },
    {
      icon: ListMusic,
      title: "Repertorios",
      description: "Gestiona los cultos y servicios",
      path: "/repertorios",
      gradient: "from-pink-500 to-rose-500",
      bgGradient: "from-pink-500/20 to-rose-500/20",
      badge: "Nuevo",
      badgeVariant: "destructive" as const,
    },
    {
      icon: CalendarDays,
      title: "Eventos",
      description: "Calendario del grupo",
      path: "/eventos",
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-500/20 to-emerald-500/20",
    },
    {
      icon: MessageCircle,
      title: "Foro",
      description: `${stats.totalPosts} publicaciones`,
      path: "/foro",
      gradient: "from-purple-500 to-violet-500",
      bgGradient: "from-purple-500/20 to-violet-500/20",
      badge: stats.totalPosts > 0 ? `${stats.totalPosts}` : null,
    },
    {
      icon: Users,
      title: "Miembros",
      description: `${stats.totalMembers} músicos en el grupo`,
      path: "/miembros",
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-500/20 to-orange-500/20",
      badge: stats.totalMembers > 0 ? `${stats.totalMembers}` : null,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className="space-y-4">
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center shadow-lg"
          whileHover={{ rotate: 5, scale: 1.1 }}
        >
          <TrendingUp className="w-5 h-5 text-secondary" />
        </motion.div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Accesos Rápidos</h3>
          <p className="text-xs text-muted-foreground">Navega rápidamente a cada sección</p>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {quickActions.map((action, index) => (
          <motion.div
            key={action.path}
            variants={itemVariants}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              variant="action"
              className="relative p-4 cursor-pointer group overflow-hidden"
              onClick={() => navigate(action.path)}
            >
              {/* Hover Gradient Effect */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-r ${action.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              {/* Animated Line */}
              <motion.div
                className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${action.gradient}`}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              />

              <div className="relative z-10 flex items-center gap-4">
                {/* Icon Container */}
                <motion.div
                  className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${action.bgGradient} flex items-center justify-center flex-shrink-0 overflow-hidden`}
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Icon Glow */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-30 transition-opacity duration-300`}
                  />
                  <action.icon className="w-7 h-7 text-foreground" />
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-base font-bold text-foreground group-hover:text-secondary transition-colors">
                      {action.title}
                    </h4>
                    {action.badge && (
                      <Badge
                        variant={action.badgeVariant || "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>

                {/* Arrow */}
                <motion.div
                  className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center"
                  whileHover={{ x: 5, backgroundColor: "rgba(255, 215, 0, 0.2)" }}
                >
                  <ChevronRight className="w-5 h-5 text-secondary" />
                </motion.div>
              </div>

              {/* Shine Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6 }}
              />
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
