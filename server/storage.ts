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
  type EthicalProfile, type InsertEthicalProfile,
  type EthicalRule, type InsertEthicalRule,
  type EthicalEvent, type InsertEthicalEvent,
  type GlobalMetrics, type InsertGlobalMetrics,
  type GlobalGoalField, type InsertGlobalGoalField,
  type GlobalInsight, type InsertGlobalInsight,
  type LiveDebate, type InsertLiveDebate,
  type DebateParticipant, type InsertDebateParticipant,
  type DebateTurn, type InsertDebateTurn,
  type FlywheelJob, type InsertFlywheelJob,
  type GeneratedClip, type InsertGeneratedClip,
  type NewsArticle, type InsertNewsArticle,
  type NewsComment, type InsertNewsComment,
  type NewsReaction, type InsertNewsReaction,
  type NewsShare, type InsertNewsShare,
  type SocialAccount, type InsertSocialAccount,
  type SocialPost, type InsertSocialPost,
  type PromotionScore, type InsertPromotionScore,
  type SocialPerformance, type InsertSocialPerformance,
  type GrowthPattern, type InsertGrowthPattern,
  type SystemControlConfig, type InsertSystemControlConfig,
  type ActivityMetric, type InsertActivityMetric,
  type AnomalyEvent, type InsertAnomalyEvent,
  type AutomationDecision, type InsertAutomationDecision,
  type AutomationPolicy, type InsertAutomationPolicy,
  type SubscriptionPlan, type InsertSubscriptionPlan,
  type UserSubscription, type InsertUserSubscription,
  type CreditPackage, type InsertCreditPackage,
  type CreditPurchase, type InsertCreditPurchase,
  type Invoice, type InsertInvoice,
  type CreditUsageLog, type InsertCreditUsageLog,
  users, topics, posts, comments, postLikes,
  claims, evidence, trustScores, agentVotes, reputationHistory, expertiseTags,
  transactions, agentLearningProfiles, agentActivityLog,
  agentSocieties, societyMembers, delegatedTasks, agentMessages,
  governanceProposals, governanceVotes, alliances, allianceMembers,
  institutionRules, taskContracts, taskBids,
  civilizations, agentIdentities, agentMemory, civilizationInvestments,
  agentGenomes, agentLineage, culturalMemory,
  ethicalProfiles, ethicalRules, ethicalEvents,
  globalMetrics, globalGoalField, globalInsights,
  liveDebates, debateParticipants, debateTurns,
  flywheelJobs, generatedClips,
  newsArticles, newsComments, newsReactions, newsShares,
  socialAccounts, socialPosts, promotionScores,
  socialPerformance, growthPatterns,
  systemControlConfig,
  activityMetrics, anomalyEvents, automationDecisions, automationPolicy,
  subscriptionPlans, userSubscriptions, creditPackages, creditPurchases, invoices, creditUsageLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, asc, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Flywheel Metrics
  getFlywheelMetrics(): Promise<FlywheelMetric[]>;
  addFlywheelMetric(metric: InsertFlywheelMetric): Promise<FlywheelMetric>;

  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
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

  getEthicalProfile(entityId: string): Promise<EthicalProfile | undefined>;
  upsertEthicalProfile(entityId: string, data: Partial<EthicalProfile>): Promise<EthicalProfile>;
  getAllEthicalProfiles(): Promise<EthicalProfile[]>;

  createEthicalRule(rule: InsertEthicalRule): Promise<EthicalRule>;
  getEthicalRule(id: string): Promise<EthicalRule | undefined>;
  getEthicalRules(status?: string): Promise<EthicalRule[]>;
  updateEthicalRule(id: string, data: Partial<EthicalRule>): Promise<EthicalRule>;

  createEthicalEvent(event: InsertEthicalEvent): Promise<EthicalEvent>;
  getEthicalEvents(limit: number): Promise<EthicalEvent[]>;
  getEthicalEventsByActor(actorId: string, limit: number): Promise<EthicalEvent[]>;

  createGlobalMetrics(metrics: InsertGlobalMetrics): Promise<GlobalMetrics>;
  getLatestGlobalMetrics(): Promise<GlobalMetrics | undefined>;
  getGlobalMetricsHistory(limit: number): Promise<GlobalMetrics[]>;

  upsertGlobalGoalField(data: Partial<GlobalGoalField>): Promise<GlobalGoalField>;
  getLatestGoalField(): Promise<GlobalGoalField | undefined>;

  createGlobalInsight(insight: InsertGlobalInsight): Promise<GlobalInsight>;
  getGlobalInsight(id: string): Promise<GlobalInsight | undefined>;
  getGlobalInsights(status?: string): Promise<GlobalInsight[]>;
  updateGlobalInsight(id: string, data: Partial<GlobalInsight>): Promise<GlobalInsight>;

  createLiveDebate(debate: InsertLiveDebate): Promise<LiveDebate>;
  getLiveDebate(id: number): Promise<LiveDebate | undefined>;
  getLiveDebates(status?: string): Promise<LiveDebate[]>;
  updateLiveDebate(id: number, data: Partial<LiveDebate>): Promise<LiveDebate>;

  addDebateParticipant(participant: InsertDebateParticipant): Promise<DebateParticipant>;
  getDebateParticipants(debateId: number): Promise<DebateParticipant[]>;
  getDebateParticipant(id: number): Promise<DebateParticipant | undefined>;
  updateDebateParticipant(id: number, data: Partial<DebateParticipant>): Promise<DebateParticipant>;
  removeDebateParticipant(id: number): Promise<void>;

  createDebateTurn(turn: InsertDebateTurn): Promise<DebateTurn>;
  getDebateTurns(debateId: number): Promise<DebateTurn[]>;
  getDebateTurn(id: number): Promise<DebateTurn | undefined>;
  updateDebateTurn(id: number, data: Partial<DebateTurn>): Promise<DebateTurn>;

  createFlywheelJob(job: InsertFlywheelJob): Promise<FlywheelJob>;
  getFlywheelJob(id: number): Promise<FlywheelJob | undefined>;
  getFlywheelJobs(): Promise<FlywheelJob[]>;
  getFlywheelJobByDebate(debateId: number): Promise<FlywheelJob | undefined>;
  updateFlywheelJob(id: number, data: Partial<FlywheelJob>): Promise<FlywheelJob>;

  createGeneratedClip(clip: InsertGeneratedClip): Promise<GeneratedClip>;
  getGeneratedClip(id: number): Promise<GeneratedClip | undefined>;
  getClipsByJob(jobId: number): Promise<GeneratedClip[]>;
  getClipsByDebate(debateId: number): Promise<GeneratedClip[]>;
  updateGeneratedClip(id: number, data: Partial<GeneratedClip>): Promise<GeneratedClip>;

  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  getNewsArticle(id: number): Promise<NewsArticle | undefined>;
  getNewsArticleBySlug(slug: string): Promise<NewsArticle | undefined>;
  getNewsArticles(limit: number, category?: string, offset?: number): Promise<NewsArticle[]>;
  getNewsArticleByUrl(sourceUrl: string): Promise<NewsArticle | undefined>;
  getNewsArticleByTitleHash(titleHash: string): Promise<NewsArticle | undefined>;
  getLatestNews(limit: number): Promise<NewsArticle[]>;
  countNewsArticles(category?: string): Promise<number>;
  updateNewsArticle(id: number, data: Partial<NewsArticle>): Promise<NewsArticle>;
  getUnprocessedNews(limit: number): Promise<NewsArticle[]>;
  getBreakingNews(): Promise<NewsArticle[]>;

  createNewsComment(comment: InsertNewsComment): Promise<NewsComment>;
  getNewsComments(articleId: number): Promise<NewsComment[]>;
  getNewsCommentReplies(parentId: number): Promise<NewsComment[]>;
  likeNewsComment(commentId: number): Promise<void>;

  toggleNewsReaction(articleId: number, userId: string, reactionType: string): Promise<boolean>;
  getNewsReaction(articleId: number, userId: string): Promise<NewsReaction | undefined>;
  getNewsReactionCount(articleId: number): Promise<number>;

  createNewsShare(share: InsertNewsShare): Promise<NewsShare>;
  getNewsShareCount(articleId: number): Promise<number>;

  createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount>;
  getSocialAccounts(): Promise<SocialAccount[]>;
  getSocialAccount(id: number): Promise<SocialAccount | undefined>;
  updateSocialAccount(id: number, data: Partial<SocialAccount>): Promise<SocialAccount>;
  deleteSocialAccount(id: number): Promise<void>;
  getActiveSocialAccounts(platform?: string): Promise<SocialAccount[]>;

  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  getSocialPosts(limit?: number, status?: string): Promise<SocialPost[]>;
  getSocialPost(id: number): Promise<SocialPost | undefined>;
  updateSocialPost(id: number, data: Partial<SocialPost>): Promise<SocialPost>;
  getPendingSocialPosts(): Promise<SocialPost[]>;
  getSocialPostsByContent(contentType: string, contentId: string): Promise<SocialPost[]>;

  createPromotionScore(score: InsertPromotionScore): Promise<PromotionScore>;
  getPromotionScores(limit?: number, status?: string): Promise<PromotionScore[]>;
  getPromotionScore(id: number): Promise<PromotionScore | undefined>;
  getPromotionScoreByContent(contentType: string, contentId: string): Promise<PromotionScore | undefined>;
  updatePromotionScore(id: number, data: Partial<PromotionScore>): Promise<PromotionScore>;
  getPendingReviewPromotions(): Promise<PromotionScore[]>;

  createSocialPerformance(perf: InsertSocialPerformance): Promise<SocialPerformance>;
  getSocialPerformance(limit?: number): Promise<SocialPerformance[]>;
  getSocialPerformanceByPlatform(platform: string, limit?: number): Promise<SocialPerformance[]>;
  getSocialPerformanceSince(since: Date): Promise<SocialPerformance[]>;
  getTopViralPosts(limit?: number): Promise<SocialPerformance[]>;

  createGrowthPattern(pattern: InsertGrowthPattern): Promise<GrowthPattern>;
  getGrowthPatterns(platform?: string): Promise<GrowthPattern[]>;
  getActiveGrowthPatterns(platform?: string): Promise<GrowthPattern[]>;
  getGrowthPattern(id: number): Promise<GrowthPattern | undefined>;
  updateGrowthPattern(id: number, data: Partial<GrowthPattern>): Promise<GrowthPattern>;

  getSystemControlConfigs(): Promise<SystemControlConfig[]>;
  getSystemControlConfig(key: string): Promise<SystemControlConfig | undefined>;
  upsertSystemControlConfig(data: InsertSystemControlConfig): Promise<SystemControlConfig>;
  updateSystemControlValue(key: string, value: number): Promise<SystemControlConfig>;

  recordActivityMetric(metric: InsertActivityMetric): Promise<ActivityMetric>;
  getActivityMetrics(metricKey: string, since?: Date): Promise<ActivityMetric[]>;
  getLatestMetrics(): Promise<ActivityMetric[]>;

  createAnomalyEvent(event: InsertAnomalyEvent): Promise<AnomalyEvent>;
  getOpenAnomalies(): Promise<AnomalyEvent[]>;
  getAllAnomalies(limit?: number): Promise<AnomalyEvent[]>;
  updateAnomalyStatus(id: number, status: string, resolvedAt?: Date): Promise<AnomalyEvent>;

  createAutomationDecision(decision: InsertAutomationDecision): Promise<AutomationDecision>;
  getPendingDecisions(): Promise<AutomationDecision[]>;
  getAllDecisions(limit?: number): Promise<AutomationDecision[]>;
  resolveDecision(id: number, status: string, resolvedBy: string): Promise<AutomationDecision>;

  getAutomationPolicy(): Promise<AutomationPolicy | undefined>;
  upsertAutomationPolicy(data: Partial<InsertAutomationPolicy>): Promise<AutomationPolicy>;

  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;

  getUserSubscription(userId: string): Promise<UserSubscription | undefined>;
  createUserSubscription(sub: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: string, data: Partial<UserSubscription>): Promise<UserSubscription>;

  getCreditPackages(): Promise<CreditPackage[]>;
  createCreditPackage(pkg: InsertCreditPackage): Promise<CreditPackage>;

  createCreditPurchase(purchase: InsertCreditPurchase): Promise<CreditPurchase>;
  getCreditPurchases(userId: string): Promise<CreditPurchase[]>;

  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;

  createCreditUsage(entry: InsertCreditUsageLog): Promise<CreditUsageLog>;
  getCreditUsage(userId: string, limit?: number): Promise<CreditUsageLog[]>;
  getCreditUsageSince(userId: string, since: Date): Promise<CreditUsageLog[]>;
  getAllCreditUsage(limit?: number): Promise<CreditUsageLog[]>;
}

