/**
 * DOCX 生成器
 * 按模板格式生成Word文档
 */

import * as fs from "fs";
import * as path from "path";

export interface DocxSection {
  title: string;
  content: string;
}

export interface DocxOptions {
  title?: string;
  author?: string;
  fontName?: string;
  fontSize?: number;
}

/**
 * 生成简单的 DOCX 文件（基于 XML）
 * 实际生产环境建议使用 docx 库
 */
export async function generateDocx(
  sections: DocxSection[],
  outputPath: string,
  options: DocxOptions = {}
): Promise<void> {
  const {
    title = "标书",
    author = "Bid Writer",
    fontName = "宋体",
    fontSize = 12,
  } = options;

  // 生成 document.xml 内容
  const documentXml = generateDocumentXml(sections, fontName, fontSize);
  
  // 生成 [Content_Types].xml
  const contentTypes = generateContentTypes();
  
  // 生成 _rels/.rels
  const rels = generateRels();
  
  // 生成 app.xml
  const appXml = generateAppXml(title, sections.length);
  
  // 生成 core.xml
  const coreXml = generateCoreXml(title, author);
  
  // 创建临时目录
  const tempDir = outputPath.replace(".docx", "_temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // 写入文件
  fs.writeFileSync(path.join(tempDir, "word/document.xml"), documentXml);
  fs.writeFileSync(path.join(tempDir, "[Content_Types].xml"), contentTypes);
  fs.mkdirSync(path.join(tempDir, "_rels"), { recursive: true });
  fs.writeFileSync(path.join(tempDir, "_rels/.rels"), rels);
  fs.mkdirSync(path.join(tempDir, "docProps"), { recursive: true });
  fs.writeFileSync(path.join(tempDir, "docProps/app.xml"), appXml);
  fs.writeFileSync(path.join(tempDir, "docProps/core.xml"), coreXml);
  
  // 创建 ZIP
  await createZip(tempDir, outputPath);
  
  // 清理临时目录
  fs.rmSync(tempDir, { recursive: true });
}

/**
 * 生成 document.xml
 */
function generateDocumentXml(sections: DocxSection[], fontName: string, fontSize: number): string {
  let body = "";
  
  for (const section of sections) {
    // 标题
    body += `
      <w:p>
        <w:pPr>
          <w:pStyle w:val="1"/>
          <w:jc w:val="center"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b w:val="true"/>
            <w:sz w:val="${fontSize * 2}"/>
          </w:rPr>
          <w:t>${escapeXml(section.title)}</w:t>
        </w:r>
      </w:p>
    `;
    
    // 内容（处理换行）
    const paragraphs = section.content.split(/\n\n+/);
    for (const para of paragraphs) {
      if (para.trim()) {
        body += `
          <w:p>
            <w:pPr>
              <w:ind w:firstLine="420"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="${fontSize * 2}"/>
              </w:rPr>
              <w:t>${escapeXml(para.trim())}</w:t>
            </w:r>
          </w:p>
        `;
      }
    }
    
    // 段落间距
    body += `<w:p><w:pPr><w:spacing w:after="200"/></w:pPr></w:p>`;
  }
  
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

/**
 * 生成 [Content_Types].xml
 */
function generateContentTypes(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;
}

/**
 * 生成 _rels/.rels
 */
function generateRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

/**
 * 生成 app.xml
 */
function generateAppXml(title: string, sectionCount: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Bid Writer</Application>
  <AppVersion>1.0</AppVersion>
  <Company/>
  <Manager/>
  <Pages>${Math.ceil(sectionCount / 2)}</Pages>
  <Paragraphs>${sectionCount * 3}</Paragraphs>
  <Title>${escapeXml(title)}</Title>
</Properties>`;
}

/**
 * 生成 core.xml
 */
function generateCoreXml(title: string, author: string): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>${escapeXml(author)}</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

/**
 * XML 转义
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 创建 ZIP 文件
 */
async function createZip(sourceDir: string, outputPath: string): Promise<void> {
  const { execSync } = require("child_process");
  
  try {
    // 使用 zip 命令
    execSync(`cd "${sourceDir}" && zip -r "${outputPath}" . -x "*.DS_Store"`, {
      stdio: "pipe",
    });
  } catch (error) {
    // 如果没有 zip，使用 Node.js 内置方式
    const archiver = await import("archiver");
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver.default("zip", { zlib: { level: 9 } });
      
      output.on("close", () => resolve());
      archive.on("error", (err: Error) => reject(err));
      
      archive.directory(sourceDir, false);
      archive.pipe(output);
      archive.finalize();
    });
  }
}

/**
 * 便捷函数：生成标书 DOCX
 */
export async function generateBidDocument(
  sections: DocxSection[],
  outputPath: string,
  options?: DocxOptions
): Promise<void> {
  await generateDocx(sections, outputPath, {
    title: "临床科研资助计划项目申请书",
    ...options,
  });
}
