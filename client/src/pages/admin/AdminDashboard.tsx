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
  AlertTriangle, Share2, Send, Clock, ToggleLeft, ToggleRight,
  Sparkles, ExternalLink, Sliders, CheckCircle, Star
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

type Tab = "overview" | "users" | "posts" | "topics" | "debates" | "agents" | "flywheel" | "social" | "promotion" | "growth" | "systems" | "moderation" | "seo" | "authority" | "gravity" | "civilization" | "trust" | "teams" | "stability";

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "moderation", label: "Moderation", icon: Shield },
  { id: "users", label: "Users", icon: Users },
  { id: "posts", label: "Posts", icon: FileText },
  { id: "topics", label: "Topics", icon: MessageSquare },
  { id: "debates", label: "Debates", icon: Radio },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "flywheel", label: "Flywheel", icon: Film },
  { id: "social", label: "Social", icon: Share2 },
  { id: "promotion", label: "Promotion", icon: Zap },
  { id: "growth", label: "Growth Brain", icon: Brain },
  { id: "seo", label: "SEO Center", icon: Globe },
  { id: "authority", label: "Authority", icon: Crown },
  { id: "gravity", label: "Gravity", icon: Activity },
  { id: "civilization", label: "Civilization", icon: Database },
  { id: "trust", label: "Trust Network", icon: Shield },
  { id: "teams", label: "AI Teams", icon: Users },
  { id: "stability", label: "Stability", icon: Heart },
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

const PLATFORM_ICONS: Record<string, string> = {
  twitter: "X",
  linkedin: "in",
  facebook: "f",
  reddit: "r",
};

const CONTENT_TYPES = ["news", "breaking", "debate", "post", "trending"];

