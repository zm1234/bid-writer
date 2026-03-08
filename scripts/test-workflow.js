/**
 * Bid Writer 工作流测试脚本
 * 完整运行所有Agent，生成标书终稿
 */

const fs = require('fs');
const path = require('path');

// 模拟数据
const PROJECT_DATA = {
  projectId: 'test-project-001',
  name: '2026-beijing-integrative-medicine',
  
  // PRD数据
  prd: {
    title: '基于深度学习的颈动脉超声早期动脉硬化智能检测系统研发',
    background: '心血管疾病是全球首要死因，动脉粥样硬化是CVD病理基础。颈动脉斑块是重要早期表现。传统超声依赖人工判读，存在人力成本高、主观性强、效率受限等问题。',
    researchProblem: '如何利用深度学习技术实现颈动脉超声图像早期斑块的自动检测？',
    researchObjectives: [
      '构建高精度的颈动脉斑块检测模型',
      '验证模型在昆山队列中的性能',
      '评估模型对心血管事件预测的价值'
    ],
    expectedOutcomes: [
      '发表SCI论文2-3篇',
      '申请发明专利1-2项',
      '开发颈动脉斑块检测系统1套'
    ],
    timeline: '12个月',
    budget: '15万元'
  },
  
  // 规则规划数据
  rules: {
    absoluteRules: [
      { type: 'format', description: '字数不超过5000字' },
      { type: 'format', description: '必须包含所有必填章节' },
      { type: 'content', description: '必须包含伦理审查说明' }
    ],
    styleProfile: {
      formality: 9,
      academicDepth: 8,
      verbosity: 5,
      preferredPhrases: ['本研究', '结果表明', '未见明显'],
      avoidPhrases: ['显然', '毫无疑问']
    }
  },
  
  // 模板信息
  template: {
    sections: [
      '一、课题及申请人基本情况',
      '二、立项依据',
      '三、主要研究内容',
      '四、研究基础、可行性论证',
      '五、经费预算',
      '六、申请人承诺',
      '七、签字签章'
    ],
    maxWordCount: 5000
  }
};

// ========== Agent 1: PRD 确认 ==========
function runPRDConfirm(data) {
  console.log('【Agent 1】PRD确认...');
  const prdOutput = {
    ...data.prd,
    status: 'confirmed',
    confirmedAt: new Date().toISOString()
  };
  console.log('  ✓ PRD确认完成');
  return prdOutput;
}

// ========== Agent 2: 规则规划 ==========
function runRulePlanner(data, prdOutput) {
  console.log('【Agent 2】规则规划...');
  
  // 加载模板章节结构
  const templateSections = data.template.sections;
  
  const ruleOutput = {
    ...data.rules,
    templateSections,
    writingGuidelines: `请按照以下章节结构撰写：${templateSections.join(' → ')}`,
    status: 'planned'
  };
  console.log('  ✓ 规则规划完成');
  console.log(`  - 模板章节: ${templateSections.length}个`);
  return ruleOutput;
}

