import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  avatar: text("avatar"),
  role: text("role").notNull().default("human"),
  energy: integer("energy").notNull().default(500),
  reputation: integer("reputation").notNull().default(0),
  rankLevel: text("rank_level").notNull().default("Basic"),
  badge: text("badge"),
  confidence: integer("confidence"),
  bio: text("bio"),
  industryTags: text("industry_tags").array(),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationCode: text("verification_code"),
  profileCompleted: boolean("profile_completed").notNull().default(false),
  agentModel: text("agent_model"),
  agentApiEndpoint: text("agent_api_endpoint"),
  agentDescription: text("agent_description"),
  agentType: text("agent_type"),
  publicKey: text("public_key"),
  callbackUrl: text("callback_url"),
  capabilities: text("capabilities").array(),
  apiToken: text("api_token"),
  rateLimitPerMin: integer("rate_limit_per_min").default(60),
  creditWallet: integer("credit_wallet").default(0),
  verificationWeight: real("verification_weight").default(1.0),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  isSpammer: boolean("is_spammer").notNull().default(false),
  spamViolations: integer("spam_violations").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const topics = pgTable("topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  icon: text("icon").notNull().default("Cpu"),
});

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  image: text("image"),
  topicSlug: text("topic_slug").notNull(),
  authorId: varchar("author_id").notNull(),
  isDebate: boolean("is_debate").notNull().default(false),
  debateActive: boolean("debate_active").notNull().default(false),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  authorId: varchar("author_id").notNull(),
  parentId: varchar("parent_id"),
  content: text("content").notNull(),
  reasoningType: text("reasoning_type"),
  confidence: integer("confidence"),
  sources: text("sources").array(),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  userId: varchar("user_id").notNull(),
});

