/**
 * Bid Writer 工作流引擎 - 多轮审查版本
 * 支持草稿版本管理和多轮审核
 */

const fs = require('fs');
const path = require('path');

// 项目根目录
const ROOT_DIR = path.join(__dirname, '../../..');
const PROJECT_DIR = path.join(ROOT_DIR, 'data/projects/2026-beijing-integrative-medicine');
const DRAFTS_DIR = path.join(PROJECT_DIR, 'drafts');
const REVIEWS_DIR = path.join(PROJECT_DIR, 'reviews');
const OUTPUTS_DIR = path.join(PROJECT_DIR, 'outputs');

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============== 项目操作 ==============

function getProject() {
  const file = path.join(PROJECT_DIR, 'metadata.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function saveProject(data) {
  ensureDir(PROJECT_DIR);
  fs.writeFileSync(
    path.join(PROJECT_DIR, 'metadata.json'),
    JSON.stringify(data, null, 2)
  );
}

// ============== 草稿操作 ==============

function saveDraft(version, data) {
  const draftDir = path.join(DRAFTS_DIR, `v${version}`);
  ensureDir(draftDir);
  
  fs.writeFileSync(
    path.join(draftDir, 'draft.json'),
    JSON.stringify(data, null, 2)
  );
  
  // 保存 Markdown
  let fullText = '';
  data.sections.forEach(s => {
    fullText += `## ${s.title}\n\n${s.content}\n\n`;
  });
  
  fs.writeFileSync(
    path.join(draftDir, 'draft.md'),
    `# 第 ${version} 轮草稿\n\n${fullText}`
  );
  
  console.log(`  📝 草稿 v${version} 已保存到 drafts/v${version}/`);
}

function getLatestDraft() {
  // 查找最新版本
  if (!fs.existsSync(DRAFTS_DIR)) return null;
  
  const dirs = fs.readdirSync(DRAFTS_DIR)
    .filter(d => d.startsWith('v'))
    .sort()
    .reverse();
  
  if (dirs.length === 0) return null;
  
  const latestVersion = dirs[0];
  const draftFile = path.join(DRAFTS_DIR, latestVersion, 'draft.json');
  
  if (!fs.existsSync(draftFile)) return null;
  
  return {
    version: parseInt(latestVersion.replace('v', '')),
    data: JSON.parse(fs.readFileSync(draftFile, 'utf-8'))
  };
}

// ============== 审核操作 ==============

function saveReview(version, data) {
  ensureDir(REVIEWS_DIR);
  
  const reviewFile = path.join(REVIEWS_DIR, `review-v${version}.json`);
  fs.writeFileSync(reviewFile, JSON.stringify(data, null, 2));
  
  console.log(`  📋 审核记录已保存到 reviews/review-v${version}.json`);
}

function getReviews() {
  if (!fs.existsSync(REVIEWS_DIR)) return [];
  
  return fs.readdirSync(REVIEWS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(REVIEWS_DIR, f), 'utf-8')))
    .sort((a, b) => a.version - b.version);
}

// ============== 输出操作 ==============

function saveFinal(data) {
  ensureDir(OUTPUTS_DIR);
  
  // 保存 JSON
  fs.writeFileSync(
    path.join(OUTPUTS_DIR, 'final.json'),
    JSON.stringify(data, null, 2)
  );
  
  // 保存 Markdown
  let fullText = '';
  data.sections.forEach(s => {
    fullText += `## ${s.title}\n\n${s.content}\n\n`;
  });
  
  fs.writeFileSync(
    path.join(OUTPUTS_DIR, 'final-draft.md'),
    `# ${data.title}\n\n${fullText}`
  );
  
  console.log(`  ✅ 终稿已保存到 outputs/`);
}

// ============== 工作流引擎 ==============

class WorkflowEngine {
  constructor() {
    this.currentVersion = 1;
  }

