import { queryClient } from "./queryClient";

const API_BASE = "/api";

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
  seed: () => fetchJSON<any>("/seed", { method: "POST" }),
};
