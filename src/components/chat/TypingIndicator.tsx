import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface TypingIndicatorProps {
  typingUsers: Set<string>;
  profiles: Record<string, Profile>;
}

export const TypingIndicator = ({ typingUsers, profiles }: TypingIndicatorProps) => {
  if (typingUsers.size === 0) return null;

  const typingUsersList = Array.from(typingUsers).slice(0, 3);
  const names = typingUsersList.map((id) => profiles[id]?.full_name?.split(" ")[0] || "Alguien");

  const getText = () => {
    if (names.length === 1) return `${names[0]} está escribiendo`;
    if (names.length === 2) return `${names.join(" y ")} están escribiendo`;
    return `${names.slice(0, 2).join(", ")} y otros están escribiendo`;
  };

  return (
    <div className="flex items-center gap-3 mb-4 animate-fade-in px-2">
      <div className="flex -space-x-2">
        {typingUsersList.map((userId) => {
          const profile = profiles[userId];
          return (
            <Avatar key={userId} className="w-7 h-7 ring-2 ring-background">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-secondary/20 text-secondary text-xs">
                {profile?.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>

      <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm rounded-full px-4 py-2 border border-border/30">
        <span className="text-xs text-muted-foreground">{getText()}</span>
        <div className="flex gap-1">
          <span
            className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
};
