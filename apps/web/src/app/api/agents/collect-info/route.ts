import { NextRequest, NextResponse } from "next/server";

// GET /api/agents/collect-info - 获取信息收集模板
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      template: {
        required: [
          { field: "title", label: "项目标题", type: "text" },
          { field: "background", label: "项目背景", type: "textarea" },
          { field: "researchProblem", label: "研究问题", type: "textarea" },
          { field: "objectives", label: "研究目标", type: "textarea" },
          { field: "expectedOutcomes", label: "预期成果", type: "textarea" },
          { field: "timeline", label: "研究周期", type: "text" },
          { field: "budget", label: "预算范围", type: "text" },
        ],
        optional: [
          { field: "keywords", label: "关键词", type: "text" },
          { field: "references", label: "参考文献", type: "textarea" },
          { field: "dataSources", label: "数据来源", type: "textarea" },
        ]
      },
      guidelines: [
        "尽可能详细地描述项目背景和目标",
        "明确说明预期成果（论文、专利、软件等）",
        "提供已有的研究基础（如有）",
        "注明预算范围和希望的研究周期"
      ]
    }
  });
}

// POST /api/agents/collect-info - 收集信息并创建PRD
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, userInput, collectedInfo } = body;

    if (!userInput) {
      return NextResponse.json(
        { success: false, error: "userInput is required" },
        { status: 400 }
      );
    }

    // 解析用户输入，提取关键信息
    const extracted = extractProjectInfo(userInput);
    
    // 合并收集到的信息
    const merged = { ...extracted, ...collectedInfo };
    
    // 计算信息完整度
    const completeness = calculateCompleteness(merged);

    // 如果完整度 >= 60%，可以自动创建PRD
    const canCreatePRD = completeness >= 60;

    return NextResponse.json({
      success: true,
      data: {
        extracted,
        completeness,
        canCreatePRD,
        suggestions: completeness < 100 
          ? getSuggestions(merged)
          : [],
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function extractProjectInfo(input: string) {
  // 简单的信息提取逻辑
  // 实际应该使用LLM来解析
  return {
    rawInput: input,
    extractedAt: new Date().toISOString(),
  };
}

function calculateCompleteness(data: Record<string, unknown>) {
  const requiredFields = ["title", "background", "researchProblem", "objectives", "expectedOutcomes"];
  const filled = requiredFields.filter(field => data[field] && (data[field] as string).length > 10);
  return Math.round((filled.length / requiredFields.length) * 100);
}

function getSuggestions(data: Record<string, unknown>) {
  const suggestions: string[] = [];
  
  if (!data.title || (data.title as string).length < 5) {
    suggestions.push("请提供明确的项目标题");
  }
  if (!data.background || (data.background as string).length < 50) {
    suggestions.push("请详细描述项目背景");
  }
  if (!data.objectives) {
    suggestions.push("请明确说明研究目标");
  }
  if (!data.expectedOutcomes) {
    suggestions.push("请列出预期的研究成果");
  }
  
  return suggestions;
}
