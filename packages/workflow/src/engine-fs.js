/**
 * Bid Writer 工作流引擎 - 文件系统版本
 * 不依赖数据库，直接使用文件存储
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/projects');

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============== 项目操作 ==============

function createProject(projectId, name) {
  const projectDir = path.join(DATA_DIR, projectId);
  ensureDir(projectDir);
  
  const project = {
    id: projectId,
    name,
    status: 'created',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify(project, null, 2));
  return project;
}

function getProject(projectId) {
  const projectFile = path.join(DATA_DIR, projectId, 'project.json');
  if (!fs.existsSync(projectFile)) return null;
  return JSON.parse(fs.readFileSync(projectFile, 'utf-8'));
}

function updateProjectStatus(projectId, status) {
  const project = getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  
  project.status = status;
  project.updatedAt = new Date().toISOString();
  
  fs.writeFileSync(path.join(DATA_DIR, projectId, 'project.json'), JSON.stringify(project, null, 2));
  return project;
}

// ============== PRD 操作 ==============

function createPRD(projectId, data) {
  const prd = {
    id: `prd-${Date.now()}`,
    projectId,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(path.join(DATA_DIR, projectId, 'prd.json'), JSON.stringify(prd, null, 2));
  return prd;
}

function getPRD(projectId) {
  const prdFile = path.join(DATA_DIR, projectId, 'prd.json');
  if (!fs.existsSync(prdFile)) return null;
  return JSON.parse(fs.readFileSync(prdFile, 'utf-8'));
}

// ============== 规则规划 ==============

function createRulePlan(projectId, data) {
  const rulePlan = {
    id: `rule-${Date.now()}`,
    projectId,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(path.join(DATA_DIR, projectId, 'rule-plan.json'), JSON.stringify(rulePlan, null, 2));
  return rulePlan;
}

function getRulePlan(projectId) {
  const file = path.join(DATA_DIR, projectId, 'rule-plan.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

// ============== 草稿 ==============

function createOrUpdateDraft(projectId, data) {
  const draft = {
    id: `draft-${Date.now()}`,
    projectId,
    ...data,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(path.join(DATA_DIR, projectId, 'draft.json'), JSON.stringify(draft, null, 2));
  return draft;
}

function getDraft(projectId) {
  const file = path.join(DATA_DIR, projectId, 'draft.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

// ============== 审核结果 ==============

function createReviewResult(projectId, data) {
  const review = {
    id: `review-${Date.now()}`,
    projectId,
    ...data,
    createdAt: new Date().toISOString()
  };
  
  // 追加到 reviews 数组
  const reviewsFile = path.join(DATA_DIR, projectId, 'reviews.json');
  let reviews = [];
  if (fs.existsSync(reviewsFile)) {
    reviews = JSON.parse(fs.readFileSync(reviewsFile, 'utf-8'));
  }
  reviews.push(review);
  fs.writeFileSync(reviewsFile, JSON.stringify(reviews, null, 2));
  
  return review;
}

function getLatestReviewResult(projectId) {
  const reviewsFile = path.join(DATA_DIR, projectId, 'reviews.json');
  if (!fs.existsSync(reviewsFile)) return null;
  const reviews = JSON.parse(fs.readFileSync(reviewsFile, 'utf-8'));
  return reviews.length > 0 ? reviews[reviews.length - 1] : null;
}

// ============== 终稿 ==============

function createFinalDocument(projectId, data) {
  const final = {
    id: `final-${Date.now()}`,
    projectId,
    ...data,
    createdAt: new Date().toISOString()
  };
  
  fs.writeFileSync(path.join(DATA_DIR, projectId, 'final.json'), JSON.stringify(final, null, 2));
  return final;
}

function getFinalDocument(projectId) {
  const file = path.join(DATA_DIR, projectId, 'final.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

// ============== 工作流引擎 ==============

class WorkflowEngine {
  constructor(options = {}) {
    this.maxReviewRounds = options.maxReviewRounds || 5;
  }

  async initialize(projectId, name) {
    console.log(`[Workflow] 初始化项目：${name}`);
    return createProject(projectId, name);
  }

  async runPRDConfirm(projectId, input) {
    console.log('[Agent 1] PRD 确认...');
    const prd = createPRD(projectId, input);
    updateProjectStatus(projectId, 'prd_confirmed');
    console.log('  ✓ PRD 确认完成');
    return prd;
  }

  async runRulePlanner(projectId, input) {
    console.log('[Agent 2] 规则规划...');
    const rulePlan = createRulePlan(projectId, input);
    updateProjectStatus(projectId, 'rules_planned');
    console.log('  ✓ 规则规划完成');
    return rulePlan;
  }

  async runDraftWriter(projectId, input) {
    console.log('[Agent 3] 初稿撰写...');
    const draft = createOrUpdateDraft(projectId, input);
    updateProjectStatus(projectId, 'drafting');
    console.log(`  ✓ 初稿撰写完成 (${input.totalWordCount}字)`);
    return draft;
  }

  async runDraftReviewer(projectId, input) {
    console.log('[Agent 4] 初稿审核...');
    const result = createReviewResult(projectId, input);
    if (input.approved) {
      updateProjectStatus(projectId, 'draft_reviewed');
      console.log('  ✓ 审核通过');
    } else {
      console.log(`  ✗ 审核未通过：${input.summary}`);
    }
    return result;
  }

  async runFormatValidator(projectId, input) {
    console.log('[Agent 5] 格式校验...');
    const issues = [...input.issues];
    
    if (input.missingSections && input.missingSections.length > 0) {
      issues.push({ type: 'missing_section', message: `缺少章节：${input.missingSections.join(', ')}` });
    }
    
    const passed = issues.length === 0;
    if (passed) {
      updateProjectStatus(projectId, 'format_validated');
      console.log('  ✓ 格式校验通过');
    } else {
      console.log(`  ✗ 格式校验未通过：${issues.length}个问题`);
    }
    
    return { passed, issues };
  }

  async runFinalConfirmer(projectId, input) {
    console.log('[Agent 6] 终稿确认...');
    const final = createFinalDocument(projectId, input);
    updateProjectStatus(projectId, 'completed');
    console.log('  ✓ 终稿确认完成');
    return final;
  }

  async getWorkflowState(projectId) {
    const project = getProject(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    
    return {
      projectId,
      currentStep: project.status,
      prd: getPRD(projectId),
      rulePlan: getRulePlan(projectId),
      draft: getDraft(projectId),
      reviewResults: [], // 简化
      finalDocument: getFinalDocument(projectId)
    };
  }
}

module.exports = {
  WorkflowEngine,
  // 导出所有数据库函数
  createProject,
  getProject,
  updateProjectStatus,
  createPRD,
  getPRD,
  createRulePlan,
  getRulePlan,
  createOrUpdateDraft,
  getDraft,
  createReviewResult,
  getLatestReviewResult,
  createFinalDocument,
  getFinalDocument
};
