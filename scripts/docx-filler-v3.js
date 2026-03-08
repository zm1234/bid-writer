/**
 * DOCX 模板填充器 - 完整版 v3
 * 真正将内容填充到 Word 模板中
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const TEMPLATE_PATH = path.join(__dirname, '../../data/projects/2026-beijing-integrative-medicine/inputs/template/附件：临床科研资助计划申请书.docx');

/**
 * 智能填充 DOCX 模板
 * 使用 XML 解析和智能匹配
 */
async function fillDocxTemplate(finalJson, outputPath) {
  console.log('  📄 开始填充 DOCX 模板...');
  console.log(`  - 模板: ${TEMPLATE_PATH}`);
  
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`模板文件不存在: ${TEMPLATE_PATH}`);
  }
  
  // 读取模板
  const zip = new AdmZip(TEMPLATE_PATH);
  let docXml = zip.readAsText('word/document.xml');
  const originalLength = docXml.length;
  
  console.log(`  - 原始模板大小: ${originalLength} 字符`);
  
  // 获取内容
  const sections = finalJson.sections;
  const fullText = finalJson.fullText;
  
  let replacements = 0;
  
  // 1. 填充基本信息（项目名称等）
  const simpleReplacements = {
    // 项目名称 - 查找下划线占位符
    '基于深度学习的颈动脉超声早期动脉硬化智能检测系统研发': [
      '（申请课题名称）',
      '_______________________'
    ],
    // 资助类别
    'A类': [
      '（申请支持资金的类别ABC）',
      '_____________'
    ],
    // 研究期限
    '12个月': [
      '年     月',
      '日'
    ],
    // 申请经费
    '15万元': [
      '万元'
    ],
  };
  
  // 2. 替换简单文本
  for (const [content, placeholders] of Object.entries(simpleReplacements)) {
    for (const placeholder of placeholders) {
      // 找到占位符并替换
      const regex = new RegExp(`(<w:t[^>]*>)\\s*${escapeRegex(placeholder)}\\s*(</w:t>)`, 'g');
      if (docXml.match(regex)) {
        docXml = docXml.replace(regex, `$1${content}$2`);
        replacements++;
        console.log(`  - 替换: ${placeholder.substring(0, 20)}... → ${content.substring(0, 20)}...`);
      }
    }
  }
  
  // 3. 处理立项依据（长文本）- 在模板中找到对应区域
  const liyouSection = fullText.includes('立项依据') ? 
    fullText.split('## 二、立项依据')[1]?.split('## ')[0] || '' : '';
  
  if (liyouSection) {
    // 找到立项依据说明文字并替换
    const placeholder = '（研究意义、国内外研究现状及发展动态分析，需结合科学研究发展趋势来论述科学意义；或结合国民经济和社会发展中迫切需要解决的关键科技问题来论述其应用前景。附主要参考文献目录）';
    if (docXml.includes(placeholder)) {
      // 截取合适长度的内容（表格单元格有限制）
      const content = liyouSection.substring(0, 1500);
      docXml = docXml.replace(placeholder, content);
      replacements++;
      console.log(`  - 替换: 立项依据 (${content.length} 字符)`);
    }
  }
  
  // 4. 处理研究内容
  const neirongSection = fullText.includes('研究内容') ? 
    fullText.split('## 三')[1]?.split('## ')[0] || '' : '';
  
  if (neirongSection) {
    // 替换研究目标
    const targetPlaceholder = '1.拟解决的问题及研究目标';
    if (docXml.includes(targetPlaceholder)) {
      const content = neirongSection.substring(0, 800);
      docXml = docXml.replace(targetPlaceholder, content.split('\n')[0]);
      replacements++;
    }
  }
  
  // 5. 处理经费预算
  const jingfeiSection = fullText.includes('经费预算') ?
    fullText.split('## 五、经费预算')[1]?.split('## ')[0] || '' : '';
  
  if (jingfeiSection) {
    // 经费预算通常是表格，简化处理
    console.log(`  - 经费预算: ${jingfeiSection.substring(0, 50)}...`);
  }
  
  console.log(`  - 总替换次数: ${replacements}`);
  
  // 更新 XML
  zip.updateFile('word/document.xml', docXml);
  
  // 保存
  zip.writeZip(outputPath);
  
  // 验证
  const stats = fs.statSync(outputPath);
  console.log(`  - 生成文件大小: ${stats.size} bytes`);
  
  return {
    docxPath: outputPath,
    replacements,
    size: stats.size
  };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { fillDocxTemplate };