function computeRank(reputation: number): string {
  if (reputation >= 1000) return "VVIP";
  if (reputation >= 600) return "Expert";
  if (reputation >= 300) return "VIP";
  if (reputation >= 100) return "Premium";
  return "Basic";
}

export class DatabaseStorage implements IStorage {
  async getFlywheelMetrics(): Promise<FlywheelMetric[]> {
    return db.select().from(flywheelMetrics).orderBy(desc(flywheelMetrics.timestamp));
  }

  async addFlywheelMetric(metric: InsertFlywheelMetric): Promise<FlywheelMetric> {
    const [created] = await db.insert(flywheelMetrics).values(metric).returning();
    return created;
  }

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

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
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

  async getEthicalProfile(entityId: string): Promise<EthicalProfile | undefined> {
    const [profile] = await db.select().from(ethicalProfiles).where(eq(ethicalProfiles.entityId, entityId));
    return profile;
  }

  async upsertEthicalProfile(entityId: string, data: Partial<EthicalProfile>): Promise<EthicalProfile> {
    const existing = await this.getEthicalProfile(entityId);
    if (existing) {
      const [updated] = await db.update(ethicalProfiles).set({ ...data, updatedAt: new Date() }).where(eq(ethicalProfiles.entityId, entityId)).returning();
      return updated;
    }
    const [created] = await db.insert(ethicalProfiles).values({ entityId, ...data } as any).returning();
    return created;
  }

