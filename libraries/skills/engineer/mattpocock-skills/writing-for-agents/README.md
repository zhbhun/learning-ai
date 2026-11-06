# writing-for-agents

> 为 agent 消费的文档写作参考：创建或编辑 skill、修改 AGENTS.md 或 CLAUDE.md 时使用

## 场景

让一个子代理扮演真实用户，请它写一个「改完代码就跑测试、挂了就修到全绿」的 skill，看这套写作原则会把它导向什么样的文档。工作目录是空 sandbox，零预埋。

## 对话

- /writing-for-agents 帮我写一个 skill：让 agent 每次改完代码就跑一遍项目的测试，有挂的就根据报错修到全绿为止，文件放在 libraries/skills/engineer/mattpocock-skills/writing-for-agents/sandbox/skills/auto-test/ 下

  ```md
  Skill 已写好，文件在 `sandbox/skills/auto-test/SKILL.md`。

  按 writing-for-agents 做的关键决策：

  - **调用方式**:model-invoked（不加 `disable-model-invocation`)，因为 agent 必须在每次改完代码后自主触发。description 即顶层 context pointer,front-load 了 leading word “green”，并列出三个触发分支：改了代码、测试挂了、交付编码任务前——每个分支一个触发词，无同义重复。
  - **主体是纯步骤**，一个紧循环，未拆分文件：没有只有部分 run 才走的分支需要 progressive disclosure，步骤总数少不值得 sequence split。
  - **每步带完成判据**，最后一步给出可检查且穷尽的 gate：“全量测试通过、exit code 0”，防止 premature completion。
  - **Demand 杠杆**：“每次 fix 都能追溯到一条报错输出” 驱动 legwork，堵住凭猜测改代码。
  - **环境即真相**：第 1 步让 agent 从 `package.json`/`Makefile`/CI 配置里现查测试命令，skill 不缓存命令，避免过期。
  - **用现成的 leading words**（“green”、“tight loop”、“root cause”、“blast radius”、“full suite”）而非自造词，招募预训练先验。
  - **正面表述**：唯一的禁令式句子 “削弱测试不算 green” 是硬 guardrail，且紧跟正面目标（“断言与规格冲突时改测试并说明”）。

  内容对应用户的三点需求：改完就跑（第 2 步）、按报错修（第 3 步）、修到全绿为止（第 4 步的 gate）。
  ```

## 产物

子代理产出的 `sandbox/skills/auto-test/SKILL.md` 原文：

```md
---
name: auto-test
description: Keep the test suite green — run it after every code change and fix every reported failure. Use when code was written or edited, when tests fail, or before reporting a coding task done.
---

One tight loop around the test suite, closed by green.

## The loop

1. **Find the command in the environment.** The test command is defined by the project: `package.json` scripts, `Makefile`, CI config. Run the full suite — the change's blast radius is what you are measuring. Done when: one full-suite run of the current code, output in hand.

2. **Run after every code change.** A change whose suite has not run on it is an unfinished change. Small edit or large, the run comes before the next edit.

3. **Read the failure before fixing.** From the output take the failing test's name, the error, and the assertion diff; diagnose the root cause, then fix the code under test. Every fix traces to a reported error. When the assertion itself contradicts the spec, fix the test and say so — a weakened test is not green.

4. **Re-run.** One fix batch, one full run. While any test fails, back to step 3.

Done means the full suite passes with exit code 0. Anything else is still inside the loop.
```

## 总结

这个技能教的是「怎么写给 AI 看的说明书」——不管你写的是 skill 还是 CLAUDE.md，同一套手法通用。它把文档当程序看待：每个步骤要有能检查的完成标准，agent 才不会干到一半就宣布完工；反复出现的概念压缩成一个模型本来就认识的词，几个字母就能唤起一整套行为；细节按需加载，只有部分情况才用的内容挪出去，别全堆在开头；环境里查得到的信息（比如测试命令）不抄进文档，免得过期；少写「不要做什么」，直接写「要做什么」。

没装这套原则时（示意），你写出的 skill 往往是一段描述性散文，agent 每次执行的松紧全凭心情；装了之后，文档会变成带验收 gate 的步骤循环——上面产出的 auto-test 就是一个四步紧循环，每步有完成判据，description 用三句话列全触发场景，测试命令让 agent 现场去 `package.json` 查而不是写死。

局限：它给的是判断原则而非模板，没有现成骨架可套，写出来的东西好不好取决于写的人对 agent 行为的理解深度；全文英文，中文使用者读起来要多过一道脑。
