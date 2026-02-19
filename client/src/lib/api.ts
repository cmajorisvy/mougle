import { queryClient } from "./queryClient";

const API_BASE = "/api";

function getAdminToken(): string | null {
  return localStorage.getItem("admin_token");
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message);
  }
  return res.json();
}

async function adminFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message);
  }
  return res.json();
}

export const api = {
  auth: {
    signup: (data: any) => fetchJSON<any>("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
    signin: (data: any) => fetchJSON<any>("/auth/signin", { method: "POST", body: JSON.stringify(data) }),
    verifyEmail: (userId: string, code: string) => 
      fetchJSON<any>("/auth/verify-email", { method: "POST", body: JSON.stringify({ userId, code }) }),
    resendCode: (userId: string) => 
      fetchJSON<any>("/auth/resend-code", { method: "POST", body: JSON.stringify({ userId }) }),
    completeProfile: (data: any) => 
      fetchJSON<any>("/auth/complete-profile", { method: "POST", body: JSON.stringify(data) }),
  },
  topics: {
    list: () => fetchJSON<any[]>("/topics"),
  },
  posts: {
    list: (topicSlug?: string) => fetchJSON<any[]>(`/posts${topicSlug ? `?topic=${topicSlug}` : ""}`),
    get: (id: string) => fetchJSON<any>(`/posts/${id}`),
    create: (data: any) => fetchJSON<any>("/posts", { method: "POST", body: JSON.stringify(data) }),
    like: (postId: string, userId: string) => 
      fetchJSON<any>(`/posts/${postId}/like`, { method: "POST", body: JSON.stringify({ userId }) }),
  },
  comments: {
    list: (postId: string) => fetchJSON<any[]>(`/posts/${postId}/comments`),
    create: (postId: string, data: any) => 
      fetchJSON<any>(`/posts/${postId}/comments`, { method: "POST", body: JSON.stringify(data) }),
  },
  users: {
    list: () => fetchJSON<any[]>("/users"),
    get: (id: string) => fetchJSON<any>(`/users/${id}`),
  },
  ranking: {
    list: () => fetchJSON<any[]>("/ranking"),
  },
  trustScore: {
    get: (postId: string) => fetchJSON<any>(`/trust-score/${postId}`),
  },
  agentVerify: {
    submit: (data: any) => fetchJSON<any>("/agent/verify", { method: "POST", body: JSON.stringify(data) }),
  },
  agentOrchestrator: {
    status: () => fetchJSON<any>("/agent-orchestrator/status"),
    activity: (limit = 50) => fetchJSON<any[]>(`/agent-orchestrator/activity?limit=${limit}`),
    trigger: () => fetchJSON<any>("/agent-orchestrator/trigger", { method: "POST" }),
  },
  economy: {
    wallet: (userId: string) => fetchJSON<any>(`/economy/wallet/${userId}`),
    transactions: (userId: string, limit = 50) => fetchJSON<any[]>(`/economy/transactions/${userId}?limit=${limit}`),
    metrics: () => fetchJSON<any>("/economy/metrics"),
    spend: (data: any) => fetchJSON<any>("/economy/spend", { method: "POST", body: JSON.stringify(data) }),
    transfer: (data: any) => fetchJSON<any>("/economy/transfer", { method: "POST", body: JSON.stringify(data) }),
  },
  agentLearning: {
    metrics: () => fetchJSON<any[]>("/agent-learning/metrics"),
    agentMetrics: (agentId: string) => fetchJSON<any>(`/agent-learning/metrics/${agentId}`),
    status: () => fetchJSON<any>("/agent-learning/status"),
    trigger: () => fetchJSON<any>("/agent-learning/trigger", { method: "POST" }),
  },
  societies: {
    list: () => fetchJSON<any[]>("/societies"),
    get: (id: string) => fetchJSON<any>(`/societies/${id}`),
    tasks: (id: string) => fetchJSON<any[]>(`/societies/${id}/tasks`),
    messages: (id: string, limit = 50) => fetchJSON<any[]>(`/societies/${id}/messages?limit=${limit}`),
  },
  collaboration: {
    metrics: () => fetchJSON<any>("/collaboration/metrics"),
    trigger: () => fetchJSON<any>("/collaboration/trigger", { method: "POST" }),
  },
  agentChat: {
    send: (data: any) => fetchJSON<any>("/agent/internal-chat", { method: "POST", body: JSON.stringify(data) }),
  },
  governance: {
    proposals: (status?: string) => fetchJSON<any[]>(`/governance/proposals${status ? `?status=${status}` : ""}`),
    proposal: (id: string) => fetchJSON<any>(`/governance/proposals/${id}`),
    createProposal: (data: any) => fetchJSON<any>("/governance/proposals", { method: "POST", body: JSON.stringify(data) }),
    vote: (proposalId: string, data: any) => fetchJSON<any>(`/governance/proposals/${proposalId}/vote`, { method: "POST", body: JSON.stringify(data) }),
    metrics: () => fetchJSON<any>("/governance/metrics"),
    trigger: () => fetchJSON<any>("/governance/trigger", { method: "POST" }),
  },
  alliances: {
    list: () => fetchJSON<any[]>("/alliances"),
  },
  institutions: {
    list: () => fetchJSON<any[]>("/institutions"),
    rules: () => fetchJSON<any[]>("/institution-rules"),
  },
  taskContracts: {
    list: (status?: string) => fetchJSON<any[]>(`/task-contracts${status ? `?status=${status}` : ""}`),
    create: (data: any) => fetchJSON<any>("/task-contracts", { method: "POST", body: JSON.stringify(data) }),
    bid: (contractId: string, data: any) => fetchJSON<any>(`/task-contracts/${contractId}/bid`, { method: "POST", body: JSON.stringify(data) }),
    selectBid: (contractId: string) => fetchJSON<any>(`/task-contracts/${contractId}/select-bid`, { method: "POST" }),
  },
  civilizations: {
    list: () => fetchJSON<any[]>("/civilizations"),
    get: (id: string) => fetchJSON<any>(`/civilizations/${id}`),
    metrics: () => fetchJSON<any>("/civilizations/metrics"),
    invest: (civId: string, data: any) => fetchJSON<any>(`/civilizations/${civId}/invest`, { method: "POST", body: JSON.stringify(data) }),
    trigger: () => fetchJSON<any>("/civilizations/trigger", { method: "POST" }),
  },
  agentIdentity: {
    get: (agentId: string) => fetchJSON<any>(`/agents/${agentId}/identity`),
    memory: (agentId: string, limit = 50, type?: string) =>
      fetchJSON<any[]>(`/agents/${agentId}/memory?limit=${limit}${type ? `&type=${type}` : ""}`),
  },
  ethics: {
    metrics: () => fetchJSON<any>("/ethics/metrics"),
    trigger: () => fetchJSON<any>("/ethics/trigger", { method: "POST" }),
    profile: (entityId: string) => fetchJSON<any>(`/ethics/profile/${entityId}`),
    rules: (status?: string) => fetchJSON<any[]>(`/ethics/rules${status ? `?status=${status}` : ""}`),
    events: (limit = 50) => fetchJSON<any[]>(`/ethics/events?limit=${limit}`),
  },
  evolution: {
    metrics: () => fetchJSON<any>("/evolution/metrics"),
    trigger: () => fetchJSON<any>("/evolution/trigger", { method: "POST" }),
    genome: (agentId: string) => fetchJSON<any>(`/evolution/genome/${agentId}`),
    lineage: (agentId: string) => fetchJSON<any>(`/evolution/lineage/${agentId}`),
    culturalMemory: (limit = 20, domain?: string) =>
      fetchJSON<any[]>(`/evolution/cultural-memory?limit=${limit}${domain ? `&domain=${domain}` : ""}`),
  },
  collective: {
    metrics: () => fetchJSON<any>("/collective/metrics"),
    goalField: () => fetchJSON<any>("/collective/goal-field"),
    insights: (status?: string) => fetchJSON<any[]>(`/collective/insights${status ? `?status=${status}` : ""}`),
    memory: () => fetchJSON<any>("/collective/memory"),
    trigger: () => fetchJSON<any>("/collective/trigger", { method: "POST" }),
  },
  debates: {
    list: (status?: string) => fetchJSON<any[]>(`/debates${status ? `?status=${status}` : ""}`),
    get: (id: number) => fetchJSON<any>(`/debates/${id}`),
    create: (data: any) => fetchJSON<any>("/debates", { method: "POST", body: JSON.stringify(data) }),
    join: (id: number, userId: string, participantType: string, position?: string) =>
      fetchJSON<any>(`/debates/${id}/join`, { method: "POST", body: JSON.stringify({ userId, participantType, position }) }),
    autoPopulate: (id: number, count?: number) =>
      fetchJSON<any>(`/debates/${id}/auto-populate`, { method: "POST", body: JSON.stringify({ count: count || 3 }) }),
    start: (id: number) => fetchJSON<any>(`/debates/${id}/start`, { method: "POST" }),
    submitTurn: (id: number, userId: string, content: string) =>
      fetchJSON<any>(`/debates/${id}/turn`, { method: "POST", body: JSON.stringify({ userId, content }) }),
    end: (id: number) => fetchJSON<any>(`/debates/${id}/end`, { method: "POST" }),
  },
  flywheel: {
    trigger: (debateId: number) => fetchJSON<any>(`/flywheel/trigger/${debateId}`, { method: "POST" }),
    jobs: () => fetchJSON<any[]>("/flywheel/jobs"),
    job: (id: number) => fetchJSON<any>(`/flywheel/jobs/${id}`),
    debateJob: (debateId: number) => fetchJSON<any>(`/flywheel/debate/${debateId}`),
    clip: (id: number) => fetchJSON<any>(`/flywheel/clips/${id}`),
    clipVideoUrl: (id: number) => `/api/flywheel/clips/${id}/video`,
  },
  admin: {
    login: (username: string, password: string) =>
      fetchJSON<{ token: string; expiresIn: number }>("/admin/login", { method: "POST", body: JSON.stringify({ username, password }) }),
    logout: () => adminFetch<any>("/admin/logout", { method: "POST" }),
    verify: () => adminFetch<{ valid: boolean }>("/admin/verify"),
    stats: () => adminFetch<any>("/admin/stats"),
    users: () => adminFetch<any[]>("/admin/users"),
    deleteUser: (id: string) => adminFetch<any>(`/admin/users/${id}`, { method: "DELETE" }),
    updateUser: (id: string, data: any) => adminFetch<any>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    posts: () => adminFetch<any[]>("/admin/posts"),
    deletePost: (id: string) => adminFetch<any>(`/admin/posts/${id}`, { method: "DELETE" }),
    topics: () => adminFetch<any[]>("/admin/topics"),
    createTopic: (data: any) => adminFetch<any>("/admin/topics", { method: "POST", body: JSON.stringify(data) }),
    deleteTopic: (id: string) => adminFetch<any>(`/admin/topics/${id}`, { method: "DELETE" }),
    debates: () => adminFetch<any[]>("/admin/debates"),
    deleteDebate: (id: number) => adminFetch<any>(`/admin/debates/${id}`, { method: "DELETE" }),
    triggerSystem: (system: string) => adminFetch<any>(`/admin/trigger/${system}`, { method: "POST" }),
    promotion: {
      scores: (limit?: number, status?: string) =>
        adminFetch<any[]>(`/admin/promotion/scores?limit=${limit || 50}${status ? `&status=${status}` : ""}`),
      score: (id: number) => adminFetch<any>(`/admin/promotion/scores/${id}`),
      reviewQueue: () => adminFetch<any[]>("/admin/promotion/review-queue"),
      evaluate: (data: { contentType: string; contentId: string }) =>
        adminFetch<any>("/admin/promotion/evaluate", { method: "POST", body: JSON.stringify(data) }),
      evaluateAll: () => adminFetch<any>("/admin/promotion/evaluate-all", { method: "POST" }),
      override: (id: number, decision: string) =>
        adminFetch<any>(`/admin/promotion/override/${id}`, { method: "POST", body: JSON.stringify({ decision }) }),
      process: () => adminFetch<any>("/admin/promotion/process", { method: "POST" }),
    },
    growth: {
      analytics: () => adminFetch<any>("/admin/growth/analytics"),
      performance: (limit?: number, platform?: string) =>
        adminFetch<any[]>(`/admin/growth/performance?limit=${limit || 50}${platform ? `&platform=${platform}` : ""}`),
      viral: (limit?: number) => adminFetch<any[]>(`/admin/growth/viral?limit=${limit || 10}`),
      patterns: (platform?: string) =>
        adminFetch<any[]>(`/admin/growth/patterns${platform ? `?platform=${platform}` : ""}`),
      learn: () => adminFetch<any>("/admin/growth/learn", { method: "POST" }),
      optimize: (platform: string) =>
        adminFetch<any>("/admin/growth/optimize", { method: "POST", body: JSON.stringify({ platform }) }),
    },
  },
  news: {
    list: (page = 1, limit = 20, category?: string) => fetchJSON<any>(`/news?page=${page}&limit=${limit}${category ? `&category=${category}` : ""}`),
    latest: (limit = 5) => fetchJSON<any[]>(`/news/latest?limit=${limit}`),
    get: (id: number) => fetchJSON<any>(`/news/${id}`),
    getBySlug: (slug: string) => fetchJSON<any>(`/news/slug/${slug}`),
    breaking: () => fetchJSON<any[]>(`/news/breaking`),
    comments: (articleId: number) => fetchJSON<any[]>(`/news/${articleId}/comments`),
    postComment: (articleId: number, data: { authorId: string; content: string; parentId?: number; commentType?: string }) =>
      fetchJSON<any>(`/news/${articleId}/comments`, { method: "POST", body: JSON.stringify(data) }),
    toggleLike: (articleId: number, userId: string) =>
      fetchJSON<any>(`/news/${articleId}/like`, { method: "POST", body: JSON.stringify({ userId }) }),
    checkLiked: (articleId: number, userId: string) =>
      fetchJSON<any>(`/news/${articleId}/liked?userId=${userId}`),
    share: (articleId: number, userId: string, platform?: string) =>
      fetchJSON<any>(`/news/${articleId}/share`, { method: "POST", body: JSON.stringify({ userId, platform }) }),
    likeComment: (commentId: number) =>
      fetchJSON<any>(`/news/comments/${commentId}/like`, { method: "POST" }),
    trigger: () => adminFetch<any>("/news/trigger", { method: "POST" }),
  },
  social: {
    accounts: () => adminFetch<any[]>("/social/accounts"),
    createAccount: (data: any) => adminFetch<any>("/social/accounts", { method: "POST", body: JSON.stringify(data) }),
    updateAccount: (id: number, data: any) => adminFetch<any>(`/social/accounts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteAccount: (id: number) => adminFetch<any>(`/social/accounts/${id}`, { method: "DELETE" }),
    posts: (limit?: number, status?: string) => adminFetch<any[]>(`/social/posts?limit=${limit || 50}${status ? `&status=${status}` : ""}`),
    createPost: (data: any) => adminFetch<any>("/social/posts", { method: "POST", body: JSON.stringify(data) }),
    publishPost: (id: number) => adminFetch<any>(`/social/posts/${id}/publish`, { method: "POST" }),
    generateCaption: (data: { contentType: string; contentId: string; platform?: string }) =>
      adminFetch<any>("/social/generate-caption", { method: "POST", body: JSON.stringify(data) }),
    triggerPublish: () => adminFetch<any>("/social/trigger-publish", { method: "POST" }),
  },
  seed: () => fetchJSON<any>("/seed", { method: "POST" }),
};
