# triage

> 按 triage 角色状态机推进 issue 和外部 PR:分类、验证、必要时追问,并写出可直接交给 agent 执行的任务简报。

## 场景

一个带 CSV 导出小工具的 demo 仓库,预埋了本地 markdown issue tracker 配置和一条未分类的 issue(报告导出短行时打出 `email: None`),维护者让 agent 来看这条 issue。

## 对话

- /triage Let's look at #01

  ```md
  Reproduction confirms the bug. Here's the triage picture for #01.

  ## #01 — Export crashes with "None" on rows shorter than header

  **[issue] • unlabeled • needs-triage → recommendation: bug / ready-for-agent**

  ### Verification — confirmed

  Reproduced with the reporter's exact steps (the corrected repro — Bob's line with no commas at all):

  ```
  name: Alice
  email: alice@example.com

  name: Bob
  email: None          <-- the bug

  name: Charlie
  email: charlie@example.com
  ```

  Expected `name: Bob` only. Actual shows `email: None`. Confirmed.

  ### Code path

  `csv_export.py:19-26` (`load_csv`) uses `csv.DictReader`, which fills missing trailing fields with `None` for short rows. Then `export()` at `csv_export.py:40-44` prints every requested field unconditionally — `fmt.format(k=name, v=row[name])` renders `None` as the literal string `"None"`. The fix is small: skip fields whose value is `None` when building output lines.

  Note the reporter's first repro draft (`Bob,,Hamburg`) is a *different* case — empty string prints as `email: ` (blank), not `email: None`. Only the short-row case is affected; their corrected steps make this unambiguous.

  ### Redundancy check

  Searched the repo — `csv_export.py` is the only implementation and has no short-row handling anywhere. Not already implemented.

  ### Prior rejection check

  No `.out-of-scope/` directory exists — no prior rejections in the KB.

  ### Recommendation

  - **Category: `bug`** — something is broken, confirmed.
  - **State: `ready-for-agent`** — repro confirmed, expected behavior stated clearly by the reporter, root cause located, single-file fix. No grilling needed.

  One judgment call worth a line in the brief: should an empty-string value (`email: `) also be skipped, or only `None`? Reporter's spec only covers `None`; I'd brief the agent to skip `None` only, matching the report.

  Want me to apply it — post the agent brief comment and set `Status: ready-for-agent`? Or if you'd rather handle the empty-string question first, I can grill that into the spec.
  ```

- Yes, apply it. Post the agent brief comment and set Status: ready-for-agent. On the empty-string question: brief the agent to skip None only, matching the report as you suggested.

  ```md
  Applied. Issue #01 is now triaged to `ready-for-agent`.

  **What was done** in `sandbox/issue-tracker-demo/.scratch/export-tool/issues/01-export-none-on-short-rows.md`:

  1. `Status:` line changed from `unlabeled` to `ready-for-agent`.
  2. Posted the agent brief as a `## Comments` entry with the required AI disclaimer, following AGENT-BRIEF.md structure: category (bug), summary, current vs. desired behavior, key interfaces, testable acceptance criteria, and out-of-scope boundaries.

  Per the maintainer's decision, the brief explicitly scopes the fix to skipping `None` values only — empty strings (e.g. `Bob,,Hamburg`) still print as `email: `, and this distinction is called out in both the desired-behavior section and a dedicated acceptance criterion so an AFK agent can't miss it. The brief is behavioral (no file paths or line numbers) so it survives refactors, and its acceptance criteria include the reporter's exact repro command.

  Verification summary from earlier in the session: the bug was reproduced exactly as reported via `csv_export.py` + `csv.DictReader` filling short rows with `None`; no existing implementation of the behavior (redundancy check passed); no `.out-of-scope/` prior rejections exist.
  ```

## 依赖

- **setup-matt-pocock-skills**(配置前提):triage 依赖仓库里的 issue tracker 约定和角色→标签映射,由 setup 技能写入;本次沙箱预埋了等效的 `docs/agents/issue-tracker.md` 和 `triage-labels.md`。映射缺失时技能会让用户先去跑 setup,流程从第一步就断。
- **grilling、domain-modeling**(按需组合):issue 信息不足需要追问时,技能会调用这两个技能把模糊请求盘问成规格,并在过程中更新 GLOSSARY/ADR;本次 bug 报告含完整复现步骤,没有触发。缺失时「Grill」环节无法执行,只能靠维护者人工补充信息。

## 总结

这个技能是给项目维护者处理 issue 用的:你说「看看 #01」,它就把这条 issue 从头到尾盘一遍——先看清楚 issue 和代码,动手复现 bug 是不是真的,检查这功能是不是早就有人做过、以前是不是拒绝过同类请求,然后给你一个分类和去向的建议。它不会擅自动手,而是停在这等你拍板;你说「就这么办」,它才把状态改掉、贴出一份正式的任务简报。

最直观的价值在那份简报:修复什么、什么行为算验收通过、哪些不要碰,全写成一条条可勾选的标准,而且只描述行为不写死文件路径——它甚至把你一句口头决定(「只跳过 None,空字符串照打」)单独写成一条验收标准,防止接活的 agent 自作主张。另一个细节是它注意到报告者的复现步骤前后矛盾(先写成空字符串、后改成缺列),主动指出这是两种不同情况并按修正后的来。

局限也明显:它默认你有一套配置好的 issue tracker(本地 markdown 或 GitHub),外加角色标签映射,没配置就直接卡住;建议环节需要你在线拍板,不是一键全自动。另外它把 issue 编号当作主键(`#01`),issue 得真的存在于 tracker 里才能玩。
