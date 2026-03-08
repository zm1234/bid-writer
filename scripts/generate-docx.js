/**
 * 生成标书DOCX
 */
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require("docx");
const fs = require("fs");

// 读取markdown内容
const markdown = fs.readFileSync("./data/projects/2026-beijing-integrative-medicine/outputs/final-draft.md", "utf-8");

// 解析章节
const sections = [];
let currentSection = { title: "", content: "" };

const lines = markdown.split("\n");
for (const line of lines) {
  if (line.startsWith("# ")) {
    if (currentSection.title) {
      sections.push(currentSection);
    }
    currentSection = { title: line.replace("# ", ""), content: "" };
  } else if (line.startsWith("## ")) {
    if (currentSection.title) {
      sections.push(currentSection);
    }
    currentSection = { title: line.replace("## ", ""), content: "" };
  } else if (line.trim()) {
    currentSection.content += line + "\n";
  }
}
if (currentSection.title) {
  sections.push(currentSection);
}

// 生成DOCX
const docChildren = [];

for (const section of sections) {
  // 标题
  docChildren.push(
    new Paragraph({
      text: section.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // 内容
  const contentLines = section.content.split("\n").filter(l => l.trim());
  for (const line of contentLines) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun(line)],
        spacing: { after: 100 },
        indentation: { firstLine: 420 },
      })
    );
  }
}

const doc = new Document({
  sections: [{
    properties: {},
    children: docChildren,
  }],
});

// 保存
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(
    "./data/projects/2026-beijing-integrative-medicine/outputs/标书终稿-深度学习颈动脉检测.docx",
    buffer
  );
  console.log("DOCX生成完成！");
});
