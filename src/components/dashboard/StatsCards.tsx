import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Music, Users, CalendarDays, Eye, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StatsCardsProps {
  stats: {
    totalSongs: number;
    totalMembers: number;
    totalSetlists: number;
  };
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  const navigate = useNavigate();

  // Stats data designed to match Screen 2 mockup exactly
  const statsData = [
    {
      value: stats.totalSongs,
      label: "Canciones",
      subLabel: "+8 esta semana",
      trendColor: "text-emerald-400",
      icon: Music,
      path: "/canciones",
      sparklineD: "M0,22 Q15,10 30,18 T60,5 T90,14 T100,2",
    },
    {
      value: stats.totalSetlists,
      label: "Repertorios",
      subLabel: "Próximos",
      trendColor: "text-neutral-400",
      icon: CalendarDays,
      path: "/repertorios",
      sparklineD: "M0,25 Q15,12 30,22 T60,8 T90,5 T100,12",
    },
    {
      value: stats.totalMembers,
      label: "Miembros",
      subLabel: "+2 este mes",
      trendColor: "text-emerald-400",
      icon: Users,
      path: "/miembros",
      sparklineD: "M0,20 Q15,8 30,14 T60,25 T90,6 T100,2",
    },
    {
      value: 1248, // Visual mockup value
      label: "Vistas (7 días)",
      subLabel: "+15%",
      trendColor: "text-emerald-400",
      icon: Eye,
      path: "/estadisticas",
      sparklineD: "M0,24 Q15,18 30,8 T60,20 T90,2 T100,4",
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
    hidden: { opacity: 0, y: 15, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 26 } },
  };

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.label}
          variants={itemVariants}
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.97 }}
        >
          <Card
            variant="stats"
            className="relative p-5 cursor-pointer group overflow-hidden border border-white/[0.04] bg-[#070c1b]/60 backdrop-blur-xl rounded-2xl flex flex-col justify-between min-h-[170px]"
            onClick={() => navigate(stat.path)}
            role="button"
            aria-label={`Ver ${stat.label}`}
          >
            {/* Ambient Background Gradient Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div>
              {/* Header inside card: Icon and Trending/Sublabel */}
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/15">
                  <stat.icon className="w-5 h-5 text-secondary" aria-hidden="true" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider ${stat.trendColor}`}>
                  {stat.subLabel}
                </span>
              </div>

              {/* Stat Value */}
              <div className="text-3xl font-black tracking-tight text-white mb-0.5">
                {stat.value.toLocaleString()}
              </div>

              {/* Label */}
              <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
                {stat.label}
              </div>
            </div>

            {/* Glowing Golden Sparkline SVG Graph */}
            <div className="relative h-9 mt-4 overflow-hidden pointer-events-none">
              <svg className="w-full h-full opacity-80" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path
                  d={stat.sparklineD}
                  fill="none"
                  stroke={`url(#sparkline-grad-${index})`}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id={`sparkline-grad-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#d9a032" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
                    <stop offset="100%" stopColor="#d9a032" stopOpacity="0.6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};
