/**
 * Agent 基类 - 所有 Agent 的抽象基类
 */

import {
  AgentType,
  AgentState,
  AgentStatus,
  ProjectId,
  generateId,
  now,
} from "@bid-writer/shared";

/**
 * Agent 执行上下文
 */
export interface AgentContext {
  projectId: string;
  userId?: string;
  signal?: AbortSignal;
}

/**
 * Agent 执行结果
 */
export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requiresUserInput?: boolean;
  userQuestion?: string;
}

/**
 * Agent 配置选项
 */
export interface AgentOptions {
  maxIterations?: number;
  timeout?: number;
  verbose?: boolean;
}

/**
 * Agent 抽象基类
 * 
 * 所有 Agent 都必须继承此类并实现 run 方法
 */
export abstract class BaseAgent<TInput = unknown, TOutput = unknown> {
  /** Agent 类型标识 */
  abstract readonly type: AgentType;
  
  /** Agent 显示名称 */
  abstract readonly displayName: string;
  
  /** 当前状态 */
  protected state: AgentState;
  
  /** 配置选项 */
  protected options: AgentOptions;
  
  constructor(options: AgentOptions = {}) {
    this.options = {
      maxIterations: 5,
      timeout: 300000, // 5 分钟默认超时
      verbose: false,
      ...options,
    };
    
    this.state = this.createInitialState();
  }
  
  /**
   * 创建初始状态
   */
  protected createInitialState(): AgentState {
    return {
      projectId: "",
      agentType: this.type,
      status: "idle",
      lastActivity: now(),
    };
  }
  
  /**
   * 更新状态
   */
  protected updateState(updates: Partial<AgentState>): void {
    this.state = {
      ...this.state,
      ...updates,
      lastActivity: now(),
    };
  }
  
  /**
   * 获取当前状态
   */
  getState(): AgentState {
    return { ...this.state };
  }
  
  /**
   * 设置项目 ID
   */
  setProjectId(projectId: string): void {
    this.updateState({ projectId });
  }
  
  /**
   * 记录日志
   */
  protected log(message: string, level: "info" | "warn" | "error" = "info"): void {
    if (this.options.verbose || level === "error") {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${this.displayName}] [${level}] ${message}`);
    }
  }
  
  /**
   * 执行 Agent 任务（由子类实现）
   */
  abstract run(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>>;
  
  /**
   * 处理用户输入（用于循环交互）
   */
  async handleUserInput(input: string, context: AgentContext): Promise<AgentResult<TOutput>> {
    return {
      success: false,
      error: "User input not supported by this agent",
    };
  }
  
  /**
   * 重置状态
   */
  reset(): void {
    this.state = this.createInitialState();
  }
  
  /**
   * 取消执行
   */
  cancel(): void {
    this.updateState({ status: "idle" });
    this.log("Execution cancelled", "warn");
  }
}

/**
 * Agent 工厂函数类型
 */
export type AgentFactory<TInput = unknown, TOutput = unknown> = new (
  options?: AgentOptions
) => BaseAgent<TInput, TOutput>;

/**
 * 注册表 - 用于注册所有可用 Agent
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<AgentType, AgentFactory> = new Map();
  
  private constructor() {}
  
  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }
  
  register(type: AgentType, factory: AgentFactory): void {
    if (this.agents.has(type)) {
      throw new Error(`Agent type "${type}" is already registered`);
    }
    this.agents.set(type, factory);
  }
  
  create<TInput = unknown, TOutput = unknown>(
    type: AgentType,
    options?: AgentOptions
  ): BaseAgent<TInput, TOutput> {
    const factory = this.agents.get(type);
    if (!factory) {
      throw new Error(`Unknown agent type: ${type}`);
    }
    return new factory(options) as BaseAgent<TInput, TOutput>;
  }
  
  getRegisteredTypes(): AgentType[] {
    return Array.from(this.agents.keys());
  }
  
  isRegistered(type: AgentType): boolean {
    return this.agents.has(type);
  }
}

/**
 * Agent 执行器 - 管理 Agent 的生命周期
 */
export class AgentExecutor {
  private runningAgents: Map<string, AgentState> = new Map();
  
  /**
   * 执行 Agent
   */
  async execute<TInput, TOutput>(
    agent: BaseAgent<TInput, TOutput>,
    input: TInput,
    context: AgentContext
  ): Promise<AgentResult<TOutput>> {
    const agentId = `${context.projectId}_${agent.type}`;
    
    // 检查是否已有同名 Agent 在运行
    if (this.runningAgents.has(agentId)) {
      return {
        success: false,
        error: `Agent ${agent.type} is already running for project ${context.projectId}`,
      };
    }
    
    // 注册运行中的 Agent
    this.runningAgents.set(agentId, agent.getState());
    
    try {
      const result = await agent.run(input, context);
      
      if (result.success) {
        this.runningAgents.delete(agentId);
      }
      
      return result;
    } catch (error) {
      this.runningAgents.delete(agentId);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
  
  /**
   * 获取运行中的 Agent 状态
   */
  getRunningState(projectId: string, agentType: AgentType): AgentState | undefined {
    const agentId = `${projectId}_${agentType}`;
    return this.runningAgents.get(agentId);
  }
  
  /**
   * 取消运行中的 Agent
   */
  cancel(projectId: string, agentType: AgentType): boolean {
    const agentId = `${projectId}_${agentType}`;
    return this.runningAgents.delete(agentId);
  }
}
