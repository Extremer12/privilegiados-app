import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const MembersParticipation = ({ data }: { data: any }) => {
  const members = useMemo(() => {
    const { allSongs = [] } = data;
    
    const grouped: Record<string, any> = {};

    // Group by songs added
    allSongs.forEach((song: any) => {
      const name = song.creator_profile?.full_name?.trim();
      if (name) {
        if (!grouped[name]) {
          grouped[name] = { songsAdded: 0, avatar: song.creator_profile.avatar_url };
        }
        grouped[name].songsAdded += 1;
      }
    });

    const ranked = Object.entries(grouped)
      .map(([name, info]: [string, any]) => ({
        name,
        songsAdded: info.songsAdded,
        avatar: info.avatar
      }))
      .sort((a, b) => b.songsAdded - a.songsAdded);

    return ranked;
  }, [data]);

  return (
    <div className="p-6 rounded-3xl" style={{
      background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
      border: "1px solid hsl(217 33% 25% / 0.5)",
    }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary/20 rounded-xl">
            <Award className="w-5 h-5 text-secondary" />
          </div>
          <h2 className="text-xl font-bold text-white">Contribución de Canciones</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={member.name}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-secondary/5"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center font-bold text-secondary border border-secondary/20 overflow-hidden shadow-lg">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    member.name.substring(0, 1).toUpperCase()
                  )}
                </div>
                {i < 3 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-black text-primary shadow-lg border border-primary/20">
                    {i + 1}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  {member.name}
                </h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-60">Colaborador</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-3xl font-black text-secondary tracking-tighter">{member.songsAdded}</p>
              <p className="text-[10px] uppercase tracking-tighter text-muted-foreground font-black">Canciones</p>
            </div>
          </motion.div>
        ))}
        {members.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <p className="text-muted-foreground font-medium">Aún no hay registros de canciones agregadas.</p>
          </div>
        )}
      </div>
    </div>
  );
};