// ========== Agent 3: 初稿撰写 ==========
function runDraftWriter(prdOutput, ruleOutput) {
  console.log('【Agent 3】初稿撰写...');
  
  const sections = [];
  
  // 按模板章节撰写
  const templates = ruleOutput.templateSections;
  
  // 一、课题及申请人基本情况
  sections.push({
    title: templates[0],
    content: `项目名称：${prdOutput.title}\n资助类别：A类\n研究期限：${prdOutput.timeline}\n申请经费：${prdOutput.budget}\n\n申请人信息：\n- 姓名：[待填写]\n- 工作单位：[待填写]\n- 主要研究领域：医学影像学、人工智能诊断、心血管疾病筛查`
  });
  
  // 二、立项依据
  sections.push({
    title: templates[1],
    content: `心血管疾病（CVD）是全球范围内导致死亡的主要原因之一。根据世界卫生组织统计，心血管疾病每年导致约1790万人死亡，占全球总死亡人数的31%。动脉粥样硬化是心血管疾病的主要病理基础，而颈动脉斑块是动脉粥样硬化的重要早期表现，也是心脑血管事件的重要预测因子。

早期发现颈动脉斑块对于预防心脑血管事件具有重要意义。然而，传统的颈动脉超声检查依赖经验丰富的超声科医生进行人工判读，存在人力成本高、主观性强、效率受限等问题。

基于深度学习的自动检测系统可以有效解决上述问题，实现自动化筛查，降低人力成本，提高检测效率和一致性，为精准医学提供支持。`
  });
  
  // 三、主要研究内容
  sections.push({
    title: templates[2],
    content: `1. 拟解决的问题及研究目标
   
   核心问题：如何利用深度学习技术实现颈动脉超声图像早期斑块的自动检测？
   
   具体目标：
   - 构建高精度的颈动脉斑块检测模型
   - 验证模型在昆山队列中的性能
   - 评估模型对心血管事件预测的价值

2. 研究内容
   
   （1）数据收集与预处理
   - 收集昆山队列60万张颈动脉超声图像
   - 进行质量控制和图像预处理
   
   （2）模型开发
   - 基于YOLOv8l架构构建检测模型
   - 采用迁移学习策略
   
   （3）模型验证
   - 内部验证集评估
   - 外部验证集（BiDirect）验证
   
   3. 技术路线
   
   数据收集 → 预处理 → 模型训练 → 性能验证 → 临床应用

4. 绩效目标
   - 检测准确率≥85%
   - 发表SCI论文2-3篇
   - 申请发明专利1-2项
   - 开发原型系统1套`
  });
  
  // 四、研究基础、可行性论证
  sections.push({
    title: templates[3],
    content: `1. 研究基础
   
   （1）前期研究基础
   - 团队成员已在相关领域发表论文20余篇
   - 掌握YOLOv8等深度学习模型的开发技术
   - 具备医学影像数据处理经验
   
   （2）数据支撑
   - 昆山队列：60万张颈动脉超声影像
   - UK Biobank：19,499人（预训练模型权重）
   - BiDirect：2,105人（外部验证）

2. 创新点
   
   （1）首次将深度学习应用于大规模无症状人群颈动脉斑块筛查
   
   （2）结合UKB预训练模型与本土数据进行fine-tuning
   
   （3）整合影像、表型、遗传数据

3. 可行性分析
   
   理论可行性：深度学习在医学影像分析已有成功案例 ✓
   技术条件可行性：团队具备GPU算力和开发经验 ✓
   操作可行性：与昆山队列合作，数据获取有保障 ✓
   经济可行性：15万元经费充足 ✓`
  });
  
  // 五、经费预算
  sections.push({
    title: templates[4],
    content: `总预算：15万元

1. 设备费：3.0万元（GPU服务器、存储设备）
2. 材料费：2.0万元
3. 测试化验加工费：1.5万元
4. 燃料动力费：0.5万元
5. 差旅费：1.5万元
6. 会议费：1.0万元
7. 国际合作与交流费：0.5万元
8. 出版/文献/信息传播/知识产权事务费：1.0万元
9. 劳务费：2.5万元
10. 专家咨询费：1.0万元
11. 其他支出：0.5万元
12. 间接费用：1.5万元
合计：15.0万元`
  });
  
  // 六、七
  sections.push({
    title: templates[5],
    content: `本人承诺上述填报内容真实有效。如获批准，我与本课题组成员将严格遵守国家有关法律法规，遵守北京整合医学学会有关规定，切实保证按计划完成本工作。\n\n签字：___________`
  });
  
  sections.push({
    title: templates[6],
    content: `第一申请人（项目负责人）：___________ 日期：___________\n项目依托单位（签章）：___________ 日期：___________`
  });
  
  const draftOutput = {
    sections,
    totalWordCount: sections.reduce((sum, s) => sum + s.content.length, 0),
    status: 'completed'
  };
  
  console.log('  ✓ 初稿撰写完成');
  console.log(`  - 章节数: ${sections.length}`);
  console.log(`  - 字数: ${draftOutput.totalWordCount}`);
  return draftOutput;
}

// ========== Agent 4: 初稿审核 ==========
function runDraftReviewer(draftOutput) {
  console.log('【Agent 4】初稿审核...');
  
  const issues = [];
  
  // 检查错别字（简化）
  // 检查内容完整性
  if (draftOutput.sections.length < 7) {
    issues.push({ type: 'completeness', message: '章节数量不足', severity: 'error' });
  }
  
  // 检查字数
  if (draftOutput.totalWordCount > 5000) {
    issues.push({ type: 'word_count', message: '字数超过限制', severity: 'warning' });
  }
  
  const reviewOutput = {
    round: 1,
    issues,
    summary: issues.length === 0 ? '审核通过' : `发现${issues.length}个问题`,
    approved: issues.filter(i => i.severity === 'error').length === 0
  };
  
  console.log(`  ✓ 审核完成: ${reviewOutput.summary}`);
  return reviewOutput;
}

