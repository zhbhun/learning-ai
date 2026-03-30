https://github.com/obra/superpowers

## 原理

设计 => 规划 => 实现 => 提交

1. Brainstorming 

  Workflow：

  - Refines rough ideas through questions;
  - Explores alternatives;
  - Presents design in sections for validation;
  - Saves design document.

2. Writing Plans

  - Worlflow: Breaks work into bite-sized tasks (2-5 minutes each).

    ps: Every task has exact file paths, complete code, verification steps.

  - Subagent: plan-document-reviewer

3. Executing Plans or Subagent Driven Development

  - Workflow: 实现 => 规范审查 => 质量审查
  - Subagent

    - Implementer
    - Spec compliance Reviewer
    - Code quality Reviewer

4. Finishing A Development Branch

---

- systematic-debugging

---

 
1. Explore project context - check files, docs, recent commits 
2. Ask clarifying questions one at a time 
3. Propose 2-3 approaches with trade-offs 
4. Present design sections and get approval 
5. Write design doc to specs folder 
6. Spec review loop 
7. User reviews written spec 
8. Transition to implementation via writing-plans skill

## 优缺点

- 优点：访谈式完善需求，有详细的设计文档和任务规划
- 缺点：

  - 规划和执行任务时会提交代码，会出现较多 commit，有些东西没有生成最终效果可能得二次修改。
  - 一个简单的需求会过度设计，并且任务拆分过细，导致生成成本较高且时间较长
  - 没有维护一份完整的技术设计文档，每次都要查看全部代码来完成访谈，Token 消耗过高
  - 默认为英文，对英文不熟练的开发者不够友好

