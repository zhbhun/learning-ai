# 子代理

子代理的派发与协作通信。

## Agent

启动一个新 agent 处理复杂、多步骤的任务。每种 agent 类型拥有特定的能力和工具集,可用 agent 类型在 `<system-reminder>` 消息中列出。调用时通过 `subagent_type` 参数选择 agent 类型;省略则使用通用 agent。

**何时使用:**

- 任务匹配某种可用 agent 类型;
- 存在可并行的独立工作;
- 回答需要读取多个文件时——委托出去,你保留结论而非文件转储。

**何时不用:** 已知文件/符号/值的单点查找,直接搜索即可。一旦把搜索委托出去,就不要自己再跑一遍——等待结果。

**行为说明:**

- agent 的最终消息作为工具结果返回给你,不会展示给用户,你需要转述其中的关键内容。
- 配合 SendMessage 传入 agent 的 ID 或 name 可以继续一个已派生的 agent(保留其上下文);而新的 Agent 调用则全新开始。
- 每个 agent 类型的 model、reasoning effort、tools 都来自其定义。
- `isolation: "worktree"` 给 agent 一个独立的 git worktree(未改动时自动清理)。
- 子代理默认在后台运行,完成时会通知你;需要拿到结果才能继续时,传 `run_in_background: false` 同步运行。

**参数:**

- `description`(必填,3-5 词)
- `prompt`(必填)
- `subagent_type`
- `model`(`sonnet`/`opus`/`haiku`/`fable`)
- `run_in_background`
- `isolation`(`worktree`/`remote`)

## SendMessage

给另一个 agent 发送消息。

`to` 取值为 teammate 名,或 `"main"`(主对话,仅后台子代理可用)。

**要点:**

- 你的纯文本输出对其他 agent 不可见——要沟通必须调用此工具。
- 队友消息会自动送达,你无需查收件箱。
- 用名字称呼 agent——名字在 agent 完成后仍有效(一次发送会从其 transcript 恢复它)。
- 仅当 agent 无名,或新 agent 接管了该名(最新胜出)时,才使用原始 `agentId`(格式 `a...-...`)。
- 转述时不要引用原文——它已经渲染给用户了。

**参数:**

- `to`(必填)
- `message`
- `summary`(当 message 为字符串时必填,5-10 词预览)
