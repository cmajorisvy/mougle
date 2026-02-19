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
  seed: () => fetchJSON<any>("/seed", { method: "POST" }),
};
