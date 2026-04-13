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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card
        variant="premium"
        className="relative p-5 cursor-pointer group overflow-hidden"
        onClick={() => navigate("/perfil")}
      >
        {/* Animated Background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-secondary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />

        {/* Glow Effect */}
        <motion.div
          className="absolute -top-20 -right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />

        <div className="relative z-10 flex items-center gap-4">
          {/* Avatar Ring */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-secondary via-amber-400 to-secondary"
              style={{
                padding: "3px",
              }}
            />
            <Avatar className="w-18 h-18 border-4 border-card relative z-10">
              <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-secondary/40 to-secondary/20 text-secondary font-bold text-2xl">
                {profile?.full_name?.charAt(0) || email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Online Indicator */}
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-card z-20"
            >
              <Activity className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <motion.h2
                className="text-xl font-bold text-foreground truncate"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {profile?.full_name || "Músico"}
              </motion.h2>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <Verified className="w-5 h-5 text-blue-400" />
              </motion.div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-secondary/20 to-amber-500/20 text-secondary border-secondary/30 font-medium flex items-center gap-1"
              >
                <Crown className="w-3 h-3" />
                {profile?.role || "Miembro del grupo"}
              </Badge>
            </div>

            {profile?.bio && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Arrow with Animation */}
          <motion.div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center"
            whileHover={{ scale: 1.1, x: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <ChevronRight className="w-6 h-6 text-secondary" />
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
};
