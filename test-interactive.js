/**
 * 测试交互式工作流
 */

const { InteractiveWorkflowEngine } = require('./packages/workflow/src/engine-interactive');

// PRD 数据
const PRD = {
  title: '基于深度学习的颈动脉超声早期动脉硬化智能检测系统研发',
  budget: '15万元',
  timeline: '12个月'
};

// 标书章节
const SECTIONS = [
  {
    title: '一、课题及申请人基本情况',
    content: `【项目名称】
${PRD.title}

【资助类别】
A类

【研究期限】
${PRD.timeline}

【申请经费】
${PRD.budget}

【第一申请人信息】
姓名：[待填写]
工作单位：[待填写]
主要研究领域：医学影像学、人工智能诊断、心血管疾病筛查`
  },
  {
    title: '二、立项依据',
    content: `心血管疾病（CVD）是全球首要死因。颈动脉斑块是动脉粥样硬化的重要早期表现。

基于深度学习的自动检测系统可以有效解决传统人工判读的问题。

【伦理审查说明】
本研究已获伦理委员会批准。`
  },
  {
    title: '三、主要研究内容',
    content: `【研究目标】
1. 构建高精度的颈动脉斑块检测模型（准确率≥85%）
2. 在昆山队列中验证模型性能

【研究内容】
1. 数据收集与预处理
2. 模型开发
3. 模型验证
4. 系统开发`
  },
  {
    title: '四、研究基础、可行性论证',
    content: `【研究基础】
- 团队发表论文20余篇
- 具备深度学习开发经验

【可行性分析】
理论可行 ✓ 技术可行 ✓ 经济可行 ✓`
  },
  {
    title: '五、经费预算',
    content: `总预算：15万元

设备费：3.0万元
材料费：2.0万元
劳务费：2.5万元
...`
  },
  {
    title: '六、申请人承诺',
    content: `本人承诺上述填报内容真实有效。

签字：_________________`
  },
  {
    title: '七、签字签章',
    content: `第一申请人：_________________
日期：_________________`
  }
];

async function main() {
  const engine = new InteractiveWorkflowEngine();
  
  // 运行交互式工作流
  const final = await engine.runInteractiveWorkflow(PRD, SECTIONS);
  
  if (final) {
    console.log('\n生成的文件:');
    console.log('- outputs/final-draft.md');
    console.log('- outputs/final.json');
  }
}

main().catch(console.error);
