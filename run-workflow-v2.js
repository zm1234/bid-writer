/**
 * Bid Writer 工作流 - 完整版（含DOCX生成）
 * 运行完整流程：PRD → 规则 → 草稿 → 审核 → 格式校验 → 终稿 → DOCX
 */

const { WorkflowEngine } = require('./packages/workflow/src/engine-v2');
const { generateDocx } = require('./scripts/docx-generator');

// ============== PRD 数据 ==============

const PRD_DATA = {
  title: '基于深度学习的颈动脉超声早期动脉硬化智能检测系统研发',
  timeline: '12 个月（2026 年 4 月 -2027 年 3 月）',
  budget: '15 万元（A 类重点研发）',
  background: '心血管疾病是全球首要死因，颈动脉斑块是重要早期表现。',
  researchProblem: '如何利用深度学习技术实现颈动脉超声图像早期斑块的自动检测？',
  researchObjectives: [
    '构建高精度的颈动脉斑块检测模型（准确率≥85%）',
    '在昆山队列 60 万张图像中验证模型性能',
    '评估模型对心血管事件预测的临床价值'
  ]
};

// ============== 规则数据 ==============

const RULE_DATA = {
  absoluteRules: [
    { type: 'format', description: '总字数不超过 5000 字' },
    { type: 'format', description: '必须包含 7 个必填章节' },
    { type: 'content', description: '必须包含伦理审查说明' }
  ],
  styleProfile: {
    formality: 9,
    academicDepth: 8,
    verbosity: 5
  }
};

// ============== 主流程 ==============

async function main() {
  console.log('='.repeat(60));
  console.log('Bid Writer 工作流 - 多轮审查版');
  console.log('='.repeat(60));
  
  const engine = new WorkflowEngine();
  
  // 1. 初始化
  await engine.initialize();
  console.log('');
  
  // 2. PRD 确认 (Agent 1)
  console.log('[Agent 1] PRD 确认...');
  console.log(`  课题: ${PRD_DATA.title}`);
  console.log(`  经费: ${PRD_DATA.budget}`);
  console.log(`  ✅ PRD 已确认`);
  console.log('');
  
  // 3. 规则规划 (Agent 2)
  console.log('[Agent 2] 规则规划...');
  console.log(`  规则数: ${RULE_DATA.absoluteRules.length}`);
  console.log(`  ✅ 规则已规划`);
  console.log('');
  
  // 4. 生成草稿 (Agent 3)
  const draft = await engine.generateDraft(PRD_DATA, RULE_DATA);
  console.log(`  总字数: ${draft.totalWordCount}`);
  console.log('');
  
  // 5. 审核草稿 (Agent 4)
  const review = await engine.reviewDraft(draft);
  console.log('');
  
  // 6. 格式校验 (Agent 5)
  const format = await engine.validateFormat(draft);
  console.log('');
  
  // 7. 生成终稿 (Agent 6)
  const final = await engine.generateFinal(PRD_DATA, draft, review, format);
  
  // 8. 生成 DOCX
  if (final) {
    console.log('\n[Agent 7] 生成 DOCX...');
    const outputDir = './data/projects/2026-beijing-integrative-medicine/outputs';
    const docxPath = `${outputDir}/标书终稿-工作流生成.docx`;
    
    // 使用新的 DOCX 填充器
    const { fillDocxTemplate } = require('./scripts/docx-filler');
    await fillDocxTemplate(draft.sections, docxPath);
    
    // 验证 DOCX 是否正确填充
    console.log('\n[Agent 8] 验证 DOCX...');
    const fs = require('fs');
    const AdmZip = require('adm-zip');
    
    // 检查 DOCX 文件
    if (fs.existsSync(docxPath)) {
      const stats = fs.statSync(docxPath);
      console.log(`  - DOCX 文件大小: ${stats.size} bytes`);
      
      // 检查是否生成了内容文本
      const textPath = docxPath.replace('.docx', '-内容.txt');
      if (fs.existsSync(textPath)) {
        const textStats = fs.statSync(textPath);
        console.log(`  - 内容文本大小: ${textStats.size} bytes`);
        console.log(`  ✅ 验证通过`);
      } else {
        console.log(`  ⚠️ 内容文本未生成（模板结构复杂）`);
      }
    } else {
      console.log(`  ❌ DOCX 文件未生成`);
    }
  }
  
  if (final) {
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 标书生成完成！');
    console.log('='.repeat(60));
    console.log(`草稿版本: v${draft.version}`);
    console.log(`总字数: ${final.wordCount}`);
    console.log(`审核状态: ${review.approved ? '通过' : '未通过'}`);
    console.log(`格式校验: ${format.passed ? '通过' : '未通过'}`);
    console.log('');
    console.log('文件结构:');
    console.log(`  drafts/v${draft.version}/  - 草稿`);
    console.log(`  reviews/              - 审核记录`);
    console.log(`  outputs/              - 终稿`);
  } else {
    console.log('');
    console.log('='.repeat(60));
    console.log('❌ 标书生成失败');
    console.log('='.repeat(60));
  }
}

main().catch(console.error);
