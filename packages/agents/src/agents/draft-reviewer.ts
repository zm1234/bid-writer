/**
 * 初稿审核 Agent
 * 负责审核标书初稿，包括错别字、病句、格式、风格匹配度
 */

import { BaseAgent, AgentResult, AgentContext } from "../base";
import { ReviewResult, ReviewResultSchema, Issue } from "@bid-writer/shared";

export interface DraftReviewerInput {
  draftContent: string;
  rules?: {
    absoluteRules: Array<{ type: string; description: string }>;
    styleProfile?: {
      formality: number;
      academicDepth: number;
      verbosity: number;
      preferredPhrases: string[];
      avoidPhrases: string[];
    };
  };
  round: number;
}

export interface DraftReviewerOutput {
  reviewResult: ReviewResult;
  nextAction: "approve" | "revise" | "max_rounds";
}

export class DraftReviewerAgent extends BaseAgent<DraftReviewerInput, DraftReviewerOutput> {
  readonly type = "draft_reviewer" as const;
  readonly displayName = "Draft Reviewer";

  async run(input: DraftReviewerInput, context: AgentContext): Promise<AgentResult<DraftReviewerOutput>> {
    this.log(`Starting review for project ${context.projectId}, round ${input.round}`);

    const issues: Issue[] = [];

    // 1. 错别字检查
    const typoIssues = this.checkTypos(input.draftContent);
    issues.push(...typoIssues);

    // 2. 病句检查
    const grammarIssues = this.checkGrammar(input.draftContent);
    issues.push(...grammarIssues);

    // 3. 格式检查
    const formatIssues = this.checkFormat(input.draftContent, input.rules?.absoluteRules || []);
    issues.push(...formatIssues);

    // 4. 风格匹配检查
    const styleIssues = this.checkStyle(input.draftContent, input.rules?.styleProfile);
    issues.push(...styleIssues);

    // 5. 完整性检查
    const completenessIssues = this.checkCompleteness(input.draftContent);
    issues.push(...completenessIssues);

    // 判断是否通过
    const hasErrors = issues.some(i => i.severity === "error");
    const approved = !hasErrors;

    const reviewResult: ReviewResult = {
      projectId: context.projectId,
      round: input.round,
      status: approved ? "approved" : "needs_revision",
      issues,
      summary: this.generateSummary(issues),
      approved,
      createdAt: new Date().toISOString(),
    };

    this.log(`Review completed: ${approved ? "approved" : "needs_revision"}`);

    return {
      success: true,
      data: {
        reviewResult,
        nextAction: approved ? "approve" : (input.round >= 5 ? "max_rounds" : "revise"),
      },
    };
  }

  /**
   * 错别字检查
   */
  private checkTypos(content: string): Issue[] {
    const issues: Issue[] = [];
    
    // 常见错别字模式（简化示例）
    const commonTypos = [
      { pattern: /反应/g, replacement: "反映", note: "可能是错别字" },
      { pattern: /，象/g, replacement: "像", note: "象/像 混淆" },
      { pattern: /的发/g, replacement: "的", note: "可能是多余字" },
    ];

    commonTypos.forEach(({ pattern, replacement, note }) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          id: `typo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "typo",
          location: "全文",
          content: pattern.source,
          suggestion: `建议改为: ${replacement}`,
          severity: "warning",
        });
      }
    });

    return issues;
  }

  /**
   * 病句检查
   */
  private checkGrammar(content: string): Issue[] {
    const issues: Issue[] = [];
    
    // 检查重复词
    const repeatedWords = content.match(/(.{2,})\1{2,}/g);
    if (repeatedWords) {
      issues.push({
        id: `grammar-repeated-${Date.now()}`,
        type: "grammar",
        location: "全文",
        content: repeatedWords[0],
        suggestion: "检测到重复词",
        severity: "warning",
      });
    }

    return issues;
  }

  /**
   * 格式检查
   */
  private checkFormat(
    content: string,
    rules: Array<{ type: string; description: string }>
  ): Issue[] {
    const issues: Issue[] = [];
    
    // 检查字数限制
    const wordCount = content.length;
    const wordLimitRule = rules.find(r => r.description.includes("字") && r.description.includes("限制"));
    
    if (wordLimitRule) {
      const limitMatch = wordLimitRule.description.match(/(\d+)/);
      if (limitMatch) {
        const limit = parseInt(limitMatch[1]);
        if (wordCount > limit) {
          issues.push({
            id: `format-wordcount-${Date.now()}`,
            type: "format",
            location: "全文",
            content: `当前字数: ${wordCount}`,
            suggestion: `应控制在 ${limit} 字以内`,
            severity: "error",
          });
        }
      }
    }

    // 检查必要章节
    const requiredSections = ["研究背景", "研究目标", "研究方法", "预期成果"];
    requiredSections.forEach(section => {
      if (!content.includes(section)) {
        issues.push({
          id: `format-section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "completeness",
          location: "章节结构",
          content: `缺少 "${section}" 章节`,
          suggestion: `请添加 "${section}" 章节`,
          severity: "error",
        });
      }
    });

    return issues;
  }

  /**
   * 风格检查
   */
  private checkStyle(
    content: string,
    styleProfile?: DraftReviewerInput["rules"]["styleProfile"]
  ): Issue[] {
    const issues: Issue[] = [];
    
    if (!styleProfile) return issues;

    // 检查拒用词汇
    if (styleProfile.avoidPhrases) {
      styleProfile.avoidPhrases.forEach(phrase => {
        if (content.includes(phrase)) {
          issues.push({
            id: `style-avoid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: "style",
            location: "全文",
            content: `使用了用户要求避免的词汇: "${phrase}"`,
            suggestion: "请替换为其他表达",
            severity: "warning",
          });
        }
      });
    }

    // 检查正式程度
    if (styleProfile.formality && styleProfile.formality >= 8) {
      const informalPatterns = [/我觉得/g, /太棒了/g, /简直了/g];
      informalPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          issues.push({
            id: `style-formality-${Date.now()}`,
            type: "style",
            location: "全文",
            content: "使用了非正式表达",
            suggestion: "建议使用更学术化的表达",
            severity: "warning",
          });
        }
      });
    }

    return issues;
  }

  /**
   * 完整性检查
   */
  private checkCompleteness(content: string): Issue[] {
    const issues: Issue[] = [];
    
    // 检查摘要长度
    const abstractMatch = content.match(/#?摘要[:\n](.{10,500})/);
    if (!abstractMatch || abstractMatch[1].length < 100) {
      issues.push({
        id: `complete-abstract-${Date.now()}`,
        type: "completeness",
        location: "项目摘要",
        content: "摘要内容不足",
        suggestion: "摘要应包含研究问题、方法、预期成果",
        severity: "warning",
      });
    }

    return issues;
  }

  /**
   * 生成审核总结
   */
  private generateSummary(issues: Issue[]): string {
    const errorCount = issues.filter(i => i.severity === "error").length;
    const warningCount = issues.filter(i => i.severity === "warning").length;
    const suggestionCount = issues.filter(i => i.severity === "suggestion").length;

    if (errorCount === 0 && warningCount === 0) {
      return "审核通过，无问题";
    }

    return `发现 ${errorCount} 个错误，${warningCount} 个警告，${suggestionCount} 个建议。需要修改后重新审核。`;
  }
}
