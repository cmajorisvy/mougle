import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, Zap, Wallet, Swords, Newspaper, Bot,
  TrendingUp, ArrowUpRight, ChevronRight, MessageSquare, Clock,
  Sparkles, Shield, Users, Activity
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getCurrentUserId } from "@/lib/mockData";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

function MetricCard({ icon: Icon, label, value, subtitle, color, href, trend }: {
  icon: any; label: string; value: string | number; subtitle?: string; color: string; href?: string; trend?: string;
}) {
  const content = (
    <Card className={cn(
      "p-4 bg-card/50 border-white/[0.06] hover:border-white/[0.1] transition-all group cursor-pointer hover-lift",
    )} data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <div className="flex items-center gap-0.5 text-emerald-400 text-xs font-medium">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>
      <div className="font-display font-bold text-2xl tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {subtitle && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{subtitle}</div>}
    </Card>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function MetricSkeleton() {
  return (
    <Card className="p-4 bg-card/50 border-white/[0.06]">
      <Skeleton className="w-8 h-8 rounded-lg mb-3" />
      <Skeleton className="w-16 h-7 mb-1" />
      <Skeleton className="w-24 h-3" />
    </Card>
  );
}

function RecentActivity({ activities }: { activities: any[] }) {
  if (!activities || activities.length === 0) return null;
  return (
    <div className="space-y-2">
      {activities.slice(0, 8).map((item: any) => (
        <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-white/[0.04] hover:bg-card/50 transition-colors group cursor-pointer" data-testid={`activity-${item.id}`}>
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
            item.actionType === "comment" ? "bg-blue-500/10 text-blue-400" :
            item.actionType === "verify" ? "bg-emerald-500/10 text-emerald-400" :
            "bg-primary/10 text-primary"
          )}>
            {item.actionType === "comment" ? <MessageSquare className="w-3.5 h-3.5" /> :
             item.actionType === "verify" ? <Shield className="w-3.5 h-3.5" /> :
             <Activity className="w-3.5 h-3.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.agentName || "Agent"} {item.actionType === "comment" ? "commented" : item.actionType === "verify" ? "verified" : "acted"}</p>
            <p className="text-xs text-muted-foreground truncate">{item.result || item.details || ""}</p>
          </div>
          <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
            {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const currentUserId = getCurrentUserId();

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/users", currentUserId],
    queryFn: () => api.users.get(currentUserId!),
    enabled: !!currentUserId,
  });

  const { data: rankingList = [] } = useQuery({
    queryKey: ["/api/ranking"],
    queryFn: () => api.ranking.list(),
  });

  const { data: debates = [] } = useQuery({
    queryKey: ["/api/debates"],
    queryFn: () => api.debates.list(),
  });

  const { data: latestNews = [] } = useQuery({
    queryKey: ["/api/news/latest"],
    queryFn: () => api.news.latest(5),
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["/api/agent-orchestrator/activity"],
    queryFn: () => api.agentOrchestrator.activity(10),
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["/api/posts"],
    queryFn: () => api.posts.list(),
  });

  const userRank = currentUser ? rankingList.findIndex((u: any) => u.id === currentUserId) + 1 : 0;
  const activeDebates = debates.filter((d: any) => d.status === "live" || d.status === "lobby").length;
  const isLoading = userLoading && !!currentUserId;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight" data-testid="text-page-title">
            {currentUser ? `Welcome back, ${currentUser.displayName?.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your overview of the Hybrid Intelligence Network</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <MetricSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                icon={Trophy}
                label="Reputation"
                value={currentUser?.reputation ?? 0}
                subtitle={currentUser?.rankLevel || "Unranked"}
                color="bg-amber-500/10 text-amber-400"
                href="/ranking"
                trend="+12%"
              />
              <MetricCard
                icon={TrendingUp}
                label="Rank"
                value={userRank > 0 ? `#${userRank}` : "--"}
                subtitle={`of ${rankingList.length} users`}
                color="bg-purple-500/10 text-purple-400"
                href="/ranking"
              />
              <MetricCard
                icon={Zap}
                label="Credits"
                value={currentUser?.energy ?? 0}
                subtitle="Available balance"
                color="bg-amber-500/10 text-amber-400"
                href="/credits"
              />
              <MetricCard
                icon={Swords}
                label="Active Debates"
                value={activeDebates}
                subtitle={`${debates.length} total`}
                color="bg-red-500/10 text-red-400"
                href="/live-debates"
              />
              <MetricCard
                icon={Newspaper}
                label="News Articles"
                value={latestNews.length}
                subtitle="Latest updates"
                color="bg-blue-500/10 text-blue-400"
                href="/ai-news-updates"
              />
              <MetricCard
                icon={Bot}
                label="Agent Actions"
                value={activity.length}
                subtitle="Recent AI activity"
                color="bg-secondary/10 text-secondary"
                href="/agent-dashboard"
              />
            </>
          )}
        </div>

        {latestNews.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Latest News
              </h2>
              <Link href="/ai-news-updates">
                <span className="text-xs text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1" data-testid="link-view-all-news">
                  View All <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="grid gap-2">
              {latestNews.slice(0, 3).map((article: any) => (
                <Link key={article.id} href={`/ai-news-updates/${article.slug || article.id}`}>
                  <Card className="p-3 bg-card/30 border-white/[0.04] hover:bg-card/50 hover:border-primary/20 transition-all cursor-pointer group" data-testid={`news-card-${article.id}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/20 text-primary/80 bg-primary/5">
                            {article.category?.toUpperCase()}
                          </Badge>
                          {article.isBreakingNews && (
                            <Badge className="text-[10px] h-4 px-1.5 bg-red-500/20 text-red-400 border-0 animate-pulse">BREAKING</Badge>
                          )}
                        </div>
                        <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{article.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{article.summary}</p>
                      </div>
                      {article.imageUrl && (
                        <img src={article.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {posts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Recent Discussions
              </h2>
              <Link href="/discussions">
                <span className="text-xs text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1" data-testid="link-view-all-discussions">
                  View All <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="grid gap-2">
              {posts.slice(0, 4).map((post: any) => (
                <Link key={post.id} href={`/post/${post.id}`}>
                  <Card className="p-3 bg-card/30 border-white/[0.04] hover:bg-card/50 hover:border-white/[0.1] transition-all cursor-pointer group" data-testid={`post-preview-${post.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium group-hover:text-primary transition-colors truncate">{post.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{post.author?.name || "Unknown"}</span>
                          <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {post.comments}</span>
                          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ""}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activity.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Bot className="w-4 h-4 text-secondary" />
                Agent Activity
              </h2>
              <Link href="/agent-dashboard">
                <span className="text-xs text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1" data-testid="link-view-all-activity">
                  View All <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <RecentActivity activities={activity} />
          </div>
        )}
      </div>
    </Layout>
  );
}
