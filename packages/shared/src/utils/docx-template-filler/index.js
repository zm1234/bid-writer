/**
 * DOCX模板解析和填充器
 * 用于将内容按DOCX模板格式填充
 */

const fs = require('fs');
const path = require('path');
const { parseXml, fastJoin } = require('xml速度优化');

/**
 * 解析DOCX模板，提取占位符和格式信息
 */
async function analyzeTemplate(templatePath) {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(templatePath);
  
  // 读取document.xml
  const documentXml = zip.readAsText('word/document.xml');
  
  // 解析XML
  const template = {
    filePath: templatePath,
    placeholders: [],
    tables: [],
    styles: {},
  };
  
  // 提取占位符 ${xxx}
  const placeholderRegex = /\$\{(\w+)\}/g;
  let match;
  while ((match = placeholderRegex.exec(documentXml)) !== null) {
    template.placeholders.push(match[1]);
  }
  
  // 提取表格信息
  const tableRegex = /<w:tbl>(.*?)<\/w:tbl>/g;
  while ((match = tableRegex.exec(documentXml)) !== null) {
    template.tables.push(parseTable(match[1]));
  }
  
  return template;
}

/**
 * 解析表格
 */
function parseTable(tableXml) {
  const rows = [];
  const rowRegex = /<w:tr>(.*?)<\/w:tr>/g;
  let match;
  
  while ((match = rowRegex.exec(tableXml)) !== null) {
    const cells = [];
    const cellRegex = /<w:tc>(.*?)<\/w:tc>/g;
    let cellMatch;
    
    while ((cellMatch = cellRegex.exec(match[1])) !== null) {
      const text = extractText(cellMatch[1]);
      cells.push(text);
    }
    
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  
  return rows;
}

/**
 * 从XML提取文本
 */
function extractText(xml) {
  const textRegex = /<w:t>([^<]*)<\/w:t>/g;
  const texts = [];
  let match;
  
  while ((match = textRegex.exec(xml)) !== null) {
    texts.push(match[1]);
  }
  
  return texts.join('');
}

/**
 * 填充模板
 */
async function fillTemplate(templatePath, data, outputPath) {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(templatePath);
  
  // 读取document.xml
  let documentXml = zip.readAsText('word/document.xml');
  
  // 替换占位符
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    documentXml = documentXml.replace(regex, value);
  }
  
  // 写回
  zip.updateFile('word/document.xml', documentXml);
  
  // 保存
  zip.writeZip(outputPath);
}

/**
 * 便捷函数：创建填充器
 */
function createTemplateFiller() {
  return {
    analyze: analyzeTemplate,
    fill: fillTemplate,
  };
}

module.exports = {
  analyzeTemplate,
  fillTemplate,
  createTemplateFiller,
};
