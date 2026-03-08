/**
 * DOCX 模板填充器 - 完整版
 * 真正将内容填充到 Word 模板中
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const TEMPLATE_PATH = path.join(__dirname, '../data/projects/2026-beijing-integrative-medicine/inputs/template/附件：临床科研资助计划申请书.docx');

/**
 * 智能填充 DOCX 模板
 * 策略：找到模板中的空白位置，用内容替换
 */
async function fillDocxTemplate(sections, outputPath) {
  console.log('  📄 开始填充 DOCX 模板...');
  
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`模板文件不存在: ${TEMPLATE_PATH}`);
  }
  
  // 读取模板
  const zip = new AdmZip(TEMPLATE_PATH);
  let docXml = zip.readAsText('word/document.xml');
  const originalLength = docXml.length;
  
  console.log(`  - 原始模板大小: ${originalLength} 字符`);
  
  // 创建内容映射
  const contentMap = buildContentMap(sections);
  
  // 策略1: 替换下划线后面的空白内容
  // 遍历所有 <w:t> 标签，找到后面有下划线的
  let replacements = 0;
  
  // 1. 填充简单字段（基于标签匹配）
  const simpleFields = {
    '项目名称': '基于深度学习的颈动脉超声早期动脉硬化智能检测系统研发',
    '资助类别': 'A类',
    '支持类别': 'A类',
    '申请经费': '15万元',
    '研究期限': '12个月',
    '主要研究领域': '医学影像学、人工智能诊断、心血管疾病筛查',
  };
  
  for (const [key, value] of Object.entries(simpleFields)) {
    // 找到包含key的标签后面的第一个空白文本并替换
    const pattern = new RegExp(`(<w:t[^>]*>[^<]*${key}[^<]*</w:t>)\\s*(<w:t>)\\s*(_{1,20})\\s*(</w:t>)`, 'g');
    const match = docXml.match(pattern);
    if (match) {
      // 替换下划线
      docXml = docXml.replace(pattern, `$1$2${value}$4`);
      replacements++;
    }
  }
  
  // 2. 填充立项依据（长文本）- 找到对应的表格单元格
  const liyouSection = sections.find(s => s.title.includes('立项依据'));
  if (liyouSection) {
    // 在模板中找到"立项依据"标题后面的表格
    // 由于表格结构复杂，我们使用文本替换策略
    const liyouPlaceholder = '（研究意义、国内外研究现状及发展动态分析，需结合科学研究发展趋势来论述科学意义；或结合国民经济和社会发展中迫切需要解决的关键科技问题来论述其应用前景。附主要参考文献目录）';
    
    // 替换为实际内容（截断到合适长度）
    const content = liyouSection.content.substring(0, 2000);
    docXml = docXml.replace(liyouPlaceholder, content);
    replacements++;
  }
  
  // 3. 填充主要研究内容
  const yanjiuSection = sections.find(s => s.title.includes('研究内容'));
  if (yanjiuSection) {
    // 替换研究目标
    docXml = docXml.replace('1.拟解决的问题及研究目标', yanjiuSection.content.substring(0, 500));
    replacements++;
  }
  
  // 4. 填充经费预算
  const budgetSection = sections.find(s => s.title.includes('经费预算'));
  if (budgetSection) {
    docXml = docXml.replace('（1）设备购置费', budgetSection.content.substring(0, 300));
    replacements++;
  }
  
  console.log(`  - 完成的替换: ${replacements} 次`);
  
  // 更新 document.xml
  zip.updateFile('word/document.xml', docXml);
  
  // 保存 DOCX
  zip.writeZip(outputPath);
  
  // 验证
  const newZip = new AdmZip(outputPath);
  const newDocXml = newZip.readAsText('word/document.xml');
  
  console.log(`  - 新模板大小: ${newDocXml.length} 字符`);
  console.log(`  - 变化: ${newDocXml.length - originalLength} 字符`);
  
  return {
    docxPath: outputPath,
    replacements
  };
}

/**
 * 构建内容映射
 */
function buildContentMap(sections) {
  const map = {};
  
  for (const section of sections) {
    if (section.title.includes('基本情况')) {
      map['basic'] = section.content;
    } else if (section.title.includes('立项依据')) {
      map['liyou'] = section.content;
    } else if (section.title.includes('研究内容')) {
      map['neirong'] = section.content;
    } else if (section.title.includes('基础')) {
      map['jichu'] = section.content;
    } else if (section.title.includes('经费')) {
      map['jingfei'] = section.content;
    } else if (section.title.includes('承诺')) {
      map['chengnuo'] = section.content;
    }
  }
  
  return map;
}

module.exports = { fillDocxTemplate };
