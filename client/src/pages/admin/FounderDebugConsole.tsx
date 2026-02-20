import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Shield, ArrowLeft, Loader2, Activity, Brain,
  DollarSign, Users, Settings, Terminal, TrendingUp,
  TrendingDown, AlertTriangle, Eye, Zap, BarChart3,
  Clock, Cpu, RefreshCw
} from "lucide-react";

function useAdminAuth() {
  const [, navigate] = useLocation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-verify"],
    queryFn: () => api.admin.verify(),
    retry: false,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (!isLoading && (isError || !data?.valid)) navigate("/admin/login");
  }, [isLoading, isError, data, navigate]);
  return { isAuthenticated: !!data?.valid, isLoading };
}

type Tab = "overview" | "ai" | "economics" | "journey" | "config";

export default function FounderDebugConsole() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [, navigate] = useLocation();

  if (authLoading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-400" /></div>;
  if (!isAuthenticated) return null;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "ai", label: "AI Usage", icon: Brain },
    { id: "economics", label: "Economics", icon: DollarSign },
    { id: "journey", label: "User Journey", icon: Users },
    { id: "config", label: "Controls", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" data-testid="page-founder-debug">
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" /> Admin
          </Button>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-bold" data-testid="text-page-title">Founder Debug Console</h1>
          </div>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">RESTRICTED</Badge>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "ai" && <AIUsageTab />}
        {activeTab === "economics" && <EconomicsTab />}
        {activeTab === "journey" && <JourneyTab />}
        {activeTab === "config" && <ConfigTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const { data: snapshot, isLoading, refetch } = useQuery({
    queryKey: ["founder-debug-snapshot"],
    queryFn: () => api.admin.founderDebug.snapshot(),
    refetchInterval: 30000,
  });

  if (isLoading) return <LoadingSkeleton />;

  const ai = snapshot?.aiStats;
  const econ = snapshot?.economics;
  const health = snapshot?.systemHealth;
  const journey = snapshot?.journeySummary;

  return (
    <div className="space-y-6" data-testid="section-overview">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">System Overview</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-overview">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-overview-stats">
        <StatCard
          title="AI Cost Today"
          value={`$${ai?.totalCost?.toFixed(4) || "0.0000"}`}
          subtitle={`${ai?.totalRequests || 0} requests`}
          icon={Brain}
          color="purple"
          testId="stat-ai-cost"
        />
        <StatCard
          title="Revenue (24h)"
          value={`$${econ?.totalRevenue?.toFixed(2) || "0.00"}`}
          subtitle={`Margin: ${econ?.margin?.toFixed(1) || 0}%`}
          icon={DollarSign}
          color={econ?.margin > 50 ? "green" : econ?.margin > 0 ? "yellow" : "red"}
          testId="stat-revenue"
        />
        <StatCard
          title="Active Users (7d)"
          value={String(journey?.uniqueUsers || 0)}
          subtitle={`${journey?.totalEvents || 0} events`}
          icon={Users}
          color="blue"
          testId="stat-users"
        />
        <StatCard
          title="Uptime"
          value={formatUptime(health?.uptime || 0)}
          subtitle={`${health?.logsStored || 0} logs stored`}
          icon={Activity}
          color="emerald"
          testId="stat-uptime"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900/50 border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" /> AI Usage Limits
          </h3>
          <div className="space-y-3" data-testid="section-ai-limits">
            <LimitBar label="Tokens" percent={ai?.limitsUsed?.tokensPercent || 0} detail={ai?.limitsUsed?.tokens || "0/0"} />
            <LimitBar label="Cost" percent={ai?.limitsUsed?.costPercent || 0} detail={ai?.limitsUsed?.cost || "$0/$0"} />
          </div>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Conversion Funnel (7d)
          </h3>
          <div className="space-y-2" data-testid="section-funnel">
            {journey?.funnelConversion && Object.entries(journey.funnelConversion).map(([key, val]: [string, any]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm text-zinc-400 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                <span className="text-sm font-mono text-zinc-200">{val}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Recent AI Actions
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto" data-testid="section-recent-ai-logs">
          {snapshot?.recentAILogs?.length > 0 ? snapshot.recentAILogs.map((log: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-zinc-800/50">
              <div className="flex items-center gap-3">
                <Badge className="bg-purple-500/20 text-purple-400 text-xs">{log.model}</Badge>
                <span className="text-zinc-300">{log.action}</span>
              </div>
              <div className="flex items-center gap-4 text-zinc-500">
                <span>{log.inputTokens + log.outputTokens} tok</span>
                <span>${log.estimatedCostUsd.toFixed(4)}</span>
                <span>{log.durationMs}ms</span>
              </div>
            </div>
          )) : <p className="text-zinc-500 text-sm">No AI actions logged yet</p>}
        </div>
      </Card>
    </div>
  );
}

function AIUsageTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["founder-debug-ai-stats"],
    queryFn: () => api.admin.founderDebug.aiStats(),
    refetchInterval: 15000,
  });
  const { data: logs } = useQuery({
    queryKey: ["founder-debug-ai-logs"],
    queryFn: () => api.admin.founderDebug.aiLogs({ limit: 50 }),
    refetchInterval: 15000,
  });
  const { data: limits } = useQuery({
    queryKey: ["founder-debug-ai-limits"],
    queryFn: () => api.admin.founderDebug.aiLimits(),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6" data-testid="section-ai-usage">
      <h2 className="text-xl font-bold">AI Usage Monitor</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Tokens" value={stats?.totalTokens?.toLocaleString() || "0"} subtitle={`Date: ${stats?.date}`} icon={Zap} color="purple" testId="stat-tokens" />
        <StatCard title="Total Cost" value={`$${stats?.totalCost?.toFixed(4) || "0.0000"}`} subtitle={`${stats?.totalRequests || 0} requests`} icon={DollarSign} color="yellow" testId="stat-total-cost" />
        <StatCard
          title="Limits Status"
          value={limits?.allowed ? "Within Limits" : "EXCEEDED"}
          subtitle={limits?.reason || "All systems normal"}
          icon={Shield}
          color={limits?.allowed ? "green" : "red"}
          testId="stat-limits"
        />
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Usage by Model</h3>
        <div className="space-y-3" data-testid="section-by-model">
          {stats?.byModel && Object.entries(stats.byModel).map(([model, data]: [string, any]) => (
            <div key={model} className="flex items-center justify-between py-2 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-500/20 text-purple-400">{model}</Badge>
              </div>
              <div className="flex gap-6 text-sm text-zinc-400">
                <span>{data.requests} req</span>
                <span>{data.tokens.toLocaleString()} tok</span>
                <span className="text-emerald-400">${data.cost.toFixed(4)}</span>
              </div>
            </div>
          ))}
          {(!stats?.byModel || Object.keys(stats.byModel).length === 0) && (
            <p className="text-zinc-500 text-sm">No model usage recorded today</p>
          )}
        </div>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Recent AI Action Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-ai-logs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 pr-4">Time</th>
                <th className="text-left py-2 pr-4">Model</th>
                <th className="text-left py-2 pr-4">Action</th>
                <th className="text-right py-2 pr-4">Tokens</th>
                <th className="text-right py-2 pr-4">Cost</th>
                <th className="text-right py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map((log: any, i: number) => (
                <tr key={i} className="border-b border-zinc-800/30 text-zinc-300">
                  <td className="py-2 pr-4 text-zinc-500 font-mono text-xs">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2 pr-4"><Badge className="bg-zinc-800 text-zinc-300 text-xs">{log.model}</Badge></td>
                  <td className="py-2 pr-4">{log.action}</td>
                  <td className="py-2 pr-4 text-right font-mono">{(log.inputTokens + log.outputTokens).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right font-mono text-emerald-400">${log.estimatedCostUsd.toFixed(4)}</td>
                  <td className="py-2 text-right font-mono">{log.durationMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!logs || logs.length === 0) && <p className="text-zinc-500 text-sm py-4 text-center">No AI logs yet</p>}
        </div>
      </Card>
    </div>
  );
}

function EconomicsTab() {
  const { data: econ, isLoading } = useQuery({
    queryKey: ["founder-debug-economics"],
    queryFn: () => api.admin.founderDebug.economics(),
    refetchInterval: 30000,
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6" data-testid="section-economics">
      <h2 className="text-xl font-bold">Economic Monitor</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="AI Cost (24h)" value={`$${econ?.totalAiCostUsd?.toFixed(4) || "0.0000"}`} subtitle={`${econ?.totalRequests || 0} requests`} icon={Brain} color="purple" testId="stat-econ-ai-cost" />
        <StatCard title="Revenue (24h)" value={`$${econ?.totalRevenue?.toFixed(2) || "0.00"}`} subtitle="From payments" icon={DollarSign} color="green" testId="stat-econ-revenue" />
        <StatCard title="Margin" value={`${econ?.margin?.toFixed(1) || 0}%`} subtitle={econ?.margin >= 50 ? "Healthy" : "Below target"} icon={econ?.margin >= 50 ? TrendingUp : TrendingDown} color={econ?.margin >= 50 ? "green" : "red"} testId="stat-econ-margin" />
        <StatCard title="Avg Cost/Request" value={`$${econ?.avgCostPerRequest?.toFixed(4) || "0.0000"}`} subtitle="Per AI call" icon={BarChart3} color="blue" testId="stat-econ-avg" />
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" /> Loss-Making Endpoints
        </h3>
        <div className="space-y-2" data-testid="section-loss-apps">
          {econ?.lossApps?.length > 0 ? econ.lossApps.map((app: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800/50">
              <span className="text-sm text-zinc-300">{app.appName}</span>
              <div className="flex gap-4 text-sm">
                <span className="text-red-400">Cost: ${app.cost.toFixed(4)}</span>
                <span className="text-emerald-400">Revenue: ${app.revenue.toFixed(2)}</span>
                <span className="text-red-400 font-semibold">Loss: ${app.loss.toFixed(4)}</span>
              </div>
            </div>
          )) : <p className="text-zinc-500 text-sm">No loss-making endpoints detected</p>}
        </div>
      </Card>
    </div>
  );
}

function JourneyTab() {
  const [eventFilter, setEventFilter] = useState<string>("");
  const { data: summary, isLoading } = useQuery({
    queryKey: ["founder-debug-journey-summary"],
    queryFn: () => api.admin.founderDebug.journeySummary(),
    refetchInterval: 30000,
  });
  const { data: events } = useQuery({
    queryKey: ["founder-debug-journey", eventFilter],
    queryFn: () => api.admin.founderDebug.journey({ event: eventFilter || undefined, limit: 50 }),
    refetchInterval: 15000,
  });

  if (isLoading) return <LoadingSkeleton />;

  const eventTypes = ["signup", "app_creation", "pricing_analyze", "publish_attempt", "payment", "export", "login", "agent_created"];

  return (
    <div className="space-y-6" data-testid="section-journey">
      <h2 className="text-xl font-bold">User Journey Tracking</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Events (7d)" value={String(summary?.totalEvents || 0)} subtitle={`${summary?.uniqueUsers || 0} unique users`} icon={Activity} color="blue" testId="stat-journey-events" />
        <StatCard title="Signups" value={String(summary?.funnelConversion?.signups || 0)} subtitle="New registrations" icon={Users} color="emerald" testId="stat-journey-signups" />
        <StatCard title="Payments" value={String(summary?.funnelConversion?.payments || 0)} subtitle="Completed payments" icon={DollarSign} color="green" testId="stat-journey-payments" />
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Event Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="section-event-counts">
          {summary?.eventCounts && Object.entries(summary.eventCounts).map(([event, count]: [string, any]) => (
            <div key={event} className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-zinc-200">{count}</div>
              <div className="text-xs text-zinc-500 capitalize">{event.replace(/_/g, " ")}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-400">Event Log</h3>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setEventFilter("")}
              className={`px-2 py-1 text-xs rounded ${!eventFilter ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"}`}
              data-testid="filter-all"
            >
              All
            </button>
            {eventTypes.map(type => (
              <button
                key={type}
                onClick={() => setEventFilter(type)}
                className={`px-2 py-1 text-xs rounded ${eventFilter === type ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"}`}
                data-testid={`filter-${type}`}
              >
                {type.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto" data-testid="section-event-log">
          {events?.map((ev: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-zinc-800/30 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-zinc-500 font-mono text-xs">{new Date(ev.timestamp).toLocaleString()}</span>
                <Badge className="bg-blue-500/20 text-blue-400 text-xs">{ev.event}</Badge>
                <span className="text-zinc-400">User: {ev.userId}</span>
              </div>
              {ev.traceId && <span className="text-zinc-600 font-mono text-xs">{ev.traceId.slice(0, 20)}...</span>}
            </div>
          ))}
          {(!events || events.length === 0) && <p className="text-zinc-500 text-sm py-4 text-center">No events recorded yet</p>}
        </div>
      </Card>
    </div>
  );
}

function ConfigTab() {
  const { data: config, isLoading } = useQuery({
    queryKey: ["founder-debug-config"],
    queryFn: () => api.admin.founderDebug.config(),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: any) => api.admin.founderDebug.updateConfig(updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["founder-debug-config"] }),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6" data-testid="section-config">
      <h2 className="text-xl font-bold">Founder Controls</h2>

      <Card className="bg-zinc-900/50 border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4" /> AI Usage Limits
        </h3>
        <div className="space-y-4" data-testid="section-ai-limits-config">
          <ConfigRow
            label="Enable AI Limits"
            value={config?.aiUsageLimits?.enabled}
            type="toggle"
            onChange={(val: boolean) => updateMutation.mutate({ aiUsageLimits: { enabled: val } })}
            testId="toggle-ai-limits"
          />
          <ConfigRow
            label="Max Daily Tokens"
            value={config?.aiUsageLimits?.maxDailyTokens}
            type="number"
            onChange={(val: number) => updateMutation.mutate({ aiUsageLimits: { maxDailyTokens: val } })}
            testId="input-max-tokens"
          />
          <ConfigRow
            label="Max Cost Per Day (USD)"
            value={config?.aiUsageLimits?.maxCostPerDayUsd}
            type="number"
            onChange={(val: number) => updateMutation.mutate({ aiUsageLimits: { maxCostPerDayUsd: val } })}
            testId="input-max-cost"
          />
          <ConfigRow
            label="Max Requests/Minute"
            value={config?.aiUsageLimits?.maxRequestsPerMinute}
            type="number"
            onChange={(val: number) => updateMutation.mutate({ aiUsageLimits: { maxRequestsPerMinute: val } })}
            testId="input-max-rpm"
          />
        </div>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Cost Throttling
        </h3>
        <div className="space-y-4" data-testid="section-cost-throttling">
          <ConfigRow
            label="Enable Cost Throttling"
            value={config?.costThrottling?.enabled}
            type="toggle"
            onChange={(val: boolean) => updateMutation.mutate({ costThrottling: { enabled: val } })}
            testId="toggle-cost-throttle"
          />
          <ConfigRow
            label="Throttle Above (USD)"
            value={config?.costThrottling?.throttleAboveUsd}
            type="number"
            onChange={(val: number) => updateMutation.mutate({ costThrottling: { throttleAboveUsd: val } })}
            testId="input-throttle-above"
          />
          <ConfigRow
            label="Reject Above (USD)"
            value={config?.costThrottling?.rejectAboveUsd}
            type="number"
            onChange={(val: number) => updateMutation.mutate({ costThrottling: { rejectAboveUsd: val } })}
            testId="input-reject-above"
          />
        </div>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4" /> Feature Toggles
        </h3>
        <div className="space-y-3" data-testid="section-feature-toggles">
          {config?.featureToggles && Object.entries(config.featureToggles).map(([key, enabled]: [string, any]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-zinc-800/30">
              <span className="text-sm text-zinc-300 capitalize">{key.replace(/_/g, " ")}</span>
              <Switch
                checked={enabled}
                onCheckedChange={(val: boolean) => updateMutation.mutate({ featureToggles: { [key]: val } })}
                data-testid={`toggle-feature-${key}`}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Margin Configuration
        </h3>
        <div className="space-y-4" data-testid="section-margin-config">
          <ConfigRow
            label="Minimum Margin %"
            value={config?.marginConfig?.minimumMarginPercent}
            type="number"
            onChange={(val: number) => updateMutation.mutate({ marginConfig: { minimumMarginPercent: val } })}
            testId="input-min-margin"
          />
          <ConfigRow
            label="Target Margin %"
            value={config?.marginConfig?.targetMarginPercent}
            type="number"
            onChange={(val: number) => updateMutation.mutate({ marginConfig: { targetMarginPercent: val } })}
            testId="input-target-margin"
          />
          <ConfigRow
            label="Alert Below %"
            value={config?.marginConfig?.alertBelowPercent}
            type="number"
            onChange={(val: number) => updateMutation.mutate({ marginConfig: { alertBelowPercent: val } })}
            testId="input-alert-margin"
          />
        </div>
      </Card>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color, testId }: { title: string; value: string; subtitle: string; icon: any; color: string; testId: string }) {
  const colorMap: Record<string, string> = {
    purple: "text-purple-400 bg-purple-500/20",
    green: "text-emerald-400 bg-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/20",
    yellow: "text-yellow-400 bg-yellow-500/20",
    red: "text-red-400 bg-red-500/20",
    emerald: "text-emerald-400 bg-emerald-500/20",
  };
  return (
    <Card className="bg-zinc-900/50 border-zinc-800 p-4" data-testid={testId}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-xl font-bold text-zinc-100 font-mono">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>
    </Card>
  );
}

function LimitBar({ label, percent, detail }: { label: string; percent: number; detail: string }) {
  const color = percent > 90 ? "bg-red-500" : percent > 70 ? "bg-yellow-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>{label}</span>
        <span className="font-mono">{detail} ({percent}%)</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function ConfigRow({ label, value, type, onChange, testId }: { label: string; value: any; type: "toggle" | "number"; onChange: (val: any) => void; testId: string }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => { setLocalValue(value); }, [value]);

  if (type === "toggle") {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">{label}</span>
        <Switch checked={localValue} onCheckedChange={onChange} data-testid={testId} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-zinc-300">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={localValue ?? ""}
          onChange={e => setLocalValue(Number(e.target.value))}
          onBlur={() => { if (localValue !== value) onChange(localValue); }}
          className="w-32 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 font-mono text-right focus:border-emerald-500 outline-none"
          data-testid={testId}
        />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 bg-zinc-900/50 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
