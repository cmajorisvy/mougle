import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Radio, Users, Clock, ChevronRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useState } from "react";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    lobby: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    live: "bg-red-500/20 text-red-400 border-red-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${colors[status] || "bg-gray-500/20 text-gray-400"}`}>
      {status === "live" && <Radio className="w-3 h-3 animate-pulse" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function Debates() {
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", topic: "", description: "", totalRounds: 5, turnDurationSeconds: 60 });

  const { data: debates = [], isLoading } = useQuery({
    queryKey: ["/api/debates"],
    queryFn: () => api.debates.list(),
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.debates.create(data),
    onSuccess: (debate: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/debates"] });
      setShowCreate(false);
      navigate(`/debate/${debate.id}`);
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold" data-testid="text-debates-title">Live Debates</h1>
            <p className="text-sm text-muted-foreground mt-1">AI agents and humans debating in real-time</p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} className="gap-2" data-testid="button-create-debate">
            <Plus className="w-4 h-4" />
            New Debate
          </Button>
        </div>

        {showCreate && (
          <Card className="p-6 bg-card border-white/10 space-y-4" data-testid="card-create-debate">
            <h3 className="text-lg font-semibold">Create New Debate</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Title</label>
                <Input
                  placeholder="e.g. AI vs Human Creativity"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="bg-background border-white/10"
                  data-testid="input-debate-title"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Topic</label>
                <Input
                  placeholder="e.g. Can AI be truly creative?"
                  value={form.topic}
                  onChange={e => setForm({ ...form, topic: e.target.value })}
                  className="bg-background border-white/10"
                  data-testid="input-debate-topic"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Description</label>
              <Input
                placeholder="Brief description of the debate..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="bg-background border-white/10"
                data-testid="input-debate-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Rounds</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.totalRounds}
                  onChange={e => setForm({ ...form, totalRounds: parseInt(e.target.value) || 5 })}
                  className="bg-background border-white/10"
                  data-testid="input-debate-rounds"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Turn Duration (seconds)</label>
                <Input
                  type="number"
                  min={15}
                  max={300}
                  value={form.turnDurationSeconds}
                  onChange={e => setForm({ ...form, turnDurationSeconds: parseInt(e.target.value) || 60 })}
                  className="bg-background border-white/10"
                  data-testid="input-debate-duration"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-white/10" data-testid="button-cancel-create">
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate({ ...form, createdBy: "system" })}
                disabled={!form.title || !form.topic || createMutation.isPending}
                data-testid="button-submit-debate"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Debate
              </Button>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : debates.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Radio className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No debates yet</p>
            <p className="text-sm">Create the first debate to get started!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {debates.map((debate: any) => (
              <Card
                key={debate.id}
                className="p-5 bg-card border-white/10 hover:border-white/20 cursor-pointer transition-all group"
                onClick={() => navigate(`/debate/${debate.id}`)}
                data-testid={`card-debate-${debate.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <StatusBadge status={debate.status} />
                      <span className="text-xs text-muted-foreground">
                        {debate.totalRounds} rounds · {debate.turnDurationSeconds}s turns
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors" data-testid={`text-debate-title-${debate.id}`}>
                      {debate.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{debate.topic}</p>
                    {debate.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{debate.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{debate.maxAgents + debate.maxHumans}</span>
                    </div>
                    {debate.status === "live" && (
                      <div className="flex items-center gap-1 text-red-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">LIVE</span>
                      </div>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
