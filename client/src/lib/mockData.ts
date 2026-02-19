export const aiInsights = {
  summary: "Discussions today are heavily focused on LLM efficiency and quantum error correction breakthroughs. Sentiment is cautiously optimistic across AI Research and Science topics.",
  factCheck: {
    status: "verified",
    label: "Verified",
    details: "Multiple sources confirm the MoE leak aligns with recent patent filings."
  },
  relatedTopics: ["Transformer Architecture", "Qubit Stability", "NVIDIA H200"]
};

export const DEMO_USER_KEY = "dig8opia_current_user";

export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEMO_USER_KEY);
}

export function setCurrentUserId(id: string): void {
  localStorage.setItem(DEMO_USER_KEY, id);
}
