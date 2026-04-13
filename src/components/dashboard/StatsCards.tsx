import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Music, Users, MessageCircle, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StatsCardsProps {
  stats: {
    totalSongs: number;
    totalMembers: number;
    totalPosts: number;
  };
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  const navigate = useNavigate();

  const statsData = [
    {
      value: stats.totalSongs,
      label: "Canciones",
      icon: Music,
      color: "text-blue-400",
      bgColor: "from-blue-500/20 to-blue-600/10",
      path: "/canciones",
    },
    {
      value: stats.totalMembers,
      label: "Miembros",
      icon: Users,
      color: "text-amber-400",
      bgColor: "from-amber-500/20 to-amber-600/10",
      path: "/miembros",
    },
    {
      value: stats.totalPosts,
      label: "Posts",
      icon: MessageCircle,
      color: "text-purple-400",
      bgColor: "from-purple-500/20 to-purple-600/10",
      path: "/foro",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <motion.div
      className="grid grid-cols-3 gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.label}
          variants={itemVariants}
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <Card
            variant="stats"
            className="relative p-4 text-center cursor-pointer group overflow-hidden"
            onClick={() => navigate(stat.path)}
            role="button"
            aria-label={`Ver estadísticas de ${stat.label}`}
          >
            {/* Background Gradient */}
            <motion.div
              className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            />

            {/* Icon */}
            <motion.div
              className="relative z-10 mb-3"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <div
                className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${stat.bgColor} flex items-center justify-center`}
              >
                <stat.icon className={`w-6 h-6 ${stat.color}`} aria-hidden="true" />
              </div>
            </motion.div>

            {/* Value with Counter Animation */}
            <motion.div
              className="relative z-10 text-3xl font-bold text-foreground mb-1"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
            >
              <CountUp value={stat.value} />
            </motion.div>

            {/* Label */}
            <div className="relative z-10 text-xs text-muted-foreground font-medium flex items-center justify-center gap-1">
              {stat.label}
              <TrendingUp className="w-3 h-3 text-green-400" aria-hidden="true" />
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

// Simple counter animation component
const CountUp = ({ value }: { value: number }) => {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {value}
    </motion.span>
  );
};
