/**
 * DOCX 生成器 - 简化版
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const TEMPLATE_PATH = path.join(__dirname, '../data/projects/2026-beijing-integrative-medicine/inputs/template/附件：临床科研资助计划申请书.docx');

async function generateDocx(sections, outputPath) {
  // 如果有模板，使用模板
  if (fs.existsSync(TEMPLATE_PATH)) {
    console.log('  📄 使用模板生成 DOCX...');
    await generateFromTemplate(sections, outputPath);
  } else {
    console.log('  📄 生成基础 DOCX...');
    await generateBasic(sections, outputPath);
  }
  console.log(`  ✅ DOCX 已保存: ${outputPath}`);
}

async function generateFromTemplate(sections, outputPath) {
  const zip = new AdmZip(TEMPLATE_PATH);
  const docXml = zip.readAsText('word/document.xml');
  
  // 简单替换：找到标题和内容
  let newContent = docXml;
  
  sections.forEach((section, index) => {
    // 替换标题
    const titleTag = `<w:t>${index + 1}</w:t>`;
    const titleContent = `<w:t>${section.title}</w:t>`;
    newContent = newContent.replace(titleTag, titleContent);
    
    // 替换内容（简化版）
    const contentMatch = newContent.match(/<w:t>[\s\S]*?<\/w:t>/);
    if (contentMatch) {
      const contentTag = `<w:t>${section.content.substring(0, 100)}</w:t>`;
      newContent = newContent.replace(contentMatch[0], contentTag);
    }
  });
  
  zip.updateFile('word/document.xml', newContent);
  zip.writeZip(outputPath);
}

async function generateBasic(sections, outputPath) {
  // 创建基础 DOCX 结构
  const zip = new AdmZip();
  
  // [Content_Types].xml
  zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`));
  
  // _rels/.rels
  zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`));
  
  // word/document.xml
  let body = '';
  sections.forEach(section => {
    body += `<w:p w:rsidP="00000000"><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${section.title}</w:t></w:r></w:p>`;
    body += `<w:p><w:r><w:t>${section.content}</w:t></w:r></w:p>`;
  });
  
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr>
  </w:body>
</w:document>`;
  
  zip.addFile('word/document.xml', Buffer.from(documentXml));
  
  // word/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:pPr><w:spacing w:after="200"/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="22"/></w:rPr>
  </w:style>
</w:styles>`;
  
  zip.addFile('word/styles.xml', Buffer.from(stylesXml));
  
  zip.writeZip(outputPath);
}

module.exports = { generateDocx };