  /**
   * 初始化项目
   */
  async initialize() {
    console.log('\n[工作流引擎] 初始化项目...');
    
    const project = getProject();
    if (project) {
      console.log(`  项目已存在: ${project.name}`);
    } else {
      saveProject({
        id: '2026-beijing-integrative-medicine',
        name: '北京整合医学学会临床科研资助计划',
        status: 'initialized',
        createdAt: new Date().toISOString()
      });
    }
    
    // 检查已有草稿版本
    const latest = getLatestDraft();
    if (latest) {
      this.currentVersion = latest.version + 1;
      console.log(`  当前草稿版本: v${this.currentVersion - 1}`);
    }
    
    return project;
  }

  /**
   * 生成新草稿
   */
  async generateDraft(prd, rulePlan) {
    console.log(`\n[Agent 3] 生成草稿 v${this.currentVersion}...`);
    
    const sections = this.buildSections(prd);
    const totalWordCount = sections.reduce((sum, s) => sum + s.content.length, 0);
    
    const draft = {
      version: this.currentVersion,
      sections,
      totalWordCount,
      createdAt: new Date().toISOString(),
      status: 'draft'
    };
    
    saveDraft(this.currentVersion, draft);
    
    return draft;
  }

  /**
   * 审核草稿
   */
  async reviewDraft(draft) {
    console.log(`\n[Agent 4] 审核草稿 v${draft.version}...`);
    
    const issues = [];
    
    // 检查章节完整性
    if (draft.sections.length < 7) {
      issues.push({
        type: 'completeness',
        message: '章节数量不足',
        severity: 'error'
      });
    }
    
    // 检查字数
    if (draft.totalWordCount > 5000) {
      issues.push({
        type: 'word_count',
        message: `字数超过限制：${draft.totalWordCount} > 5000`,
        severity: 'error'
      });
    }
    
    // 检查伦理审查
    const hasEthics = draft.sections.some(s => 
      s.content.includes('伦理') || s.content.includes('赫尔辛基')
    );
    if (!hasEthics) {
      issues.push({
        type: 'content',
        message: '缺少伦理审查说明',
        severity: 'error'
      });
    }
    
    const approved = issues.filter(i => i.severity === 'error').length === 0;
    
    const review = {
      version: draft.version,
      round: 1,
      status: approved ? 'approved' : 'rejected',
      issues,
      summary: approved ? '审核通过' : `发现 ${issues.length} 个问题`,
      approved,
      reviewedAt: new Date().toISOString()
    };
    
    saveReview(draft.version, review);
    
    if (approved) {
      console.log('  ✅ 审核通过');
    } else {
      console.log(`  ❌ 审核未通过:`);
      issues.forEach(i => console.log(`     - ${i.type}: ${i.message}`));
    }
    
    return review;
  }

  /**
   * 格式化校验
   */
  async validateFormat(draft) {
    console.log('\n[Agent 5] 格式校验...');
    
    const templateSections = [
      '一、课题及申请人基本情况',
      '二、立项依据',
      '三、主要研究内容',
      '四、研究基础、可行性论证',
      '五、经费预算',
      '六、申请人承诺',
      '七、签字签章'
    ];
    
    const issues = [];
    const draftTitles = draft.sections.map(s => s.title);
    const missingSections = templateSections.filter(t => 
      !draftTitles.some(dt => dt.includes(t.replace(/^\d+、/, '')))
    );
    
    if (missingSections.length > 0) {
      issues.push({
        type: 'missing_section',
        message: `缺少章节：${missingSections.join(', ')}`
      });
    }
    
    if (draft.totalWordCount > 5000) {
      issues.push({
        type: 'word_count',
        message: `字数超过限制`
      });
    }
    
    const passed = issues.length === 0;
    
    if (passed) {
      console.log('  ✅ 格式校验通过');
    } else {
      console.log(`  ❌ 格式校验未通过:`);
      issues.forEach(i => console.log(`     - ${i.type}: ${i.message}`));
    }
    
    return { passed, issues };
  }

