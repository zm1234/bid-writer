/**
 * PRD 确认 Agent
 * 
 * 职责：理解标书主题、项目背景、研究目标，输出标准化的项目定义文档（PRD）
 */

import {
  PRD,
  PRDSchema,
  AgentType,
  generateProjectId,
  now,
  generateSummary,
} from "@bid-writer/shared";
import { BaseAgent, AgentContext, AgentResult, AgentOptions } from "../base.js";

/**
 * PRD 输入材料
 */
export interface PRDInput {
  /** 背景材料文本 */
  backgroundMaterials?: string;
  /** 参考文献列表 */
  references?: string[];
  /** 用户口头描述的需求 */
  userDescription?: string;
  /** 项目标题（可选，如不提供则自动生成） */
  title?: string;
}

/**
 * PRD 确认结果
 */
export interface PRDResult {
  prd: PRD;
  confidence: number;
  questions: string[];
}

/**
 * PRD 确认 Agent
 */
export class PRDConfirmAgent extends BaseAgent<PRDInput, PRDResult> {
  readonly type: AgentType = "prd_confirm";
  readonly displayName = "PRD 确认 Agent";

  private extractedInfo: Partial<PRD> = {};
  private pendingQuestions: string[] = [];

  constructor(options?: AgentOptions) {
    super(options);
  }

  /**
   * 执行 PRD 确认流程
   */
  async run(input: PRDInput, context: AgentContext): Promise<AgentResult<PRDResult>> {
    try {
      this.updateState({
        projectId: context.projectId,
        status: "running",
        currentStep: "analyzing_materials",
      });

      this.log("开始分析背景材料...");

      // 步骤 1: 分析输入材料，提取关键信息
      await this.analyzeMaterials(input);

      // 步骤 2: 生成 PRD 草稿
      const prdDraft = this.generatePRDDraft(input);

      // 步骤 3: 识别需要用户确认的问题
      this.pendingQuestions = this.identifyQuestions(prdDraft, input);

      this.updateState({
        status: this.pendingQuestions.length > 0 ? "waiting_user" : "completed",
        currentStep: this.pendingQuestions.length > 0 ? "awaiting_confirmation" : "completed",
        metadata: {
          pendingQuestions: this.pendingQuestions,
        },
      });

      // 如果需要用户确认，返回问题列表
      if (this.pendingQuestions.length > 0) {
        return {
          success: true,
          data: {
            prd: prdDraft,
            confidence: 0.7,
            questions: this.pendingQuestions,
          },
          requiresUserInput: true,
          userQuestion: this.formatQuestionsForUser(this.pendingQuestions),
        };
      }

      // 否则直接返回确认的 PRD
      return {
        success: true,
        data: {
          prd: prdDraft,
          confidence: 0.9,
          questions: [],
        },
      };
    } catch (error) {
      this.updateState({ status: "error" });
      return {
        success: false,
        error: error instanceof Error ? error.message : "PRD 确认失败",
      };
    }
  }

