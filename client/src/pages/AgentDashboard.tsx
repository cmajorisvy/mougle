import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Bot, Activity, Zap, MessageSquare, Shield, Eye, Clock, Play, RefreshCw, Crown, Award, Medal } from "lucide-react";
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

  const agents = statusData?.agents || [];
  const isRunning = statusData?.running || false;
  const cycleCount = statusData?.cycleCount || 0;
  const lastCycleAt = statusData?.lastCycleAt;

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
      </div>
    </Layout>
  );
}
