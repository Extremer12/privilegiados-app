import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const WelcomeCard = () => {
  const { user } = useAuth();
  const today = new Date();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const getFirstName = (fullName?: string | null) => {
    if (!fullName) return "Miembro";
    return fullName.split(" ")[0];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative px-4 py-6 md:py-8 overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-white/[0.01] to-white/[0.03] border border-white/[0.03] mb-4"
    >
      <div className="relative z-10 flex items-center justify-between gap-6">
        {/* Left Side: Brand Logo and Personal Greeting */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Circular Logo with Crown Glow */}
          <motion.div
            className="flex-shrink-0 relative hidden sm:block"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="absolute inset-0 bg-secondary/20 rounded-full blur-md" />
            <img
              src="/logo.jpg"
              alt="Privilegiados Logo"
              className="w-14 h-14 object-cover relative z-10 rounded-full border border-secondary/20"
              loading="lazy"
            />
          </motion.div>

          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              ¡Hola, {getFirstName(profile?.full_name)}! 👋
            </h1>
            <p className="mt-1 text-[11px] md:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Privilegiados &bull; Grupo de Alabanza
            </p>
          </div>
        </div>

        {/* Right Side: Interactive Profile Avatar and Date Indicator */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-black block">HOY</span>
            <span className="text-sm font-bold text-secondary font-mono">
              {format(today, "d 'de' MMMM", { locale: es })}
            </span>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex-shrink-0"
          >
            <div className="absolute inset-0 bg-secondary/15 rounded-full blur-sm" />
            <Avatar className="w-12 h-12 border-2 border-secondary/35 relative z-10">
              <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-secondary/20 text-secondary font-black text-sm uppercase">
                {profile?.full_name?.charAt(0) || "P"}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        </div>
      </div>
      
      {/* Subtle background ambient glows */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-secondary/[0.04] rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-secondary/[0.02] rounded-full blur-3xl pointer-events-none" />
    </motion.div>
  );
};
