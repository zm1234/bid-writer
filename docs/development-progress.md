# bid-writer 开发进度记录

## 2026-03-09 - 完成完整工作流引擎 ✅

### 里程碑
- **工作流引擎**: 创建文件系统版本 (`engine-fs.js`)，不依赖数据库
- **运行脚本**: `run-workflow.js` 可独立运行完整工作流
- **标书生成**: 4249 字，通过所有 6 个 Agent 审核
- **GitHub 仓库**: https://github.com/zm1234/bid-writer

### 工作流执行结果
```
[Agent 1] PRD 确认    → ✅ 完成
[Agent 2] 规则规划    → ✅ 完成
[Agent 3] 初稿撰写    → ✅ 4249 字
[Agent 4] 初稿审核    → ✅ 通过（含伦理审查）
[Agent 5] 格式校验    → ✅ 通过
[Agent 6] 终稿确认    → ✅ 完成
```

### 技术决策
- 放弃 Prisma 数据库（v7 breaking changes）
- 采用文件系统存储（简化部署）
- 工作流引擎完全本地化运行

### 下一步
- [ ] 生成 DOCX 格式标书（按模板）
- [ ] 用户填写个人信息
- [ ] 签字并提交

---

## 项目概述

智能标书撰写多Agent系统，参考ResearchX架构

## 项目结构

```
bid-writer/
├── apps/web/                    # Next.js 主应用
│   ├── src/                    # 应用源码
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── packages/                    # Agent 模块（monorepo）
│   ├── shared/                # 共享类型+工具函数
│   │   └── src/
│   │       ├── types/        # 类型定义
│   │       └── utils/        # 工具函数
│   │
│   ├── agents/                # 5个Agent实现
│   │   └── src/
│   │       ├── base.ts      # Agent基类
│   │       └── agents/       # 具体Agent
│   │           ├── prd-confirm.ts
│   │           ├── rule-planner.ts
│   │           ├── draft-writer.ts
│   │           ├── draft-reviewer.ts
│   │           └── final-confirmer.ts
│   │
│   ├── database/             # 数据库操作层
│   │   └── src/
│   │       └── index.ts     # Prisma封装
│   │
│   └── prompt/               # Prompt 模板库
│
├── prisma/                    # 数据模型
│   └── schema.prisma
│
├── data/                      # 项目数据（见下文"数据目录结构"）
│   ├── projects/
│   ├── experience/
│   ├── style-history/
│   └── current-bid -> projects/xxx  # 快捷方式
│
├── docs/                      # 文档
│   ├── adr/                  # 架构决策
│   ├── spec/                 # Agent规范
│   └── development-progress.md
│
├── scripts/                   # 工具脚本
├── package.json              # 根项目配置
├── pnpm-workspace.yaml       # pnpm工作空间
└── tsconfig.json             # TypeScript根配置
```

## 开发状态

| 模块 | 状态 | 备注 |
|---|---|---|
| 项目初始化 | ✅ 完成 | package.json, tsconfig.json, pnpm-workspace.yaml |
| Next.js配置 | ✅ 完成 | apps/web/ 基础配置 |
| Agent规范文档 | ✅ 完成 | docs/spec/ 5个Agent规范 |
| ADR架构决策 | ✅ 完成 | docs/adr/ |
| packages/shared/ | ✅ 完成 | 类型定义+工具函数 |
| packages/agents/ | ✅ 完成 | 基类+5个Agent |
| Prisma Schema | ✅ 完成 | prisma/schema.prisma |
| Database层 | ✅ 完成 | packages/database/src/index.ts |
| API路由 | ⚠️ 部分完成 | 基础框架已创建 |
| 模板加载机制 | ✅ 设计完成 | 见下文 |
| 信息检索链路 | ✅ 实践完成 | Tavily MCP + 浏览器 |

---

## 🔄 Agent流程设计（最终版）

```
1. PRD确认Agent
   ↓
2. 规则规划Agent
   ↓ [加载模板章节结构（可选）]
3. 初稿撰写Agent
   ↓ [按模板章节撰写]
4. 初稿审核Agent
   ↓ [文字审核：错别字/病句/风格]
5. 终稿确认Agent
   ↓ [加载模板格式 → 填充内容 → 生成DOCX]
```

### 模板处理策略

