import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const MembersParticipation = ({ data }: { data: any }) => {
  const members = useMemo(() => {
    const { allSongs = [], participants = [], reports = [] } = data;
    const totalServices = reports.length;
    
    const grouped: Record<string, any> = {};

    // 1. Process Participation (Services)
    participants.forEach((p: any) => {
      const name = p.profiles?.full_name || p.participant_name;
      if (name) {
        if (!grouped[name]) {
          grouped[name] = { 
            name,
            services: 0, 
            songsAdded: 0, 
            avatar: p.profiles?.avatar_url,
            roles: new Set()
          };
        }
        grouped[name].services += 1;
        if (p.role_in_service) grouped[name].roles.add(p.role_in_service);
      }
    });

    // 2. Process Songs Added
    allSongs.forEach((song: any) => {
      const name = song.creator_profile?.full_name;
      if (name && grouped[name]) {
        grouped[name].songsAdded += 1;
      }
    });

    const ranked = Object.values(grouped)
      .map((info: any) => ({
        ...info,
        consistency: totalServices > 0 ? Math.round((info.services / totalServices) * 100) : 0,
        roles: Array.from(info.roles).slice(0, 2)
      }))
      .sort((a, b) => b.services - a.services || b.songsAdded - a.songsAdded);

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
          <h2 className="text-xl font-bold text-white">Rendimiento de Miembros</h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total: {data.reports.length} servicios registrados</p>
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
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center font-bold text-secondary border border-secondary/20 overflow-hidden shadow-lg">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">{member.name.substring(0, 1).toUpperCase()}</span>
                  )}
                </div>
                {i < 3 && (
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[12px] font-black text-primary shadow-lg border-2 border-[#131722]">
                    {i + 1}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white text-lg truncate pr-2">
                  {member.name}
                </h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {member.roles.length > 0 ? member.roles.map((role: string) => (
                    <Badge key={role} variant="outline" className="bg-white/5 border-white/10 text-[9px] uppercase px-1.5 py-0">
                      {role}
                    </Badge>
                  )) : (
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">Miembro</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right shrink-0">
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-white tracking-tighter leading-none">{member.consistency}%</span>
                <span className="text-[9px] uppercase tracking-tighter text-muted-foreground font-black mt-1">Consistencia</span>
                <div className="mt-2 h-1 w-16 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${member.consistency}%` }}
                    className="h-full bg-secondary shadow-[0_0_8px_rgba(251,191,36,0.5)]" 
                  />
                </div>
              </div>
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
