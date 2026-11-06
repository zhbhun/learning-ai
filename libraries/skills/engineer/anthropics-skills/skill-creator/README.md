# skill-creator

> 创建新技能、修改和改进现有技能，并衡量技能表现。适用于想从零创建技能、编辑或优化现有技能、跑评测测试技能、带方差分析做量化基准，或优化技能描述的触发准确率。

## 场景

让 Claude 从零起草一个「读 git 暂存区 diff、按 Conventional Commits 规范生成提交信息」的技能，并附上几个以后自己测试用的用例；请求里说明这次先不走完整评测流程。

## 对话

- /skill-creator 帮我写一个新技能，名字就叫 commit-message：它拿到当前 git 暂存区的 diff，生成一条符合 Conventional Commits 规范的 commit message。技能文件写到 sandbox/commit-message/ 目录下。这次先不跑完整的多轮评测流程，直接给我能用的技能草稿，外加两三个我以后可以自己拿来测它的测试用例。

  ```md
  完成。skill-creator 的完整评测流程按你的要求跳过，直接产出草稿：

  **技能草稿** — `sandbox/commit-message/SKILL.md`

  单文件技能（无需 scripts/references），工作流六步：确认暂存区非空 → 对齐仓库已有提交风格 → 读 diff 判断意图 → 定 type/scope → 写 message → 代码块输出且不擅自 commit。几个关键设计：

  - 暂存区为空时停下要求先 stage，明确禁止拿未暂存改动编造 message
  - subject 用 "If applied, this commit will ___" 检验祈使语气；50/72 字符边界
  - 暂存区混多件事时建议拆分并给每组 message
  - type 表 + scope 从路径推断 + 3 个正反示例（feat/refactor/fix-with-body）

  **测试用例** — `sandbox/commit-message/evals/evals.json`

  每个用例带 setup 说明（临时 git 仓库里怎么造数据）：

  1. **simple-feat-with-scope** — 新增工具函数 + 调用处，验证 feat type、路径推断 scope、祈使句 subject
  2. **empty-staging-area** — 暂存区为空但工作区有改动，验证技能会停下而不是编 message（这是最容易翻车的边界，prompt 里故意加了“然后提交”诱饵，看它会不会误执行 `git commit`）
  3. **fix-with-root-cause-body** — 边界条件 `<` 改 `<=` 的 bug 修复，验证 fix type + body 写根因而非复述 diff

  以后自己测的话：找个临时目录 `git init`，按 setup 造改动并 add，然后开一个挂载 `sandbox/commit-message/` 技能的会话跑 prompt 对照 expected_output 即可。之后想正式跑 skill-creator 的多轮评测（with-skill vs baseline 对比、量化打分），随时可以在这个基础上接着做。
  ```

## 总结

没装这个技能时（示意）：让 Claude 写个技能，它直接丢给你一份 SKILL.md，好不好用、什么时候会被触发，全凭一次发挥，测都不测。装了 skill-creator：它先问清你要什么，写完草稿还设计几条真实用户会说的测试请求，让「带技能」和「不带技能」两种做法各跑一遍做对照，再生成一个网页评审页让你逐条看结果、留反馈，它照反馈改，循环到满意为止；收尾还能拿几十条真实查询去测技能描述的触发准确率，解决「该触发时不触发」的问题。

实际感受：它是流程编排型技能，主干是「草稿 → 测试 → 人看结果 → 改」的循环，多个环节要等用户表态（需求访谈、测试用例确认、评审页反馈）。这次单轮试用里，用户一句「先不跑完整评测，直接给草稿」就走进了技能自己预留的灵活出口，子代理没有卡在任何提问上，直接交付了草稿和测试用例。草稿质量也在线：六步工作流、「暂存区为空时先拒绝而不是编造」的边界处理，三个测试用例每个还附带「怎么在临时 git 仓库里造数据」的 setup 说明，其中一个故意埋了「然后提交」的诱饵来测它会不会擅自执行 `git commit`。

局限：完整的对照评测、量化基准和迭代改进都发生在多轮循环里，不跟完就只用得到它的前半段——一次对话里它更像一个「写得不错的技能起草员」。适合认真打磨一个高频使用的技能时投入这个流程。
