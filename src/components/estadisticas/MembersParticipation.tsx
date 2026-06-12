import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Award, Music, Percent, Trophy, Crown, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const RANK_META = [
  { icon: Crown, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  { icon: Trophy, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" },
  { icon: Star,   color: "text-amber-700", bg: "bg-amber-700/10", border: "border-amber-700/20" },
];

export const MembersParticipation = ({ data }: { data: any }) => {
  const members = useMemo(() => {
    const { allSongs = [], participants = [], reports = [] } = data;
    const totalServices = reports.length;

    const grouped: Record<string, any> = {};

    // Process registered participants only
    participants.forEach((p: any) => {
      if (p.user_id && p.profiles) {
        const name = p.profiles.full_name;
        if (!name) return;
        if (!grouped[name]) {
          grouped[name] = {
            name,
            services: 0,
            songsAdded: 0,
            avatar: p.profiles?.avatar_url,
            roles: new Set<string>(),
          };
        }
        grouped[name].services += 1;
        if (p.role_in_service) grouped[name].roles.add(p.role_in_service);
      }
    });

    // Process songs added by registered members
    allSongs.forEach((song: any) => {
      const name = song.creator_profile?.full_name;
      if (name && grouped[name]) {
        grouped[name].songsAdded += 1;
      }
    });

    return Object.values(grouped)
      .map((info: any) => ({
        ...info,
        consistency: totalServices > 0 ? Math.round((info.services / totalServices) * 100) : 0,
        roles: Array.from(info.roles).slice(0, 2) as string[],
      }))
      .sort((a, b) => b.services - a.services || b.songsAdded - a.songsAdded);
  }, [data]);

  const top3 = members.slice(0, 3);
  const rest = members.slice(3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-secondary/10 rounded-2xl">
          <Award className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <h2 className="text-xl font-black text-foreground">Rendimiento de Miembros</h2>
          <p className="text-xs text-muted-foreground font-semibold">
            {members.length} {members.length === 1 ? "miembro activo" : "miembros activos"} · {data.reports.length} servicios totales
          </p>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-3xl border border-dashed border-border bg-card text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-semibold">Sin datos de participación aún.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Los miembros aparecerán aquí una vez que participen en cultos.</p>
        </div>
      ) : (
        <>
          {/* ── Podium Top 3 ── */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {top3.map((member, i) => {
                const rank = RANK_META[i] || RANK_META[2];
                const RankIcon = rank.icon;
                return (
                  <motion.div
                    key={member.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 260, damping: 24 }}
                    className={`relative overflow-hidden p-6 rounded-3xl border ${rank.border} bg-card shadow-md group hover:-translate-y-1 hover:shadow-xl transition-all duration-300`}
                  >
                    {/* Glow bg */}
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${rank.bg}`} />

                    <div className="relative z-10">
                      {/* Rank badge */}
                      <div className={`flex items-center gap-1.5 mb-4 self-start`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${rank.bg}`}>
                          <RankIcon className={`w-4 h-4 ${rank.color}`} />
                        </div>
                        <span className={`text-xs font-black ${rank.color}`}>#{i + 1}</span>
                      </div>

                      {/* Avatar */}
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className={`w-12 h-12 border-2 ${rank.border} shrink-0`}>
                          <AvatarImage src={member.avatar || undefined} className="object-cover" />
                          <AvatarFallback className="bg-secondary/20 text-secondary font-black text-sm">
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="font-black text-foreground text-base leading-tight truncate" title={member.name}>
                            {member.name.split(" ")[0]}
                          </h3>
                          <p className="text-xs text-muted-foreground font-semibold truncate" title={member.name}>
                            {member.name.split(" ").slice(1).join(" ")}
                          </p>
                        </div>
                      </div>

                      {/* Roles */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {member.roles.length > 0 ? member.roles.map((role: string) => (
                          <Badge key={role} variant="outline" className="text-[9px] uppercase tracking-wider bg-muted border-border text-muted-foreground px-1.5 py-0">
                            {role}
                          </Badge>
                        )) : (
                          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">Miembro</span>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted/50 rounded-xl py-2">
                          <p className="text-lg font-black text-foreground leading-none">{member.services}</p>
                          <p className="text-[8px] text-muted-foreground font-black uppercase tracking-wider mt-0.5">Cultos</p>
                        </div>
                        <div className="bg-muted/50 rounded-xl py-2">
                          <p className="text-lg font-black text-foreground leading-none">{member.consistency}%</p>
                          <p className="text-[8px] text-muted-foreground font-black uppercase tracking-wider mt-0.5">Consist.</p>
                        </div>
                        <div className="bg-muted/50 rounded-xl py-2">
                          <p className="text-lg font-black text-foreground leading-none">{member.songsAdded}</p>
                          <p className="text-[8px] text-muted-foreground font-black uppercase tracking-wider mt-0.5">Canciones</p>
                        </div>
                      </div>

                      {/* Consistency bar */}
                      <div className="mt-3 h-1 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${member.consistency}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                          className="h-full bg-gradient-to-r from-secondary to-amber-400 rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ── Rest of Members (compact list) ── */}
          {rest.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4" /> Otros Miembros
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rest.map((member, i) => (
                  <motion.div
                    key={member.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:bg-muted/30 transition-all group"
                  >
                    {/* Position */}
                    <div className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground shrink-0">
                      {i + 4}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-10 h-10 border border-border shrink-0">
                      <AvatarImage src={member.avatar || undefined} className="object-cover" />
                      <AvatarFallback className="bg-secondary/15 text-secondary font-black text-xs">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name + roles */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-sm truncate" title={member.name}>
                        {member.name}
                      </h4>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {member.roles.length > 0 ? member.roles.map((role: string) => (
                          <span key={role} className="text-[9px] text-muted-foreground/70 font-bold uppercase">{role}</span>
                        )) : (
                          <span className="text-[9px] text-muted-foreground/50 font-bold uppercase">Miembro</span>
                        )}
                      </div>
                    </div>

                    {/* Consistency */}
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-foreground leading-none">{member.consistency}%</p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase">asist.</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Legend ── */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-border/50">
            {[
              { icon: Users, label: "Cultos = participaciones en servicios", color: "text-secondary" },
              { icon: Percent, label: "Consistencia = asistencias / total cultos", color: "text-blue-400" },
              { icon: Music, label: "Canciones = canciones agregadas al sistema", color: "text-purple-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="text-[10px] text-muted-foreground font-semibold">{item.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
