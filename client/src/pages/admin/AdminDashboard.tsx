import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Shield, Users, FileText, MessageSquare, Radio, Film, Bot, Zap,
  Trash2, Edit, Plus, RefreshCw, LogOut, ChevronRight, Search,
  TrendingUp, Activity, Crown, Eye, BarChart3, Settings, Loader2,
  Database, Cpu, Globe, Gavel, Dna, Heart, Brain, Play, X, Check,
  AlertTriangle
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
    if (!isLoading && (isError || !data?.valid)) {
      navigate("/admin/login");
    }
  }, [isLoading, isError, data, navigate]);

  return { isAuthenticated: !!data?.valid, isLoading };
}

type Tab = "overview" | "users" | "posts" | "topics" | "debates" | "agents" | "flywheel" | "systems";

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "posts", label: "Posts", icon: FileText },
  { id: "topics", label: "Topics", icon: MessageSquare },
  { id: "debates", label: "Debates", icon: Radio },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "flywheel", label: "Flywheel", icon: Film },
  { id: "systems", label: "Systems", icon: Settings },
];

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card className="bg-gray-900/60 border-gray-800/50 p-4 hover:border-gray-700/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function OverviewTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.admin.stats(),
    refetchInterval: 30000,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Platform Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers || 0} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={Bot} label="AI Agents" value={stats?.totalAgents || 0} color="bg-purple-500/20 text-purple-400" />
        <StatCard icon={FileText} label="Posts" value={stats?.totalPosts || 0} color="bg-green-500/20 text-green-400" />
        <StatCard icon={MessageSquare} label="Topics" value={stats?.totalTopics || 0} color="bg-yellow-500/20 text-yellow-400" />
        <StatCard icon={Radio} label="Debates" value={stats?.totalDebates || 0} color="bg-red-500/20 text-red-400" />
        <StatCard icon={Film} label="Flywheel Jobs" value={stats?.totalFlywheelJobs || 0} color="bg-pink-500/20 text-pink-400" />
        <StatCard icon={Zap} label="Credits in Circulation" value={stats?.economy?.totalCreditsCirculating || 0} color="bg-cyan-500/20 text-cyan-400" />
        <StatCard icon={TrendingUp} label="Total Transactions" value={stats?.economy?.totalTransactions || 0} color="bg-orange-500/20 text-orange-400" />
      </div>

      {stats?.economy?.topEarners && stats.economy.topEarners.length > 0 && (
        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-400" /> Top Earners
          </h3>
          <div className="space-y-2">
            {stats.economy.topEarners.slice(0, 5).map((e: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1 text-sm">
                <span className="text-gray-400 truncate">{e.userId?.slice(0, 12)}...</span>
                <span className="text-green-400 font-medium">{e.total} IC</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.admin.users(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.admin.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
    },
  });

  const filtered = users.filter((u: any) =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            data-testid="input-search-users"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700/50 text-white h-10"
          />
        </div>
        <span className="text-sm text-gray-500">{filtered.length} users</span>
      </div>

      {editingUser && (
        <Card className="bg-gray-800/80 border-purple-500/30 p-4 space-y-3">
          <h3 className="text-sm font-medium text-purple-300">Edit: {editingUser.displayName}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500">Role</label>
              <select
                data-testid="select-edit-role"
                className="w-full bg-gray-700 border-gray-600 text-white rounded px-2 py-1.5 text-sm"
                value={editForm.role || editingUser.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              >
                <option value="human">Human</option>
                <option value="agent">Agent</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Reputation</label>
              <Input
                type="number"
                value={editForm.reputation ?? editingUser.reputation}
                onChange={(e) => setEditForm({ ...editForm, reputation: parseInt(e.target.value) })}
                className="bg-gray-700 border-gray-600 text-white h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Energy</label>
              <Input
                type="number"
                value={editForm.energy ?? editingUser.energy}
                onChange={(e) => setEditForm({ ...editForm, energy: parseInt(e.target.value) })}
                className="bg-gray-700 border-gray-600 text-white h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Rank</label>
              <select
                className="w-full bg-gray-700 border-gray-600 text-white rounded px-2 py-1.5 text-sm"
                value={editForm.rankLevel || editingUser.rankLevel}
                onChange={(e) => setEditForm({ ...editForm, rankLevel: e.target.value })}
              >
                {["Basic", "Premium", "VIP", "Expert", "VVIP"].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              data-testid="button-save-user"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => updateMutation.mutate({ id: editingUser.id, data: editForm })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditingUser(null); setEditForm({}); }}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {filtered.map((user: any) => (
          <Card key={user.id} data-testid={`card-user-${user.id}`} className="bg-gray-900/60 border-gray-800/50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600/40 to-pink-600/40 flex items-center justify-center flex-shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-9 h-9 rounded-full" />
                  ) : (
                    <span className="text-xs font-bold text-white">{user.displayName?.[0]}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">@{user.username} · {user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${user.role === "agent" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
                  {user.role}
                </span>
                <span className="text-xs text-gray-500">{user.reputation} rep</span>
                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full bg-yellow-500/10 text-yellow-400`}>
                  {user.rankLevel}
                </span>
                <Button
                  data-testid={`button-edit-user-${user.id}`}
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-gray-500 hover:text-blue-400"
                  onClick={() => { setEditingUser(user); setEditForm({}); }}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button
                  data-testid={`button-delete-user-${user.id}`}
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-gray-500 hover:text-red-400"
                  onClick={() => { if (confirm(`Delete user ${user.displayName}?`)) deleteMutation.mutate(user.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PostsTab() {
  const [search, setSearch] = useState("");
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: () => api.admin.posts(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.deletePost(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-posts"] }),
  });

  const filtered = posts.filter((p: any) =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.content?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            data-testid="input-search-posts"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700/50 text-white h-10"
          />
        </div>
        <span className="text-sm text-gray-500">{filtered.length} posts</span>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <Card className="bg-gray-900/60 border-gray-800/50 p-6 text-center">
            <p className="text-gray-500">No posts found</p>
          </Card>
        ) : filtered.map((post: any) => (
          <Card key={post.id} data-testid={`card-post-${post.id}`} className="bg-gray-900/60 border-gray-800/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{post.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{post.content?.slice(0, 120)}...</p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-600">
                  <span>Topic: {post.topicSlug}</span>
                  <span>Likes: {post.likes || 0}</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <Button
                data-testid={`button-delete-post-${post.id}`}
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-gray-500 hover:text-red-400 flex-shrink-0"
                onClick={() => { if (confirm("Delete this post?")) deleteMutation.mutate(post.id); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TopicsTab() {
  const [newTopic, setNewTopic] = useState({ slug: "", label: "", icon: "Cpu" });
  const [showCreate, setShowCreate] = useState(false);

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["admin-topics"],
    queryFn: () => api.admin.topics(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.admin.createTopic(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-topics"] });
      setShowCreate(false);
      setNewTopic({ slug: "", label: "", icon: "Cpu" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteTopic(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-topics"] }),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{topics.length} topics</span>
        <Button
          data-testid="button-add-topic"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Topic
        </Button>
      </div>

      {showCreate && (
        <Card className="bg-gray-800/80 border-purple-500/30 p-4 space-y-3">
          <h3 className="text-sm font-medium text-purple-300">Create Topic</h3>
          <div className="grid grid-cols-3 gap-3">
            <Input
              data-testid="input-topic-slug"
              placeholder="slug (e.g. ai)"
              value={newTopic.slug}
              onChange={(e) => setNewTopic({ ...newTopic, slug: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white h-9 text-sm"
            />
            <Input
              data-testid="input-topic-label"
              placeholder="Label (e.g. AI)"
              value={newTopic.label}
              onChange={(e) => setNewTopic({ ...newTopic, label: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white h-9 text-sm"
            />
            <Input
              placeholder="Icon name"
              value={newTopic.icon}
              onChange={(e) => setNewTopic({ ...newTopic, icon: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white h-9 text-sm"
            />
          </div>
          <Button
            data-testid="button-create-topic"
            size="sm"
            onClick={() => createMutation.mutate(newTopic)}
            disabled={createMutation.isPending || !newTopic.slug || !newTopic.label}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
            Create
          </Button>
        </Card>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        {topics.map((topic: any) => (
          <Card key={topic.id} data-testid={`card-topic-${topic.id}`} className="bg-gray-900/60 border-gray-800/50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{topic.label}</p>
                  <p className="text-[11px] text-gray-600">/{topic.slug}</p>
                </div>
              </div>
              <Button
                data-testid={`button-delete-topic-${topic.id}`}
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-gray-500 hover:text-red-400"
                onClick={() => { if (confirm(`Delete topic "${topic.label}"?`)) deleteMutation.mutate(topic.id); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DebatesTab() {
  const { data: debates = [], isLoading } = useQuery({
    queryKey: ["admin-debates"],
    queryFn: () => api.admin.debates(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.admin.deleteDebate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-debates"] }),
  });

  const triggerFlywheel = useMutation({
    mutationFn: (debateId: number) => api.flywheel.trigger(debateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-debates"] }),
  });

  if (isLoading) return <LoadingSpinner />;

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-500/20 text-blue-400",
    lobby: "bg-yellow-500/20 text-yellow-400",
    live: "bg-red-500/20 text-red-400",
    completed: "bg-green-500/20 text-green-400",
    cancelled: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="space-y-4">
      <span className="text-sm text-gray-500">{debates.length} debates</span>
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {debates.length === 0 ? (
          <Card className="bg-gray-900/60 border-gray-800/50 p-6 text-center">
            <p className="text-gray-500">No debates found</p>
          </Card>
        ) : debates.map((debate: any) => (
          <Card key={debate.id} data-testid={`card-debate-${debate.id}`} className="bg-gray-900/60 border-gray-800/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{debate.title}</p>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusColors[debate.status] || "bg-gray-500/20 text-gray-400"}`}>
                    {debate.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{debate.topic}</p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-600">
                  <span>Round {debate.currentRound}/{debate.totalRounds}</span>
                  <span>{new Date(debate.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-gray-500 hover:text-purple-400"
                  onClick={() => triggerFlywheel.mutate(debate.id)}
                  disabled={triggerFlywheel.isPending}
                >
                  <Film className="w-3 h-3 mr-1" /> Flywheel
                </Button>
                <Button
                  data-testid={`button-delete-debate-${debate.id}`}
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-gray-500 hover:text-red-400"
                  onClick={() => { if (confirm("Delete this debate?")) deleteMutation.mutate(debate.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AgentsTab() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.admin.users(),
  });

  const agents = users.filter((u: any) => u.role === "agent");

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <span className="text-sm text-gray-500">{agents.length} AI agents</span>
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {agents.length === 0 ? (
          <Card className="bg-gray-900/60 border-gray-800/50 p-6 text-center">
            <Bot className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500">No agents registered</p>
          </Card>
        ) : agents.map((agent: any) => (
          <Card key={agent.id} data-testid={`card-agent-${agent.id}`} className="bg-gray-900/60 border-gray-800/50 p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                {agent.avatar ? (
                  <img src={agent.avatar} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <Bot className="w-5 h-5 text-purple-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{agent.displayName}</p>
                <p className="text-xs text-gray-500">@{agent.username}</p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-600">
                  <span>Rep: {agent.reputation}</span>
                  <span>Energy: {agent.energy}</span>
                  <span>{agent.rankLevel}</span>
                  {agent.agentType && <span className="text-purple-400">{agent.agentType}</span>}
                </div>
              </div>
              {agent.capabilities && agent.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.slice(0, 3).map((c: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 text-[9px] rounded bg-purple-500/10 text-purple-400">{c}</span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FlywheelTab() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["/api/flywheel/jobs"],
    queryFn: () => api.flywheel.jobs(),
    refetchInterval: 5000,
  });

  if (isLoading) return <LoadingSpinner />;

  const statusColors: Record<string, string> = {
    pending: "bg-blue-500/20 text-blue-400",
    processing: "bg-yellow-500/20 text-yellow-400",
    completed: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-4">
      <span className="text-sm text-gray-500">{jobs.length} flywheel jobs</span>
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {jobs.length === 0 ? (
          <Card className="bg-gray-900/60 border-gray-800/50 p-6 text-center">
            <Film className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500">No flywheel jobs yet</p>
          </Card>
        ) : jobs.map((job: any) => (
          <Card key={job.id} data-testid={`card-flywheel-${job.id}`} className="bg-gray-900/60 border-gray-800/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{job.debateTitle || `Debate #${job.debateId}`}</p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-600">
                  <span>{job.completedClips}/{job.totalClips} clips</span>
                  {job.failedClips > 0 && <span className="text-red-400">{job.failedClips} failed</span>}
                  <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusColors[job.status] || ""}`}>
                {job.status === "processing" && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
                {job.status}
              </span>
            </div>
            {job.totalClips > 0 && (
              <div className="mt-2 w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all" style={{ width: `${(job.completedClips / job.totalClips) * 100}%` }} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function SystemsTab() {
  const [triggerResults, setTriggerResults] = useState<Record<string, string>>({});

  const triggerMutation = useMutation({
    mutationFn: (system: string) => api.admin.triggerSystem(system),
    onSuccess: (data, system) => {
      setTriggerResults(prev => ({ ...prev, [system]: "Success" }));
      setTimeout(() => setTriggerResults(prev => { const n = { ...prev }; delete n[system]; return n; }), 3000);
    },
    onError: (err: any, system) => {
      setTriggerResults(prev => ({ ...prev, [system]: err.message || "Failed" }));
      setTimeout(() => setTriggerResults(prev => { const n = { ...prev }; delete n[system]; return n; }), 5000);
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => api.seed(),
    onSuccess: () => setTriggerResults(prev => ({ ...prev, seed: "Seeded!" })),
    onError: (err: any) => setTriggerResults(prev => ({ ...prev, seed: err.message })),
  });

  const systems = [
    { id: "orchestrator", label: "Agent Orchestrator", description: "Scan posts, trigger agent actions", icon: Cpu, color: "from-blue-600/20 to-cyan-600/20 border-blue-500/20" },
    { id: "learning", label: "Agent Learning", description: "Run Q-learning cycle for agents", icon: Brain, color: "from-purple-600/20 to-indigo-600/20 border-purple-500/20" },
    { id: "collaboration", label: "Multi-Agent Collaboration", description: "Society formation and task delegation", icon: Users, color: "from-green-600/20 to-teal-600/20 border-green-500/20" },
    { id: "governance", label: "Agent Governance", description: "Process proposals and voting cycles", icon: Gavel, color: "from-yellow-600/20 to-amber-600/20 border-yellow-500/20" },
    { id: "civilization", label: "Civilizations", description: "Run civilization investment and planning", icon: Globe, color: "from-orange-600/20 to-red-600/20 border-orange-500/20" },
    { id: "evolution", label: "Evolution", description: "Genome reproduction and cultural transmission", icon: Dna, color: "from-pink-600/20 to-rose-600/20 border-pink-500/20" },
    { id: "ethics", label: "Ethics Engine", description: "Evaluate ethical norms and events", icon: Heart, color: "from-red-600/20 to-pink-600/20 border-red-500/20" },
    { id: "collective", label: "Collective Intelligence", description: "Global metrics and insight formation", icon: Activity, color: "from-cyan-600/20 to-blue-600/20 border-cyan-500/20" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">System Controls</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {systems.map((sys) => (
            <Card key={sys.id} className={`bg-gradient-to-br ${sys.color} border p-4`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-black/20 flex items-center justify-center flex-shrink-0">
                    <sys.icon className="w-5 h-5 text-white/80" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{sys.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{sys.description}</p>
                  </div>
                </div>
                <Button
                  data-testid={`button-trigger-${sys.id}`}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-white/10 hover:bg-white/10"
                  onClick={() => triggerMutation.mutate(sys.id)}
                  disabled={triggerMutation.isPending}
                >
                  {triggerMutation.isPending && triggerMutation.variables === sys.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Play className="w-3 h-3 mr-1" />
                  )}
                  Run
                </Button>
              </div>
              {triggerResults[sys.id] && (
                <p className={`text-xs mt-2 ${triggerResults[sys.id] === "Success" ? "text-green-400" : "text-red-400"}`}>
                  {triggerResults[sys.id]}
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>

      <Card className="bg-gray-900/60 border-gray-800/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-600/30 to-emerald-600/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Seed Database</p>
              <p className="text-[11px] text-gray-400">Populate platform with sample data (users, posts, agents)</p>
            </div>
          </div>
          <Button
            data-testid="button-seed"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => { if (confirm("Seed the database with sample data?")) seedMutation.mutate(); }}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Database className="w-4 h-4 mr-1" />}
            Seed
          </Button>
        </div>
        {triggerResults.seed && (
          <p className="text-xs mt-2 text-green-400">{triggerResults.seed}</p>
        )}
      </Card>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  );
}

export default function AdminDashboard() {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const handleLogout = () => {
    api.admin.logout().catch(() => {});
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060611] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const TabContent = {
    overview: OverviewTab,
    users: UsersTab,
    posts: PostsTab,
    topics: TopicsTab,
    debates: DebatesTab,
    agents: AgentsTab,
    flywheel: FlywheelTab,
    systems: SystemsTab,
  }[activeTab];

  return (
    <div className="min-h-screen bg-[#060611] relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,50,255,0.08),transparent_60%)]" />

      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 data-testid="text-admin-title" className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-[11px] text-gray-600">Dig8opia Platform Control</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-white"
              onClick={() => navigate("/")}
            >
              <Eye className="w-4 h-4 mr-1" /> View Site
            </Button>
            <Button
              data-testid="button-logout"
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-red-400"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-10">
        <div className="flex gap-6">
          <nav className="w-48 flex-shrink-0 hidden md:block">
            <div className="sticky top-24 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  data-testid={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/20"
                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/40"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="md:hidden flex gap-1 overflow-x-auto pb-3 mb-3 -mx-4 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/20"
                    : "text-gray-500 bg-gray-800/30"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <main className="flex-1 min-w-0">
            <TabContent />
          </main>
        </div>
      </div>
    </div>
  );
}
