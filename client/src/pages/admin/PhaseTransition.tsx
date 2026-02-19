import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  Zap, Activity, MousePointer2, Users, DollarSign,
  TrendingUp, Shield, Rocket, Power, CheckCircle2
} from "lucide-react";

const PHASES = [
  { id: 1, label: "Phase 1: Engine Building", description: "Establishing core content and user loops" },
  { id: 2, label: "Phase 2: Engagement Lock", description: "Users are consistently returning and creating" },
  { id: 3, label: "Phase 3: Flywheel Ignition", description: "Growth begins to accelerate organically" },
  { id: 4, label: "Phase 4: Autonomous Growth", description: "System is self-sustaining and profitable" },
];

function MetricRow({ label, value, icon: Icon, suffix = "%" }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          <span>{label}</span>
        </div>
        <span className="font-mono font-bold text-primary">{value.toFixed(1)}{suffix}</span>
      </div>
      <Progress value={value} className="h-1.5 bg-white/[0.04]" />
    </div>
  );
}

export default function PhaseTransitionMonitor() {
  const { data: pt, isLoading } = useQuery({
    queryKey: ["/api/admin/billing/phase-transition"],
    queryFn: () => api.billing.founderPhaseTransition(),
    refetchInterval: 30000,
  });

  if (isLoading) return <Layout><div className="p-8 space-y-4"><Skeleton className="w-full h-12" /><Skeleton className="w-full h-64" /></div></Layout>;

  const currentPhase = PHASES.find(p => p.id === pt?.phase) || PHASES[0];

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Phase Transition Monitor</h1>
              <p className="text-sm text-muted-foreground">Measuring autonomous growth threshold</p>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
            System Status: {pt?.phaseLabel?.split(': ')[1]}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {PHASES.map((phase) => {
            const isCompleted = pt?.phase > phase.id;
            const isCurrent = pt?.phase === phase.id;
            return (
              <Card key={phase.id} className={cn(
                "bg-card/30 border-white/[0.06] transition-all",
                isCurrent && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
                isCompleted && "opacity-60"
              )}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Step 0{phase.id}</span>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : 
                     isCurrent ? <Rocket className="w-4 h-4 text-primary animate-pulse" /> : 
                     <Power className="w-4 h-4 text-muted-foreground/30" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{phase.label.split(': ')[1]}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{phase.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-card/30 border-white/[0.06] lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Core Transition Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <MetricRow 
                label="Self-Creation Rate (AI/Autonomous Debates)" 
                value={pt?.metrics?.debate_self_creation_rate} 
                icon={Zap} 
              />
              <MetricRow 
                label="Content Multiplication (Clips per Debate)" 
                value={pt?.metrics?.content_multiplication_ratio * 10} 
                icon={TrendingUp} 
                suffix="x ratio"
              />
              <MetricRow 
                label="Organic Traffic Ratio" 
                value={pt?.metrics?.organic_traffic_ratio} 
                icon={MousePointer2} 
              />
              <MetricRow 
                label="Creator Conversion Rate" 
                value={pt?.metrics?.creator_conversion_rate} 
                icon={Users} 
              />
              <MetricRow 
                label="Revenue Sustainability Index" 
                value={pt?.metrics?.revenue_sustainability_index} 
                icon={DollarSign} 
              />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                  className="text-white/[0.05]"
                  strokeDasharray="100, 100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-primary"
                  strokeDasharray={`${pt?.overallProgress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold font-mono">{pt?.overallProgress}%</span>
                <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">to autonomy</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold font-display">Phase {pt?.phase} Active</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">The platform is currently {pt?.overallProgress}% of the way toward being a self-sustaining ecosystem.</p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
