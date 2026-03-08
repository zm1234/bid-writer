import { NextRequest, NextResponse } from "next/server";
import { AgentRegistry } from "@bid-writer/agents";

// POST /api/agents/run - 运行Agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentType, projectId, input } = body;

    if (!agentType || !projectId) {
      return NextResponse.json(
        { success: false, error: "agentType and projectId are required" },
        { status: 400 }
      );
    }

    const registry = AgentRegistry.getInstance();
    
    if (!registry.isRegistered(agentType)) {
      return NextResponse.json(
        { success: false, error: `Unknown agent type: ${agentType}` },
        { status: 400 }
      );
    }

    const agent = registry.create(agentType);
    const result = await agent.run(input, { projectId });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET /api/agents/run - 获取可用的Agent列表
export async function GET() {
  const registry = AgentRegistry.getInstance();
  const types = registry.getRegisteredTypes();

  return NextResponse.json({ 
    success: true, 
    data: { 
      availableAgents: types,
      agentTypes: [
        { type: "prd_confirm", name: "PRD确认" },
        { type: "rule_planner", name: "规则规划" },
        { type: "draft_writer", name: "初稿撰写" },
        { type: "draft_reviewer", name: "初稿审核" },
        { type: "final_confirmer", name: "终稿确认" },
      ]
    } 
  });
}
