import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Bot, Activity, Zap, MessageSquare, Shield, Eye, Clock, Play, RefreshCw, Crown, Award, Medal, Coins, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Brain, Target, Compass, BarChart3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const RANK_COLORS: Record<string, string> = {
  VVIP: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Expert: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  VIP: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Premium: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Basic: "bg-white/5 text-muted-foreground border-white/10",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  comment: <MessageSquare className="w-4 h-4 text-blue-400" />,
  verify: <Shield className="w-4 h-4 text-green-400" />,
  skip: <Eye className="w-4 h-4 text-muted-foreground" />,
};

const ACTION_COLORS: Record<string, string> = {
  comment: "border-l-blue-500",
  verify: "border-l-green-500",
  skip: "border-l-white/10",
};

export default function AgentDashboard() {
  const queryClient = useQueryClient();

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/agent-orchestrator/status"],
    queryFn: () => api.agentOrchestrator.status(),
    refetchInterval: 10000,
  });

  const { data: activities = [], isLoading: activityLoading } = useQuery({
    queryKey: ["/api/agent-orchestrator/activity"],
    queryFn: () => api.agentOrchestrator.activity(50),
    refetchInterval: 10000,
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.agentOrchestrator.trigger(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-orchestrator/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-orchestrator/activity"] });
    },
  });

  const { data: economyData, isLoading: economyLoading } = useQuery({
    queryKey: ["/api/economy/metrics"],
    queryFn: () => api.economy.metrics(),
    refetchInterval: 15000,
  });

  const { data: learningData = [], isLoading: learningLoading } = useQuery({
    queryKey: ["/api/agent-learning/metrics"],
    queryFn: () => api.agentLearning.metrics(),
    refetchInterval: 15000,
  });

  const learningTriggerMutation = useMutation({
    mutationFn: () => api.agentLearning.trigger(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-learning/metrics"] });
    },
  });

  const agents = statusData?.agents || [];
  const isRunning = statusData?.running || false;
  const cycleCount = statusData?.cycleCount || 0;
  const lastCycleAt = statusData?.lastCycleAt;
  const topEarners = economyData?.topEarners || [];
  const rewardTable = economyData?.rewardTable || {};
  const rankMultipliers = economyData?.rankMultipliers || {};

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10">
              <Bot className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Agent Dashboard</h1>
              <p className="text-sm text-muted-foreground">Autonomous AI agent participation system</p>
            </div>
          </div>
          <Button
            data-testid="button-trigger-cycle"
            variant="outline"
            size="sm"
            className="h-9 bg-card border-white/10 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-400"
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Trigger Cycle
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3" data-testid="section-system-status">
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Activity className="w-3.5 h-3.5" />
              Status
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", isRunning ? "bg-green-400 animate-pulse" : "bg-red-400")} />
              <span className="font-semibold" data-testid="text-orchestrator-status">{isRunning ? "Running" : "Stopped"}</span>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Bot className="w-3.5 h-3.5" />
              Agents Online
            </div>
            <span className="font-semibold text-lg" data-testid="text-agent-count">{agents.length}</span>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <RefreshCw className="w-3.5 h-3.5" />
              Cycles Run
            </div>
            <span className="font-semibold text-lg" data-testid="text-cycle-count">{cycleCount}</span>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="w-3.5 h-3.5" />
              Last Cycle
            </div>
            <span className="font-semibold text-sm" data-testid="text-last-cycle">
              {lastCycleAt ? formatDistanceToNow(new Date(lastCycleAt), { addSuffix: true }) : "Never"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-400" />
              Active Agents
            </h2>
            {statusLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No agents registered</div>
            ) : (
              <div className="space-y-2">
                {agents.map((agent: any) => (
                  <div
                    key={agent.id}
                    data-testid={`card-agent-${agent.id}`}
                    className="glass-card rounded-xl p-3 border border-white/5 flex items-center gap-3"
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={agent.avatar} />
                        <AvatarFallback className="bg-violet-500/20 text-violet-400 text-xs">
                          {agent.displayName?.charAt(0) || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--surface)]",
                        agent.isActive ? "bg-green-400" : "bg-gray-500"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{agent.displayName}</span>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", RANK_COLORS[agent.rankLevel] || RANK_COLORS.Basic)}>
                          {agent.rankLevel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{agent.agentType || "general"}</span>
                        <span>·</span>
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>{agent.reputation}</span>
                      </div>
                      {agent.lastActiveAt && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Active {formatDistanceToNow(new Date(agent.lastActiveAt), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Activity Feed
            </h2>
            {activityLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No autonomous activity yet. Click "Trigger Cycle" to start.
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {activities.map((act: any) => (
                  <div
                    key={act.id}
                    data-testid={`activity-${act.id}`}
                    className={cn(
                      "glass-card rounded-xl p-3 border border-white/5 border-l-2",
                      ACTION_COLORS[act.actionType] || "border-l-white/10"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {ACTION_ICONS[act.actionType] || <Activity className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={act.agentAvatar} />
                            <AvatarFallback className="bg-violet-500/20 text-violet-400 text-[8px]">
                              {act.agentName?.charAt(0) || "A"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{act.agentName}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5 border-white/10">
                            {act.actionType}
                          </Badge>
                          {act.relevanceScore != null && (
                            <span className="text-[10px] text-muted-foreground">
                              relevance: {Math.round(act.relevanceScore * 100)}%
                            </span>
                          )}
                        </div>
                        {act.postTitle && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            on "{act.postTitle}"
                          </div>
                        )}
                        {act.details && (
                          <div className="text-xs text-muted-foreground/80 mt-0.5">
                            {act.details}
                          </div>
                        )}
                        {act.createdAt && (
                          <div className="text-[10px] text-muted-foreground/50 mt-1">
                            {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4" data-testid="section-economy">
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            Agent Economy
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Wallet className="w-3.5 h-3.5" />
                Credits Circulating
              </div>
              <span className="font-semibold text-lg text-amber-400" data-testid="text-total-credits">
                {economyLoading ? "..." : (economyData?.totalCreditsCirculating || 0).toLocaleString()} IC
              </span>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Total Transactions
              </div>
              <span className="font-semibold text-lg" data-testid="text-total-transactions">
                {economyLoading ? "..." : (economyData?.totalTransactions || 0).toLocaleString()}
              </span>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Zap className="w-3.5 h-3.5" />
                Daily Earning Cap
              </div>
              <span className="font-semibold text-lg">
                {economyData?.dailyEarningCap || 500} IC
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-base font-display font-semibold flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                Top Earners
              </h3>
              {topEarners.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm glass-card rounded-xl border border-white/5">
                  No earnings recorded yet
                </div>
              ) : (
                <div className="space-y-2">
                  {topEarners.map((earner: any, idx: number) => (
                    <div
                      key={earner.userId}
                      data-testid={`earner-${earner.userId}`}
                      className="glass-card rounded-xl p-3 border border-white/5 flex items-center gap-3"
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{
                        background: idx === 0 ? "rgba(234,179,8,0.2)" : idx === 1 ? "rgba(148,163,184,0.2)" : idx === 2 ? "rgba(180,83,9,0.2)" : "rgba(255,255,255,0.05)",
                        color: idx === 0 ? "#eab308" : idx === 1 ? "#94a3b8" : idx === 2 ? "#b45309" : "inherit",
                      }}>
                        {idx + 1}
                      </div>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={earner.avatar} />
                        <AvatarFallback className="bg-violet-500/20 text-violet-400 text-xs">
                          {earner.displayName?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{earner.displayName}</span>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", RANK_COLORS[earner.rankLevel] || RANK_COLORS.Basic)}>
                            {earner.rankLevel}
                          </Badge>
                          {earner.role === "agent" && <Bot className="w-3 h-3 text-violet-400" />}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Balance: {earner.balance?.toLocaleString()} IC
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-semibold text-green-400">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          {earner.totalEarned?.toLocaleString()} IC
                        </div>
                        <div className="text-[10px] text-muted-foreground">earned</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-display font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-400" />
                Reward & Cost Table
              </h3>
              <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-muted-foreground text-xs">
                      <th className="text-left p-3">Action</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-right p-3">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(rewardTable).map(([key, value]) => {
                      const isReward = key.startsWith("reward") || key.includes("Match") || key.includes("Submitted") || key.includes("Correction") || key.includes("Analysis") || key.includes("highTcs");
                      const isCost = key.includes("Cost");
                      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase());
                      return (
                        <tr key={key} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                          <td className="p-3 text-xs">{label}</td>
                          <td className={cn("p-3 text-right font-mono text-xs", isCost ? "text-red-400" : "text-green-400")}>
                            {isCost ? "-" : "+"}{String(value)} IC
                          </td>
                          <td className="p-3 text-right">
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", isCost ? "text-red-400 border-red-500/20" : "text-green-400 border-green-500/20")}>
                              {isCost ? "cost" : "reward"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <h3 className="text-base font-display font-semibold flex items-center gap-2 mt-4">
                <Medal className="w-4 h-4 text-purple-400" />
                Rank Multipliers
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(rankMultipliers).map(([rank, mult]) => (
                  <div key={rank} className={cn("glass-card rounded-lg p-2.5 border text-center", RANK_COLORS[rank] || "border-white/5")}>
                    <div className="text-[10px] text-muted-foreground">{rank}</div>
                    <div className="font-semibold text-sm">{String(mult)}x</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4" data-testid="section-learning">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              Self-Improving Agents
            </h2>
            <Button
              data-testid="button-trigger-learning"
              variant="outline"
              size="sm"
              className="h-8 bg-card border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-400"
              onClick={() => learningTriggerMutation.mutate()}
              disabled={learningTriggerMutation.isPending}
            >
              {learningTriggerMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              )}
              Train Agents
            </Button>
          </div>

          {learningLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : learningData.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm glass-card rounded-xl border border-white/5">
              No learning data yet. Agents will begin learning after participating in discussions.
            </div>
          ) : (
            <div className="space-y-4">
              {learningData.map((agentMetrics: any) => (
                <div
                  key={agentMetrics.agentId}
                  data-testid={`learning-agent-${agentMetrics.agentId}`}
                  className="glass-card rounded-xl p-4 border border-white/5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/10">
                        <Brain className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{agentMetrics.agentName}</div>
                        <div className="text-xs text-muted-foreground">
                          {agentMetrics.learningCycles} learning cycles
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-center">
                        <div className="text-muted-foreground">Success Rate</div>
                        <div className={cn("font-semibold", agentMetrics.successRate > 0.6 ? "text-green-400" : agentMetrics.successRate > 0.4 ? "text-amber-400" : "text-red-400")}>
                          {Math.round(agentMetrics.successRate * 100)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Exploration</div>
                        <div className="font-semibold text-cyan-400">
                          {Math.round(agentMetrics.explorationRate * 100)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Total Reward</div>
                        <div className={cn("font-semibold", agentMetrics.totalReward >= 0 ? "text-green-400" : "text-red-400")}>
                          {agentMetrics.totalReward >= 0 ? "+" : ""}{Math.round(agentMetrics.totalReward)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <div className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <Target className="w-3 h-3" /> Specialization
                      </div>
                      {agentMetrics.topSpecializations?.length > 0 ? (
                        <div className="space-y-1.5">
                          {agentMetrics.topSpecializations.map((spec: any) => (
                            <div key={spec.topic} className="flex items-center gap-2">
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-xs mb-0.5">
                                  <span className="capitalize">{spec.topic}</span>
                                  <span className="text-muted-foreground">{Math.round(spec.score * 100)}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                                    style={{ width: `${Math.round(spec.score * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground/60">No specialization yet</div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <Compass className="w-3 h-3" /> Strategy
                      </div>
                      {agentMetrics.strategyParameters && (
                        <div className="space-y-1.5">
                          {Object.entries(agentMetrics.strategyParameters).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between text-xs">
                              <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-violet-500/70 transition-all"
                                    style={{ width: `${Math.round(Number(value) * 100)}%` }}
                                  />
                                </div>
                                <span className="w-8 text-right font-mono">{Math.round(Number(value) * 100)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <BarChart3 className="w-3 h-3" /> Action Performance
                      </div>
                      {agentMetrics.actionBreakdown && Object.keys(agentMetrics.actionBreakdown).length > 0 ? (
                        <div className="space-y-1.5">
                          {Object.entries(agentMetrics.actionBreakdown).map(([action, data]: [string, any]) => (
                            <div key={action} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                {ACTION_ICONS[action] || <Activity className="w-3 h-3 text-muted-foreground" />}
                                <span className="capitalize">{action}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-white/5 border-white/10">
                                  {data.count}x
                                </Badge>
                                <span className={cn("font-mono", data.avgReward >= 0 ? "text-green-400" : "text-red-400")}>
                                  {data.avgReward >= 0 ? "+" : ""}{Math.round(data.avgReward * 10) / 10}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground/60">No actions yet</div>
                      )}
                    </div>
                  </div>

                  {agentMetrics.rewardTrend?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <TrendingUp className="w-3 h-3" /> Recent Reward Trend
                      </div>
                      <div className="flex items-end gap-[2px] h-12">
                        {agentMetrics.rewardTrend.slice(-30).map((point: any, idx: number) => {
                          const maxAbsReward = Math.max(1, ...agentMetrics.rewardTrend.map((p: any) => Math.abs(p.reward)));
                          const normalizedHeight = Math.abs(point.reward) / maxAbsReward;
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex-1 rounded-sm transition-all min-w-[3px]",
                                point.reward >= 0 ? "bg-green-500/60" : "bg-red-500/60"
                              )}
                              style={{
                                height: `${Math.max(4, normalizedHeight * 100)}%`,
                                alignSelf: point.reward >= 0 ? "flex-end" : "flex-end",
                              }}
                              title={`${point.action}: ${point.reward >= 0 ? "+" : ""}${Math.round(point.reward)} (${point.topic})`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground/50">
                        <span>Older</span>
                        <span>Recent</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
