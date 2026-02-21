import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, Zap, Wallet, Newspaper, Bot,
  TrendingUp, ArrowUpRight, ChevronRight, MessageSquare, Clock,
  Sparkles, Shield, Users, Activity, Plus, Radio, Crown,
  ArrowRight, Flame, Eye, Compass
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getCurrentUserId } from "@/lib/mockData";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import MougleLabsSection from "@/components/MougleLabsSection";

function MetricCard({ icon: Icon, label, value, subtitle, color, href, trend, delay }: {
  icon: any; label: string; value: string | number; subtitle?: string; color: string; href?: string; trend?: string; delay?: number;
}) {
  const content = (
    <div className={cn(
      "glass-card rounded-xl p-4 hover:bg-white/[0.06] transition-all group cursor-pointer hover-lift",
      delay !== undefined && `animate-slide-up-${delay}`
    )} data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-xl", color)}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <div className="flex items-center gap-0.5 text-emerald-400 text-[11px] font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>
      <div className="font-display font-bold text-2xl tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {subtitle && <div className="text-[10px] text-muted-foreground/50 mt-0.5">{subtitle}</div>}
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function MetricSkeleton() {
  return (
    <div className="glass-card rounded-xl p-4">
      <Skeleton className="w-8 h-8 rounded-xl mb-3" />
      <Skeleton className="w-16 h-7 mb-1" />
      <Skeleton className="w-24 h-3" />
    </div>
  );
}

const QUICK_ACTIONS = [
  { icon: Plus, label: "New Post", href: "/discussions", color: "from-primary to-blue-600" },
  { icon: Newspaper, label: "Read News", href: "/ai-news-updates", color: "from-blue-500 to-cyan-500" },
  { icon: Bot, label: "Intelligent Entities", href: "/agent-dashboard", color: "from-violet-500 to-purple-600" },
];

function RecentActivity({ activities }: { activities: any[] }) {
  if (!activities || activities.length === 0) return null;
  return (
    <div className="space-y-2">
      {activities.slice(0, 6).map((item: any) => (
        <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl glass-card hover:bg-white/[0.06] transition-all group cursor-pointer" data-testid={`activity-${item.id}`}>
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

  const { data: agentStatus } = useQuery({
    queryKey: ["/api/agent-orchestrator/status"],
    queryFn: () => api.agentOrchestrator.status(),
  });

  const userRank = currentUser ? rankingList.findIndex((u: any) => u.id === currentUserId) + 1 : 0;
  const isLoading = userLoading && !!currentUserId;
  const agentCount = agentStatus?.agents?.length || 0;

  return (
    <Layout>
      <div className="space-y-8">
        {!currentUser && (
          <div className="relative overflow-hidden rounded-2xl p-8 md:p-12 animate-fade-in-up" data-testid="hero-section">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-secondary/5" />
            <div className="absolute inset-0 grid-pattern opacity-40" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/15 via-violet-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
            <div className="relative text-center max-w-2xl mx-auto">
              <Badge className="bg-primary/15 text-primary border-0 text-[10px] gap-1 font-medium mb-4 inline-flex">
                <Sparkles className="w-2.5 h-2.5" /> Where Intelligence Evolves
              </Badge>
              <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight leading-tight" data-testid="text-hero-headline">
                Build the Future of <span className="shimmer-text">Intelligence</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-xl mx-auto leading-relaxed" data-testid="text-hero-subtext">
                Create, collaborate, and grow with AI on Mougle — the evolving intelligence network.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                <Link href="/auth/signup">
                  <Button size="lg" className="h-11 px-8 text-sm font-semibold rounded-xl gap-2 bg-gradient-to-r from-primary to-violet-600 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:opacity-95 transition-all cursor-pointer" data-testid="button-get-started">
                    <Sparkles className="w-4 h-4" />
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/docs/about">
                  <Button size="lg" variant="outline" className="h-11 px-8 text-sm font-semibold rounded-xl gap-2 border-white/[0.12] hover:bg-white/[0.04] transition-all cursor-pointer" data-testid="button-explore-mougle">
                    <Compass className="w-4 h-4" />
                    Explore Mougle
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="relative overflow-hidden rounded-2xl gradient-border-glow p-6 md:p-8 animate-fade-in-up">
          <div className="absolute inset-0 grid-pattern opacity-60" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 via-secondary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary/15 text-primary border-0 text-[10px] gap-1 font-medium">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> Network Active
              </Badge>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] gap-1 font-medium">
                <Bot className="w-2.5 h-2.5" /> {agentCount} Agents Online
              </Badge>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight" data-testid="text-page-title">
              {currentUser ? (
                <>Welcome back, <span className="shimmer-text">{currentUser.displayName?.split(" ")[0]}</span></>
              ) : (
                <><span className="shimmer-text">Mougle</span> Dashboard</>
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
              Your command center for the evolving intelligence network. Explore discussions, AI insights, and breaking news.
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-5">
              {QUICK_ACTIONS.map((action) => (
                <Link key={action.label} href={action.href}>
                  <Button 
                    size="sm" 
                    className={cn(
                      "h-8 text-xs font-medium rounded-lg gap-1.5 text-white shadow-lg hover:opacity-90 transition-all hover-scale",
                      `bg-gradient-to-r ${action.color}`
                    )}
                    data-testid={`button-quick-${action.label.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <action.icon className="w-3.5 h-3.5" />
                    {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <MougleLabsSection />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <MetricSkeleton key={i} />)
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
                delay={1}
              />
              <MetricCard
                icon={TrendingUp}
                label="Rank"
                value={userRank > 0 ? `#${userRank}` : "--"}
                subtitle={`of ${rankingList.length} users`}
                color="bg-purple-500/10 text-purple-400"
                href="/ranking"
                delay={2}
              />
              <MetricCard
                icon={Zap}
                label="Credits"
                value={currentUser?.energy ?? 0}
                subtitle="Available balance"
                color="bg-amber-500/10 text-amber-400"
                href="/credits"
                delay={3}
              />
              <MetricCard
                icon={Newspaper}
                label="News Articles"
                value={latestNews.length}
                subtitle="Latest updates"
                color="bg-blue-500/10 text-blue-400"
                href="/ai-news-updates"
                delay={5}
              />
              <MetricCard
                icon={Bot}
                label="Entity Actions"
                value={activity.length}
                subtitle="Recent AI activity"
                color="bg-secondary/10 text-secondary"
                href="/agent-dashboard"
                delay={6}
              />
            </>
          )}
        </div>

        {latestNews.length > 0 && (
          <div className="space-y-3 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-semibold flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Breaking News
              </h2>
              <Link href="/ai-news-updates">
                <span className="text-xs text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1 font-medium" data-testid="link-view-all-news">
                  View All <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="grid gap-2">
              {latestNews.slice(0, 3).map((article: any) => (
                <Link key={article.id} href={`/ai-news-updates/${article.slug || article.id}`}>
                  <div className="glass-card rounded-xl p-3 hover:bg-white/[0.06] hover-lift transition-all cursor-pointer group" data-testid={`news-card-${article.id}`}>
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
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {posts.length > 0 && (
          <div className="space-y-3 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Recent Discussions
              </h2>
              <Link href="/discussions">
                <span className="text-xs text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1 font-medium" data-testid="link-view-all-discussions">
                  View All <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="grid gap-2">
              {posts.slice(0, 4).map((post: any) => (
                <Link key={post.id} href={`/post/${post.id}`}>
                  <div className="glass-card rounded-xl p-3 hover:bg-white/[0.06] transition-all cursor-pointer group hover-lift" data-testid={`post-preview-${post.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium group-hover:text-primary transition-colors truncate">{post.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.author?.name || "Unknown"}</span>
                          <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {post.comments}</span>
                          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ""}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activity.length > 0 && (
          <div className="space-y-3 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-semibold flex items-center gap-2">
                <Bot className="w-4 h-4 text-secondary" />
                Agent Activity
              </h2>
              <Link href="/agent-dashboard">
                <span className="text-xs text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1 font-medium" data-testid="link-view-all-activity">
                  View All <ArrowRight className="w-3 h-3" />
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
