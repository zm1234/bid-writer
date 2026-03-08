/**
 * 规则规划器 Agent
 * 
 * 职责：规划标书的格式要求、行文风格，总结绝对不能违背的规则，并记录用户风格偏好
 */

import {
  RulePlan,
  RulePlanSchema,
  AbsoluteRule,
  StyleProfile,
  AgentType,
  generateId,
  now,
} from "@bid-writer/shared";
import { BaseAgent, AgentContext, AgentResult, AgentOptions } from "../base.js";

/**
 * 规则规划器输入
 */
export interface RulePlannerInput {
  /** 申报通知/指南文本 */
  guidelineText?: string;
  /** 用户风格偏好设置 */
  userPreferences?: Partial<UserStylePreferences>;
  /** 用户 ID（用于加载历史风格） */
  userId?: string;
  /** 是否加载历史风格 */
  loadHistory?: boolean;
}

/**
 * 用户风格偏好
 */
export interface UserStylePreferences {
  formality: number;
  academicDepth: number;
  verbosity: number;
  preferredPhrases: string[];
  avoidPhrases: string[];
}

/**
 * 规则规划器输出
 */
export interface RulePlannerResult {
  rulePlan: RulePlan;
  extractedRules: AbsoluteRule[];
  styleProfile: StyleProfile;
  questions: string[];
}

/**
 * 规则规划器 Agent
 */
export class RulePlannerAgent extends BaseAgent<RulePlannerInput, RulePlannerResult> {
  readonly type: AgentType = "rule_planner";
  readonly displayName = "规则规划器 Agent";

  private extractedRules: AbsoluteRule[] = [];
  private styleProfile: StyleProfile = this.getDefaultStyleProfile();
  private pendingQuestions: string[] = [];
  private userHistory: Partial<UserStylePreferences> | null = null;

  constructor(options?: AgentOptions) {
    super(options);
  }

  /**
   * 获取默认风格配置
   */
  private getDefaultStyleProfile(): StyleProfile {
    return {
      formality: 8,
      academicDepth: 7,
      verbosity: 5,
      preferredPhrases: ["本研究", "结果表明", "未见明显", "具有统计学意义"],
      avoidPhrases: ["显然", "毫无疑问", "绝对", "肯定"],
    };
  }

  /**
   * 执行规则规划流程
   */
  async run(input: RulePlannerInput, context: AgentContext): Promise<AgentResult<RulePlannerResult>> {
    try {
      this.updateState({
        projectId: context.projectId,
        status: "running",
        currentStep: "extracting_rules",
      });

      this.log("开始分析申报指南...");

      // 步骤 1: 从指南中提取绝对规则
      if (input.guidelineText) {
        this.extractedRules = await this.extractRules(input.guidelineText);
      }

      // 步骤 2: 加载或创建风格档案
      if (input.loadHistory && input.userId) {
        this.userHistory = await this.loadUserHistory(input.userId);
      }

      // 步骤 3: 合并用户偏好
      this.styleProfile = this.mergeStylePreferences(input.userPreferences);

      // 步骤 4: 识别需要用户确认的问题
      this.pendingQuestions = this.identifyQuestions(input);

      this.updateState({
        status: this.pendingQuestions.length > 0 ? "waiting_user" : "completed",
        currentStep: this.pendingQuestions.length > 0 ? "awaiting_confirmation" : "completed",
        metadata: {
          rulesCount: this.extractedRules.length,
          pendingQuestions: this.pendingQuestions,
        },
      });

      // 生成规则计划
      const rulePlan = this.generateRulePlan(context.projectId);

      if (this.pendingQuestions.length > 0) {
        return {
          success: true,
          data: {
            rulePlan,
            extractedRules: this.extractedRules,
            styleProfile: this.styleProfile,
            questions: this.pendingQuestions,
          },
          requiresUserInput: true,
          userQuestion: this.formatQuestionsForUser(),
        };
      }

      return {
        success: true,
        data: {
          rulePlan,
          extractedRules: this.extractedRules,
          styleProfile: this.styleProfile,
          questions: [],
        },
      };
    } catch (error) {
      this.updateState({ status: "error" });
      return {
        success: false,
        error: error instanceof Error ? error.message : "规则规划失败",
      };
    }
  }

