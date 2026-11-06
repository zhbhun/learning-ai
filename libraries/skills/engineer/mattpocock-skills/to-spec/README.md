# to-spec

> 把当前对话直接合成一份 spec 并发布到项目的 issue tracker：不做访谈，只汇总你已经讨论过的内容。

## 场景

给一个极简的 mdtoc CLI（从 Markdown 生成目录）提了一个新需求——加 `--depth N` 选项，让 to-spec 把这句需求直接变成一份可发布的 spec。沙箱按 setup 技能的产出预置了 issue tracker 配置（`docs/agents/`）、triage 标签表和 `GLOSSARY.md`，采用零依赖的本地 markdown tracker。

## 对话

- /to-spec 我想给 mdtoc 加一个 --depth 选项：后面跟一个数字 N，目录只输出到第 N 级标题，不传时保持现在的全层级输出。文档长了以后目录太占屏，只想看前面几级。

  ```md
  Spec 已按 to-spec 流程完成并发布。

  **产物**:`sandbox/.scratch/mdtoc-depth/spec.md`,Status 行为 `ready-for-agent`(本地 markdown issue tracker 约定)。

  **过程**：
  - 探索了 repo:单文件 CLI `mdtoc.js`(约 15 行,零依赖，支持文件参数和 stdin);`GLOSSARY.md` 已定义 Entry/Depth/Table of contents,spec 全程沿用，无需新词条；无 ADR。
  - **Seam 决策**:唯一 seam 为现有 CLI 边界(运行 `node mdtoc.js [--depth N] <file>` 并断言 stdout/stderr/退出码),不新增 seam,符合 skill 的“seam 数量理想为 1"。注意：skill 要求在写 spec 前与用户确认 seam;本次运行非交互，我按最自然的选项直接拍板，**请向用户转达这一点，如有异议可调整 spec 再实现**。
  - 需求理解:`--depth N` 只输出层级 ≤ N 的条目;不传时保持全层级输出(回归行为)；缩进仍按标题层级计算，不做重嵌套;非法取值报错并以非零码退出。

  **Spec 要点**:6 条 user stories(默认行为不变、浅层浏览、stdin 组合、N 超过实际深度、非法值错误路径、缩进可预测)；实现决策不含文件路径和代码片段，遵循模板要求；测试决策以 CLI 为唯一 seam,覆盖 6 个场景，仓库此前无测试属首次建立；Out of Scope 排除了锚点链接、重嵌套、配置文件等扩写内容。
  ```

发布的 spec 产物 `sandbox/.scratch/mdtoc-depth/spec.md` 全文：

```md
Status: ready-for-agent

# mdtoc `--depth` 选项

## Problem Statement

文档变长以后,全层级的目录输出到终端里占满整屏。用户只想先看最上面几级标题,把握文档骨架,不被深层细节淹没。

## Solution

给 mdtoc 增加 `--depth N` 选项:目录只输出 Depth(深度)不超过 N 的 Entry(条目)。不传该选项时,行为与现在完全一致——全层级输出。

## User Stories

1. 作为 mdtoc 用户,我想传 `--depth 2`,以便只看到一、二级标题,快速浏览长文档的结构。
2. 作为 mdtoc 用户,我想在不传 `--depth` 时保持现有全层级输出,以便已有用法和脚本完全不受影响。
3. 作为 mdtoc 用户,我想通过 stdin 管道配合 `--depth` 使用,以便对临时内容快速截取浅层目录。
4. 作为 mdtoc 用户,我想在 `--depth` 大于文档实际最大标题层级时得到完整目录,以便不必关心文档的真实深度。
5. 作为 mdtoc 用户,我想在 `--depth` 取值非法(非正整数或缺少取值)时得到明确的错误信息和非零退出码,以便及时发现调用错误。
6. 作为脚本作者,我想让被过滤的深层条目不影响保留条目的缩进(缩进仍由标题层级决定),以便输出结构可预测、便于二次处理。

## Implementation Decisions

- CLI 参数解析新增 `--depth N`,N 为正整数;保持零依赖的单文件 CLI 实现方式。
- 过滤规则:仅输出 Depth ≤ N 的 Entry,条目保持文档中的原有出现顺序。
- 缩进规则不变:仍按标题层级缩进,不做"重嵌套"——被过滤的深层条目不会让保留条目的缩进上移。
- `--depth` 缺少取值、或 N 不是正整数时:向 stderr 输出错误信息并以非零码退出。
- N ≥ 6 时等价于全量输出(标题层级上限为 6)。
- 不新增模块,改动集中在 CLI 入口的参数解析与输出过滤两处。

## Testing Decisions

- 好的测试只验证外部行为:对 CLI 进程的 stdout、stderr 和退出码做断言,不测内部实现细节。
- Seam:唯一 seam 就是 CLI 本身(现有最高 seam,不新增 seam,数量为 1)。
- 覆盖场景:默认全层级(回归)、`--depth 1`、`--depth` 取中间层级、`--depth` 大于最大层级、stdin + `--depth`、非法取值的错误路径。
- 先例:仓库目前没有任何测试,本 spec 首次在 CLI seam 上建立测试。

## Out of Scope

- 目录条目的锚点链接、编号、排序等输出格式增强。
- 对过滤后的输出做重新嵌套或按保留条目重算缩进。
- 配置文件支持;`--depth` 之外的新选项及其组合语义。

## Further Notes

- 术语沿用 GLOSSARY.md:Entry(条目)、Depth(深度)、Table of contents(目录),未引入新词,不需要补充 glossary。
- `--depth` 的 N 与 glossary 中 Depth 的语义一致(标题层级 1–6),这是本功能唯一依赖的领域概念。
```

## 依赖

- [setup-matt-pocock-skills](../setup-matt-pocock-skills/)：to-spec 开头就检查 issue tracker 和 triage 标签配置是否就位，没有就要求先跑它。配置落在 `docs/agents/issue-tracker.md`（决定 spec 发布到哪、怎么写 Status 行）和 `docs/agents/triage-labels.md`（提供 `ready-for-agent` 标签），缺了它们 to-spec 第一步就会中断。本次沙箱的这两个文件就是按它的 local-markdown 模板预置的。
- GLOSSARY.md（领域词汇表）：to-spec 要求 spec 全程使用项目词汇表术语。本次沙箱预置了三个词条，子代理核实后直接沿用；没有词汇表时这一步只能空转或自造词汇。

## 总结

to-spec 是对话收尾时用的：你和 agent 讨论完一个功能，跑一下它，它不追问任何问题，直接把讨论成果整理成一份结构完整的 spec（问题、方案、一长串 user stories、实现决策、测试决策、不做的事），发布到项目的 issue tracker 并打上「可派给 agent 实现」的标签。没装它的话，这些内容散落在对话里，下个会话就丢了（示意）；装了它，讨论的终点就是一张可以直接开工的工单。用起来最明显的一点：它会在定测试接缝时和你确认一次，非交互环境下会替你按最合理的选项拍板并明确提醒你去复核——所以发布后扫一眼 spec 再实现，是推荐用法。