| 时机 | 处理内容 | Agent |
|---|---|---|
| 规则规划阶段 | 模板章节结构（章节目录） | 规则规划Agent |
| 初稿撰写阶段 | 按章节撰写内容 | 初稿撰写Agent |
| 终稿确认阶段 | 模板格式样式（字体/排版） | 终稿确认Agent |

### 模板可选性

- **有模板**：按模板章节结构撰写 → 按模板格式生成DOCX
- **无模板**：使用通用结构撰写 → 生成通用格式DOCX/Markdown

---

## 🔍 信息检索操作链路

### 实践案例：北京整合医学学会标书申请

#### 步骤1：确定信息来源
1. 用户提供微信公众号文章链接
2. 用户提供官网项目详情页链接

#### 步骤2：获取申报通知
- 工具：浏览器 + web_fetch
- 来源：https://www.bahim.org.cn
- 结果：成功获取申报要求详细内容

#### 步骤3：获取申请模板
1. 官网项目详情页 → 找到"附件下载"
2. 下载ZIP文件 → 解压获取DOCX模板
3. 提取DOCX内容 → 解析模板结构

#### 步骤4：信息可信度分级
| 信息 | 来源 | 可信度 |
|---|---|---|
| 申报通知原文 | 官网下载 | L0 |
| 申请书模板 | 官网下载 | L0 |
| 资助金额/截止日期 | 用户提供/官网 | L0 |

### 工具链总结

| 场景 | 工具 | 说明 |
|---|---|---|
| 动态网页 | 浏览器 | 需要登录/JS渲染的页面 |
| 静态内容 | web_fetch | 简单网页内容抓取 |
| 文件下载 | curl | ZIP/DOCX/PDF下载 |
| DOCX解析 | unzip + XML解析 | 提取文本内容 |

### 经验总结

1. **优先官方渠道**：官网 > 公众号 > 第三方
2. **可信度标注**：所有信息必须标注来源和可信度等级
3. **附件获取**：项目详情页通常有附件下载入口
4. **格式处理**：DOCX解压后解析XML获取文本

## 遇到的问题

### 1. Claude Code Session 超时

**问题描述**：
- Claude Code在创建文件时会有交互确认，导致暂停
- 默认无活动超时约10分钟
- 多个session因超时被终止

**解决尝试**：
- 使用 `--max-turns 30` 增加轮次限制
- 通过process工具提交确认响应
- 手动补充创建缺失的文件

**经验**：
- 大型项目建议分批创建
- 复杂项目可以手动创建基础结构

### 2. 文件创建确认

Claude Code在创建文件时会暂停等待确认，影响进度。

---

## 已创建文件清单

### 核心代码
- `packages/shared/src/types/index.ts` - 共享类型定义（PRD、规则、草稿、审核等）
- `packages/shared/src/utils/index.ts` - 工具函数
- `packages/shared/src/index.ts` - 共享包导出

- `packages/agents/src/base.ts` - Agent基类（抽象类+注册表+执行器）
- `packages/agents/src/agents/prd-confirm.ts` - PRD确认Agent
- `packages/agents/src/agents/rule-planner.ts` - 规则规划器Agent
- `packages/agents/src/agents/draft-writer.ts` - 初稿撰写Agent
- `packages/agents/src/agents/draft-reviewer.ts` - 初稿审核Agent
- `packages/agents/src/agents/final-confirmer.ts` - 终稿确认Agent

- `packages/database/src/index.ts` - 数据库操作层

- `prisma/schema.prisma` - Prisma数据模型

