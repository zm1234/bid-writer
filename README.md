# Bid Writer - 智能标书撰写系统

基于多Agent协作的智能标书撰写系统，参考 ResearchX 架构设计。

## 功能特性

- 🤖 **多Agent协作**：PRD确认 → 规则规划 → 初稿撰写 → 初稿审核 → 终稿确认
- 📄 **模板支持**：支持加载官方申请书模板，按模板格式生成终稿
- 🔍 **信息检索**：集成 Tavily MCP，支持自动网络检索
- ✅ **格式校验**：自动检查章节对齐、字数限制
- 📝 **DOCX生成**：按模板格式生成 Word 文档

## 技术栈

- **运行时**：Next.js + TypeScript
- **数据库**：SQLite + Prisma
- **Agent框架**：自定义 Agent 基类
- **文档生成**：自定义 DOCX 生成器

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入配置
```

### 4. 启动开发服务器

```bash
pnpm dev
```

## 项目结构

```
bid-writer/
├── apps/web/           # Next.js 主应用
├── packages/
│   ├── agents/        # Agent 实现
│   ├── shared/        # 共享工具
│   ├── workflow/      # 工作流引擎
│   └── database/      # 数据库层
├── prisma/            # 数据模型
├── data/              # 项目数据
│   └── projects/      # 标书项目
└── tests/             # 测试
```

## Agent 流程

```
1. PRD确认 Agent      → 理解项目背景，生成PRD
2. 规则规划 Agent     → 提取规则，加载模板章节
3. 初稿撰写 Agent     → 按章节撰写内容
4. 初稿审核 Agent     → 检查错别字、病句、风格
5. 格式校验 Agent     → 检查章节对齐、字数
6. 终稿确认 Agent     → 生成DOCX终稿
```

## 模板处理

- **有模板**：按模板章节结构撰写 → 按模板格式生成DOCX
- **无模板**：使用通用结构撰写 → 生成通用格式

## 信息可信度

| 等级 | 来源 | 可信度 |
|---|---|---|
| L0 | 用户直接提供 | ⭐⭐⭐⭐⭐ |
| L1 | 人工审核确认 | ⭐⭐⭐⭐ |
| L2 | 网络自动获取 | ⭐⭐ |

## MCP 工具

- **Tavily**：网络搜索和信息检索

配置方法：
```bash
claude mcp add --transport http tavily "https://mcp.tavily.com/mcp/?tavilyApiKey=<你的API-KEY>"
```

## 许可证

MIT
