/**
 * Bid Writer 工作流引擎 - 交互版
 * 支持多轮审核 + 用户交互确认
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../../..');
const PROJECT_DIR = path.join(ROOT_DIR, 'data/projects/2026-beijing-integrative-medicine');
const DRAFTS_DIR = path.join(PROJECT_DIR, 'drafts');
const REVIEWS_DIR = path.join(PROJECT_DIR, 'reviews');
const OUTPUTS_DIR = path.join(PROJECT_DIR, 'outputs');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveProject(data) {
  ensureDir(PROJECT_DIR);
  fs.writeFileSync(path.join(PROJECT_DIR, 'metadata.json'), JSON.stringify(data, null, 2));
}

function saveDraft(version, data) {
  const draftDir = path.join(DRAFTS_DIR, `v${version}`);
  ensureDir(draftDir);
  fs.writeFileSync(path.join(draftDir, 'draft.json'), JSON.stringify(data, null, 2));
}

function getLatestDraft() {
  if (!fs.existsSync(DRAFTS_DIR)) return null;
  const dirs = fs.readdirSync(DRAFTS_DIR).filter(d => d.startsWith('v')).sort().reverse();
  if (dirs.length === 0) return null;
  return {
    version: parseInt(dirs[0].replace('v', '')),
    data: JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, dirs[0], 'draft.json'), 'utf-8'))
  };
}

function saveReview(version, data) {
  ensureDir(REVIEWS_DIR);
  fs.writeFileSync(path.join(REVIEWS_DIR, `review-v${version}.json`), JSON.stringify(data, null, 2));
}

function getReviews() {
  if (!fs.existsSync(REVIEWS_DIR)) return [];
  return fs.readdirSync(REVIEWS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(REVIEWS_DIR, f), 'utf-8')))
    .sort((a, b) => a.round - b.round);
}

function saveFinal(data) {
  ensureDir(OUTPUTS_DIR);
  fs.writeFileSync(path.join(OUTPUTS_DIR, 'final.json'), JSON.stringify(data, null, 2));
  
  let fullText = '';
  data.sections.forEach(s => {
    fullText += `## ${s.title}\n\n${s.content}\n\n`;
  });
  fs.writeFileSync(path.join(OUTPUTS_DIR, 'final-draft.md'), `# ${data.title}\n\n${fullText}`);
}

/**
 * 交互式工作流引擎
 */
class InteractiveWorkflowEngine {
  constructor() {
    this.currentRound = 1;
    this.maxRounds = 5;
    this.pausedForUser = false;
  }

  /**
   * 暂停并等待用户确认
   */
  async waitForUser(message) {
    console.log('\n' + '='.repeat(60));
    console.log('⏸️  等待用户确认');
    console.log('='.repeat(60));
    console.log(message);
    console.log('='.repeat(60));
    console.log('请回复"确认"或"继续"继续执行');
    console.log('或回复"退出"终止工作流');
    console.log('='.repeat(60) + '\n');
    
    this.pausedForUser = true;
    // 在实际实现中，这里会暂停并等待用户输入
    // 当前返回 true 表示继续
    return true;
  }

