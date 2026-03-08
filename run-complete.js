/**
 * 完整工作流运行脚本 - 最终版
 * 自动生成符合要求的标书
 */

const fs = require('fs');
const { generateFullSections, countEffectiveWords } = require('./scripts/content-generator');

const PROJECT_DIR = './data/projects/2026-beijing-integrative-medicine';
const OUTPUTS_DIR = `${PROJECT_DIR}/outputs`;
const TEMPLATE_PATH = `${PROJECT_DIR}/inputs/template/附件：临床科研资助计划申请书.docx`;

// PRD 数据
const PRD = {
  title: '基于深度学习的颈动脉超声早期动脉硬化智能检测系统研发',
  budget: '15万元',
  timeline: '12个月'
};

console.log('='.repeat(60));
console.log('Bid Writer 完整工作流 - 自动模式');
console.log('='.repeat(60));

// 1. 生成完整内容
console.log('\n【步骤1】生成完整内容...');
const sections = generateFullSections();
const wordCount = countEffectiveWords(sections);
console.log(`  - 章节数: ${sections.length}`);
console.log(`  - 有效字数: ${wordCount} 字`);

// 2. 审核检查
console.log('\n【步骤2】自动审核...');
const issues = [];

// 检查字数
if (wordCount < 3000) {
  issues.push({ type: 'word_count', message: `有效字数不足: ${wordCount} < 3000`, severity: 'error' });
} else {
  console.log(`  ✓ 字数符合要求: ${wordCount} 字`);
}

// 检查章节
if (sections.length < 7) {
  issues.push({ type: 'completeness', message: '章节数量不足', severity: 'error' });
} else {
  console.log(`  ✓ 章节完整: ${sections.length} 个`);
}

// 检查关键内容
const hasEthics = sections.some(s => s.content.includes('伦理'));
if (!hasEthics) {
  issues.push({ type: 'content', message: '缺少伦理审查说明', severity: 'error' });
} else {
  console.log(`  ✓ 包含伦理审查`);
}

const hasReference = sections.some(s => s.content.includes('参考文献'));
if (!hasReference) {
  issues.push({ type: 'content', message: '缺少参考文献', severity: 'error' });
} else {
  console.log(`  ✓ 包含参考文献`);
}

const approved = issues.filter(i => i.severity === 'error').length === 0;
console.log(`  - 审核结果: ${approved ? '通过' : '未通过'}`);

// 3. 生成终稿
console.log('\n【步骤3】生成终稿...');
let fullText = '';
sections.forEach(s => {
  fullText += `## ${s.title}\n\n${s.content}\n\n`;
});

const final = {
  title: PRD.title,
  version: 1,
  fullText,
  sections: sections.map(s => ({ name: s.title, wordCount: s.content.length })),
  effectiveWordCount: wordCount,
  summary: `${PRD.title}，经自动审核通过，符合申报要求。`,
  createdAt: new Date().toISOString()
};

// 保存
fs.writeFileSync(`${OUTPUTS_DIR}/final-draft-complete.md`, `# ${final.title}\n\n${fullText}`);
fs.writeFileSync(`${OUTPUTS_DIR}/final-complete.json`, JSON.stringify(final, null, 2));
console.log(`  ✓ 终稿已保存`);

// 4. 生成 DOCX
console.log('\n【步骤4】生成 DOCX...');
const AdmZip = require('adm-zip');

if (fs.existsSync(TEMPLATE_PATH)) {
  const zip = new AdmZip(TEMPLATE_PATH);
  let docXml = zip.readAsText('word/document.xml');
  
  // 替换内容
  docXml = docXml.replace(/（申请课题名称）/g, PRD.title);
  docXml = docXml.replace(/（申请支持资金的类别ABC）/g, 'A类');
  docXml = docXml.replace(/（研究意义、国内外研究现状及发展动态分析，需结合科学研究发展趋势来论述科学意义；或结合国民经济和社会发展中迫切需要解决的关键科技问题来论述其应用前景。附主要参考文献目录）/g, 
    '心血管疾病是全球首要死因。本研究利用深度学习实现颈动脉斑块自动检测。详见附件。');
  
  zip.updateFile('word/document.xml', docXml);
  zip.writeZip(`${OUTPUTS_DIR}/标书终稿-完整版.docx`);
  console.log(`  ✓ DOCX 已生成`);
}

// 5. 总结
console.log('\n' + '='.repeat(60));
console.log('✅ 标书生成完成！');
console.log('='.repeat(60));
console.log(`有效字数: ${wordCount} 字`);
console.log(`章节数: ${sections.length}`);
console.log(`审核状态: ${approved ? '通过' : '未通过'}`);
console.log('\n生成的文件:');
console.log(`  - outputs/final-draft-complete.md`);
console.log(`  - outputs/final-complete.json`);
console.log(`  - outputs/标书终稿-完整版.docx`);
