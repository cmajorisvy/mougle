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
  type Transaction, type InsertTransaction,
  type AgentLearningProfile, type InsertAgentLearningProfile,
  type AgentActivityLog, type InsertAgentActivityLog,
  type AgentSociety, type InsertAgentSociety,
  type SocietyMember, type InsertSocietyMember,
  type DelegatedTask, type InsertDelegatedTask,
  type AgentMessage, type InsertAgentMessage,
  type GovernanceProposal, type InsertGovernanceProposal,
  type GovernanceVote, type InsertGovernanceVote,
  type Alliance, type InsertAlliance,
  type AllianceMember, type InsertAllianceMember,
  type InstitutionRule, type InsertInstitutionRule,
  type TaskContract, type InsertTaskContract,
  type TaskBid, type InsertTaskBid,
  type Civilization, type InsertCivilization,
  type AgentIdentity, type InsertAgentIdentity,
  type AgentMemory, type InsertAgentMemory,
  type CivilizationInvestment, type InsertCivilizationInvestment,
  type AgentGenome, type InsertAgentGenome,
  type AgentLineage, type InsertAgentLineage,
  type CulturalMemory, type InsertCulturalMemory,
  users, topics, posts, comments, postLikes,
  claims, evidence, trustScores, agentVotes, reputationHistory, expertiseTags,
  transactions, agentLearningProfiles, agentActivityLog,
  agentSocieties, societyMembers, delegatedTasks, agentMessages,
  governanceProposals, governanceVotes, alliances, allianceMembers,
  institutionRules, taskContracts, taskBids,
  civilizations, agentIdentities, agentMemory, civilizationInvestments,
  agentGenomes, agentLineage, culturalMemory,
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

  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  getTransactions(userId: string, limit: number): Promise<Transaction[]>;
  getTransactionsSince(userId: string, since: Date): Promise<Transaction[]>;
  getEconomyMetrics(): Promise<{ totalCreditsCirculating: number; totalTransactions: number; topEarners: { userId: string; total: number }[] }>;

  getLearningProfile(agentId: string): Promise<AgentLearningProfile | undefined>;
  upsertLearningProfile(agentId: string, data: Partial<AgentLearningProfile>): Promise<AgentLearningProfile>;
  getAllLearningProfiles(): Promise<AgentLearningProfile[]>;

  getAgentUsers(): Promise<User[]>;
  getRecentPosts(limit: number): Promise<Post[]>;
  createAgentActivity(entry: InsertAgentActivityLog): Promise<AgentActivityLog>;
  getAgentActivityLog(limit: number): Promise<AgentActivityLog[]>;
  getAgentLastActivity(agentId: string): Promise<AgentActivityLog | undefined>;
  hasAgentActedOnPost(agentId: string, postId: string, actionType: string): Promise<boolean>;
  getAgentActionCountSince(agentId: string, since: Date): Promise<number>;

  getSocieties(): Promise<AgentSociety[]>;
  getSociety(id: string): Promise<AgentSociety | undefined>;
  createSociety(society: InsertAgentSociety): Promise<AgentSociety>;
  updateSociety(id: string, data: Partial<AgentSociety>): Promise<AgentSociety>;

  getSocietyMembers(societyId: string): Promise<SocietyMember[]>;
  getAgentSocieties(agentId: string): Promise<SocietyMember[]>;
  addSocietyMember(member: InsertSocietyMember): Promise<SocietyMember>;
  updateSocietyMember(id: string, data: Partial<SocietyMember>): Promise<SocietyMember>;

  getDelegatedTasks(societyId: string): Promise<DelegatedTask[]>;
  getDelegatedTasksByPost(postId: string): Promise<DelegatedTask[]>;
  getDelegatedTask(id: string): Promise<DelegatedTask | undefined>;
  createDelegatedTask(task: InsertDelegatedTask): Promise<DelegatedTask>;
  updateDelegatedTask(id: string, data: Partial<DelegatedTask>): Promise<DelegatedTask>;
  getPendingTasksForAgent(agentId: string): Promise<DelegatedTask[]>;

  createAgentMessage(msg: InsertAgentMessage): Promise<AgentMessage>;
  getMessagesByTask(taskId: string): Promise<AgentMessage[]>;
  getMessagesBySociety(societyId: string, limit: number): Promise<AgentMessage[]>;

  createProposal(proposal: InsertGovernanceProposal): Promise<GovernanceProposal>;
  getProposal(id: string): Promise<GovernanceProposal | undefined>;
  getProposals(status?: string): Promise<GovernanceProposal[]>;
  updateProposal(id: string, data: Partial<GovernanceProposal>): Promise<GovernanceProposal>;

  createVote(vote: InsertGovernanceVote): Promise<GovernanceVote>;
  getVotesByProposal(proposalId: string): Promise<GovernanceVote[]>;
  hasVoted(proposalId: string, voterId: string): Promise<boolean>;

  createAlliance(alliance: InsertAlliance): Promise<Alliance>;
  getAlliance(id: string): Promise<Alliance | undefined>;
  getAlliances(): Promise<Alliance[]>;
  updateAlliance(id: string, data: Partial<Alliance>): Promise<Alliance>;
  addAllianceMember(member: InsertAllianceMember): Promise<AllianceMember>;
  getAllianceMembers(allianceId: string): Promise<AllianceMember[]>;

  getInstitutionRules(): Promise<InstitutionRule[]>;
  getInstitutionRule(name: string): Promise<InstitutionRule | undefined>;
  upsertInstitutionRule(rule: InsertInstitutionRule): Promise<InstitutionRule>;

  createTaskContract(contract: InsertTaskContract): Promise<TaskContract>;
  getTaskContract(id: string): Promise<TaskContract | undefined>;
  getTaskContracts(status?: string): Promise<TaskContract[]>;
  updateTaskContract(id: string, data: Partial<TaskContract>): Promise<TaskContract>;

  createTaskBid(bid: InsertTaskBid): Promise<TaskBid>;
  getTaskBids(contractId: string): Promise<TaskBid[]>;
  updateTaskBid(id: string, data: Partial<TaskBid>): Promise<TaskBid>;

  deleteSocietyMember(id: string): Promise<void>;
  deleteSociety(id: string): Promise<void>;

  getCivilizations(): Promise<Civilization[]>;
  getCivilization(id: string): Promise<Civilization | undefined>;
  createCivilization(civ: InsertCivilization): Promise<Civilization>;
  updateCivilization(id: string, data: Partial<Civilization>): Promise<Civilization>;

  getAgentIdentity(agentId: string): Promise<AgentIdentity | undefined>;
  upsertAgentIdentity(agentId: string, data: Partial<AgentIdentity>): Promise<AgentIdentity>;
  getAgentIdentities(): Promise<AgentIdentity[]>;
  getIdentitiesByCivilization(civilizationId: string): Promise<AgentIdentity[]>;

  addAgentMemory(entry: InsertAgentMemory): Promise<AgentMemory>;
  getAgentMemories(agentId: string, limit: number): Promise<AgentMemory[]>;
  getAgentMemoriesByType(agentId: string, eventType: string, limit: number): Promise<AgentMemory[]>;

  createInvestment(inv: InsertCivilizationInvestment): Promise<CivilizationInvestment>;
  getInvestments(civilizationId: string): Promise<CivilizationInvestment[]>;
  getActiveInvestments(): Promise<CivilizationInvestment[]>;
  updateInvestment(id: string, data: Partial<CivilizationInvestment>): Promise<CivilizationInvestment>;

  getAgentGenome(agentId: string): Promise<AgentGenome | undefined>;
  upsertAgentGenome(agentId: string, data: Partial<AgentGenome>): Promise<AgentGenome>;
  getAllGenomes(): Promise<AgentGenome[]>;

  getAgentLineage(agentId: string): Promise<AgentLineage | undefined>;
  createAgentLineage(entry: InsertAgentLineage): Promise<AgentLineage>;
  updateAgentLineage(agentId: string, data: Partial<AgentLineage>): Promise<AgentLineage>;
  getLineageByParent(parentId: string): Promise<AgentLineage[]>;
  getAllLineages(): Promise<AgentLineage[]>;

  createCulturalMemoryEntry(entry: InsertCulturalMemory): Promise<CulturalMemory>;
  getCulturalMemories(limit: number): Promise<CulturalMemory[]>;
  getTopCulturalMemories(domain: string, limit: number): Promise<CulturalMemory[]>;
  updateCulturalMemory(id: string, data: Partial<CulturalMemory>): Promise<CulturalMemory>;
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

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(tx).returning();
    return created;
  }

  async getTransactions(userId: string, limit: number): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(sql`${transactions.senderId} = ${userId} OR ${transactions.receiverId} = ${userId}`)
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async getTransactionsSince(userId: string, since: Date): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(and(
        sql`${transactions.receiverId} = ${userId}`,
        sql`${transactions.createdAt} >= ${since}`
      ))
      .orderBy(desc(transactions.createdAt));
  }

  async getEconomyMetrics(): Promise<{ totalCreditsCirculating: number; totalTransactions: number; topEarners: { userId: string; total: number }[] }> {
    const circResult = await db.select({ total: sql<number>`COALESCE(SUM(${users.creditWallet}), 0)` }).from(users);
    const txCount = await db.select({ count: sql<number>`count(*)` }).from(transactions);
    const topEarners = await db.select({
      userId: transactions.receiverId,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    }).from(transactions)
      .where(sql`${transactions.amount} > 0`)
      .groupBy(transactions.receiverId)
      .orderBy(sql`SUM(${transactions.amount}) DESC`)
      .limit(10);
    return {
      totalCreditsCirculating: Number(circResult[0]?.total || 0),
      totalTransactions: Number(txCount[0]?.count || 0),
      topEarners: topEarners.map(e => ({ userId: e.userId, total: Number(e.total) })),
    };
  }

  async getLearningProfile(agentId: string): Promise<AgentLearningProfile | undefined> {
    const [profile] = await db.select().from(agentLearningProfiles).where(eq(agentLearningProfiles.agentId, agentId));
    return profile;
  }

  async upsertLearningProfile(agentId: string, data: Partial<AgentLearningProfile>): Promise<AgentLearningProfile> {
    const existing = await this.getLearningProfile(agentId);
    if (existing) {
      const [updated] = await db.update(agentLearningProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(agentLearningProfiles.agentId, agentId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(agentLearningProfiles)
      .values({ agentId, ...data } as any)
      .returning();
    return created;
  }

  async getAllLearningProfiles(): Promise<AgentLearningProfile[]> {
    return db.select().from(agentLearningProfiles);
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

  async getSocieties(): Promise<AgentSociety[]> {
    return db.select().from(agentSocieties).orderBy(desc(agentSocieties.reputationScore));
  }

  async getSociety(id: string): Promise<AgentSociety | undefined> {
    const [s] = await db.select().from(agentSocieties).where(eq(agentSocieties.id, id));
    return s;
  }

  async createSociety(society: InsertAgentSociety): Promise<AgentSociety> {
    const [created] = await db.insert(agentSocieties).values(society).returning();
    return created;
  }

  async updateSociety(id: string, data: Partial<AgentSociety>): Promise<AgentSociety> {
    const [updated] = await db.update(agentSocieties).set(data).where(eq(agentSocieties.id, id)).returning();
    return updated;
  }

  async getSocietyMembers(societyId: string): Promise<SocietyMember[]> {
    return db.select().from(societyMembers).where(eq(societyMembers.societyId, societyId));
  }

  async getAgentSocieties(agentId: string): Promise<SocietyMember[]> {
    return db.select().from(societyMembers).where(eq(societyMembers.agentId, agentId));
  }

  async addSocietyMember(member: InsertSocietyMember): Promise<SocietyMember> {
    const [created] = await db.insert(societyMembers).values(member).returning();
    return created;
  }

  async updateSocietyMember(id: string, data: Partial<SocietyMember>): Promise<SocietyMember> {
    const [updated] = await db.update(societyMembers).set(data).where(eq(societyMembers.id, id)).returning();
    return updated;
  }

  async getDelegatedTasks(societyId: string): Promise<DelegatedTask[]> {
    return db.select().from(delegatedTasks).where(eq(delegatedTasks.societyId, societyId)).orderBy(desc(delegatedTasks.createdAt));
  }

  async getDelegatedTasksByPost(postId: string): Promise<DelegatedTask[]> {
    return db.select().from(delegatedTasks).where(eq(delegatedTasks.postId, postId));
  }

  async getDelegatedTask(id: string): Promise<DelegatedTask | undefined> {
    const [t] = await db.select().from(delegatedTasks).where(eq(delegatedTasks.id, id));
    return t;
  }

  async createDelegatedTask(task: InsertDelegatedTask): Promise<DelegatedTask> {
    const [created] = await db.insert(delegatedTasks).values(task).returning();
    return created;
  }

  async updateDelegatedTask(id: string, data: Partial<DelegatedTask>): Promise<DelegatedTask> {
    const [updated] = await db.update(delegatedTasks).set(data).where(eq(delegatedTasks.id, id)).returning();
    return updated;
  }

  async getPendingTasksForAgent(agentId: string): Promise<DelegatedTask[]> {
    return db.select().from(delegatedTasks).where(
      and(eq(delegatedTasks.assignedAgent, agentId), eq(delegatedTasks.status, "pending"))
    );
  }

  async createAgentMessage(msg: InsertAgentMessage): Promise<AgentMessage> {
    const [created] = await db.insert(agentMessages).values(msg).returning();
    return created;
  }

  async getMessagesByTask(taskId: string): Promise<AgentMessage[]> {
    return db.select().from(agentMessages).where(eq(agentMessages.taskId, taskId)).orderBy(asc(agentMessages.createdAt));
  }

  async getMessagesBySociety(societyId: string, limit: number): Promise<AgentMessage[]> {
    return db.select().from(agentMessages).where(eq(agentMessages.societyId, societyId)).orderBy(desc(agentMessages.createdAt)).limit(limit);
  }

  async createProposal(proposal: InsertGovernanceProposal): Promise<GovernanceProposal> {
    const [created] = await db.insert(governanceProposals).values(proposal).returning();
    return created;
  }

  async getProposal(id: string): Promise<GovernanceProposal | undefined> {
    const [p] = await db.select().from(governanceProposals).where(eq(governanceProposals.id, id));
    return p;
  }

  async getProposals(status?: string): Promise<GovernanceProposal[]> {
    if (status) {
      return db.select().from(governanceProposals).where(eq(governanceProposals.status, status)).orderBy(desc(governanceProposals.createdAt));
    }
    return db.select().from(governanceProposals).orderBy(desc(governanceProposals.createdAt));
  }

  async updateProposal(id: string, data: Partial<GovernanceProposal>): Promise<GovernanceProposal> {
    const [updated] = await db.update(governanceProposals).set(data).where(eq(governanceProposals.id, id)).returning();
    return updated;
  }

  async createVote(vote: InsertGovernanceVote): Promise<GovernanceVote> {
    const [created] = await db.insert(governanceVotes).values(vote).returning();
    return created;
  }

  async getVotesByProposal(proposalId: string): Promise<GovernanceVote[]> {
    return db.select().from(governanceVotes).where(eq(governanceVotes.proposalId, proposalId)).orderBy(desc(governanceVotes.createdAt));
  }

  async hasVoted(proposalId: string, voterId: string): Promise<boolean> {
    const [existing] = await db.select().from(governanceVotes).where(
      and(eq(governanceVotes.proposalId, proposalId), eq(governanceVotes.voterId, voterId))
    );
    return !!existing;
  }

  async createAlliance(alliance: InsertAlliance): Promise<Alliance> {
    const [created] = await db.insert(alliances).values(alliance).returning();
    return created;
  }

  async getAlliance(id: string): Promise<Alliance | undefined> {
    const [a] = await db.select().from(alliances).where(eq(alliances.id, id));
    return a;
  }

  async getAlliances(): Promise<Alliance[]> {
    return db.select().from(alliances).orderBy(desc(alliances.createdAt));
  }

  async updateAlliance(id: string, data: Partial<Alliance>): Promise<Alliance> {
    const [updated] = await db.update(alliances).set(data).where(eq(alliances.id, id)).returning();
    return updated;
  }

  async addAllianceMember(member: InsertAllianceMember): Promise<AllianceMember> {
    const [created] = await db.insert(allianceMembers).values(member).returning();
    return created;
  }

  async getAllianceMembers(allianceId: string): Promise<AllianceMember[]> {
    return db.select().from(allianceMembers).where(eq(allianceMembers.allianceId, allianceId));
  }

  async getInstitutionRules(): Promise<InstitutionRule[]> {
    return db.select().from(institutionRules).orderBy(asc(institutionRules.ruleName));
  }

  async getInstitutionRule(name: string): Promise<InstitutionRule | undefined> {
    const [r] = await db.select().from(institutionRules).where(eq(institutionRules.ruleName, name));
    return r;
  }

  async upsertInstitutionRule(rule: InsertInstitutionRule): Promise<InstitutionRule> {
    const existing = await this.getInstitutionRule(rule.ruleName);
    if (existing) {
      const [updated] = await db.update(institutionRules).set({ ruleValue: rule.ruleValue, category: rule.category, lastModifiedByVote: rule.lastModifiedByVote }).where(eq(institutionRules.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(institutionRules).values(rule).returning();
    return created;
  }

  async createTaskContract(contract: InsertTaskContract): Promise<TaskContract> {
    const [created] = await db.insert(taskContracts).values(contract).returning();
    return created;
  }

  async getTaskContract(id: string): Promise<TaskContract | undefined> {
    const [c] = await db.select().from(taskContracts).where(eq(taskContracts.id, id));
    return c;
  }

  async getTaskContracts(status?: string): Promise<TaskContract[]> {
    if (status) {
      return db.select().from(taskContracts).where(eq(taskContracts.status, status)).orderBy(desc(taskContracts.createdAt));
    }
    return db.select().from(taskContracts).orderBy(desc(taskContracts.createdAt));
  }

  async updateTaskContract(id: string, data: Partial<TaskContract>): Promise<TaskContract> {
    const [updated] = await db.update(taskContracts).set(data).where(eq(taskContracts.id, id)).returning();
    return updated;
  }

  async createTaskBid(bid: InsertTaskBid): Promise<TaskBid> {
    const [created] = await db.insert(taskBids).values(bid).returning();
    return created;
  }

  async getTaskBids(contractId: string): Promise<TaskBid[]> {
    return db.select().from(taskBids).where(eq(taskBids.contractId, contractId)).orderBy(desc(taskBids.score));
  }

  async updateTaskBid(id: string, data: Partial<TaskBid>): Promise<TaskBid> {
    const [updated] = await db.update(taskBids).set(data).where(eq(taskBids.id, id)).returning();
    return updated;
  }

  async deleteSocietyMember(id: string): Promise<void> {
    await db.delete(societyMembers).where(eq(societyMembers.id, id));
  }

  async deleteSociety(id: string): Promise<void> {
    await db.delete(societyMembers).where(eq(societyMembers.societyId, id));
    await db.delete(delegatedTasks).where(eq(delegatedTasks.societyId, id));
    await db.delete(agentMessages).where(eq(agentMessages.societyId, id));
    await db.delete(agentSocieties).where(eq(agentSocieties.id, id));
  }

  async getCivilizations(): Promise<Civilization[]> {
    return db.select().from(civilizations).orderBy(desc(civilizations.createdAt));
  }

  async getCivilization(id: string): Promise<Civilization | undefined> {
    const [c] = await db.select().from(civilizations).where(eq(civilizations.id, id));
    return c;
  }

  async createCivilization(civ: InsertCivilization): Promise<Civilization> {
    const [created] = await db.insert(civilizations).values(civ).returning();
    return created;
  }

  async updateCivilization(id: string, data: Partial<Civilization>): Promise<Civilization> {
    const [updated] = await db.update(civilizations).set(data).where(eq(civilizations.id, id)).returning();
    return updated;
  }

  async getAgentIdentity(agentId: string): Promise<AgentIdentity | undefined> {
    const [identity] = await db.select().from(agentIdentities).where(eq(agentIdentities.agentId, agentId));
    return identity;
  }

  async upsertAgentIdentity(agentId: string, data: Partial<AgentIdentity>): Promise<AgentIdentity> {
    const existing = await this.getAgentIdentity(agentId);
    if (existing) {
      const [updated] = await db.update(agentIdentities).set({ ...data, updatedAt: new Date() }).where(eq(agentIdentities.agentId, agentId)).returning();
      return updated;
    }
    const [created] = await db.insert(agentIdentities).values({ agentId, ...data } as any).returning();
    return created;
  }

  async getAgentIdentities(): Promise<AgentIdentity[]> {
    return db.select().from(agentIdentities).orderBy(desc(agentIdentities.influenceScore));
  }

  async getIdentitiesByCivilization(civilizationId: string): Promise<AgentIdentity[]> {
    return db.select().from(agentIdentities).where(eq(agentIdentities.civilizationId, civilizationId));
  }

  async addAgentMemory(entry: InsertAgentMemory): Promise<AgentMemory> {
    const [created] = await db.insert(agentMemory).values(entry).returning();
    return created;
  }

  async getAgentMemories(agentId: string, limit: number): Promise<AgentMemory[]> {
    return db.select().from(agentMemory).where(eq(agentMemory.agentId, agentId)).orderBy(desc(agentMemory.createdAt)).limit(limit);
  }

  async getAgentMemoriesByType(agentId: string, eventType: string, limit: number): Promise<AgentMemory[]> {
    return db.select().from(agentMemory).where(
      and(eq(agentMemory.agentId, agentId), eq(agentMemory.eventType, eventType))
    ).orderBy(desc(agentMemory.createdAt)).limit(limit);
  }

  async createInvestment(inv: InsertCivilizationInvestment): Promise<CivilizationInvestment> {
    const [created] = await db.insert(civilizationInvestments).values(inv).returning();
    return created;
  }

  async getInvestments(civilizationId: string): Promise<CivilizationInvestment[]> {
    return db.select().from(civilizationInvestments).where(eq(civilizationInvestments.civilizationId, civilizationId)).orderBy(desc(civilizationInvestments.createdAt));
  }

  async getActiveInvestments(): Promise<CivilizationInvestment[]> {
    return db.select().from(civilizationInvestments).where(eq(civilizationInvestments.status, "active")).orderBy(asc(civilizationInvestments.maturesAt));
  }

  async updateInvestment(id: string, data: Partial<CivilizationInvestment>): Promise<CivilizationInvestment> {
    const [updated] = await db.update(civilizationInvestments).set(data).where(eq(civilizationInvestments.id, id)).returning();
    return updated;
  }

  async getAgentGenome(agentId: string): Promise<AgentGenome | undefined> {
    const [genome] = await db.select().from(agentGenomes).where(eq(agentGenomes.agentId, agentId));
    return genome;
  }

  async upsertAgentGenome(agentId: string, data: Partial<AgentGenome>): Promise<AgentGenome> {
    const existing = await this.getAgentGenome(agentId);
    if (existing) {
      const [updated] = await db.update(agentGenomes).set({ ...data, updatedAt: new Date() }).where(eq(agentGenomes.agentId, agentId)).returning();
      return updated;
    }
    const [created] = await db.insert(agentGenomes).values({ agentId, ...data } as any).returning();
    return created;
  }

  async getAllGenomes(): Promise<AgentGenome[]> {
    return db.select().from(agentGenomes).orderBy(desc(agentGenomes.fitnessScore));
  }

  async getAgentLineage(agentId: string): Promise<AgentLineage | undefined> {
    const [entry] = await db.select().from(agentLineage).where(eq(agentLineage.agentId, agentId));
    return entry;
  }

  async createAgentLineage(entry: InsertAgentLineage): Promise<AgentLineage> {
    const [created] = await db.insert(agentLineage).values(entry).returning();
    return created;
  }

  async updateAgentLineage(agentId: string, data: Partial<AgentLineage>): Promise<AgentLineage> {
    const [updated] = await db.update(agentLineage).set(data).where(eq(agentLineage.agentId, agentId)).returning();
    return updated;
  }

  async getLineageByParent(parentId: string): Promise<AgentLineage[]> {
    return db.select().from(agentLineage).where(eq(agentLineage.parentAgentId, parentId)).orderBy(desc(agentLineage.bornAt));
  }

  async getAllLineages(): Promise<AgentLineage[]> {
    return db.select().from(agentLineage).orderBy(asc(agentLineage.generationNumber));
  }

  async createCulturalMemoryEntry(entry: InsertCulturalMemory): Promise<CulturalMemory> {
    const [created] = await db.insert(culturalMemory).values(entry).returning();
    return created;
  }

  async getCulturalMemories(limit: number): Promise<CulturalMemory[]> {
    return db.select().from(culturalMemory).orderBy(desc(culturalMemory.successScore)).limit(limit);
  }

  async getTopCulturalMemories(domain: string, limit: number): Promise<CulturalMemory[]> {
    return db.select().from(culturalMemory).where(eq(culturalMemory.domain, domain)).orderBy(desc(culturalMemory.successScore)).limit(limit);
  }

  async updateCulturalMemory(id: string, data: Partial<CulturalMemory>): Promise<CulturalMemory> {
    const [updated] = await db.update(culturalMemory).set(data).where(eq(culturalMemory.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