// ========== Agent 5: 格式校验 ==========
function runFormatValidator(draftOutput, templateInfo) {
  console.log('【Agent 5】格式校验...');
  
  const issues = [];
  const requiredSections = templateInfo.sections;
  
  // 检查章节完整性
  const draftTitles = draftOutput.sections.map(s => s.title);
  const missingSections = requiredSections.filter(
    req => !draftTitles.some(d => d.includes(req.replace(/^\d+、/, '')))
  );
  
  if (missingSections.length > 0) {
    issues.push({ 
      type: 'missing_section', 
      message: `缺少章节: ${missingSections.join(', ')}`,
      severity: 'error'
    });
  }
  
  // 检查字数
  if (draftOutput.totalWordCount > templateInfo.maxWordCount) {
    issues.push({
      type: 'word_count',
      message: `字数超过限制: ${draftOutput.totalWordCount} > ${templateInfo.maxWordCount}`,
      severity: 'error'
    });
  }
  
  const formatOutput = {
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats: {
      requiredSections: requiredSections.length,
      actualSections: draftOutput.sections.length,
      wordCount: draftOutput.totalWordCount
    }
  };
  
  console.log(`  ✓ 格式校验: ${formatOutput.passed ? '通过' : '未通过'}`);
  if (issues.length > 0) {
    issues.forEach(i => console.log(`    - ${i.type}: ${i.message}`));
  }
  
  return formatOutput;
}

// ========== Agent 6: 终稿确认 ==========
function runFinalConfirmer(prdOutput, draftOutput, reviewOutput, formatOutput) {
  console.log('【Agent 6】终稿确认...');
  
  // 校验是否通过
  if (!reviewOutput.approved) {
    console.log('  ✗ 初稿审核未通过，需返回修改');
    return null;
  }
  
  if (!formatOutput.passed) {
    console.log('  ✗ 格式校验未通过，需返回修改');
    return null;
  }
  
  // 生成终稿
  let fullText = '';
  draftOutput.sections.forEach(section => {
    fullText += `## ${section.title}\n\n${section.content}\n\n`;
  });
  
  const finalOutput = {
    title: prdOutput.title,
    fullText,
    wordCount: draftOutput.totalWordCount,
    sections: draftOutput.sections.map(s => ({
      name: s.title,
      wordCount: s.content.length,
      keyPoints: [s.content.substring(0, 100)]
    })),
    summary: `本标书为${prdOutput.title}，研究周期${prdOutput.timeline}，申请经费${prdOutput.budget}。经过6个Agent审核确认，符合申报要求。`,
    createdAt: new Date().toISOString(),
    metadata: {
      reviewPassed: reviewOutput.approved,
      formatPassed: formatOutput.passed,
      reviewRounds: reviewOutput.round
    }
  };
  
  console.log('  ✓ 终稿确认完成');
  console.log(`  - 总字数: ${finalOutput.wordCount}`);
  console.log(`  - 审核轮次: ${finalOutput.metadata.reviewRounds}`);
  
  return finalOutput;
}

// ========== 主流程 ==========
async function main() {
  console.log('='.repeat(50));
  console.log('Bid Writer 工作流测试');
  console.log('='.repeat(50));
  console.log('');
  
  // 1. PRD确认
  const prdOutput = runPRDConfirm(PROJECT_DATA);
  console.log('');
  
  // 2. 规则规划
  const ruleOutput = runRulePlanner(PROJECT_DATA, prdOutput);
  console.log('');
  
  // 3. 初稿撰写
  const draftOutput = runDraftWriter(prdOutput, ruleOutput);
  console.log('');
  
  // 4. 初稿审核
  const reviewOutput = runDraftReviewer(draftOutput);
  console.log('');
  
  // 5. 格式校验
  const formatOutput = runFormatValidator(draftOutput, PROJECT_DATA.template);
  console.log('');
  
  // 6. 终稿确认
  const finalOutput = runFinalConfirmer(prdOutput, draftOutput, reviewOutput, formatOutput);
  console.log('');
  
  if (finalOutput) {
    // 保存终稿
    const outputDir = './data/projects/2026-beijing-integrative-medicine/outputs';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 保存Markdown
    fs.writeFileSync(
      path.join(outputDir, 'final-draft-by-agent.md'),
      `# ${finalOutput.title}\n\n${finalOutput.fullText}`
    );
    
    // 保存JSON
    fs.writeFileSync(
      path.join(outputDir, 'final-output.json'),
      JSON.stringify(finalOutput, null, 2)
    );
    
    console.log('='.repeat(50));
    console.log('✅ 标书生成完成！');
    console.log('='.repeat(50));
    console.log(`输出文件:`);
    console.log(`  - final-draft-by-agent.md`);
    console.log(`  - final-output.json`);
  } else {
    console.log('='.repeat(50));
    console.log('❌ 标书生成失败：审核未通过');
    console.log('='.repeat(50));
  }
}

main().catch(console.error);
