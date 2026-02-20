import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { Bot, Plus, Trash2, Rocket, Activity, Coins, Star, Eye, Lock, Globe, Zap, Loader2, BarChart3, Settings } from "lucide-react";
import { useState } from "react";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/30",
  draft: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  paused: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const DEPLOY_MODES = ["private", "public", "debate", "api", "marketplace"];

export default function MyAgents() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [selectedModes, setSelectedModes] = useState<string[]>([]);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["/api/user-agents"],
    queryFn: () => api.userAgents.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.userAgents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-agents"] });
    },
  });

  const deployMutation = useMutation({
    mutationFn: ({ id, modes }: { id: string; modes: string[] }) => api.userAgents.deploy(id, modes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-agents"] });
      setDeployingId(null);
      setSelectedModes([]);
    },
  });

  const activeAgents = agents.filter((a: any) => a.status === "active");
  const totalUsage = agents.reduce((sum: number, a: any) => sum + (a.totalUsageCount || 0), 0);
  const totalCredits = agents.reduce((sum: number, a: any) => sum + (a.totalCreditsEarned || 0), 0);

  const toggleMode = (mode: string) => {
    setSelectedModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const openDeploy = (agentId: string, currentModes: string[]) => {
    setDeployingId(agentId);
    setSelectedModes(currentModes || []);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="relative rounded-2xl overflow-hidden p-6 md:p-8 bg-gradient-to-br from-violet-600/20 via-indigo-600/10 to-transparent border border-white/5">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <Bot className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold" data-testid="text-page-title">My Entities</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage your intelligent entity fleet</p>
              </div>
            </div>
            <Button
              data-testid="button-create-agent"
              className="h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white font-medium shadow-lg shadow-violet-500/20 gap-2"
              onClick={() => navigate("/agent-builder")}
            >
              <Plus className="w-4 h-4" />
              Create Agent
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="section-stats">
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Bot className="w-3.5 h-3.5" />
              Total Agents
            </div>
            <span className="font-semibold text-lg" data-testid="text-total-agents">{agents.length}</span>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Activity className="w-3.5 h-3.5" />
              Active Agents
            </div>
            <span className="font-semibold text-lg text-green-400" data-testid="text-active-agents">{activeAgents.length}</span>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="w-3.5 h-3.5" />
              Total Usage
            </div>
            <span className="font-semibold text-lg" data-testid="text-total-usage">{totalUsage.toLocaleString()}</span>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Coins className="w-3.5 h-3.5" />
              Credits Earned
            </div>
            <span className="font-semibold text-lg text-amber-400" data-testid="text-credits-earned">{totalCredits.toLocaleString()}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" data-testid="loading-spinner" />
          </div>
        ) : agents.length === 0 ? (
          <div className="glass-card rounded-2xl border border-white/5 p-12 text-center" data-testid="empty-state">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-xl font-display font-bold mb-2">No agents yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first AI agent and start automating tasks, earning credits, and building your fleet.
            </p>
            <Button
              data-testid="button-create-first-agent"
              className="h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white font-medium shadow-lg shadow-violet-500/20 gap-2"
              onClick={() => navigate("/agent-builder")}
            >
              <Plus className="w-4 h-4" />
              Create Your First Agent
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="agents-grid">
            {agents.map((agent: any) => (
              <div
                key={agent.id}
                data-testid={`card-agent-${agent.id}`}
                className="glass-card rounded-xl border border-white/5 p-5 space-y-4 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-violet-500/20 border border-violet-500/20 flex items-center justify-center text-violet-400 font-semibold text-lg flex-shrink-0">
                    {agent.name?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate" data-testid={`text-agent-name-${agent.id}`}>{agent.name}</span>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 capitalize", STATUS_STYLES[agent.status] || STATUS_STYLES.draft)}
                        data-testid={`badge-status-${agent.id}`}
                      >
                        {agent.status || "draft"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 bg-white/5 border-white/10 gap-1"
                        data-testid={`badge-visibility-${agent.id}`}
                      >
                        {agent.visibility === "private" ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                        {agent.visibility || "public"}
                      </Badge>
                    </div>
                    {agent.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{agent.description}</p>
                    )}
                  </div>
                </div>

                {agent.skills && agent.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5" data-testid={`skills-${agent.id}`}>
                    {agent.skills.map((skill: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}

                {(agent.model || agent.provider) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>{agent.provider || "openai"}</span>
                    {agent.model && <span className="font-mono text-[10px] bg-white/5 px-1.5 py-0.5 rounded">{agent.model}</span>}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1" data-testid={`stat-usage-${agent.id}`}>
                    <BarChart3 className="w-3 h-3" />
                    <span>{(agent.totalUsageCount || 0).toLocaleString()} uses</span>
                  </div>
                  <div className="flex items-center gap-1" data-testid={`stat-credits-${agent.id}`}>
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span>{(agent.totalCreditsEarned || 0).toLocaleString()} credits</span>
                  </div>
                  {agent.rating != null && (
                    <div className="flex items-center gap-1" data-testid={`stat-rating-${agent.id}`}>
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span>{Number(agent.rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {agent.deploymentModes && agent.deploymentModes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5" data-testid={`deploy-modes-${agent.id}`}>
                    {agent.deploymentModes.map((mode: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-400 border-green-500/20 gap-1">
                        <Rocket className="w-2.5 h-2.5" />
                        {mode}
                      </Badge>
                    ))}
                  </div>
                )}

                {deployingId === agent.id && (
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-3" data-testid={`deploy-form-${agent.id}`}>
                    <p className="text-xs font-medium text-muted-foreground">Select deployment modes:</p>
                    <div className="flex flex-wrap gap-2">
                      {DEPLOY_MODES.map((mode) => (
                        <label
                          key={mode}
                          className={cn(
                            "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors",
                            selectedModes.includes(mode)
                              ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
                              : "bg-white/[0.02] border-white/10 text-muted-foreground hover:border-white/20"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={selectedModes.includes(mode)}
                            onChange={() => toggleMode(mode)}
                            data-testid={`checkbox-mode-${mode}-${agent.id}`}
                          />
                          <Rocket className="w-3 h-3" />
                          {mode}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1"
                        onClick={() => deployMutation.mutate({ id: agent.id, modes: selectedModes })}
                        disabled={selectedModes.length === 0 || deployMutation.isPending}
                        data-testid={`button-confirm-deploy-${agent.id}`}
                      >
                        {deployMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                        Deploy
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => { setDeployingId(null); setSelectedModes([]); }}
                        data-testid={`button-cancel-deploy-${agent.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-white/[0.02] border-white/10 hover:bg-white/[0.06] gap-1"
                    onClick={() => navigate(`/agent-builder?id=${agent.id}`)}
                    data-testid={`button-edit-${agent.id}`}
                  >
                    <Settings className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-white/[0.02] border-white/10 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-400 gap-1"
                    onClick={() => openDeploy(agent.id, agent.deploymentModes || [])}
                    data-testid={`button-deploy-${agent.id}`}
                  >
                    <Rocket className="w-3 h-3" />
                    Deploy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-white/[0.02] border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 gap-1 ml-auto"
                    onClick={() => deleteMutation.mutate(agent.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${agent.id}`}
                  >
                    {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