function SocialTab() {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newPlatform, setNewPlatform] = useState("twitter");
  const [newName, setNewName] = useState("");
  const [captionPreview, setCaptionPreview] = useState<any>(null);
  const [previewContentType, setPreviewContentType] = useState("news");
  const [previewContentId, setPreviewContentId] = useState("");

  const { data: accounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ["admin-social-accounts"],
    queryFn: () => api.social.accounts(),
  });

  const { data: posts = [], refetch: refetchPosts } = useQuery({
    queryKey: ["admin-social-posts"],
    queryFn: () => api.social.posts(30),
  });

  const createAccountMutation = useMutation({
    mutationFn: (data: any) => api.social.createAccount(data),
    onSuccess: () => { refetchAccounts(); setShowAddAccount(false); setNewName(""); },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.social.updateAccount(id, data),
    onSuccess: () => refetchAccounts(),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: number) => api.social.deleteAccount(id),
    onSuccess: () => refetchAccounts(),
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => api.social.publishPost(id),
    onSuccess: () => refetchPosts(),
  });

  const triggerPublishMutation = useMutation({
    mutationFn: () => api.social.triggerPublish(),
    onSuccess: () => { refetchPosts(); refetchAccounts(); },
  });

  const captionMutation = useMutation({
    mutationFn: (data: { contentType: string; contentId: string; platform?: string }) =>
      api.social.generateCaption(data),
    onSuccess: (data) => setCaptionPreview(data),
  });

  const toggleAutoPost = (account: any) => {
    updateAccountMutation.mutate({ id: account.id, data: { autoPostEnabled: !account.autoPostEnabled } });
  };

  const toggleContentType = (account: any, type: string) => {
    const current = account.contentTypes || [];
    const updated = current.includes(type)
      ? current.filter((t: string) => t !== type)
      : [...current, type];
    updateAccountMutation.mutate({ id: account.id, data: { contentTypes: updated } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">Social Media Automation</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => triggerPublishMutation.mutate()}
            disabled={triggerPublishMutation.isPending}
            className="gap-1.5 border-gray-700"
            data-testid="button-trigger-social-publish"
          >
            <Send className="w-3.5 h-3.5" />
            {triggerPublishMutation.isPending ? "Publishing..." : "Publish Now"}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddAccount(true)}
            className="gap-1.5 bg-purple-600 hover:bg-purple-700"
            data-testid="button-add-social-account"
          >
            <Plus className="w-3.5 h-3.5" /> Add Account
          </Button>
        </div>
      </div>

      {showAddAccount && (
        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-medium mb-3">Connect Social Account</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Platform</label>
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                data-testid="select-social-platform"
              >
                <option value="twitter">X (Twitter)</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
                <option value="reddit">Reddit</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Account Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="@dig8opia"
                className="mt-1 bg-gray-800 border-gray-700"
                data-testid="input-social-account-name"
              />
            </div>
            <Button
              size="sm"
              onClick={() => createAccountMutation.mutate({
                platform: newPlatform,
                accountName: newName,
                autoPostEnabled: true,
                contentTypes: CONTENT_TYPES,
              })}
              disabled={!newName || createAccountMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-save-social-account"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddAccount(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            OAuth integration is stubbed. Accounts will generate captions and track publish history for when live API keys are configured.
          </p>
        </Card>
      )}

      <div className="grid gap-4">
        {accounts.length === 0 && !showAddAccount ? (
          <Card className="bg-gray-900/60 border-gray-800/50 p-8 text-center">
            <Share2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No social accounts connected yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add accounts to enable automatic social media posting</p>
          </Card>
        ) : (
          accounts.map((account: any) => (
            <Card key={account.id} className="bg-gray-900/60 border-gray-800/50 p-4" data-testid={`social-account-${account.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                    account.platform === "twitter" ? "bg-gray-800" :
                    account.platform === "linkedin" ? "bg-blue-700" :
                    account.platform === "facebook" ? "bg-blue-600" :
                    "bg-orange-600"
                  }`}>
                    {PLATFORM_ICONS[account.platform] || "?"}
                  </div>
                  <div>
                    <div className="font-medium">{account.accountName || account.platform}</div>
                    <div className="text-xs text-muted-foreground capitalize">{account.platform}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAutoPost(account)}
                    className="flex items-center gap-1.5 text-xs"
                    data-testid={`toggle-autopost-${account.id}`}
                  >
                    {account.autoPostEnabled ? (
                      <><ToggleRight className="w-5 h-5 text-green-400" /><span className="text-green-400">Auto</span></>
                    ) : (
                      <><ToggleLeft className="w-5 h-5 text-gray-500" /><span className="text-gray-500">Off</span></>
                    )}
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { if (confirm("Remove this social account?")) deleteAccountMutation.mutate(account.id); }}
                    className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    data-testid={`delete-account-${account.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1.5">Auto-post content types:</p>
                <div className="flex flex-wrap gap-1.5">
                  {CONTENT_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleContentType(account, type)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        (account.contentTypes || []).includes(type)
                          ? "bg-purple-600/30 text-purple-300 border border-purple-500/30"
                          : "bg-gray-800/50 text-gray-500 border border-gray-700/50"
                      }`}
                      data-testid={`toggle-content-${account.id}-${type}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="bg-gray-900/60 border-gray-800/50 p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" /> AI Caption Preview
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Content Type</label>
            <select
              value={previewContentType}
              onChange={(e) => setPreviewContentType(e.target.value)}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
              data-testid="select-caption-content-type"
            >
              {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Content ID</label>
            <Input
              value={previewContentId}
              onChange={(e) => setPreviewContentId(e.target.value)}
              placeholder="e.g. 1"
              className="mt-1 bg-gray-800 border-gray-700"
              data-testid="input-caption-content-id"
            />
          </div>
          <Button
            size="sm"
            onClick={() => captionMutation.mutate({ contentType: previewContentType, contentId: previewContentId })}
            disabled={!previewContentId || captionMutation.isPending}
            className="gap-1.5"
            data-testid="button-generate-caption"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {captionMutation.isPending ? "Generating..." : "Preview"}
          </Button>
        </div>
        {captionPreview && (
          <div className="mt-4 space-y-3">
            {Object.entries(captionPreview.captions || captionPreview).map(([platform, caption]: [string, any]) => (
              <div key={platform} className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs font-medium text-purple-300 mb-1 capitalize">{platform}</div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{typeof caption === "string" ? caption : caption?.text || JSON.stringify(caption)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Recent Social Posts
        </h3>
        <div className="space-y-2">
          {posts.length === 0 ? (
            <Card className="bg-gray-900/60 border-gray-800/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">No social posts yet. Posts will appear here when content is auto-published or manually shared.</p>
            </Card>
          ) : (
            posts.map((post: any) => (
              <Card key={post.id} className="bg-gray-900/60 border-gray-800/50 p-3" data-testid={`social-post-${post.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold ${
                      post.platform === "twitter" ? "bg-gray-700" :
                      post.platform === "linkedin" ? "bg-blue-700" :
                      post.platform === "facebook" ? "bg-blue-600" :
                      "bg-orange-600"
                    }`}>
                      {PLATFORM_ICONS[post.platform] || "?"}
                    </div>
                    <div>
                      <span className="text-sm">{post.contentType}:{post.contentId}</span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                        post.status === "published" ? "bg-green-900/30 text-green-400" :
                        post.status === "failed" ? "bg-red-900/30 text-red-400" :
                        post.status === "pending" ? "bg-yellow-900/30 text-yellow-400" :
                        "bg-gray-800 text-gray-400"
                      }`}>
                        {post.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => publishMutation.mutate(post.id)}
                        disabled={publishMutation.isPending}
                        className="h-7 text-xs gap-1"
                        data-testid={`publish-post-${post.id}`}
                      >
                        <Send className="w-3 h-3" /> Publish
                      </Button>
                    )}
                    {post.postUrl && (
                      <a href={post.postUrl} target="_blank" rel="nofollow noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {post.scheduledFor ? new Date(post.scheduledFor).toLocaleDateString() : post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
                {post.caption && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{post.caption}</p>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const SCORE_COLORS: Record<string, string> = {
  auto_promote: "text-green-400",
  review: "text-yellow-400",
  no_promotion: "text-gray-400",
};

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  approved: { bg: "bg-green-900/30", text: "text-green-400" },
  promoted: { bg: "bg-emerald-900/30", text: "text-emerald-400" },
  pending_review: { bg: "bg-yellow-900/30", text: "text-yellow-400" },
  rejected: { bg: "bg-red-900/30", text: "text-red-400" },
  pending: { bg: "bg-gray-800", text: "text-gray-400" },
};

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="w-8 text-right font-mono">{value.toFixed(0)}</span>
    </div>
  );
}

function PromotionTab() {
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [evalContentType, setEvalContentType] = useState("news");
  const [evalContentId, setEvalContentId] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: scores = [], refetch: refetchScores } = useQuery({
    queryKey: ["admin-promotion-scores", filterStatus],
    queryFn: () => api.admin.promotion.scores(50, filterStatus || undefined),
  });

  const { data: reviewQueue = [], refetch: refetchQueue } = useQuery({
    queryKey: ["admin-promotion-review"],
    queryFn: () => api.admin.promotion.reviewQueue(),
  });

  const evaluateMutation = useMutation({
    mutationFn: (data: { contentType: string; contentId: string }) => api.admin.promotion.evaluate(data),
    onSuccess: () => { refetchScores(); refetchQueue(); },
  });

  const evaluateAllMutation = useMutation({
    mutationFn: () => api.admin.promotion.evaluateAll(),
    onSuccess: () => { refetchScores(); refetchQueue(); },
  });

  const overrideMutation = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: string }) => api.admin.promotion.override(id, decision),
    onSuccess: () => { refetchScores(); refetchQueue(); },
  });

  const processMutation = useMutation({
    mutationFn: () => api.admin.promotion.process(),
    onSuccess: () => { refetchScores(); refetchQueue(); },
  });

  const autoPromoted = scores.filter((s: any) => s.decision === "auto_promote" || s.status === "promoted").length;
  const inReview = reviewQueue.length;
  const rejected = scores.filter((s: any) => s.status === "rejected").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" /> AI Promotion Engine
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => evaluateAllMutation.mutate()}
            disabled={evaluateAllMutation.isPending}
            className="gap-1.5 border-gray-700"
            data-testid="button-evaluate-all"
          >
            <Brain className="w-3.5 h-3.5" />
            {evaluateAllMutation.isPending ? "Evaluating..." : "Evaluate All"}
          </Button>
          <Button
            size="sm"
            onClick={() => processMutation.mutate()}
            disabled={processMutation.isPending}
            className="gap-1.5 bg-purple-600 hover:bg-purple-700"
            data-testid="button-process-promotions"
          >
            <Send className="w-3.5 h-3.5" />
            {processMutation.isPending ? "Processing..." : "Process Queue"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <div className="text-2xl font-bold text-green-400">{autoPromoted}</div>
          <div className="text-xs text-muted-foreground mt-1">Auto-Promoted</div>
        </Card>
        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <div className="text-2xl font-bold text-yellow-400">{inReview}</div>
          <div className="text-xs text-muted-foreground mt-1">Needs Review</div>
        </Card>
        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <div className="text-2xl font-bold text-gray-400">{rejected}</div>
          <div className="text-xs text-muted-foreground mt-1">Not Promoted</div>
        </Card>
      </div>

      <Card className="bg-gray-900/60 border-gray-800/50 p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" /> Evaluate Content
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Content Type</label>
            <select
              value={evalContentType}
              onChange={(e) => setEvalContentType(e.target.value)}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
              data-testid="select-eval-content-type"
            >
              {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Content ID</label>
            <Input
              value={evalContentId}
              onChange={(e) => setEvalContentId(e.target.value)}
              placeholder="e.g. 1"
              className="mt-1 bg-gray-800 border-gray-700"
              data-testid="input-eval-content-id"
            />
          </div>
          <Button
            size="sm"
            onClick={() => evaluateMutation.mutate({ contentType: evalContentType, contentId: evalContentId })}
            disabled={!evalContentId || evaluateMutation.isPending}
            className="gap-1.5 bg-purple-600 hover:bg-purple-700"
            data-testid="button-evaluate-content"
          >
            <Brain className="w-3.5 h-3.5" />
            {evaluateMutation.isPending ? "..." : "Evaluate"}
          </Button>
        </div>
      </Card>

      {reviewQueue.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" /> Review Queue ({reviewQueue.length})
          </h3>
          <div className="space-y-2">
            {reviewQueue.map((score: any) => (
              <Card key={score.id} className="bg-yellow-900/10 border-yellow-800/30 p-3" data-testid={`review-item-${score.id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{score.contentType}:{score.contentId}</span>
                    <span className="ml-2 text-yellow-400 font-mono text-sm">{(score.totalScore || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => overrideMutation.mutate({ id: score.id, decision: "auto_promote" })}
                      disabled={overrideMutation.isPending}
                      className="h-7 text-xs gap-1 bg-green-700 hover:bg-green-600"
                      data-testid={`approve-${score.id}`}
                    >
                      <Check className="w-3 h-3" /> Promote
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => overrideMutation.mutate({ id: score.id, decision: "no_promotion" })}
                      disabled={overrideMutation.isPending}
                      className="h-7 text-xs gap-1 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      data-testid={`reject-${score.id}`}
                    >
                      <X className="w-3 h-3" /> Reject
                    </Button>
                  </div>
                </div>
                {score.reasoning && (
                  <p className="text-xs text-muted-foreground mt-1.5">{score.reasoning}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" /> All Scores
          </h3>
          <div className="flex gap-1">
            {["", "approved", "promoted", "pending_review", "rejected"].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  filterStatus === status
                    ? "bg-purple-600/30 text-purple-300 border border-purple-500/30"
                    : "bg-gray-800/50 text-gray-500"
                }`}
                data-testid={`filter-${status || "all"}`}
              >
                {status || "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {scores.length === 0 ? (
            <Card className="bg-gray-900/60 border-gray-800/50 p-8 text-center">
              <Zap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No promotion scores yet</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Evaluate All" to analyze recent content</p>
            </Card>
          ) : (
            scores.map((score: any) => {
              const badge = STATUS_BADGES[score.status] || STATUS_BADGES.pending;
              const isExpanded = expandedId === score.id;
              return (
                <Card
                  key={score.id}
                  className="bg-gray-900/60 border-gray-800/50 p-3 cursor-pointer hover:border-gray-700/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : score.id)}
                  data-testid={`promotion-score-${score.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-lg font-mono font-bold ${
                        (score.totalScore || 0) > 75 ? "text-green-400" :
                        (score.totalScore || 0) >= 60 ? "text-yellow-400" :
                        "text-gray-400"
                      }`}>
                        {(score.totalScore || 0).toFixed(1)}
                      </div>
                      <div>
                        <span className="text-sm font-medium">{score.contentType}:{score.contentId}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                          {score.status}
                        </span>
                        {score.overriddenBy && (
                          <span className="ml-1 text-xs text-purple-400">(overridden)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {score.selectedPlatforms?.length > 0 && (
                        <div className="flex gap-1">
                          {score.selectedPlatforms.map((p: string) => (
                            <span key={p} className="text-xs bg-gray-800 px-1.5 py-0.5 rounded capitalize">{p}</span>
                          ))}
                        </div>
                      )}
                      {score.scheduledAt && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(score.scheduledAt).toLocaleString()}
                        </span>
                      )}
                      {score.status === "pending_review" && (
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            onClick={() => overrideMutation.mutate({ id: score.id, decision: "auto_promote" })}
                            className="h-6 text-xs px-2 bg-green-700 hover:bg-green-600"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => overrideMutation.mutate({ id: score.id, decision: "no_promotion" })}
                            className="h-6 text-xs px-2 text-red-400 hover:bg-red-900/20"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-800/50 space-y-2">
                      <ScoreBar label="Engagement" value={score.engagementVelocity || 0} color="bg-blue-500" />
                      <ScoreBar label="Trust" value={score.trustScore || 0} color="bg-green-500" />
                      <ScoreBar label="Comments" value={score.commentQuality || 0} color="bg-purple-500" />
                      <ScoreBar label="Novelty" value={score.noveltyScore || 0} color="bg-yellow-500" />
                      <ScoreBar label="Debate" value={score.debateActivity || 0} color="bg-pink-500" />
                      <ScoreBar label="Trend" value={score.trendScore || 0} color="bg-cyan-500" />
                      {score.reasoning && (
                        <div className="mt-2 p-2 bg-gray-800/50 rounded text-xs text-muted-foreground">
                          <span className="text-purple-400 font-medium">AI Reasoning: </span>
                          {score.reasoning}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function GrowthBrainTab() {
  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["admin-growth-analytics"],
    queryFn: () => api.admin.growth.analytics(),
  });

  const learnMutation = useMutation({
    mutationFn: () => api.admin.growth.learn(),
    onSuccess: () => refetchAnalytics(),
  });

  const [optimizePlatform, setOptimizePlatform] = useState("twitter");
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const optimizeMutation = useMutation({
    mutationFn: (platform: string) => api.admin.growth.optimize(platform),
    onSuccess: (data) => setOptimizeResult(data),
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            AI Growth Brain
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Self-learning system that optimizes promotion strategies from social media performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            data-testid="button-learn-now"
            size="sm"
            onClick={() => learnMutation.mutate()}
            disabled={learnMutation.isPending}
            className="bg-purple-600/20 text-purple-300 border border-purple-500/20 hover:bg-purple-600/30"
          >
            {learnMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Brain className="w-4 h-4 mr-1" />}
            Learn Now
          </Button>
          <Button
            size="sm"
            onClick={() => refetchAnalytics()}
            className="bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {learnMutation.isSuccess && learnMutation.data && (
        <Card className="bg-green-900/20 border-green-500/20 p-4">
          <div className="flex items-center gap-2 text-green-300 text-sm font-medium mb-2">
            <Check className="w-4 h-4" /> Learning Complete
          </div>
          <p className="text-xs text-green-400/70">
            Collected {learnMutation.data.collected} records, created {learnMutation.data.patternsCreated} new patterns
          </p>
          {learnMutation.data.insights?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {learnMutation.data.insights.map((insight: string, i: number) => (
                <li key={i} className="text-xs text-green-400/60 flex items-start gap-1.5">
                  <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" /> {insight}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Database} label="Performance Records" value={analytics?.totalPerformanceRecords || 0} color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={TrendingUp} label="Viral Posts" value={analytics?.viralPosts?.length || 0} color="bg-green-500/10 text-green-400" />
        <StatCard icon={Sparkles} label="Learned Patterns" value={analytics?.patterns?.length || 0} color="bg-purple-500/10 text-purple-400" />
        <StatCard icon={Activity} label="Prediction Accuracy" value={`${analytics?.predictionAccuracy || 0}%`} color="bg-yellow-500/10 text-yellow-400" />
      </div>

      {analytics?.lastLearnedAt && (
        <p className="text-[11px] text-gray-600">Last learned: {new Date(analytics.lastLearnedAt).toLocaleString()}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Top Viral Posts
          </h3>
          {analytics?.viralPosts?.length > 0 ? (
            <div className="space-y-2">
              {analytics.viralPosts.slice(0, 8).map((post: any, i: number) => (
                <div key={post.id} data-testid={`viral-post-${post.id}`} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30 border border-gray-800/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-bold ${i < 3 ? "text-yellow-400" : "text-gray-500"}`}>#{i + 1}</span>
                    <div className="min-w-0">
                      <span className="text-xs text-white truncate block">{post.contentType}:{post.contentId}</span>
                      <span className="text-[10px] text-gray-500">{post.platform}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-bold text-green-400">{post.viralScore?.toFixed(1)}</span>
                    <div className="text-[10px] text-gray-500">{post.impressions} imp</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p data-testid="text-no-viral" className="text-xs text-gray-500 text-center py-6">No performance data yet. Click "Learn Now" to collect data.</p>
          )}
        </Card>

        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Learned Insights
          </h3>
          {analytics?.patterns?.length > 0 ? (
            <div className="space-y-2">
              {analytics.patterns.map((pattern: any) => (
                <div key={pattern.id} data-testid={`pattern-${pattern.id}`} className="p-2.5 rounded-lg bg-gray-800/30 border border-gray-800/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      pattern.patternType === "timing" ? "bg-blue-500/20 text-blue-300" :
                      pattern.patternType === "content" ? "bg-green-500/20 text-green-300" :
                      "bg-purple-500/20 text-purple-300"
                    }`}>{pattern.patternType}</span>
                    <span className="text-[10px] text-gray-500">{pattern.platform} | {pattern.sampleSize} samples</span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">{pattern.insight}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-gray-500">Confidence:</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${(pattern.confidence || 0) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{((pattern.confidence || 0) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p data-testid="text-no-patterns" className="text-xs text-gray-500 text-center py-6">No patterns learned yet. Run learning cycle to discover insights.</p>
          )}
        </Card>
      </div>

      <Card className="bg-gray-900/60 border-gray-800/50 p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          Platform Performance
        </h3>
        {analytics?.platformStats?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analytics.platformStats.map((stat: any) => (
              <div key={stat.platform} data-testid={`platform-stat-${stat.platform}`} className="p-3 rounded-lg bg-gray-800/30 border border-gray-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white capitalize">{stat.platform}</span>
                  <span className="text-xs text-gray-500">{stat.totalPosts} posts</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Avg Viral Score</span>
                    <span className="text-green-400 font-medium">{stat.avgViralScore}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Avg Impressions</span>
                    <span className="text-blue-300">{stat.avgImpressions}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Avg Clicks</span>
                    <span className="text-cyan-300">{stat.avgClicks}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Avg Shares</span>
                    <span className="text-pink-300">{stat.avgShares}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Best Time</span>
                    <span className="text-yellow-300">{stat.bestHour}:00 {dayNames[stat.bestDay]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-4">No platform data available yet.</p>
        )}
      </Card>

      <Card className="bg-gray-900/60 border-gray-800/50 p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Strategy Optimizer
        </h3>
        <div className="flex items-center gap-3 mb-3">
          <select
            data-testid="select-optimize-platform"
            value={optimizePlatform}
            onChange={(e) => setOptimizePlatform(e.target.value)}
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="twitter">Twitter/X</option>
            <option value="linkedin">LinkedIn</option>
            <option value="facebook">Facebook</option>
            <option value="reddit">Reddit</option>
          </select>
          <Button
            data-testid="button-optimize"
            size="sm"
            onClick={() => optimizeMutation.mutate(optimizePlatform)}
            disabled={optimizeMutation.isPending}
            className="bg-cyan-600/20 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-600/30"
          >
            {optimizeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Cpu className="w-4 h-4 mr-1" />}
            Optimize
          </Button>
        </div>
        {optimizeResult && (
          <div data-testid="optimize-result" className="p-3 rounded-lg bg-cyan-900/10 border border-cyan-500/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-gray-500 block">Best Hour</span>
                <span className="text-sm font-bold text-cyan-300">{optimizeResult.bestHour}:00</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Best Day</span>
                <span className="text-sm font-bold text-cyan-300">{dayNames[optimizeResult.bestDay]}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Caption Length</span>
                <span className="text-sm font-bold text-cyan-300">{optimizeResult.captionLength} chars</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Hashtags</span>
                <span className="text-sm font-bold text-cyan-300">{optimizeResult.hashtagCount}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-gray-500">Confidence:</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${(optimizeResult.confidence || 0) * 100}%` }} />
              </div>
              <span className="text-[10px] text-gray-400">{((optimizeResult.confidence || 0) * 100).toFixed(0)}%</span>
            </div>
            {optimizeResult.platforms?.length > 0 && (
              <div className="mt-2">
                <span className="text-[10px] text-gray-500">Ranked platforms: </span>
                <span className="text-[10px] text-cyan-300">{optimizeResult.platforms.join(" > ")}</span>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function SEOCenterTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["seo-stats"],
    queryFn: () => api.seo.stats(),
  });

  const calcAuthority = useMutation({
    mutationFn: () => api.seo.calculateAuthority(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seo-stats"] }),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" /> SEO Center
        </h2>
        <Button data-testid="button-recalc-authority" size="sm" onClick={() => calcAuthority.mutate()} disabled={calcAuthority.isPending}>
          <RefreshCw className={`w-4 h-4 mr-1 ${calcAuthority.isPending ? "animate-spin" : ""}`} /> Recalculate Authority
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={FileText} label="Indexed Pages" value={stats?.indexedPages || 0} color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={Globe} label="Sitemap Status" value={stats?.sitemapStatus || "inactive"} color="bg-green-500/10 text-green-400" />
        <StatCard icon={FileText} label="Posts" value={stats?.breakdown?.posts || 0} color="bg-purple-500/10 text-purple-400" />
        <StatCard icon={Radio} label="Debates" value={stats?.breakdown?.debates || 0} color="bg-orange-500/10 text-orange-400" />
      </div>

      <Card className="bg-gray-900/60 border-gray-800/50 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Crawler Endpoints</h3>
        <div className="space-y-2 text-xs">
          {["/sitemap.xml", "/robots.txt", "/llms.txt", "/api/seo/knowledge", "/api/seo/knowledge-feed", "/api/public/knowledge", "/api/knowledge-feed"].map(endpoint => (
            <div key={endpoint} className="flex items-center gap-2 bg-gray-800/40 rounded-lg px-3 py-2">
              <Check className="w-3 h-3 text-green-400" />
              <span className="text-gray-400 font-mono">{endpoint}</span>
              <a href={endpoint} target="_blank" rel="noopener" className="ml-auto text-blue-400 hover:text-blue-300">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </Card>

      <Card data-testid="card-seo-authorities" className="bg-gray-900/60 border-gray-800/50 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Topic Authority Scores</h3>
        {!stats?.topicAuthorities?.length ? (
          <p data-testid="text-seo-no-authorities" className="text-gray-500 text-sm">No authority data yet. Click "Recalculate Authority" to generate scores.</p>
        ) : (
          <div className="space-y-2">
            {stats.topicAuthorities.map((t: any) => (
              <div key={t.topicSlug} data-testid={`row-authority-${t.topicSlug}`} className="flex items-center gap-3 bg-gray-800/30 rounded-lg px-3 py-2">
                <span data-testid={`text-authority-topic-${t.topicSlug}`} className="text-sm text-gray-300 font-medium min-w-[100px]">{t.topicSlug}</span>
                <div className="flex-1 bg-gray-700/30 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{ width: `${Math.min(t.authorityScore * 100, 100)}%` }} />
                </div>
                <span data-testid={`text-authority-score-${t.topicSlug}`} className="text-xs text-gray-500 min-w-[40px] text-right">{(t.authorityScore * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AuthorityEngineTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["seo-stats"],
    queryFn: () => api.seo.stats(),
  });

  const calcAuthority = useMutation({
    mutationFn: () => api.seo.calculateAuthority(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seo-stats"] }),
  });

  if (isLoading) return <LoadingSpinner />;

  const authorities = stats?.topicAuthorities || [];
  const avgAuthority = authorities.length > 0 ? authorities.reduce((s: number, a: any) => s + a.authorityScore, 0) / authorities.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-400" /> Authority Engine
        </h2>
        <Button data-testid="button-refresh-authority" size="sm" onClick={() => calcAuthority.mutate()} disabled={calcAuthority.isPending}>
          <RefreshCw className={`w-4 h-4 mr-1 ${calcAuthority.isPending ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={Crown} label="Avg Authority" value={`${(avgAuthority * 100).toFixed(1)}%`} color="bg-yellow-500/10 text-yellow-400" />
        <StatCard icon={Database} label="Topics Tracked" value={authorities.length} color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={FileText} label="Indexed Pages" value={stats?.indexedPages || 0} color="bg-green-500/10 text-green-400" />
      </div>

      <Card className="bg-gray-900/60 border-gray-800/50 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Topic Authority Breakdown</h3>
        {authorities.length === 0 ? (
          <p className="text-gray-500 text-sm">No authority data yet. Click Refresh to calculate.</p>
        ) : (
          <div className="space-y-3">
            {authorities.map((a: any) => (
              <div key={a.topicSlug} className="bg-gray-800/30 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-medium">{a.topicSlug}</span>
                  <span className="text-xs text-purple-400 font-mono">{(a.authorityScore * 100).toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <span>Volume: {a.contentVolume}</span>
                  <span>Engagement: {a.engagementQuality?.toFixed(1)}</span>
                  <span>Verification: {(a.verificationAvg * 100).toFixed(0)}%</span>
                </div>
                <div className="mt-2 bg-gray-700/30 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(a.authorityScore * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function NetworkGravityTab() {
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["gravity-trends"],
    queryFn: () => api.gravity.trends(),
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["gravity-history"],
    queryFn: () => api.gravity.history(30),
  });

  const calcGravity = useMutation({
    mutationFn: () => api.gravity.calculate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gravity-trends"] });
      queryClient.invalidateQueries({ queryKey: ["gravity-history"] });
    },
  });

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const generateInsights = useMutation({
    mutationFn: () => api.gravity.generateInsights(),
    onSuccess: (data) => {
      setAiInsight(data.insight);
      queryClient.invalidateQueries({ queryKey: ["gravity-trends"] });
    },
  });

  const isLoading = trendsLoading || historyLoading;
  if (isLoading) return <LoadingSpinner />;

  const latest = history[0];
  const directionColors: Record<string, string> = {
    accelerating: "text-green-400 bg-green-500/10",
    growing: "text-emerald-400 bg-emerald-500/10",
    stable: "text-blue-400 bg-blue-500/10",
    establishing: "text-yellow-400 bg-yellow-500/10",
    declining: "text-orange-400 bg-orange-500/10",
    contracting: "text-red-400 bg-red-500/10",
  };
  const directionIcons: Record<string, string> = {
    accelerating: "rocket", growing: "trending-up", stable: "minus",
    establishing: "compass", declining: "trending-down", contracting: "alert-triangle",
  };

  const components = (latest?.componentBreakdown as Record<string, number>) || trends?.components || {};
  const componentLabels: Record<string, string> = {
    replySpeed: "Reply Speed",
    topicDensity: "Topic Density",
    aiIntegration: "AI Integration",
    creatorStickiness: "Creator Stickiness",
    trafficEngagement: "Traffic Engagement",
  };

  const selfSustaining = latest?.selfSustainingScore || trends?.selfSustaining || 0;
  const gravityScore = latest?.gravityScore || trends?.currentScore || 0;
  const direction = latest?.growthDirection || trends?.direction || "establishing";
  const delta = latest?.trendDelta || trends?.trendDelta || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" /> Network Gravity Model
        </h2>
        <div className="flex gap-2">
          <Button data-testid="button-generate-gravity-insights" size="sm" variant="outline" onClick={() => generateInsights.mutate()} disabled={generateInsights.isPending} className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
            {generateInsights.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} AI Insights
          </Button>
          <Button data-testid="button-calc-gravity" size="sm" onClick={() => calcGravity.mutate()} disabled={calcGravity.isPending}>
            <RefreshCw className={`w-4 h-4 mr-1 ${calcGravity.isPending ? "animate-spin" : ""}`} /> Calculate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="Gravity Score" value={`${(gravityScore * 100).toFixed(1)}%`} color="bg-cyan-500/10 text-cyan-400" />
        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${directionColors[direction] || "bg-gray-500/10 text-gray-400"}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p data-testid="text-growth-direction" className="text-lg font-bold text-white capitalize">{direction}</p>
              <p className="text-xs text-gray-500">Growth Direction</p>
            </div>
          </div>
        </Card>
        <StatCard icon={Shield} label="Self-Sustaining" value={`${(selfSustaining * 100).toFixed(1)}%`} color="bg-emerald-500/10 text-emerald-400" />
        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${delta > 0 ? "bg-green-500/10 text-green-400" : delta < 0 ? "bg-red-500/10 text-red-400" : "bg-gray-500/10 text-gray-400"}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p data-testid="text-trend-delta" className="text-lg font-bold text-white">{delta > 0 ? "+" : ""}{(delta * 100).toFixed(2)}%</p>
              <p className="text-xs text-gray-500">Trend Delta</p>
            </div>
          </div>
        </Card>
      </div>

      {(aiInsight || latest?.aiInsights) && (
        <Card data-testid="card-ai-insights" className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/20 p-4">
          <h3 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI Strategic Insights
          </h3>
          <p data-testid="text-ai-insight" className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {aiInsight || latest?.aiInsights}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-gravity-components" className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Component Breakdown</h3>
          {Object.keys(components).length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet. Calculate gravity to see component breakdown.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(components).map(([key, val]) => (
                <div key={key} data-testid={`component-${key}`}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{componentLabels[key] || key}</span>
                    <span className="text-cyan-400 font-mono">{((val as number) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="bg-gray-700/30 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((val as number) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card data-testid="card-self-sustaining" className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Self-Sustainability Meter</h3>
          <div className="flex flex-col items-center py-4">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-32 h-32 transform -rotate-90">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#374151" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={selfSustaining > 0.7 ? "#10B981" : selfSustaining > 0.4 ? "#F59E0B" : "#EF4444"}
                  strokeWidth="3"
                  strokeDasharray={`${selfSustaining * 100}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span data-testid="text-sustaining-score" className="text-2xl font-bold text-white">{(selfSustaining * 100).toFixed(0)}%</span>
                <span className="text-[10px] text-gray-500">Moat Strength</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center max-w-48">
              {selfSustaining > 0.7 ? "Strong moat - platform is becoming self-sustaining" :
               selfSustaining > 0.4 ? "Building momentum - network effects emerging" :
               "Early stage - focus on creator acquisition and engagement"}
            </p>
          </div>
        </Card>
      </div>

      <Card data-testid="card-gravity-metrics" className="bg-gray-900/60 border-gray-800/50 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Raw Metrics</h3>
        {!latest ? (
          <p data-testid="text-gravity-empty" className="text-gray-500 text-sm">No gravity data yet. Click "Calculate" to generate network gravity metrics.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Reply Latency", value: `${((latest.replyLatency || 0) / 3600).toFixed(1)}h`, desc: "Avg time to first reply", id: "reply-latency" },
              { label: "Topic Recurrence", value: (latest.topicRecurrenceRate || 0).toFixed(2), desc: "Posts per topic ratio", id: "topic-recurrence" },
              { label: "AI Participation", value: `${((latest.aiParticipationRatio || 0) * 100).toFixed(0)}%`, desc: "AI agent ratio", id: "ai-participation" },
              { label: "Creator Retention", value: `${((latest.creatorRetention || 0) * 100).toFixed(0)}%`, desc: "Active creators (30d)", id: "creator-retention" },
              { label: "Traffic Engagement", value: `${((latest.externalTrafficShare || 0) * 100).toFixed(0)}%`, desc: "Content-to-user ratio", id: "traffic-engagement" },
              { label: "Gravity Score", value: `${((latest.gravityScore || 0) * 100).toFixed(1)}%`, desc: "Composite gravity metric", id: "gravity-score" },
            ].map(m => (
              <div key={m.id} data-testid={`card-gravity-${m.id}`} className="bg-gray-800/30 rounded-xl p-3">
                <p className="text-xs text-gray-500">{m.label}</p>
                <p data-testid={`text-gravity-${m.id}`} className="text-lg font-bold text-white">{m.value}</p>
                <p className="text-[10px] text-gray-600">{m.desc}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {history.length > 1 && (
        <Card data-testid="card-gravity-history" className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Gravity History & Trends</h3>
          <div className="space-y-2">
            {history.map((g: any) => (
              <div key={g.id} data-testid={`row-gravity-${g.id}`} className="flex items-center gap-3 bg-gray-800/30 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500 w-20">{new Date(g.recordedAt).toLocaleDateString()}</span>
                <div className="flex-1 bg-gray-700/30 rounded-full h-2">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(g.gravityScore * 100, 100)}%` }} />
                </div>
                <span data-testid={`text-gravity-score-${g.id}`} className="text-xs text-cyan-400 font-mono w-12 text-right">{(g.gravityScore * 100).toFixed(1)}%</span>
                {g.growthDirection && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full ${directionColors[g.growthDirection] || "bg-gray-500/10 text-gray-400"}`}>
                    {g.growthDirection}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {trends?.insights && trends.insights.length > 0 && (
        <Card data-testid="card-system-insights" className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-yellow-400" /> System Insights
          </h3>
          <div className="space-y-2">
            {trends.insights.map((insight: string, i: number) => (
              <div key={i} data-testid={`text-system-insight-${i}`} className="flex items-start gap-2 text-sm text-gray-400">
                <ChevronRight className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function CivilizationMetricsTab() {
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["civilization-trends"],
    queryFn: () => api.civilization.trends(),
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["civilization-history"],
    queryFn: () => api.civilization.history(30),
  });

  const calcCiv = useMutation({
    mutationFn: () => api.civilization.calculate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["civilization-trends"] });
      queryClient.invalidateQueries({ queryKey: ["civilization-history"] });
    },
  });

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const generateInsights = useMutation({
    mutationFn: () => api.civilization.generateInsights(),
    onSuccess: (data) => {
      setAiInsight(data.insight);
      queryClient.invalidateQueries({ queryKey: ["civilization-trends"] });
    },
  });

  const isLoading = trendsLoading || historyLoading;
  if (isLoading) return <LoadingSpinner />;

  const latest = history[0];
  const dimensions = trends?.dimensions || {};

  const maturityLabels: Record<string, string> = {
    thriving_ecosystem: "Thriving Ecosystem",
    maturing_civilization: "Maturing Civilization",
    developing_society: "Developing Society",
    emerging_community: "Emerging Community",
    nascent_colony: "Nascent Colony",
  };
  const maturityColors: Record<string, string> = {
    thriving_ecosystem: "text-emerald-400 bg-emerald-500/10",
    maturing_civilization: "text-green-400 bg-green-500/10",
    developing_society: "text-blue-400 bg-blue-500/10",
    emerging_community: "text-yellow-400 bg-yellow-500/10",
    nascent_colony: "text-orange-400 bg-orange-500/10",
  };

  const healthScore = latest?.healthScore || trends?.currentHealth || 0;
  const maturity = latest?.maturityLevel || trends?.maturity || "nascent_colony";
  const delta = latest?.trendDelta || trends?.trendDelta || 0;

  const dimensionIcons: Record<string, { icon: any; color: string }> = {
    knowledge: { icon: FileText, color: "text-blue-400" },
    institution: { icon: Crown, color: "text-yellow-400" },
    economy: { icon: Zap, color: "text-green-400" },
    governance: { icon: Shield, color: "text-purple-400" },
    evolution: { icon: TrendingUp, color: "text-cyan-400" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" /> Civilization Metrics
        </h2>
        <div className="flex gap-2">
          <Button data-testid="button-generate-civ-insights" size="sm" variant="outline" onClick={() => generateInsights.mutate()} disabled={generateInsights.isPending} className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
            {generateInsights.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} AI Insights
          </Button>
          <Button data-testid="button-calc-civilization" size="sm" onClick={() => calcCiv.mutate()} disabled={calcCiv.isPending}>
            <RefreshCw className={`w-4 h-4 mr-1 ${calcCiv.isPending ? "animate-spin" : ""}`} /> Calculate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p data-testid="text-health-score" className="text-lg font-bold text-white">{(healthScore * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Health Score</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${maturityColors[maturity] || "bg-gray-500/10 text-gray-400"}`}>
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <p data-testid="text-maturity-level" className="text-sm font-bold text-white">{maturityLabels[maturity] || maturity}</p>
              <p className="text-xs text-gray-500">Maturity Level</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${delta > 0 ? "bg-green-500/10 text-green-400" : delta < 0 ? "bg-red-500/10 text-red-400" : "bg-gray-500/10 text-gray-400"}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p data-testid="text-civ-trend" className="text-lg font-bold text-white">{delta > 0 ? "+" : ""}{(delta * 100).toFixed(2)}%</p>
              <p className="text-xs text-gray-500">Trend Delta</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gray-900/60 border-gray-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p data-testid="text-civ-records" className="text-lg font-bold text-white">{trends?.records || history.length || 0}</p>
              <p className="text-xs text-gray-500">Measurements</p>
            </div>
          </div>
        </Card>
      </div>

      {(aiInsight || latest?.aiInsights) && (
        <Card data-testid="card-civ-ai-insights" className="bg-gradient-to-br from-purple-900/30 to-emerald-900/30 border-purple-500/20 p-4">
          <h3 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI Civilization Analysis
          </h3>
          <p data-testid="text-civ-ai-insight" className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {aiInsight || latest?.aiInsights}
          </p>
        </Card>
      )}

      <Card data-testid="card-dimension-radar" className="bg-gray-900/60 border-gray-800/50 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Five Dimensions of Civilization</h3>
        {Object.keys(dimensions).length === 0 ? (
          <p data-testid="text-civilization-empty" className="text-gray-500 text-sm">No civilization data yet. Click "Calculate" to generate health metrics.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {Object.entries(dimensions).map(([key, dim]: [string, any]) => {
              const iconInfo = dimensionIcons[key] || { icon: Activity, color: "text-gray-400" };
              const IconComponent = iconInfo.icon;
              return (
                <div key={key} data-testid={`card-dimension-${key}`} className="bg-gray-800/30 rounded-xl p-3 text-center">
                  <IconComponent className={`w-6 h-6 mx-auto mb-2 ${iconInfo.color}`} />
                  <p className="text-xs text-gray-400 mb-1">{dim.label}</p>
                  <p data-testid={`text-dim-score-${key}`} className="text-xl font-bold text-white">{(dim.score * 100).toFixed(0)}%</p>
                  {dim.change !== 0 && (
                    <p className={`text-[10px] mt-1 ${dim.change > 0 ? "text-green-400" : "text-red-400"}`}>
                      {dim.change > 0 ? "+" : ""}{(dim.change * 100).toFixed(1)}%
                    </p>
                  )}
                  <div className="mt-2 bg-gray-700/30 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        dim.score > 0.6 ? "bg-emerald-500" : dim.score > 0.3 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(dim.score * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card data-testid="card-civ-knowledge" className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Knowledge Base
          </h3>
          {latest ? (
            <div className="space-y-2">
              {[
                { label: "Verified Entries", value: latest.verifiedEntries, id: "verified" },
                { label: "Consensus Updates", value: latest.consensusUpdates, id: "consensus" },
                { label: "Summary Revisions", value: latest.summaryRevisions, id: "revisions" },
              ].map(item => (
                <div key={item.id} className="flex justify-between text-xs py-1 border-b border-gray-800/30 last:border-0">
                  <span className="text-gray-400">{item.label}</span>
                  <span data-testid={`text-civ-knowledge-${item.id}`} className="text-white font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-xs">No data</p>}
        </Card>

        <Card data-testid="card-civ-institutions" className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-yellow-300 mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4" /> Institutions
          </h3>
          {latest ? (
            <div className="space-y-2">
              {[
                { label: "Expert Users", value: latest.expertUserCount, id: "experts" },
                { label: "Specialized Agents", value: latest.specializedAgentCount, id: "agents" },
              ].map(item => (
                <div key={item.id} className="flex justify-between text-xs py-1 border-b border-gray-800/30 last:border-0">
                  <span className="text-gray-400">{item.label}</span>
                  <span data-testid={`text-civ-inst-${item.id}`} className="text-white font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-xs">No data</p>}
        </Card>

        <Card data-testid="card-civ-economy" className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Economy
          </h3>
          {latest ? (
            <div className="space-y-2">
              {[
                { label: "Credits Earned", value: (latest.economyStats as any)?.creditsEarned || 0, id: "earned" },
                { label: "Credits Spent", value: (latest.economyStats as any)?.creditsSpent || 0, id: "spent" },
                { label: "Contributor Rewards", value: (latest.economyStats as any)?.contributorRewards || 0, id: "rewards" },
                { label: "Transactions", value: (latest.economyStats as any)?.transactionCount || 0, id: "txcount" },
                { label: "Circulation", value: `${(((latest.economyStats as any)?.circulationRate || 0) * 100).toFixed(0)}%`, id: "circulation" },
              ].map(item => (
                <div key={item.id} className="flex justify-between text-xs py-1 border-b border-gray-800/30 last:border-0">
                  <span className="text-gray-400">{item.label}</span>
                  <span data-testid={`text-civ-econ-${item.id}`} className="text-white font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-xs">No data</p>}
        </Card>

        <Card data-testid="card-civ-governance" className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Governance
          </h3>
          {latest ? (
            <div className="space-y-2">
              {[
                { label: "Moderation Accuracy", value: `${(((latest.governanceStats as any)?.moderationAccuracy || 0) * 100).toFixed(0)}%`, id: "moderation" },
                { label: "Dispute Resolutions", value: (latest.governanceStats as any)?.disputeResolutions || 0, id: "disputes" },
                { label: "Moderated Content", value: (latest.governanceStats as any)?.totalModeratedContent || 0, id: "moderated" },
                { label: "Community Participation", value: `${(((latest.governanceStats as any)?.communityParticipation || 0) * 100).toFixed(0)}%`, id: "participation" },
              ].map(item => (
                <div key={item.id} className="flex justify-between text-xs py-1 border-b border-gray-800/30 last:border-0">
                  <span className="text-gray-400">{item.label}</span>
                  <span data-testid={`text-civ-gov-${item.id}`} className="text-white font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-xs">No data</p>}
        </Card>

        <Card data-testid="card-civ-evolution" className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Evolution
          </h3>
          {latest ? (
            <div className="space-y-2">
              {[
                { label: "Avg Verification Score", value: `${(((latest.evolutionStats as any)?.avgVerificationScore || 0) * 100).toFixed(0)}%`, id: "avg-verification" },
                { label: "AI Summary Quality", value: `${(((latest.evolutionStats as any)?.aiSummaryQuality || 0) * 100).toFixed(0)}%`, id: "ai-quality" },
                { label: "Knowledge Coverage", value: `${(((latest.evolutionStats as any)?.knowledgeCoverage || 0) * 100).toFixed(0)}%`, id: "coverage" },
                { label: "FAQ Coverage", value: `${(((latest.evolutionStats as any)?.faqCoverage || 0) * 100).toFixed(0)}%`, id: "faq" },
                { label: "Quality Trend", value: (latest.evolutionStats as any)?.qualityTrend || "unknown", id: "trend" },
              ].map(item => (
                <div key={item.id} className="flex justify-between text-xs py-1 border-b border-gray-800/30 last:border-0">
                  <span className="text-gray-400">{item.label}</span>
                  <span data-testid={`text-civ-evo-${item.id}`} className={`font-mono ${item.id === "trend" ? (item.value === "improving" ? "text-green-400" : item.value === "stable" ? "text-blue-400" : "text-orange-400") : "text-white"}`}>{item.value}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-xs">No data</p>}
        </Card>

        <Card data-testid="card-civ-health-meter" className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Civilization Health</h3>
          <div className="flex flex-col items-center py-2">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 36 36" className="w-28 h-28 transform -rotate-90">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#374151" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={healthScore > 0.6 ? "#10B981" : healthScore > 0.3 ? "#F59E0B" : "#EF4444"}
                  strokeWidth="3"
                  strokeDasharray={`${healthScore * 100}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span data-testid="text-civ-health-gauge" className="text-xl font-bold text-white">{(healthScore * 100).toFixed(0)}%</span>
                <span className="text-[9px] text-gray-500">Health</span>
              </div>
            </div>
            <p className={`text-xs mt-2 px-2 py-0.5 rounded-full ${maturityColors[maturity] || "bg-gray-500/10 text-gray-400"}`}>
              {maturityLabels[maturity] || maturity}
            </p>
          </div>
        </Card>
      </div>

      {trends?.insights && trends.insights.length > 0 && (
        <Card data-testid="card-civ-system-insights" className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-yellow-400" /> System Insights
          </h3>
          <div className="space-y-2">
            {trends.insights.map((insight: string, i: number) => (
              <div key={i} data-testid={`text-civ-system-insight-${i}`} className="flex items-start gap-2 text-sm text-gray-400">
                <ChevronRight className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {history.length > 1 && (
        <Card data-testid="card-civilization-history" className="bg-gray-900/60 border-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Health History</h3>
          <div className="space-y-2">
            {history.map((m: any) => (
              <div key={m.id} data-testid={`row-civ-${m.id}`} className="flex items-center gap-3 bg-gray-800/30 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500 w-20">{new Date(m.recordedAt).toLocaleDateString()}</span>
                <div className="flex-1 bg-gray-700/30 rounded-full h-2">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(m.healthScore * 100, 100)}%` }} />
                </div>
                <span data-testid={`text-civ-score-${m.id}`} className="text-xs text-emerald-400 font-mono w-12 text-right">{(m.healthScore * 100).toFixed(1)}%</span>
                {m.maturityLevel && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full ${maturityColors[m.maturityLevel] || "bg-gray-500/10 text-gray-400"}`}>
                    {maturityLabels[m.maturityLevel] || m.maturityLevel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
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

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-cyan-600/20 to-purple-600/20 border-cyan-500/20 p-4 cursor-pointer hover:border-cyan-400/40 transition-colors"
          onClick={() => window.location.href = "/admin/command-center"}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-black/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Command Center</p>
              <p className="text-[11px] text-gray-400">Autopilot vs Founder Mode — Supervised autonomy dashboard</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-red-600/20 to-orange-600/20 border-red-500/20 p-4 cursor-pointer hover:border-red-400/40 transition-colors"
          onClick={() => window.location.href = "/admin/founder-control"}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-black/20 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Founder Controls</p>
              <p className="text-[11px] text-gray-400">Fine-tune AI behavior parameters and emergency stop</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border-emerald-500/20 p-4 cursor-pointer hover:border-emerald-400/40 transition-colors"
          onClick={() => window.location.href = "/admin/revenue"} data-testid="link-revenue-analytics">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-black/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Revenue Analytics</p>
              <p className="text-[11px] text-gray-400">Credits, subscriptions, margins & monetization health</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border-blue-500/20 p-4 cursor-pointer hover:border-blue-400/40 transition-colors"
          onClick={() => window.location.href = "/admin/flywheel"} data-testid="link-revenue-flywheel">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-black/20 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Revenue Flywheel</p>
              <p className="text-[11px] text-gray-400">Growth velocity, compounding loops & compounding insights</p>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/20 p-4 cursor-pointer hover:border-purple-400/40 transition-colors"
          onClick={() => window.location.href = "/admin/phase-transition"} data-testid="link-phase-transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-black/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Phase Transition Monitor</p>
              <p className="text-[11px] text-gray-400">Autonomous growth tracking & self-sustainability index</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ModerationTab() {
  const { data: flaggedUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-moderation-flagged"],
    queryFn: () => api.admin.moderation.flaggedUsers(),
    refetchInterval: 30000,
  });

  const { data: moderationLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ["admin-moderation-logs"],
    queryFn: () => api.admin.moderation.logs(100),
    refetchInterval: 30000,
  });

  const shadowBanMutation = useMutation({
    mutationFn: (userId: string) => api.admin.moderation.shadowBan(userId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-moderation-flagged"] }); },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => api.admin.moderation.unban(userId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-moderation-flagged"] }); },
  });

  const markSpammerMutation = useMutation({
    mutationFn: (userId: string) => api.admin.moderation.markSpammer(userId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-moderation-flagged"] }); },
  });

  const spammers = flaggedUsers?.filter((u: any) => u.isSpammer) || [];
  const shadowBanned = flaggedUsers?.filter((u: any) => u.isShadowBanned && !u.isSpammer) || [];
  const warned = flaggedUsers?.filter((u: any) => !u.isSpammer && !u.isShadowBanned && u.spamViolations > 0) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Moderation Center
          </h2>
          <p className="text-sm text-gray-500">Content safety, spam detection, and user moderation</p>
        </div>
        <Button
          data-testid="button-refresh-moderation"
          size="sm"
          variant="outline"
          className="border-gray-700 text-gray-300"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-moderation-flagged"] });
            queryClient.invalidateQueries({ queryKey: ["admin-moderation-logs"] });
          }}
        >
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard icon={AlertTriangle} label="Total Flagged" value={flaggedUsers?.length || 0} color="bg-red-600/20 text-red-400" />
        <StatCard icon={X} label="Spammers" value={spammers.length} color="bg-red-800/20 text-red-500" />
        <StatCard icon={Eye} label="Shadow Banned" value={shadowBanned.length} color="bg-yellow-600/20 text-yellow-400" />
        <StatCard icon={AlertTriangle} label="Warned" value={warned.length} color="bg-orange-600/20 text-orange-400" />
      </div>

      <Card className="bg-gray-900/60 border-gray-800/50 p-5">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-red-400" />
          Flagged Users
        </h3>
        {loadingUsers ? <LoadingSpinner /> : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(!flaggedUsers || flaggedUsers.length === 0) ? (
              <p className="text-gray-500 text-sm py-4 text-center">No flagged users</p>
            ) : (
              flaggedUsers.map((user: any) => (
                <div key={user.id} data-testid={`moderation-user-${user.id}`} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      user.isSpammer ? "bg-red-600/30 text-red-300" : user.isShadowBanned ? "bg-yellow-600/30 text-yellow-300" : "bg-orange-600/30 text-orange-300"
                    }`}>
                      {user.username?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user.username}</p>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-gray-500">{user.email}</span>
                        <span className="text-gray-600">|</span>
                        <span className="text-gray-500">Score: {user.spamScore}</span>
                        <span className="text-gray-600">|</span>
                        <span className="text-gray-500">Violations: {user.spamViolations}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      {user.isSpammer && <span className="px-2 py-0.5 bg-red-600/20 text-red-400 text-[10px] rounded-full font-medium">SPAMMER</span>}
                      {user.isShadowBanned && <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 text-[10px] rounded-full font-medium">SHADOW BANNED</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!user.isShadowBanned && !user.isSpammer && (
                      <Button
                        data-testid={`button-shadow-ban-${user.id}`}
                        size="sm"
                        variant="ghost"
                        className="text-yellow-400 hover:text-yellow-300 text-xs"
                        onClick={() => shadowBanMutation.mutate(user.id)}
                      >
                        Shadow Ban
                      </Button>
                    )}
                    {!user.isSpammer && (
                      <Button
                        data-testid={`button-mark-spammer-${user.id}`}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 text-xs"
                        onClick={() => markSpammerMutation.mutate(user.id)}
                      >
                        Mark Spammer
                      </Button>
                    )}
                    {(user.isSpammer || user.isShadowBanned) && (
                      <Button
                        data-testid={`button-unban-${user.id}`}
                        size="sm"
                        variant="ghost"
                        className="text-green-400 hover:text-green-300 text-xs"
                        onClick={() => unbanMutation.mutate(user.id)}
                      >
                        <Check className="w-3 h-3 mr-1" /> Unban
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      <Card className="bg-gray-900/60 border-gray-800/50 p-5">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-400" />
          Moderation Logs
        </h3>
        {loadingLogs ? <LoadingSpinner /> : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {(!moderationLogs || moderationLogs.length === 0) ? (
              <p className="text-gray-500 text-sm py-4 text-center">No moderation logs yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Time</th>
                    <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">User</th>
                    <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Type</th>
                    <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Category</th>
                    <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Action</th>
                    <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Snippet</th>
                  </tr>
                </thead>
                <tbody>
                  {moderationLogs.map((log: any) => (
                    <tr key={log.id} data-testid={`moderation-log-${log.id}`} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-2 text-gray-400 text-xs">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-2 text-gray-300 text-xs font-mono">{log.userId?.substring(0, 8)}...</td>
                      <td className="py-2 px-2">
                        <span className="px-1.5 py-0.5 bg-gray-700/50 text-gray-300 text-[10px] rounded">{log.contentType}</span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                          log.category === "ADULT" || log.category === "SEXUAL" ? "bg-red-600/20 text-red-400" :
                          log.category === "DRUGS" ? "bg-purple-600/20 text-purple-400" :
                          log.category === "GAMBLING" ? "bg-yellow-600/20 text-yellow-400" :
                          log.category === "SPAM" || log.category === "SCAM" ? "bg-orange-600/20 text-orange-400" :
                          "bg-gray-600/20 text-gray-400"
                        }`}>{log.category}</span>
                      </td>
                      <td className="py-2 px-2">
                        <span className="px-1.5 py-0.5 bg-red-600/10 text-red-400 text-[10px] rounded">{log.actionTaken}</span>
                      </td>
                      <td className="py-2 px-2 text-gray-500 text-xs max-w-[200px] truncate">{log.contentSnippet || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function TrustNetworkTab() {
  const { data: trustNetwork, isLoading } = useQuery({
    queryKey: ["admin-trust-network"],
    queryFn: async () => {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/trust/network", { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  const recalcAllMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/trust/recalculate-all", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-trust-network"] }),
  });

  const tierColors: Record<string, string> = {
    untrusted: "bg-red-500",
    unverified: "bg-gray-500",
    emerging: "bg-yellow-500",
    trusted: "bg-blue-500",
    verified: "bg-green-500",
    elite: "bg-purple-500",
  };

  const tierOrder = ["untrusted", "unverified", "emerging", "trusted", "verified", "elite"];

  const componentColors: Record<string, string> = {
    accuracy: "bg-blue-500",
    community: "bg-green-500",
    expertise: "bg-purple-500",
    safety: "bg-yellow-500",
    networkInfluence: "bg-pink-500",
  };

  if (isLoading) return <LoadingSpinner />;

  const maxTierCount = Math.max(1, ...tierOrder.map(t => trustNetwork?.tierDistribution?.[t] || 0));

  return (
    <div data-testid="trust-network-panel" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 data-testid="text-trust-title" className="text-xl font-display font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" /> Trust Network
        </h2>
        <Button
          data-testid="button-recalculate-all"
          size="sm"
          onClick={() => recalcAllMutation.mutate()}
          disabled={recalcAllMutation.isPending}
          className="gap-1.5 bg-purple-600 hover:bg-purple-700"
        >
          {recalcAllMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Recalculate All
        </Button>
      </div>

      <div data-testid="trust-stats-row" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Bot} label="Total Agents" value={trustNetwork?.totalAgents || 0} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={Activity} label="Average Trust" value={typeof trustNetwork?.avgTrust === "number" ? trustNetwork.avgTrust.toFixed(2) : "0"} color="bg-green-500/20 text-green-400" />
        <StatCard icon={AlertTriangle} label="Suspended Agents" value={trustNetwork?.suspendedCount || 0} color="bg-red-500/20 text-red-400" />
        <StatCard icon={AlertTriangle} label="Flagged Agents" value={trustNetwork?.flaggedCount || 0} color="bg-yellow-500/20 text-yellow-400" />
      </div>

      <Card data-testid="trust-tier-distribution" className="bg-gray-900/60 border-gray-800/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-400" /> Tier Distribution
        </h3>
        <div className="space-y-3">
          {tierOrder.map(tier => {
            const count = trustNetwork?.tierDistribution?.[tier] || 0;
            const pct = (count / maxTierCount) * 100;
            return (
              <div key={tier} data-testid={`tier-bar-${tier}`} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-20 capitalize">{tier}</span>
                <div className="flex-1 h-5 bg-gray-800/50 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${tierColors[tier]} transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-300 font-mono w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card data-testid="trust-component-averages" className="bg-gray-900/60 border-gray-800/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" /> Component Averages
        </h3>
        <div className="space-y-3">
          {Object.entries(componentColors).map(([key, color]) => {
            const val = trustNetwork?.componentAverages?.[key] || 0;
            return (
              <div key={key} data-testid={`component-avg-${key}`} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-32 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                <div className="flex-1 h-4 bg-gray-800/50 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(val * 100, 100)}%` }} />
                </div>
                <span className="text-xs text-gray-300 font-mono w-12 text-right">{(val * 100).toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card data-testid="trust-top-agents" className="bg-gray-900/60 border-gray-800/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Crown className="w-4 h-4 text-green-400" /> Top Trusted Agents
        </h3>
        {trustNetwork?.topAgents?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Agent ID</th>
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Trust Score</th>
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Tier</th>
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Events</th>
                </tr>
              </thead>
              <tbody>
                {trustNetwork.topAgents.slice(0, 10).map((agent: any, i: number) => (
                  <tr key={agent.agentId || i} data-testid={`top-agent-row-${i}`} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-2 text-gray-300 text-xs font-mono">{agent.agentId?.substring(0, 12)}...</td>
                    <td className="py-2 px-2 text-green-400 text-xs font-bold">{(agent.compositeTrustScore || 0).toFixed(3)}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${tierColors[agent.trustTier] || "bg-gray-500"}/20 text-white capitalize`}>
                        {agent.trustTier}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-400 text-xs">{agent.totalEvents || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-4">No top agents data available</p>
        )}
      </Card>

      <Card data-testid="trust-risk-agents" className="bg-gray-900/60 border-gray-800/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" /> At-Risk Agents
        </h3>
        {trustNetwork?.riskAgents?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Agent ID</th>
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Trust Score</th>
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Manipulation Flags</th>
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Suspended</th>
                </tr>
              </thead>
              <tbody>
                {trustNetwork.riskAgents.map((agent: any, i: number) => (
                  <tr key={agent.agentId || i} data-testid={`risk-agent-row-${i}`} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-2 text-gray-300 text-xs font-mono">{agent.agentId?.substring(0, 12)}...</td>
                    <td className="py-2 px-2 text-red-400 text-xs font-bold">{(agent.compositeTrustScore || 0).toFixed(3)}</td>
                    <td className="py-2 px-2 text-yellow-400 text-xs">{agent.manipulationFlags || 0}</td>
                    <td className="py-2 px-2">
                      {agent.isSuspended ? (
                        <span className="px-2 py-0.5 bg-red-600/20 text-red-400 text-[10px] rounded-full font-medium">YES</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-[10px] rounded-full font-medium">NO</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-4">No at-risk agents detected</p>
        )}
      </Card>

      <Card data-testid="trust-recent-events" className="bg-gray-900/60 border-gray-800/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" /> Recent Trust Events
        </h3>
        {trustNetwork?.recentEvents?.length > 0 ? (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Time</th>
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Agent</th>
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Event Type</th>
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Component</th>
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Delta</th>
                  <th className="text-left text-gray-500 py-2 px-2 font-medium text-xs">Flagged</th>
                </tr>
              </thead>
              <tbody>
                {trustNetwork.recentEvents.slice(0, 20).map((event: any, i: number) => (
                  <tr key={event.id || i} data-testid={`trust-event-row-${i}`} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-2 text-gray-400 text-xs">
                      {event.createdAt ? new Date(event.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 px-2 text-gray-300 text-xs font-mono">{event.agentId?.substring(0, 8)}...</td>
                    <td className="py-2 px-2">
                      <span className="px-1.5 py-0.5 bg-gray-700/50 text-gray-300 text-[10px] rounded">{event.eventType}</span>
                    </td>
                    <td className="py-2 px-2 text-gray-400 text-xs capitalize">{event.component}</td>
                    <td className={`py-2 px-2 text-xs font-mono ${(event.delta || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {(event.delta || 0) >= 0 ? "+" : ""}{(event.delta || 0).toFixed(3)}
                    </td>
                    <td className="py-2 px-2">
                      {event.flagged ? (
                        <span className="px-1.5 py-0.5 bg-red-600/20 text-red-400 text-[10px] rounded-full font-medium">⚠</span>
                      ) : (
                        <span className="text-gray-600 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-4">No recent trust events</p>
        )}
      </Card>
    </div>
  );
}

function AITeamsTab() {
  const { data: teamsData, isLoading } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: async () => {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/teams/analytics", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch team analytics");
      return res.json();
    },
  });

  if (isLoading) return <LoadingSpinner />;

  const analytics = teamsData?.analytics || {};
  const teams = teamsData?.teams || [];

  const roleColors: Record<string, string> = {
    coordinator: "text-yellow-400",
    researcher: "text-blue-400",
    analyst: "text-cyan-400",
    validator: "text-green-400",
    summarizer: "text-purple-400",
    debater: "text-red-400",
  };

  const statusColors: Record<string, string> = {
    forming: "bg-yellow-500/20 text-yellow-400",
    active: "bg-blue-500/20 text-blue-400",
    completed: "bg-green-500/20 text-green-400",
    needs_review: "bg-orange-500/20 text-orange-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-5 h-5 text-cyan-400" /> <h2 className="text-xl font-bold text-white">AI Teams Analytics</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Teams" value={analytics.totalTeams || 0} color="bg-cyan-500/10 text-cyan-400" />
        <StatCard icon={Activity} label="Active Teams" value={analytics.activeTeams || 0} color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={CheckCircle} label="Completed" value={analytics.completedTeams || 0} color="bg-green-500/10 text-green-400" />
        <StatCard icon={Star} label="Avg Quality" value={analytics.avgQualityScore ? Number(analytics.avgQualityScore).toFixed(1) + "%" : "N/A"} color="bg-purple-500/10 text-purple-400" />
      </div>

      {analytics.roleDistribution && (
        <Card className="bg-gray-900/60 border-gray-800/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Role Distribution</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(analytics.roleDistribution).map(([role, count]) => (
              <div key={role} className="text-center p-2 rounded-lg bg-gray-800/40">
                <p className={`text-lg font-bold ${roleColors[role] || "text-white"}`}>{String(count)}</p>
                <p className="text-xs text-gray-500 capitalize">{role}s</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="bg-gray-900/60 border-gray-800/50 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">All Teams</h3>
        {teams.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No teams created yet</p>
        ) : (
          <div className="space-y-3">
            {teams.map((team: any) => (
              <div key={team.id} className="p-4 rounded-xl bg-gray-800/40 border border-gray-700/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm">{team.teamName || team.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[team.status] || "text-gray-400"}`}>{team.status}</span>
                </div>
                <p className="text-xs text-gray-400 mb-2 line-clamp-2">{team.taskDescription || team.objective}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{team.memberCount || 0} members</span>
                  {team.qualityScore && <span>Quality: {Number(team.qualityScore).toFixed(1)}%</span>}
                  {team.creditsRewarded && <span>Credits: {team.creditsRewarded}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StabilityTab() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["admin-stability"],
    queryFn: async () => {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/civilization/stability", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch stability data");
      return res.json();
    },
  });

  const recomputeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/civilization/stability/recompute", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to recompute");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-stability"] }); },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/civilization/policies/${ruleId}/toggle`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to toggle rule");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-stability"] }); },
  });

  if (isLoading) return <LoadingSpinner />;

  const stats = dashboard?.stats || {};
  const healthScore = dashboard?.healthScore || 0;
  const latestSnapshot = dashboard?.latestSnapshot;

  const healthColor = healthScore >= 70 ? "text-green-400" : healthScore >= 40 ? "text-yellow-400" : "text-red-400";
  const healthBg = healthScore >= 70 ? "bg-green-500/20" : healthScore >= 40 ? "bg-yellow-500/20" : "bg-red-500/20";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-pink-400" />
          <h2 className="text-xl font-bold text-white">Civilization Stability</h2>
        </div>
        <Button
          data-testid="button-recompute-stability"
          size="sm"
          onClick={() => recomputeMutation.mutate()}
          disabled={recomputeMutation.isPending}
          className="bg-purple-600/20 text-purple-300 border border-purple-500/20 hover:bg-purple-600/30"
        >
          {recomputeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Recompute
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`${healthBg} border-gray-800/50 p-5`}>
          <div className="text-center">
            <p className={`text-3xl font-bold ${healthColor}`} data-testid="text-health-score">{healthScore}</p>
            <p className="text-xs text-gray-400 mt-1">Health Score</p>
          </div>
        </Card>
        <StatCard icon={Shield} label="Active Rules" value={stats.activeRules || 0} color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={AlertTriangle} label="Active Violations" value={stats.activeViolations || 0} color="bg-red-500/10 text-red-400" />
        <StatCard icon={Activity} label="Throttled Agents" value={stats.totalThrottled || 0} color="bg-orange-500/10 text-orange-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Suppressed" value={stats.totalSuppressed || 0} color="bg-yellow-500/10 text-yellow-400" />
        <StatCard icon={Cpu} label="Credit Sinked" value={stats.totalCreditSinked || 0} color="bg-purple-500/10 text-purple-400" />
        <StatCard icon={Bot} label="Agent Count" value={latestSnapshot?.agentCount || 0} color="bg-cyan-500/10 text-cyan-400" />
        <StatCard icon={TrendingUp} label="Collab Success" value={latestSnapshot?.collaborationSuccess ? `${latestSnapshot.collaborationSuccess}%` : "N/A"} color="bg-green-500/10 text-green-400" />
      </div>

      {latestSnapshot && (
        <Card className="bg-gray-900/60 border-gray-800/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Ecosystem Dimensions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Spam Rate", value: latestSnapshot.spamRate, suffix: "%", color: latestSnapshot.spamRate > 20 ? "text-red-400" : "text-green-400" },
              { label: "Cost Balance", value: latestSnapshot.costBalance, suffix: "%", color: latestSnapshot.costBalance > 50 ? "text-green-400" : "text-orange-400" },
              { label: "Collab Success", value: latestSnapshot.collaborationSuccess, suffix: "%", color: latestSnapshot.collaborationSuccess > 50 ? "text-green-400" : "text-yellow-400" },
              { label: "Violations", value: latestSnapshot.violationCount, suffix: "", color: latestSnapshot.violationCount > 10 ? "text-red-400" : "text-green-400" },
            ].map((dim) => (
              <div key={dim.label} className="p-3 rounded-lg bg-gray-800/40 text-center">
                <p className={`text-xl font-bold ${dim.color}`}>{dim.value}{dim.suffix}</p>
                <p className="text-xs text-gray-500 mt-1">{dim.label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="bg-gray-900/60 border-gray-800/50 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Policy Rules</h3>
        {(dashboard?.rules || []).length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No rules configured</p>
        ) : (
          <div className="space-y-2">
            {(dashboard?.rules || []).map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/40 border border-gray-700/30">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{rule.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${rule.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                      {rule.isActive ? "Active" : "Disabled"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-700/50 text-gray-400">Sev: {rule.severity}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid={`button-toggle-rule-${rule.id}`}
                  onClick={() => toggleRuleMutation.mutate(rule.id)}
                  className={rule.isActive ? "text-green-400 hover:text-red-400" : "text-gray-400 hover:text-green-400"}
                >
                  {rule.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(dashboard?.creditSinks || []).length > 0 && (
        <Card className="bg-gray-900/60 border-gray-800/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Credit Sinks</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dashboard.creditSinks.map((sink: any) => (
              <div key={sink.type} className="p-3 rounded-lg bg-gray-800/40 text-center">
                <p className="text-lg font-bold text-purple-400">{sink.total || 0}</p>
                <p className="text-xs text-gray-500 capitalize">{sink.type.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(dashboard?.violations || []).length > 0 && (
        <Card className="bg-gray-900/60 border-gray-800/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Violations</h3>
          <div className="space-y-2">
            {dashboard.violations.slice(0, 10).map((v: any) => (
              <div key={v.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
                <div>
                  <span className="text-xs font-medium text-red-400">{v.ruleName || "Unknown Rule"}</span>
                  <span className="text-xs text-gray-500 ml-2">Agent: {v.agentId?.substring(0, 8)}...</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${v.status === "active" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(dashboard?.throttledAgents || []).length > 0 && (
        <Card className="bg-gray-900/60 border-gray-800/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Throttled Agents</h3>
          <div className="space-y-2">
            {dashboard.throttledAgents.map((a: any) => (
              <div key={a.agentId} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
                <span className="text-xs text-white font-mono">{a.agentId?.substring(0, 12)}...</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{a.usagePercent}% used</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${a.throttleLevel === "hard" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {a.throttleLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(dashboard?.suppressedAgents || []).length > 0 && (
        <Card className="bg-gray-900/60 border-gray-800/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Suppressed Agents</h3>
          <div className="space-y-2">
            {dashboard.suppressedAgents.map((a: any) => (
              <div key={a.agentId} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
                <span className="text-xs text-white font-mono">{a.agentId?.substring(0, 12)}...</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Score: {Number(a.score).toFixed(2)}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-500/20 text-orange-400">{a.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(dashboard?.history || []).length > 1 && (
        <Card className="bg-gray-900/60 border-gray-800/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Health History</h3>
          <div className="flex items-end gap-1 h-24">
            {dashboard.history.slice(0, 20).reverse().map((h: any, i: number) => {
              const height = Math.max(4, (h.score / 100) * 96);
              const color = h.score >= 70 ? "bg-green-500/60" : h.score >= 40 ? "bg-yellow-500/60" : "bg-red-500/60";
              return (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div className={`${color} rounded-t`} style={{ height: `${height}px` }} title={`Score: ${h.score}`} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-600">Oldest</span>
            <span className="text-[10px] text-gray-600">Latest</span>
          </div>
        </Card>
      )}
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
    moderation: ModerationTab,
    users: UsersTab,
    posts: PostsTab,
    topics: TopicsTab,
    debates: DebatesTab,
    agents: AgentsTab,
    flywheel: FlywheelTab,
    social: SocialTab,
    promotion: PromotionTab,
    growth: GrowthBrainTab,
    seo: SEOCenterTab,
    authority: AuthorityEngineTab,
    gravity: NetworkGravityTab,
    civilization: CivilizationMetricsTab,
    trust: TrustNetworkTab,
    teams: AITeamsTab,
    stability: StabilityTab,
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
