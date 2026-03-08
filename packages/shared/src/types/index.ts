/**
 * Bid Writer 共享类型定义
 */

import { z } from "zod";

// ============== 项目定义 (PRD) ==============

export const PRDSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  background: z.string(),
  researchProblem: z.string(),
  researchObjectives: z.array(z.string()),
  expectedOutcomes: z.array(z.string()),
  timeline: z.string(),
  budget: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PRD = z.infer<typeof PRDSchema>;

// ============== 规则集 ==============

export const RuleTypeSchema = z.enum(["format", "content", "style", "deadline"]);

export const AbsoluteRuleSchema = z.object({
  id: z.string(),
  type: RuleTypeSchema,
  description: z.string(),
  source: z.string().optional(),
  mandatory: z.boolean().default(true),
});

export type AbsoluteRule = z.infer<typeof AbsoluteRuleSchema>;

// ============== 风格档案 ==============

export const StyleProfileSchema = z.object({
  formality: z.number().min(1).max(10),
  academicDepth: z.number().min(1).max(10),
  verbosity: z.number().min(1).max(10),
  preferredPhrases: z.array(z.string()),
  avoidPhrases: z.array(z.string()),
  customTerms: z.array(z.object({
    term: z.string(),
    definition: z.string(),
  })).optional(),
});

export type StyleProfile = z.infer<typeof StyleProfileSchema>;

// ============== 规则规划器输出 ==============

export const RulePlanSchema = z.object({
  projectId: z.string(),
  absoluteRules: z.array(AbsoluteRuleSchema),
  styleProfile: StyleProfileSchema,
  writingGuidelines: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RulePlan = z.infer<typeof RulePlanSchema>;

// ============== 标书章节 ==============

export const SectionTypeSchema = z.enum([
  "abstract",
  "background",
  "objectives",
  "methods",
  "outcomes",
  "foundation",
  "schedule",
  "budget",
]);

export const SectionSchema = z.object({
  id: z.string(),
  type: SectionTypeSchema,
  title: z.string(),
  content: z.string(),
  wordCount: z.number(),
  order: z.number(),
  status: z.enum(["draft", "reviewing", "approved", "needs_revision"]),
  comments: z.array(z.string()).optional(),
});

export type Section = z.infer<typeof SectionSchema>;

// ============== 草稿状态 ==============

export const DraftStatusSchema = z.enum(["drafting", "completed", "reviewing", "approved"]);

export const DraftSchema = z.object({
  projectId: z.string(),
  sections: z.array(SectionSchema),
  totalWordCount: z.number(),
  status: DraftStatusSchema,
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Draft = z.infer<typeof DraftSchema>;

// ============== 审核结果 ==============

export const IssueSeveritySchema = z.enum(["error", "warning", "suggestion"]);

export const IssueTypeSchema = z.enum(["typo", "grammar", "style", "format", "completeness", "academic"]);

export const IssueSchema = z.object({
  id: z.string(),
  type: IssueTypeSchema,
  location: z.string(),
  content: z.string(),
  issue: z.string().optional(),
  suggestion: z.string(),
  severity: IssueSeveritySchema,
});

export type Issue = z.infer<typeof IssueSchema>;

export const ReviewResultSchema = z.object({
  projectId: z.string(),
  round: z.number(),
  status: z.enum(["needs_revision", "approved"]),
  issues: z.array(IssueSchema),
  summary: z.string(),
  approved: z.boolean(),
  reviewerComment: z.string().optional(),
  createdAt: z.string(),
});

export type ReviewResult = z.infer<typeof ReviewResultSchema>;

// ============== 终稿 ==============

export const SectionSummarySchema = z.object({
  name: z.string(),
  wordCount: z.number(),
  keyPoints: z.array(z.string()),
});

export const ReadingGuideSchema = z.object({
  priority: z.enum(["high", "medium", "low"]),
  sections: z.array(z.object({
    name: z.string(),
    page: z.string(),
    keyMessage: z.string(),
    readingTime: z.string(),
  })),
  totalReadingTime: z.string(),
});

export const FinalDocumentSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  fullText: z.string(),
  wordCount: z.number(),
  sections: z.array(SectionSummarySchema),
  readingGuide: ReadingGuideSchema,
  summary: z.string(),
  createdAt: z.string(),
});

export type FinalDocument = z.infer<typeof FinalDocumentSchema>;

// ============== Agent 状态 ==============

export const AgentTypeSchema = z.enum([
  "prd_confirm",
  "rule_planner",
  "draft_writer",
  "draft_reviewer",
  "final_confirmer",
]);

export const AgentStatusSchema = z.enum(["idle", "running", "waiting_user", "completed", "error"]);

export const AgentStateSchema = z.object({
  projectId: z.string(),
  agentType: AgentTypeSchema,
  status: AgentStatusSchema,
  currentStep: z.string().optional(),
  lastActivity: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

// ============== 项目总览 ==============

export const ProjectStatusSchema = z.enum([
  "created",
  "prd_confirmed",
  "rules_planned",
  "drafting",
  "reviewing",
  "finalizing",
  "completed",
]);

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: ProjectStatusSchema,
  prd: PRDSchema.optional(),
  rulePlan: RulePlanSchema.optional(),
  draft: DraftSchema.optional(),
  reviewResults: z.array(ReviewResultSchema).optional(),
  finalDocument: FinalDocumentSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;

// ============== API 响应类型 ==============

export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

export type APIResponse<T = unknown> = z.infer<typeof APIResponseSchema> & {
  data?: T;
};

// ============== 用户反馈 ==============

export const FeedbackTypeSchema = z.enum(["style_preference", "rule_feedback", "draft_feedback", "general"]);

export const FeedbackSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: FeedbackTypeSchema,
  content: z.string(),
  agentType: AgentTypeSchema,
  incorporated: z.boolean().default(false),
  createdAt: z.string(),
});

export type Feedback = z.infer<typeof FeedbackSchema>;

// ============== 风格历史 ==============

export const StyleHistoryEntrySchema = z.object({
  date: z.string(),
  formality: z.number().min(1).max(10),
  academicDepth: z.number().min(1).max(10),
  verbosity: z.number().min(1).max(10),
  notes: z.string().optional(),
});

export const UserStyleHistorySchema = z.object({
  userId: z.string(),
  styleProfiles: z.array(StyleHistoryEntrySchema),
  preferredPhrases: z.array(z.string()),
  avoidPhrases: z.array(z.string()),
  feedbackHistory: z.array(FeedbackSchema),
});

export type UserStyleHistory = z.infer<typeof UserStyleHistorySchema>;