  async getAllEthicalProfiles(): Promise<EthicalProfile[]> {
    return db.select().from(ethicalProfiles).orderBy(desc(ethicalProfiles.ethicalScore));
  }

  async createEthicalRule(rule: InsertEthicalRule): Promise<EthicalRule> {
    const [created] = await db.insert(ethicalRules).values(rule).returning();
    return created;
  }

  async getEthicalRule(id: string): Promise<EthicalRule | undefined> {
    const [rule] = await db.select().from(ethicalRules).where(eq(ethicalRules.id, id));
    return rule;
  }

  async getEthicalRules(status?: string): Promise<EthicalRule[]> {
    if (status) {
      return db.select().from(ethicalRules).where(eq(ethicalRules.adoptionStatus, status)).orderBy(desc(ethicalRules.createdAt));
    }
    return db.select().from(ethicalRules).orderBy(desc(ethicalRules.createdAt));
  }

  async updateEthicalRule(id: string, data: Partial<EthicalRule>): Promise<EthicalRule> {
    const [updated] = await db.update(ethicalRules).set(data).where(eq(ethicalRules.id, id)).returning();
    return updated;
  }

  async createEthicalEvent(event: InsertEthicalEvent): Promise<EthicalEvent> {
    const [created] = await db.insert(ethicalEvents).values(event).returning();
    return created;
  }

  async getEthicalEvents(limit: number): Promise<EthicalEvent[]> {
    return db.select().from(ethicalEvents).orderBy(desc(ethicalEvents.createdAt)).limit(limit);
  }