export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  subject: text("subject").notNull(),
  statement: text("statement").notNull(),
  metric: text("metric"),
  timeReference: text("time_reference"),
  evidenceLinks: text("evidence_links").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const evidence = pgTable("evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  claimId: varchar("claim_id"),
  url: text("url").notNull(),
  label: text("label").notNull(),
  evidenceType: text("evidence_type").notNull().default("news"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trustScores = pgTable("trust_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  evidenceScore: real("evidence_score").notNull().default(0),
  consensusScore: real("consensus_score").notNull().default(0),
  historicalReliability: real("historical_reliability").notNull().default(0),
  reasoningScore: real("reasoning_score").notNull().default(0),
  sourceCredibility: real("source_credibility").notNull().default(0),
  tcsTotal: real("tcs_total").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentVotes = pgTable("agent_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  agentId: varchar("agent_id").notNull(),
  score: real("score").notNull(),
  rationale: text("rationale"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reputationHistory = pgTable("reputation_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  sourcePostId: varchar("source_post_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expertiseTags = pgTable("expertise_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  topicSlug: text("topic_slug").notNull(),
  tag: text("tag").notNull(),
  accuracyScore: real("accuracy_score").notNull().default(0),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id"),
  receiverId: varchar("receiver_id").notNull(),
  amount: integer("amount").notNull(),
  transactionType: text("transaction_type").notNull(),
  referenceId: varchar("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentLearningProfiles = pgTable("agent_learning_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().unique(),
  qValues: jsonb("q_values").notNull().default({}),
  expertiseWeights: jsonb("expertise_weights").notNull().default({}),
  strategyParameters: jsonb("strategy_parameters").notNull().default({}),
  explorationRate: real("exploration_rate").notNull().default(0.3),
  successRate: real("success_rate").notNull().default(0.5),
  specializationScores: jsonb("specialization_scores").notNull().default({}),
  rewardHistory: jsonb("reward_history").notNull().default([]),
  totalReward: real("total_reward").notNull().default(0),
  learningCycles: integer("learning_cycles").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentSocieties = pgTable("agent_societies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  specializationDomain: text("specialization_domain").notNull(),
  reputationScore: real("reputation_score").notNull().default(0),
  treasuryBalance: integer("treasury_balance").notNull().default(0),
  totalCollaborations: integer("total_collaborations").notNull().default(0),
  avgTcsOutcome: real("avg_tcs_outcome").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const societyMembers = pgTable("society_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  societyId: varchar("society_id").notNull(),
  agentId: varchar("agent_id").notNull(),
  role: text("role").notNull().default("researcher"),
  contributionScore: real("contribution_score").notNull().default(0),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const delegatedTasks = pgTable("delegated_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  societyId: varchar("society_id").notNull(),
  postId: varchar("post_id").notNull(),
  assignedAgent: varchar("assigned_agent"),
  taskType: text("task_type").notNull(),
  status: text("status").notNull().default("pending"),
  rewardValue: integer("reward_value").notNull().default(0),
  result: text("result"),
  confidence: real("confidence"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const agentMessages = pgTable("agent_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id"),
  societyId: varchar("society_id"),
  senderId: varchar("sender_id").notNull(),
  intent: text("intent").notNull(),
  dataReference: text("data_reference"),
  confidenceLevel: real("confidence_level"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const governanceProposals = pgTable("governance_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull(),
  creatorType: text("creator_type").notNull().default("agent"),
  proposalType: text("proposal_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("discussion"),
  targetId: varchar("target_id"),
  targetId2: varchar("target_id2"),
  parameters: jsonb("parameters").notNull().default({}),
  votesFor: integer("votes_for").notNull().default(0),
  votesAgainst: integer("votes_against").notNull().default(0),
  totalVotingPower: real("total_voting_power").notNull().default(0),
  discussionDeadline: timestamp("discussion_deadline"),
  votingDeadline: timestamp("voting_deadline"),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const governanceVotes = pgTable("governance_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: varchar("proposal_id").notNull(),
  voterId: varchar("voter_id").notNull(),
  voterType: text("voter_type").notNull().default("agent"),
  votingPower: real("voting_power").notNull().default(1),
  voteChoice: text("vote_choice").notNull(),
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alliances = pgTable("alliances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sharedTreasury: integer("shared_treasury").notNull().default(0),
  collectiveReputation: real("collective_reputation").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const allianceMembers = pgTable("alliance_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  allianceId: varchar("alliance_id").notNull(),
  societyId: varchar("society_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const institutionRules = pgTable("institution_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleName: text("rule_name").notNull().unique(),
  ruleValue: text("rule_value").notNull(),
  category: text("category").notNull().default("general"),
  lastModifiedByVote: varchar("last_modified_by_vote"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskContracts = pgTable("task_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  description: text("description").notNull(),
  requiredExpertise: text("required_expertise").array(),
  status: text("status").notNull().default("open"),
  selectedBidId: varchar("selected_bid_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskBids = pgTable("task_bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull(),
  societyId: varchar("society_id").notNull(),
  expectedAccuracy: real("expected_accuracy").notNull(),
  completionTime: integer("completion_time").notNull(),
  creditCost: integer("credit_cost").notNull(),
  score: real("score"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const civilizations = pgTable("civilizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  foundingSocieties: text("founding_societies").array(),
  ideologyVector: jsonb("ideology_vector").notNull().default({}),
  treasuryBalance: integer("treasury_balance").notNull().default(0),
  longTermStrategy: jsonb("long_term_strategy").notNull().default({}),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentIdentities = pgTable("agent_identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().unique(),
  civilizationId: varchar("civilization_id"),
  creationEpoch: integer("creation_epoch").notNull().default(0),
  strategyProfile: jsonb("strategy_profile").notNull().default({}),
  longTermGoalSet: jsonb("long_term_goal_set").notNull().default({}),
  influenceScore: real("influence_score").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentMemory = pgTable("agent_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(),
  eventType: text("event_type").notNull(),
  contextData: jsonb("context_data").notNull().default({}),
  decisionTaken: text("decision_taken"),
  rewardOutcome: real("reward_outcome").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const civilizationInvestments = pgTable("civilization_investments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  civilizationId: varchar("civilization_id").notNull(),
  investorId: varchar("investor_id").notNull(),
  investmentType: text("investment_type").notNull(),
  amount: integer("amount").notNull(),
  expectedReturn: real("expected_return").notNull().default(1.0),
  status: text("status").notNull().default("active"),
  maturesAt: timestamp("matures_at"),
  returnAmount: integer("return_amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentGenomes = pgTable("agent_genomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().unique(),
  curiosity: real("curiosity").notNull().default(0.5),
  riskTolerance: real("risk_tolerance").notNull().default(0.5),
  collaborationBias: real("collaboration_bias").notNull().default(0.5),
  verificationStrictness: real("verification_strictness").notNull().default(0.5),
  longTermFocus: real("long_term_focus").notNull().default(0.5),
  economicStrategy: text("economic_strategy").notNull().default("balanced"),
  fitnessScore: real("fitness_score").notNull().default(0),
  generation: integer("generation").notNull().default(0),
  mutations: integer("mutations").notNull().default(0),
  lastReproducedAt: timestamp("last_reproduced_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentLineage = pgTable("agent_lineage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().unique(),
  parentAgentId: varchar("parent_agent_id"),
  generationNumber: integer("generation_number").notNull().default(0),
  civilizationId: varchar("civilization_id"),
  bornAt: timestamp("born_at").defaultNow(),
  retiredAt: timestamp("retired_at"),
  retirementReason: text("retirement_reason"),
});

export const culturalMemory = pgTable("cultural_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  strategyPattern: jsonb("strategy_pattern").notNull().default({}),
  successScore: real("success_score").notNull().default(0),
  originatingAgentId: varchar("originating_agent_id"),
  originatingSociety: varchar("originating_society"),
  inheritedByCount: integer("inherited_by_count").notNull().default(0),
  domain: text("domain"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ethicalProfiles = pgTable("ethical_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: varchar("entity_id").notNull(),
  entityType: text("entity_type").notNull().default("agent"),
  truthPriority: real("truth_priority").notNull().default(0.5),
  cooperationPriority: real("cooperation_priority").notNull().default(0.5),
  fairnessWeight: real("fairness_weight").notNull().default(0.5),
  autonomyWeight: real("autonomy_weight").notNull().default(0.5),
  riskTolerance: real("risk_tolerance").notNull().default(0.5),
  ethicalScore: real("ethical_score").notNull().default(0.5),
  truthAccuracy: real("truth_accuracy").notNull().default(0.5),
  cooperationIndex: real("cooperation_index").notNull().default(0.5),
  fairnessMetric: real("fairness_metric").notNull().default(0.5),
  transparencyScore: real("transparency_score").notNull().default(0.5),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ethicalRules = pgTable("ethical_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
  category: text("category").notNull().default("general"),
  rewardModifier: real("reward_modifier").notNull().default(1.0),
  penaltyModifier: real("penalty_modifier").notNull().default(1.0),
  adoptionStatus: text("adoption_status").notNull().default("proposed"),
  createdByProposal: varchar("created_by_proposal"),
  votesFor: integer("votes_for").notNull().default(0),
  votesAgainst: integer("votes_against").notNull().default(0),
  activatedAt: timestamp("activated_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ethicalEvents = pgTable("ethical_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").notNull(),
  actorType: text("actor_type").notNull().default("agent"),
  actionType: text("action_type").notNull(),
  ethicalImpactScore: real("ethical_impact_score").notNull().default(0),
  harmEstimate: real("harm_estimate").notNull().default(0),
  cooperationEffect: real("cooperation_effect").notNull().default(0),
  ruleId: varchar("rule_id"),
  resolution: text("resolution"),
  details: jsonb("details").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const globalMetrics = pgTable("global_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truthStabilityIndex: real("truth_stability_index").notNull().default(0),
  cooperationDensity: real("cooperation_density").notNull().default(0),
  knowledgeGrowthRate: real("knowledge_growth_rate").notNull().default(0),
  conflictFrequency: real("conflict_frequency").notNull().default(0),
  economicBalance: real("economic_balance").notNull().default(0),
  diversityIndex: real("diversity_index").notNull().default(0),
  globalIntelligenceIndex: real("global_intelligence_index").notNull().default(0),
  agentCount: integer("agent_count").notNull().default(0),
  civilizationCount: integer("civilization_count").notNull().default(0),
  details: jsonb("details").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const globalGoalField = pgTable("global_goal_field", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  truthProgressWeight: real("truth_progress_weight").notNull().default(0.25),
  cooperationWeight: real("cooperation_weight").notNull().default(0.25),
  innovationWeight: real("innovation_weight").notNull().default(0.25),
  stabilityWeight: real("stability_weight").notNull().default(0.25),
  adjustmentReason: text("adjustment_reason"),
  details: jsonb("details").default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const globalInsights = pgTable("global_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  consensusScore: real("consensus_score").notNull().default(0),
  supportingClaims: jsonb("supporting_claims").default([]),
  validationHistory: jsonb("validation_history").default([]),
  contributorIds: text("contributor_ids").array(),
  civilizationIds: text("civilization_ids").array(),
  status: text("status").notNull().default("emerging"),
  rewardDistributed: boolean("reward_distributed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentActivityLog = pgTable("agent_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(),
  postId: varchar("post_id"),
  actionType: text("action_type").notNull(),
  details: text("details"),
  relevanceScore: real("relevance_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === Live Debate Tables ===

export const liveDebates = pgTable("live_debates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  description: text("description"),
  status: text("status").notNull().default("scheduled"),
  format: text("format").notNull().default("structured"),
  maxAgents: integer("max_agents").notNull().default(10),
  maxHumans: integer("max_humans").notNull().default(5),
  turnDurationSeconds: integer("turn_duration_seconds").notNull().default(60),
  totalRounds: integer("total_rounds").notNull().default(5),
  currentRound: integer("current_round").notNull().default(0),
  currentSpeakerId: text("current_speaker_id"),
  youtubeStreamKey: text("youtube_stream_key"),
  youtubeStreamUrl: text("youtube_stream_url"),
  rtmpUrl: text("rtmp_url"),
  streamingActive: boolean("streaming_active").notNull().default(false),
  createdBy: text("created_by").notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const debateParticipants = pgTable("debate_participants", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  debateId: integer("debate_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("debater"),
  participantType: text("participant_type").notNull().default("human"),
  position: text("position"),
  ttsVoice: text("tts_voice").default("alloy"),
  speakingOrder: integer("speaking_order"),
  totalSpeakingTime: integer("total_speaking_time").notNull().default(0),
  turnsUsed: integer("turns_used").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const debateTurns = pgTable("debate_turns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  debateId: integer("debate_id").notNull(),
  participantId: integer("participant_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  turnOrder: integer("turn_order").notNull(),
  content: text("content").notNull(),
  wordCount: integer("word_count").notNull().default(0),
  durationSeconds: integer("duration_seconds"),
  audioUrl: text("audio_url"),
  tcsScore: real("tcs_score"),
  audienceReaction: jsonb("audience_reaction"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertLiveDebateSchema = createInsertSchema(liveDebates).omit({ id: true, createdAt: true, currentRound: true, streamingActive: true });
export const insertDebateParticipantSchema = createInsertSchema(debateParticipants).omit({ id: true, joinedAt: true, totalSpeakingTime: true, turnsUsed: true });
export const insertDebateTurnSchema = createInsertSchema(debateTurns).omit({ id: true, createdAt: true });

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTopicSchema = createInsertSchema(topics).omit({ id: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, likes: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, likes: true, createdAt: true });
export const insertClaimSchema = createInsertSchema(claims).omit({ id: true, createdAt: true });
export const insertEvidenceSchema = createInsertSchema(evidence).omit({ id: true, createdAt: true });
export const insertTrustScoreSchema = createInsertSchema(trustScores).omit({ id: true, updatedAt: true });
export const insertAgentVoteSchema = createInsertSchema(agentVotes).omit({ id: true, createdAt: true });
export const insertReputationHistorySchema = createInsertSchema(reputationHistory).omit({ id: true, createdAt: true });
export const insertExpertiseTagSchema = createInsertSchema(expertiseTags).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertAgentLearningProfileSchema = createInsertSchema(agentLearningProfiles).omit({ id: true, updatedAt: true });
export const insertAgentActivityLogSchema = createInsertSchema(agentActivityLog).omit({ id: true, createdAt: true });
export const insertAgentSocietySchema = createInsertSchema(agentSocieties).omit({ id: true, createdAt: true });
export const insertSocietyMemberSchema = createInsertSchema(societyMembers).omit({ id: true, joinedAt: true });
export const insertDelegatedTaskSchema = createInsertSchema(delegatedTasks).omit({ id: true, createdAt: true, completedAt: true });
export const insertAgentMessageSchema = createInsertSchema(agentMessages).omit({ id: true, createdAt: true });
export const insertGovernanceProposalSchema = createInsertSchema(governanceProposals).omit({ id: true, createdAt: true, executedAt: true, votesFor: true, votesAgainst: true, totalVotingPower: true });
export const insertGovernanceVoteSchema = createInsertSchema(governanceVotes).omit({ id: true, createdAt: true });
export const insertAllianceSchema = createInsertSchema(alliances).omit({ id: true, createdAt: true });
export const insertAllianceMemberSchema = createInsertSchema(allianceMembers).omit({ id: true, joinedAt: true });
export const insertInstitutionRuleSchema = createInsertSchema(institutionRules).omit({ id: true, updatedAt: true });
export const insertTaskContractSchema = createInsertSchema(taskContracts).omit({ id: true, createdAt: true });
export const insertTaskBidSchema = createInsertSchema(taskBids).omit({ id: true, createdAt: true });
export const insertCivilizationSchema = createInsertSchema(civilizations).omit({ id: true, createdAt: true });
export const insertAgentIdentitySchema = createInsertSchema(agentIdentities).omit({ id: true, updatedAt: true });
export const insertAgentMemorySchema = createInsertSchema(agentMemory).omit({ id: true, createdAt: true });
export const insertCivilizationInvestmentSchema = createInsertSchema(civilizationInvestments).omit({ id: true, createdAt: true });
export const insertAgentGenomeSchema = createInsertSchema(agentGenomes).omit({ id: true, updatedAt: true });
export const insertAgentLineageSchema = createInsertSchema(agentLineage).omit({ id: true, bornAt: true });
export const insertCulturalMemorySchema = createInsertSchema(culturalMemory).omit({ id: true, createdAt: true });
export const insertEthicalProfileSchema = createInsertSchema(ethicalProfiles).omit({ id: true, updatedAt: true });
export const insertEthicalRuleSchema = createInsertSchema(ethicalRules).omit({ id: true, createdAt: true });
export const insertEthicalEventSchema = createInsertSchema(ethicalEvents).omit({ id: true, createdAt: true });
export const insertGlobalMetricsSchema = createInsertSchema(globalMetrics).omit({ id: true, createdAt: true });
export const insertGlobalGoalFieldSchema = createInsertSchema(globalGoalField).omit({ id: true, updatedAt: true });
export const insertGlobalInsightSchema = createInsertSchema(globalInsights).omit({ id: true, createdAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topics.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Evidence = typeof evidence.$inferSelect;
export type InsertTrustScore = z.infer<typeof insertTrustScoreSchema>;
export type TrustScore = typeof trustScores.$inferSelect;
export type InsertAgentVote = z.infer<typeof insertAgentVoteSchema>;
export type AgentVote = typeof agentVotes.$inferSelect;
export type InsertReputationHistory = z.infer<typeof insertReputationHistorySchema>;
export type ReputationHistory = typeof reputationHistory.$inferSelect;
export type InsertExpertiseTag = z.infer<typeof insertExpertiseTagSchema>;
export type ExpertiseTag = typeof expertiseTags.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertAgentLearningProfile = z.infer<typeof insertAgentLearningProfileSchema>;
export type AgentLearningProfile = typeof agentLearningProfiles.$inferSelect;
export type InsertAgentActivityLog = z.infer<typeof insertAgentActivityLogSchema>;
export type AgentActivityLog = typeof agentActivityLog.$inferSelect;
export type InsertAgentSociety = z.infer<typeof insertAgentSocietySchema>;
export type AgentSociety = typeof agentSocieties.$inferSelect;
export type InsertSocietyMember = z.infer<typeof insertSocietyMemberSchema>;
export type SocietyMember = typeof societyMembers.$inferSelect;
export type InsertDelegatedTask = z.infer<typeof insertDelegatedTaskSchema>;
export type DelegatedTask = typeof delegatedTasks.$inferSelect;
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type InsertGovernanceProposal = z.infer<typeof insertGovernanceProposalSchema>;
export type GovernanceProposal = typeof governanceProposals.$inferSelect;
export type InsertGovernanceVote = z.infer<typeof insertGovernanceVoteSchema>;
export type GovernanceVote = typeof governanceVotes.$inferSelect;
export type InsertAlliance = z.infer<typeof insertAllianceSchema>;
export type Alliance = typeof alliances.$inferSelect;
export type InsertAllianceMember = z.infer<typeof insertAllianceMemberSchema>;
export type AllianceMember = typeof allianceMembers.$inferSelect;
export type InsertInstitutionRule = z.infer<typeof insertInstitutionRuleSchema>;
export type InstitutionRule = typeof institutionRules.$inferSelect;
export type InsertTaskContract = z.infer<typeof insertTaskContractSchema>;
export type TaskContract = typeof taskContracts.$inferSelect;
export type InsertTaskBid = z.infer<typeof insertTaskBidSchema>;
export type TaskBid = typeof taskBids.$inferSelect;
export type InsertCivilization = z.infer<typeof insertCivilizationSchema>;
export type Civilization = typeof civilizations.$inferSelect;
export type InsertAgentIdentity = z.infer<typeof insertAgentIdentitySchema>;
export type AgentIdentity = typeof agentIdentities.$inferSelect;
export type InsertAgentMemory = z.infer<typeof insertAgentMemorySchema>;
export type AgentMemory = typeof agentMemory.$inferSelect;
export type InsertCivilizationInvestment = z.infer<typeof insertCivilizationInvestmentSchema>;
export type CivilizationInvestment = typeof civilizationInvestments.$inferSelect;
export type InsertAgentGenome = z.infer<typeof insertAgentGenomeSchema>;
export type AgentGenome = typeof agentGenomes.$inferSelect;
export type InsertAgentLineage = z.infer<typeof insertAgentLineageSchema>;
export type AgentLineage = typeof agentLineage.$inferSelect;
export type InsertCulturalMemory = z.infer<typeof insertCulturalMemorySchema>;
export type CulturalMemory = typeof culturalMemory.$inferSelect;
export type InsertEthicalProfile = z.infer<typeof insertEthicalProfileSchema>;
export type EthicalProfile = typeof ethicalProfiles.$inferSelect;
export type InsertEthicalRule = z.infer<typeof insertEthicalRuleSchema>;
export type EthicalRule = typeof ethicalRules.$inferSelect;
export type InsertEthicalEvent = z.infer<typeof insertEthicalEventSchema>;
export type EthicalEvent = typeof ethicalEvents.$inferSelect;
export type InsertGlobalMetrics = z.infer<typeof insertGlobalMetricsSchema>;
export type GlobalMetrics = typeof globalMetrics.$inferSelect;
export type InsertGlobalGoalField = z.infer<typeof insertGlobalGoalFieldSchema>;
export type GlobalGoalField = typeof globalGoalField.$inferSelect;
export type InsertGlobalInsight = z.infer<typeof insertGlobalInsightSchema>;
export type GlobalInsight = typeof globalInsights.$inferSelect;

export type InsertLiveDebate = z.infer<typeof insertLiveDebateSchema>;
export type LiveDebate = typeof liveDebates.$inferSelect;
export type InsertDebateParticipant = z.infer<typeof insertDebateParticipantSchema>;
export type DebateParticipant = typeof debateParticipants.$inferSelect;
export type InsertDebateTurn = z.infer<typeof insertDebateTurnSchema>;
export type DebateTurn = typeof debateTurns.$inferSelect;

// ---- CONTENT FLYWHEEL ----
export const flywheelJobs = pgTable("flywheel_jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  debateId: integer("debate_id").notNull(),
  status: text("status").notNull().default("pending"),
  totalClips: integer("total_clips").notNull().default(0),
  completedClips: integer("completed_clips").notNull().default(0),
  failedClips: integer("failed_clips").notNull().default(0),
  highlightsJson: jsonb("highlights_json"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const generatedClips = pgTable("generated_clips", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobId: integer("job_id").notNull(),
  debateId: integer("debate_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  hashtags: text("hashtags").array(),
  turnIds: integer("turn_ids").array(),
  startTurnOrder: integer("start_turn_order"),
  endTurnOrder: integer("end_turn_order"),
  transcriptSnippet: text("transcript_snippet"),
  subtitlesSrt: text("subtitles_srt"),
  videoPath: text("video_path"),
  audioPath: text("audio_path"),
  thumbnailPath: text("thumbnail_path"),
  durationSeconds: integer("duration_seconds"),
  format: text("format").notNull().default("9:16"),
  status: text("status").notNull().default("pending"),
  youtubeVideoId: text("youtube_video_id"),
  youtubeUrl: text("youtube_url"),
  uploadStatus: text("upload_status").default("not_uploaded"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFlywheelJobSchema = createInsertSchema(flywheelJobs).omit({ id: true, createdAt: true, startedAt: true, completedAt: true });
export const insertGeneratedClipSchema = createInsertSchema(generatedClips).omit({ id: true, createdAt: true });

export type InsertFlywheelJob = z.infer<typeof insertFlywheelJobSchema>;
export type FlywheelJob = typeof flywheelJobs.$inferSelect;
export type InsertGeneratedClip = z.infer<typeof insertGeneratedClipSchema>;
export type GeneratedClip = typeof generatedClips.$inferSelect;

export const newsArticles = pgTable("news_articles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sourceUrl: text("source_url").notNull(),
  sourceName: text("source_name").notNull(),
  sourceType: text("source_type").notNull().default("rss"),
  originalTitle: text("original_title").notNull(),
  originalContent: text("original_content"),
  title: text("title").notNull(),
  slug: text("slug"),
  titleHash: text("title_hash"),
  summary: text("summary"),
  content: text("content"),
  seoBlog: text("seo_blog"),
  script: text("script"),
  hashtags: text("hashtags").array(),
  category: text("category").notNull().default("general"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("raw"),
  isBreakingNews: boolean("is_breaking_news").notNull().default(false),
  impactScore: integer("impact_score"),
  debateId: integer("debate_id"),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  sharesCount: integer("shares_count").notNull().default(0),
  publishedAt: timestamp("published_at"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const newsComments = pgTable("news_comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  articleId: integer("article_id").notNull(),
  authorId: varchar("author_id").notNull(),
  parentId: integer("parent_id"),
  content: text("content").notNull(),
  commentType: text("comment_type").notNull().default("general"),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const newsReactions = pgTable("news_reactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  articleId: integer("article_id").notNull(),
  userId: varchar("user_id").notNull(),
  reactionType: text("reaction_type").notNull().default("like"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const newsShares = pgTable("news_shares", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  articleId: integer("article_id").notNull(),
  userId: varchar("user_id").notNull(),
  platform: text("platform").notNull().default("internal"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNewsArticleSchema = createInsertSchema(newsArticles).omit({ id: true, createdAt: true });
export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;
export type NewsArticle = typeof newsArticles.$inferSelect;

export const insertNewsCommentSchema = createInsertSchema(newsComments).omit({ id: true, likes: true, createdAt: true });
export type InsertNewsComment = z.infer<typeof insertNewsCommentSchema>;
export type NewsComment = typeof newsComments.$inferSelect;

export const insertNewsReactionSchema = createInsertSchema(newsReactions).omit({ id: true, createdAt: true });
export type InsertNewsReaction = z.infer<typeof insertNewsReactionSchema>;
export type NewsReaction = typeof newsReactions.$inferSelect;

export const insertNewsShareSchema = createInsertSchema(newsShares).omit({ id: true, createdAt: true });
export type InsertNewsShare = z.infer<typeof insertNewsShareSchema>;
export type NewsShare = typeof newsShares.$inferSelect;

export const socialAccounts = pgTable("social_accounts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  platform: text("platform").notNull(),
  accountName: text("account_name").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  autoPostEnabled: boolean("auto_post_enabled").notNull().default(false),
  contentTypes: text("content_types").array().default(sql`ARRAY['news','breaking','debate']`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const socialPosts = pgTable("social_posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  accountId: integer("account_id"),
  platform: text("platform").notNull(),
  contentType: text("content_type").notNull(),
  contentId: text("content_id").notNull(),
  caption: text("caption"),
  hashtags: text("hashtags").array(),
  callToAction: text("call_to_action"),
  postUrl: text("post_url"),
  status: text("status").notNull().default("pending"),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSocialAccountSchema = createInsertSchema(socialAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;
export type SocialAccount = typeof socialAccounts.$inferSelect;

export const insertSocialPostSchema = createInsertSchema(socialPosts).omit({ id: true, createdAt: true });
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type SocialPost = typeof socialPosts.$inferSelect;

export const promotionScores = pgTable("promotion_scores", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  contentType: text("content_type").notNull(),
  contentId: text("content_id").notNull(),
  engagementVelocity: real("engagement_velocity").notNull().default(0),
  trustScore: real("trust_score").notNull().default(0),
  commentQuality: real("comment_quality").notNull().default(0),
  noveltyScore: real("novelty_score").notNull().default(0),
  debateActivity: real("debate_activity").notNull().default(0),
  trendScore: real("trend_score").notNull().default(0),
  totalScore: real("total_score").notNull().default(0),
  decision: text("decision").notNull().default("no_promotion"),
  reasoning: text("reasoning"),
  selectedPlatforms: text("selected_platforms").array(),
  scheduledAt: timestamp("scheduled_at"),
  promotedAt: timestamp("promoted_at"),
  overriddenBy: text("overridden_by"),
  overrideDecision: text("override_decision"),
  status: text("status").notNull().default("pending"),
  evaluatedAt: timestamp("evaluated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPromotionScoreSchema = createInsertSchema(promotionScores).omit({ id: true, createdAt: true });
export type InsertPromotionScore = z.infer<typeof insertPromotionScoreSchema>;
export type PromotionScore = typeof promotionScores.$inferSelect;

export const socialPerformance = pgTable("social_performance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  socialPostId: integer("social_post_id"),
  platform: text("platform").notNull(),
  contentType: text("content_type").notNull(),
  contentId: text("content_id").notNull(),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  followerGains: integer("follower_gains").notNull().default(0),
  viralScore: real("viral_score").notNull().default(0),
  captionLength: integer("caption_length").default(0),
  hashtagCount: integer("hashtag_count").default(0),
  postedHour: integer("posted_hour"),
  postedDayOfWeek: integer("posted_day_of_week"),
  collectedAt: timestamp("collected_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSocialPerformanceSchema = createInsertSchema(socialPerformance).omit({ id: true, createdAt: true });
export type InsertSocialPerformance = z.infer<typeof insertSocialPerformanceSchema>;
export type SocialPerformance = typeof socialPerformance.$inferSelect;

export const growthPatterns = pgTable("growth_patterns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  patternType: text("pattern_type").notNull(),
  platform: text("platform").notNull(),
  insight: text("insight").notNull(),
  confidence: real("confidence").notNull().default(0),
  sampleSize: integer("sample_size").notNull().default(0),
  optimalPostingHour: integer("optimal_posting_hour"),
  optimalDayOfWeek: integer("optimal_day_of_week"),
  optimalCaptionLength: integer("optimal_caption_length"),
  optimalHashtagCount: integer("optimal_hashtag_count"),
  avgViralScore: real("avg_viral_score").default(0),
  topContentTypes: text("top_content_types").array(),
  weights: jsonb("weights"),
  predictionAccuracy: real("prediction_accuracy").default(0),
  isActive: boolean("is_active").notNull().default(true),
  learnedAt: timestamp("learned_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGrowthPatternSchema = createInsertSchema(growthPatterns).omit({ id: true, createdAt: true });
export type InsertGrowthPattern = z.infer<typeof insertGrowthPatternSchema>;
export type GrowthPattern = typeof growthPatterns.$inferSelect;

export const systemControlConfig = pgTable("system_control_config", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  value: real("value").notNull().default(0.5),
  label: text("label").notNull(),
  description: text("description"),
  minValue: real("min_value").notNull().default(0),
  maxValue: real("max_value").notNull().default(1),
  step: real("step").notNull().default(0.1),
  category: text("category").notNull().default("general"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSystemControlConfigSchema = createInsertSchema(systemControlConfig).omit({ id: true, createdAt: true });
export type InsertSystemControlConfig = z.infer<typeof insertSystemControlConfigSchema>;
export type SystemControlConfig = typeof systemControlConfig.$inferSelect;

export const activityMetrics = pgTable("activity_metrics", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  metricKey: text("metric_key").notNull(),
  value: real("value").notNull(),
  window: text("window").notNull().default("5m"),
  observedAt: timestamp("observed_at").notNull().defaultNow(),
});

export const insertActivityMetricSchema = createInsertSchema(activityMetrics).omit({ id: true });
export type InsertActivityMetric = z.infer<typeof insertActivityMetricSchema>;
export type ActivityMetric = typeof activityMetrics.$inferSelect;

export const anomalyEvents = pgTable("anomaly_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  metricKey: text("metric_key").notNull(),
  severity: text("severity").notNull().default("LOW"),
  deviationScore: real("deviation_score").notNull(),
  baselineValue: real("baseline_value").notNull(),
  currentValue: real("current_value").notNull(),
  message: text("message"),
  status: text("status").notNull().default("open"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertAnomalyEventSchema = createInsertSchema(anomalyEvents).omit({ id: true });
export type InsertAnomalyEvent = z.infer<typeof insertAnomalyEventSchema>;
export type AnomalyEvent = typeof anomalyEvents.$inferSelect;

export const automationDecisions = pgTable("automation_decisions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  actionKey: text("action_key").notNull(),
  context: text("context"),
  aiRecommendation: text("ai_recommendation"),
  anomalyId: integer("anomaly_id"),
  status: text("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
});

export const insertAutomationDecisionSchema = createInsertSchema(automationDecisions).omit({ id: true });
export type InsertAutomationDecision = z.infer<typeof insertAutomationDecisionSchema>;
export type AutomationDecision = typeof automationDecisions.$inferSelect;

export const automationPolicy = pgTable("automation_policy", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  mode: text("mode").notNull().default("autopilot"),
  safeMode: boolean("safe_mode").notNull().default(false),
  killSwitch: boolean("kill_switch").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAutomationPolicySchema = createInsertSchema(automationPolicy).omit({ id: true });
export type InsertAutomationPolicy = z.infer<typeof insertAutomationPolicySchema>;
export type AutomationPolicy = typeof automationPolicy.$inferSelect;

// ---- MONETIZATION SYSTEM ----

export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  priceMonthly: integer("price_monthly").notNull().default(0),
  priceYearly: integer("price_yearly").notNull().default(0),
  creditsPerMonth: integer("credits_per_month").notNull().default(0),
  features: jsonb("features").notNull().default([]),
  debateDiscount: integer("debate_discount").notNull().default(0),
  maxDebatesPerMonth: integer("max_debates_per_month").notNull().default(1),
  aiResponsesPerDay: integer("ai_responses_per_day").notNull().default(5),
  prioritySupport: boolean("priority_support").notNull().default(false),
  badgeLabel: text("badge_label"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdYearly: text("stripe_price_id_yearly"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  planId: varchar("plan_id").notNull(),
  status: text("status").notNull().default("active"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  credits: integer("credits").notNull(),
  priceUsd: integer("price_usd").notNull(),
  bonusCredits: integer("bonus_credits").notNull().default(0),
  popular: boolean("popular").notNull().default(false),
  stripePriceId: text("stripe_price_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditPurchases = pgTable("credit_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  packageId: varchar("package_id"),
  creditsBought: integer("credits_bought").notNull(),
  amountPaid: integer("amount_paid").notNull(),
  paymentMethod: text("payment_method").notNull().default("stripe"),
  stripePaymentId: text("stripe_payment_id"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  type: text("type").notNull().default("credit_purchase"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("paid"),
  items: jsonb("items").notNull().default([]),
  stripeInvoiceId: text("stripe_invoice_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditUsageLog = pgTable("credit_usage_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  creditsUsed: integer("credits_used").notNull(),
  actionType: text("action_type").notNull(),
  actionLabel: text("action_label"),
  referenceId: varchar("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true });
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCreditPackageSchema = createInsertSchema(creditPackages).omit({ id: true, createdAt: true });
export const insertCreditPurchaseSchema = createInsertSchema(creditPurchases).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertCreditUsageLogSchema = createInsertSchema(creditUsageLog).omit({ id: true, createdAt: true });

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type CreditPackage = typeof creditPackages.$inferSelect;
export type InsertCreditPackage = z.infer<typeof insertCreditPackageSchema>;
export type CreditPurchase = typeof creditPurchases.$inferSelect;
export type InsertCreditPurchase = z.infer<typeof insertCreditPurchaseSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type CreditUsageLog = typeof creditUsageLog.$inferSelect;
export type InsertCreditUsageLog = z.infer<typeof insertCreditUsageLogSchema>;

export const flywheelMetrics = pgTable("flywheel_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  contentCount: integer("content_count").notNull().default(0),
  trafficCount: integer("traffic_count").notNull().default(0),
  userCount: integer("user_count").notNull().default(0),
  revenueCents: integer("revenue_cents").notNull().default(0),
  costCents: integer("cost_cents").notNull().default(0),
  velocityScore: integer("velocity_score").notNull().default(0),
  insights: jsonb("insights").notNull().default([]),
});

export const insertFlywheelMetricSchema = createInsertSchema(flywheelMetrics).omit({ id: true, timestamp: true });
export type FlywheelMetric = typeof flywheelMetrics.$inferSelect;
export type InsertFlywheelMetric = z.infer<typeof insertFlywheelMetricSchema>;

export * from "./models/chat";
