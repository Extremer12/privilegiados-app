import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const MembersParticipation = ({ data }: { data: any }) => {
  const members = useMemo(() => {
    const { participants, reports, allSongs = [] } = data;
    const totalCultos = reports.length || 1;
    
    const grouped: Record<string, any> = {};

    // Group by service participation
    participants.forEach((p: any) => {
      const name = p.participant_name.trim();
      if (!grouped[name]) {
        grouped[name] = { count: 0, roles: new Set(), songsAdded: 0 };
      }
      grouped[name].count += 1;
      grouped[name].roles.add(p.role_in_service);
    });

    // Group by songs added
    allSongs.forEach((song: any) => {
      const name = song.creator_profile?.full_name?.trim();
      if (name) {
        if (!grouped[name]) {
          grouped[name] = { count: 0, roles: new Set(), songsAdded: 0 };
        }
        grouped[name].songsAdded += 1;
      }
    });

    const ranked = Object.entries(grouped)
      .map(([name, info]: [string, any]) => ({
        name,
        count: info.count,
        songsAdded: info.songsAdded,
        roles: Array.from(info.roles) as string[],
        percentage: Math.round((info.count / totalCultos) * 100)
      }))
      // Sort primarily by cultos count, secondarily by songs added
      .sort((a, b) => b.count - a.count || b.songsAdded - a.songsAdded);

    return ranked;
  }, [data]);

  return (
    <div className="p-6 rounded-3xl" style={{
      background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
      border: "1px solid hsl(217 33% 25% / 0.5)",
    }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Participación por Miembro</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((member, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            key={member.name}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center font-bold text-secondary border border-secondary/20">
                {member.name.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  {member.name}
                  {i === 0 && <Award className="w-4 h-4 text-amber-400" />}
                </h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {member.roles.map(role => (
                    <Badge key={role} variant="outline" className="text-[10px] bg-black/20 border-white/10">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 text-right">
              {member.songsAdded > 0 && (
                <div className="flex flex-col items-center justify-center">
                  <p className="text-xl font-black text-emerald-400">{member.songsAdded}</p>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-400/70">Canciones</p>
                </div>
              )}
              <div className="flex flex-col items-center justify-center border-l border-white/10 pl-4">
                <p className="text-xl font-black text-white">{member.count}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cultos</p>
              </div>
            </div>
          </motion.div>
        ))}
        {members.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Aún no hay miembros registrados en los cultos finalizados.
          </div>
        )}
      </div>
    </div>
  );
};