### 配置
- `package.json` - 根项目配置
- `pnpm-workspace.yaml` - pnpm工作空间配置
- `tsconfig.json` - TypeScript根配置
- `apps/web/package.json` - Next.js应用配置
- `apps/web/tsconfig.json`
- `apps/web/next.config.js`
- `apps/web/tailwind.config.js`
- `apps/web/postcss.config.js`
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/agents/package.json`
- `packages/agents/tsconfig.json`

### 文档
- `README.md`
- `docs/adr/adr-0001-multi-agent-collaboration.md`
- `docs/spec/agent-prd-confirm.md`
- `docs/spec/agent-rule-planner.md`
- `docs/spec/agent-draft-writer.md`
- `docs/spec/agent-draft-reviewer.md`
- `docs/spec/agent-final-confirmer.md`
- `docs/development-progress.md` - 本文件

### 数据（当前标书项目）
- `data/current-bid/bid-outline.md` - 标书大纲
- `data/current-bid/application-info.md` - 申报要求
- `data/projects/2026-beijing-integrative-medicine/inputs/papers/ukb-carotid-yolo-methods.md` - 论文方法摘要

---

## 下一步计划

1. ✅ 5个Agent已创建完成
2. ✅ Tavily MCP 已配置（信息检索）
3. 创建Next.js API路由（部分完成）
4. 安装依赖并验证
5. 尝试运行项目

---

## 🔧 MCP 配置记录

### Tavily MCP（已配置）

| 项目 | 信息 |
|---|---|
| **用途** | 网络搜索、信息检索 |
| **类型** | 远程 MCP |
| **状态** | ✅ 已连接 |
| **配置时间** | 2026-03-08 |

### 配置命令

```bash
# 添加 Tavily MCP（远程服务器方式）
claude mcp add --transport http tavily "https://mcp.tavily.com/mcp/?tavilyApiKey=<你的API-KEY>"

# 验证配置
claude mcp list
```

### MCP 功能

| 工具 | 用途 |
|---|---|
| `tavily-search` | 实时网页搜索 |
| `tavily-extract` | 网页内容提取 |
| `tavily-map` | 网站结构映射 |
| `tavily-crawl` | 网页爬虫 |

### 相关链接

- 官网：https://tavily.com
- 文档：https://docs.tavily.com
- GitHub：https://github.com/tavily-ai/tavily-mcp
- API申请：https://app.tavily.com/home

---

### Brave Search MCP（待配置）

| 项目 | 信息 |
|---|---|
| **用途** | 搜索引擎查询 |
| **状态** | ⏳ 等待配置 |

需要 Brave Search API Key 后配置。

---

## 📊 信息可信度分级设计

| 等级 | 来源 | 可信度 | 示例 |
|---|---|---|---|
| **L0** | 用户直接提供 | ⭐⭐⭐⭐⭐ | 论文PDF、公众号链接、文件上传 |
| **L1** | 人工审核确认 | ⭐⭐⭐⭐ | 验证过的官方链接、政策文件 |
| **L2** | 网络自动获取 | ⭐⭐ | 搜索引擎结果、第三方内容 |

### 设计原则
- 优先使用用户提供的材料（L0）
- 网络信息必须标记可信度等级
- L2信息需人工确认后才能使用
- 审核过的信息升级为L1

---

## 📂 数据目录结构设计

### 设计原则

- `projects/` - 每个标书任务一个独立文件夹（完整生命周期）
- `experience/` - 跨项目的通用知识（模板、常见问题、领域知识）
- `style-history/` - 用户级别的全局风格偏好

### 完整结构

```
data/
├── projects/                               # 所有标书项目
│   └── 2026-beijing-integrative-medicine/ # 项目1（以项目名命名）
│       ├── metadata.json                   # 项目元信息
│       ├── inputs/                        # 输入资料
│       │   ├── background/               # 背景材料（申报通知等）
│       │   └── papers/                   # 参考文献/论文
│       ├── drafts/                       # 中间草稿（Agent生成）
│       │   ├── 01-prd.json              # PRD确认输出
│       │   ├── 02-rules.json             # 规则规划输出
│       │   ├── 03-draft-v1.md            # 初稿
│       │   ├── 04-review-1.json         # 第1轮审核
│       │   └── 05-draft-v2.md           # 修改后初稿
│       └── outputs/                      # 最终输出
│           ├── final.md                  # 终稿
│           └── reading-guide.md          # 阅读指南
│
├── experience/                            # 跨项目经验（知识库）
│   ├── templates/                        # 标书模板
│   ├── common-issues/                    # 常见问题及解决方案
│   ├── domain-knowledge/                 # 领域知识
│   └── successful-examples/              # 成功案例参考
│
├── style-history/                        # 用户风格偏好（全局）
│   └── default.json
│
└── current-bid -> ../projects/2026-beijing-integrative-medicine  # 快捷方式
```

### 经验库 vs Agent内积累

| 存放位置 | 内容 | 例子 |
|---|---|---|
| **经验库 (data/experience)** | 跨项目的通用知识 | 模板、常见问题、领域知识 |
| **Agent内部** | 项目/会话特定的经验 | 当前项目的上下文、临时反馈 |

---

*更新时间: 2026-03-08 20:52*
