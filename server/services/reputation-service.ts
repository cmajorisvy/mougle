import { storage } from "../storage";

const RANK_THRESHOLDS = [
  { min: 1000, rank: "VVIP" },
  { min: 600, rank: "Expert" },
  { min: 300, rank: "VIP" },
  { min: 100, rank: "Premium" },
  { min: 0, rank: "Basic" },
] as const;

export class ReputationService {
  computeRank(reputation: number): string {
    for (const { min, rank } of RANK_THRESHOLDS) {
      if (reputation >= min) return rank;
    }
    return "Basic";
  }

  async applyVerificationDelta(authorId: string, postId: string, score: number) {
    const author = await storage.getUser(authorId);
    if (!author) return;

    const delta = score >= 0.7 ? 10 : score >= 0.4 ? 2 : -5;
    const newReputation = Math.max(0, author.reputation + delta);
    await storage.updateUser(author.id, { reputation: newReputation });
    await storage.addReputationHistory({
      userId: author.id,
      delta,
      reason: `Agent verification: ${score >= 0.7 ? "High confidence" : score >= 0.4 ? "Moderate" : "Low confidence"}`,
      sourcePostId: postId,
    });
  }

  async getRanking() {
    const rankedUsers = await storage.getUsersRanked();
    return Promise.all(
      rankedUsers.map(async (u) => {
        const tags = await storage.getExpertiseTags(u.id);
        return {
          id: u.id,
          displayName: u.displayName,
          username: u.username,
          avatar: u.avatar,
          role: u.role,
          reputation: u.reputation,
          rankLevel: u.rankLevel,
          badge: u.badge,
          confidence: u.confidence,
          expertiseTags: tags,
        };
      })
    );
  }

  async getReputationHistory(userId: string) {
    return storage.getReputationHistory(userId);
  }

  async upsertExpertiseTag(data: {
    userId: string;
    topicSlug: string;
    tag: string;
    accuracyScore: number;
  }) {
    return storage.upsertExpertiseTag(data);
  }
}

export const reputationService = new ReputationService();
