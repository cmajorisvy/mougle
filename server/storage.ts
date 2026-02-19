import {
  type User, type InsertUser,
  type Topic, type InsertTopic,
  type Post, type InsertPost,
  type Comment, type InsertComment,
  type Claim, type InsertClaim,
  type Evidence, type InsertEvidence,
  type TrustScore, type InsertTrustScore,
  type AgentVote, type InsertAgentVote,
  type ReputationHistory, type InsertReputationHistory,
  type ExpertiseTag, type InsertExpertiseTag,
  type AgentActivityLog, type InsertAgentActivityLog,
  users, topics, posts, comments, postLikes,
  claims, evidence, trustScores, agentVotes, reputationHistory, expertiseTags,
  agentActivityLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, asc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  getUsers(): Promise<User[]>;
  getUsersRanked(): Promise<User[]>;

  getTopics(): Promise<Topic[]>;
  getTopicBySlug(slug: string): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;

  getPosts(): Promise<Post[]>;
  getPostsByTopic(topicSlug: string): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  likePost(postId: string, userId: string): Promise<Post>;
  unlikePost(postId: string, userId: string): Promise<Post>;
  hasLiked(postId: string, userId: string): Promise<boolean>;

  getComments(postId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentCount(postId: string): Promise<number>;

  getClaims(postId: string): Promise<Claim[]>;
  createClaim(claim: InsertClaim): Promise<Claim>;

  getEvidence(postId: string): Promise<Evidence[]>;
  createEvidence(ev: InsertEvidence): Promise<Evidence>;

  getTrustScore(postId: string): Promise<TrustScore | undefined>;
  upsertTrustScore(ts: InsertTrustScore): Promise<TrustScore>;

  getAgentVotes(postId: string): Promise<AgentVote[]>;
  createAgentVote(vote: InsertAgentVote): Promise<AgentVote>;
  getAgentVoteCount(postId: string): Promise<number>;

  addReputationHistory(entry: InsertReputationHistory): Promise<ReputationHistory>;
  getReputationHistory(userId: string): Promise<ReputationHistory[]>;

  getExpertiseTags(userId: string): Promise<ExpertiseTag[]>;
  upsertExpertiseTag(tag: InsertExpertiseTag): Promise<ExpertiseTag>;

  getAgentUsers(): Promise<User[]>;
  getRecentPosts(limit: number): Promise<Post[]>;
  createAgentActivity(entry: InsertAgentActivityLog): Promise<AgentActivityLog>;
  getAgentActivityLog(limit: number): Promise<AgentActivityLog[]>;
  getAgentLastActivity(agentId: string): Promise<AgentActivityLog | undefined>;
  hasAgentActedOnPost(agentId: string, postId: string, actionType: string): Promise<boolean>;
  getAgentActionCountSince(agentId: string, since: Date): Promise<number>;
}

function computeRank(reputation: number): string {
  if (reputation >= 1000) return "VVIP";
  if (reputation >= 600) return "Expert";
  if (reputation >= 300) return "VIP";
  if (reputation >= 100) return "Premium";
  return "Basic";
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const rank = computeRank(user.reputation || 0);
    const [created] = await db.insert(users).values({ ...user, rankLevel: rank }).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    if (data.reputation !== undefined) {
      data.rankLevel = computeRank(data.reputation);
    }
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUsersRanked(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.reputation));
  }

  async getTopics(): Promise<Topic[]> {
    return db.select().from(topics);
  }

  async getTopicBySlug(slug: string): Promise<Topic | undefined> {
    const [topic] = await db.select().from(topics).where(eq(topics.slug, slug));
    return topic;
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const [created] = await db.insert(topics).values(topic).returning();
    return created;
  }

  async getPosts(): Promise<Post[]> {
    return db.select().from(posts).orderBy(desc(posts.createdAt));
  }

  async getPostsByTopic(topicSlug: string): Promise<Post[]> {
    return db.select().from(posts).where(eq(posts.topicSlug, topicSlug)).orderBy(desc(posts.createdAt));
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [created] = await db.insert(posts).values(post).returning();
    return created;
  }

  async likePost(postId: string, userId: string): Promise<Post> {
    await db.insert(postLikes).values({ postId, userId });
    const [updated] = await db.update(posts)
      .set({ likes: sql`${posts.likes} + 1` })
      .where(eq(posts.id, postId))
      .returning();
    return updated;
  }

  async unlikePost(postId: string, userId: string): Promise<Post> {
    await db.delete(postLikes).where(
      and(eq(postLikes.postId, postId), eq(postLikes.userId, userId))
    );
    const [updated] = await db.update(posts)
      .set({ likes: sql`GREATEST(${posts.likes} - 1, 0)` })
      .where(eq(posts.id, postId))
      .returning();
    return updated;
  }

  async hasLiked(postId: string, userId: string): Promise<boolean> {
    const [like] = await db.select().from(postLikes).where(
      and(eq(postLikes.postId, postId), eq(postLikes.userId, userId))
    );
    return !!like;
  }

  async getComments(postId: string): Promise<Comment[]> {
    return db.select().from(comments).where(eq(comments.postId, postId)).orderBy(desc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [created] = await db.insert(comments).values(comment).returning();
    return created;
  }

  async getCommentCount(postId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.postId, postId));
    return Number(result[0]?.count || 0);
  }

  async getClaims(postId: string): Promise<Claim[]> {
    return db.select().from(claims).where(eq(claims.postId, postId));
  }

  async createClaim(claim: InsertClaim): Promise<Claim> {
    const [created] = await db.insert(claims).values(claim).returning();
    return created;
  }

  async getEvidence(postId: string): Promise<Evidence[]> {
    return db.select().from(evidence).where(eq(evidence.postId, postId));
  }

  async createEvidence(ev: InsertEvidence): Promise<Evidence> {
    const [created] = await db.insert(evidence).values(ev).returning();
    return created;
  }

  async getTrustScore(postId: string): Promise<TrustScore | undefined> {
    const [ts] = await db.select().from(trustScores).where(eq(trustScores.postId, postId));
    return ts;
  }

  async upsertTrustScore(ts: InsertTrustScore): Promise<TrustScore> {
    const existing = await this.getTrustScore(ts.postId);
    if (existing) {
      const [updated] = await db.update(trustScores).set({ ...ts, updatedAt: new Date() }).where(eq(trustScores.postId, ts.postId)).returning();
      return updated;
    }
    const [created] = await db.insert(trustScores).values(ts).returning();
    return created;
  }

  async getAgentVotes(postId: string): Promise<AgentVote[]> {
    return db.select().from(agentVotes).where(eq(agentVotes.postId, postId));
  }

  async createAgentVote(vote: InsertAgentVote): Promise<AgentVote> {
    const [created] = await db.insert(agentVotes).values(vote).returning();
    return created;
  }

  async getAgentVoteCount(postId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(agentVotes).where(eq(agentVotes.postId, postId));
    return Number(result[0]?.count || 0);
  }

  async addReputationHistory(entry: InsertReputationHistory): Promise<ReputationHistory> {
    const [created] = await db.insert(reputationHistory).values(entry).returning();
    return created;
  }

  async getReputationHistory(userId: string): Promise<ReputationHistory[]> {
    return db.select().from(reputationHistory).where(eq(reputationHistory.userId, userId)).orderBy(desc(reputationHistory.createdAt));
  }

  async getExpertiseTags(userId: string): Promise<ExpertiseTag[]> {
    return db.select().from(expertiseTags).where(eq(expertiseTags.userId, userId));
  }

  async upsertExpertiseTag(tag: InsertExpertiseTag): Promise<ExpertiseTag> {
    const existing = await db.select().from(expertiseTags).where(
      and(eq(expertiseTags.userId, tag.userId), eq(expertiseTags.topicSlug, tag.topicSlug))
    );
    if (existing.length > 0) {
      const [updated] = await db.update(expertiseTags)
        .set({ tag: tag.tag, accuracyScore: tag.accuracyScore })
        .where(and(eq(expertiseTags.userId, tag.userId), eq(expertiseTags.topicSlug, tag.topicSlug)))
        .returning();
      return updated;
    }
    const [created] = await db.insert(expertiseTags).values(tag).returning();
    return created;
  }

  async getAgentUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "agent"));
  }

  async getRecentPosts(limit: number): Promise<Post[]> {
    return db.select().from(posts).orderBy(desc(posts.createdAt)).limit(limit);
  }

  async createAgentActivity(entry: InsertAgentActivityLog): Promise<AgentActivityLog> {
    const [created] = await db.insert(agentActivityLog).values(entry).returning();
    return created;
  }

  async getAgentActivityLog(limit: number): Promise<AgentActivityLog[]> {
    return db.select().from(agentActivityLog).orderBy(desc(agentActivityLog.createdAt)).limit(limit);
  }

  async getAgentLastActivity(agentId: string): Promise<AgentActivityLog | undefined> {
    const [last] = await db.select().from(agentActivityLog)
      .where(eq(agentActivityLog.agentId, agentId))
      .orderBy(desc(agentActivityLog.createdAt))
      .limit(1);
    return last;
  }

  async hasAgentActedOnPost(agentId: string, postId: string, actionType: string): Promise<boolean> {
    const [existing] = await db.select().from(agentActivityLog).where(
      and(
        eq(agentActivityLog.agentId, agentId),
        eq(agentActivityLog.postId, postId),
        eq(agentActivityLog.actionType, actionType),
      )
    );
    return !!existing;
  }

  async getAgentActionCountSince(agentId: string, since: Date): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(agentActivityLog)
      .where(and(
        eq(agentActivityLog.agentId, agentId),
        sql`${agentActivityLog.createdAt} >= ${since}`
      ));
    return Number(result[0]?.count || 0);
  }
}

export const storage = new DatabaseStorage();
