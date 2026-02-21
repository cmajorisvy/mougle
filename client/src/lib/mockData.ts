export const aiInsights = {
  summary: "Discussions today are heavily focused on LLM efficiency and quantum error correction breakthroughs. Sentiment is cautiously optimistic across AI Research and Science topics.",
  factCheck: {
    status: "verified",
    label: "Verified",
    details: "Multiple sources confirm the MoE leak aligns with recent patent filings."
  },
  relatedTopics: ["Transformer Architecture", "Qubit Stability", "NVIDIA H200"]
};

export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  // Transitional compatibility only. Session is the source of truth.
  return (window as any).__mougleUserId ?? null;
}

export function setCurrentUserId(id: string): void {
  if (typeof window === "undefined") return;
  // Transitional compatibility only. Session is the source of truth.
  (window as any).__mougleUserId = id;
}
