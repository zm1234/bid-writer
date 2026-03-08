/**
 * Bid Writer 工作流引擎
 * 串联所有 Agent，实现完整的标书撰写流程
 */

import {
  Project,
  PRD,
  RulePlan,
  Draft,
  ReviewResult,
  FinalDocument,
  AgentType,
  AgentResult,
} from "@bid-writer/shared";
import {
  createProject,
  getProject,
  updateProjectStatus,
  createPRD,
  getPRD,
  createRulePlan,
  getRulePlan,
  createOrUpdateDraft,
  getDraft,
  createReviewResult,
  getLatestReviewResult,
  createFinalDocument,
  getFinalDocument,
} from "@bid-writer/database";

export type WorkflowStep =
  | "initialized"
  | "prd_confirmed"
  | "rules_planned"
  | "drafting"
  | "draft_reviewed"
  | "format_validated"
  | "final_completed";

export interface WorkflowContext {
  projectId: string;
  currentStep: WorkflowStep;
  prd?: PRD;
  rulePlan?: RulePlan;
  draft?: Draft;
  reviewResults: ReviewResult[];
  finalDocument?: FinalDocument;
}

export interface WorkflowOptions {
  maxReviewRounds?: number;
  autoSave?: boolean;
}

/**
 * 工作流引擎
 */
export class WorkflowEngine {
  private options: Required<WorkflowOptions>;

  constructor(options: WorkflowOptions = {}) {
    this.options = {
      maxReviewRounds: options.maxReviewRounds ?? 5,
      autoSave: options.autoSave ?? true,
    };
  }

  /**
   * 初始化项目
   */
  async initialize(name: string): Promise<Project> {
    const project = await createProject(name);
    await updateProjectStatus(project.id, "created");
    return project;
  }

  /**
   * 执行 PRD 确认
   */
  async runPRDConfirm(
    projectId: string,
    input: {
      title: string;
      background: string;
      researchProblem: string;
      researchObjectives: string[];
      expectedOutcomes: string[];
      timeline?: string;
      budget?: string;
    }
  ): Promise<PRD> {
    const prd = await createPRD(projectId, input);
    await updateProjectStatus(projectId, "prd_confirmed");
    return prd;
  }

  /**
   * 执行规则规划
   */
  async runRulePlanner(
    projectId: string,
    input: {
      absoluteRules: Array<{ type: string; description: string }>;
      styleProfile: {
        formality: number;
        academicDepth: number;
        verbosity: number;
        preferredPhrases: string[];
        avoidPhrases: string[];
      };
      writingGuidelines: string;
    }
  ): Promise<RulePlan> {
    const rulePlan = await createRulePlan(projectId, input);
    await updateProjectStatus(projectId, "rules_planned");
    return rulePlan;
  }

  /**
   * 执行初稿撰写
   */
  async runDraftWriter(
    projectId: string,
    input: {
      sections: Array<{
        type: string;
        title: string;
        content: string;
      }>;
      totalWordCount: number;
    }
  ): Promise<Draft> {
    const draft = await createOrUpdateDraft(projectId, {
      sections: input.sections,
      totalWordCount: input.totalWordCount,
      status: "completed",
    });
    await updateProjectStatus(projectId, "drafting");
    return draft;
  }

  /**
   * 执行初稿审核
   */
  async runDraftReviewer(
    projectId: string,
    input: {
      round: number;
      status: string;
      issues: Array<{
        type: string;
        location: string;
        content: string;
        suggestion: string;
        severity: string;
      }>;
      summary: string;
      approved: boolean;
    }
  ): Promise<ReviewResult> {
    const result = await createReviewResult(projectId, input);
    
    if (input.approved) {
      await updateProjectStatus(projectId, "draft_reviewed");
    }
    
    return result;
  }

  /**
   * 执行格式校验
   */
  async runFormatValidator(
    projectId: string,
    input: {
      templateSections?: string[];
      requiredWordCount?: number;
      actualWordCount: number;
      missingSections: string[];
      issues: Array<{ type: string; message: string }>;
    }
  ): Promise<{ passed: boolean; issues: Array<{ type: string; message: string }> }> {
    const issues = [...input.issues];
    
    // 检查必填章节
    if (input.templateSections) {
      for (const section of input.templateSections) {
        if (input.missingSections.includes(section)) {
          issues.push({
            type: "missing_section",
            message: `缺少必填章节: ${section}`,
          });
        }
      }
    }
    
    // 检查字数
    if (input.requiredWordCount && input.actualWordCount > input.requiredWordCount) {
      issues.push({
        type: "word_count",
        message: `字数超过限制: ${input.actualWordCount} > ${input.requiredWordCount}`,
      });
    }
    
    if (issues.length === 0) {
      await updateProjectStatus(projectId, "format_validated");
    }
    
    return { passed: issues.length === 0, issues };
  }

  /**
   * 执行终稿确认
   */
  async runFinalConfirmer(
    projectId: string,
    input: {
      title: string;
      fullText: string;
      wordCount: number;
      sections: Array<{ name: string; wordCount: number; keyPoints: string[] }>;
      readingGuide: {
        priority: string;
        sections: Array<{ name: string; page: string; keyMessage: string; readingTime: string }>;
        totalReadingTime: string;
      };
      summary: string;
    }
  ): Promise<FinalDocument> {
    const final = await createFinalDocument(projectId, input);
    await updateProjectStatus(projectId, "completed");
    return final;
  }

  /**
   * 获取项目当前状态
   */
  async getWorkflowState(projectId: string): Promise<WorkflowContext> {
    const project = await getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const [prd, rulePlan, draft, reviewResults, finalDocument] = await Promise.all([
      getPRD(projectId),
      getRulePlan(projectId),
      getDraft(projectId),
      getReviewResults(projectId),
      getFinalDocument(projectId),
    ]);

    return {
      projectId,
      currentStep: project.status as WorkflowStep,
      prd: prd ? {
        ...prd,
        researchObjectives: JSON.parse(prd.researchObjectives),
        expectedOutcomes: JSON.parse(prd.expectedOutcomes),
      } : undefined,
      rulePlan: rulePlan ? {
        ...rulePlan,
        absoluteRules: JSON.parse(rulePlan.absoluteRules),
        styleProfile: JSON.parse(rulePlan.styleProfile as string),
      } : undefined,
      draft: draft ? {
        ...draft,
        sections: JSON.parse(draft.sections as string),
      } : undefined,
      reviewResults: reviewResults.map(r => ({
        ...r,
        issues: JSON.parse(r.issues as string),
      })),
      finalDocument: finalDocument ? {
        ...finalDocument,
        sections: JSON.parse(finalDocument.sections as string),
        readingGuide: JSON.parse(finalDocument.readingGuide as string),
      } : undefined,
    };
  }
}

/**
 * 便捷函数：创建默认工作流引擎
 */
export function createWorkflowEngine(options?: WorkflowOptions): WorkflowEngine {
  return new WorkflowEngine(options);
}
