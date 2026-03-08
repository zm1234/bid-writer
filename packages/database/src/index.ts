/**
 * 数据库操作层 - Prisma Client 封装
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ============== 项目操作 ==============

export async function createProject(name: string) {
  return prisma.project.create({
    data: { name },
  });
}

export async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      prd: true,
      rulePlan: true,
      draft: true,
      reviews: true,
      final: true,
      feedbacks: true,
    },
  });
}

export async function updateProjectStatus(id: string, status: string) {
  return prisma.project.update({
    where: { id },
    data: { status },
  });
}

// ============== PRD 操作 ==============

export async function createPRD(projectId: string, data: {
  title: string;
  background: string;
  researchProblem: string;
  researchObjectives: string[];
  expectedOutcomes: string[];
  timeline?: string;
  budget?: string;
}) {
  return prisma.pRD.create({
    data: {
      projectId,
      ...data,
      researchObjectives: JSON.stringify(data.researchObjectives),
      expectedOutcomes: JSON.stringify(data.expectedOutcomes),
    },
  });
}

export async function getPRD(projectId: string) {
  return prisma.pRD.findUnique({
    where: { projectId },
  });
}

// ============== 规则规划操作 ==============

export async function createRulePlan(projectId: string, data: {
  absoluteRules: unknown[];
  styleProfile: unknown;
  writingGuidelines: string;
}) {
  return prisma.rulePlan.create({
    data: {
      projectId,
      absoluteRules: JSON.stringify(data.absoluteRules),
      styleProfile: JSON.stringify(data.styleProfile),
      writingGuidelines: data.writingGuidelines,
    },
  });
}

export async function getRulePlan(projectId: string) {
  return prisma.rulePlan.findUnique({
    where: { projectId },
  });
}

// ============== 草稿操作 ==============

export async function createOrUpdateDraft(projectId: string, data: {
  sections: unknown[];
  totalWordCount: number;
  status: string;
  version?: number;
}) {
  const existing = await prisma.draft.findUnique({ where: { projectId } });
  
  if (existing) {
    return prisma.draft.update({
      where: { projectId },
      data: {
        sections: JSON.stringify(data.sections),
        totalWordCount: data.totalWordCount,
        status: data.status,
        version: existing.version + 1,
      },
    });
  }
  
  return prisma.draft.create({
    data: {
      projectId,
      sections: JSON.stringify(data.sections),
      totalWordCount: data.totalWordCount,
      status: data.status,
      version: 1,
    },
  });
}

export async function getDraft(projectId: string) {
  return prisma.draft.findUnique({
    where: { projectId },
  });
}

export async function addSectionComment(projectId: string, sectionId: string, comment: string) {
  const draft = await getDraft(projectId);
  if (!draft) throw new Error("Draft not found");
  
  const sections = JSON.parse(draft.sections as string);
  const section = sections.find((s: any) => s.id === sectionId);
  if (section) {
    section.comments = section.comments || [];
    section.comments.push(comment);
  }
  
  return prisma.draft.update({
    where: { projectId },
    data: { sections: JSON.stringify(sections) },
  });
}

// ============== 审核操作 ==============

export async function createReviewResult(projectId: string, data: {
  round: number;
  status: string;
  issues: unknown[];
  summary: string;
  approved: boolean;
  reviewerComment?: string;
}) {
  return prisma.reviewResult.create({
    data: {
      projectId,
      ...data,
      issues: JSON.stringify(data.issues),
    },
  });
}

export async function getReviewResults(projectId: string) {
  return prisma.reviewResult.findMany({
    where: { projectId },
    orderBy: { round: "desc" },
  });
}

export async function getLatestReviewResult(projectId: string) {
  return prisma.reviewResult.findFirst({
    where: { projectId },
    orderBy: { round: "desc" },
  });
}

// ============== 终稿操作 ==============

export async function createFinalDocument(projectId: string, data: {
  title: string;
  fullText: string;
  wordCount: number;
  sections: unknown[];
  readingGuide: unknown;
  summary: string;
}) {
  return prisma.finalDocument.create({
    data: {
      projectId,
      ...data,
      sections: JSON.stringify(data.sections),
      readingGuide: JSON.stringify(data.readingGuide),
    },
  });
}

export async function getFinalDocument(projectId: string) {
  return prisma.finalDocument.findUnique({
    where: { projectId },
  });
}

// ============== 反馈操作 ==============

export async function createFeedback(projectId: string, data: {
  type: string;
  content: string;
  agentType: string;
}) {
  return prisma.feedback.create({
    data: {
      projectId,
      ...data,
    },
  });
}

export async function getFeedbacks(projectId: string) {
  return prisma.feedback.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

// ============== 风格历史操作 ==============

export async function addStyleHistory(userId: string, data: {
  formality?: number;
  academicDepth?: number;
  verbosity?: number;
  notes?: string;
}) {
  return prisma.styleHistory.create({
    data: {
      userId,
      ...data,
    },
  });
}

export async function getStyleHistory(userId: string, limit = 10) {
  return prisma.styleHistory.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
  });
}
