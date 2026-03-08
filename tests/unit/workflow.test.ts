import { describe, it, expect } from "vitest";
import { WorkflowEngine } from "@bid-writer/workflow";

describe("WorkflowEngine", () => {
  it("should create a new project", async () => {
    const engine = new WorkflowEngine();
    const project = await engine.initialize("测试项目");
    
    expect(project).toBeDefined();
    expect(project.name).toBe("测试项目");
    expect(project.status).toBe("created");
  });
  
  it("should track workflow state", async () => {
    const engine = new WorkflowEngine();
    const project = await engine.initialize("测试项目2");
    
    const state = await engine.getWorkflowState(project.id);
    
    expect(state.projectId).toBe(project.id);
    expect(state.currentStep).toBe("initialized");
  });
});