  async getEthicalEventsByActor(actorId: string, limit: number): Promise<EthicalEvent[]> {
    return db.select().from(ethicalEvents).where(eq(ethicalEvents.actorId, actorId)).orderBy(desc(ethicalEvents.createdAt)).limit(limit);
  }

  async createGlobalMetrics(metrics: InsertGlobalMetrics): Promise<GlobalMetrics> {
    const [created] = await db.insert(globalMetrics).values(metrics).returning();
    return created;
  }

  async getLatestGlobalMetrics(): Promise<GlobalMetrics | undefined> {
    const [latest] = await db.select().from(globalMetrics).orderBy(desc(globalMetrics.createdAt)).limit(1);
    return latest;
  }

  async getGlobalMetricsHistory(limit: number): Promise<GlobalMetrics[]> {
    return db.select().from(globalMetrics).orderBy(desc(globalMetrics.createdAt)).limit(limit);
  }

  async upsertGlobalGoalField(data: Partial<GlobalGoalField>): Promise<GlobalGoalField> {
    const existing = await this.getLatestGoalField();
    if (existing) {
      const [updated] = await db.update(globalGoalField).set({ ...data, updatedAt: new Date() }).where(eq(globalGoalField.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(globalGoalField).values(data as any).returning();
    return created;
  }

  async getLatestGoalField(): Promise<GlobalGoalField | undefined> {
    const [latest] = await db.select().from(globalGoalField).orderBy(desc(globalGoalField.updatedAt)).limit(1);
    return latest;
  }

  async createGlobalInsight(insight: InsertGlobalInsight): Promise<GlobalInsight> {
    const [created] = await db.insert(globalInsights).values(insight).returning();
    return created;
  }

  async getGlobalInsight(id: string): Promise<GlobalInsight | undefined> {
    const [insight] = await db.select().from(globalInsights).where(eq(globalInsights.id, id));
    return insight;
  }

  async getGlobalInsights(status?: string): Promise<GlobalInsight[]> {
    if (status) {
      return db.select().from(globalInsights).where(eq(globalInsights.status, status)).orderBy(desc(globalInsights.createdAt));
    }
    return db.select().from(globalInsights).orderBy(desc(globalInsights.createdAt));
  }

  async updateGlobalInsight(id: string, data: Partial<GlobalInsight>): Promise<GlobalInsight> {
    const [updated] = await db.update(globalInsights).set(data).where(eq(globalInsights.id, id)).returning();
    return updated;
  }

  async createLiveDebate(debate: InsertLiveDebate): Promise<LiveDebate> {
    const [created] = await db.insert(liveDebates).values(debate).returning();
    return created;
  }

  async getLiveDebate(id: number): Promise<LiveDebate | undefined> {
    const [debate] = await db.select().from(liveDebates).where(eq(liveDebates.id, id));
    return debate;
  }

  async getLiveDebates(status?: string): Promise<LiveDebate[]> {
    if (status) {
      return db.select().from(liveDebates).where(eq(liveDebates.status, status)).orderBy(desc(liveDebates.createdAt));
    }
    return db.select().from(liveDebates).orderBy(desc(liveDebates.createdAt));
  }

  async updateLiveDebate(id: number, data: Partial<LiveDebate>): Promise<LiveDebate> {
    const [updated] = await db.update(liveDebates).set(data).where(eq(liveDebates.id, id)).returning();
    return updated;
  }

  async addDebateParticipant(participant: InsertDebateParticipant): Promise<DebateParticipant> {
    const [created] = await db.insert(debateParticipants).values(participant).returning();
    return created;
  }

  async getDebateParticipants(debateId: number): Promise<DebateParticipant[]> {
    return db.select().from(debateParticipants).where(eq(debateParticipants.debateId, debateId)).orderBy(asc(debateParticipants.speakingOrder));
  }

  async getDebateParticipant(id: number): Promise<DebateParticipant | undefined> {
    const [p] = await db.select().from(debateParticipants).where(eq(debateParticipants.id, id));
    return p;
  }

  async updateDebateParticipant(id: number, data: Partial<DebateParticipant>): Promise<DebateParticipant> {
    const [updated] = await db.update(debateParticipants).set(data).where(eq(debateParticipants.id, id)).returning();
    return updated;
  }

  async removeDebateParticipant(id: number): Promise<void> {
    await db.delete(debateParticipants).where(eq(debateParticipants.id, id));
  }

  async createDebateTurn(turn: InsertDebateTurn): Promise<DebateTurn> {
    const [created] = await db.insert(debateTurns).values(turn).returning();
    return created;
  }

  async getDebateTurns(debateId: number): Promise<DebateTurn[]> {
    return db.select().from(debateTurns).where(eq(debateTurns.debateId, debateId)).orderBy(asc(debateTurns.roundNumber), asc(debateTurns.turnOrder));
  }

  async getDebateTurn(id: number): Promise<DebateTurn | undefined> {
    const [turn] = await db.select().from(debateTurns).where(eq(debateTurns.id, id));
    return turn;
  }

  async updateDebateTurn(id: number, data: Partial<DebateTurn>): Promise<DebateTurn> {
    const [updated] = await db.update(debateTurns).set(data).where(eq(debateTurns.id, id)).returning();
    return updated;
  }

  async createFlywheelJob(job: InsertFlywheelJob): Promise<FlywheelJob> {
    const [created] = await db.insert(flywheelJobs).values(job).returning();
    return created;
  }

  async getFlywheelJob(id: number): Promise<FlywheelJob | undefined> {
    const [job] = await db.select().from(flywheelJobs).where(eq(flywheelJobs.id, id));
    return job;
  }

  async getFlywheelJobs(): Promise<FlywheelJob[]> {
    return db.select().from(flywheelJobs).orderBy(desc(flywheelJobs.createdAt));
  }

  async getFlywheelJobByDebate(debateId: number): Promise<FlywheelJob | undefined> {
    const [job] = await db.select().from(flywheelJobs).where(eq(flywheelJobs.debateId, debateId));
    return job;
  }

  async updateFlywheelJob(id: number, data: Partial<FlywheelJob>): Promise<FlywheelJob> {
    const [updated] = await db.update(flywheelJobs).set(data).where(eq(flywheelJobs.id, id)).returning();
    return updated;
  }

  async createGeneratedClip(clip: InsertGeneratedClip): Promise<GeneratedClip> {
    const [created] = await db.insert(generatedClips).values(clip).returning();
    return created;
  }

  async getGeneratedClip(id: number): Promise<GeneratedClip | undefined> {
    const [clip] = await db.select().from(generatedClips).where(eq(generatedClips.id, id));
    return clip;
  }

  async getClipsByJob(jobId: number): Promise<GeneratedClip[]> {
    return db.select().from(generatedClips).where(eq(generatedClips.jobId, jobId)).orderBy(asc(generatedClips.id));
  }

  async getClipsByDebate(debateId: number): Promise<GeneratedClip[]> {
    return db.select().from(generatedClips).where(eq(generatedClips.debateId, debateId)).orderBy(asc(generatedClips.id));
  }

  async updateGeneratedClip(id: number, data: Partial<GeneratedClip>): Promise<GeneratedClip> {
    const [updated] = await db.update(generatedClips).set(data).where(eq(generatedClips.id, id)).returning();
    return updated;
  }

  async createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle> {
    const [created] = await db.insert(newsArticles).values(article).returning();
    return created;
  }

  async getNewsArticle(id: number): Promise<NewsArticle | undefined> {
    const [article] = await db.select().from(newsArticles).where(eq(newsArticles.id, id));
    return article;
  }

  async getNewsArticleBySlug(slug: string): Promise<NewsArticle | undefined> {
    const [article] = await db.select().from(newsArticles).where(eq(newsArticles.slug, slug));
    return article;
  }

  async getNewsArticles(limit: number, category?: string, offset?: number): Promise<NewsArticle[]> {
    const conditions = [eq(newsArticles.status, "processed")];
    if (category) conditions.push(eq(newsArticles.category, category));
    return db.select().from(newsArticles)
      .where(and(...conditions))
      .orderBy(desc(newsArticles.publishedAt))
      .limit(limit)
      .offset(offset || 0);
  }

  async getNewsArticleByUrl(sourceUrl: string): Promise<NewsArticle | undefined> {
    const [article] = await db.select().from(newsArticles).where(eq(newsArticles.sourceUrl, sourceUrl));
    return article;
  }

  async getNewsArticleByTitleHash(titleHash: string): Promise<NewsArticle | undefined> {
    const [article] = await db.select().from(newsArticles).where(eq(newsArticles.titleHash, titleHash));
    return article;
  }

  async countNewsArticles(category?: string): Promise<number> {
    const conditions = [eq(newsArticles.status, "processed")];
    if (category) conditions.push(eq(newsArticles.category, category));
    const result = await db.select({ count: sql<number>`count(*)` }).from(newsArticles).where(and(...conditions));
    return Number(result[0]?.count || 0);
  }

  async getLatestNews(limit: number): Promise<NewsArticle[]> {
    return db.select().from(newsArticles)
      .where(eq(newsArticles.status, "processed"))
      .orderBy(desc(newsArticles.publishedAt))
      .limit(limit);
  }

  async updateNewsArticle(id: number, data: Partial<NewsArticle>): Promise<NewsArticle> {
    const [updated] = await db.update(newsArticles).set(data).where(eq(newsArticles.id, id)).returning();
    return updated;
  }

  async getUnprocessedNews(limit: number): Promise<NewsArticle[]> {
    return db.select().from(newsArticles)
      .where(eq(newsArticles.status, "raw"))
      .orderBy(asc(newsArticles.createdAt))
      .limit(limit);
  }

  async getBreakingNews(): Promise<NewsArticle[]> {
    return db.select().from(newsArticles)
      .where(and(eq(newsArticles.isBreakingNews, true), eq(newsArticles.status, "processed")))
      .orderBy(desc(newsArticles.publishedAt))
      .limit(10);
  }

  async createNewsComment(comment: InsertNewsComment): Promise<NewsComment> {
    const [created] = await db.insert(newsComments).values(comment).returning();
    await db.update(newsArticles)
      .set({ commentsCount: sql`comments_count + 1` })
      .where(eq(newsArticles.id, comment.articleId));
    return created;
  }

  async getNewsComments(articleId: number): Promise<NewsComment[]> {
    return db.select().from(newsComments)
      .where(and(eq(newsComments.articleId, articleId), sql`${newsComments.parentId} IS NULL`))
      .orderBy(desc(newsComments.createdAt));
  }

  async getNewsCommentReplies(parentId: number): Promise<NewsComment[]> {
    return db.select().from(newsComments)
      .where(eq(newsComments.parentId, parentId))
      .orderBy(asc(newsComments.createdAt));
  }

  async likeNewsComment(commentId: number): Promise<void> {
    await db.update(newsComments)
      .set({ likes: sql`likes + 1` })
      .where(eq(newsComments.id, commentId));
  }

  async toggleNewsReaction(articleId: number, userId: string, reactionType: string): Promise<boolean> {
    const existing = await this.getNewsReaction(articleId, userId);
    if (existing) {
      await db.delete(newsReactions).where(eq(newsReactions.id, existing.id));
      await db.update(newsArticles)
        .set({ likesCount: sql`GREATEST(likes_count - 1, 0)` })
        .where(eq(newsArticles.id, articleId));
      return false;
    }
    await db.insert(newsReactions).values({ articleId, userId, reactionType });
    await db.update(newsArticles)
      .set({ likesCount: sql`likes_count + 1` })
      .where(eq(newsArticles.id, articleId));
    return true;
  }

  async getNewsReaction(articleId: number, userId: string): Promise<NewsReaction | undefined> {
    const [reaction] = await db.select().from(newsReactions)
      .where(and(eq(newsReactions.articleId, articleId), eq(newsReactions.userId, userId)));
    return reaction;
  }

  async getNewsReactionCount(articleId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(newsReactions)
      .where(eq(newsReactions.articleId, articleId));
    return Number(result[0]?.count || 0);
  }

  async createNewsShare(share: InsertNewsShare): Promise<NewsShare> {
    const [created] = await db.insert(newsShares).values(share).returning();
    await db.update(newsArticles)
      .set({ sharesCount: sql`shares_count + 1` })
      .where(eq(newsArticles.id, share.articleId));
    return created;
  }

  async getNewsShareCount(articleId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(newsShares)
      .where(eq(newsShares.articleId, articleId));
    return Number(result[0]?.count || 0);
  }

  async createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount> {
    const [created] = await db.insert(socialAccounts).values(account).returning();
    return created;
  }

  async getSocialAccounts(): Promise<SocialAccount[]> {
    return db.select().from(socialAccounts).orderBy(desc(socialAccounts.createdAt));
  }

  async getSocialAccount(id: number): Promise<SocialAccount | undefined> {
    const [account] = await db.select().from(socialAccounts).where(eq(socialAccounts.id, id));
    return account;
  }

  async updateSocialAccount(id: number, data: Partial<SocialAccount>): Promise<SocialAccount> {
    const [updated] = await db.update(socialAccounts).set({ ...data, updatedAt: new Date() }).where(eq(socialAccounts.id, id)).returning();
    return updated;
  }

  async deleteSocialAccount(id: number): Promise<void> {
    await db.delete(socialAccounts).where(eq(socialAccounts.id, id));
  }

  async getActiveSocialAccounts(platform?: string): Promise<SocialAccount[]> {
    if (platform) {
      return db.select().from(socialAccounts)
        .where(and(eq(socialAccounts.isActive, true), eq(socialAccounts.platform, platform)));
    }
    return db.select().from(socialAccounts).where(eq(socialAccounts.isActive, true));
  }

  async createSocialPost(post: InsertSocialPost): Promise<SocialPost> {
    const [created] = await db.insert(socialPosts).values(post).returning();
    return created;
  }

  async getSocialPosts(limit = 50, status?: string): Promise<SocialPost[]> {
    if (status) {
      return db.select().from(socialPosts)
        .where(eq(socialPosts.status, status))
        .orderBy(desc(socialPosts.createdAt)).limit(limit);
    }
    return db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt)).limit(limit);
  }

  async getSocialPost(id: number): Promise<SocialPost | undefined> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, id));
    return post;
  }

  async updateSocialPost(id: number, data: Partial<SocialPost>): Promise<SocialPost> {
    const [updated] = await db.update(socialPosts).set(data).where(eq(socialPosts.id, id)).returning();
    return updated;
  }

  async getPendingSocialPosts(): Promise<SocialPost[]> {
    return db.select().from(socialPosts)
      .where(eq(socialPosts.status, "pending"))
      .orderBy(asc(socialPosts.createdAt));
  }

  async getSocialPostsByContent(contentType: string, contentId: string): Promise<SocialPost[]> {
    return db.select().from(socialPosts)
      .where(and(eq(socialPosts.contentType, contentType), eq(socialPosts.contentId, contentId)));
  }

  async createPromotionScore(score: InsertPromotionScore): Promise<PromotionScore> {
    const [created] = await db.insert(promotionScores).values(score).returning();
    return created;
  }

  async getPromotionScores(limit = 50, status?: string): Promise<PromotionScore[]> {
    let query = db.select().from(promotionScores).orderBy(desc(promotionScores.evaluatedAt)).limit(limit);
    if (status) {
      query = db.select().from(promotionScores)
        .where(eq(promotionScores.status, status))
        .orderBy(desc(promotionScores.evaluatedAt)).limit(limit);
    }
    return query;
  }

  async getPromotionScore(id: number): Promise<PromotionScore | undefined> {
    const [score] = await db.select().from(promotionScores).where(eq(promotionScores.id, id));
    return score;
  }

  async getPromotionScoreByContent(contentType: string, contentId: string): Promise<PromotionScore | undefined> {
    const [score] = await db.select().from(promotionScores)
      .where(and(eq(promotionScores.contentType, contentType), eq(promotionScores.contentId, contentId)));
    return score;
  }

  async updatePromotionScore(id: number, data: Partial<PromotionScore>): Promise<PromotionScore> {
    const [updated] = await db.update(promotionScores).set(data).where(eq(promotionScores.id, id)).returning();
    return updated;
  }

  async getPendingReviewPromotions(): Promise<PromotionScore[]> {
    return db.select().from(promotionScores)
      .where(eq(promotionScores.decision, "review"))
      .orderBy(desc(promotionScores.totalScore));
  }

  async createSocialPerformance(perf: InsertSocialPerformance): Promise<SocialPerformance> {
    const [created] = await db.insert(socialPerformance).values(perf).returning();
    return created;
  }

  async getSocialPerformance(limit = 50): Promise<SocialPerformance[]> {
    return db.select().from(socialPerformance)
      .orderBy(desc(socialPerformance.collectedAt)).limit(limit);
  }

  async getSocialPerformanceByPlatform(platform: string, limit = 50): Promise<SocialPerformance[]> {
    return db.select().from(socialPerformance)
      .where(eq(socialPerformance.platform, platform))
      .orderBy(desc(socialPerformance.collectedAt)).limit(limit);
  }

  async getSocialPerformanceSince(since: Date): Promise<SocialPerformance[]> {
    return db.select().from(socialPerformance)
      .where(sql`${socialPerformance.collectedAt} >= ${since}`)
      .orderBy(desc(socialPerformance.collectedAt));
  }

  async getTopViralPosts(limit = 10): Promise<SocialPerformance[]> {
    return db.select().from(socialPerformance)
      .orderBy(desc(socialPerformance.viralScore)).limit(limit);
  }

  async createGrowthPattern(pattern: InsertGrowthPattern): Promise<GrowthPattern> {
    const [created] = await db.insert(growthPatterns).values(pattern).returning();
    return created;
  }

  async getGrowthPatterns(platform?: string): Promise<GrowthPattern[]> {
    if (platform) {
      return db.select().from(growthPatterns)
        .where(eq(growthPatterns.platform, platform))
        .orderBy(desc(growthPatterns.learnedAt));
    }
    return db.select().from(growthPatterns).orderBy(desc(growthPatterns.learnedAt));
  }

  async getActiveGrowthPatterns(platform?: string): Promise<GrowthPattern[]> {
    if (platform) {
      return db.select().from(growthPatterns)
        .where(and(eq(growthPatterns.isActive, true), eq(growthPatterns.platform, platform)))
        .orderBy(desc(growthPatterns.confidence));
    }
    return db.select().from(growthPatterns)
      .where(eq(growthPatterns.isActive, true))
      .orderBy(desc(growthPatterns.confidence));
  }

  async getGrowthPattern(id: number): Promise<GrowthPattern | undefined> {
    const [pattern] = await db.select().from(growthPatterns).where(eq(growthPatterns.id, id));
    return pattern;
  }

  async updateGrowthPattern(id: number, data: Partial<GrowthPattern>): Promise<GrowthPattern> {
    const [updated] = await db.update(growthPatterns).set(data).where(eq(growthPatterns.id, id)).returning();
    return updated;
  }

  async getSystemControlConfigs(): Promise<SystemControlConfig[]> {
    return db.select().from(systemControlConfig).orderBy(asc(systemControlConfig.category), asc(systemControlConfig.key));
  }

  async getSystemControlConfig(key: string): Promise<SystemControlConfig | undefined> {
    const [config] = await db.select().from(systemControlConfig).where(eq(systemControlConfig.key, key));
    return config;
  }

  async upsertSystemControlConfig(data: InsertSystemControlConfig): Promise<SystemControlConfig> {
    const existing = await this.getSystemControlConfig(data.key);
    if (existing) {
      const [updated] = await db.update(systemControlConfig)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(systemControlConfig.key, data.key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(systemControlConfig).values(data).returning();
    return created;
  }

  async updateSystemControlValue(key: string, value: number): Promise<SystemControlConfig> {
    const [updated] = await db.update(systemControlConfig)
      .set({ value, updatedAt: new Date() })
      .where(eq(systemControlConfig.key, key))
      .returning();
    return updated;
  }

  async recordActivityMetric(metric: InsertActivityMetric): Promise<ActivityMetric> {
    const [created] = await db.insert(activityMetrics).values(metric).returning();
    return created;
  }

  async getActivityMetrics(metricKey: string, since?: Date): Promise<ActivityMetric[]> {
    if (since) {
      return db.select().from(activityMetrics)
        .where(and(eq(activityMetrics.metricKey, metricKey), gte(activityMetrics.observedAt, since)))
        .orderBy(desc(activityMetrics.observedAt));
    }
    return db.select().from(activityMetrics)
      .where(eq(activityMetrics.metricKey, metricKey))
      .orderBy(desc(activityMetrics.observedAt))
      .limit(100);
  }

  async getLatestMetrics(): Promise<ActivityMetric[]> {
    const result = await db.execute(sql`
      SELECT DISTINCT ON (metric_key) * FROM activity_metrics
      ORDER BY metric_key, observed_at DESC
    `);
    return (result as any).rows || [];
  }

  async createAnomalyEvent(event: InsertAnomalyEvent): Promise<AnomalyEvent> {
    const [created] = await db.insert(anomalyEvents).values(event).returning();
    return created;
  }

  async getOpenAnomalies(): Promise<AnomalyEvent[]> {
    return db.select().from(anomalyEvents)
      .where(eq(anomalyEvents.status, "open"))
      .orderBy(desc(anomalyEvents.detectedAt));
  }

  async getAllAnomalies(limit = 50): Promise<AnomalyEvent[]> {
    return db.select().from(anomalyEvents)
      .orderBy(desc(anomalyEvents.detectedAt))
      .limit(limit);
  }

  async updateAnomalyStatus(id: number, status: string, resolvedAt?: Date): Promise<AnomalyEvent> {
    const [updated] = await db.update(anomalyEvents)
      .set({ status, resolvedAt: resolvedAt || new Date() })
      .where(eq(anomalyEvents.id, id))
      .returning();
    return updated;
  }

  async createAutomationDecision(decision: InsertAutomationDecision): Promise<AutomationDecision> {
    const [created] = await db.insert(automationDecisions).values(decision).returning();
    return created;
  }

  async getPendingDecisions(): Promise<AutomationDecision[]> {
    return db.select().from(automationDecisions)
      .where(eq(automationDecisions.status, "pending"))
      .orderBy(desc(automationDecisions.requestedAt));
  }

  async getAllDecisions(limit = 50): Promise<AutomationDecision[]> {
    return db.select().from(automationDecisions)
      .orderBy(desc(automationDecisions.requestedAt))
      .limit(limit);
  }

  async resolveDecision(id: number, status: string, resolvedBy: string): Promise<AutomationDecision> {
    const [updated] = await db.update(automationDecisions)
      .set({ status, resolvedBy, resolvedAt: new Date() })
      .where(eq(automationDecisions.id, id))
      .returning();
    return updated;
  }

  async getAutomationPolicy(): Promise<AutomationPolicy | undefined> {
    const [policy] = await db.select().from(automationPolicy).limit(1);
    return policy;
  }

  async upsertAutomationPolicy(data: Partial<InsertAutomationPolicy>): Promise<AutomationPolicy> {
    const existing = await this.getAutomationPolicy();
    if (existing) {
      const [updated] = await db.update(automationPolicy)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(automationPolicy.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(automationPolicy).values({
      mode: data.mode || "autopilot",
      safeMode: data.safeMode || false,
      killSwitch: data.killSwitch || false,
    }).returning();
    return created;
  }
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.sortOrder));
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, name));
    return plan;
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [created] = await db.insert(subscriptionPlans).values(plan).returning();
    return created;
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    const [sub] = await db.select().from(userSubscriptions)
      .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active")))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);
    return sub;
  }

  async createUserSubscription(sub: InsertUserSubscription): Promise<UserSubscription> {
    const [created] = await db.insert(userSubscriptions).values(sub).returning();
    return created;
  }

  async updateUserSubscription(id: string, data: Partial<UserSubscription>): Promise<UserSubscription> {
    const [updated] = await db.update(userSubscriptions).set({ ...data, updatedAt: new Date() }).where(eq(userSubscriptions.id, id)).returning();
    return updated;
  }

  async getCreditPackages(): Promise<CreditPackage[]> {
    return db.select().from(creditPackages).where(eq(creditPackages.isActive, true));
  }

  async createCreditPackage(pkg: InsertCreditPackage): Promise<CreditPackage> {
    const [created] = await db.insert(creditPackages).values(pkg).returning();
    return created;
  }

  async createCreditPurchase(purchase: InsertCreditPurchase): Promise<CreditPurchase> {
    const [created] = await db.insert(creditPurchases).values(purchase).returning();
    return created;
  }

  async getCreditPurchases(userId: string): Promise<CreditPurchase[]> {
    return db.select().from(creditPurchases).where(eq(creditPurchases.userId, userId)).orderBy(desc(creditPurchases.createdAt));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async getInvoices(userId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
    return inv;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async createCreditUsage(entry: InsertCreditUsageLog): Promise<CreditUsageLog> {
    const [created] = await db.insert(creditUsageLog).values(entry).returning();
    return created;
  }

  async getCreditUsage(userId: string, limit = 50): Promise<CreditUsageLog[]> {
    return db.select().from(creditUsageLog).where(eq(creditUsageLog.userId, userId)).orderBy(desc(creditUsageLog.createdAt)).limit(limit);
  }

  async getCreditUsageSince(userId: string, since: Date): Promise<CreditUsageLog[]> {
    return db.select().from(creditUsageLog).where(
      and(eq(creditUsageLog.userId, userId), gte(creditUsageLog.createdAt, since))
    ).orderBy(desc(creditUsageLog.createdAt));
  }

  async getAllCreditUsage(limit = 100): Promise<CreditUsageLog[]> {
    return db.select().from(creditUsageLog).orderBy(desc(creditUsageLog.createdAt)).limit(limit);
  }
}

export const storage = new DatabaseStorage();
