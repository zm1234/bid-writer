/**
 * 格式校验 Agent
 * 检查初稿是否匹配模板章节结构
 */

import { BaseAgent, AgentResult, AgentContext } from "../base";

export interface FormatValidatorInput {
  draftContent: string;
  templateSections?: string[];  // 模板章节列表
  maxWordCount?: number;       // 最大字数限制
  requiredSections?: string[];  // 必填章节
}

export interface FormatValidatorOutput {
  passed: boolean;
  issues: Array<{
    type: "missing_section" | "word_count" | "format" | "length";
    location?: string;
    message: string;
    severity: "error" | "warning";
  }>;
  stats: {
    totalSections: number;
    matchedSections: number;
    wordCount: number;
  };
}

export class FormatValidatorAgent extends BaseAgent<FormatValidatorInput, FormatValidatorOutput> {
  readonly type = "format_validator" as const;
  readonly displayName = "Format Validator";

  async run(input: FormatValidatorInput, context: AgentContext): Promise<AgentResult<FormatValidatorOutput>> {
    this.log(`Starting format validation for project ${context.projectId}`);

    const issues: FormatValidatorOutput["issues"] = [];
    
    // 1. 解析初稿章节
    const draftSections = this.parseSections(input.draftContent);
    
    // 2. 检查必填章节
    if (input.requiredSections) {
      const missingSections = input.requiredSections.filter(
        req => !draftSections.some(d => d.title.includes(req) || req.includes(d.title))
      );
      
      for (const section of missingSections) {
        issues.push({
          type: "missing_section",
          message: `缺少必填章节: ${section}`,
          severity: "error",
        });
      }
    }
    
    // 3. 检查模板章节匹配
    let matchedSections = 0;
    if (input.templateSections) {
      for (const templateSection of input.templateSections) {
        if (draftSections.some(d => d.title.includes(templateSection) || templateSection.includes(d.title))) {
          matchedSections++;
        }
      }
    }
    
    // 4. 检查字数
    const wordCount = this.countWords(input.draftContent);
    if (input.maxWordCount && wordCount > input.maxWordCount) {
      issues.push({
        type: "word_count",
        message: `字数超过限制: ${wordCount} > ${input.maxWordCount}`,
        severity: "error",
      });
    }
    
    // 5. 检查章节长度
    for (const section of draftSections) {
      if (section.wordCount < 100) {
        issues.push({
          type: "length",
          location: section.title,
          message: `章节内容过少: ${section.title} (${section.wordCount}字)`,
          severity: "warning",
        });
      }
    }

    const passed = !issues.some(i => i.severity === "error");

    this.log(`Format validation completed: ${passed ? "passed" : "failed"}`);

    return {
      success: true,
      data: {
        passed,
        issues,
        stats: {
          totalSections: input.templateSections?.length || draftSections.length,
          matchedSections,
          wordCount,
        },
      },
    };
  }

  /**
   * 解析章节
   */
  private parseSections(content: string): Array<{ title: string; content: string; wordCount: number }> {
    const sections: Array<{ title: string; content: string; wordCount: number }> = [];
    
    // 按标题分割
    const parts = content.split(/(?:^|\n)(?:#+\s+|\d+\.)\s*/);
    
    for (let i = 1; i < parts.length; i += 2) {
      const title = parts[i]?.trim() || "";
      const sectionContent = parts[i + 1]?.trim() || "";
      if (title || sectionContent) {
        sections.push({
          title,
          content: sectionContent,
          wordCount: this.countWords(sectionContent),
        });
      }
    }

    return sections;
  }

  /**
   * 统计字数
   */
  private countWords(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }
}
