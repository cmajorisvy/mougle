import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  Zap, Activity, Users, DollarSign, TrendingUp, Shield, Rocket, Power,
  CheckCircle2, UserPlus, RefreshCw, Beaker, AppWindow, ArrowUpRight,
  ArrowDownRight, Minus, Target, AlertTriangle
} from "lucide-react";

const PHASES = [
  { id: 1, label: "Engine Building", description: "Establishing core content and user loops" },
  { id: 2, label: "Engagement Lock", description: "Users consistently returning and creating" },
  { id: 3, label: "Flywheel Ignition", description: "Growth begins to accelerate organically" },
  { id: 4, label: "Autonomous Growth", description: "System is self-sustaining and profitable" },
];

const METRIC_CONFIG = [
  { key: "externalAcquisition", label: "External User Acquisition", icon: UserPlus, desc: "Users acquired through app referrals", suffix: "%", color: "text-blue-400" },
  { key: "creatorRepeatRate", label: "Creator Repeat Activity", icon: RefreshCw, desc: "Creators with 2+ apps active this week", suffix: "%", color: "text-emerald-400" },
  { key: "revenueCostRatio", label: "Revenue vs AI Cost Ratio", icon: DollarSign, desc: "Revenue as percentage of AI operational costs", suffix: "%", color: "text-amber-400" },
  { key: "labsSuccessRate", label: "Labs Opportunity Success Rate", icon: Beaker, desc: "Opportunities converted to published apps", suffix: "%", color: "text-violet-400" },
  { key: "appCreationFreq", label: "App Creation Frequency", icon: AppWindow, desc: "New apps published this week", suffix: " apps/wk", color: "text-teal-400" },
];

const INDICATOR_ICONS: Record<string, any> = {
  achieved: CheckCircle2,
  progressing: TrendingUp,
  early: AlertTriangle,
};

const INDICATOR_COLORS: Record<string, string> = {
  achieved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15",
  progressing: "text-amber-400 bg-amber-500/10 border-amber-500/15",
  early: "text-muted-foreground bg-white/[0.03] border-white/[0.06]",
};

function MetricCard({ metric, value, score }: { metric: typeof METRIC_CONFIG[0]; value: number; score: number }) {
  const Icon = metric.icon;
  return (
    <Card className="glass-card rounded-xl p-4 hover:bg-white/[0.06] transition-all" data-testid={`card-metric-${metric.key}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg bg-white/[0.05]")}>
          <Icon className={cn("w-4 h-4", metric.color)} />
        </div>
        <span className="text-lg font-bold font-mono">{typeof value === 'number' ? value.toFixed(1) : value}{metric.suffix}</span>
      </div>
      <div className="text-sm font-medium mb-1">{metric.label}</div>
      <div className="text-[10px] text-muted-foreground mb-3">{metric.desc}</div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Score</span>
          <span className="font-mono">{Math.round(score)}%</span>
        </div>
        <Progress value={score} className="h-1 bg-white/[0.04]" />
      </div>
    </Card>
  );
}

export default function PhaseTransitionMonitor() {
  const { data: ti, isLoading } = useQuery({
    queryKey: ["/api/admin/transition-index"],
    queryFn: () => api.billing.transitionIndex(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-80" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  const autonomy = ti?.autonomyPercentage || 0;
  const phase = ti?.phase || { id: 1, label: "Engine Building" };
  const trend = ti?.trend || { direction: "stable", delta: 0 };
  const TrendIcon = trend.direction === "improving" ? ArrowUpRight : trend.direction === "declining" ? ArrowDownRight : Minus;
  const trendColor = trend.direction === "improving" ? "text-emerald-400" : trend.direction === "declining" ? "text-red-400" : "text-muted-foreground";

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-phase-title">Phase Transition Monitor</h1>
              <p className="text-sm text-muted-foreground">Detecting self-propagating ecosystem growth</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
              <TrendIcon className="w-3.5 h-3.5" />
              <span>{trend.direction} ({trend.delta > 0 ? "+" : ""}{trend.delta}%)</span>
            </div>
            <Badge className={cn("px-3 py-1",
              phase.id >= 4 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              phase.id >= 3 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              "bg-primary/10 text-primary border-primary/20"
            )} data-testid="badge-phase">
              Phase {phase.id}: {phase.label}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" data-testid="section-phase-steps">
          {PHASES.map((p) => {
            const isCompleted = phase.id > p.id;
            const isCurrent = phase.id === p.id;
            return (
              <Card key={p.id} className={cn(
                "glass-card rounded-xl transition-all",
                isCurrent && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
                isCompleted && "opacity-60"
              )}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Phase {p.id}</span>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : 
                     isCurrent ? <Rocket className="w-4 h-4 text-primary animate-pulse" /> : 
                     <Power className="w-4 h-4 text-muted-foreground/30" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{p.label}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{p.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card rounded-xl">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Self-Sustaining Growth Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="section-growth-metrics">
                  {METRIC_CONFIG.map(m => (
                    <MetricCard
                      key={m.key}
                      metric={m}
                      value={ti?.metrics?.[m.key] ?? 0}
                      score={ti?.scores?.[m.key] ?? 0}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {ti?.indicators?.length > 0 && (
              <Card className="glass-card rounded-xl" data-testid="section-indicators">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Growth Indicators
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ti.indicators.map((ind: any, i: number) => {
                    const IndIcon = INDICATOR_ICONS[ind.status] || Activity;
                    const colorCls = INDICATOR_COLORS[ind.status] || INDICATOR_COLORS.early;
                    return (
                      <div key={i} className={cn("flex items-start gap-3 p-3 rounded-lg border", colorCls)} data-testid={`indicator-${i}`}>
                        <IndIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium">{ind.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{ind.detail}</div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 flex flex-col items-center justify-center p-8 text-center space-y-4" data-testid="section-transition-index">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Transition Index</div>
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    className="text-white/[0.05]"
                    cx="18" cy="18" r="15.9155"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <circle
                    className={cn(
                      autonomy >= 80 ? "text-emerald-400" : autonomy >= 50 ? "text-amber-400" : "text-primary"
                    )}
                    cx="18" cy="18" r="15.9155"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${autonomy} 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold font-mono" data-testid="text-autonomy">{autonomy}%</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">autonomy</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {ti?.selfSustaining ? "Self-Sustaining" : `Phase ${phase.id}: ${phase.label}`}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                  {ti?.selfSustaining
                    ? "The platform has achieved self-propagating growth"
                    : `${autonomy}% toward self-sustaining ecosystem. ${100 - autonomy}% remaining.`}
                </p>
              </div>
            </Card>

            <Card className="glass-card rounded-xl p-5" data-testid="section-raw-stats">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Raw Numbers
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Referral Signups", value: ti?.metrics?.raw?.referralSignups ?? 0 },
                  { label: "Total Signups (30d)", value: ti?.metrics?.raw?.totalSignups ?? 0 },
                  { label: "Active Creators", value: ti?.metrics?.raw?.totalCreators ?? 0 },
                  { label: "Repeat Creators", value: ti?.metrics?.raw?.repeatCreators ?? 0 },
                  { label: "Total Revenue", value: `$${(ti?.metrics?.raw?.totalRevenue ?? 0).toLocaleString()}` },
                  { label: "AI Cost (est.)", value: `$${(ti?.metrics?.raw?.estimatedAiCost ?? 0).toLocaleString()}` },
                  { label: "Published Apps", value: ti?.metrics?.raw?.publishedApps ?? 0 },
                  { label: "Apps This Week", value: ti?.metrics?.raw?.appsThisWeek ?? 0 },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-mono font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
