#!/bin/bash
# Bid Writer 开发验证脚本

set -e

echo "=== Bid Writer 开发验证 ==="

# 1. 检查目录结构
echo ""
echo "1. 检查目录结构..."
test -d "apps/web" && echo "  ✓ apps/web exists"
test -d "packages/agents" && echo "  ✓ packages/agents exists"
test -d "packages/workflow" && echo "  ✓ packages/workflow exists"
test -d "packages/shared" && echo "  ✓ packages/shared exists"
test -d "packages/database" && echo "  ✓ packages/database exists"
test -d "prisma" && echo "  ✓ prisma exists"
test -d "data/projects" && echo "  ✓ data/projects exists"

# 2. 检查核心文件
echo ""
echo "2. 检查核心文件..."
test -f "packages/workflow/src/index.ts" && echo "  ✓ WorkflowEngine exists"
test -f "packages/agents/src/agents/format-validator.ts" && echo "  ✓ FormatValidator exists"
test -f "packages/shared/src/utils/template-loader.ts" && echo "  ✓ TemplateLoader exists"
test -f "packages/shared/src/utils/docx-generator.ts" && echo "  ✓ DocxGenerator exists"
test -f "prisma/schema.prisma" && echo "  ✓ Prisma schema exists"

# 3. 检查示例数据
echo ""
echo "3. 检查示例数据..."
test -d "data/projects/2026-beijing-integrative-medicine" && echo "  ✓ 项目目录 exists"
test -f "data/projects/2026-beijing-integrative-medicine/metadata.json" && echo "  ✓ metadata.json exists"

# 4. 统计
echo ""
echo "4. 统计信息..."
FILE_COUNT=$(find . -type f \( -name "*.ts" -o -name "*.json" -o -name "*.md" \) | wc -l)
echo "  文件总数: $FILE_COUNT"

echo ""
echo "=== 验证完成 ==="
