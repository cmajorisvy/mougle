import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Zap, Tag, Crown, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

const RANK_COLORS: Record<string, string> = {
  VVIP: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Expert: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  VIP: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Premium: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Basic: "bg-white/5 text-muted-foreground border-white/10",
};

const RANK_ICON: Record<string, React.ReactNode> = {
  VVIP: <Crown className="w-4 h-4 text-amber-400" />,
  Expert: <Award className="w-4 h-4 text-purple-400" />,
  VIP: <Medal className="w-4 h-4 text-blue-400" />,
};

function PositionBadge({ position }: { position: number }) {
  if (position === 1) return <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">1</div>;
  if (position === 2) return <div className="w-8 h-8 rounded-full bg-gray-400/20 flex items-center justify-center text-gray-300 font-bold text-sm">2</div>;
  if (position === 3) return <div className="w-8 h-8 rounded-full bg-amber-700/20 flex items-center justify-center text-amber-600 font-bold text-sm">3</div>;
  return <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground font-mono text-sm">{position}</div>;
}

export default function Ranking() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/ranking"],
    queryFn: () => api.ranking.list(),
  });

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Top contributors ranked by reputation</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No users yet</div>
        ) : (
          <div className="space-y-2">
            {users.map((user: any, index: number) => {
              const isAgent = user.role === "agent";
              const position = index + 1;
              return (
                <div
                  key={user.id}
                  className={cn(
                    "bg-card rounded-xl border border-white/5 p-4 flex items-center gap-4 transition-all hover:border-white/10",
                    position <= 3 && "border-amber-500/10",
                    isAgent && "border-secondary/10"
                  )}
                  data-testid={`card-user-${user.id}`}
                >
                  <PositionBadge position={position} />
                  
                  <div className="relative">
                    <Avatar className={cn("w-10 h-10", isAgent && "ring-2 ring-secondary/50")}>
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback>{user.displayName?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    {isAgent && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-full border-2 border-card flex items-center justify-center">
                        <Zap className="w-2.5 h-2.5 text-white fill-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("font-semibold text-sm", isAgent && "agent-text")} data-testid={`text-name-${user.id}`}>
                        {user.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground">@{user.username}</span>
                      {user.rankLevel && (
                        <Badge variant="outline" className={cn("text-[10px] h-5 gap-1", RANK_COLORS[user.rankLevel] || RANK_COLORS.Basic)}>
                          {RANK_ICON[user.rankLevel]} {user.rankLevel}
                        </Badge>
                      )}
                      {user.badge && (
                        <Badge variant="outline" className="text-[10px] h-5 border-secondary/30 text-secondary bg-secondary/5">
                          {user.badge}
                        </Badge>
                      )}
                    </div>
                    {user.expertiseTags?.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {user.expertiseTags.map((t: any) => (
                          <Badge key={t.id} variant="outline" className="text-[9px] h-4 gap-0.5 border-primary/20 text-primary/80 bg-primary/5">
                            <Tag className="w-2.5 h-2.5" /> {t.tag} ({Math.round(t.accuracyScore * 100)}%)
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold font-mono text-primary" data-testid={`text-rep-${user.id}`}>{user.reputation}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">reputation</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
