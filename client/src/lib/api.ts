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
    forgotPassword: (email: string) =>
      fetchJSON<any>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (token: string, newPassword: string) =>
      fetchJSON<any>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword }) }),
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
    quickRun: (id: number, agentCount?: number, rounds?: number) =>
      fetchJSON<any>(`/debates/${id}/quick-run`, { method: "POST", body: JSON.stringify({ agentCount: agentCount || 3, rounds }) }),
    studioSetup: (id: number, youtubeStreamKey?: string) =>
      fetchJSON<any>(`/debates/${id}/studio/setup`, { method: "POST", body: JSON.stringify({ youtubeStreamKey }) }),
    studioOverrideSpeaker: (id: number, speakerId: string | null) =>
      fetchJSON<any>(`/debates/${id}/studio/override-speaker`, { method: "POST", body: JSON.stringify({ speakerId }) }),
    studioSpeech: (id: number, userId: string, transcript: string) =>
      fetchJSON<any>(`/debates/${id}/studio/speech`, { method: "POST", body: JSON.stringify({ userId, transcript }) }),
    studioTTS: (id: number, text: string, voice?: string) =>
      fetchJSON<any>(`/debates/${id}/studio/tts`, { method: "POST", body: JSON.stringify({ text, voice }) }),
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
    moderation: {
      flaggedUsers: () => adminFetch<any[]>("/admin/moderation/flagged-users"),
      logs: (limit?: number) => adminFetch<any[]>(`/admin/moderation/logs?limit=${limit || 100}`),
      userLogs: (userId: string) => adminFetch<any[]>(`/admin/moderation/logs/${userId}`),
      shadowBan: (userId: string) => adminFetch<any>(`/admin/moderation/shadow-ban/${userId}`, { method: "POST" }),
      unban: (userId: string) => adminFetch<any>(`/admin/moderation/unban/${userId}`, { method: "POST" }),
      markSpammer: (userId: string) => adminFetch<any>(`/admin/moderation/mark-spammer/${userId}`, { method: "POST" }),
      userStatus: (userId: string) => adminFetch<any>(`/admin/moderation/user-status/${userId}`),
    },
    founderControl: {
      configs: () => adminFetch<any[]>("/admin/founder-control/configs"),
      status: () => adminFetch<any>("/admin/founder-control/status"),
      updateConfig: (key: string, value: number) =>
        adminFetch<any>(`/admin/founder-control/config/${key}`, { method: "PATCH", body: JSON.stringify({ value }) }),
      bulkUpdate: (updates: Array<{ key: string; value: number }>) =>
        adminFetch<any>("/admin/founder-control/bulk-update", { method: "POST", body: JSON.stringify({ updates }) }),
      emergencyStop: () => adminFetch<any>("/admin/founder-control/emergency-stop", { method: "POST" }),
      emergencyRelease: () => adminFetch<any>("/admin/founder-control/emergency-release", { method: "POST" }),
    },
    founderDebug: {
      snapshot: () => adminFetch<any>("/founder-debug/snapshot"),
      aiLogs: (params?: { since?: number; model?: string; limit?: number }) =>
        adminFetch<any[]>(`/founder-debug/ai-logs${params ? `?${new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString()}` : ""}`),
      aiStats: () => adminFetch<any>("/founder-debug/ai-stats"),
      economics: () => adminFetch<any>("/founder-debug/economics"),
      journey: (params?: { userId?: string; event?: string; limit?: number }) =>
        adminFetch<any[]>(`/founder-debug/journey${params ? `?${new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString()}` : ""}`),
      journeySummary: () => adminFetch<any>("/founder-debug/journey-summary"),
      config: () => adminFetch<any>("/founder-debug/config"),
      updateConfig: (updates: any) => adminFetch<any>("/founder-debug/config", { method: "PUT", body: JSON.stringify(updates) }),
      aiLimits: () => adminFetch<any>("/founder-debug/ai-limits"),
    },
    stabilityTriangle: {
      snapshot: () => adminFetch<any>("/stability-triangle/snapshot"),
    },
    panicButton: {
      status: () => adminFetch<any>("/panic-button/status"),
      modes: () => adminFetch<any[]>("/panic-button/modes"),
      setMode: (mode: string) => adminFetch<any>("/panic-button/set-mode", { method: "POST", body: JSON.stringify({ mode }) }),
      alerts: (params?: { limit?: number; all?: boolean }) =>
        adminFetch<any[]>(`/panic-button/alerts${params ? `?${new URLSearchParams(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString()}` : ""}`),
      acknowledgeAlert: (id: string) => adminFetch<any>(`/panic-button/alerts/${id}/acknowledge`, { method: "POST" }),
      thresholds: () => adminFetch<any>("/panic-button/thresholds"),
      updateThresholds: (updates: any) => adminFetch<any>("/panic-button/thresholds", { method: "PUT", body: JSON.stringify(updates) }),
    },
    agentCostAnalytics: () => adminFetch<any>("/admin/agent-cost-analytics"),
    aiGatewayMetrics: () => adminFetch<any>("/admin/ai-gateway/metrics"),
    aiGatewayResetMetrics: () => adminFetch<any>("/admin/ai-gateway/reset-metrics", { method: "POST" }),
    commandCenter: {
      health: () => adminFetch<any>("/admin/command-center/health"),
      alerts: (limit = 50) => adminFetch<any[]>(`/admin/command-center/alerts?limit=${limit}`),
      openAlerts: () => adminFetch<any[]>("/admin/command-center/open-alerts"),
      acknowledgeAlert: (id: number) => adminFetch<any>(`/admin/command-center/alerts/${id}/acknowledge`, { method: "POST" }),
      resolveAlert: (id: number) => adminFetch<any>(`/admin/command-center/alerts/${id}/resolve`, { method: "POST" }),
      decisions: (status?: string) => adminFetch<any[]>(`/admin/command-center/decisions${status ? `?status=${status}` : ""}`),
      approveDecision: (id: number) => adminFetch<any>(`/admin/command-center/decisions/${id}/approve`, { method: "POST" }),
      rejectDecision: (id: number) => adminFetch<any>(`/admin/command-center/decisions/${id}/reject`, { method: "POST" }),
      policy: () => adminFetch<any>("/admin/command-center/policy"),
      updatePolicy: (data: { mode?: string; safeMode?: boolean; killSwitch?: boolean }) =>
        adminFetch<any>("/admin/command-center/policy", { method: "PATCH", body: JSON.stringify(data) }),
      killSwitch: () => adminFetch<any>("/admin/command-center/kill-switch", { method: "POST" }),
      releaseKillSwitch: () => adminFetch<any>("/admin/command-center/kill-switch/release", { method: "POST" }),
      safeMode: (enabled: boolean) => adminFetch<any>("/admin/command-center/safe-mode", { method: "POST", body: JSON.stringify({ enabled }) }),
      metricHistory: (key: string, since?: string) => adminFetch<any[]>(`/admin/command-center/metrics/${key}${since ? `?since=${since}` : ""}`),
      scan: () => adminFetch<any>("/admin/command-center/scan", { method: "POST" }),
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
  billing: {
    plans: () => fetchJSON<any[]>("/billing/plans"),
    creditPackages: () => fetchJSON<any[]>("/billing/credit-packages"),
    creditCosts: () => fetchJSON<any>("/billing/credit-costs"),
    purchaseCredits: (userId: string, packageId: string) =>
      fetchJSON<any>("/billing/purchase-credits", { method: "POST", body: JSON.stringify({ userId, packageId }) }),
    useCredits: (userId: string, actionType: string, actionLabel?: string, referenceId?: string) =>
      fetchJSON<any>("/billing/use-credits", { method: "POST", body: JSON.stringify({ userId, actionType, actionLabel, referenceId }) }),
    canAfford: (userId: string, actionType: string) =>
      fetchJSON<any>(`/billing/can-afford/${userId}/${actionType}`),
    summary: (userId: string) => fetchJSON<any>(`/billing/summary/${userId}`),
    subscription: (userId: string) => fetchJSON<any>(`/billing/subscription/${userId}`),
    subscribe: (userId: string, planName: string, billingCycle?: string) =>
      fetchJSON<any>("/billing/subscribe", { method: "POST", body: JSON.stringify({ userId, planName, billingCycle: billingCycle || "monthly" }) }),
    cancelSubscription: (userId: string) =>
      fetchJSON<any>("/billing/cancel-subscription", { method: "POST", body: JSON.stringify({ userId }) }),
    invoices: (userId: string) => fetchJSON<any[]>(`/billing/invoices/${userId}`),
    usage: (userId: string) => fetchJSON<any>(`/billing/usage/${userId}`),
    founderAnalytics: () => adminFetch<any>("/admin/billing/analytics"),
    founderFlywheel: () => adminFetch<any>("/admin/billing/flywheel"),
    founderPhaseTransition: () => adminFetch<any>("/admin/billing/phase-transition"),
    transitionIndex: () => adminFetch<any>("/admin/transition-index"),
    transitionMetrics: () => adminFetch<any>("/admin/transition-metrics"),
  },
  seo: {
    stats: () => adminFetch<any>("/seo/stats"),
    knowledge: () => fetchJSON<any>("/seo/knowledge"),
    knowledgeFeed: () => fetchJSON<any>("/seo/knowledge-feed"),
    calculateAuthority: (topicSlug?: string) => adminFetch<any>("/admin/seo/calculate-authority", { method: "POST", body: JSON.stringify({ topicSlug }) }),
    calculateGravity: () => adminFetch<any>("/admin/seo/calculate-gravity", { method: "POST" }),
    calculateCivilization: () => adminFetch<any>("/admin/seo/calculate-civilization", { method: "POST" }),
    generatePostSEO: (postId: string) => adminFetch<any>("/admin/seo/generate-post-seo", { method: "POST", body: JSON.stringify({ postId }) }),
    generateDebateConsensus: (debateId: number) => adminFetch<any>("/admin/seo/generate-debate-consensus", { method: "POST", body: JSON.stringify({ debateId }) }),
    batchGenerate: (limit?: number) => adminFetch<any>("/admin/seo/batch-generate", { method: "POST", body: JSON.stringify({ limit: limit || 10 }) }),
  },
  gravity: {
    history: (limit?: number) => adminFetch<any[]>(`/admin/gravity/history?limit=${limit || 20}`),
    trends: () => adminFetch<any>("/admin/gravity/trends"),
    calculate: () => adminFetch<any>("/admin/seo/calculate-gravity", { method: "POST" }),
    generateInsights: () => adminFetch<any>("/admin/gravity/generate-insights", { method: "POST" }),
  },
  civilization: {
    history: (limit?: number) => adminFetch<any[]>(`/admin/civilization/history?limit=${limit || 20}`),
    trends: () => adminFetch<any>("/admin/civilization/trends"),
    calculate: () => adminFetch<any>("/admin/seo/calculate-civilization", { method: "POST" }),
    generateInsights: () => adminFetch<any>("/admin/civilization/generate-insights", { method: "POST" }),
  },
  userAgents: {
    list: (ownerId?: string) => fetchJSON<any[]>(`/user-agents${ownerId ? `?ownerId=${ownerId}` : ""}`),
    get: (id: string) => fetchJSON<any>(`/user-agents/${id}`),
    create: (data: any) => fetchJSON<any>("/user-agents", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchJSON<any>(`/user-agents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => fetchJSON<any>(`/user-agents/${id}`, { method: "DELETE" }),
    deploy: (id: string, modes: string[]) => fetchJSON<any>(`/user-agents/${id}/deploy`, { method: "POST", body: JSON.stringify({ modes }) }),
    knowledge: (id: string) => fetchJSON<any[]>(`/user-agents/${id}/knowledge`),
    addKnowledge: (id: string, data: any) => fetchJSON<any>(`/user-agents/${id}/knowledge`, { method: "POST", body: JSON.stringify(data) }),
    deleteKnowledge: (sourceId: string) => fetchJSON<any>(`/user-agents/knowledge/${sourceId}`, { method: "DELETE" }),
    use: (id: string, data: any) => fetchJSON<any>(`/user-agents/${id}/use`, { method: "POST", body: JSON.stringify(data) }),
    usage: (id: string, limit?: number) => fetchJSON<any[]>(`/user-agents/${id}/usage?limit=${limit || 50}`),
  },
  marketplace: {
    listings: (category?: string) => fetchJSON<any[]>(`/marketplace/listings${category ? `?category=${category}` : ""}`),
    listing: (id: string) => fetchJSON<any>(`/marketplace/listings/${id}`),
    createListing: (data: any) => fetchJSON<any>("/marketplace/listings", { method: "POST", body: JSON.stringify(data) }),
    purchase: (buyerId: string, listingId: string) => fetchJSON<any>("/marketplace/purchase", { method: "POST", body: JSON.stringify({ buyerId, listingId }) }),
    purchases: (userId: string) => fetchJSON<any[]>(`/marketplace/purchases/${userId}`),
    earnings: (userId: string) => fetchJSON<any>(`/marketplace/earnings/${userId}`),
  },
  store: {
    rankings: (limit?: number) => fetchJSON<any[]>(`/store/rankings?limit=${limit || 20}`),
    featured: () => fetchJSON<any[]>("/store/featured"),
    trending: (limit?: number) => fetchJSON<any[]>(`/store/trending?limit=${limit || 10}`),
    search: (q: string, category?: string) => fetchJSON<any[]>(`/store/search?q=${encodeURIComponent(q)}${category ? `&category=${category}` : ""}`),
    reviews: (listingId: string) => fetchJSON<any[]>(`/store/reviews/${listingId}`),
    postReview: (data: any) => fetchJSON<any>("/store/reviews", { method: "POST", body: JSON.stringify(data) }),
  },
  agentVersions: {
    list: (agentId: string) => fetchJSON<any[]>(`/user-agents/${agentId}/versions`),
    create: (agentId: string, data: any) => fetchJSON<any>(`/user-agents/${agentId}/versions`, { method: "POST", body: JSON.stringify(data) }),
  },
  agentRunner: {
    run: (agentId: string, message: string, callerId: string) =>
      fetchJSON<any>("/agent-runner/run", { method: "POST", body: JSON.stringify({ agentId, message, callerId }) }),
    demo: (agentId: string, message: string) =>
      fetchJSON<any>("/agent-runner/demo", { method: "POST", body: JSON.stringify({ agentId, message }) }),
    estimate: (model?: string, action?: string) =>
      fetchJSON<any>(`/agent-runner/estimate?model=${model || "gpt-4o"}&action=${action || "chat"}`),
    estimateTraining: (sourceCount: number, totalChars: number) =>
      fetchJSON<any>("/agent-runner/estimate-training", { method: "POST", body: JSON.stringify({ sourceCount, totalChars }) }),
    train: (agentId: string, ownerId: string, sources: any[]) =>
      fetchJSON<any>("/agent-runner/train", { method: "POST", body: JSON.stringify({ agentId, ownerId, sources }) }),
    resume: (ownerId: string) =>
      fetchJSON<any>("/agent-runner/resume", { method: "POST", body: JSON.stringify({ ownerId }) }),
  },
  walletStatus: {
    get: (userId: string) => fetchJSON<any>(`/wallet-status/${userId}`),
  },
  byoai: {
    status: (userId: string) => fetchJSON<any>(`/byoai/status/${userId}`),
    set: (userId: string, provider: string, apiKey: string) =>
      fetchJSON<any>("/byoai/set", { method: "POST", body: JSON.stringify({ userId, provider, apiKey }) }),
    remove: (userId: string) =>
      fetchJSON<any>("/byoai/remove", { method: "POST", body: JSON.stringify({ userId }) }),
  },
  agentCosts: {
    logs: (ownerId: string, limit?: number) => fetchJSON<any>(`/agent-costs/${ownerId}?limit=${limit || 50}`),
  },
  creatorAnalytics: {
    get: (userId: string) => fetchJSON<any>(`/creator-analytics/${userId}`),
  },
  industries: {
    list: () => fetchJSON<any[]>("/industries"),
    categories: (slug: string) => fetchJSON<any[]>(`/industries/${slug}/categories`),
    roles: (slug: string, category?: string) => fetchJSON<any[]>(`/industries/${slug}/roles${category ? `?category=${category}` : ""}`),
    knowledgePacks: (slug: string) => fetchJSON<any[]>(`/industries/${slug}/knowledge-packs`),
    skillTree: (slug: string) => fetchJSON<any[]>(`/industries/${slug}/skill-tree`),
  },
  knowledgePacks: {
    list: () => fetchJSON<any[]>("/knowledge-packs"),
  },
  agentProgression: {
    get: (agentId: string) => fetchJSON<any>(`/agents/${agentId}/progression`),
    unlockSkill: (agentId: string, skillSlug: string) =>
      fetchJSON<any>(`/agents/${agentId}/unlock-skill`, { method: "POST", body: JSON.stringify({ skillSlug }) }),
    awardXp: (agentId: string, source: string, contentLength?: number) =>
      fetchJSON<any>(`/agents/${agentId}/award-xp`, { method: "POST", body: JSON.stringify({ source, contentLength }) }),
    certifications: (agentId: string) => fetchJSON<any[]>(`/agents/${agentId}/certifications`),
    checkCertifications: (agentId: string) =>
      fetchJSON<any>(`/agents/${agentId}/check-certifications`, { method: "POST" }),
    skillEffects: (agentId: string) => fetchJSON<any>(`/agents/${agentId}/skill-effects`),
    specialization: (agentId: string) => fetchJSON<any>(`/agents/${agentId}/specialization`),
    setSpecialization: (agentId: string, data: any) =>
      fetchJSON<any>(`/agents/${agentId}/specialization`, { method: "POST", body: JSON.stringify(data) }),
  },
  xpSources: () => fetchJSON<any>("/xp-sources"),
  agentTrust: {
    get: (agentId: string) => fetchJSON<any>(`/agents/${agentId}/trust`),
    recordEvent: (agentId: string, eventType: string, sourceId?: string, sourceUserId?: string) =>
      fetchJSON<any>(`/agents/${agentId}/trust/event`, { method: "POST", body: JSON.stringify({ eventType, sourceId, sourceUserId }) }),
    recalculate: (agentId: string) =>
      fetchJSON<any>(`/agents/${agentId}/trust/recalculate`, { method: "POST" }),
    history: (agentId: string, limit?: number) =>
      fetchJSON<any[]>(`/agents/${agentId}/trust/history?limit=${limit || 30}`),
    eventTypes: () => fetchJSON<any>("/trust/event-types"),
    tiers: () => fetchJSON<any[]>("/trust/tiers"),
  },
  labs: {
    opportunities: (filters?: { industry?: string; category?: string; difficulty?: string }) => {
      const params = new URLSearchParams();
      if (filters?.industry) params.set("industry", filters.industry);
      if (filters?.category) params.set("category", filters.category);
      if (filters?.difficulty) params.set("difficulty", filters.difficulty);
      const qs = params.toString();
      return fetchJSON<any[]>(`/labs/opportunities${qs ? `?${qs}` : ""}`);
    },
    opportunity: (id: string) => fetchJSON<any>(`/labs/opportunities/${id}`),
    seed: () => fetchJSON<any>("/labs/opportunities/seed", { method: "POST" }),
    build: (id: string) => fetchJSON<any>(`/labs/opportunities/${id}/build`, { method: "POST" }),
    meta: () => fetchJSON<any>("/labs/meta"),
    disclaimers: (industry: string) => fetchJSON<any>(`/labs/disclaimers/${industry}`),
    apps: (filters?: { category?: string; pricingModel?: string; industry?: string }) => {
      const params = new URLSearchParams();
      if (filters?.category) params.set("category", filters.category);
      if (filters?.pricingModel) params.set("pricingModel", filters.pricingModel);
      if (filters?.industry) params.set("industry", filters.industry);
      const qs = params.toString();
      return fetchJSON<any[]>(`/labs/apps${qs ? `?${qs}` : ""}`);
    },
    app: (id: string) => fetchJSON<any>(`/labs/apps/${id}`),
    publishApp: (data: any) => fetchJSON<any>("/labs/apps", { method: "POST", body: JSON.stringify(data) }),
    userApps: (userId: string) => fetchJSON<any[]>(`/labs/apps/user/${userId}`),
    install: (appId: string, userId: string) => fetchJSON<any>(`/labs/apps/${appId}/install`, { method: "POST", body: JSON.stringify({ userId }) }),
    uninstall: (appId: string, userId: string) => fetchJSON<any>(`/labs/apps/${appId}/install`, { method: "DELETE", body: JSON.stringify({ userId }) }),
    installations: (userId: string) => fetchJSON<any[]>(`/labs/installations/${userId}`),
    toggleFavorite: (userId: string, itemId: string, itemType: string) => fetchJSON<any>("/labs/favorites", { method: "POST", body: JSON.stringify({ userId, itemId, itemType }) }),
    favorites: (userId: string) => fetchJSON<any[]>(`/labs/favorites/${userId}`),
    addReview: (data: any) => fetchJSON<any>("/labs/reviews", { method: "POST", body: JSON.stringify(data) }),
    reviews: (appId: string) => fetchJSON<any[]>(`/labs/reviews/${appId}`),
    flywheel: {
      summary: () => fetchJSON<any>("/labs/flywheel/summary"),
      analytics: (days?: number) => fetchJSON<any[]>(`/labs/flywheel/analytics${days ? `?days=${days}` : ""}`),
      growthLoop: () => fetchJSON<any>("/labs/flywheel/growth-loop"),
      generate: () => fetchJSON<any>("/labs/flywheel/generate", { method: "POST" }),
      snapshot: () => fetchJSON<any>("/labs/flywheel/snapshot", { method: "POST" }),
      rankings: (limit?: number) => fetchJSON<any[]>(`/labs/flywheel/rankings${limit ? `?limit=${limit}` : ""}`),
      creatorRanking: (creatorId: string) => fetchJSON<any>(`/labs/flywheel/rankings/${creatorId}`),
      recalculateRankings: () => fetchJSON<any>("/labs/flywheel/rankings/recalculate", { method: "POST" }),
      createReferral: (appId: string, creatorId: string) => fetchJSON<any>("/labs/flywheel/referral", { method: "POST", body: JSON.stringify({ appId, creatorId }) }),
      getReferral: (code: string) => fetchJSON<any>(`/labs/flywheel/referral/${code}`),
      creatorReferrals: (creatorId: string) => fetchJSON<any[]>(`/labs/flywheel/referrals/${creatorId}`),
      trackSignup: (code: string) => fetchJSON<any>(`/labs/flywheel/referral/${code}/signup`, { method: "POST" }),
      generateLandingPage: (appId: string) => fetchJSON<any>("/labs/flywheel/landing-page", { method: "POST", body: JSON.stringify({ appId }) }),
      getLandingPage: (slug: string) => fetchJSON<any>(`/labs/flywheel/landing-page/${slug}`),
      getLandingPageByApp: (appId: string) => fetchJSON<any>(`/labs/flywheel/landing-page/app/${appId}`),
      trackConversion: (slug: string) => fetchJSON<any>(`/labs/flywheel/landing-page/${slug}/convert`, { method: "POST" }),
    },
  },
  superLoop: {
    summary: () => fetchJSON<any>("/super-loop/summary"),
    health: () => fetchJSON<any>("/super-loop/health"),
    cycles: (limit?: number) => fetchJSON<any[]>(`/super-loop/cycles${limit ? `?limit=${limit}` : ""}`),
    funnel: () => fetchJSON<any[]>("/super-loop/funnel"),
    revenue: () => fetchJSON<any>("/super-loop/revenue"),
    timeline: (days?: number) => fetchJSON<any[]>(`/super-loop/timeline${days ? `?days=${days}` : ""}`),
    snapshot: () => fetchJSON<any>("/super-loop/snapshot", { method: "POST" }),
    trigger: () => fetchJSON<any>("/super-loop/trigger", { method: "POST" }),
  },
  razorpay: {
    onboardCreator: (data: { userId: string; businessName: string; email: string; contactName: string; phone?: string }) =>
      fetchJSON<any>("/razorpay/onboard-creator", { method: "POST", body: JSON.stringify(data) }),
    getCreatorAccount: (userId: string) => fetchJSON<any>(`/razorpay/creator-account/${userId}`),
    createOrder: (buyerId: string, listingId: string) =>
      fetchJSON<any>("/razorpay/create-order", { method: "POST", body: JSON.stringify({ buyerId, listingId }) }),
    verifyPayment: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
      fetchJSON<any>("/razorpay/verify-payment", { method: "POST", body: JSON.stringify(data) }),
    getCreatorEarnings: (userId: string) => fetchJSON<any>(`/razorpay/creator-earnings/${userId}`),
    getCreatorOrders: (userId: string) => fetchJSON<any>(`/razorpay/creator-orders/${userId}`),
  },
  publisher: {
    getProfile: (userId: string) => fetchJSON<any>(`/publisher/profile/${userId}`),
    saveProfile: (data: any) => fetchJSON<any>("/publisher/profile", { method: "POST", body: JSON.stringify(data) }),
    acceptAgreement: (userId: string) => fetchJSON<any>("/publisher/accept-agreement", { method: "POST", body: JSON.stringify({ userId }) }),
    canPublish: (userId: string) => fetchJSON<any>(`/publisher/can-publish/${userId}`),
    getAgreement: () => fetchJSON<any>("/publisher/agreement"),
    getAppInfo: (appId: string) => fetchJSON<any>(`/publisher/app-info/${appId}`),
    getDisclaimer: () => fetchJSON<any>("/publisher/disclaimer"),
  },
  legalSafety: {
    getRiskDisclaimer: (appId: string) => fetchJSON<any>(`/legal-safety/risk-disclaimer/${appId}`),
    generateDisclaimer: (data: any) => fetchJSON<any>("/legal-safety/generate-disclaimer", { method: "POST", body: JSON.stringify(data) }),
    getRiskCategories: () => fetchJSON<any>("/legal-safety/risk-categories"),
    submitReport: (data: any) => fetchJSON<any>("/legal-safety/report", { method: "POST", body: JSON.stringify(data) }),
    getReports: (appId: string) => fetchJSON<any>(`/legal-safety/reports/${appId}`),
    getReportCategories: () => fetchJSON<any>("/legal-safety/report-categories"),
    checkAiContent: (data: any) => fetchJSON<any>("/legal-safety/check-ai-content", { method: "POST", body: JSON.stringify(data) }),
    getAiViolations: (appId?: string) => fetchJSON<any>(`/legal-safety/ai-violations${appId ? `?appId=${appId}` : ""}`),
    getAiPolicyRules: () => fetchJSON<any>("/legal-safety/ai-policy-rules"),
    getCreationLimit: (userId: string, tier?: string) => fetchJSON<any>(`/legal-safety/creation-limit/${userId}${tier ? `?tier=${tier}` : ""}`),
    incrementCreation: (data: any) => fetchJSON<any>("/legal-safety/increment-creation", { method: "POST", body: JSON.stringify(data) }),
    getPublishChecks: (userId: string, appId: string) => fetchJSON<any>(`/legal-safety/publish-checks/${userId}/${appId}`),
    getDailyLimits: () => fetchJSON<any>("/legal-safety/daily-limits"),
    getStats: () => fetchJSON<any>("/admin/legal-safety/stats"),
    getModerationReports: (status?: string) => fetchJSON<any>(`/admin/moderation/reports${status ? `?status=${status}` : ""}`),
    resolveReport: (data: any) => fetchJSON<any>("/admin/moderation/resolve", { method: "POST", body: JSON.stringify(data) }),
    dismissReport: (data: any) => fetchJSON<any>("/admin/moderation/dismiss", { method: "POST", body: JSON.stringify(data) }),
  },
  creatorVerification: {
    getStatus: (userId: string) => fetchJSON<any>(`/creator-verification/status/${userId}`),
    getTrustLevels: () => fetchJSON<any>("/creator-verification/trust-levels"),
    getMarketingMethods: () => fetchJSON<any>("/creator-verification/marketing-methods"),
    getPromotionChannels: () => fetchJSON<any>("/creator-verification/promotion-channels"),
    getPromotionAgreement: () => fetchJSON<any>("/creator-verification/promotion-agreement"),
    getPrivacyNotice: () => fetchJSON<any>("/creator-verification/privacy-notice"),
    getDeclaration: (userId: string) => fetchJSON<any>(`/creator-verification/declaration/${userId}`),
    submitDeclaration: (data: any) => fetchJSON<any>("/creator-verification/declaration", { method: "POST", body: JSON.stringify(data) }),
    upgrade: (userId: string) => fetchJSON<any>("/creator-verification/upgrade", { method: "POST", body: JSON.stringify({ userId }) }),
  },
  gcis: {
    dashboard: () => adminFetch<any>("/admin/gcis/dashboard"),
    rules: (filters?: { status?: string; countryCode?: string; category?: string }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.countryCode) params.set("countryCode", filters.countryCode);
      if (filters?.category) params.set("category", filters.category);
      const qs = params.toString();
      return adminFetch<any[]>(`/admin/gcis/rules${qs ? `?${qs}` : ""}`);
    },
    scan: (countryCode?: string) => adminFetch<any>("/admin/gcis/scan", { method: "POST", body: JSON.stringify({ countryCode }) }),
    ingestRule: (data: any) => adminFetch<any>("/admin/gcis/rules/ingest", { method: "POST", body: JSON.stringify(data) }),
    approveRule: (id: string) => adminFetch<any>(`/admin/gcis/rules/${id}/approve`, { method: "POST" }),
    rejectRule: (id: string, reason: string) => adminFetch<any>(`/admin/gcis/rules/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    featureFlags: (countryCode?: string) => adminFetch<any>(`/admin/gcis/feature-flags${countryCode ? `?countryCode=${countryCode}` : ""}`),
    auditLog: (limit?: number) => adminFetch<any[]>(`/admin/gcis/audit-log?limit=${limit || 50}`),
    notifications: (unreadOnly?: boolean) => adminFetch<any[]>(`/admin/gcis/notifications${unreadOnly ? "?unreadOnly=true" : ""}`),
    markNotificationRead: (id: string) => adminFetch<any>(`/admin/gcis/notifications/${id}/read`, { method: "POST" }),
    ecoEfficiency: () => adminFetch<any>("/admin/gcis/eco-efficiency"),
  },
  policy: {
    dashboard: () => adminFetch<any>("/admin/policy/dashboard"),
    templates: (category?: string) => adminFetch<any[]>(`/admin/policy/templates${category ? `?category=${category}` : ""}`),
    initTemplates: () => adminFetch<any>("/admin/policy/templates/init", { method: "POST" }),
    drafts: (status?: string) => adminFetch<any[]>(`/admin/policy/drafts${status ? `?status=${status}` : ""}`),
    getDraft: (id: string) => adminFetch<any>(`/admin/policy/drafts/${id}`),
    generate: (templateId: string, triggerType?: string, triggerDetails?: any) =>
      adminFetch<any>("/admin/policy/generate", { method: "POST", body: JSON.stringify({ templateId, triggerType: triggerType || "manual", triggerDetails }) }),
    approve: (id: string) => adminFetch<any>(`/admin/policy/drafts/${id}/approve`, { method: "POST" }),
    reject: (id: string, reason: string) => adminFetch<any>(`/admin/policy/drafts/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    versions: (templateId: string) => adminFetch<any[]>(`/admin/policy/versions/${templateId}`),
    rollback: (templateId: string, versionId: string) =>
      adminFetch<any>("/admin/policy/rollback", { method: "POST", body: JSON.stringify({ templateId, versionId }) }),
    detectUpdates: () => adminFetch<any>("/admin/policy/detect-updates", { method: "POST" }),
    publicPolicy: (slug: string) => fetchJSON<any>(`/policy/${slug}`),
  },
  support: {
    createTicket: (data: { subject: string; description: string; category?: string; priority?: string }) =>
      fetchJSON<any>("/support/tickets", { method: "POST", body: JSON.stringify(data) }),
    getTickets: () => fetchJSON<any[]>("/support/tickets"),
    getTicket: (id: string) => fetchJSON<any>(`/support/tickets/${id}`),
    getMessages: (id: string) => fetchJSON<any[]>(`/support/tickets/${id}/messages`),
    addMessage: (id: string, content: string) =>
      fetchJSON<any>(`/support/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
    chat: (message: string) => fetchJSON<{ reply: string; sources?: { id: string; title: string }[]; preventiveHelp?: string }>("/support/chat", { method: "POST", body: JSON.stringify({ message }) }),
    classify: (subject: string, description: string) =>
      fetchJSON<{ category: string; intent: string; suggestedPriority: string }>("/support/classify", { method: "POST", body: JSON.stringify({ subject, description }) }),
    preventiveHelp: (context: string) =>
      fetchJSON<{ prompts: string[] }>("/support/preventive-help", { method: "POST", body: JSON.stringify({ context }) }),
    kbSearch: (q: string) => fetchJSON<any[]>(`/support/kb/search?q=${encodeURIComponent(q)}`),
    kbArticles: () => fetchJSON<any[]>("/support/kb/articles"),
    kbMarkHelpful: (id: string) => fetchJSON<any>(`/support/kb/articles/${id}/helpful`, { method: "POST" }),
  },
  adminSupport: {
    getTickets: (status?: string) => adminFetch<any[]>(`/admin/support/tickets${status ? `?status=${status}` : ""}`),
    getStats: () => adminFetch<any>("/admin/support/stats"),
    getTicket: (id: string) => adminFetch<any>(`/admin/support/tickets/${id}`),
    getMessages: (id: string) => adminFetch<any[]>(`/admin/support/tickets/${id}/messages`),
    reply: (id: string, content: string) =>
      adminFetch<any>(`/admin/support/tickets/${id}/reply`, { method: "POST", body: JSON.stringify({ content }) }),
    updateStatus: (id: string, status: string) =>
      adminFetch<any>(`/admin/support/tickets/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
    generateAiReply: (id: string) => adminFetch<{ reply: string }>(`/admin/support/tickets/${id}/ai-reply`, { method: "POST" }),
    testEmail: (type: string, to: string, displayName: string) =>
      adminFetch<any>("/admin/email/test", { method: "POST", body: JSON.stringify({ type, to, displayName }) }),
    seedDemo: () => adminFetch<any>("/admin/support/demo-seed", { method: "POST" }),
  },
  adminKB: {
    getStats: () => adminFetch<any>("/admin/kb/stats"),
    getArticles: (status?: string) => adminFetch<any[]>(`/admin/kb/articles${status ? `?status=${status}` : ""}`),
    getArticle: (id: string) => adminFetch<any>(`/admin/kb/articles/${id}`),
    updateArticle: (id: string, data: any) => adminFetch<any>(`/admin/kb/articles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    approveArticle: (id: string) => adminFetch<any>(`/admin/kb/articles/${id}/approve`, { method: "POST" }),
    rejectArticle: (id: string) => adminFetch<any>(`/admin/kb/articles/${id}/reject`, { method: "POST" }),
    getSolutions: (ticketId?: string) => adminFetch<any[]>(`/admin/kb/solutions${ticketId ? `?ticketId=${ticketId}` : ""}`),
    extractSolution: (ticketId: string) => adminFetch<any>(`/admin/kb/extract/${ticketId}`, { method: "POST" }),
    generateArticle: (solutionIds: string[]) => adminFetch<any>("/admin/kb/generate-article", { method: "POST", body: JSON.stringify({ solutionIds }) }),
  },
  adminWorkday: {
    get: () => adminFetch<any>("/admin/workday"),
  },
  adminOps: {
    getSnapshot: () => adminFetch<any>("/admin/operations/snapshot"),
    getStats: () => adminFetch<any>("/admin/operations/stats"),
    getActions: (engine?: string) => adminFetch<any[]>(`/admin/operations/actions${engine ? `?engine=${engine}` : ""}`),
    getPending: () => adminFetch<any[]>("/admin/operations/pending"),
    getEngineHistory: (engine: string) => adminFetch<any[]>(`/admin/operations/engine/${engine}/history`),
    approveAction: (id: string) => adminFetch<any>(`/admin/operations/actions/${id}/approve`, { method: "POST" }),
    rejectAction: (id: string) => adminFetch<any>(`/admin/operations/actions/${id}/reject`, { method: "POST" }),
  },
  seed: () => fetchJSON<any>("/seed", { method: "POST" }),
};
