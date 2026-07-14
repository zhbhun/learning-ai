# 代码审查报告

上报代码审查发现,供宿主 UI 渲染。

## ReportFindings

将代码审查的发现作为类型化列表上报,供宿主 UI 渲染。

**使用规则:**

- 仅当活动的代码审查指令明确要求使用此工具时才调用;否则遵循那些指令指定的输出格式。
- 报告审查结果时只调用一次,传入经验证的发现列表,按严重程度从高到低排序;若验证后没有任何发现幸存,则传入空数组。
- 不要在调用此工具的同时把发现以纯文本形式打印出来。
- **修复后重新报告**(仅当 apply 指令要求时):在每个发现上设置 `outcome` 字段,记录该发现的实际处理结果。

**参数:**

- `level`(必填):审查运行的努力等级,枚举值 `low` / `medium` / `high` / `xhigh` / `max`。
- `findings`:发现数组,每个发现含:
  - `file`(必填):仓库相对路径。
  - `line`(必填):1 起始的行号,用于锚定发现位置。
  - `summary`(必填):一句话总结该缺陷。
  - `failure_scenario`(必填):具体输入与状态导致错误输出/崩溃的场景。
  - `category`(必填):类型的简短 kebab-case slug(如 `correctness`、`simplification`、`efficiency`、`test-coverage`)。
  - `verdict`(可选):验证通过后设置,枚举值 `CONFIRMED` / `PLAUSIBLE`。
  - `outcome`(可选):仅修复后重报时设置,枚举值 `fixed` / `skipped` / `no_change_needed`。