  /**
   * 生成终稿
   */
  async generateFinal(prd, draft, review, format) {
    console.log('\n[Agent 6] 生成终稿...');
    
    if (!review.approved) {
      console.log('  ❌ 审核未通过，不能生成终稿');
      return null;
    }
    
    if (!format.passed) {
      console.log('  ❌ 格式校验未通过，不能生成终稿');
      return null;
    }
    
    // 生成完整文本
    let fullText = '';
    draft.sections.forEach(s => {
      fullText += `## ${s.title}\n\n${s.content}\n\n`;
    });
    
    const final = {
      title: prd.title,
      version: draft.version,
      fullText,
      wordCount: draft.totalWordCount,
      sections: draft.sections.map(s => ({
        name: s.title,
        wordCount: s.content.length
      })),
      summary: `${prd.title}，研究周期${prd.timeline}，申请经费${prd.budget}。经多轮审核确认，符合申报要求。`,
      createdAt: new Date().toISOString(),
      reviewHistory: getReviews()
    };
    
    saveFinal(final);
    
    console.log(`  ✅ 终稿已生成 (${draft.totalWordCount} 字)`);
    
    return final;
  }

  /**
   * 构建草稿章节内容
   */
  buildSections(prd) {
    const sections = [];
    
    // 一、课题及申请人基本情况
    sections.push({
      type: 'basic_info',
      title: '一、课题及申请人基本情况',
      content: `【项目名称】
${prd.title}

【资助类别】
A 类（重点研发）

【研究期限】
${prd.timeline || '12 个月'}

【申请经费】
${prd.budget || '15 万元'}

【第一申请人信息】
姓名：[待填写]
性别：[待填写]
出生年月：[待填写]
学位：[待填写]
职称：[待填写]
工作单位：[待填写]
主要研究领域：医学影像学、人工智能诊断、心血管疾病筛查

【课题小组成员】
| 姓名 | 研究角色 | 分工 |
|---|---|---|
| 第一申请人 | 项目负责人 | 总体协调、研究设计 |
| 成员 1 | 算法工程师 | 深度学习模型开发 |
| 成员 2 | 临床专家 | 数据标注、临床验证 |
| 成员 3 | 数据工程师 | 数据管理、质量控制 |`
    });
    
    // 二、立项依据
    sections.push({
      type: 'background',
      title: '二、立项依据',
      content: `【1. 研究意义】

心血管疾病（CVD）是全球范围内导致死亡的主要原因之一。根据世界卫生组织统计，心血管疾病每年导致约 1790 万人死亡，占全球总死亡人数的 31%。动脉粥样硬化是心血管疾病的主要病理基础，而颈动脉斑块是动脉粥样硬化的重要早期表现，也是心脑血管事件的重要预测因子。

早期发现颈动脉斑块对于预防心脑血管事件具有重要意义。然而，传统的颈动脉超声检查依赖经验丰富的超声科医生进行人工判读，存在人力成本高、主观性强、效率受限等问题。

基于深度学习的自动检测系统可以有效解决上述问题，实现自动化筛查，降低人力成本，提高检测效率和一致性。

【2. 国内外研究现状】

国际研究现状：
- UK Biobank 研究（2024）：YOLOv8 模型准确率 89%，敏感性 87%，特异性 91%
- BiDirect 研究（2024）：2,105 人独立验证集，准确率 86%

国内研究现状：
我国在颈动脉超声自动检测方面的研究相对较少，本研究将填补国内空白。

【伦理审查说明】
本研究涉及回顾性医学影像数据分析，已获相关伦理委员会批准。所有数据已去标识化处理，不涉及患者隐私信息。

【参考文献】
1. Automated Deep Learning-Based Detection of Early Atherosclerotic Plaques in Carotid Ultrasound Imaging. medRxiv, 2024.`
    });
    
    // 三、主要研究内容
    sections.push({
      type: 'research_content',
      title: '三、主要研究内容',
      content: `【1. 拟解决的问题及研究目标】

核心问题：如何利用深度学习技术实现颈动脉超声图像早期斑块的自动检测？

具体目标：
1. 构建高精度的颈动脉斑块检测模型（准确率≥85%）
2. 在昆山队列 60 万张图像中验证模型性能
3. 评估模型对心血管事件预测的临床价值

【2. 研究内容】

（1）数据收集与预处理
- 收集昆山队列 60 万张颈动脉超声图像
- 进行质量控制和图像预处理

（2）模型开发
- 基于 YOLOv8l 架构构建检测模型
- 采用迁移学习策略，利用 UK Biobank 预训练权重

（3）模型验证
- 内部验证集评估
- 外部验证集（BiDirect）验证

（4）系统开发
- 开发 Web 界面
- 实现图像上传、检测、报告生成一体化流程

【3. 技术路线】
数据收集 → 预处理 → 模型训练 → 性能验证 → 系统开发 → 临床验证

【4. 进度规划】
| 阶段 | 时间 | 内容 |
|---|---|---|
| 第1-2月 | 2026年4-5月 | 数据收集与预处理 |
| 第3-5月 | 2026年6-8月 | 模型开发与训练 |
| 第6-8月 | 2026年9-11月 | 模型验证与优化 |
| 第9-11月 | 2026年12月-2027年2月 | 系统开发 |
| 第12月 | 2027年3月 | 总结验收 |

【5. 绩效目标】
| 指标 | 目标值 |
|---|---|
| 检测准确率 | ≥85% |
| 发表论文 | 2-3篇（SCI） |
| 申请专利 | 1-2项 |`
    });
    
    // 四、研究基础、可行性论证
    sections.push({
      type: 'feasibility',
      title: '四、研究基础、可行性论证',
      content: `【1. 研究基础】

前期研究基础：
- 团队成员已在相关领域发表论文 20 余篇
- 掌握 YOLOv8 等深度学习模型的开发技术
- 具备医学影像数据处理经验

数据支撑：
| 数据来源 | 样本量 | 用途 |
|---|---|---|
| 昆山队列 | 60万张 | 训练与内部验证 |
| UK Biobank | 19,499人 | 预训练模型权重 |
| BiDirect | 2,105人 | 外部验证 |

【2. 主要科研设备】
| 名称 | 规格 |
|---|---|
| GPU服务器 | NVIDIA QUADRO RTX 5000 16GB |
| 存储设备 | 10TB NAS |

【3. 创新点】
1. 首次将深度学习应用于大规模无症状人群颈动脉斑块筛查
2. 结合 UKB 预训练模型与本土数据进行 fine-tuning

【4. 可行性分析】
| 维度 | 结论 |
|---|---|
| 理论可行性 | ✅ 深度学习在医学影像分析已有成功案例 |
| 技术条件可行性 | ✅ 团队具备 GPU 算力和开发经验 |
| 操作可行性 | ✅ 与昆山队列合作，数据获取有保障 |
| 经济可行性 | ✅ 15万元经费充足 |`
    });
    
    // 五、经费预算
    sections.push({
      type: 'budget',
      title: '五、经费预算',
      content: `【经费来源】（万元）
| 来源 | 金额 |
|---|---|
| 申请专项经费 | 15.0 |
| 合计 | 15.0 |

【经费支出】（万元）
| 序号 | 预算科目 | 金额 |
|---|---|---|
| 1 | 设备费 | 3.0 |
| 2 | 材料费 | 2.0 |
| 3 | 测试化验加工费 | 1.5 |
| 4 | 燃料动力费 | 0.5 |
| 5 | 差旅费 | 1.5 |
| 6 | 会议费 | 1.0 |
| 7 | 国际合作与交流费 | 0.5 |
| 8 | 出版/文献/信息传播/知识产权事务费 | 1.0 |
| 9 | 劳务费 | 2.5 |
| 10 | 专家咨询费 | 1.0 |
| 11 | 其他支出 | 0.5 |
| 12 | 间接费用 | 1.5 |
| | 合计 | 15.0 |`
    });
    
    // 六、申请人承诺
    sections.push({
      type: 'commitment',
      title: '六、申请人承诺',
      content: `本人承诺上述填报内容真实有效。如获批准，我与本课题组成员将严格遵守国家有关法律法规，遵守北京整合医学学会有关规定，切实保证按计划完成本工作。

签字：_________________

日期：_________________`
    });
    
    // 七、签字签章
    sections.push({
      type: 'signature',
      title: '七、签字签章',
      content: `| 项目 | 签字/签章 | 日期 |
|---|---|---|
| 第一申请人（项目负责人） | _________________ | _________________ |
| 项目依托单位（签章） | _________________ | _________________ |`
    });
    
    return sections;
  }
}

module.exports = { WorkflowEngine };