  /**
   * 运行完整工作流（带用户交互）
   */
  async runInteractiveWorkflow(prd, sections) {
    console.log('\n' + '='.repeat(60));
    console.log('Bid Writer 交互式工作流');
    console.log('='.repeat(60));
    
    let currentVersion = 1;
    let approved = false;
    let reviewHistory = [];
    
    // ===== 第1步: PRD 确认 =====
    console.log('\n【步骤 1/6】PRD 确认');
    console.log(`- 课题: ${prd.title}`);
    console.log(`- 经费: ${prd.budget}`);
    
    await this.waitForUser(`课题信息确认：
- 课题: ${prd.title}
- 经费: ${prd.budget}
- 周期: ${prd.timeline}`);
    
    // ===== 第2步: 生成草稿 =====
    console.log('\n【步骤 2/6】生成草稿 v' + currentVersion);
    const draft = {
      version: currentVersion,
      sections,
      totalWordCount: sections.reduce((sum, s) => sum + s.content.length, 0),
      createdAt: new Date().toISOString()
    };
    saveDraft(currentVersion, draft);
    console.log(`- 章节数: ${sections.length}`);
    console.log(`- 字数: ${draft.totalWordCount}`);
    
    // ===== 第3-5步: 多轮审核循环 =====
    while (this.currentRound <= this.maxRounds && !approved) {
      console.log(`\n【步骤 3/6】审核草稿 v${currentVersion} (第${this.currentRound}轮)`);
      
      // 审核
      const issues = [];
      if (draft.sections.length < 7) {
        issues.push({ type: 'completeness', message: '章节数量不足', severity: 'error' });
      }
      if (draft.totalWordCount > 5000) {
        issues.push({ type: 'word_count', message: '字数超过限制', severity: 'error' });
      }
      const hasEthics = draft.sections.some(s => s.content.includes('伦理'));
      if (!hasEthics) {
        issues.push({ type: 'content', message: '缺少伦理审查说明', severity: 'error' });
      }
      
      approved = issues.filter(i => i.severity === 'error').length === 0;
      
      const review = {
        version: currentVersion,
        round: this.currentRound,
        status: approved ? 'approved' : 'rejected',
        issues,
        summary: approved ? '审核通过' : `发现 ${issues.length} 个问题需要修改`,
        approved,
        reviewedAt: new Date().toISOString()
      };
      
      reviewHistory.push(review);
      saveReview(currentVersion, review);
      
      console.log(`- 审核结果: ${approved ? '✅ 通过' : '❌ 未通过'}`);
      if (!approved) {
        console.log('  问题:');
        issues.forEach(i => console.log(`    - ${i.type}: ${i.message}`));
      }
      
      // 格式校验
      console.log('\n【步骤 4/6】格式校验');
      const templateSections = [
        '一、课题及申请人基本情况', '二、立项依据', '三、主要研究内容',
        '四、研究基础、可行性论证', '五、经费预算', '六、申请人承诺', '七、签字签章'
      ];
      const formatIssues = [];
      const draftTitles = draft.sections.map(s => s.title);
      const missing = templateSections.filter(t => !draftTitles.includes(t));
      if (missing.length > 0) {
        formatIssues.push({ type: 'missing_section', message: `缺少: ${missing.join(', ')}` });
      }
      const formatPassed = formatIssues.length === 0;
      console.log(`- 校验结果: ${formatPassed ? '✅ 通过' : '❌ 未通过'}`);
      
      if (!approved || !formatPassed) {
        // 等待用户确认是否继续修改
        await this.waitForUser(`审核结果：
- 审核状态: ${approved ? '通过' : '未通过'}
- 格式校验: ${formatPassed ? '通过' : '未通过'}
- 问题数: ${issues.length + formatIssues.length}
        
请确认是否继续修改？`);
        
        this.currentRound++;
        
        // 这里可以添加修改逻辑，当前版本只是循环
        console.log(`\n→ 进入第 ${this.currentRound} 轮修改...`);
      } else {
        break;
      }
    }
    
    // ===== 第6步: 生成终稿 =====
    if (approved) {
      console.log('\n【步骤 5/6】生成终稿');
      
      let fullText = '';
      draft.sections.forEach(s => {
        fullText += `## ${s.title}\n\n${s.content}\n\n`;
      });
      
      const final = {
        title: prd.title,
        version: currentVersion,
        fullText,
        wordCount: draft.totalWordCount,
        sections: draft.sections.map(s => ({ name: s.title, wordCount: s.content.length })),
        summary: `${prd.title}，经${this.currentRound}轮审核确认，符合申报要求。`,
        reviewHistory,
        createdAt: new Date().toISOString()
      };
      
      saveFinal(final);
      
      console.log(`- 终稿已保存`);
      console.log(`- 审核轮次: ${this.currentRound}`);
      
      // 等待用户最终确认
      await this.waitForUser(`终稿生成完成！
- 字数: ${final.wordCount}
- 章节: ${final.sections.length}
- 审核轮次: ${this.currentRound}
        
请确认是否提交？`);
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ 工作流完成！');
      console.log('='.repeat(60));
      
      return final;
    } else {
      console.log('\n❌ 达到最大审核轮次，标书未通过审核');
      return null;
    }
  }
}

module.exports = { InteractiveWorkflowEngine };
