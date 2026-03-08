/**
 * 按模板生成标书DOCX
 * 使用adm-zip直接修改XML
 */

const AdmZip = require('adm-zip');
const fs = require('fs');

const TEMPLATE_PATH = './data/projects/2026-beijing-integrative-medicine/inputs/template/附件：临床科研资助计划申请书.docx';
const OUTPUT_PATH = './data/projects/2026-beijing-integrative-medicine/outputs/标书终稿-按模板生成.docx';

// 读取模板
const zip = new AdmZip(TEMPLATE_PATH);
let documentXml = zip.readAsText('word/document.xml');

// 准备数据 - 从final-draft.md提取的关键信息
const data = {
  // 项目基本信息
  projectName: '基于深度学习的颈动脉超声早期动脉硬化智能检测系统研发',
  fundType: 'A类',
  
  // 申请人信息 - 待填写
  applicantName: '___________',
  phone: '___________',
  email: '___________',
  organization: '___________',
  address: '___________',
  
  // 研究期限
  startDate: '2026年4月',
  endDate: '2027年3月',
  duration: '12个月',
  
  // 研究类型
  researchType: '独立',
  
  // 申请经费
  budgetTotal: '15',
  
  // 研究内容摘要
  researchBackground: '心血管疾病是全球首要死因，动脉粥样硬化是心血管疾病的病理基础',
  researchObjective: '构建基于深度学习的颈动脉斑块自动检测模型',
  researchMethod: 'YOLOv8迁移学习+昆山队列训练验证',
  expectedOutcome: '检测准确率≥85%，发表论文2-3篇，申请专利1-2项',
  
  // 创新点
  innovation1: '首次将深度学习应用于大规模无症状人群颈动脉斑块筛查',
  innovation2: '结合UKB预训练模型与本土数据进行fine-tuning',
  
  // 绩效目标
  performance1: '检测准确率≥85%',
  performance2: '发表SCI论文2-3篇',
  performance3: '申请发明专利1-2项',
  performance4: '开发原型系统1套',
};

// 替换占位符
console.log('填充数据到模板...');

for (const [key, value] of Object.entries(data)) {
  // 替换 ${key} 格式
  documentXml = documentXml.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
  
  // 也尝试替换下划线格式
  documentXml = documentXml.replace(new RegExp(`_${key}_`, 'g'), value);
}

// 特殊处理：清理模板中的提示文字
documentXml = documentXml.replace(/（申请课题名称）/g, data.projectName);
documentXml = documentXml.replace(/（申请支持资金的类别ABC）/g, data.fundType);
documentXml = documentXml.replace(/（万元）/g, data.budgetTotal);

// 写回XML
zip.updateFile('word/document.xml', documentXml);

// 保存
zip.writeZip(OUTPUT_PATH);

console.log(`DOCX生成完成: ${OUTPUT_PATH}`);

// 验证文件
const stats = fs.statSync(OUTPUT_PATH);
console.log(`文件大小: ${stats.size} bytes`);
