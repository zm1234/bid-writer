# Docx Template Filler Skill

## 概述

用于将内容按DOCX模板格式填充，生成标准格式的Word文档。

## 功能

1. **解析DOCX模板** - 提取模板中的段落占位符和表格结构
2. **内容映射** - 将数据映射到模板对应位置
3. **格式保持** - 保持模板原有格式（字体、字号、对齐等）
4. **表格处理** - 支持填写表格内容
5. **多页支持** - 支持长文档多页生成

## 使用方法

```javascript
const { DocxTemplateFiller } = require('./docx-template-filler');

const filler = new DocxTemplateFiller();

// 1. 分析模板
const template = await filler.analyzeTemplate('template.docx');

// 2. 准备数据
const data = {
  projectName: "项目名称",
  applicantName: "申请人姓名",
  // ... 其他字段
};

// 3. 填充模板
await filler.fillTemplate(template, data, 'output.docx');
```

## 模板占位符格式

在Word模板中使用 `${fieldName}` 作为占位符，例如：
- `${projectName}` - 项目名称
- `${applicantName}` - 申请人姓名
- `${budget15}` - 15万预算
