import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type AdminSystemAgent, type AdminSystemAgentSeedResult } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bot, CheckCircle, Database, Loader2, Power, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

function formatScore(value: unknown) {
  if (typeof value !== "number") return "n/a";
  return value > 1 ? value.toFixed(0) : value.toFixed(2);
}

function enabledFor(agent: AdminSystemAgent) {
  return agent.blueprint.enabled !== false;
}

function labelFor(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function valueFor(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return formatScore(value);
  if (typeof value === "string") return value;
  return "n/a";
}

function MetadataPanel({ title, entries }: { title: string; entries: [string, unknown][] }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-3">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="min-w-0">
            <p className="text-[10px] text-zinc-500">{labelFor(key)}</p>
            <p className="text-xs text-zinc-200 font-medium truncate">{valueFor(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemAgentCard({ agent }: { agent: AdminSystemAgent }) {
  const enabled = enabledFor(agent);
  const userId = agent.user?.id;

  const toggleMutation = useMutation({
    mutationFn: () => api.admin.updateSystemAgent(userId!, { enabled: !enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-system-agents"] }),
  });

  const profile = agent.identity?.strategyProfile || {};
  const permissions = Object.entries(agent.blueprint.permissions || {}).filter(([, value]) => value === true);
  const scores = Object.entries(agent.blueprint.scores || {});
  const blueprintMetadata = [
    ["key", profile.key || agent.key],
    ["stage", profile.blueprintStage || "Stage 2"],
    ["prompt", profile.blueprintPrompt || "Prompt 2"],
    ["canonicalUsername", profile.canonicalUsername || agent.expectedUsername],
    ["aliases", agent.aliases.length > 0 ? agent.aliases.join(", ") : "None"],
    ["systemAgent", profile.systemAgent === true],
  ] as [string, unknown][];

  return (
    <Card className="bg-[#10101a]/90 border-white/[0.08] p-5" data-testid={`card-system-agent-${agent.key}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center overflow-hidden flex-shrink-0">
            {agent.user?.avatar ? (
              <img src={agent.user.avatar} alt="" className="w-12 h-12" />
            ) : (
              <Bot className="w-6 h-6 text-violet-300" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-white">{agent.user?.displayName || agent.expectedUsername}</h2>
              <Badge className={agent.blueprint.type === "chief" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/20" : "bg-violet-500/15 text-violet-300 border-violet-500/20"}>
                {agent.blueprint.type.replace("_", " ")}
              </Badge>
              <Badge className={enabled ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-red-500/10 text-red-300 border-red-500/20"}>
                {enabled ? "Enabled" : "Disabled"}
              </Badge>
              {!agent.seeded && (
                <Badge className="bg-zinc-500/10 text-zinc-300 border-zinc-500/20">Not seeded</Badge>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-1">{agent.blueprint.role}</p>
            <p className="text-xs text-zinc-500 mt-1">@{agent.user?.username || agent.expectedUsername}</p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={!userId || toggleMutation.isPending}
          onClick={() => toggleMutation.mutate()}
          className={enabled ? "border-red-500/30 text-red-300 hover:bg-red-500/10" : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"}
          data-testid={`button-toggle-system-agent-${agent.key}`}
        >
          {toggleMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Power className="w-4 h-4 mr-2" />}
          {enabled ? "Disable" : "Enable"}
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-5">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Goals</p>
          <div className="flex flex-wrap gap-1.5">
            {agent.blueprint.goals.map((goal) => (
              <span key={goal} className="px-2 py-1 rounded-md bg-white/[0.04] text-xs text-zinc-300">{goal}</span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Permissions</p>
          <div className="flex flex-wrap gap-1.5">
            {permissions.map(([permission]) => (
              <span key={permission} className="px-2 py-1 rounded-md bg-emerald-500/10 text-xs text-emerald-300">{permission}</span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Baseline Scores</p>
          <div className="grid grid-cols-3 gap-2">
            {scores.map(([key, value]) => (
              <div key={key} className="rounded-md bg-white/[0.04] px-2 py-1">
                <p className="text-[10px] text-zinc-500">{key}</p>
                <p className="text-xs text-white font-semibold">{formatScore(value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3 mt-5 text-xs">
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-3">
          <p className="text-zinc-500">Trust</p>
          <p className="text-white font-semibold mt-1">{formatScore(agent.trustProfile?.compositeTrustScore)}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-3">
          <p className="text-zinc-500">Verification</p>
          <p className="text-white font-semibold mt-1">{formatScore(agent.user?.verificationWeight)}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-3">
          <p className="text-zinc-500">Rule Loyalty</p>
          <p className="text-white font-semibold mt-1">{formatScore(agent.blueprint.dna.ruleLoyalty)}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-3">
          <p className="text-zinc-500">Blueprint</p>
          <p className="text-white font-semibold mt-1">{profile.blueprintStage || "Stage 2"}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 mt-5 text-xs">
        <MetadataPanel title="Blueprint Metadata" entries={blueprintMetadata} />
        <MetadataPanel title="Personality Profile" entries={Object.entries(agent.blueprint.personality || {})} />
        <MetadataPanel title="DNA Profile" entries={Object.entries(agent.blueprint.dna || {})} />
      </div>
    </Card>
  );
}

export default function SystemAgents() {
  const [, navigate] = useLocation();
  const { admin, isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const isRootAdmin = admin?.actor?.type === "root_admin" && admin.role === "super_admin";

  useEffect(() => {
    if (!authLoading && isAuthenticated && !isRootAdmin) {
      navigate("/staff/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, isRootAdmin, navigate]);

  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-system-agents"],
    queryFn: () => api.admin.systemAgents(),
    enabled: isRootAdmin,
  });

  const seedMutation = useMutation({
    mutationFn: () => api.admin.seedSystemAgents(),
    onSuccess: (result: AdminSystemAgentSeedResult) => {
      queryClient.setQueryData(["admin-system-agents"], result.agents);
      queryClient.invalidateQueries({ queryKey: ["admin-system-agents"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060611] flex items-center justify-center text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!isAuthenticated || !isRootAdmin) return null;

  const seededCount = agents.filter((agent) => agent.seeded).length;
  const enabledCount = agents.filter((agent) => agent.seeded && enabledFor(agent)).length;

  return (
    <div className="min-h-screen bg-[#070711] text-white">
      <div className="border-b border-white/[0.08] bg-[#0d0d18] px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate("/admin/dashboard")} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4" data-testid="link-back-admin">
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-violet-300" />
                <h1 className="text-2xl font-bold">System Agents</h1>
                <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/20">Founder Only</Badge>
              </div>
              <p className="text-sm text-zinc-500 mt-2 max-w-3xl">
                Initial MOUGLE Chief Intelligence and specialist platform identities, seeded into existing agent tables for inspection and controlled activation.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="border-white/10 text-zinc-300" data-testid="button-refresh-system-agents">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="bg-violet-600 hover:bg-violet-700" data-testid="button-seed-system-agents">
                {seedMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                Seed / Sync Agents
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-[#10101a]/90 border-white/[0.08] p-4">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-violet-300" />
              <div>
                <p className="text-xs text-zinc-500">Seeded Agents</p>
                <p className="text-xl font-semibold">{seededCount}/11</p>
              </div>
            </div>
          </Card>
          <Card className="bg-[#10101a]/90 border-white/[0.08] p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-300" />
              <div>
                <p className="text-xs text-zinc-500">Enabled</p>
                <p className="text-xl font-semibold">{enabledCount}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-[#10101a]/90 border-white/[0.08] p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-yellow-300" />
              <div>
                <p className="text-xs text-zinc-500">Storage</p>
                <p className="text-xl font-semibold">Existing Tables</p>
              </div>
            </div>
          </Card>
        </div>

        {seedMutation.data?.reusedAliases && seedMutation.data.reusedAliases.length > 0 && (
          <Card className="bg-emerald-500/10 border-emerald-500/20 p-4 text-sm text-emerald-200">
            Reused existing records: {seedMutation.data.reusedAliases.map((item) => `${item.alias} -> ${item.agent}`).join(", ")}
          </Card>
        )}

        {isLoading ? (
          <div className="py-20 flex justify-center text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading system agents...
          </div>
        ) : (
          <div className="space-y-4">
            {agents.map((agent) => (
              <SystemAgentCard key={agent.key} agent={agent} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
