/**
 * 初稿撰写 Agent
 * 
 * 职责：根据 PRD 和规则集，生成标书初稿
 */

import {
  Draft,
  DraftSchema,
  Section,
  SectionType,
  PRD,
  RulePlan,
  AgentType,
  generateId,
  now,
  countChineseWords,
  SECTION_TYPE_LABELS,
} from "@bid-writer/shared";
import { BaseAgent, AgentContext, AgentResult, AgentOptions } from "../base.js";

/**
 * 初稿撰写输入
 */
export interface DraftWriterInput {
  /** 项目定义 (PRD) */
  prd: PRD;
  /** 规则计划 */
  rulePlan: RulePlan;
  /** 参考材料 */
  referenceMaterials?: string[];
  /** 需要特别强调的内容 */
  emphasis?: string[];
}

/**
 * 初稿撰写输出
 */
export interface DraftWriterResult {
  draft: Draft;
  wordCount: number;
  sections: string[];
  writingNotes: string;
}

/**
 * 章节生成配置
 */
interface SectionConfig {
  type: SectionType;
  title: string;
  prompt: string;
  targetWordCount: number;
  required: boolean;
}

/**
 * 初稿撰写 Agent
 */
export class DraftWriterAgent extends BaseAgent<DraftWriterInput, DraftWriterResult> {
  readonly type: AgentType = "draft_writer";
  readonly displayName = "初稿撰写 Agent";

  private currentSectionIndex = 0;
  private generatedSections: Section[] = [];

  // 各章节目标字数配置
  private readonly SECTION_CONFIGS: SectionConfig[] = [
    {
      type: "abstract",
      title: "项目摘要",
      prompt: "撰写项目摘要，概括研究背景、问题、目标、方法和预期成果",
      targetWordCount: 500,
      required: true,
    },
    {
      type: "background",
      title: "研究背景与意义",
      prompt: "阐述研究背景、国内外研究现状、研究意义和创新价值",
      targetWordCount: 1500,
      required: true,
    },
    {
      type: "objectives",
      title: "研究目标与内容",
      prompt: "明确研究目标、具体研究内容和关键科学问题",
      targetWordCount: 1200,
      required: true,
    },
    {
      type: "methods",
      title: "研究方法与技术路线",
      prompt: "详细描述研究方法、技术方案、实验设计和可行性分析",
      targetWordCount: 2000,
      required: true,
    },
    {
      type: "outcomes",
      title: "预期成果",
      prompt: "列出预期的研究成果、产出形式和考核指标",
      targetWordCount: 800,
      required: true,
    },
    {
      type: "foundation",
      title: "研究基础与条件",
      prompt: "介绍研究团队、前期工作基础、实验条件和保障措施",
      targetWordCount: 1000,
      required: true,
    },
    {
      type: "schedule",
      title: "进度安排",
      prompt: "制定详细的研究进度计划和时间节点",
      targetWordCount: 500,
      required: true,
    },
    {
      type: "budget",
      title: "经费预算",
      prompt: "编制经费预算说明，包括各项支出的依据和用途",
      targetWordCount: 500,
      required: false,
    },
  ];

  constructor(options?: AgentOptions) {
    super(options);
  }

  /**
   * 执行初稿撰写
   */
  async run(input: DraftWriterInput, context: AgentContext): Promise<AgentResult<DraftWriterResult>> {
    try {
      this.updateState({
        projectId: context.projectId,
        status: "running",
        currentStep: "preparing",
      });

      this.log("开始撰写标书初稿...");

      // 初始化章节列表
      this.generatedSections = [];
      this.currentSectionIndex = 0;

      // 逐个生成章节
      for (const config of this.SECTION_CONFIGS) {
        if (!config.required && input.prd.budget === undefined && config.type === "budget") {
          // 跳过预算章节（如果未提供预算信息）
          continue;
        }

        this.updateState({
          currentStep: `writing_${config.type}`,
          metadata: {
            currentSection: config.title,
            progress: `${this.generatedSections.length}/${this.SECTION_CONFIGS.length}`,
          },
        });

        this.log(`撰写章节：${config.title}`);

        const section = await this.generateSection(config, input);
        this.generatedSections.push(section);
      }

      // 组装草稿
      const draft = this.assembleDraft(input.prd);

      this.updateState({
        status: "completed",
        currentStep: "completed",
      });

      const totalWordCount = this.generatedSections.reduce((sum, s) => sum + s.wordCount, 0);

      return {
        success: true,
        data: {
          draft,
          wordCount: totalWordCount,
          sections: this.generatedSections.map(s => s.title),
          writingNotes: this.generateWritingNotes(),
        },
      };
    } catch (error) {
      this.updateState({ status: "error" });
      return {
        success: false,
        error: error instanceof Error ? error.message : "初稿撰写失败",
      };
    }
  }

