import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, ChevronRight, Crown, Verified, Activity } from "lucide-react";

interface ProfileCardProps {
  profile: {
    full_name: string;
    avatar_url: string | null;
    role: string | null;
    bio?: string | null;
  } | null;
  email?: string;
}

export const ProfileCard = ({ profile, email }: ProfileCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
    >
      <Card
        className="relative p-6 cursor-pointer group squircle border-white/[0.04] bg-gradient-to-br from-white/[0.03] to-transparent hover:bg-white/[0.05] transition-all duration-500 overflow-hidden shadow-2xl shadow-black/20"
        onClick={() => navigate("/perfil")}
      >
        <div className="relative z-10 flex items-center gap-6">
          {/* Avatar Area */}
          <div className="relative">
            <Avatar className="w-20 h-20 squircle-sm border-2 border-white/5 relative z-10 ring-4 ring-secondary/5">
              <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-secondary/10 text-secondary font-light text-3xl squircle-sm">
                {profile?.full_name?.charAt(0) || email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Minimal Online Dot */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1a1f2c] z-20 shadow-lg shadow-green-500/20" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-light tracking-tight text-foreground truncate">
                {profile?.full_name || "Músico"}
              </h2>
            </div>

            <p className="text-[10px] tracking-widest text-secondary/70 font-medium uppercase mb-2">
              {profile?.role || "Miembro del grupo"}
            </p>

            {profile?.bio && (
              <p className="text-sm text-muted-foreground/60 font-light italic truncate">
                {profile.bio}
              </p>
            )}
          </div>

          <motion.div
            className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/[0.05]"
            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.06)" }}
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground/40" />
          </motion.div>
        </div>

        {/* Subtle decorative element - non-generic soft glow */}
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-secondary/[0.02] rounded-full blur-3xl pointer-events-none" />
      </Card>
    </motion.div>
  );
};
