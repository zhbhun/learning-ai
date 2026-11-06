# claude-api

> Claude API / Anthropic SDK 的参考手册——模型 id、价格、参数、流式、工具使用、MCP、agent、缓存、token 计数、模型迁移。

## 场景

用户要一个调用 Claude 给文本文件做摘要的 Python 脚本，要求直接可运行；工作目录没有相关预置代码。技能是自包含参考，无需预置材料，子代理直接把脚本写进工作目录，主会话事后归档为 [sandbox/summarize.py](sandbox/summarize.py)。

## 对话

- /claude-api 帮我写一个 Python 脚本 summarize.py，调用 Claude 把一个文本文件的内容做摘要，放到当前目录下，直接可运行。

  ```md
  脚本已创建并验证可运行。已在真实的 API 调用中进行了端到端测试。

  **已创建：** `summarize.py`

  **用法：** `python summarize.py <文本文件>`，可选参数 `--model <id>`。需要 `pip install anthropic` 和环境变量 `ANTHROPIC_API_KEY`。摘要会流式传输到终端。

  **实现要点**（来自 claude-api 技能，而非凭记忆）：

  - Anthropic Python SDK，官方默认模型 `claude-opus-5-5`，`max_tokens=16000`
  - 通过 `client.messages.stream()` + `text_stream` 进行流式传输，并使用 `flush=True`（这是当前家族模型流式输出的默认要求）
  - 第一层最具体的错误链：`AuthenticationError` / `RateLimitError`（读取 `retry-after`） / `APIConnectionError` / `APIStatusError`
  - `stop_reason` 检查：`max_tokens` 打印截断警告，`refusal` 非零退出
  - 本地文件错误处理：缺失/非 UTF-8 编码/空文件均以退出码 1 终止

  **在此环境中的关键发现：** `ANTHROPIC_BASE_URL=http://localhost:8317` 将 SDK 路由到本地代理，该代理拒绝原始的 `claude-opus-5-5` 字符串（提示 "unknown provider"）—— Claude Code 使用的 `ANTHROPIC_DEFAULT_OPUS_MODEL` 别名映射不会应用于原始 SDK 调用。因此脚本通过 `--model` → `ANTHROPIC_DEFAULT_OPUS_MODEL` 环境变量 → `claude-opus-5-5` 来解析模型。在此处，它自动使用了代理配置的 opus 插槽模型；在纯 Anthropic API 环境中，它会回退到 `claude-opus-5-5`。已进行端到端验证：读取测试文件，流式传输了正确的中文摘要，退出码为 0。
  ```

## 总结

这个技能是一套随包分发的 Claude API 官方参考——六百多行主文件带九十多个分文档，按语言分目录（python/、typescript/ 等）——作用是给「要写 Claude API 代码」的 agent 换掉脑子里过时的训练记忆：模型 id、参数形状、流式和错误处理该长什么样，一律以技能里的文档为准，不许凭印象写。试用里这条纪律看得清清楚楚：子代理先读主文件判定语言（用户点名 Python，跳过了反问环节），再读 Python 目录下的 README 和流式文档才动笔；写出的百来行脚本带着技能规定的一整套默认值——官方推荐档模型、流式输出、从具体到宽泛的错误捕获链、停止原因检查——每项都能在文档里找到出处。

「问用户」的环节它也自处得当：本机没有 API key，按技能指引先查 `ant auth status` 而不是开口要 key；发现本机代理不认默认模型字符串后，自己探测原因、给脚本加上「参数 → 环境变量 → 官方默认」的模型解析，最后真调了一次 API 验证通过，全程没有打断用户。

局限也明显：这套参考太重，为一个百行小脚本，子代理花了近二十轮读文档、探环境；默认立场也强势——不问就写死官方推荐档模型，写一次性小工具时显得用力过猛。真正的用武之地是严肃的 API 集成：模型一直在换代、参数一直在变，靠训练记忆写代码大概率写出已废弃的形状，这份随包参考正是防这个的。
