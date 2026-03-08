/**
 * Bid Writer 共享工具函数
 */

import { z } from "zod";

// ============== ID 生成器 ==============

/**
 * 生成项目 ID
 * @returns 格式：bid_YYYYMMDD_xxxxxx
 */
export function generateProjectId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 8);
  return `bid_${dateStr}_${random}`;
}

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = "id"): string {
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${random}`;
}

// ============== 时间工具 ==============

/**
 * 获取当前 ISO 时间戳
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * 格式化日期显示
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 计算相对时间
 */
export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
  
  const intervals: [number, string][] = [
    [31536000, "年"],
    [2592000, "个月"],
    [604800, "周"],
    [86400, "天"],
    [3600, "小时"],
    [60, "分钟"],
  ];
  
  for (const [interval, unit] of intervals) {
    const count = Math.floor(seconds / interval);
    if (count >= 1) {
      return `${count}${unit}前`;
    }
  }
  
  return "刚刚";
}

// ============== 文本处理 ==============

/**
 * 计算中文字数
 */
export function countChineseWords(text: string): number {
  // 去除空白字符
  const trimmed = text.trim();
  // 中文字符计数
  const chineseChars = (trimmed.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 英文单词计数
  const englishWords = (trimmed.match(/[a-zA-Z]+/g) || []).length;
  // 数字计数
  const numbers = (trimmed.match(/\d+/g) || []).length;
  
  return chineseChars + englishWords + numbers;
}

/**
 * 截断文本并添加省略号
 */
export function truncate(text: string, maxLength: number, suffix: string = "..."): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 生成文本摘要
 */
export function generateSummary(text: string, maxSentences: number = 3): string {
  const sentences = text.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
  return sentences.slice(0, maxSentences).join("。") + "。";
}

/**
 * 清理文本中的多余空白
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

// ============== 验证工具 ==============

/**
 * 安全地解析 Zod schema
 */
export function safeParse<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors.map(e => e.message).join("; "),
  };
}

/**
 * 验证并解析 schema，失败时抛出错误
 */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = safeParse(schema, data);
  if (!result.success) {
    throw new Error(`Validation error: ${result.error}`);
  }
  return result.data;
}

// ============== 数组工具 ==============

/**
 * 安全地获取数组元素
 */
export function safeGet<T>(arr: T[], index: number, defaultValue: T): T {
  if (index < 0 || index >= arr.length) return defaultValue;
  return arr[index];
}

/**
 * 移动数组元素
 */
export function moveArrayElement<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...arr];
  const [element] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, element);
  return result;
}

/**
 * 按字段排序
 */
export function sortBy<T>(arr: T[], key: keyof T, ascending: boolean = true): T[] {
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });
}

// ============== 对象工具 ==============

/**
 * 深度合并对象
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceVal = source[key];
      const targetVal = target[key as keyof T];
      
      if (
        typeof sourceVal === "object" &&
        sourceVal !== null &&
        !Array.isArray(sourceVal) &&
        typeof targetVal === "object" &&
        targetVal !== null &&
        !Array.isArray(targetVal)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetVal as object,
          sourceVal as object
        );
      } else {
        (result as Record<string, unknown>)[key] = sourceVal;
      }
    }
  }
  
  return result;
}

/**
 * 移除对象中的空值
 */
export function removeEmptyValues<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (value !== null && value !== undefined && value !== "") {
        result[key] = value;
      }
    }
  }
  
  return result;
}

// ============== 格式化输出 ==============

/**
 * 格式化 JSON 输出
 */
export function formatJSON(data: unknown, indent: number = 2): string {
  return JSON.stringify(data, null, indent);
}

/**
 * 将对象转换为查询参数
 */
export function toQueryString(params: Record<string, string | number | boolean | null>): string {
  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== null) {
      searchParams.append(key, String(value));
    }
  }
  
  return searchParams.toString();
}

// ============== 文件路径工具 ==============

/**
 * 生成项目文件路径
 */
export function getProjectPath(projectId: string, ...segments: string[]): string {
  return ["data", "projects", projectId, ...segments].join("/");
}

/**
 * 确保路径以斜杠结尾
 */
export function ensureTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : path + "/";
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

/**
 * 获取不带扩展名的文件名
 */
export function getFileNameWithoutExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length > 1) {
    parts.pop();
  }
  return parts.join(".");
}

// ============== 常量定义 ==============

export const SECTION_TYPE_LABELS: Record<string, string> = {
  abstract: "项目摘要",
  background: "研究背景与意义",
  objectives: "研究目标与内容",
  methods: "研究方法与技术路线",
  outcomes: "预期成果",
  foundation: "研究基础与条件",
  schedule: "进度安排",
  budget: "经费预算",
};

export const AGENT_TYPE_LABELS: Record<string, string> = {
  prd_confirm: "PRD 确认",
  rule_planner: "规则规划",
  draft_writer: "初稿撰写",
  draft_reviewer: "初稿审核",
  final_confirmer: "终稿确认",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  created: "已创建",
  prd_confirmed: "PRD 已确认",
  rules_planned: "规则已规划",
  drafting: "撰写中",
  reviewing: "审核中",
  finalizing: "终稿确认中",
  completed: "已完成",
};

export const ISSUE_SEVERITY_LABELS: Record<string, string> = {
  error: "错误",
  warning: "警告",
  suggestion: "建议",
};