  /**
   * 处理用户输入
   */
  async handleUserInput(input: string, context: AgentContext): Promise<AgentResult<RulePlannerResult>> {
    try {
      this.updateState({
        status: "running",
        currentStep: "processing_user_input",
      });

      // 解析用户输入，更新风格偏好
      this.updateStyleFromInput(input);

      // 重新生成规则计划
      const rulePlan = this.generateRulePlan(context.projectId);

      // 检查是否还有未确认的问题
      this.pendingQuestions = []; // 假设用户回答了所有问题

      this.updateState({ status: "completed", currentStep: "completed" });

      return {
        success: true,
        data: {
          rulePlan,
          extractedRules: this.extractedRules,
          styleProfile: this.styleProfile,
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
   * 从指南文本中提取规则
   */
  private async extractRules(guidelineText: string): Promise<AbsoluteRule[]> {
    const rules: AbsoluteRule[] = [];
    const timestamp = now();

    // 关键词匹配规则类型
    const rulePatterns: Array<{ pattern: RegExp; type: AbsoluteRule["type"] }> = [
      { pattern: /字数 [限制在至]?\s*(\d+)/, type: "format" },
      { pattern: /(?:不得 | 必须 | 应当 | 严禁)\s*(.+)/, type: "content" },
      { pattern: /(?:格式 | 字体 | 行距|字号)/, type: "format" },
      { pattern: /(?:截止 | 提交 | 申报)\s*时间/, type: "deadline" },
      { pattern: /(?:附件 | 材料)\s*(?:数量 | 大小)/, type: "format" },
      { pattern: /(?:伦理 | 审查 | 委员会)/, type: "content" },
    ];

    const lines = guidelineText.split("\n").filter(line => line.trim().length > 0);

    for (const line of lines) {
      for (const { pattern, type } of rulePatterns) {
        if (pattern.test(line)) {
          rules.push({
            id: generateId("rule"),
            type,
            description: line.trim(),
            source: "guideline",
            mandatory: true,
          });
          break;
        }
      }
    }

    // 如果没有提取到规则，添加默认规则
    if (rules.length === 0) {
      rules.push(
        {
          id: generateId("rule"),
          type: "format",
          description: "标书正文需符合标准学术格式",
          mandatory: true,
        },
        {
          id: generateId("rule"),
          type: "content",
          description: "内容需真实、准确、完整",
          mandatory: true,
        }
      );
    }

    return rules;
  }

  /**
   * 加载用户历史风格
   */
  private async loadUserHistory(userId: string): Promise<Partial<UserStylePreferences> | null> {
    // 这里应该从数据库加载
    // 暂时返回 null，使用默认值
    this.log(`Loading style history for user: ${userId}`);
    return null;
  }

  /**
   * 合并风格偏好
   */
  private mergeStylePreferences(userPrefs?: Partial<UserStylePreferences>): StyleProfile {
    const base = this.getDefaultStyleProfile();

    if (this.userHistory) {
      return {
        ...base,
        ...this.userHistory,
        ...userPrefs,
      };
    }

    return {
      ...base,
      ...userPrefs,
    };
  }

  /**
   * 从用户输入更新风格
   */
  private updateStyleFromInput(input: string): void {
    // 解析用户对风格问题的回答
    const formalityMatch = input.match(/正式 [度程度]?[:：]?\s*(\d+)/);
    if (formalityMatch) {
      this.styleProfile.formality = Math.min(10, Math.max(1, parseInt(formalityMatch[1])));
    }

    const depthMatch = input.match(/学术 [性深度]?[:：]?\s*(\d+)/);
    if (depthMatch) {
      this.styleProfile.academicDepth = Math.min(10, Math.max(1, parseInt(depthMatch[1])));
    }

    // 提取偏好短语
    const preferMatch = input.match(/(?:常用 | 喜欢|偏好)[的]?(?:表达 | 词汇|短语)[:：]?\s*(.+)/);
    if (preferMatch) {
      const phrases = preferMatch[1].split(/[,,]/).map(p => p.trim()).filter(p => p.length > 0);
      this.styleProfile.preferredPhrases = [...new Set([...this.styleProfile.preferredPhrases, ...phrases])];
    }

    // 提取避免短语
    const avoidMatch = input.match(/(?:避免 | 不用 | 拒绝)[的]?(?:表达 | 词汇 | 短语)[:：]?\s*(.+)/);
    if (avoidMatch) {
      const phrases = avoidMatch[1].split(/[,,]/).map(p => p.trim()).filter(p => p.length > 0);
      this.styleProfile.avoidPhrases = [...new Set([...this.styleProfile.avoidPhrases, ...phrases])];
    }
  }

  /**
   * 识别需要用户确认的问题
   */
  private identifyQuestions(input: RulePlannerInput): string[] {
    const questions: string[] = [];

    if (!input.userPreferences) {
      questions.push("请设置您期望的写作风格：正式程度（1-10）、学术深度（1-10）、详细程度（1-10）");
    }

    if (!this.styleProfile.preferredPhrases || this.styleProfile.preferredPhrases.length === 0) {
      questions.push("您是否有常用的学术表达方式或偏好词汇？（可留空）");
    }

    if (!this.styleProfile.avoidPhrases || this.styleProfile.avoidPhrases.length === 0) {
      questions.push("您是否有明确不想使用的词汇或表达？（可留空）");
    }

    return questions;
  }

  /**
   * 格式化问题供用户查看
   */
  private formatQuestionsForUser(): string {
    const currentRules = this.extractedRules.length;
    
    return [
      "规则规划配置",
      "================",
      "",
      `已从指南中提取 ${currentRules} 条规则:`,
      ...this.extractedRules.slice(0, 5).map(r => `  - [${r.type}] ${r.description}`),
      ...(this.extractedRules.length > 5 ? [`  ... 还有 ${this.extractedRules.length - 5} 条`] : []),
      "",
      "当前风格配置:",
      `  - 正式程度：${this.styleProfile.formality}/10`,
      `  - 学术深度：${this.styleProfile.academicDepth}/10`,
      `  - 详细程度：${this.styleProfile.verbosity}/10`,
      "",
      ...this.pendingQuestions.map((q, i) => `${i + 1}. ${q}`),
    ].join("\n");
  }

  /**
   * 生成规则计划
   */
  private generateRulePlan(projectId: string): RulePlan {
    const timestamp = now();

    return {
      projectId,
      absoluteRules: this.extractedRules,
      styleProfile: this.styleProfile,
      writingGuidelines: this.generateWritingGuidelines(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  /**
   * 生成写作指引
   */
  private generateWritingGuidelines(): string {
    const guidelines: string[] = [];

    guidelines.push(`正式程度：${this.styleProfile.formality}/10 - ${
      this.styleProfile.formality >= 8 ? "高度正式，使用规范学术语言" :
      this.styleProfile.formality >= 5 ? "中等正式，平衡专业性和可读性" :
      "相对轻松，注重表达清晰"
    }`);

    guidelines.push(`学术深度：${this.styleProfile.academicDepth}/10 - ${
      this.styleProfile.academicDepth >= 8 ? "深入学术讨论，大量引用文献" :
      this.styleProfile.academicDepth >= 5 ? "适度学术化，关键论点有支撑" :
      "简明扼要，重点突出"
    }`);

    if (this.styleProfile.preferredPhrases.length > 0) {
      guidelines.push(`推荐使用表达：${this.styleProfile.preferredPhrases.slice(0, 5).join("、")}`);
    }

    if (this.styleProfile.avoidPhrases.length > 0) {
      guidelines.push(`避免使用表达：${this.styleProfile.avoidPhrases.slice(0, 5).join("、")}`);
    }

    return guidelines.join("\n");
  }
}