  /**
   * 生成单个章节
   */
  private async generateSection(config: SectionConfig, input: DraftWriterInput): Promise<Section> {
    const { prd, rulePlan } = input;

    // 构建提示词
    const prompt = this.buildSectionPrompt(config, prd, rulePlan);

    // 生成内容（简化版本，实际应调用 LLM）
    const content = this.generateSectionContent(config, prd, rulePlan);

    return {
      id: generateId("section"),
      type: config.type,
      title: config.title,
      content,
      wordCount: countChineseWords(content),
      order: this.generatedSections.length,
      status: "draft",
    };
  }

  /**
   * 构建章节提示词
   */
  private buildSectionPrompt(config: SectionConfig, prd: PRD, rulePlan: RulePlan): string {
    const styleProfile = rulePlan.styleProfile;

    return `
# ${config.title}

## 项目信息
- 标题：${prd.title}
- 研究问题：${prd.researchProblem}
- 研究目标：${prd.researchObjectives.join("; ")}

## 写作要求
- 目标字数：${config.targetWordCount}字
- 正式程度：${styleProfile.formality}/10
- 学术深度：${styleProfile.academicDepth}/10

## 风格指南
${rulePlan.writingGuidelines}

## 绝对规则
${rulePlan.absoluteRules.map(r => `- ${r.description}`).join("\n")}

## 任务
${config.prompt}
`.trim();
  }

  /**
   * 生成章节内容（简化版本）
   */
  private generateSectionContent(config: SectionConfig, prd: PRD, rulePlan: RulePlan): string {
    // 这里是占位实现，实际应调用 LLM API
    // 返回结构化的占位内容

    switch (config.type) {
      case "abstract":
        return this.generateAbstract(prd);
      case "background":
        return this.generateBackground(prd, rulePlan);
      case "objectives":
        return this.generateObjectives(prd);
      case "methods":
        return this.generateMethods(prd, rulePlan);
      case "outcomes":
        return this.generateOutcomes(prd);
      case "foundation":
        return this.generateFoundation(prd);
      case "schedule":
        return this.generateSchedule(prd);
      case "budget":
        return this.generateBudget(prd);
      default:
        return `[${config.title} 内容待生成]`;
    }
  }

  private generateAbstract(prd: PRD): string {
    return `
本项目"${prd.title}"旨在解决${prd.researchProblem}

研究背景：${prd.background.substring(0, 100)}...

主要研究目标包括：
${prd.researchObjectives.map((o, i) => `(${i + 1}) ${o}`).join("；")}

预期成果：${prd.expectedOutcomes.slice(0, 2).join("；")}

项目计划于${prd.timeline}内完成，预算${prd.budget || "待定"}。
`.trim();
  }

  private generateBackground(prd: PRD, rulePlan: RulePlan): string {
    return `
## 一、研究背景

${prd.background}

随着相关领域的快速发展，${prd.researchProblem.split("")[0, 20]}...已成为当前研究的重要方向。

## 二、国内外研究现状

近年来，国内外学者在该领域进行了大量研究。然而，现有研究仍存在以下不足：

1. [研究空白 1]
2. [研究空白 2]
3. [研究空白 3]

## 三、研究意义

本研究的开展将有助于：

1. 理论意义：丰富和完善相关理论体系
2. 实践意义：为解决实际问题提供科学依据

## 四、创新点

本研究的创新之处主要体现在：

1. 理论创新：[具体创新点]
2. 方法创新：[方法学上的创新]
3. 应用创新：[应用场景的创新]
`.trim();
  }

  private generateObjectives(prd: PRD): string {
    return `
## 一、研究目标

本项目的总体目标是：${prd.researchProblem}

具体目标如下：

${prd.researchObjectives.map((o, i) => `### 目标${i + 1}
${o}`).join("\n\n")}

## 二、研究内容

围绕上述目标，本项目拟开展以下研究内容：

1. [研究内容 1]
2. [研究内容 2]
3. [研究内容 3]

## 三、关键科学问题

本项目拟解决的关键科学问题包括：

1. [关键问题 1]
2. [关键问题 2]
`.trim();
  }