  /**
   * 处理用户输入（回答问题）
   */
  async handleUserInput(input: string, context: AgentContext): Promise<AgentResult<PRDResult>> {
    try {
      this.updateState({
        status: "running",
        currentStep: "processing_user_input",
      });

      this.log("处理用户输入...");

      // 将用户输入整合到提取的信息中
      await this.integrateUserInput(input);

      // 重新生成 PRD
      const prd = this.generatePRDDraft({});

      // 检查是否还有未确认的问题
      const remainingQuestions = this.pendingQuestions.filter((_, index) => {
        // 简单策略：假设用户按顺序回答问题
        return index >= 1; // 实际应该更智能地匹配问题和答案
      });

      this.pendingQuestions = remainingQuestions;

      if (this.pendingQuestions.length > 0) {
        return {
          success: true,
          data: {
            prd,
            confidence: 0.8,
            questions: this.pendingQuestions,
          },
          requiresUserInput: true,
          userQuestion: this.formatQuestionsForUser(this.pendingQuestions),
        };
      }

      this.updateState({ status: "completed", currentStep: "completed" });

      return {
        success: true,
        data: {
          prd,
          confidence: 0.95,
          questions: [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "处理用户输入失败",
      };
    }
  }

  /**
   * 分析输入材料
   */
  private async analyzeMaterials(input: PRDInput): Promise<void> {
    const { backgroundMaterials, references, userDescription } = input;

    // 提取研究问题
    if (backgroundMaterials) {
      this.extractedInfo.background = this.extractBackground(backgroundMaterials);
      this.extractedInfo.researchProblem = this.extractResearchProblem(backgroundMaterials);
    }

    // 从用户描述中提取目标
    if (userDescription) {
      this.extractedInfo.researchObjectives = this.extractObjectives(userDescription);
      this.extractedInfo.expectedOutcomes = this.extractOutcomes(userDescription);
    }

    // 提取时间和预算信息
    this.extractedInfo.timeline = this.extractTimeline(input);
    this.extractedInfo.budget = this.extractBudget(input);
  }

  /**
   * 从背景材料中提取项目背景
   */
  private extractBackground(materials: string): string {
    // 简化的提取逻辑，实际应该调用 LLM
    const sentences = materials.split(/[。！？.!?]/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).join("。") + "。";
  }

  /**
   * 提取核心研究问题
   */
  private extractResearchProblem(materials: string): string {
    // 查找包含"问题"、"挑战"、"难点"等关键词的句子
    const keywords = ["问题", "挑战", "难点", "困难", "瓶颈", "不足"];
    const sentences = materials.split(/[。！？.!?]/);
    
    for (const sentence of sentences) {
      if (keywords.some(kw => sentence.includes(kw))) {
        return sentence.trim() + "。";
      }
    }
    
    return "有待进一步明确核心研究问题。";
  }

  /**
   * 提取研究目标
   */
  private extractObjectives(description: string): string[] {
    // 查找包含"目标"、"目的"、"旨在"等关键词的句子
    const patterns = [/目标 [是：:]/, /旨在/, /目的是/, /欲解决/];
    const sentences = description.split(/[。！？.!?]/);
    const objectives: string[] = [];

    for (const sentence of sentences) {
      if (patterns.some(p => p.test(sentence))) {
        objectives.push(sentence.trim());
      }
    }

    if (objectives.length === 0) {
      objectives.push("明确研究目标待用户确认");
    }

    return objectives.slice(0, 5);
  }

  /**
   * 提取预期成果
   */
  private extractOutcomes(description: string): string[] = {
    return ["发表高水平论文 1-2 篇", "培养研究生 1-2 名", "形成技术方案或原型系统"];
  }

  /**
   * 提取时间线
   */
  private extractTimeline(input: PRDInput): string {
    // 尝试从输入中提取时间信息
    const text = `${input.backgroundMaterials || ""} ${input.userDescription || ""}`;
    const yearMatch = text.match(/(\d{4}) 年/);
    if (yearMatch) {
      return `${yearMatch[1]}年度项目`;
    }
    return "项目周期待定";
  }

  /**
   * 提取预算信息
   */
  private extractBudget(input: PRDInput): string | undefined {
    const text = `${input.backgroundMaterials || ""} ${input.userDescription || ""}`;
    const budgetMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:万|万元)/);
    if (budgetMatch) {
      return `${budgetMatch[1]}万元`;
    }
    return undefined;
  }

  /**
   * 生成 PRD 草稿
   */
  private generatePRDDraft(input: PRDInput): PRD {
    const projectId = generateProjectId();
    const timestamp = now();

    return {
      projectId,
      title: input.title || this.extractedInfo.researchProblem?.slice(0, 30) + "研究" || "新标书项目",
      background: this.extractedInfo.background || "背景信息待补充",
      researchProblem: this.extractedInfo.researchProblem || "研究问题待确认",
      researchObjectives: this.extractedInfo.researchObjectives || ["目标待确认"],
      expectedOutcomes: this.extractedInfo.expectedOutcomes || ["成果待确认"],
      timeline: this.extractedInfo.timeline || "时间待定",
      budget: this.extractedInfo.budget,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  /**
   * 识别需要用户确认的问题
   */
  private identifyQuestions(prd: PRD, input: PRDInput): string[] {
    const questions: string[] = [];

    if (!input.title) {
      questions.push(`项目标题暂定为"${prd.title}"，是否合适？如有其他建议请告知。`);
    }

    if (prd.researchProblem.includes("待确认")) {
      questions.push("请用一句话描述本研究要解决的核心问题是什么？");
    }

    if (prd.researchObjectives.some(o => o.includes("待确认"))) {
      questions.push("本研究的主要目标有哪些？请列出 3-5 个具体目标。");
    }

    if (!prd.budget) {
      questions.push("项目预算范围是多少？（如：50 万元）");
    }

    return questions;
  }

  /**
   * 格式化问题供用户查看
   */
  private formatQuestionsForUser(questions: string[]): string {
    return [
      "为了完善项目定义，请确认以下信息：",
      "",
      ...questions.map((q, i) => `${i + 1}. ${q}`),
      "",
      "请逐一回答以上问题，或直接提供补充信息。",
    ].join("\n");
  }

  /**
   * 整合用户输入
   */
  private async integrateUserInput(input: string): Promise<void> {
    // 简单的关键词匹配来更新信息
    // 实际应该用更智能的方式解析用户回答

    // 检查是否包含预算信息
    const budgetMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:万|万元)/);
    if (budgetMatch) {
      this.extractedInfo.budget = `${budgetMatch[1]}万元`;
    }

    // 检查是否包含时间信息
    const yearMatch = input.match(/(\d{4}) 年/);
    if (yearMatch) {
      this.extractedInfo.timeline = `${yearMatch[1]}年度项目`;
    }

    // 检查是否包含标题
    if (input.includes("标题") || input.includes("题目")) {
      const titleMatch = input.match(/(?:标题 | 题目) [是：:为]?["']?(.+?)["']?$/);
      if (titleMatch) {
        this.extractedInfo.researchProblem = titleMatch[1].trim();
      }
    }
  }
}
