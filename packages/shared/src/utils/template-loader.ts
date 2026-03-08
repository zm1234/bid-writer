/**
 * 模板加载工具
 * 解析DOCX模板，提取章节结构和格式样式
 */

import * as fs from "fs";
import * as path from "path";
import * as unzipper from "unzipper";

export interface TemplateSection {
  name: string;
  order: number;
  required: boolean;
  placeholder?: string;
}

export interface TemplateStyle {
  fontName?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  alignment?: "left" | "center" | "right";
}

export interface ParsedTemplate {
  name: string;
  sections: TemplateSection[];
  style: TemplateStyle;
  metadata: {
    filePath: string;
    parsedAt: string;
  };
}

/**
 * 从目录解析模板
 */
export async function parseTemplate(templatePath: string): Promise<ParsedTemplate> {
  const ext = path.extname(templatePath).toLowerCase();
  
  if (ext === ".docx") {
    return parseDocxTemplate(templatePath);
  } else if (ext === ".md") {
    return parseMarkdownTemplate(templatePath);
  } else {
    throw new Error(`Unsupported template format: ${ext}`);
  }
}

/**
 * 解析DOCX模板
 */
async function parseDocxTemplate(filePath: string): Promise<ParsedTemplate> {
  const buffer = await fs.promises.readFile(filePath);
  
  return new Promise((resolve, reject) => {
    zipper.buffer(buffer, (err, zip) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        // 读取 document.xml
        const documentXml = zip.file("word/document.xml")?.asText() || "";
        
        // 解析章节标题（简化版：基于段落样式）
        const sections = extractSectionsFromXml(documentXml);
        
        // 提取样式信息
        const style = extractStylesFromXml(documentXml);
        
        resolve({
          name: path.basename(filePath, ".docx"),
          sections,
          style,
          metadata: {
            filePath,
            parsedAt: new Date().toISOString(),
          },
        });
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

/**
 * 从XML提取章节
 */
function extractSectionsFromXml(xml: string): TemplateSection[] {
  const sections: TemplateSection[] = [];
  
  // 查找常见章节标题模式
  const commonSections = [
    "一、课题及申请人基本情况",
    "二、立项依据",
    "三、主要研究内容",
    "四、研究基础、可行性论证",
    "五、经费预算",
    "六、申请人承诺",
    "七、签字签章",
    "项目摘要",
    "研究背景",
    "研究目标",
    "研究方法",
    "预期成果",
    "研究基础",
    "经费预算",
  ];
  
  let order = 1;
  for (const section of commonSections) {
    if (xml.includes(section)) {
      sections.push({
        name: section,
        order: order++,
        required: true,
        placeholder: `请填写${section}...`,
      });
    }
  }
  
  return sections;
}

/**
 * 从XML提取样式
 */
function extractStylesFromXml(xml: string): TemplateStyle {
  // 简化版样式提取
  return {
    fontName: "宋体",
    fontSize: 12,
    alignment: "left",
  };
}

/**
 * 解析Markdown模板
 */
async function parseMarkdownTemplate(filePath: string): Promise<ParsedTemplate> {
  const content = await fs.promises.readFile(filePath, "utf-8");
  
  const sections: TemplateSection[] = [];
  const lines = content.split("\n");
  
  let order = 1;
  for (const line of lines) {
    // 匹配 # 标题或数字标题
    if (line.match(/^#{1,6}\s+/) || line.match(/^\d+\.\s+/)) {
      const title = line.replace(/^#{1,6}\s+|\d+\.\s+/g, "").trim();
      if (title) {
        sections.push({
          name: title,
          order: order++,
          required: true,
        });
      }
    }
  }
  
  return {
    name: path.basename(filePath, ".md"),
    sections,
    style: {
      fontName: "宋体",
      fontSize: 12,
    },
    metadata: {
      filePath,
      parsedAt: new Date().toISOString(),
    },
  };
}

/**
 * 查找项目模板
 */
export function findTemplate(projectName: string, templateDir: string): string | null {
  if (!fs.existsSync(templateDir)) {
    return null;
  }
  
  const files = fs.readdirSync(templateDir);
  
  // 尝试匹配项目名称
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === ".docx" || ext === ".md") {
      const baseName = path.basename(file, ext);
      if (projectName.includes(baseName) || baseName.includes(projectName)) {
        return path.join(templateDir, file);
      }
    }
  }
  
  return null;
}

/**
 * 加载默认通用模板结构
 */
export function getDefaultTemplateStructure(): TemplateSection[] {
  return [
    { name: "项目摘要", order: 1, required: true },
    { name: "立项依据", order: 2, required: true },
    { name: "研究目标与内容", order: 3, required: true },
    { name: "研究方法与技术路线", order: 4, required: true },
    { name: "研究基础与条件", order: 5, required: true },
    { name: "预期成果", order: 6, required: true },
    { name: "进度安排", order: 7, required: true },
    { name: "经费预算", order: 8, required: true },
  ];
}
