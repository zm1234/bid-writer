/**
 * 终稿确认 Agent
 * 负责整理终稿，生成阅读指南
 */

import { BaseAgent, AgentResult, AgentContext } from "../base";
import { FinalDocument, SectionSummary, ReadingGuide } from "@bid-writer/shared";

export interface FinalConfirmerInput {
  approvedDraft: string;
  prd: {
    title: string;
    researchObjectives: string[];
    expectedOutcomes: string[];
  };
  reviewHistory: Array<{
    round: number;
    status: string;
    issues: Array<{ type: string; description: string }>;
  }>;
}

export interface FinalConfirmerOutput {
  finalDocument: FinalDocument;
  readingGuide: ReadingGuide;
}

export class FinalConfirmerAgent extends BaseAgent<FinalConfirmerInput, FinalConfirmerOutput> {
  readonly type = "final_confirmer" as const;
  readonly displayName = "Final Confirmer";

  async run(input: FinalConfirmerInput, context: AgentContext): Promise<AgentResult<FinalConfirmerOutput>> {
    this.log(`Starting final confirmation for project ${context.projectId}`);

    // 1. 整理终稿
    const finalDocument = this.organizeFinalDocument(input, context.projectId);

    // 2. 生成阅读指南
    const readingGuide = this.generateReadingGuide(input.approvedDraft, finalDocument);

    // 3. 添加总结
    const summary = this.generateSummary(input, finalDocument);

    const fullFinalDocument: FinalDocument = {
      ...finalDocument,
      summary,
      readingGuide,
    };

    this.log(`Final document created: ${finalDocument.wordCount} words`);

    return {
      success: true,
      data: {
        finalDocument: fullFinalDocument,
        readingGuide,
      },
    };
  }

  /**
   * 整理终稿
   */
  private organizeFinalDocument(input: FinalConfirmerInput, projectId: string): Omit<FinalDocument, "summary" | "readingGuide"> {
    // 解析章节
    const sections = this.parseSections(input.approvedDraft);
    
    // 计算总字数
    const fullText = input.approvedDraft;
    const wordCount = this.countWords(fullText);

    return {
      projectId,
      title: input.prd.title,
      fullText,
      wordCount,
      sections: sections.map((s, idx) => ({
        name: s.title || `第${idx + 1}节`,
        wordCount: this.countWords(s.content),
        keyPoints: this.extractKeyPoints(s.content),
      })),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 解析章节
   */
  private parseSections(content: string): Array<{ title: string; content: string }> {
    const sections: Array<{ title: string; content: string }> = [];
    
    // 按标题分割（支持 # 标题和数字标题）
    const parts = content.split(/(?:^|\n)(?:#+\s+|\d+\.)\s*/);
    
    for (let i = 1; i < parts.length; i += 2) {
      const title = parts[i].trim();
      const content = parts[i + 1]?.trim() || "";
      if (title || content) {
        sections.push({ title, content });
      }
    }

    // 如果没有找到章节结构，把整个内容作为一节
    if (sections.length === 0) {
      sections.push({ title: "全文", content });
    }

    return sections;
  }

  /**
   * 统计字数（中文+英文）
   */
  private countWords(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }

  /**
   * 提取关键点
   */
  private extractKeyPoints(content: string): string[] {
    const keyPoints: string[] = [];
    
    // 提取包含以下关键词的句子
    const keywords = ["创新", "首次", "关键", "核心", "目标", "预期", "方法", "结果"];
    
    const sentences = content.split(/[。！？\n]/);
    
    sentences.forEach(sentence => {
      if (keywords.some(kw => sentence.includes(kw)) && sentence.length > 10 && sentence.length < 200) {
        keyPoints.push(sentence.trim());
      }
    });

    // 限制关键点数量
    return keyPoints.slice(0, 5);
  }

  /**
   * 生成阅读指南
   */
  private generateReadingGuide(draft: string, document: Omit<FinalDocument, "summary" | "readingGuide">): ReadingGuide {
    const guideSections: ReadingGuide["sections"] = [];
    
    // 识别重点章节
    const priorityKeywords = {
      high: ["创新", "目标", "技术路线", "方法"],
      medium: ["背景", "基础", "条件", "成果"],
      low: ["预算", "进度", "计划"],
    };

    document.sections.forEach((section, idx) => {
      const content = section.name + section.keyPoints.join(" ");
      let priority: "high" | "medium" | "low" = "medium";

      if (priorityKeywords.high.some(kw => content.includes(kw))) {
        priority = "high";
      } else if (priorityKeywords.low.some(kw => content.includes(kw))) {
        priority = "low";
      }

      guideSections.push({
        name: section.name,
        page: `第${idx + 1}节`,
        keyMessage: section.keyPoints[0] || "请阅读本节内容",
        readingTime: Math.ceil(section.wordCount / 500) + "分钟",
      });
    });

    // 计算总阅读时间
    const totalMinutes = document.sections.reduce((sum, s) => sum + Math.ceil(s.wordCount / 500), 0);

    return {
      priority: "high",
      sections: guideSections.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      totalReadingTime: `约${totalMinutes}分钟`,
    };
  }

  /**
   * 生成总结
   */
  private generateSummary(input: FinalConfirmerInput, document: Omit<FinalDocument, "summary" | "readingGuide">): string {
    const reviewRounds = input.reviewHistory.length;
    const issuesFixed = input.reviewHistory.reduce((sum, r) => sum + r.issues.length, 0);

    return `本标书已完稿，共${document.wordCount}字，包含${document.sections.length}个章节。` +
      `经过${reviewRounds}轮审核，修复了${issuesFixed}个问题。` +
      `研究目标：${input.prd.researchObjectives.join("、")}。` +
      `预期成果：${input.prd.expectedOutcomes.join("、")}。`;
  }
}