  private generateMethods(prd: PRD, rulePlan: RulePlan): string {
    return `
## 一、研究方法

### 1. 文献研究法
系统梳理国内外相关文献，把握研究前沿动态。

### 2. 实证分析法
采用定量与定性相结合的方法进行实证分析。

### 3. 实验研究法
设计对照实验，验证研究假设。

## 二、技术路线

本研究的技术路线如下：

第一阶段：数据收集与预处理
- 数据来源：[数据源描述]
- 样本量：[样本规模]
- 预处理方法：[处理方法]

第二阶段：模型构建与分析
- 模型选择：[模型类型]
- 参数设置：[参数说明]
- 验证方法：[验证策略]

第三阶段：结果解释与应用
- 结果分析：[分析方法]
- 应用建议：[应用方向]

## 三、可行性分析

### 1. 理论可行性
[理论依据说明]

### 2. 技术可行性
[技术条件说明]

### 3. 条件可行性
研究团队具备完成本项目所需的实验设备和研究条件。
`.trim();
  }

  private generateOutcomes(prd: PRD): string {
    return `
## 一、预期研究成果

${prd.expectedOutcomes.map((o, i) => `### 成果${i + 1}
${o}`).join("\n\n")}

## 二、考核指标

本项目的主要考核指标包括：

1. 论文指标：发表 SCI/EI 论文${prd.expectedOutcomes.length}篇
2. 人才培养：培养研究生 1-2 名
3. 学术交流：参加国内外学术会议 2-3 次

## 三、成果形式

1. 研究论文
2. 技术报告
3. 专利申请（如适用）
`.trim();
  }

  private generateFoundation(prd: PRD): string {
    return `
## 一、研究团队

项目负责人及主要成员具有扎实的理论基础和丰富的研究经验。

### 人员构成
- 项目负责人：[姓名、职称]
- 主要成员：[成员信息]

## 二、前期工作基础

研究团队在相关领域已开展了一系列前期研究，取得了以下成果：

1. [前期成果 1]
2. [前期成果 2]
3. [前期成果 3]

## 三、实验条件

本单位具备完成本项目所需的实验设备和研究条件：

1. [设备条件 1]
2. [设备条件 2]
3. [合作资源]

## 四、保障措施

为确保项目顺利实施，将采取以下保障措施：

1. 组织保障：成立项目管理小组
2. 制度保障：建立定期汇报和交流机制
3. 经费保障：严格按照预算管理规定使用经费
`.trim();
  }

  private generateSchedule(prd: PRD): string {
    return `
## 研究进度安排

本项目计划${prd.timeline}内完成，具体进度安排如下：

### 第一阶段（第 1-6 个月）
- 完成文献调研和数据收集
- 确定研究方案和技术路线
- 完成实验准备工作

### 第二阶段（第 7-18 个月）
- 开展实验研究
- 数据分析和模型构建
- 中期检查和调整

### 第三阶段（第 19-24 个月）
- 补充和完善实验
- 撰写研究论文
- 准备结题验收

### 关键时间节点
- 第 6 个月：完成开题报告
- 第 12 个月：完成中期检查
- 第 24 个月：提交结题报告
`.trim();
  }

  private generateBudget(prd: PRD): string {
    return `
## 经费预算说明

本项目申请经费${prd.budget || "待定"}，具体预算安排如下：

### 一、直接费用

1. 设备费：[金额] 元
   - 用途：[设备购置或测试化验加工]

2. 材料费：[金额] 元
   - 用途：[实验材料、试剂耗材等]

3. 测试化验加工费：[金额] 元
   - 用途：[委托外单位测试化验]

4. 差旅费/会议费：[金额] 元
   - 用途：[学术交流、调研采样]

5. 出版/文献/信息传播费：[金额] 元
   - 用途：[论文发表、资料购买]

6. 劳务费：[金额] 元
   - 用途：[研究生助研津贴]

### 二、间接费用

按照直接费用的一定比例计提，用于单位水、电、暖、气等消耗和管理费用。

### 三、预算依据

以上预算编制依据国家相关经费管理规定，结合本项目实际研究需要，本着节俭、高效的原则进行编制。
`.trim();
  }

  /**
   * 组装草稿
   */
  private assembleDraft(prd: PRD): Draft {
    const timestamp = now();
    const totalWordCount = this.generatedSections.reduce((sum, s) => sum + s.wordCount, 0);

    return {
      projectId: prd.projectId,
      sections: this.generatedSections,
      totalWordCount,
      status: "completed",
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  /**
   * 生成撰写说明
   */
  private generateWritingNotes(): string {
    return `
初稿已完成，共${this.generatedSections.length}个章节，总计${this.generatedSections.reduce((sum, s) => sum + s.wordCount, 0)}字。

注意事项：
1. 请仔细检查各章节内容的准确性和完整性
2. 标有 [待补充] 的地方需要填写具体信息
3. 可根据实际情况调整章节结构和内容
4. 提交审核前请确认符合所有格式要求
`.trim();
  }
}
